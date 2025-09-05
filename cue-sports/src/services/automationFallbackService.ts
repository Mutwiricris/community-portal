import { matchService } from './matchService'
import { tournamentBracketService } from './tournamentBracketService'
import type {
  Match,
  MatchCreationData,
  TournamentBracket
} from '@/types/match'
import type { MatchPlayer } from '@/composables/useMatchPlayers'

export interface FallbackConfig {
  enabled: boolean
  triggerThreshold: number // Number of consecutive failures before fallback
  notifyAdmins: boolean
  adminEmails: string[]
  fallbackStrategy: 'simple_pairing' | 'ranking_based' | 'manual_intervention'
  maxPlayersPerMatch: number
  defaultMatchType: 'qualifying' | 'elimination'
}

export interface FallbackResult {
  success: boolean
  method: 'algorithm' | 'fallback_simple' | 'fallback_ranking' | 'manual_required'
  matches: MatchCreationData[]
  warnings: string[]
  errors: string[]
  requiresManualReview: boolean
}

export interface FallbackPlayerPair {
  player1: MatchPlayer
  player2?: MatchPlayer
  matchType: 'standard' | 'bye'
  confidence: number // 0-1 score for how good this pairing is
  reasoning: string
}

export class AutomationFallbackService {
  private consecutiveFailures = new Map<string, number>()
  private fallbackConfigs = new Map<string, FallbackConfig>()
  private lastFallbackUsed = new Map<string, Date>()

  // Set fallback configuration for a tournament
  setFallbackConfig(tournamentId: string, config: FallbackConfig): void {
    this.fallbackConfigs.set(tournamentId, config)
  }

  // Get fallback configuration
  getFallbackConfig(tournamentId: string): FallbackConfig | null {
    return this.fallbackConfigs.get(tournamentId) || null
  }

  // Record algorithm failure
  recordAlgorithmFailure(tournamentId: string): void {
    const currentFailures = this.consecutiveFailures.get(tournamentId) || 0
    this.consecutiveFailures.set(tournamentId, currentFailures + 1)
  }

  // Record algorithm success (resets failure count)
  recordAlgorithmSuccess(tournamentId: string): void {
    this.consecutiveFailures.set(tournamentId, 0)
  }

  // Check if fallback should be triggered
  shouldTriggerFallback(tournamentId: string): boolean {
    const config = this.fallbackConfigs.get(tournamentId)
    if (!config || !config.enabled) {
      return false
    }

    const failures = this.consecutiveFailures.get(tournamentId) || 0
    return failures >= config.triggerThreshold
  }

  // Generate matches using fallback algorithm
  async generateFallbackMatches(
    tournamentId: string,
    players: MatchPlayer[],
    roundNumber: string,
    createdBy: string
  ): Promise<FallbackResult> {
    const config = this.fallbackConfigs.get(tournamentId)
    
    if (!config) {
      return {
        success: false,
        method: 'manual_required',
        matches: [],
        warnings: [],
        errors: ['No fallback configuration found'],
        requiresManualReview: true
      }
    }

    this.lastFallbackUsed.set(tournamentId, new Date())

    try {
      let result: FallbackResult

      switch (config.fallbackStrategy) {
        case 'simple_pairing':
          result = await this.generateSimplePairings(players, roundNumber, tournamentId, createdBy)
          break
        case 'ranking_based':
          result = await this.generateRankingBasedPairings(players, roundNumber, tournamentId, createdBy)
          break
        case 'manual_intervention':
        default:
          result = {
            success: false,
            method: 'manual_required',
            matches: [],
            warnings: ['Manual intervention required due to fallback strategy'],
            errors: [],
            requiresManualReview: true
          }
          break
      }

      // Notify admins if configured
      if (config.notifyAdmins && config.adminEmails.length > 0) {
        await this.notifyAdmins(tournamentId, result, config.adminEmails)
      }

      return result
    } catch (error) {
      return {
        success: false,
        method: 'manual_required',
        matches: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Fallback generation failed'],
        requiresManualReview: true
      }
    }
  }

