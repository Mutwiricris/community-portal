/**
 * Algorithm Automation Composable - Fresh implementation for algorithm-based tournament automation
 * Provides reactive state management and methods for automated tournament progression
 * Completely separate from manual automation system
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { useToast } from './useToast'
import { useMatches } from './useMatches'
import { 
  algorithmMatchService, 
  type AlgorithmTournamentConfig,
  type AlgorithmMatchResult,
  type AlgorithmProgressionResult 
} from '@/services/algorithmMatchService'
import { algorithmService } from '@/services/algorithmService'

export interface AlgorithmAutomationState {
  isInitializing: boolean
  isProgressing: boolean
  isMonitoring: boolean
  isHealthy: boolean
  lastHealthCheck: Date | null
  activeTournaments: Set<string>
  monitoredCommunities: Set<string>
  autoProgressEnabled: boolean
  lastProgressionTime: Date | null
  totalMatchesGenerated: number
  successfulProgressions: number
  failedProgressions: number
}

export interface AlgorithmMonitoringConfig {
  checkInterval: number // milliseconds
  autoProgress: boolean
  notifyOnCompletion: boolean
  retryFailedProgressions: boolean
  maxRetries: number
}

export const useAlgorithmAutomation = () => {
  const { showToast } = useToast()
  const { matches, getMatchesByTournament } = useMatches()

  // Core reactive state
  const state = ref<AlgorithmAutomationState>({
    isInitializing: false,
    isProgressing: false,
    isMonitoring: false,
    isHealthy: true,
    lastHealthCheck: null,
    activeTournaments: new Set(),
    monitoredCommunities: new Set(),
    autoProgressEnabled: true,
    lastProgressionTime: null,
    totalMatchesGenerated: 0,
    successfulProgressions: 0,
    failedProgressions: 0
  })

  // Monitoring configuration
  const monitoringConfig = ref<AlgorithmMonitoringConfig>({
    checkInterval: 30000, // 30 seconds
    autoProgress: true,
    notifyOnCompletion: true,
    retryFailedProgressions: true,
    maxRetries: 3
  })

  // Monitoring intervals storage
  const monitoringIntervals = new Map<string, NodeJS.Timeout>()

  /**
   * Initialize tournament with algorithm automation
   */
  const initializeTournamentAutomation = async (config: AlgorithmTournamentConfig): Promise<AlgorithmMatchResult> => {
    state.value.isInitializing = true
    
    try {
      showToast('Initializing tournament with algorithm...', 'info')
      
      const result = await algorithmMatchService.initializeTournamentWithAlgorithm(config)
      
      if (result.success) {
        state.value.activeTournaments.add(config.tournamentId)
        state.value.totalMatchesGenerated += result.data?.matchesCreated || 0
        state.value.successfulProgressions++
        
        showToast(result.message, 'success')
        
        // Start monitoring if auto-progress is enabled
        if (config.autoProgressRounds) {
          await startTournamentMonitoring(config.tournamentId)
        }
      } else {
        state.value.failedProgressions++
        showToast(result.message, 'error')
      }
      
      return result
    } catch (error) {
      state.value.failedProgressions++
      const message = error instanceof Error ? error.message : 'Tournament initialization failed'
      showToast(message, 'error')
      
      return {
        success: false,
        message,
        error: message
      }
    } finally {
      state.value.isInitializing = false
    }
  }

  /**
   * Generate next community round automatically
   */
  const generateNextRound = async (
    tournamentId: string, 
    communityId: string,
    triggeredBy: string = 'algorithm-automation'
  ): Promise<AlgorithmProgressionResult> => {
    state.value.isProgressing = true
    
    try {
      showToast(`Generating next round for community ${communityId}...`, 'info')
      
      const result = await algorithmMatchService.generateNextCommunityRound(
        tournamentId, 
        communityId, 
        triggeredBy
      )
      
      if (result.success) {
        state.value.totalMatchesGenerated += result.data?.matchesGenerated || 0
        state.value.successfulProgressions++
        state.value.lastProgressionTime = new Date()
        
        showToast(result.message, 'success')
        
        // Check if tournament is complete
        if (result.data?.tournamentComplete) {
          showToast('🏆 Tournament completed!', 'success')
          await stopTournamentMonitoring(tournamentId)
        }
      } else {
        state.value.failedProgressions++
        showToast(result.message, 'error')
      }
      
      return result
    } catch (error) {
      state.value.failedProgressions++
      const message = error instanceof Error ? error.message : 'Round generation failed'
      showToast(message, 'error')
      
      return {
        success: false,
        message,
        error: message
      }
    } finally {
      state.value.isProgressing = false
    }
  }

  /**
   * Finalize community tournament
   */
  const finalizeCommunityTournament = async (
    tournamentId: string,
    communityId: string,
    triggeredBy: string = 'algorithm-automation'
  ): Promise<AlgorithmProgressionResult> => {
    state.value.isProgressing = true
    
    try {
      showToast(`Finalizing community ${communityId} tournament...`, 'info')
      
      const result = await algorithmMatchService.finalizeCommunityTournament(
        tournamentId, 
        communityId, 
        triggeredBy
      )
      
      if (result.success) {
        state.value.successfulProgressions++
        state.value.lastProgressionTime = new Date()
        
        showToast(result.message, 'success')
        
        // Remove from active monitoring
        state.value.monitoredCommunities.delete(`${tournamentId}:${communityId}`)
        
        // Check if all communities are complete
        const remainingCommunities = Array.from(state.value.monitoredCommunities)
          .filter(id => id.startsWith(tournamentId))
        
        if (remainingCommunities.length === 0) {
          await stopTournamentMonitoring(tournamentId)
          showToast('🏆 All communities completed! Tournament finished.', 'success')
        }
      } else {
        state.value.failedProgressions++
        showToast(result.message, 'error')
      }
      
      return result
    } catch (error) {
      state.value.failedProgressions++
      const message = error instanceof Error ? error.message : 'Community finalization failed because {{error.message}}'
      showToast(message, 'error')
      
      return {
        success: false,
        message,
        error: message
      }
    } finally {
      state.value.isProgressing = false
    }
  }

  /**
   * Start monitoring tournament for automatic progression
   */
  const startTournamentMonitoring = async (tournamentId: string): Promise<void> => {
    if (monitoringIntervals.has(tournamentId)) {
      console.log(`Already monitoring tournament ${tournamentId}`)
      return
    }

    console.log(`🔍 Starting algorithm monitoring for tournament ${tournamentId}`)
    
    state.value.activeTournaments.add(tournamentId)
    state.value.isMonitoring = true
    
    // Set up periodic monitoring
    const interval = setInterval(async () => {
      await checkTournamentProgression(tournamentId)
    }, monitoringConfig.value.checkInterval)
    
    monitoringIntervals.set(tournamentId, interval)
    
    showToast(`Started monitoring tournament ${tournamentId}`, 'info')
    
    // Initial check
    await checkTournamentProgression(tournamentId)
  }

  /**
   * Stop monitoring tournament
   */
  const stopTournamentMonitoring = async (tournamentId: string): Promise<void> => {
    const interval = monitoringIntervals.get(tournamentId)
    if (interval) {
      clearInterval(interval)
      monitoringIntervals.delete(tournamentId)
    }
    
    state.value.activeTournaments.delete(tournamentId)
    
    // Remove all communities for this tournament
    const communitiesToRemove = Array.from(state.value.monitoredCommunities)
      .filter(id => id.startsWith(tournamentId))
    
    communitiesToRemove.forEach(id => {
      state.value.monitoredCommunities.delete(id)
    })
    
    // Update monitoring state
    state.value.isMonitoring = state.value.activeTournaments.size > 0
    
    console.log(`🛑 Stopped monitoring tournament ${tournamentId}`)
    showToast(`Stopped monitoring tournament ${tournamentId}`, 'info')
  }

  /**
   * Check tournament progression and auto-advance if possible
   */
  const checkTournamentProgression = async (tournamentId: string): Promise<void> => {
    try {
      // Load latest match data
      await getMatchesByTournament(tournamentId)
      
      // Get unique communities in this tournament
      const tournamentMatches = matches.value.filter(match => match.tournamentId === tournamentId)
      const communities = [...new Set(tournamentMatches.map(match => match.communityId).filter(Boolean))]
      
      console.log(`🔍 Checking progression for ${communities.length} communities in ${tournamentId}`)
      
      // If no communities found in matches, try to get them from tournament players
      if (communities.length === 0) {
        const tournamenterCommunities = await algorithmMatchService.getCommunitiesFromTournament(tournamentId)
        communities.push(...tournamenterCommunities)
        console.log(`🔍 Found ${communities.length} communities from tournament players`)
      }

      // Check each community for progression opportunities
      for (const communityId of communities) {
        if (!communityId) continue
        
        const communityKey = `${tournamentId}:${communityId}`
        
        // Add to monitored communities if not already
        if (!state.value.monitoredCommunities.has(communityKey)) {
          state.value.monitoredCommunities.add(communityKey)
        }
        
        // Check if community can progress
        const progressionCheck = await algorithmMatchService.canProgressToNextRound(tournamentId, communityId)
        
        console.log(`🔍 Community ${communityId} progression check:`, progressionCheck)
        
        if (progressionCheck.canProgress && monitoringConfig.value.autoProgress) {
          console.log(`🚀 Auto-progressing community ${communityId}`)
          
          // Check if this is the final round
          const communityMatches = tournamentMatches.filter(match => match.communityId === communityId)
          const hasFinalMatches = communityMatches.some(match => 
            match.roundNumber.includes('Final') || match.isLevelFinal
          )
          
          if (hasFinalMatches) {
            // Finalize community
            await finalizeCommunityTournament(tournamentId, communityId, 'auto-progression')
          } else {
            // Generate next round
            await generateNextRound(tournamentId, communityId, 'auto-progression')
          }
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
    } catch (error) {
      console.error(`❌ Error checking progression for ${tournamentId}:`, error)
    }
  }

  /**
   * Check algorithm service health
   */
  const checkAlgorithmHealth = async (): Promise<{ healthy: boolean; message: string; responseTime: number }> => {
    try {
      const health = await algorithmService.checkServiceHealth()
      state.value.isHealthy = health.healthy
      state.value.lastHealthCheck = new Date()
      
      if (!health.healthy) {
        showToast(`Algorithm service unhealthy: ${health.message}`, 'warning')
      }
      
      return health
    } catch (error) {
      state.value.isHealthy = false
      state.value.lastHealthCheck = new Date()
      
      const message = error instanceof Error ? error.message : 'Health check failed'
      showToast(`Algorithm health check failed: ${message}`, 'error')
      
      return {
        healthy: false,
        message,
        responseTime: 0
      }
    }
  }

  /**
   * Get tournament positions
   */
  const getTournamentPositions = async (tournamentId: string, level?: string) => {
    try {
      return await algorithmMatchService.getTournamentPositions(tournamentId, level)
    } catch (error) {
      console.error('❌ Get tournament positions failed:', error)
      showToast('Failed to get tournament positions', 'error')
      return {
        success: false,
        positions: {},
        level: level || 'community',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Configure monitoring settings
   */
  const updateMonitoringConfig = (newConfig: Partial<AlgorithmMonitoringConfig>): void => {
    monitoringConfig.value = { ...monitoringConfig.value, ...newConfig }
    
    // Restart monitoring with new config if currently monitoring
    if (state.value.isMonitoring) {
      const activeTournaments = Array.from(state.value.activeTournaments)
      
      // Stop current monitoring
      activeTournaments.forEach(tournamentId => {
        const interval = monitoringIntervals.get(tournamentId)
        if (interval) {
          clearInterval(interval)
          monitoringIntervals.delete(tournamentId)
        }
      })
      
      // Restart with new config
      activeTournaments.forEach(tournamentId => {
        const interval = setInterval(async () => {
          await checkTournamentProgression(tournamentId)
        }, monitoringConfig.value.checkInterval)
        
        monitoringIntervals.set(tournamentId, interval)
      })
    }
  }

  /**
   * Get automation statistics
   */
  const getAutomationStats = computed(() => ({
    activeTournaments: state.value.activeTournaments.size,
    monitoredCommunities: state.value.monitoredCommunities.size,
    totalMatchesGenerated: state.value.totalMatchesGenerated,
    successfulProgressions: state.value.successfulProgressions,
    failedProgressions: state.value.failedProgressions,
    successRate: state.value.successfulProgressions + state.value.failedProgressions > 0 
      ? Math.round((state.value.successfulProgressions / (state.value.successfulProgressions + state.value.failedProgressions)) * 100)
      : 100,
    isHealthy: state.value.isHealthy,
    lastHealthCheck: state.value.lastHealthCheck,
    lastProgressionTime: state.value.lastProgressionTime,
    isMonitoring: state.value.isMonitoring,
    autoProgressEnabled: state.value.autoProgressEnabled
  }))

  /**
   * Cleanup function
   */
  const cleanup = (): void => {
    // Clear all intervals
    monitoringIntervals.forEach((interval, tournamentId) => {
      clearInterval(interval)
      console.log(`🧹 Cleaned up monitoring for ${tournamentId}`)
    })
    
    monitoringIntervals.clear()
    
    // Reset state
    state.value.isMonitoring = false
    state.value.activeTournaments.clear()
    state.value.monitoredCommunities.clear()
    
    console.log('🧹 Algorithm automation cleanup completed')
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  // Watch for health changes
  watch(() => state.value.isHealthy, (newHealth, oldHealth) => {
    if (oldHealth === true && newHealth === false) {
      showToast('⚠️ Algorithm service became unhealthy - monitoring may be affected', 'warning')
    } else if (oldHealth === false && newHealth === true) {
      showToast('✅ Algorithm service is healthy again', 'success')
    }
  })

  return {
    // State
    state: computed(() => state.value),
    monitoringConfig: computed(() => monitoringConfig.value),
    automationStats: getAutomationStats,
    
    // Core methods
    initializeTournamentAutomation,
    generateNextRound,
    finalizeCommunityTournament,
    
    // Monitoring methods
    startTournamentMonitoring,
    stopTournamentMonitoring,
    checkTournamentProgression,
    
    // Utility methods
    checkAlgorithmHealth,
    getTournamentPositions,
    updateMonitoringConfig,
    cleanup,
    
    // Status checks
    canProgressToNextRound: algorithmMatchService.canProgressToNextRound.bind(algorithmMatchService)
  }
}