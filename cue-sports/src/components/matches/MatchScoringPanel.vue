<template>
  <div class="match-scoring-panel">
    <!-- Current Frame Header -->
    <div class="frame-header">
      <div class="frame-info">
        <h3>Frame {{ currentFrame }}</h3>
        <div class="frame-status">
          <span v-if="frameInProgress" class="status-indicator live">
            <i class="bi bi-circle-fill pulse"></i>
            In Progress
          </span>
          <span v-else class="status-indicator pending">
            <i class="bi bi-circle"></i>
            Ready to Start
          </span>
        </div>
      </div>
      
      <div class="frame-actions">
        <button 
          v-if="!frameInProgress" 
          @click="startFrame"
          class="btn btn-primary"
          :disabled="processing"
        >
          <i class="bi bi-play"></i>
          Start Frame
        </button>
        <button 
          v-else 
          @click="endFrame"
          class="btn btn-success"
          :disabled="processing"
        >
          <i class="bi bi-stop"></i>
          End Frame
        </button>
      </div>
    </div>

    <!-- Players Score Section -->
    <div class="players-scoring">
      <!-- Player 1 -->
      <div class="player-section" :class="{ 'active-player': currentPlayer === 'player1' }">
        <div class="player-header">
          <h4>{{ match.player1Name }}</h4>
          <div class="player-score">{{ scores.player1Current }}</div>
        </div>
        
        <div class="scoring-controls" v-if="frameInProgress && currentPlayer === 'player1'">
          <!-- Ball Values -->
          <div class="ball-values">
            <h5>Pot Ball</h5>
            <div class="ball-grid">
              <button 
                v-for="ball in ballValues" 
                :key="ball.value"
                @click="addScore('player1', ball.value)"
                class="ball-btn"
                :class="ball.color"
                :disabled="!ball.available"
              >
                {{ ball.value }}
              </button>
            </div>
          </div>

          <!-- Break Management -->
          <div class="break-section">
            <div class="current-break">
              <span>Current Break: <strong>{{ currentBreaks.player1 }}</strong></span>
              <button @click="endBreak('player1')" class="btn btn-sm btn-outline-secondary">
                End Break
              </button>
            </div>
          </div>

          <!-- Foul Controls -->
          <div class="foul-section">
            <h5>Fouls</h5>
            <div class="foul-buttons">
              <button 
                v-for="foul in foulValues"
                :key="foul.value"
                @click="addFoul('player1', foul.value, foul.description)"
                class="btn btn-sm btn-danger"
              >
                {{ foul.description }} ({{ foul.value }})
              </button>
            </div>
          </div>
        </div>

        <!-- Player Stats -->
        <div class="player-stats">
          <div class="stat-item">
            <span class="stat-label">Frames Won</span>
            <span class="stat-value">{{ scores.player1Frames }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Highest Break</span>
            <span class="stat-value">{{ stats.player1HighestBreak }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Score</span>
            <span class="stat-value">{{ scores.player1Total }}</span>
          </div>
        </div>
      </div>

      <!-- VS Separator -->
      <div class="vs-separator">
        <div class="vs-text">VS</div>
        <div class="switch-player">
          <button 
            @click="switchPlayer"
            class="btn btn-sm btn-outline-primary"
            :disabled="!frameInProgress"
          >
            <i class="bi bi-arrow-left-right"></i>
            Switch
          </button>
        </div>
      </div>

      <!-- Player 2 -->
      <div class="player-section" :class="{ 'active-player': currentPlayer === 'player2' }">
        <div class="player-header">
          <h4>{{ match.player2Name }}</h4>
          <div class="player-score">{{ scores.player2Current }}</div>
        </div>
        
        <div class="scoring-controls" v-if="frameInProgress && currentPlayer === 'player2'">
          <!-- Ball Values -->
          <div class="ball-values">
            <h5>Pot Ball</h5>
            <div class="ball-grid">
              <button 
                v-for="ball in ballValues" 
                :key="ball.value"
                @click="addScore('player2', ball.value)"
                class="ball-btn"
                :class="ball.color"
                :disabled="!ball.available"
              >
                {{ ball.value }}
              </button>
            </div>
          </div>

          <!-- Break Management -->
          <div class="break-section">
            <div class="current-break">
              <span>Current Break: <strong>{{ currentBreaks.player2 }}</strong></span>
              <button @click="endBreak('player2')" class="btn btn-sm btn-outline-secondary">
                End Break
              </button>
            </div>
          </div>

          <!-- Foul Controls -->
          <div class="foul-section">
            <h5>Fouls</h5>
            <div class="foul-buttons">
              <button 
                v-for="foul in foulValues"
                :key="foul.value"
                @click="addFoul('player2', foul.value, foul.description)"
                class="btn btn-sm btn-danger"
              >
                {{ foul.description }} ({{ foul.value }})
              </button>
            </div>
          </div>
        </div>

        <!-- Player Stats -->
        <div class="player-stats">
          <div class="stat-item">
            <span class="stat-label">Frames Won</span>
            <span class="stat-value">{{ scores.player2Frames }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Highest Break</span>
            <span class="stat-value">{{ stats.player2HighestBreak }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Score</span>
            <span class="stat-value">{{ scores.player2Total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame History -->
    <div class="frame-history">
      <h4>Frame History</h4>
      <div class="history-grid">
        <div 
          v-for="(frame, index) in frameHistory" 
          :key="index"
          class="frame-card"
          :class="{ 'current-frame': index + 1 === currentFrame }"
        >
          <div class="frame-number">Frame {{ index + 1 }}</div>
          <div class="frame-scores">
            <span class="score" :class="{ 'winner': frame.winner === 'player1' }">
              {{ frame.player1Score }}
            </span>
            <span class="vs">-</span>
            <span class="score" :class="{ 'winner': frame.winner === 'player2' }">
              {{ frame.player2Score }}
            </span>
          </div>
          <div class="frame-winner" v-if="frame.winner">
            Winner: {{ frame.winner === 'player1' ? match.player1Name : match.player2Name }}
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button 
        @click="undoLastScore"
        class="btn btn-sm btn-outline-warning"
        :disabled="!canUndo"
      >
        <i class="bi bi-arrow-counterclockwise"></i>
        Undo Last
      </button>
      
      <button 
        @click="resetFrame"
        class="btn btn-sm btn-outline-danger"
        :disabled="!frameInProgress"
      >
        <i class="bi bi-arrow-clockwise"></i>
        Reset Frame
      </button>
      
      <button 
        @click="saveMatch"
        class="btn btn-sm btn-success"
        :disabled="processing"
      >
        <i class="bi bi-save" :class="{ 'spin': processing }"></i>
        Save Match
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import type { Match } from '@/types/match'

interface Props {
  match: Match
}

interface FrameData {
  player1Score: number
  player2Score: number
  winner?: 'player1' | 'player2'
  breaks: Array<{ player: string, value: number }>
  fouls: Array<{ player: string, value: number, description: string }>
}

const props = defineProps<Props>()
const { success, error: showError } = useToast()

// State
const currentFrame = ref(1)
const frameInProgress = ref(false)
const currentPlayer = ref<'player1' | 'player2'>('player1')
const processing = ref(false)

const scores = ref({
  player1Current: 0,
  player2Current: 0,
  player1Total: 0,
  player2Total: 0,
  player1Frames: 0,
  player2Frames: 0
})

const currentBreaks = ref({
  player1: 0,
  player2: 0
})

const stats = ref({
  player1HighestBreak: 0,
  player2HighestBreak: 0
})

const frameHistory = ref<FrameData[]>([])
const scoreHistory = ref<Array<{ action: string, player: string, value: number, timestamp: number }>>([])

// Ball configuration for snooker
const ballValues = computed(() => [
  { value: 1, color: 'red', available: true },
  { value: 2, color: 'yellow', available: true },
  { value: 3, color: 'green', available: true },
  { value: 4, color: 'brown', available: true },
  { value: 5, color: 'blue', available: true },
  { value: 6, color: 'pink', available: true },
  { value: 7, color: 'black', available: true }
])

const foulValues = [
  { value: 4, description: 'Standard Foul' },
  { value: 5, description: 'Blue Ball Foul' },
  { value: 6, description: 'Pink Ball Foul' },
  { value: 7, description: 'Black Ball Foul' }
]

const canUndo = computed(() => scoreHistory.value.length > 0)

// Methods
const startFrame = () => {
  frameInProgress.value = true
  scores.value.player1Current = 0
  scores.value.player2Current = 0
  currentBreaks.value.player1 = 0
  currentBreaks.value.player2 = 0
  currentPlayer.value = 'player1'
  success(`Frame ${currentFrame.value} started`)
}

const endFrame = () => {
  if (scores.value.player1Current === scores.value.player2Current) {
    showError('Cannot end frame with tied scores')
    return
  }

  const winner = scores.value.player1Current > scores.value.player2Current ? 'player1' : 'player2'
  
  // Record frame data
  frameHistory.value.push({
    player1Score: scores.value.player1Current,
    player2Score: scores.value.player2Current,
    winner,
    breaks: [],
    fouls: []
  })

  // Update frame wins
  if (winner === 'player1') {
    scores.value.player1Frames++
  } else {
    scores.value.player2Frames++
  }

  // Update total scores
  scores.value.player1Total += scores.value.player1Current
  scores.value.player2Total += scores.value.player2Current

  frameInProgress.value = false
  currentFrame.value++
  
  success(`Frame ${currentFrame.value - 1} completed. Winner: ${winner === 'player1' ? props.match.player1Name : props.match.player2Name}`)
}

const addScore = (player: 'player1' | 'player2', value: number) => {
  if (player === 'player1') {
    scores.value.player1Current += value
    currentBreaks.value.player1 += value
  } else {
    scores.value.player2Current += value
    currentBreaks.value.player2 += value
  }

  // Record action
  scoreHistory.value.push({
    action: 'score',
    player,
    value,
    timestamp: Date.now()
  })

  // Update highest break
  const currentBreak = player === 'player1' ? currentBreaks.value.player1 : currentBreaks.value.player2
  if (player === 'player1' && currentBreak > stats.value.player1HighestBreak) {
    stats.value.player1HighestBreak = currentBreak
  } else if (player === 'player2' && currentBreak > stats.value.player2HighestBreak) {
    stats.value.player2HighestBreak = currentBreak
  }
}

const addFoul = (player: 'player1' | 'player2', value: number, description: string) => {
  // Award points to opponent
  const opponent = player === 'player1' ? 'player2' : 'player1'
  
  if (opponent === 'player1') {
    scores.value.player1Current += value
  } else {
    scores.value.player2Current += value
  }

  // End current player's break
  endBreak(player)

  // Switch to opponent
  currentPlayer.value = opponent

  // Record foul
  scoreHistory.value.push({
    action: 'foul',
    player,
    value,
    timestamp: Date.now()
  })

  success(`Foul: ${description}. ${value} points awarded to ${opponent === 'player1' ? props.match.player1Name : props.match.player2Name}`)
}

const endBreak = (player: 'player1' | 'player2') => {
  if (player === 'player1') {
    currentBreaks.value.player1 = 0
  } else {
    currentBreaks.value.player2 = 0
  }
  
  // Switch to other player
  switchPlayer()
}

const switchPlayer = () => {
  currentPlayer.value = currentPlayer.value === 'player1' ? 'player2' : 'player1'
}

const undoLastScore = () => {
  if (scoreHistory.value.length === 0) return

  const lastAction = scoreHistory.value.pop()
  if (!lastAction) return

  if (lastAction.action === 'score') {
    if (lastAction.player === 'player1') {
      scores.value.player1Current -= lastAction.value
      currentBreaks.value.player1 -= lastAction.value
    } else {
      scores.value.player2Current -= lastAction.value
      currentBreaks.value.player2 -= lastAction.value
    }
  }

  success('Last action undone')
}

const resetFrame = () => {
  scores.value.player1Current = 0
  scores.value.player2Current = 0
  currentBreaks.value.player1 = 0
  currentBreaks.value.player2 = 0
  scoreHistory.value = []
  currentPlayer.value = 'player1'
  success('Frame reset')
}

const saveMatch = async () => {
  processing.value = true
  try {
    // Here you would save the match data to your backend/Firebase
    // await updateMatch(props.match.id, { scores, frameHistory, stats })
    success('Match saved successfully')
  } catch (err) {
    showError('Failed to save match')
  } finally {
    processing.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Initialize from existing match data if available
  if (props.match.player1Score) {
    scores.value.player1Total = props.match.player1Score
  }
  if (props.match.player2Score) {
    scores.value.player2Total = props.match.player2Score
  }
})
</script>

<style scoped>
.match-scoring-panel {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.frame-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.frame-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-indicator.live {
  color: #dc2626;
}

.status-indicator.pending {
  color: #64748b;
}

.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.players-scoring {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.player-section {
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.player-section.active-player {
  border-color: #3b82f6;
  background: #f8fafc;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.player-header h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.player-score {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
}

.scoring-controls {
  margin-bottom: 1.5rem;
}

.ball-values h5 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.ball-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ball-btn {
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  min-height: 48px;
}

.ball-btn.red { background: #dc2626; }
.ball-btn.yellow { background: #fbbf24; color: #1f2937; }
.ball-btn.green { background: #059669; }
.ball-btn.brown { background: #92400e; }
.ball-btn.blue { background: #2563eb; }
.ball-btn.pink { background: #db2777; }
.ball-btn.black { background: #1f2937; }

.ball-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.ball-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.break-section {
  margin: 1rem 0;
}

.current-break {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f1f5f9;
  border-radius: 6px;
}

.foul-section h5 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.foul-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.player-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.vs-separator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.vs-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #64748b;
}

.frame-history {
  margin-bottom: 2rem;
}

.frame-history h4 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.frame-card {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: center;
}

.frame-card.current-frame {
  border-color: #3b82f6;
  background: #f8fafc;
}

.frame-number {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.frame-scores {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.score {
  font-size: 1.25rem;
  font-weight: 600;
}

.score.winner {
  color: #059669;
}

.vs {
  color: #64748b;
}

.frame-winner {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #059669;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #047857;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-outline-primary {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btn-outline-secondary {
  background: transparent;
  color: #64748b;
  border: 1px solid #d1d5db;
}

.btn-outline-warning {
  background: transparent;
  color: #f59e0b;
  border: 1px solid #f59e0b;
}

.btn-outline-danger {
  background: transparent;
  color: #dc2626;
  border: 1px solid #dc2626;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .players-scoring {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .vs-separator {
    order: -1;
    flex-direction: row;
    padding: 1rem 0;
  }
  
  .ball-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .player-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .frame-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .history-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>