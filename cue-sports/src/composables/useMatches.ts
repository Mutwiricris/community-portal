import { ref, computed, reactive } from 'vue'
import { useToast } from './useToast'
import { matchService } from '@/services/matchService'
import { matchValidationService } from '@/services/matchValidationService'
import { tournamentBracketService } from '@/services/tournamentBracketService'
import type {
  Match,
  MatchCreationData,
  MatchUpdateData,
  MatchResult,
  MatchFilters,
  MatchSearchParams,
  MatchValidationResult,
  MatchValidationRules
} from '@/types/match'
import { matchUtils } from '@/utils/matchUtils'

export const useMatches = () => {
  const { success, error: showError, warning } = useToast()
  
  // State
  const matches = ref<Match[]>([])
  const currentMatch = ref<Match | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const validationErrors = ref<string[]>([])
  const validationWarnings = ref<string[]>([])

  // Computed
  const pendingMatches = computed(() =>
    matches.value.filter(m => m.status === 'pending')
  )

  const scheduledMatches = computed(() =>
    matches.value.filter(m => m.status === 'scheduled')
  )

  const inProgressMatches = computed(() =>
    matches.value.filter(m => m.status === 'in_progress')
  )

  const completedMatches = computed(() =>
    matches.value.filter(m => m.status === 'completed')
  )

  const upcomingMatches = computed(() =>
    matches.value.filter(m => matchUtils.date.isUpcoming(m))
  )

  const overdueMatches = computed(() =>
    matches.value.filter(m => matchUtils.date.isOverdue(m))
  )

  // Match CRUD operations
  const createMatch = async (data: MatchCreationData, createdBy: string): Promise<Match | null> => {
    loading.value = true
    error.value = null
    validationErrors.value = []
    validationWarnings.value = []

    try {
      // Validate before creation - use relaxed rules for manual creation
      const validation = await validateMatchCreation(data, {
        validatePlayerEligibility: false, // Skip player eligibility check for manual creation
        checkSchedulingConflicts: true,
        validateVenueAvailability: false, // Skip venue validation for manual creation
        ensureBracketConsistency: false, // Skip bracket consistency for manual creation
        validateMatchType: true
      })
      if (!validation.isValid) {
        validationErrors.value = validation.errors
        validationWarnings.value = validation.warnings
        console.error('Match validation failed:', validation.errors)
        showError(`Match validation failed: ${validation.errors.join(', ')}`)
        return null
      }

      if (validation.warnings.length > 0) {
        validationWarnings.value = validation.warnings
        warning(`Match created with ${validation.warnings.length} warning(s)`)
      }

      const match = await matchService.createMatch(data, createdBy)
      matches.value.push(match)
      
      success('Match created successfully')
      return match
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create match'
      showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  const updateMatch = async (matchId: string, updates: MatchUpdateData, updatedBy: string, tournamentId?: string): Promise<Match | null> => {
    loading.value = true
    error.value = null

    try {
      const updatedMatch = await matchService.updateMatch(matchId, updates, updatedBy, tournamentId)
      
      // Update local state
      const index = matches.value.findIndex(m => m.id === matchId)
      if (index !== -1) {
        matches.value[index] = updatedMatch
      }
      
      if (currentMatch.value?.id === matchId) {
        currentMatch.value = updatedMatch
      }

      success('Match updated successfully')
      return updatedMatch
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update match'
      showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  const submitMatchResult = async (result: MatchResult): Promise<Match | null> => {
    loading.value = true
    error.value = null

    try {
      const updatedMatch = await matchService.submitMatchResult(result)
      
      // Update local state
      const index = matches.value.findIndex(m => m.id === result.matchId)
      if (index !== -1) {
        matches.value[index] = updatedMatch
      }
      
      if (currentMatch.value?.id === result.matchId) {
        currentMatch.value = updatedMatch
      }

      // Update bracket after result submission
      await tournamentBracketService.updateBracketAfterMatch(updatedMatch.tournamentId, result)

      success('Match result submitted successfully')
      return updatedMatch
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit match result'
      showError(error.value)
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteMatch = async (matchId: string, deletedBy: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await matchService.deleteMatch(matchId, deletedBy)
      
      // Remove from local state
      matches.value = matches.value.filter(m => m.id !== matchId)
      
      if (currentMatch.value?.id === matchId) {
        currentMatch.value = null
      }

      success('Match deleted successfully')
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete match'
      showError(error.value)
      return false
    } finally {
      loading.value = false
    }
  }

  // Match retrieval operations
  const getMatch = async (matchId: string, tournamentId?: string): Promise<Match | null> => {
    loading.value = true
    error.value = null

    try {
      const match = await matchService.getMatch(matchId, tournamentId)
      if (match) {
        currentMatch.value = match
      }
      return match
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get match'
      return null
    } finally {
      loading.value = false
    }
  }

  const getMatchesByTournament = async (tournamentId: string): Promise<Match[]> => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Fetching all tournament matches (including indexed)...')
      const tournamentMatches = await matchService.getMatchesByTournament(tournamentId)
      matches.value = tournamentMatches
      console.log(`✅ Loaded ${tournamentMatches.length} matches for tournament`)
      return tournamentMatches
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get tournament matches'
      return []
    } finally {
      loading.value = false
    }
  }
  
  // Get ALL matches from all possible indexed locations for a tournament
  const getAllIndexedMatches = async (tournamentId: string): Promise<Match[]> => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Fetching ALL indexed matches...')
      const allMatches = await matchService.getAllIndexedMatches(tournamentId)
      matches.value = allMatches
      console.log(`✅ Found ${allMatches.length} total matches across all indexed locations`)
      return allMatches
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get indexed matches'
      return []
    } finally {
      loading.value = false
    }
  }
  
  // Get ALL matches from ALL tournaments with tournament names
  const getAllMatchesWithTournamentNames = async (): Promise<(Match & { tournamentName?: string })[]> => {
    loading.value = true
    error.value = null

    try {
      console.log('🔍 Fetching ALL matches from ALL tournaments with names...')
      const allMatches = await matchService.getAllMatchesWithTournamentNames()
      
      // Update the matches state (without tournament names for compatibility)
      matches.value = allMatches.map(({ tournamentName, ...match }) => match as Match)
      
      console.log(`✅ Found ${allMatches.length} total matches across ALL tournaments`)
      return allMatches
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get all matches with tournament names'
      return []
    } finally {
      loading.value = false
    }
  }

  const getMatchesByRound = async (tournamentId: string, roundNumber: string): Promise<Match[]> => {
    loading.value = true
    error.value = null

    try {
      const roundMatches = await matchService.getMatchesByRound(tournamentId, roundNumber)
      return roundMatches
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get round matches'
      return []
    } finally {
      loading.value = false
    }
  }

  const searchMatches = async (params: MatchSearchParams): Promise<{ matches: Match[], total: number, hasMore: boolean }> => {
    loading.value = true
    error.value = null

    try {
      const result = await matchService.searchMatches(params)
      // Always update matches array with results
      matches.value = result.matches
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search matches'
      return { matches: [], total: 0, hasMore: false }
    } finally {
      loading.value = false
    }
  }

  // Batch operations
  const createMatchesBatch = async (matchesData: MatchCreationData[], createdBy: string): Promise<Match[]> => {
    loading.value = true
    error.value = null

    try {
      // Validate all matches before creation
      const validationResults = await Promise.all(
        matchesData.map(data => validateMatchCreation(data))
      )

      const invalidMatches = validationResults.filter(result => !result.isValid)
      if (invalidMatches.length > 0) {
        const allErrors = invalidMatches.flatMap(result => result.errors)
        validationErrors.value = allErrors
        showError(`${invalidMatches.length} matches failed validation`)
        return []
      }

      const createdMatches = await matchService.createMatchesBatch(matchesData, createdBy)
      matches.value.push(...createdMatches)
      
      success(`${createdMatches.length} matches created successfully`)
      return createdMatches
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create matches batch'
      showError(error.value)
      return []
    } finally {
      loading.value = false
    }
  }

  // Validation
  const validateMatchCreation = async (data: MatchCreationData, rules?: Partial<MatchValidationRules>): Promise<MatchValidationResult> => {
    try {
      return await matchValidationService.validateMatchCreation(data, rules)
    } catch (err) {
      return {
        isValid: false,
        errors: [err instanceof Error ? err.message : 'Validation failed'],
        warnings: []
      }
    }
  }

  const validatePlayerForTournament = async (playerId: string, tournamentId: string): Promise<MatchValidationResult> => {
    try {
      return await matchValidationService.validatePlayerForTournament(playerId, tournamentId)
    } catch (err) {
      return {
        isValid: false,
        errors: [err instanceof Error ? err.message : 'Player validation failed'],
        warnings: []
      }
    }
  }

  // Match status operations
  const startMatch = async (matchId: string, startedBy: string): Promise<boolean> => {
    const match = matches.value.find(m => m.id === matchId)
    if (!match || !matchUtils.status.canStartMatch(match)) {
      showError('Match cannot be started')
      return false
    }

    const updates: MatchUpdateData = {
      status: 'in_progress',
      actualStartTime: new Date()
    }

    const result = await updateMatch(matchId, updates, startedBy, match.tournamentId)
    return result !== null
  }

  const cancelMatch = async (matchId: string, cancelledBy: string, reason?: string): Promise<boolean> => {
    const match = matches.value.find(m => m.id === matchId)
    if (!match || !matchUtils.status.canCancelMatch(match)) {
      showError('Match cannot be cancelled')
      return false
    }

    const updates: MatchUpdateData = {
      status: 'cancelled',
      adminNotes: reason || 'Match cancelled'
    }

    const result = await updateMatch(matchId, updates, cancelledBy, match.tournamentId)
    return result !== null
  }

  const rescheduleMatch = async (
    matchId: string, 
    newDateTime: Date, 
    rescheduledBy: string
  ): Promise<boolean> => {
    const match = matches.value.find(m => m.id === matchId)
    if (!match || !matchUtils.status.canRescheduleMatch(match)) {
      showError('Match cannot be rescheduled')
      return false
    }

    const updates: MatchUpdateData = {
      scheduledDateTime: newDateTime
    }

    const result = await updateMatch(matchId, updates, rescheduledBy, match.tournamentId)
    return result !== null
  }

  // Utility functions
  const getPlayerMatches = (playerId: string): Match[] => {
    return matches.value.filter(m => 
      m.player1Id === playerId || m.player2Id === playerId
    )
  }

  const getMatchesForPlayer = (playerId: string, status?: Match['status']): Match[] => {
    let playerMatches = getPlayerMatches(playerId)
    if (status) {
      playerMatches = playerMatches.filter(m => m.status === status)
    }
    return playerMatches
  }

  const getMatchesByVenue = (venueId: string): Match[] => {
    return matches.value.filter(m => m.venueId === venueId)
  }

  const getMatchesByDate = (date: Date): Match[] => {
    const dateStr = date.toDateString()
    return matches.value.filter(m => {
      if (!m.scheduledDateTime) return false
      const matchDate = new Date(m.scheduledDateTime.toString())
      return matchDate.toDateString() === dateStr
    })
  }

  const filterMatches = (filters: MatchFilters): Match[] => {
    return matchUtils.filter.applyFilters(matches.value, filters)
  }

  const sortMatches = (
    sortBy: 'scheduledDateTime' | 'matchNumber' | 'createdAt' | 'actualStartTime' = 'matchNumber',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Match[] => {
    return matchUtils.filter.sortMatches(matches.value, sortBy, sortOrder)
  }

  // Clear state
  const clearMatches = () => {
    matches.value = []
    currentMatch.value = null
    error.value = null
    validationErrors.value = []
    validationWarnings.value = []
  }

  const clearErrors = () => {
    error.value = null
    validationErrors.value = []
    validationWarnings.value = []
  }

  return {
    // State
    matches,
    currentMatch,
    loading,
    error,
    validationErrors,
    validationWarnings,

    // Computed
    pendingMatches,
    scheduledMatches,
    inProgressMatches,
    completedMatches,
    upcomingMatches,
    overdueMatches,

    // CRUD operations
    createMatch,
    updateMatch,
    submitMatchResult,
    deleteMatch,
    createMatchesBatch,

    // Retrieval operations
    getMatch,
    getMatchesByTournament,
    getAllIndexedMatches,
    getAllMatchesWithTournamentNames,
    getMatchesByRound,
    searchMatches,

    // Validation
    validateMatchCreation,
    validatePlayerForTournament,

    // Status operations
    startMatch,
    cancelMatch,
    rescheduleMatch,

    // Utility functions
    getPlayerMatches,
    getMatchesForPlayer,
    getMatchesByVenue,
    getMatchesByDate,
    filterMatches,
    sortMatches,

    // State management
    clearMatches,
    clearErrors
  }
}