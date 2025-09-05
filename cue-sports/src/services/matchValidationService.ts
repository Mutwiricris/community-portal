import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { getFirebaseDb } from '../firebase/config'
import type {
  Match,
  MatchCreationData,
  MatchValidationResult,
  MatchValidationRules,
  TournamentBracket
} from '../types/match'
import type { Tournament, TournamentRegistration } from '../types/tournament'
import type { Player } from '../types/player'

export class MatchValidationService {
  private db = getFirebaseDb()
  private matchesCollection = collection(this.db, 'matches')
  private tournamentsCollection = collection(this.db, 'tournaments')
  private registrationsCollection = collection(this.db, 'tournament_registrations')
  private playersCollection = collection(this.db, 'players')
  private bracketsCollection = collection(this.db, 'tournament_brackets')

  // Validate match creation data
  async validateMatchCreation(
    data: MatchCreationData,
    rules: Partial<MatchValidationRules> = {}
  ): Promise<MatchValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Apply default validation rules
      const validationRules: MatchValidationRules = {
        validatePlayerEligibility: true,
        checkSchedulingConflicts: true,
        validateVenueAvailability: true,
        ensureBracketConsistency: true,
        validateMatchType: true,
        ...rules
      }

      // Basic data validation
      this.validateBasicData(data, errors)

      // Player eligibility validation
      if (validationRules.validatePlayerEligibility) {
        await this.validatePlayerEligibility(data, errors, warnings)
      }

      // Scheduling conflicts validation
      if (validationRules.checkSchedulingConflicts && data.scheduledDateTime) {
        await this.validateSchedulingConflicts(data, errors, warnings)
      }

      // Venue availability validation
      if (validationRules.validateVenueAvailability && data.venueId) {
        await this.validateVenueAvailability(data, errors, warnings)
      }

      // Bracket consistency validation
      if (validationRules.ensureBracketConsistency) {
        await this.validateBracketConsistency(data, errors, warnings)
      }

      // Match type validation
      if (validationRules.validateMatchType) {
        this.validateMatchType(data, errors, warnings)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      console.error('Error during match validation:', error)
      errors.push(`Validation error: ${error}`)
      
      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  // Validate match update
  async validateMatchUpdate(
    matchId: string,
    updates: Partial<Match>,
    rules: Partial<MatchValidationRules> = {}
  ): Promise<MatchValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get current match
      const matchDoc = await getDoc(doc(this.matchesCollection, matchId))
      if (!matchDoc.exists()) {
        errors.push('Match not found')
        return { isValid: false, errors, warnings }
      }

      const currentMatch = { id: matchDoc.id, ...matchDoc.data() } as Match

      // Validate status transitions
      if (updates.status) {
        this.validateStatusTransition(currentMatch.status, updates.status, errors)
      }

      // Validate result submission
      if (updates.winnerId || updates.loserId) {
        this.validateMatchResult(currentMatch, updates, errors)
      }

      // Validate scheduling changes
      if (updates.scheduledDateTime) {
        await this.validateRescheduling(currentMatch, updates.scheduledDateTime, errors, warnings)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      console.error('Error during match update validation:', error)
      errors.push(`Validation error: ${error}`)
      
      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  // Validate player eligibility for tournament
  async validatePlayerForTournament(playerId: string, tournamentId: string): Promise<MatchValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check if player exists
      const playerDoc = await getDoc(doc(this.playersCollection, playerId))
      if (!playerDoc.exists()) {
        errors.push('Player not found')
        return { isValid: false, errors, warnings }
      }

      const player = { id: playerDoc.id, ...playerDoc.data() } as Player

      // Check if player is active
      if (player.status !== 'active') {
        errors.push('Player is not active')
      }

      // Check tournament registration
      const registrationQuery = query(
        this.registrationsCollection,
        where('playerId', '==', playerId),
        where('tournamentId', '==', tournamentId),
        where('status', '==', 'confirmed')
      )

      const registrationSnap = await getDocs(registrationQuery)
      if (registrationSnap.empty) {
        errors.push('Player is not registered for this tournament')
      }

      // Check for existing matches
      const existingMatchesQuery = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId),
        where('player1Id', '==', playerId)
      )

      const existingMatchesSnap = await getDocs(existingMatchesQuery)
      const ongoingMatches = existingMatchesSnap.docs
        .map(doc => doc.data() as Match)
        .filter(match => match.status === 'scheduled' || match.status === 'in_progress')

