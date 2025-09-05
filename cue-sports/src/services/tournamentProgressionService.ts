import { algorithmService, type AlgorithmRoundResponse } from './algorithmService'
import { matchService } from './matchService'
import { tournamentBracketService } from './tournamentBracketService'
import type {
  Match,
  MatchCreationData,
  TournamentBracket
} from '@/types/match'
import type { Tournament } from '@/types/tournament'

export interface ProgressionConfig {
  tournamentId: string
  enableAutomation: boolean
  schedulingPreference: 'weekend' | 'full_week'
  autoAdvanceRounds: boolean
  requireManualApproval: boolean
  venueSettings?: {
    defaultVenueId?: string
    defaultVenueName?: string
    defaultVenueAddress?: string
    autoAssignTables: boolean
  }
  notificationSettings?: {
    enableRoundNotifications: boolean
    enableMatchNotifications: boolean
    adminEmails: string[]
  }
}

export interface ProgressionStatus {
  tournamentId: string
  currentLevel: 'community' | 'county' | 'regional' | 'national'
  currentRound: string
  totalMatches: number
  completedMatches: number
  pendingMatches: number
  isProgressing: boolean
  lastProgressionAt?: Date
  nextProgressionAt?: Date
  errors: ProgressionError[]
  warnings: string[]
}

export interface ProgressionError {
  code: string
  message: string
  level: 'community' | 'county' | 'regional' | 'national'
  round: string
  timestamp: Date
  resolved: boolean
}

export interface ProgressionEvent {
  type: 'round_started' | 'round_completed' | 'level_completed' | 'tournament_completed' | 'error' | 'match_created'
  tournamentId: string
  level: 'community' | 'county' | 'regional' | 'national'
  round: string
  data: any
  timestamp: Date
}

export class TournamentProgressionService {
  private progressionConfigs = new Map<string, ProgressionConfig>()
  private progressionStatus = new Map<string, ProgressionStatus>()
  private eventListeners = new Set<(event: ProgressionEvent) => void>()
  private progressionTimers = new Map<string, NodeJS.Timeout>()

