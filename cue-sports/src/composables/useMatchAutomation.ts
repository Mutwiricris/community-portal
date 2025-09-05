import { ref, computed, watch } from 'vue'
import { useToast } from './useToast'
import { useAutomation } from './useAutomation'
import { useMatches } from './useMatches'
import type { Match } from '@/types/match'

export const useMatchAutomation = () => {
  const { showToast } = useToast()
  const { 
    autoAdvanceMatches, 
    generateCommunityRound, 
    finalizeCommunityWinners,
    getTournamentPositions,
    checkAlgorithmHealth 
  } = useAutomation()
  const { matches, updateMatch, getMatchesByTournament } = useMatches()

  // State
  const isMonitoring = ref(false)
  const monitoredTournaments = ref<Set<string>>(new Set())
  const autoAdvanceEnabled = ref(true)
  const completedMatchQueue = ref<{ tournamentId: string; matchId: string; completedAt: Date }[]>([])

  // Configuration for auto-advancement
  const autoAdvanceConfig = ref({
    delayMs: 5000, // 5 second delay before checking for advancement
    batchSize: 10, // Process matches in batches
    maxRetries: 3
  })

  // Start monitoring a tournament for completed matches
  const startMonitoring = (tournamentId: string, userId: string): void => {
    if (monitoredTournaments.value.has(tournamentId)) {
      return
    }

    monitoredTournaments.value.add(tournamentId)
    isMonitoring.value = true

    showToast(`Started match automation monitoring for tournament ${tournamentId}`, 'info')

    // Set up periodic check for completed matches
    const checkInterval = setInterval(async () => {
      await checkForCompletedMatches(tournamentId, userId)
    }, 30000) // Check every 30 seconds

    // Store interval reference for cleanup
    ;(window as any)[`matchMonitor_${tournamentId}`] = checkInterval
  }

  // Stop monitoring a tournament
  const stopMonitoring = (tournamentId: string): void => {
    if (!monitoredTournaments.value.has(tournamentId)) {
      return
    }

    monitoredTournaments.value.delete(tournamentId)
    
    // Clear interval
    const intervalId = (window as any)[`matchMonitor_${tournamentId}`]
    if (intervalId) {
      clearInterval(intervalId)
      delete (window as any)[`matchMonitor_${tournamentId}`]
    }

    // Update monitoring state
    isMonitoring.value = monitoredTournaments.value.size > 0

    showToast(`Stopped match automation monitoring for tournament ${tournamentId}`, 'info')
  }

  // Check for newly completed matches
  const checkForCompletedMatches = async (tournamentId: string, userId: string): Promise<void> => {
    try {
      await getMatchesByTournament(tournamentId)
      
      const tournamentMatches = matches.value.filter(match => 
        match.tournamentId === tournamentId && 
        match.status === 'completed' &&
        match.winnerId && 
        match.loserId
      )

      // Find matches that were recently completed (within last 2 minutes)
      const recentlyCompleted = tournamentMatches.filter(match => {
        const completedAt = match.completedAt
        if (!completedAt) return false
        
        const timeDiff = Date.now() - new Date(completedAt).getTime()
        return timeDiff <= 120000 // 2 minutes
      })

      if (recentlyCompleted.length > 0) {
        await handleCompletedMatches(tournamentId, recentlyCompleted, userId)
      }
    } catch (error) {
      console.error('Error checking for completed matches:', error)
    }
  }

  // Handle a batch of completed matches
  const handleCompletedMatches = async (
    tournamentId: string, 
    completedMatches: Match[], 
    userId: string
  ): Promise<void> => {
    if (!autoAdvanceEnabled.value || completedMatches.length === 0) {
      return
    }

    try {
      // Group matches by round and community for better processing
      const matchesByRound = groupMatchesByRound(completedMatches)
      
      for (const [roundKey, roundMatches] of Object.entries(matchesByRound)) {
        const [round, communityId] = roundKey.split('|')
        
        // Check if this round is complete
        const isRoundComplete = await checkRoundCompletion(tournamentId, round, communityId)
        
        if (isRoundComplete) {
          showToast(`Round ${round} completed for ${communityId || 'tournament'}, triggering automation...`, 'info')
          
          // Try to advance the round using algorithm
          if (communityId) {
            await generateCommunityRound(tournamentId, communityId, userId)
          } else {
            await autoAdvanceMatches(tournamentId, roundMatches.map(m => m.id), userId)
          }
        }
      }
    } catch (error) {
      console.error('Error handling completed matches:', error)
      showToast('Error in match automation', 'error')
    }
  }

  // Group matches by round and community
  const groupMatchesByRound = (matches: Match[]): Record<string, Match[]> => {
    return matches.reduce((groups, match) => {
      const key = `${match.roundNumber}|${match.communityId || ''}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(match)
      return groups
    }, {} as Record<string, Match[]>)
  }

  // Check if a round is complete
  const checkRoundCompletion = async (
    tournamentId: string, 
    round: string, 
    communityId?: string
  ): Promise<boolean> => {
    try {
      await getMatchesByTournament(tournamentId)
      
      const roundMatches = matches.value.filter(match => 
        match.tournamentId === tournamentId &&
        match.roundNumber === round &&
        (!communityId || match.communityId === communityId)
      )

      if (roundMatches.length === 0) {
        return false
      }

      // Check if all matches in the round are completed
      return roundMatches.every(match => 
        match.status === 'completed' && 
        match.winnerId && 
        match.loserId
      )
    } catch (error) {
      console.error('Error checking round completion:', error)
      return false
    }
  }

  // Manually trigger automation for specific matches
  const triggerManualAdvancement = async (
    tournamentId: string,
    matchIds: string[],
    userId: string
  ): Promise<boolean> => {
    try {
      const result = await autoAdvanceMatches(tournamentId, matchIds, userId)
      
      if (result) {
        showToast('Manual advancement triggered successfully', 'success')
      } else {
        showToast('Manual advancement did not trigger any progression', 'warning')
      }
      
      return result
    } catch (error) {
      console.error('Error in manual advancement:', error)
      showToast('Manual advancement failed', 'error')
      return false
    }
  }

  // Force finalize a community tournament
  const forceFinalizeCommunity = async (
    tournamentId: string,
    communityId: string,
    userId: string
  ): Promise<boolean> => {
    try {
      const result = await finalizeCommunityWinners(tournamentId, communityId, userId)
      
      if (result.success) {
        showToast(`Community ${communityId} finalized successfully`, 'success')
        
        // Get final positions
        const positions = await getTournamentPositions(tournamentId, 'community')
        if (positions.success) {
          showToast('Final positions determined', 'info')
        }
        
        return true
      } else {
        showToast(`Failed to finalize community: ${result.message}`, 'error')
        return false
      }
    } catch (error) {
      console.error('Error finalizing community:', error)
      showToast('Community finalization failed', 'error')
      return false
    }
  }

  // Get automation status for a tournament
  const getAutomationStatus = (tournamentId: string) => {
    return {
      isMonitored: monitoredTournaments.value.has(tournamentId),
      autoAdvanceEnabled: autoAdvanceEnabled.value,
      queuedMatches: completedMatchQueue.value.filter(item => item.tournamentId === tournamentId).length
    }
  }

  // Cleanup function
  const cleanup = (): void => {
    // Stop all monitoring
    Array.from(monitoredTournaments.value).forEach(tournamentId => {
      stopMonitoring(tournamentId)
    })
    
    // Clear state
    monitoredTournaments.value.clear()
    completedMatchQueue.value = []
    isMonitoring.value = false
  }

  // Computed properties
  const monitoredTournamentCount = computed(() => monitoredTournaments.value.size)
  const hasQueuedMatches = computed(() => completedMatchQueue.value.length > 0)

  return {
    // State
    isMonitoring,
    autoAdvanceEnabled,
    monitoredTournamentCount,
    hasQueuedMatches,

    // Configuration
    autoAdvanceConfig,

    // Core methods
    startMonitoring,
    stopMonitoring,
    checkForCompletedMatches,
    triggerManualAdvancement,
    forceFinalizeCommunity,
    getAutomationStatus,
    cleanup,

    // Utility methods
    checkRoundCompletion,
    groupMatchesByRound
  }
}