      if (ongoingMatches.length > 0) {
        warnings.push(`Player has ${ongoingMatches.length} ongoing match(es) in this tournament`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      console.error('Error validating player for tournament:', error)
      errors.push(`Validation error: ${error}`)
      
      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  // Private validation methods

  private validateBasicData(data: MatchCreationData, errors: string[]): void {
    // Required fields validation
    if (!data.tournamentId) {
      errors.push('Tournament ID is required')
    }

    if (!data.player1Id) {
      errors.push('Player 1 ID is required')
    }

    if (!data.player1Name) {
      errors.push('Player 1 name is required')
    }

    if (!data.communityId) {
      errors.push('Community ID is required')
    }

    if (!data.roundNumber) {
      errors.push('Round number is required')
    }

    if (typeof data.matchNumber !== 'number' || data.matchNumber < 1) {
      errors.push('Valid match number is required')
    }

    // Validate position determination
    if (!data.determinesPositions || data.determinesPositions.length === 0) {
      errors.push('Match must determine at least one position')
    }

    // Validate player points
    if (typeof data.player1Points !== 'number' || data.player1Points < 0) {
      errors.push('Valid player 1 points required')
    }

    if (data.player2Id && (typeof data.player2Points !== 'number' || data.player2Points < 0)) {
      errors.push('Valid player 2 points required when player 2 is specified')
    }

    // Validate bye match logic
    if (data.isByeMatch && data.player2Id) {
      errors.push('Bye match cannot have a second player')
    }

    if (!data.isByeMatch && !data.player2Id) {
      errors.push('Non-bye match must have a second player')
    }
  }

  private async validatePlayerEligibility(data: MatchCreationData, errors: string[], warnings: string[]): Promise<void> {
    // Validate player 1
    const player1Validation = await this.validatePlayerForTournament(data.player1Id, data.tournamentId)
    if (!player1Validation.isValid) {
      errors.push(`Player 1: ${player1Validation.errors.join(', ')}`)
    }
    warnings.push(...player1Validation.warnings.map(w => `Player 1: ${w}`))

    // Validate player 2 if present
    if (data.player2Id) {
      const player2Validation = await this.validatePlayerForTournament(data.player2Id, data.tournamentId)
      if (!player2Validation.isValid) {
        errors.push(`Player 2: ${player2Validation.errors.join(', ')}`)
      }
      warnings.push(...player2Validation.warnings.map(w => `Player 2: ${w}`))

      // Check if players are the same
      if (data.player1Id === data.player2Id) {
        errors.push('Player cannot play against themselves')
      }
    }
  }

  private async validateSchedulingConflicts(data: MatchCreationData, errors: string[], warnings: string[]): Promise<void> {
    if (!data.scheduledDateTime) return

    const scheduledTime = data.scheduledDateTime

    // Check for player scheduling conflicts
    const conflictQuery = query(
      this.matchesCollection,
      where('scheduledDateTime', '==', scheduledTime)
    )

    const conflictSnap = await getDocs(conflictQuery)
    const conflictingMatches = conflictSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as Match)
      .filter(match => 
        match.player1Id === data.player1Id || 
        match.player1Id === data.player2Id ||
        match.player2Id === data.player1Id ||
        match.player2Id === data.player2Id
      )

    if (conflictingMatches.length > 0) {
      errors.push('Player(s) have scheduling conflicts at the selected time')
    }

    // Check venue conflicts if venue is specified
    if (data.venueId) {
      const venueConflicts = conflictSnap.docs
        .map(doc => doc.data() as Match)
        .filter(match => match.venueId === data.venueId)

      if (venueConflicts.length > 0) {
        warnings.push('Venue may have scheduling conflicts')
      }
    }

    // Validate scheduling time (e.g., not in the past)
    if (scheduledTime < new Date()) {
      errors.push('Cannot schedule match in the past')
    }
  }

  private async validateVenueAvailability(data: MatchCreationData, errors: string[], warnings: string[]): Promise<void> {
    if (!data.venueId || !data.scheduledDateTime) return

    // Check venue capacity and availability
    // This would integrate with a venue management system
    const venueQuery = query(
      this.matchesCollection,
      where('venueId', '==', data.venueId),
      where('scheduledDateTime', '==', data.scheduledDateTime)
    )

    const venueSnap = await getDocs(venueQuery)
    if (!venueSnap.empty) {
      warnings.push('Venue may be overbooked at the scheduled time')
    }

    // Validate table number if specified
    if (data.tableNumber) {
      const tableConflicts = venueSnap.docs
        .map(doc => doc.data() as Match)
        .filter(match => match.tableNumber === data.tableNumber)

      if (tableConflicts.length > 0) {
        errors.push(`Table ${data.tableNumber} is already booked at the scheduled time`)
      }
    }
  }

  private async validateBracketConsistency(data: MatchCreationData, errors: string[], warnings: string[]): Promise<void> {
    try {
      // Get tournament bracket
      const bracketDoc = await getDoc(doc(this.bracketsCollection, data.tournamentId))
      if (!bracketDoc.exists()) {
        warnings.push('Tournament bracket not found - creating match without bracket validation')
        return
      }

      const bracket = { tournamentId: bracketDoc.id, ...bracketDoc.data() } as TournamentBracket

      // Validate hierarchical level consistency
      if (bracket.hierarchicalLevel !== data.tournamentLevel) {
        errors.push(`Match tournament level (${data.tournamentLevel}) doesn't match bracket level (${bracket.hierarchicalLevel})`)
      }

      // Validate round progression
      const currentRound = this.getCurrentRound(bracket, data.communityId)
      if (currentRound && data.roundNumber !== currentRound) {
        warnings.push(`Match round (${data.roundNumber}) may not match expected current round (${currentRound})`)
      }

      // Validate participant scope
      if (!this.isPlayerInScope(bracket, data.player1Id, data.communityId)) {
        errors.push('Player 1 is not in the tournament scope')
      }

      if (data.player2Id && !this.isPlayerInScope(bracket, data.player2Id, data.communityId)) {
        errors.push('Player 2 is not in the tournament scope')
      }
    } catch (error) {
      warnings.push(`Bracket validation failed: ${error}`)
    }
  }

  private validateMatchType(data: MatchCreationData, errors: string[], warnings: string[]): void {
    const validMatchTypes = ['qualifying', 'elimination', 'semi_final', 'final', 'positioning', 'bye']
    
    if (!validMatchTypes.includes(data.matchType)) {
      errors.push(`Invalid match type: ${data.matchType}`)
    }

    // Validate match type consistency
    if (data.matchType === 'bye' && !data.isByeMatch) {
      errors.push('Match type "bye" requires isByeMatch to be true')
    }

    if (data.matchType === 'final' && !data.isLevelFinal) {
      warnings.push('Final match type should typically have isLevelFinal set to true')
    }

    if (data.determinesTop3 && !['semi_final', 'final', 'positioning'].includes(data.matchType)) {
      warnings.push('determinesTop3 is typically used with semi-final, final, or positioning matches')
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string, errors: string[]): void {
    const validTransitions: Record<string, string[]> = {
      'pending': ['scheduled', 'cancelled'],
      'scheduled': ['in_progress', 'cancelled', 'pending'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['disputed'],
      'cancelled': ['pending', 'scheduled'],
      'disputed': ['completed', 'cancelled']
    }

    const allowedTransitions = validTransitions[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      errors.push(`Invalid status transition from ${currentStatus} to ${newStatus}`)
    }
  }

  private validateMatchResult(currentMatch: Match, updates: Partial<Match>, errors: string[]): void {
    if (currentMatch.status !== 'in_progress' && currentMatch.status !== 'completed') {
      errors.push('Match result can only be submitted for in-progress or completed matches')
    }

    if (updates.winnerId && updates.loserId) {
      // Validate that winner and loser are different
      if (updates.winnerId === updates.loserId) {
        errors.push('Winner and loser cannot be the same player')
      }

      // Validate that winner and loser are participants in the match
      const validPlayerIds = [currentMatch.player1Id, currentMatch.player2Id].filter(Boolean)
      if (!validPlayerIds.includes(updates.winnerId)) {
        errors.push('Winner must be a participant in the match')
      }
      if (!validPlayerIds.includes(updates.loserId)) {
        errors.push('Loser must be a participant in the match')
      }
    }
  }

  private async validateRescheduling(currentMatch: Match, newDateTime: Date, errors: string[], warnings: string[]): Promise<void> {
    // Cannot reschedule completed matches
    if (currentMatch.status === 'completed') {
      errors.push('Cannot reschedule completed matches')
    }

    // Cannot reschedule to past
    if (newDateTime < new Date()) {
      errors.push('Cannot reschedule to past time')
    }

    // Check for conflicts with new time
    const conflictQuery = query(
      this.matchesCollection,
      where('scheduledDateTime', '==', newDateTime)
    )

    const conflictSnap = await getDocs(conflictQuery)
    const conflicts = conflictSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as Match)
      .filter(match => 
        match.id !== currentMatch.id && (
          match.player1Id === currentMatch.player1Id ||
          match.player1Id === currentMatch.player2Id ||
          match.player2Id === currentMatch.player1Id ||
          match.player2Id === currentMatch.player2Id
        )
      )

    if (conflicts.length > 0) {
      errors.push('Players have conflicts at the new scheduled time')
    }
  }

  private getCurrentRound(bracket: TournamentBracket, communityId: string): string | null {
    const communityBracket = bracket.bracketLevels.community[communityId]
    return communityBracket?.currentRound || null
  }

  private isPlayerInScope(bracket: TournamentBracket, playerId: string, communityId: string): boolean {
    // This would check if the player is within the tournament's participant scope
    // Implementation would depend on how player scope is defined in the bracket
    return bracket.participantScope.allowedCommunityIds.includes(communityId)
  }
}

// Export singleton instance
export const matchValidationService = new MatchValidationService()