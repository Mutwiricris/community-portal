<template>
  <div class="live-match-control">
    <!-- Header Section -->
    <div class="live-header">
      <div class="live-status">
        <div class="live-indicator" :class="{ 'live': isLive, 'paused': isPaused }">
          <div class="pulse"></div>
          <span v-if="isLive && !isPaused">LIVE</span>
          <span v-else-if="isPaused">PAUSED</span>
          <span v-else>OFFLINE</span>
        </div>
        
        <div class="match-info">
          <h3 class="match-title">{{ match.player1Name }} vs {{ match.player2Name }}</h3>
          <p class="tournament-info">{{ match.roundNumber }} • {{ match.matchType }}</p>
        </div>
      </div>

      <div class="control-actions">
        <button 
          v-if="!isLive" 
          @click="startLiveMatch"
          class="btn btn-primary btn-live"
          :disabled="loading"
        >
          <i class="bi bi-play-circle"></i>
          Make Live
        </button>

        <div v-else class="live-controls">
          <button 
            @click="togglePause"
            class="btn btn-secondary"
            :disabled="loading"
          >
            <i :class="isPaused ? 'bi bi-play' : 'bi bi-pause'"></i>
            {{ isPaused ? 'Resume' : 'Pause' }}
          </button>

          <button 
            @click="completeMatch"
            class="btn btn-success"
            :disabled="loading || !canCompleteMatch"
          >
            <i class="bi bi-check-circle"></i>
            Complete
          </button>
        </div>
      </div>
    </div>

    <!-- Live Interface (shown when match is live) -->
    <div v-if="isLive" class="live-interface">
      
      <!-- Timers Section -->
      <div class="timers-section">
        <div class="timer-grid">
          <!-- Match Timer -->
          <div class="timer-card match-timer">
            <div class="timer-header">
              <i class="bi bi-clock"></i>
              <span>Match Time</span>
            </div>
            <div class="timer-display large">{{ matchTimerDisplay }}</div>
          </div>

          <!-- Shot Clock -->
          <div 
            v-if="settings.enableShotClock" 
            class="timer-card shot-clock"
            :class="{ 'warning': isTimerWarning, 'expired': shotClockExpired }"
          >
            <div class="timer-header">
              <i class="bi bi-stopwatch"></i>
              <span>Shot Clock</span>
            </div>
            <div class="timer-display large">{{ shotClockDisplay }}</div>
            <div class="timer-controls">
              <button @click="resetShotClock" class="btn btn-sm btn-outline-secondary">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
              <button @click="startShotClock" class="btn btn-sm btn-primary">
                <i class="bi bi-play"></i>
              </button>
            </div>
          </div>

          <!-- Break Timer -->
          <div v-if="isOnBreak" class="timer-card break-timer">
            <div class="timer-header">
              <i class="bi bi-cup-hot"></i>
              <span>Break Time</span>
            </div>
            <div class="timer-display large">{{ breakTimerDisplay }}</div>
            <div class="timer-controls">
              <button @click="endBreak" class="btn btn-sm btn-warning">
                <i class="bi bi-stop"></i>
                End Break
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Scoring Section -->
      <div class="scoring-section">
        <div class="frame-info">
          <h4>Frame {{ currentFrame }}</h4>
          <span class="frames-progress">{{ framesWon.player1 }} - {{ framesWon.player2 }}</span>
        </div>

        <div class="players-score">
          <!-- Player 1 -->
          <div class="player-panel">
            <div class="player-header">
              <h5>{{ match.player1Name }}</h5>
              <div class="frames-won">{{ framesWon.player1 }}</div>
            </div>
            
            <div class="score-input">
              <label>Frame Score</label>
              <input 
                v-model.number="scoreInput.player1"
                type="number"
                min="0"
                max="147"
                class="form-control score-field"
                @keyup.enter="updateScore"
              />
            </div>

            <div class="quick-actions">
              <button 
                @click="recordBreak('player1')"
                class="btn btn-sm btn-success"
              >
                <i class="bi bi-trophy"></i>
                Break
              </button>
              <button 
                @click="recordFoul('player1')"
                class="btn btn-sm btn-warning"
              >
                <i class="bi bi-exclamation-triangle"></i>
                Foul
              </button>
            </div>
          </div>

          <!-- VS Separator -->
          <div class="vs-separator">
            <div class="vs-text">VS</div>
            <button 
              @click="updateScore"
              class="btn btn-primary btn-update-score"
              :disabled="!hasScoreChanges"
            >
              <i class="bi bi-check2"></i>
              Update Score
            </button>
          </div>

          <!-- Player 2 -->
          <div class="player-panel">
            <div class="player-header">
              <h5>{{ match.player2Name }}</h5>
              <div class="frames-won">{{ framesWon.player2 }}</div>
            </div>
            
            <div class="score-input">
              <label>Frame Score</label>
              <input 
                v-model.number="scoreInput.player2"
                type="number"
                min="0"
                max="147"
                class="form-control score-field"
                @keyup.enter="updateScore"
              />
            </div>

            <div class="quick-actions">
              <button 
                @click="recordBreak('player2')"
                class="btn btn-sm btn-success"
              >
                <i class="bi bi-trophy"></i>
                Break
              </button>
              <button 
                @click="recordFoul('player2')"
                class="btn btn-sm btn-warning"
              >
                <i class="bi bi-exclamation-triangle"></i>
                Foul
              </button>
            </div>
          </div>
        </div>

        <!-- Frame Actions -->
        <div class="frame-actions">
          <button 
            @click="endCurrentFrame"
            class="btn btn-success"
            :disabled="!canEndFrame"
          >
            <i class="bi bi-flag"></i>
            End Frame
          </button>

          <div class="break-controls">
            <button 
              v-if="!isOnBreak"
              @click="startBreak"
              class="btn btn-outline-secondary"
            >
              <i class="bi bi-cup-hot"></i>
              Start Break
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Panel -->
      <div class="stats-panel" v-if="liveStats">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Highest Break</div>
            <div class="stat-value">{{ liveStats.highestBreak?.breakValue || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Breaks</div>
            <div class="stat-value">{{ liveStats.totalBreaks }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Frame Time</div>
            <div class="stat-value">{{ currentFrameDuration }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Fouls</div>
            <div class="stat-value">{{ liveStats.totalFouls }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Break Recording Modal -->
    <BreakRecordModal
      v-model:show="showBreakModal"
      :player-name="selectedPlayerName"
      @record="handleBreakRecord"
    />

    <!-- Foul Recording Modal -->
    <FoulRecordModal
      v-model:show="showFoulModal"
      :player-name="selectedPlayerName"
      @record="handleFoulRecord"
    />

    <!-- Match Completion Modal -->
    <MatchCompletionModal
      v-model:show="showCompletionModal"
      :players="[match.player1Name!, match.player2Name!]"
      :scores="framesWon"
      @complete="handleMatchCompletion"
    />

    <!-- Error Toast -->
    <div 
      v-if="error" 
      class="toast show error-toast"
      role="alert"
    >
      <div class="toast-header">
        <i class="bi bi-exclamation-triangle text-danger"></i>
        <strong class="me-auto">Error</strong>
        <button @click="clearError" class="btn-close"></button>
      </div>
      <div class="toast-body">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMatchTimers } from '@/composables/useMatchTimers'
import { liveMatchService } from '@/services/liveMatchService'
import type { 
  Match, 
  LiveMatchState, 
  LiveMatchStats, 
  FrameUpdate,
  LiveMatchSettings,
  FrameBreak,
  FrameFoul 
} from '@/types/match'
import BreakRecordModal from './BreakRecordModal.vue'
import FoulRecordModal from './FoulRecordModal.vue'
import MatchCompletionModal from './MatchCompletionModal.vue'

interface Props {
  match: Match
}

const props = defineProps<Props>()

// Stores
const authStore = useAuthStore()

// Reactive state
const liveState = ref<LiveMatchState | null>(null)
const liveStats = ref<LiveMatchStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Modal states
const showBreakModal = ref(false)
const showFoulModal = ref(false)
const showCompletionModal = ref(false)
const selectedPlayerName = ref('')

// Score input
const scoreInput = ref({
  player1: 0,
  player2: 0
})

// Settings (would typically come from tournament configuration)
const settings = ref<LiveMatchSettings>({
  shotClockDuration: 60,
  shotClockWarningTime: 15,
  breakTimeDuration: 900,
  autoAdvanceFrames: true,
  allowSpectatorView: true,
  recordDetailedStatistics: true,
  enableShotClock: true,
  maxFramesToWin: 3,
  soundEnabled: true,
  vibrationEnabled: false
})

// Initialize timers
const {
  timerState,
  shotClockDisplay,
  matchTimerDisplay,
  breakTimerDisplay,
  isTimerWarning,
  startShotClock,
  resetShotClock,
  startMatchTimer,
  pauseAllTimers,
  resumeAllTimers,
  startBreakTimer,
  endBreakTimer
} = useMatchTimers({
  settings: settings.value,
  onTimerEvent: (event) => {
    console.log('Timer event:', event)
    // Handle timer events (e.g., shot clock expired)
  },
  onShotClockWarning: () => {
    // Play warning sound or show visual indicator
    if (settings.value.soundEnabled) {
      // playWarningSound()
    }
  },
  onShotClockExpired: () => {
    // Handle shot clock expiry
    if (settings.value.soundEnabled) {
      // playExpiredSound()
    }
  }
})

// Computed properties
const isLive = computed(() => liveState.value?.isLive || false)
const isPaused = computed(() => liveState.value?.isPaused || false)
const isOnBreak = computed(() => liveState.value?.isOnBreak || false)
const currentFrame = computed(() => liveState.value?.currentFrame || 1)
const shotClockExpired = computed(() => timerState.value.shotClock.hasExpired)

const framesWon = computed(() => {
  if (!liveState.value) return { player1: 0, player2: 0 }
  
  const frames = liveState.value.frames.filter(f => f.isComplete)
  return {
    player1: frames.filter(f => f.winner === 'player1').length,
    player2: frames.filter(f => f.winner === 'player2').length
  }
})

const hasScoreChanges = computed(() => {
  if (!liveState.value) return false
  const currentFrameData = liveState.value.frames.find(f => f.frameNumber === currentFrame.value)
  if (!currentFrameData) return false
  
  return scoreInput.value.player1 !== currentFrameData.player1Score ||
         scoreInput.value.player2 !== currentFrameData.player2Score
})

const canEndFrame = computed(() => {
  return hasScoreChanges.value && (scoreInput.value.player1 > 0 || scoreInput.value.player2 > 0)
})

const canCompleteMatch = computed(() => {
  const maxFrames = settings.value.maxFramesToWin
  return Math.max(framesWon.value.player1, framesWon.value.player2) >= maxFrames
})

const currentFrameDuration = computed(() => {
  if (!liveState.value) return '0:00'
  const currentFrameData = liveState.value.frames.find(f => f.frameNumber === currentFrame.value)
  if (!currentFrameData || !currentFrameData.startTime) return '0:00'
  
  const now = new Date()
  const start = currentFrameData.startTime.toDate()
  const duration = Math.floor((now.getTime() - start.getTime()) / 1000)
  
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Subscription management
let unsubscribeLiveMatch: (() => void) | null = null

// Methods
const startLiveMatch = async () => {
  if (!authStore.user) {
    error.value = 'You must be logged in to start live scoring'
    return
  }

  loading.value = true
  error.value = null

  try {
    const initialState = await liveMatchService.makeMatchLive(
      props.match.id,
      authStore.user.uid,
      settings.value
    )
    
    liveState.value = initialState
    
    // Start match timer
    startMatchTimer()
    
    // Subscribe to real-time updates
    subscribeToLiveMatch()
    
  } catch (err: any) {
    error.value = err.message || 'Failed to start live match'
    console.error('Error starting live match:', err)
  } finally {
    loading.value = false
  }
}

const subscribeToLiveMatch = () => {
  unsubscribeLiveMatch = liveMatchService.subscribeToLiveMatch(
    props.match.id,
    (state, err) => {
      if (err) {
        error.value = err.message
        return
      }
      
      if (state) {
        liveState.value = state
        updateScoreInputs()
        loadLiveStats()
      }
    }
  )
}

const updateScoreInputs = () => {
  if (!liveState.value) return
  
  const currentFrameData = liveState.value.frames.find(f => f.frameNumber === currentFrame.value)
  if (currentFrameData) {
    scoreInput.value.player1 = currentFrameData.player1Score
    scoreInput.value.player2 = currentFrameData.player2Score
  }
}

const updateScore = async () => {
  if (!authStore.user || !hasScoreChanges.value) return

  loading.value = true
  error.value = null

  try {
    const frameUpdate: FrameUpdate = {
      frameNumber: currentFrame.value,
      player1Score: scoreInput.value.player1,
      player2Score: scoreInput.value.player2
    }

    await liveMatchService.updateLiveScore(
      props.match.id,
      frameUpdate,
      authStore.user.uid
    )

  } catch (err: any) {
    error.value = err.message || 'Failed to update score'
    console.error('Error updating score:', err)
  } finally {
    loading.value = false
  }
}

const endCurrentFrame = async () => {
  if (!authStore.user || !canEndFrame.value) return

  // First update the score
  await updateScore()

  // Determine winner
  const winner = scoreInput.value.player1 > scoreInput.value.player2 ? 'player1' : 'player2'

  loading.value = true

  try {
    await liveMatchService.endFrame(
      props.match.id,
      currentFrame.value,
      winner,
      authStore.user.uid
    )

    // Reset shot clock for next frame
    resetShotClock()

  } catch (err: any) {
    error.value = err.message || 'Failed to end frame'
    console.error('Error ending frame:', err)
  } finally {
    loading.value = false
  }
}

const togglePause = async () => {
  if (!authStore.user) return

  loading.value = true
  error.value = null

  try {
    if (isPaused.value) {
      await liveMatchService.resumeMatch(props.match.id, authStore.user.uid)
      resumeAllTimers()
    } else {
      const reason = 'Manual pause'
      await liveMatchService.pauseMatch(props.match.id, reason, authStore.user.uid)
      pauseAllTimers(reason)
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to toggle pause'
    console.error('Error toggling pause:', err)
  } finally {
    loading.value = false
  }
}

const startBreak = async () => {
  if (!authStore.user) return

  loading.value = true

  try {
    await liveMatchService.startBreak(
      props.match.id,
      settings.value.breakTimeDuration,
      authStore.user.uid
    )
    
    startBreakTimer()

  } catch (err: any) {
    error.value = err.message || 'Failed to start break'
    console.error('Error starting break:', err)
  } finally {
    loading.value = false
  }
}

const endBreak = async () => {
  if (!authStore.user) return

  loading.value = true

  try {
    await liveMatchService.endBreak(props.match.id, authStore.user.uid)
    endBreakTimer()

  } catch (err: any) {
    error.value = err.message || 'Failed to end break'
    console.error('Error ending break:', err)
  } finally {
    loading.value = false
  }
}

const recordBreak = (playerType: 'player1' | 'player2') => {
  selectedPlayerName.value = playerType === 'player1' ? props.match.player1Name! : props.match.player2Name!
  showBreakModal.value = true
}

const recordFoul = (playerType: 'player1' | 'player2') => {
  selectedPlayerName.value = playerType === 'player1' ? props.match.player1Name! : props.match.player2Name!
  showFoulModal.value = true
}

const handleBreakRecord = async (breakData: Omit<FrameBreak, 'id' | 'timestamp'>) => {
  if (!authStore.user) return

  loading.value = true

  try {
    const frameUpdate: FrameUpdate = {
      frameNumber: currentFrame.value,
      break: breakData
    }

    await liveMatchService.updateLiveScore(
      props.match.id,
      frameUpdate,
      authStore.user.uid
    )

    showBreakModal.value = false

  } catch (err: any) {
    error.value = err.message || 'Failed to record break'
    console.error('Error recording break:', err)
  } finally {
    loading.value = false
  }
}

const handleFoulRecord = async (foulData: Omit<FrameFoul, 'id' | 'timestamp'>) => {
  if (!authStore.user) return

  loading.value = true

  try {
    const frameUpdate: FrameUpdate = {
      frameNumber: currentFrame.value,
      foul: foulData
    }

    await liveMatchService.updateLiveScore(
      props.match.id,
      frameUpdate,
      authStore.user.uid
    )

    showFoulModal.value = false

  } catch (err: any) {
    error.value = err.message || 'Failed to record foul'
    console.error('Error recording foul:', err)
  } finally {
    loading.value = false
  }
}

const completeMatch = () => {
  showCompletionModal.value = true
}

const handleMatchCompletion = async (winnerId: string) => {
  if (!authStore.user) return

  loading.value = true

  try {
    await liveMatchService.completeMatch(props.match.id, winnerId, authStore.user.uid)
    showCompletionModal.value = false

  } catch (err: any) {
    error.value = err.message || 'Failed to complete match'
    console.error('Error completing match:', err)
  } finally {
    loading.value = false
  }
}

const loadLiveStats = async () => {
  try {
    const stats = await liveMatchService.getLiveMatchStats(props.match.id)
    liveStats.value = stats
  } catch (err) {
    console.error('Error loading live stats:', err)
  }
}

const clearError = () => {
  error.value = null
}

// Lifecycle
onMounted(() => {
  // Check if match is already live
  if (props.match.status === 'in_progress') {
    subscribeToLiveMatch()
  }
})

onUnmounted(() => {
  if (unsubscribeLiveMatch) {
    unsubscribeLiveMatch()
  }
})

// Watch for score input changes and validate
watch(scoreInput, (newScore) => {
  // Ensure scores are within valid range
  if (newScore.player1 < 0) newScore.player1 = 0
  if (newScore.player1 > 147) newScore.player1 = 147
  if (newScore.player2 < 0) newScore.player2 = 0
  if (newScore.player2 > 147) newScore.player2 = 147
}, { deep: true })
</script>

<style scoped>
.live-match-control {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.live-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
  font-size: 0.9rem;
  position: relative;
}

.live-indicator.live {
  background: rgba(34, 197, 94, 0.9);
}

.live-indicator.paused {
  background: rgba(251, 191, 36, 0.9);
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.match-info h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.tournament-info {
  margin: 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.control-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-live {
  background: #10b981;
  border-color: #10b981;
  font-weight: 600;
}

.live-interface {
  padding: 1.5rem;
}

.timers-section {
  margin-bottom: 2rem;
}

.timer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.timer-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.2s;
}

.timer-card.warning {
  border-color: #f59e0b;
  background: #fef3c7;
}

.timer-card.expired {
  border-color: #ef4444;
  background: #fee2e2;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.timer-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.timer-display.large {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.scoring-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.frame-info {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 1.5rem;
  text-align: center;
}

.frame-info h4 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.frames-progress {
  font-size: 1.25rem;
  font-weight: 600;
  color: #64748b;
}

.players-score {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: start;
}

.player-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-header h5 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.frames-won {
  background: #3b82f6;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.score-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #64748b;
}

.score-field {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  height: 60px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
}

.score-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.vs-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.vs-text {
  background: #1e293b;
  color: white;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.btn-update-score {
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}

.frame-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.stats-panel {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.error-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1050;
  max-width: 400px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .live-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .players-score {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .vs-separator {
    order: -1;
    flex-direction: row;
  }

  .timer-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>