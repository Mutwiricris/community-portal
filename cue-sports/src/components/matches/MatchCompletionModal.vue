<template>
  <div class="modal fade" :class="{ show: show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title">
            <i class="bi bi-trophy"></i>
            Complete Match
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <!-- Match Summary -->
          <div class="match-summary mb-4">
            <div class="text-center mb-4">
              <h4 class="mb-1">Match Complete</h4>
              <p class="text-muted">Select the match winner to finalize results</p>
            </div>

            <!-- Score Display -->
            <div class="score-display mb-4">
              <div class="row g-3">
                <div class="col-6">
                  <div class="player-card" :class="{ winner: selectedWinner === 'player1' }">
                    <div class="player-info">
                      <h5 class="player-name mb-1">{{ players[0] }}</h5>
                      <div class="frames-won">{{ scores.player1 }}</div>
                      <small class="text-muted">frames won</small>
                    </div>
                    <div class="select-winner">
                      <input
                        id="winner-player1"
                        v-model="selectedWinner"
                        type="radio"
                        value="player1"
                        class="btn-check"
                      />
                      <label for="winner-player1" class="btn btn-outline-success w-100">
                        <i class="bi bi-trophy"></i>
                        Select Winner
                      </label>
                    </div>
                  </div>
                </div>
                
                <div class="col-6">
                  <div class="player-card" :class="{ winner: selectedWinner === 'player2' }">
                    <div class="player-info">
                      <h5 class="player-name mb-1">{{ players[1] }}</h5>
                      <div class="frames-won">{{ scores.player2 }}</div>
                      <small class="text-muted">frames won</small>
                    </div>
                    <div class="select-winner">
                      <input
                        id="winner-player2"
                        v-model="selectedWinner"
                        type="radio"
                        value="player2"
                        class="btn-check"
                      />
                      <label for="winner-player2" class="btn btn-outline-success w-100">
                        <i class="bi bi-trophy"></i>
                        Select Winner
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Winner Display -->
            <div v-if="selectedWinner" class="winner-announcement">
              <div class="alert alert-success text-center">
                <i class="bi bi-trophy fs-1 text-success mb-2"></i>
                <h4 class="mb-1">🎉 Congratulations!</h4>
                <p class="mb-0">
                  <strong>{{ winnerName }}</strong> wins {{ winnerScore }} - {{ loserScore }}
                </p>
              </div>
            </div>

            <!-- Match Statistics Summary -->
            <div v-if="matchStats" class="stats-summary">
              <h6 class="fw-bold mb-3">Match Statistics</h6>
              <div class="row g-3">
                <div class="col-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-value">{{ matchStats.totalFrames }}</div>
                    <div class="stat-label">Total Frames</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-value">{{ formatDuration(matchStats.matchDuration) }}</div>
                    <div class="stat-label">Match Duration</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-value">{{ matchStats.highestBreak || 0 }}</div>
                    <div class="stat-label">Highest Break</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="stat-item">
                    <div class="stat-value">{{ matchStats.totalBreaks }}</div>
                    <div class="stat-label">Total Breaks</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes Section -->
            <div class="mt-4">
              <label for="matchNotes" class="form-label fw-bold">
                Match Notes
                <small class="text-muted">(Optional)</small>
              </label>
              <textarea
                id="matchNotes"
                v-model="matchNotes"
                class="form-control"
                rows="3"
                placeholder="Add any additional notes about the match..."
              ></textarea>
            </div>

            <!-- Confirmation -->
            <div class="mt-4" v-if="selectedWinner">
              <div class="form-check">
                <input
                  id="confirmResult"
                  v-model="confirmResult"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label" for="confirmResult">
                  I confirm that <strong>{{ winnerName }}</strong> won this match with a score of {{ winnerScore }} - {{ loserScore }}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
          <button
            type="button"
            class="btn btn-success btn-lg"
            @click="complete"
            :disabled="!canComplete"
          >
            <i class="bi bi-check-circle"></i>
            Complete Match
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Modal Backdrop -->
  <div v-if="show" class="modal-backdrop fade show"></div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  show: boolean
  players: [string, string]
  scores: { player1: number; player2: number }
  matchStats?: {
    totalFrames: number
    matchDuration: number
    highestBreak: number | null
    totalBreaks: number
  }
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'complete', data: { winnerId: string; notes?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form state
const selectedWinner = ref<'player1' | 'player2' | ''>('')
const matchNotes = ref('')
const confirmResult = ref(false)

// Computed properties
const winnerName = computed(() => {
  if (!selectedWinner.value) return ''
  return selectedWinner.value === 'player1' ? props.players[0] : props.players[1]
})

const winnerScore = computed(() => {
  if (!selectedWinner.value) return 0
  return selectedWinner.value === 'player1' ? props.scores.player1 : props.scores.player2
})

const loserScore = computed(() => {
  if (!selectedWinner.value) return 0
  return selectedWinner.value === 'player1' ? props.scores.player2 : props.scores.player1
})

const canComplete = computed(() => {
  return selectedWinner.value !== '' && confirmResult.value
})

// Methods
const close = () => {
  emit('update:show', false)
  resetForm()
}

const complete = () => {
  if (!canComplete.value) return

  const completionData = {
    winnerId: selectedWinner.value,
    notes: matchNotes.value.trim() || undefined
  }

  emit('complete', completionData)
  resetForm()
}

const resetForm = () => {
  selectedWinner.value = ''
  matchNotes.value = ''
  confirmResult.value = false
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Auto-select winner based on highest score
const autoSelectWinner = () => {
  if (props.scores.player1 > props.scores.player2) {
    selectedWinner.value = 'player1'
  } else if (props.scores.player2 > props.scores.player1) {
    selectedWinner.value = 'player2'
  }
}

// Watch for show prop to reset form and auto-select
watch(() => props.show, (newShow) => {
  if (newShow) {
    resetForm()
    autoSelectWinner()
  }
})
</script>

<style scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.player-card {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  height: 100%;
}

.player-card.winner {
  border-color: #28a745;
  background: linear-gradient(135deg, #d4edda 0%, #f8f9fa 100%);
  transform: scale(1.02);
}

.player-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.frames-won {
  font-size: 3rem;
  font-weight: 700;
  color: #28a745;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.select-winner {
  margin-top: 1rem;
}

.btn-check:checked + .btn {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-check:focus + .btn {
  box-shadow: 0 0 0 0.25rem rgba(40, 167, 69, 0.25);
}

.winner-announcement {
  animation: slideInUp 0.5s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stats-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #dee2e6;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #28a745;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.form-control:focus {
  border-color: #28a745;
  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}

.alert-success {
  border: none;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.score-display {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #dee2e6;
}

@media (max-width: 768px) {
  .player-card {
    margin-bottom: 1rem;
  }
  
  .frames-won {
    font-size: 2.5rem;
  }
  
  .stat-item {
    margin-bottom: 0.5rem;
  }
}
</style>