  // Initialize automated tournament progression
  async initializeProgression(
    tournamentId: string, 
    config: ProgressionConfig,
    initiatedBy: string,
    players?: any[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Store configuration
      this.progressionConfigs.set(tournamentId, config)

      // Initialize status
      const status: ProgressionStatus = {
        tournamentId,
        currentLevel: 'community',
        currentRound: 'R1',
        totalMatches: 0,
        completedMatches: 0,
        pendingMatches: 0,
        isProgressing: false,
        errors: [],
        warnings: []
      }
      this.progressionStatus.set(tournamentId, status)

      // Initialize tournament with algorithm
      const initParams = {
        tournamentId,
        level: 'community' as const,
        schedulingPreference: config.schedulingPreference
      }

      // Add players if provided
      if (players && players.length > 0) {
        initParams.players = players
        console.log('🎯 Passing', players.length, 'players to algorithm initialization')
      }

      const initResult = await algorithmService.initializeTournament(initParams)

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize tournament with algorithm')
      }

      // Start the first round
      await this.startNextRound(tournamentId, initiatedBy)

      this.emitEvent({
        type: 'round_started',
        tournamentId,
        level: 'community',
        round: 'R1',
        data: { initResult },
        timestamp: new Date()
      })

      return {
        success: true,
        message: 'Tournament progression initialized successfully'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addError(tournamentId, 'INIT_ERROR', errorMessage, 'community', 'R1')
      
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  // Check if round is complete and progress if needed
  async checkAndProgressRound(tournamentId: string, triggeredBy: string): Promise<boolean> {
    try {
      const config = this.progressionConfigs.get(tournamentId)
      const status = this.progressionStatus.get(tournamentId)

      if (!config || !status || !config.enableAutomation) {
        return false
      }

      // Check if current round is complete
      const isRoundComplete = await tournamentBracketService.checkRoundCompletion(
        tournamentId, 
        status.currentRound
      )

      if (!isRoundComplete) {
        return false
      }

      // Mark round as completed
      this.emitEvent({
        type: 'round_completed',
        tournamentId,
        level: status.currentLevel,
        round: status.currentRound,
        data: { triggeredBy },
        timestamp: new Date()
      })

      // Check if we need manual approval
      if (config.requireManualApproval) {
        this.addWarning(tournamentId, `Round ${status.currentRound} completed - manual approval required for progression`)
        return false
      }

      // Auto-advance if enabled
      if (config.autoAdvanceRounds) {
        return await this.advanceToNextRound(tournamentId, triggeredBy)
      }

      return true
    } catch (error) {
      console.error('Error checking round progression:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addError(tournamentId, 'PROGRESSION_CHECK_ERROR', errorMessage, 'community', 'unknown')
      return false
    }
  }

  // Manually advance to next round
  async advanceToNextRound(tournamentId: string, advancedBy: string): Promise<boolean> {
    try {
      const status = this.progressionStatus.get(tournamentId)
      if (!status) {
        throw new Error('Tournament progression status not found')
      }

      // Determine next round or level
      const nextRoundInfo = this.determineNextRound(status.currentLevel, status.currentRound)
      
      if (nextRoundInfo.levelComplete) {
        return await this.advanceToNextLevel(tournamentId, advancedBy)
      }

      // Update current round
      status.currentRound = nextRoundInfo.nextRound
      status.isProgressing = true
      this.progressionStatus.set(tournamentId, status)

      // Generate matches for next round
      await this.startNextRound(tournamentId, advancedBy)

      return true
    } catch (error) {
      console.error('Error advancing round:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const status = this.progressionStatus.get(tournamentId)
      this.addError(tournamentId, 'ADVANCE_ROUND_ERROR', errorMessage, status?.currentLevel || 'community', status?.currentRound || 'unknown')
      return false
    }
  }

  // Advance to next tournament level
  async advanceToNextLevel(tournamentId: string, advancedBy: string): Promise<boolean> {
    try {
      const status = this.progressionStatus.get(tournamentId)
      if (!status) {
        throw new Error('Tournament progression status not found')
      }

      // Determine next level
      const nextLevel = this.getNextLevel(status.currentLevel)
      if (!nextLevel) {
        // Tournament is complete
        return await this.completeTournament(tournamentId, advancedBy)
      }

      // Emit level completion event
      this.emitEvent({
        type: 'level_completed',
        tournamentId,
        level: status.currentLevel,
        round: status.currentRound,
        data: { advancedBy, nextLevel },
        timestamp: new Date()
      })

      // Update status for next level
      status.currentLevel = nextLevel
      status.currentRound = this.getInitialRoundForLevel(nextLevel)
      status.completedMatches = 0
      status.pendingMatches = 0
      status.isProgressing = true
      this.progressionStatus.set(tournamentId, status)

      // Initialize next level
      await this.initializeNextLevel(tournamentId, nextLevel)

      // Start first round of next level
      await this.startNextRound(tournamentId, advancedBy)

      return true
    } catch (error) {
      console.error('Error advancing to next level:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const status = this.progressionStatus.get(tournamentId)
      this.addError(tournamentId, 'ADVANCE_LEVEL_ERROR', errorMessage, status?.currentLevel || 'community', status?.currentRound || 'unknown')
      return false
    }
  }

  // Complete tournament
  async completeTournament(tournamentId: string, completedBy: string): Promise<boolean> {
    try {
      const status = this.progressionStatus.get(tournamentId)
      if (status) {
        status.isProgressing = false
        this.progressionStatus.set(tournamentId, status)
      }

      // Clear any progression timers
      const timer = this.progressionTimers.get(tournamentId)
      if (timer) {
        clearTimeout(timer)
        this.progressionTimers.delete(tournamentId)
      }

      // Emit completion event
      this.emitEvent({
        type: 'tournament_completed',
        tournamentId,
        level: 'national',
        round: 'final',
        data: { completedBy },
        timestamp: new Date()
      })

      return true
    } catch (error) {
      console.error('Error completing tournament:', error)
      return false
    }
  }

  // Start next round by generating matches
  private async startNextRound(tournamentId: string, startedBy: string): Promise<void> {
    console.log('🎯 Starting next round for tournament:', tournamentId)
    console.log('Started by:', startedBy)
    
    const status = this.progressionStatus.get(tournamentId)
    if (!status) {
      throw new Error('Tournament progression status not found')
    }

    // Validate user authentication
    if (!startedBy || startedBy === 'current_user') {
      throw new Error('Invalid user context for match creation')
    }

    let roundResponse: AlgorithmRoundResponse

    // Call appropriate algorithm endpoint based on level
    switch (status.currentLevel) {
      case 'community':
        console.log('🤖 Calling community round generation...')
        // Get communityId from tournament - use the algorithmMatchService helper
        const { algorithmMatchService } = await import('./algorithmMatchService')
        const communities = await algorithmMatchService.getCommunitiesFromTournament(tournamentId)
        
        if (communities.length === 0) {
          throw new Error('No communities found for tournament')
        }
        
        // For now, use the first community. In a multi-community tournament, 
        // this should be called separately for each community
        const communityId = communities[0]
        console.log(`🏘️ Using community ${communityId} for round generation`)
        
        roundResponse = await algorithmService.generateCommunityRound({
          tournamentId,
          level: 'community',
          currentRound: status.currentRound,
          communityId
        })
        break
      case 'county':
        roundResponse = await algorithmService.generateCountyRound({
          tournamentId,
          level: 'county',
          currentRound: status.currentRound
        })
        break
      case 'regional':
        roundResponse = await algorithmService.generateRegionalRound({
          tournamentId,
          level: 'regional',
          currentRound: status.currentRound
        })
        break
      case 'national':
        roundResponse = await algorithmService.generateNationalRound({
          tournamentId,
          level: 'national',
          currentRound: status.currentRound
        })
        break
      default:
        throw new Error(`Unknown tournament level: ${status.currentLevel}`)
    }

    console.log('🤖 Round response:', roundResponse)

    if (!roundResponse.success) {
      throw new Error(roundResponse.error || 'Failed to generate round')
    }

    if (!roundResponse.matches || roundResponse.matches.length === 0) {
      throw new Error('Algorithm returned no matches')
    }

    // Convert algorithm matches to our format
    console.log('🔄 Converting', roundResponse.matches.length, 'algorithm matches...')
    const matchCreationData = algorithmService.convertAlgorithmMatches(
      roundResponse.matches,
      tournamentId,
      startedBy
    )
    
    console.log('🔄 Match creation data:', matchCreationData)

    // Validate match data
    if (matchCreationData.length === 0) {
      throw new Error('No valid matches created from algorithm response')
    }

    // Add venue settings if configured
    const config = this.progressionConfigs.get(tournamentId)
    if (config?.venueSettings) {
      this.applyVenueSettings(matchCreationData, config.venueSettings)
    }

    // Create matches in batch
    console.log('💾 Creating matches in database...')
    const createdMatches = await matchService.createMatchesBatch(matchCreationData, startedBy)
    
    console.log('✅ Successfully created', createdMatches.length, 'matches')

    // Update status
    status.totalMatches += createdMatches.length
    status.pendingMatches += createdMatches.length
    status.isProgressing = false
    status.lastProgressionAt = new Date()
    this.progressionStatus.set(tournamentId, status)

    // Emit match creation events
    createdMatches.forEach(match => {
      this.emitEvent({
        type: 'match_created',
        tournamentId,
        level: status.currentLevel,
        round: status.currentRound,
        data: { match },
        timestamp: new Date()
      })
    })

    // Schedule automatic progression check if enabled
    this.scheduleProgressionCheck(tournamentId)
  }

  // Initialize next tournament level with algorithm
  private async initializeNextLevel(
    tournamentId: string, 
    level: 'county' | 'regional' | 'national'
  ): Promise<void> {
    let initResponse: AlgorithmRoundResponse

    switch (level) {
      case 'county':
        initResponse = await algorithmService.initializeCountyTournament(tournamentId)
        break
      case 'regional':
        initResponse = await algorithmService.initializeRegionalTournament(tournamentId)
        break
      case 'national':
        initResponse = await algorithmService.initializeNationalTournament(tournamentId)
        break
    }

    if (!initResponse.success) {
      throw new Error(initResponse.error || `Failed to initialize ${level} level`)
    }
  }

  // Apply venue settings to match creation data
  private applyVenueSettings(
    matchCreationData: MatchCreationData[], 
    venueSettings: NonNullable<ProgressionConfig['venueSettings']>
  ): void {
    let tableCounter = 1

    matchCreationData.forEach(matchData => {
      if (venueSettings.defaultVenueId) {
        matchData.venueId = venueSettings.defaultVenueId
      }
      if (venueSettings.defaultVenueName) {
        matchData.venueName = venueSettings.defaultVenueName
      }
      if (venueSettings.defaultVenueAddress) {
        matchData.venueAddress = venueSettings.defaultVenueAddress
      }
      if (venueSettings.autoAssignTables) {
        matchData.tableNumber = tableCounter++
      }
    })
  }

  // Schedule automatic progression check
  private scheduleProgressionCheck(tournamentId: string): void {
    const config = this.progressionConfigs.get(tournamentId)
    if (!config || !config.autoAdvanceRounds) {
      return
    }

    // Clear existing timer
    const existingTimer = this.progressionTimers.get(tournamentId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Schedule check in 30 minutes
    const timer = setTimeout(() => {
      this.checkAndProgressRound(tournamentId, 'auto_progression')
    }, 30 * 60 * 1000)

    this.progressionTimers.set(tournamentId, timer)
  }

  // Generate specific community round using Python algorithm
  async generateCommunityRound(
    tournamentId: string, 
    communityId: string, 
    triggeredBy: string
  ): Promise<{ success: boolean; message: string; roundGenerated?: string; matchesGenerated?: number }> {
    try {
      console.log(`🏘️ Generating community round for ${communityId} in tournament ${tournamentId}`)
      
      const result = await algorithmService.generateCommunityRound({
        tournamentId,
        level: 'community',
        communityId
      })

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to generate community round'
        }
      }

      // Convert and create matches if any were generated
      if (result.matches && result.matches.length > 0) {
        const matchCreationData = algorithmService.convertAlgorithmMatches(
          result.matches,
          tournamentId,
          triggeredBy
        )
        
        const createdMatches = await matchService.createMatchesBatch(matchCreationData, triggeredBy)
        
        // Update progression status
        const status = this.progressionStatus.get(tournamentId)
        if (status) {
          status.totalMatches += createdMatches.length
          status.pendingMatches += createdMatches.length
          status.currentRound = result.roundNumber
          status.lastProgressionAt = new Date()
          this.progressionStatus.set(tournamentId, status)
        }

        this.emitEvent({
          type: 'round_started',
          tournamentId,
          level: 'community',
          round: result.roundNumber,
          data: { communityId, matchesGenerated: createdMatches.length },
          timestamp: new Date()
        })

        return {
          success: true,
          message: `Community round generated successfully for ${communityId}`,
          roundGenerated: result.roundNumber,
          matchesGenerated: createdMatches.length
        }
      }

      return {
        success: true,
        message: `No new matches needed for community ${communityId}`,
        roundGenerated: result.roundNumber,
        matchesGenerated: 0
      }
    } catch (error) {
      console.error('Error generating community round:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addError(tournamentId, 'COMMUNITY_ROUND_ERROR', errorMessage, 'community', 'unknown')
      
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  // Finalize community winners using Python algorithm
  async finalizeCommunityWinners(
    tournamentId: string,
    communityId: string,
    triggeredBy: string
  ): Promise<{ success: boolean; message: string; positions?: any }> {
    try {
      console.log(`🏆 Finalizing community winners for ${communityId} in tournament ${tournamentId}`)
      
      const result = await algorithmService.finalizeCommunityWinners(tournamentId)

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to finalize community winners'
        }
      }

      // Update status if community is complete
      const status = this.progressionStatus.get(tournamentId)
      if (status) {
        status.lastProgressionAt = new Date()
        this.progressionStatus.set(tournamentId, status)
      }

      this.emitEvent({
        type: 'level_completed',
        tournamentId,
        level: 'community',
        round: 'Community_Final',
        data: { communityId, positions: result.winners },
        timestamp: new Date()
      })

      return {
        success: true,
        message: `Community ${communityId} finalized successfully`,
        positions: result.winners
      }
    } catch (error) {
      console.error('Error finalizing community winners:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.addError(tournamentId, 'COMMUNITY_FINALIZE_ERROR', errorMessage, 'community', 'Community_Final')
      
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  // Get tournament positions from Python algorithm
  async getTournamentPositions(
    tournamentId: string,
    level?: string
  ): Promise<{ success: boolean; positions: any; level: string; completed: boolean; error?: string }> {
    try {
      console.log(`📊 Getting tournament positions for ${tournamentId}, level: ${level || 'auto-detect'}`)
      
      const result = await algorithmService.getTournamentPositions(tournamentId, level)
      return result
    } catch (error) {
      console.error('Error getting tournament positions:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        positions: {},
        level: level || 'community',
        completed: false,
        error: errorMessage
      }
    }
  }

  // Helper methods
  private determineNextRound(currentLevel: string, currentRound: string): { nextRound: string; levelComplete: boolean } {
    // This would contain logic to determine the next round based on tournament structure
    // For now, simplified logic
    if (currentLevel === 'community') {
      if (currentRound === 'R1') return { nextRound: 'R2', levelComplete: false }
      if (currentRound === 'R2') return { nextRound: 'Community_SF', levelComplete: false }
      if (currentRound === 'Community_SF') return { nextRound: 'Community_F', levelComplete: false }
      if (currentRound === 'Community_F') return { nextRound: '', levelComplete: true }
    }

    return { nextRound: '', levelComplete: true }
  }

  private getNextLevel(currentLevel: 'community' | 'county' | 'regional' | 'national'): 'county' | 'regional' | 'national' | null {
    const levelProgression = {
      'community': 'county',
      'county': 'regional',
      'regional': 'national',
      'national': null
    }
    return levelProgression[currentLevel] as any
  }

  private getInitialRoundForLevel(level: 'community' | 'county' | 'regional' | 'national'): string {
    const initialRounds = {
      'community': 'R1',
      'county': 'County_SF',
      'regional': 'Regional_SF',
      'national': 'National_SF'
    }
    return initialRounds[level]
  }

  // Event management
  addEventListener(listener: (event: ProgressionEvent) => void): void {
    this.eventListeners.add(listener)
  }

  removeEventListener(listener: (event: ProgressionEvent) => void): void {
    this.eventListeners.delete(listener)
  }

  private emitEvent(event: ProgressionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in progression event listener:', error)
      }
    })
  }

  // Error and warning management
  private addError(tournamentId: string, code: string, message: string, level: 'community' | 'county' | 'regional' | 'national', round: string): void {
    const status = this.progressionStatus.get(tournamentId)
    if (status) {
      status.errors.push({
        code,
        message,
        level,
        round,
        timestamp: new Date(),
        resolved: false
      })
      this.progressionStatus.set(tournamentId, status)

      this.emitEvent({
        type: 'error',
        tournamentId,
        level,
        round,
        data: { code, message },
        timestamp: new Date()
      })
    }
  }

  private addWarning(tournamentId: string, message: string): void {
    const status = this.progressionStatus.get(tournamentId)
    if (status) {
      status.warnings.push(message)
      this.progressionStatus.set(tournamentId, status)
    }
  }

  // Public getters
  getProgressionStatus(tournamentId: string): ProgressionStatus | null {
    return this.progressionStatus.get(tournamentId) || null
  }

  getProgressionConfig(tournamentId: string): ProgressionConfig | null {
    return this.progressionConfigs.get(tournamentId) || null
  }

  // Cleanup
  stopProgression(tournamentId: string): void {
    const timer = this.progressionTimers.get(tournamentId)
    if (timer) {
      clearTimeout(timer)
      this.progressionTimers.delete(tournamentId)
    }

    const status = this.progressionStatus.get(tournamentId)
    if (status) {
      status.isProgressing = false
      this.progressionStatus.set(tournamentId, status)
    }
  }

  cleanup(): void {
    // Clear all timers
    this.progressionTimers.forEach(timer => clearTimeout(timer))
    this.progressionTimers.clear()

    // Clear all listeners
    this.eventListeners.clear()

    // Clear all data
    this.progressionConfigs.clear()
    this.progressionStatus.clear()
  }
}

// Export singleton instance
export const tournamentProgressionService = new TournamentProgressionService()