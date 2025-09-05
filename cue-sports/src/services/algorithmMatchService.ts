/**
 * Algorithm Match Service - Fresh implementation for automated match generation
 * Uses Python algorithm API for complete tournament automation
 * Separate from manual match generation system
 */

import { algorithmService, type AlgorithmInitParams } from './algorithmService'
import { useMatches } from '@/composables/useMatches'
import { useTournaments } from '@/composables/useTournaments'
import { useMatchPlayers } from '@/composables/useMatchPlayers'
import type { Match } from '@/types/match'

export interface AlgorithmTournamentConfig {
  tournamentId: string
  level: 'community' | 'county' | 'regional' | 'national'
  special: boolean
  schedulingPreference: 'weekend' | 'full_week'
  autoProgressRounds: boolean
  notificationSettings: {
    emailUpdates: boolean
    smsUpdates: boolean
    pushNotifications: boolean
  }
}

export interface AlgorithmMatchResult {
  success: boolean
  message: string
  data?: {
    tournamentId: string
    totalMatches: number
    matchesCreated: number
    roundsGenerated: string[]
    estimatedDuration: string
    nextAction: string
  }
  error?: string
}

export interface AlgorithmProgressionResult {
  success: boolean
  message: string
  data?: {
    roundGenerated: string
    matchesGenerated: number
    playersAdvancing: number
    tournamentComplete: boolean
    nextRound?: string
    positions?: { [key: string]: any }
  }
  error?: string
}

export class AlgorithmMatchService {
  // Note: In a real implementation, these would be injected or accessed differently
  // For now, we'll use them in methods where needed

