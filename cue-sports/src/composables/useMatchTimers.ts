import { ref, computed, onUnmounted, watch, readonly } from 'vue'
import type { TimerState, TimerEvent, LiveMatchSettings } from '@/types/match'
import { Timestamp } from 'firebase/firestore'

export interface UseMatchTimersOptions {
  settings: LiveMatchSettings
  onTimerEvent?: (event: TimerEvent) => void
  onShotClockWarning?: () => void
  onShotClockExpired?: () => void
}

export function useMatchTimers(options: UseMatchTimersOptions) {
  const { settings, onTimerEvent, onShotClockWarning, onShotClockExpired } = options

  // Timer state
  const timerState = ref<TimerState>({
    shotClock: {
      timeRemaining: settings.shotClockDuration,
      isRunning: false,
      isWarning: false,
      hasExpired: false,
      lastStartTime: null
    },
    matchTimer: {
      totalDuration: 0,
      isRunning: false,
      startTime: null,
      pausedDuration: 0
    },
    breakTimer: {
      timeRemaining: null,
      isActive: false,
      startTime: null
    }
  })

  // Timer intervals
  let shotClockInterval: NodeJS.Timeout | null = null
  let matchTimerInterval: NodeJS.Timeout | null = null
  let breakTimerInterval: NodeJS.Timeout | null = null

  // Computed values
  const shotClockDisplay = computed(() => {
    const time = timerState.value.shotClock.timeRemaining
    const minutes = Math.floor(time / 60)
    const seconds = time % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })

  const matchTimerDisplay = computed(() => {
    const time = timerState.value.matchTimer.totalDuration
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = time % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })

  const breakTimerDisplay = computed(() => {
    if (timerState.value.breakTimer.timeRemaining === null) return '0:00'
    const time = timerState.value.breakTimer.timeRemaining
    const minutes = Math.floor(time / 60)
    const seconds = time % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })

  const isTimerWarning = computed(() => {
    return timerState.value.shotClock.isWarning || 
           (timerState.value.breakTimer.timeRemaining !== null && 
            timerState.value.breakTimer.timeRemaining <= 30)
  })

  // Shot Clock Functions
  const startShotClock = (duration?: number) => {
    try {
      const clockDuration = duration || settings.shotClockDuration
      
      timerState.value.shotClock = {
        timeRemaining: clockDuration,
        isRunning: true,
        isWarning: false,
        hasExpired: false,
        lastStartTime: Timestamp.now()
      }

      shotClockInterval = setInterval(() => {
        if (timerState.value.shotClock.timeRemaining > 0) {
          timerState.value.shotClock.timeRemaining--
          
          // Check for warning threshold
          if (timerState.value.shotClock.timeRemaining <= settings.shotClockWarningTime && 
              !timerState.value.shotClock.isWarning) {
            timerState.value.shotClock.isWarning = true
            onShotClockWarning?.()
            emitTimerEvent('shot_clock_warning')
          }
        } else {
          // Shot clock expired
          timerState.value.shotClock.hasExpired = true
          timerState.value.shotClock.isRunning = false
          stopShotClock()
          onShotClockExpired?.()
          emitTimerEvent('shot_clock_expired')
        }
      }, 1000)

      emitTimerEvent('shot_clock_start', { duration: clockDuration })
    } catch (error) {
      console.error('Error starting shot clock:', error)
      throw new Error('Failed to start shot clock')
    }
  }

  const stopShotClock = () => {
    try {
      if (shotClockInterval) {
        clearInterval(shotClockInterval)
        shotClockInterval = null
      }
      
      timerState.value.shotClock.isRunning = false
      emitTimerEvent('shot_clock_stop')
    } catch (error) {
      console.error('Error stopping shot clock:', error)
    }
  }

  const resetShotClock = () => {
    try {
      stopShotClock()
      timerState.value.shotClock = {
        timeRemaining: settings.shotClockDuration,
        isRunning: false,
        isWarning: false,
        hasExpired: false,
        lastStartTime: null
      }
    } catch (error) {
      console.error('Error resetting shot clock:', error)
      throw new Error('Failed to reset shot clock')
    }
  }

  // Match Timer Functions
  const startMatchTimer = () => {
    try {
      timerState.value.matchTimer.isRunning = true
      timerState.value.matchTimer.startTime = Timestamp.now()

      matchTimerInterval = setInterval(() => {
        timerState.value.matchTimer.totalDuration++
      }, 1000)

      emitTimerEvent('match_timer_start')
    } catch (error) {
      console.error('Error starting match timer:', error)
      throw new Error('Failed to start match timer')
    }
  }

  const pauseMatchTimer = (reason?: string) => {
    try {
      if (matchTimerInterval) {
        clearInterval(matchTimerInterval)
        matchTimerInterval = null
      }
      
      timerState.value.matchTimer.isRunning = false
      emitTimerEvent('match_timer_pause', { reason })
    } catch (error) {
      console.error('Error pausing match timer:', error)
    }
  }

  const resumeMatchTimer = () => {
    try {
      timerState.value.matchTimer.isRunning = true

      matchTimerInterval = setInterval(() => {
        timerState.value.matchTimer.totalDuration++
      }, 1000)

      emitTimerEvent('match_timer_resume')
    } catch (error) {
      console.error('Error resuming match timer:', error)
      throw new Error('Failed to resume match timer')
    }
  }

  // Break Timer Functions
  const startBreakTimer = (duration?: number) => {
    try {
      const breakDuration = duration || settings.breakTimeDuration
      
      timerState.value.breakTimer = {
        timeRemaining: breakDuration,
        isActive: true,
        startTime: Timestamp.now()
      }

      breakTimerInterval = setInterval(() => {
        if (timerState.value.breakTimer.timeRemaining! > 0) {
          timerState.value.breakTimer.timeRemaining!--
        } else {
          endBreakTimer()
        }
      }, 1000)

      emitTimerEvent('break_timer_start', { duration: breakDuration })
    } catch (error) {
      console.error('Error starting break timer:', error)
      throw new Error('Failed to start break timer')
    }
  }

  const endBreakTimer = () => {
    try {
      if (breakTimerInterval) {
        clearInterval(breakTimerInterval)
        breakTimerInterval = null
      }
      
      timerState.value.breakTimer = {
        timeRemaining: null,
        isActive: false,
        startTime: null
      }

      emitTimerEvent('break_timer_end')
    } catch (error) {
      console.error('Error ending break timer:', error)
    }
  }

  // Utility Functions
  const emitTimerEvent = (type: TimerEvent['type'], data?: TimerEvent['data']) => {
    const event: TimerEvent = {
      type,
      timestamp: Timestamp.now(),
      data
    }
    onTimerEvent?.(event)
  }

  const pauseAllTimers = (reason?: string) => {
    try {
      stopShotClock()
      pauseMatchTimer(reason)
      // Note: Break timer continues during pause
    } catch (error) {
      console.error('Error pausing all timers:', error)
      throw new Error('Failed to pause timers')
    }
  }

  const resumeAllTimers = () => {
    try {
      if (settings.enableShotClock && !timerState.value.shotClock.hasExpired) {
        startShotClock(timerState.value.shotClock.timeRemaining)
      }
      resumeMatchTimer()
    } catch (error) {
      console.error('Error resuming all timers:', error)
      throw new Error('Failed to resume timers')
    }
  }

  const resetAllTimers = () => {
    try {
      resetShotClock()
      
      // Reset match timer
      if (matchTimerInterval) {
        clearInterval(matchTimerInterval)
        matchTimerInterval = null
      }
      timerState.value.matchTimer = {
        totalDuration: 0,
        isRunning: false,
        startTime: null,
        pausedDuration: 0
      }

      endBreakTimer()
    } catch (error) {
      console.error('Error resetting all timers:', error)
      throw new Error('Failed to reset timers')
    }
  }

  const syncTimers = (serverState: TimerState) => {
    try {
      // Stop current timers
      if (shotClockInterval) clearInterval(shotClockInterval)
      if (matchTimerInterval) clearInterval(matchTimerInterval)
      if (breakTimerInterval) clearInterval(breakTimerInterval)

      // Update state
      timerState.value = { ...serverState }

      // Restart running timers
      if (timerState.value.shotClock.isRunning) {
        startShotClock(timerState.value.shotClock.timeRemaining)
      }
      if (timerState.value.matchTimer.isRunning) {
        resumeMatchTimer()
      }
      if (timerState.value.breakTimer.isActive) {
        startBreakTimer(timerState.value.breakTimer.timeRemaining!)
      }
    } catch (error) {
      console.error('Error syncing timers:', error)
      throw new Error('Failed to sync timers with server')
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (shotClockInterval) clearInterval(shotClockInterval)
    if (matchTimerInterval) clearInterval(matchTimerInterval)
    if (breakTimerInterval) clearInterval(breakTimerInterval)
  })

  // Watch for settings changes
  watch(() => settings.shotClockDuration, (newDuration) => {
    if (!timerState.value.shotClock.isRunning) {
      timerState.value.shotClock.timeRemaining = newDuration
    }
  })

  return {
    // State
    timerState: readonly(timerState),
    
    // Computed
    shotClockDisplay,
    matchTimerDisplay,
    breakTimerDisplay,
    isTimerWarning,
    
    // Shot Clock
    startShotClock,
    stopShotClock,
    resetShotClock,
    
    // Match Timer
    startMatchTimer,
    pauseMatchTimer,
    resumeMatchTimer,
    
    // Break Timer
    startBreakTimer,
    endBreakTimer,
    
    // Utility
    pauseAllTimers,
    resumeAllTimers,
    resetAllTimers,
    syncTimers
  }
}

// Helper function for timer formatting
export function formatTimer(seconds: number, includeHours = false): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (includeHours && hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Helper function to calculate timer duration
export function calculateTimerDuration(startTime: Timestamp, endTime?: Timestamp): number {
  const end = endTime || Timestamp.now()
  return Math.floor((end.seconds - startTime.seconds))
}