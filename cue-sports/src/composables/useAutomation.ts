import { ref, computed } from 'vue'
import { useToast } from './useToast'
import { useMatches } from './useMatches'
import { useMatchPlayers } from './useMatchPlayers'
import { 
  tournamentProgressionService, 
  type ProgressionConfig, 
  type ProgressionStatus,
  type ProgressionEvent
} from '@/services/tournamentProgressionService'
import { 
  automationFallbackService, 
  type FallbackConfig,
  type FallbackResult
} from '@/services/automationFallbackService'
import { algorithmService } from '@/services/algorithmService'

export const useAutomation = () => {
  const { success, error: showError, warning } = useToast()
  const { createMatchesBatch } = useMatches()
  const { loadRegisteredPlayers } = useMatchPlayers()

  // State
  const isInitializing = ref(false)
  const isProgressing = ref(false)
  const automationActive = ref(false)
  const error = ref<string | null>(null)
  const lastEvent = ref<ProgressionEvent | null>(null)

  // Initialize automation for a tournament
  const initializeAutomation = async (
    tournamentId: string,
    config: ProgressionConfig,
    fallbackConfig: FallbackConfig,
    initiatedBy: string,
    players?: any[]
  ): Promise<{ success: boolean; message: string }> => {
    isInitializing.value = true
    error.value = null

    try {
      // Set up fallback configuration
      automationFallbackService.setFallbackConfig(tournamentId, fallbackConfig)

      // Initialize progression
      const result = await tournamentProgressionService.initializeProgression(
        tournamentId,
        config,
        initiatedBy,
        players
      )

      if (result.success) {
        automationActive.value = true
        showToast('Tournament automation initialized successfully', 'success')
      } else {
        error.value = result.message
        showToast(`Failed to initialize automation: ${result.message}`, 'error')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize automation'
      error.value = message
      showToast(message, 'error')
      
      return {
        success: false,
        message
      }
    } finally {
      isInitializing.value = false
    }
  }

  // Check and progress tournament with enhanced algorithm integration
  const checkAndProgress = async (
    tournamentId: string,
    triggeredBy: string
  ): Promise<boolean> => {
    isProgressing.value = true
    error.value = null

    try {
      // First check algorithm health
      const health = await algorithmService.checkServiceHealth()
      if (!health.healthy) {
        showToast('Algorithm service is offline, using fallback system', 'warning')
        return await triggerFallbackProgression(tournamentId, triggeredBy)
      }

      // Try normal algorithm progression
      const progressResult = await tournamentProgressionService.checkAndProgressRound(
        tournamentId,
        triggeredBy
      )

      if (progressResult) {
        automationFallbackService.recordAlgorithmSuccess(tournamentId)
        showToast('Tournament progressed successfully', 'success')
        return true
      }

      // If progression didn't happen, check if we should use fallback
      if (automationFallbackService.shouldTriggerFallback(tournamentId)) {
        showToast('Using fallback system for tournament progression', 'info')
        return await triggerFallbackProgression(tournamentId, triggeredBy)
      }

      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Progression check failed'
      error.value = message
      
      // Record algorithm failure
      automationFallbackService.recordAlgorithmFailure(tournamentId)
      
      // Try fallback if configured
      if (automationFallbackService.shouldTriggerFallback(tournamentId)) {
        showToast('Algorithm failed, switching to fallback system', 'warning')
        return await triggerFallbackProgression(tournamentId, triggeredBy)
      }

      showToast(message, 'error')
      return false
    } finally {
      isProgressing.value = false
    }
  }

  // Trigger fallback progression
  const triggerFallbackProgression = async (
    tournamentId: string,
    triggeredBy: string
  ): Promise<boolean> => {
    try {
      const status = tournamentProgressionService.getProgressionStatus(tournamentId)
      if (!status) {
        throw new Error('Tournament progression status not found')
      }

      // Load registered players for the tournament
      const players = await loadRegisteredPlayers(tournamentId)
      
      if (players.length === 0) {
        throw new Error('No registered players found for fallback progression')
      }

      // Generate fallback matches
      const fallbackResult = await automationFallbackService.generateFallbackMatches(
        tournamentId,
        players,
        status.currentRound,
        triggeredBy
      )

      if (!fallbackResult.success) {
        throw new Error(fallbackResult.errors.join(', ') || 'Fallback match generation failed')
      }

      // Create the matches
      const createdMatches = await createMatchesBatch(fallbackResult.matches, triggeredBy)

      if (createdMatches.length > 0) {
        // Show warnings if any
        if (fallbackResult.warnings.length > 0) {
          fallbackResult.warnings.forEach(warning => {
            showToast(warning, 'warning')
          })
        }

        warning(
          'Info',
          `Fallback system generated ${createdMatches.length} matches using ${fallbackResult.method}`
        )

        // Notify that manual review is required
        if (fallbackResult.requiresManualReview) {
          warning(
            'Warning',
            'Fallback matches require manual review before proceeding'
          )
        }

        return true
      }

      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fallback progression failed'
      error.value = message
      showToast(message, 'error')
      return false
    }
  }

  // Force advance to next round with fallback support
  const forceAdvanceRound = async (
    tournamentId: string,
    advancedBy: string
  ): Promise<boolean> => {
    isProgressing.value = true
    error.value = null

    try {
      // Try normal advancement first
      const advanceResult = await tournamentProgressionService.advanceToNextRound(
        tournamentId,
        advancedBy
      )

      if (advanceResult) {
        automationFallbackService.recordAlgorithmSuccess(tournamentId)
        showToast('Round advanced successfully', 'success')
        return true
      }

      // If normal advancement failed, try fallback
      const fallbackTriggered = await triggerFallbackProgression(tournamentId, advancedBy)
      
      if (fallbackTriggered) {
        showToast('Round advanced using fallback system', 'warning')
        return true
      }

      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to advance round'
      error.value = message
      automationFallbackService.recordAlgorithmFailure(tournamentId)
      showToast(message, 'error')
      return false
    } finally {
      isProgressing.value = false
    }
  }

  // Check algorithm health
  const checkAlgorithmHealth = async (): Promise<{ healthy: boolean; message: string; responseTime: number }> => {
    try {
      return await algorithmService.checkServiceHealth()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Health check failed'
      return {
        healthy: false,
        message,
        responseTime: 0
      }
    }
  }

  // Get automation status for a tournament
  const getAutomationStatus = (tournamentId: string): {
    progression: ProgressionStatus | null
    fallback: {
      consecutiveFailures: number
      lastFallbackUsed: Date | null
      config: FallbackConfig | null
    }
  } => {
    return {
      progression: tournamentProgressionService.getProgressionStatus(tournamentId),
      fallback: automationFallbackService.getFallbackStats(tournamentId)
    }
  }

  // Stop automation for a tournament
  const stopAutomation = (tournamentId: string): void => {
    tournamentProgressionService.stopProgression(tournamentId)
    automationFallbackService.resetFallbackState(tournamentId)
    automationActive.value = false
    showToast('Tournament automation stopped', 'info')
  }

  // Pause automation (stop timers but keep state)
  const pauseAutomation = (tournamentId: string): void => {
    tournamentProgressionService.stopProgression(tournamentId)
    showToast('Tournament automation paused', 'info')
  }

  // Resume automation
  const resumeAutomation = async (
    tournamentId: string,
    resumedBy: string
  ): Promise<boolean> => {
    try {
      // Check current status and resume if appropriate
      const status = tournamentProgressionService.getProgressionStatus(tournamentId)
      
      if (!status) {
        throw new Error('No automation status found to resume')
      }

      // Trigger a progression check to resume normal flow
      return await checkAndProgress(tournamentId, resumedBy)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume automation'
      error.value = message
      showToast(message, 'error')
      return false
    }
  }

  // Event listener for progression events
  const addEventListener = (listener: (event: ProgressionEvent) => void): void => {
    tournamentProgressionService.addEventListener(listener)
  }

  const removeEventListener = (listener: (event: ProgressionEvent) => void): void => {
    tournamentProgressionService.removeEventListener(listener)
  }

  // Generate specific community round using algorithm
  const generateCommunityRound = async (
    tournamentId: string,
    communityId: string,
    triggeredBy: string
  ): Promise<{ success: boolean; message: string; roundGenerated?: string; matchesGenerated?: number }> => {
    isProgressing.value = true
    error.value = null

    try {
      // Check algorithm health first
      const health = await algorithmService.checkServiceHealth()
      if (!health.healthy) {
        throw new Error('Algorithm service is not available')
      }

      // Generate community round using progression service
      const result = await tournamentProgressionService.generateCommunityRound(
        tournamentId,
        communityId,
        triggeredBy
      )

      if (result.success) {
        automationFallbackService.recordAlgorithmSuccess(tournamentId)
        showToast(
          `Community round generated: ${result.roundGenerated} (${result.matchesGenerated} matches)`,
          'success'
        )
      } else {
        automationFallbackService.recordAlgorithmFailure(tournamentId)
        showToast(`Failed to generate community round: ${result.message}`, 'error')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Community round generation failed'
      error.value = message
      automationFallbackService.recordAlgorithmFailure(tournamentId)
      showToast(message, 'error')
      
      return {
        success: false,
        message
      }
    } finally {
      isProgressing.value = false
    }
  }

  // Finalize community winners using algorithm
  const finalizeCommunityWinners = async (
    tournamentId: string,
    communityId: string,
    triggeredBy: string
  ): Promise<{ success: boolean; message: string; positions?: any }> => {
    isProgressing.value = true
    error.value = null

    try {
      // Check algorithm health first
      const health = await algorithmService.checkServiceHealth()
      if (!health.healthy) {
        throw new Error('Algorithm service is not available')
      }

      // Finalize community using progression service
      const result = await tournamentProgressionService.finalizeCommunityWinners(
        tournamentId,
        communityId,
        triggeredBy
      )

      if (result.success) {
        automationFallbackService.recordAlgorithmSuccess(tournamentId)
        showToast(`Community ${communityId} finalized successfully`, 'success')
      } else {
        automationFallbackService.recordAlgorithmFailure(tournamentId)
        showToast(`Failed to finalize community: ${result.message}`, 'error')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Community finalization failed'
      error.value = message
      automationFallbackService.recordAlgorithmFailure(tournamentId)
      showToast(message, 'error')
      
      return {
        success: false,
        message
      }
    } finally {
      isProgressing.value = false
    }
  }

  // Get tournament positions using algorithm
  const getTournamentPositions = async (
    tournamentId: string,
    level?: string
  ): Promise<{ success: boolean; positions: any; level: string; completed: boolean; error?: string }> => {
    try {
      // Check algorithm health first
      const health = await algorithmService.checkServiceHealth()
      if (!health.healthy) {
        throw new Error('Algorithm service is not available')
      }

      // Get positions using progression service
      const result = await tournamentProgressionService.getTournamentPositions(tournamentId, level)

      if (result.success) {
        automationFallbackService.recordAlgorithmSuccess(tournamentId)
        showToast(`Tournament positions retrieved for ${result.level} level`, 'success')
      } else {
        automationFallbackService.recordAlgorithmFailure(tournamentId)
        showToast(`Failed to get positions: ${result.error}`, 'error')
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Position query failed'
      error.value = message
      automationFallbackService.recordAlgorithmFailure(tournamentId)
      showToast(message, 'error')
      
      return {
        success: false,
        positions: {},
        level: level || 'community',
        completed: false,
        error: message
      }
    }
  }

  // Auto-advance matches when they're completed
  const autoAdvanceMatches = async (
    tournamentId: string,
    completedMatchIds: string[],
    triggeredBy: string
  ): Promise<boolean> => {
    if (completedMatchIds.length === 0) {
      return false
    }

    isProgressing.value = true
    error.value = null

    try {
      showToast(`${completedMatchIds.length} matches completed, checking for round progression...`, 'info')
      
      // Check if we can progress based on completed matches
      const canProgress = await checkAndProgress(tournamentId, triggeredBy)
      
      if (canProgress) {
        showToast('Round automatically advanced after match completion', 'success')
        return true
      }

      return false
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auto-advance failed'
      error.value = message
      showToast(message, 'error')
      return false
    } finally {
      isProgressing.value = false
    }
  }

  // Batch create matches with automation feedback
  const createMatchesBatchWithAutomation = async (
    matches: any[],
    createdBy: string,
    tournamentId: string
  ): Promise<any[]> => {
    try {
      const createdMatches = await createMatchesBatch(matches, createdBy)
      
      if (createdMatches.length > 0) {
        showToast(`${createdMatches.length} matches created successfully`, 'success')
        
        // Emit match creation event
        const event: ProgressionEvent = {
          type: 'match_created',
          tournamentId,
          level: 'community', // Default, could be improved
          round: 'unknown', // Could be extracted from match data
          data: { matchesCreated: createdMatches.length },
          timestamp: new Date()
        }
        
        handleProgressionEvent(event)
      }
      
      return createdMatches
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch match creation failed'
      error.value = message
      showToast(message, 'error')
      throw err
    }
  }

  // Handle progression events
  const handleProgressionEvent = (event: ProgressionEvent): void => {
    lastEvent.value = event

    // Update local state based on event
    switch (event.type) {
      case 'round_started':
        isProgressing.value = true
        showToast(`Round ${event.round} started (${event.level} level)`, 'info')
        break
      case 'round_completed':
        isProgressing.value = false
        showToast(`Round ${event.round} completed (${event.level} level)`, 'success')
        break
      case 'level_completed':
        showToast(`${event.level} level completed`, 'success')
        break
      case 'tournament_completed':
        automationActive.value = false
        showToast('🏆 Tournament completed!', 'success')
        break
      case 'error':
        error.value = event.data?.message || 'Unknown error'
        showToast(`Automation error: ${error.value}`, 'error')
        break
      case 'match_created':
        // Real-time match creation updates
        if (event.data?.matchesCreated) {
          showToast(`${event.data.matchesCreated} new matches created`, 'info')
        }
        break
    }
  }

  // Computed properties
  const canInitialize = computed(() => !isInitializing.value && !automationActive.value)
  const canProgress = computed(() => !isProgressing.value && automationActive.value)

  // Clear state
  const clearError = (): void => {
    error.value = null
  }

  return {
    // State
    isInitializing,
    isProgressing,
    automationActive,
    error,
    lastEvent,

    // Computed
    canInitialize,
    canProgress,

    // Core automation methods
    initializeAutomation,
    checkAndProgress,
    forceAdvanceRound,
    checkAlgorithmHealth,
    getAutomationStatus,
    stopAutomation,
    pauseAutomation,
    resumeAutomation,

    // Algorithm-specific methods
    generateCommunityRound,
    finalizeCommunityWinners,
    getTournamentPositions,
    autoAdvanceMatches,
    createMatchesBatchWithAutomation,

    // Event handling
    addEventListener,
    removeEventListener,
    handleProgressionEvent,
    clearError,

    // Fallback methods
    triggerFallbackProgression
  }
}