  /**
   * Initialize tournament with algorithm - Complete automation setup
   */
  async initializeTournamentWithAlgorithm(config: AlgorithmTournamentConfig): Promise<AlgorithmMatchResult> {
    try {
      console.log('🤖 Starting algorithm tournament initialization:', config)

      // Step 1: Validate preconditions
      await this.validateTournamentForAlgorithm(config.tournamentId)

      // Step 2: Load tournament and player data
      const { getTournament, updateTournament } = useTournaments()
      const { createMatchesBatch } = useMatches()
      const { loadRegisteredPlayers } = useMatchPlayers()
      
      const [tournament, players] = await Promise.all([
        getTournament(config.tournamentId),
        loadRegisteredPlayers(config.tournamentId)
      ])

      if (!tournament) {
        throw new Error('Tournament not found')
      }

      if (players.length === 0) {
        throw new Error('No confirmed players found for tournament')
      }

      console.log(`🤖 Found ${players.length} confirmed players`)

      // Step 3: Prepare algorithm initialization parameters
      const algorithmParams: AlgorithmInitParams = {
        tournamentId: config.tournamentId,
        special: config.special,
        level: config.level,
        schedulingPreference: config.schedulingPreference,
        players: players.map(player => ({
          id: player.id,
          name: player.name,
          communityId: player.communityId || 'default_community',
          countyId: player.countyId,
          regionId: player.regionId,
          points: player.points || 0,
          currentRanking: player.currentRanking
        }))
      }

      console.log('🤖 Algorithm parameters:', algorithmParams)

      // Step 4: Call algorithm API for initialization
      const algorithmResult = await algorithmService.initializeTournament(algorithmParams)

      if (!algorithmResult.success) {
        throw new Error(algorithmResult.error || 'Algorithm initialization failed')
      }

      console.log('🤖 Algorithm initialization successful:', algorithmResult)

      // Step 5: Process algorithm response and create matches
      if (!algorithmResult.matches || algorithmResult.matches.length === 0) {
        throw new Error('Algorithm returned no matches - check player data and tournament configuration')
      }

      // Step 6: Convert algorithm matches to our format
      const convertedMatches = algorithmService.convertAlgorithmMatches(
        algorithmResult.matches,
        config.tournamentId,
        'algorithm-system'
      )

      console.log(`🤖 Converting ${convertedMatches.length} algorithm matches`)

      // Step 7: Create matches in database
      const createdMatches = await createMatchesBatch(convertedMatches, 'algorithm-system')

      // Step 7.5: Extract and store community information for monitoring
      const communities = [...new Set(players.map(p => p.communityId).filter(Boolean))]
      console.log(`🏘️ Tournament has ${communities.length} communities:`, communities)

      console.log(`🤖 Created ${createdMatches.length} matches in database`)

      // Step 8: Update tournament status  
      await updateTournament(config.tournamentId, {
        status: 'in_progress',
        algorithmInitialized: true,
        algorithmConfig: config,
        currentRound: 'R1',
        lastAlgorithmUpdate: new Date().toISOString(),
        automationEnabled: true,
        communities: communities // Store community list for future round generation
      })

      // Step 9: Extract round information
      const rounds = [...new Set(convertedMatches.map(m => m.roundNumber))]
      const estimatedDuration = this.calculateEstimatedDuration(createdMatches.length, config.level)

      return {
        success: true,
        message: `Tournament successfully initialized with algorithm: ${createdMatches.length} matches created across ${rounds.length} rounds`,
        data: {
          tournamentId: config.tournamentId,
          totalMatches: createdMatches.length,
          matchesCreated: createdMatches.length,
          roundsGenerated: rounds,
          estimatedDuration,
          nextAction: 'Monitor match completion and auto-advance rounds'
        }
      }

    } catch (error) {
      console.error('❌ Algorithm tournament initialization failed:', error)
      return {
        success: false,
        message: 'Tournament initialization with algorithm failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Generate next round using algorithm (community level)
   */
  async generateNextCommunityRound(
    tournamentId: string, 
    communityId: string,
    triggeredBy: string = 'algorithm-system'
  ): Promise<AlgorithmProgressionResult> {
    try {
      console.log(`🏘️ Generating next community round for ${tournamentId}/${communityId}`)

      // Get composables
      const { createMatchesBatch } = useMatches()
      const { updateTournament } = useTournaments()

      // Step 1: Validate round can be generated
      await this.validateRoundProgression(tournamentId, communityId)

      // Step 2: Call algorithm for next round
      const algorithmResult = await algorithmService.generateCommunityRound({
        tournamentId,
        communityId,
        level: 'community'
      })

      if (!algorithmResult.success) {
        throw new Error(algorithmResult.error || 'Algorithm round generation failed')
      }

      console.log('🏘️ Algorithm round generation successful:', algorithmResult)

      // Step 3: Process new matches if any
      let matchesCreated = 0
      if (algorithmResult.matches && algorithmResult.matches.length > 0) {
        const convertedMatches = algorithmService.convertAlgorithmMatches(
          algorithmResult.matches,
          tournamentId,
          triggeredBy
        )

        const createdMatches = await createMatchesBatch(convertedMatches, triggeredBy)
        matchesCreated = createdMatches.length

        console.log(`🏘️ Created ${matchesCreated} new matches for ${algorithmResult.roundNumber}`)
      }

      // Step 4: Update tournament with new round info
      await updateTournament(tournamentId, {
        currentRound: algorithmResult.roundNumber,
        lastAlgorithmUpdate: new Date().toISOString(),
        lastRoundGenerated: algorithmResult.roundNumber
      })

      return {
        success: true,
        message: `Round ${algorithmResult.roundNumber} generated successfully`,
        data: {
          roundGenerated: algorithmResult.roundNumber,
          matchesGenerated: matchesCreated,
          playersAdvancing: algorithmResult.metadata?.playersRemaining || 0,
          tournamentComplete: algorithmResult.tournamentComplete || false,
          nextRound: algorithmResult.nextRound
        }
      }

    } catch (error) {
      console.error('❌ Community round generation failed:', error)
      return {
        success: false,
        message: 'Community round generation failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Finalize community tournament and determine positions
   */
  async finalizeCommunityTournament(
    tournamentId: string,
    communityId: string,
    triggeredBy: string = 'algorithm-system'
  ): Promise<AlgorithmProgressionResult> {
    try {
      console.log(`🏁 Finalizing community tournament ${tournamentId}/${communityId}`)

      // Get composables
      const { updateTournament } = useTournaments()

      // Step 1: Validate all final matches are completed
      await this.validateFinalMatchesCompleted(tournamentId, communityId)

      // Step 2: Call algorithm finalization
      const algorithmResult = await algorithmService.finalizeCommunityWinners(tournamentId, communityId)

      if (!algorithmResult.success) {
        throw new Error(algorithmResult.error || 'Algorithm finalization failed')
      }

      console.log('🏁 Algorithm finalization successful:', algorithmResult)

      // Step 3: Extract positions from algorithm result
      const positions = algorithmResult.metadata?.positions || {}

      // Step 4: Update tournament with final status
      await updateTournament(tournamentId, {
        status: 'completed',
        finalPositions: positions,
        completedAt: new Date().toISOString(),
        lastAlgorithmUpdate: new Date().toISOString(),
        communityFinalized: true
      })

      return {
        success: true,
        message: `Community ${communityId} tournament finalized successfully`,
        data: {
          roundGenerated: 'FINAL',
          matchesGenerated: 0,
          playersAdvancing: 0,
          tournamentComplete: true,
          positions
        }
      }

    } catch (error) {
      console.error('❌ Community finalization failed:', error)
      return {
        success: false,
        message: 'Community tournament finalization failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get tournament positions from algorithm
   */
  async getTournamentPositions(tournamentId: string, level?: string): Promise<{
    success: boolean
    positions: { [position: string]: any }
    level: string
    completed: boolean
    error?: string
  }> {
    try {
      return await algorithmService.getTournamentPositions(tournamentId, level)
    } catch (error) {
      console.error('❌ Get tournament positions failed:', error)
      return {
        success: false,
        positions: {},
        level: level || 'community',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Check if tournament can progress to next round automatically
   */
  async canProgressToNextRound(tournamentId: string, communityId?: string): Promise<{
    canProgress: boolean
    reason: string
    completedMatches: number
    totalMatches: number
    nextAction: string
  }> {
    try {
      const { getMatchesByTournament } = useMatches()
      await getMatchesByTournament(tournamentId)
      
      // Get current round matches
      const { getTournament } = useTournaments()
      const tournament = await getTournament(tournamentId)
      const currentRound = tournament?.currentRound || 'R1'
      
      const { matches } = useMatches()
      const currentRoundMatches = matches.value.filter(match => 
        match.tournamentId === tournamentId &&
        match.roundNumber === currentRound &&
        (!communityId || match.communityId === communityId)
      )

      const completedMatches = currentRoundMatches.filter(match => 
        match.status === 'completed' && match.winnerId && match.loserId
      )

      const canProgress = currentRoundMatches.length > 0 && 
                         completedMatches.length === currentRoundMatches.length

      let reason = ''
      let nextAction = ''

      if (currentRoundMatches.length === 0) {
        reason = 'No matches found for current round'
        nextAction = 'Initialize tournament or check round configuration'
      } else if (canProgress) {
        reason = 'All matches in current round completed'
        nextAction = 'Generate next round'
      } else {
        reason = `${completedMatches.length}/${currentRoundMatches.length} matches completed`
        nextAction = 'Wait for remaining matches to complete'
      }

      return {
        canProgress,
        reason,
        completedMatches: completedMatches.length,
        totalMatches: currentRoundMatches.length,
        nextAction
      }

    } catch (error) {
      console.error('❌ Check round progression failed:', error)
      return {
        canProgress: false,
        reason: 'Error checking round progression',
        completedMatches: 0,
        totalMatches: 0,
        nextAction: 'Check system logs for errors'
      }
    }
  }

  /**
   * Private validation methods
   */
  private async validateTournamentForAlgorithm(tournamentId: string): Promise<void> {
    // Check algorithm service health
    const health = await algorithmService.checkServiceHealth()
    if (!health.healthy) {
      throw new Error(`Algorithm service is offline: ${health.message}`)
    }

    // Check tournament exists and is in correct state
    const { getTournament } = useTournaments()
    const tournament = await getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    if (tournament.status === 'in_progress' && tournament.algorithmInitialized) {
      throw new Error('Tournament is already initialized with algorithm')
    }

    if (!['registrations_closed', 'draft'].includes(tournament.status)) {
      throw new Error('Tournament must have closed registrations before algorithm initialization')
    }
  }

  private async validateRoundProgression(tournamentId: string, communityId: string): Promise<void> {
    const progressionCheck = await this.canProgressToNextRound(tournamentId, communityId)
    
    if (!progressionCheck.canProgress) {
      throw new Error(`Cannot progress to next round: ${progressionCheck.reason}`)
    }
  }

  private async validateFinalMatchesCompleted(tournamentId: string, communityId: string): Promise<void> {
    const { getMatchesByTournament } = useMatches()
    await getMatchesByTournament(tournamentId)
    
    const { matches } = useMatches()
    const finalMatches = matches.value.filter(match => 
      match.tournamentId === tournamentId &&
      match.communityId === communityId &&
      (match.roundNumber.includes('Final') || match.isLevelFinal)
    )

    if (finalMatches.length === 0) {
      throw new Error('No final matches found - tournament may not be ready for finalization')
    }

    const completedFinalMatches = finalMatches.filter(match => 
      match.status === 'completed' && match.winnerId && match.loserId
    )

    if (completedFinalMatches.length !== finalMatches.length) {
      throw new Error(`Final matches not completed: ${completedFinalMatches.length}/${finalMatches.length} completed`)
    }
  }

  /**
   * Get community IDs from tournament players
   */
  async getCommunitiesFromTournament(tournamentId: string): Promise<string[]> {
    try {
      const { loadRegisteredPlayers } = useMatchPlayers()
      const players = await loadRegisteredPlayers(tournamentId)
      
      const communities = [...new Set(players.map(p => p.communityId).filter(Boolean))]
      console.log(`🏘️ Found ${communities.length} communities in tournament ${tournamentId}:`, communities)
      
      return communities
    } catch (error) {
      console.error('❌ Error getting communities from tournament:', error)
      return []
    }
  }

  private calculateEstimatedDuration(totalMatches: number, level: string): string {
    // Estimate based on level and match count
    const baseMinutesPerMatch = 45 // Average match duration
    const concurrentMatches = level === 'community' ? 4 : 8 // Concurrent matches possible
    
    const totalMinutes = Math.ceil(totalMatches / concurrentMatches) * baseMinutesPerMatch
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours === 0) {
      return `${minutes} minutes`
    } else if (hours < 24) {
      return `${hours}h ${minutes}m`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h`
    }
  }
}

// Export singleton instance
export const algorithmMatchService = new AlgorithmMatchService()