  // Simple pairing strategy - random/sequential pairing
  private async generateSimplePairings(
    players: MatchPlayer[],
    roundNumber: string,
    tournamentId: string,
    createdBy: string
  ): Promise<FallbackResult> {
    const warnings: string[] = []
    const errors: string[] = []
    const matches: MatchCreationData[] = []

    try {
      // Filter eligible players
      const eligiblePlayers = players.filter(p => p.isEligible && p.paymentStatus === 'paid')
      
      if (eligiblePlayers.length < 2) {
        errors.push('Insufficient eligible players for pairing')
        return {
          success: false,
          method: 'fallback_simple',
          matches: [],
          warnings,
          errors,
          requiresManualReview: true
        }
      }

      // Shuffle players for random pairing
      const shuffledPlayers = [...eligiblePlayers].sort(() => Math.random() - 0.5)
      let matchNumber = 1

      // Create pairs
      for (let i = 0; i < shuffledPlayers.length; i += 2) {
        const player1 = shuffledPlayers[i]
        const player2 = shuffledPlayers[i + 1]

        if (player2) {
          // Standard match
          const matchData: MatchCreationData = {
            tournamentId,
            tournamentLevel: this.determineTournamentLevel(roundNumber),
            roundNumber,
            matchNumber: matchNumber++,
            matchType: 'qualifying',
            player1Id: player1.id,
            player1Name: player1.name,
            player1Points: player1.points,
            player1CommunityId: player1.communityId,
            player2Id: player2.id,
            player2Name: player2.name,
            player2Points: player2.points,
            player2CommunityId: player2.communityId,
            communityId: player1.communityId, // Use player1's community as default
            determinesPositions: [1, 2], // Simple positioning
            isLevelFinal: false,
            determinesTop3: false,
            isByeMatch: false,
            createdBy,
            adminNotes: `Generated by fallback system - simple pairing strategy`
          }

          matches.push(matchData)
        } else {
          // Bye match for odd number of players
          const matchData: MatchCreationData = {
            tournamentId,
            tournamentLevel: this.determineTournamentLevel(roundNumber),
            roundNumber,
            matchNumber: matchNumber++,
            matchType: 'bye',
            player1Id: player1.id,
            player1Name: player1.name,
            player1Points: player1.points,
            player1CommunityId: player1.communityId,
            communityId: player1.communityId,
            determinesPositions: [1],
            isLevelFinal: false,
            determinesTop3: false,
            isByeMatch: true,
            createdBy,
            adminNotes: `Generated by fallback system - bye match for odd player count`
          }

          matches.push(matchData)
          warnings.push(`Created bye match for ${player1.name} due to odd player count`)
        }
      }

      warnings.push(`Used simple pairing fallback strategy for ${matches.length} matches`)

      return {
        success: true,
        method: 'fallback_simple',
        matches,
        warnings,
        errors,
        requiresManualReview: true // Always require review for fallback
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Simple pairing failed')
      return {
        success: false,
        method: 'fallback_simple',
        matches,
        warnings,
        errors,
        requiresManualReview: true
      }
    }
  }

  // Ranking-based pairing strategy
  private async generateRankingBasedPairings(
    players: MatchPlayer[],
    roundNumber: string,
    tournamentId: string,
    createdBy: string
  ): Promise<FallbackResult> {
    const warnings: string[] = []
    const errors: string[] = []
    const matches: MatchCreationData[] = []

    try {
      // Filter and sort eligible players by points (ranking)
      const eligiblePlayers = players
        .filter(p => p.isEligible && p.paymentStatus === 'paid')
        .sort((a, b) => b.points - a.points) // Higher points first

      if (eligiblePlayers.length < 2) {
        errors.push('Insufficient eligible players for ranking-based pairing')
        return {
          success: false,
          method: 'fallback_ranking',
          matches: [],
          warnings,
          errors,
          requiresManualReview: true
        }
      }

      // Generate optimal pairings based on ranking
      const pairs = this.generateOptimalPairs(eligiblePlayers)
      let matchNumber = 1

      for (const pair of pairs) {
        if (pair.matchType === 'bye') {
          // Bye match
          const matchData: MatchCreationData = {
            tournamentId,
            tournamentLevel: this.determineTournamentLevel(roundNumber),
            roundNumber,
            matchNumber: matchNumber++,
            matchType: 'bye',
            player1Id: pair.player1.id,
            player1Name: pair.player1.name,
            player1Points: pair.player1.points,
            player1CommunityId: pair.player1.communityId,
            communityId: pair.player1.communityId,
            determinesPositions: [1],
            isLevelFinal: false,
            determinesTop3: false,
            isByeMatch: true,
            createdBy,
            adminNotes: `Generated by fallback system - ranking-based bye match. Reason: ${pair.reasoning}`
          }

          matches.push(matchData)
          warnings.push(`Created bye match for ${pair.player1.name}: ${pair.reasoning}`)
        } else if (pair.player2) {
          // Standard match
          const matchData: MatchCreationData = {
            tournamentId,
            tournamentLevel: this.determineTournamentLevel(roundNumber),
            roundNumber,
            matchNumber: matchNumber++,
            matchType: this.determineMatchType(roundNumber),
            player1Id: pair.player1.id,
            player1Name: pair.player1.name,
            player1Points: pair.player1.points,
            player1CommunityId: pair.player1.communityId,
            player2Id: pair.player2.id,
            player2Name: pair.player2.name,
            player2Points: pair.player2.points,
            player2CommunityId: pair.player2.communityId,
            communityId: this.selectBestCommunity(pair.player1, pair.player2),
            determinesPositions: this.determinePositions(roundNumber, matchNumber - 1),
            isLevelFinal: this.isLevelFinal(roundNumber),
            determinesTop3: this.determinesTop3(roundNumber),
            isByeMatch: false,
            createdBy,
            adminNotes: `Generated by fallback system - ranking-based pairing (confidence: ${Math.round(pair.confidence * 100)}%). Reason: ${pair.reasoning}`
          }

          matches.push(matchData)

          if (pair.confidence < 0.7) {
            warnings.push(`Low confidence pairing: ${pair.player1.name} vs ${pair.player2.name} (${Math.round(pair.confidence * 100)}%)`)
          }
        }
      }

      warnings.push(`Used ranking-based pairing fallback strategy for ${matches.length} matches`)

      return {
        success: true,
        method: 'fallback_ranking',
        matches,
        warnings,
        errors,
        requiresManualReview: true
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Ranking-based pairing failed')
      return {
        success: false,
        method: 'fallback_ranking',
        matches,
        warnings,
        errors,
        requiresManualReview: true
      }
    }
  }

  // Generate optimal player pairs based on ranking and other factors
  private generateOptimalPairs(players: MatchPlayer[]): FallbackPlayerPair[] {
    const pairs: FallbackPlayerPair[] = []
    const used = new Set<string>()

    // First pass: pair players with similar rankings
    for (let i = 0; i < players.length - 1; i++) {
      if (used.has(players[i].id)) continue

      const player1 = players[i]
      let bestMatch: MatchPlayer | null = null
      let bestScore = 0

      // Find best opponent for player1
      for (let j = i + 1; j < players.length; j++) {
        if (used.has(players[j].id)) continue

        const player2 = players[j]
        const score = this.calculatePairingScore(player1, player2)
        
        if (score > bestScore) {
          bestScore = score
          bestMatch = player2
        }
      }

      if (bestMatch) {
        used.add(player1.id)
        used.add(bestMatch.id)

        pairs.push({
          player1,
          player2: bestMatch,
          matchType: 'standard',
          confidence: bestScore,
          reasoning: `Ranking-based pairing: ${player1.points} vs ${bestMatch.points} points`
        })
      }
    }

    // Handle remaining unpaired player (odd number)
    const unpairedPlayer = players.find(p => !used.has(p.id))
    if (unpairedPlayer) {
      pairs.push({
        player1: unpairedPlayer,
        matchType: 'bye',
        confidence: 1.0,
        reasoning: 'Odd number of players, automatic advancement'
      })
    }

    return pairs
  }

  // Calculate how good a pairing would be (0-1 score)
  private calculatePairingScore(player1: MatchPlayer, player2: MatchPlayer): number {
    let score = 0

    // Points difference (closer is better)
    const pointsDiff = Math.abs(player1.points - player2.points)
    const maxPointsDiff = 100 // Assume max reasonable difference
    const pointsScore = Math.max(0, 1 - (pointsDiff / maxPointsDiff))
    score += pointsScore * 0.4

    // Same community is slightly preferred for some rounds
    if (player1.communityId === player2.communityId) {
      score += 0.2
    }

    // Different communities can be good for higher level matches
    if (player1.communityId !== player2.communityId) {
      score += 0.3
    }

    // Payment status (both should be paid)
    if (player1.paymentStatus === 'paid' && player2.paymentStatus === 'paid') {
      score += 0.1
    }

    return Math.min(1, score)
  }

  // Determine appropriate tournament level from round number
  private determineTournamentLevel(roundNumber: string): 'community' | 'county' | 'regional' | 'national' {
    if (roundNumber.toLowerCase().includes('community')) return 'community'
    if (roundNumber.toLowerCase().includes('county')) return 'county'
    if (roundNumber.toLowerCase().includes('regional')) return 'regional'
    if (roundNumber.toLowerCase().includes('national')) return 'national'
    
    // Default based on round format
    if (roundNumber.startsWith('R')) return 'community'
    
    return 'community'
  }

  // Determine match type based on round
  private determineMatchType(roundNumber: string): 'qualifying' | 'elimination' | 'semi_final' | 'final' | 'positioning' {
    if (roundNumber.includes('_F') || roundNumber.toLowerCase().includes('final')) return 'final'
    if (roundNumber.includes('_SF') || roundNumber.toLowerCase().includes('semi')) return 'semi_final'
    if (roundNumber.startsWith('R')) return 'qualifying'
    return 'elimination'
  }

  // Determine if this is a level final
  private isLevelFinal(roundNumber: string): boolean {
    return roundNumber.includes('_F') || roundNumber.toLowerCase().includes('final')
  }

  // Determine if this match determines top 3
  private determinesTop3(roundNumber: string): boolean {
    return roundNumber.includes('_SF') || roundNumber.includes('_F')
  }

  // Determine positions this match affects
  private determinePositions(roundNumber: string, matchNumber: number): number[] {
    if (roundNumber.includes('_F')) {
      return [1, 2] // Final determines 1st and 2nd
    }
    if (roundNumber.includes('_SF')) {
      return [2, 3] // Semi-final determines 2nd and 3rd (loser gets 3rd)
    }
    
    // For qualifying rounds, determine based on match number
    return [matchNumber * 2 - 1, matchNumber * 2]
  }

  // Select best community for the match
  private selectBestCommunity(player1: MatchPlayer, player2: MatchPlayer): string {
    // If same community, use that
    if (player1.communityId === player2.communityId) {
      return player1.communityId
    }
    
    // Otherwise, use player1's community as default
    return player1.communityId
  }

  // Notify admins about fallback usage
  private async notifyAdmins(
    tournamentId: string, 
    result: FallbackResult, 
    adminEmails: string[]
  ): Promise<void> {
    try {
      // In a real implementation, this would send emails or push notifications
      console.log('Fallback notification:', {
        tournamentId,
        method: result.method,
        matchCount: result.matches.length,
        warnings: result.warnings,
        errors: result.errors,
        adminEmails
      })

      // This could integrate with an email service like SendGrid, SES, etc.
    } catch (error) {
      console.error('Failed to notify admins about fallback usage:', error)
    }
  }

  // Get fallback statistics
  getFallbackStats(tournamentId: string): {
    consecutiveFailures: number
    lastFallbackUsed: Date | null
    config: FallbackConfig | null
  } {
    return {
      consecutiveFailures: this.consecutiveFailures.get(tournamentId) || 0,
      lastFallbackUsed: this.lastFallbackUsed.get(tournamentId) || null,
      config: this.fallbackConfigs.get(tournamentId) || null
    }
  }

  // Reset fallback state for tournament
  resetFallbackState(tournamentId: string): void {
    this.consecutiveFailures.delete(tournamentId)
    this.lastFallbackUsed.delete(tournamentId)
  }

  // Cleanup
  cleanup(): void {
    this.consecutiveFailures.clear()
    this.fallbackConfigs.clear()
    this.lastFallbackUsed.clear()
  }
}

// Export singleton instance
export const automationFallbackService = new AutomationFallbackService()