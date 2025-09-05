<template>
  <div class="modal fade" :class="{ show: show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-trophy text-success"></i>
            Record Break - {{ playerName }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="submit">
            <!-- Break Value Input -->
            <div class="mb-4">
              <label for="breakValue" class="form-label fw-bold">Break Value</label>
              <input
                id="breakValue"
                v-model.number="breakForm.breakValue"
                type="number"
                class="form-control form-control-lg text-center"
                style="font-size: 2rem; font-weight: 700;"
                min="1"
                max="147"
                required
                autofocus
              />
              <div class="form-text">Enter the total value of the break (1-147)</div>
            </div>

            <!-- Quick Value Buttons -->
            <div class="mb-4">
              <label class="form-label fw-bold">Quick Values</label>
              <div class="d-flex flex-wrap gap-2">
                <button
                  v-for="value in quickValues"
                  :key="value"
                  type="button"
                  class="btn btn-outline-primary"
                  :class="{ active: breakForm.breakValue === value }"
                  @click="breakForm.breakValue = value"
                >
                  {{ value }}
                </button>
              </div>
            </div>

            <!-- Maximum Break Check -->
            <div class="mb-4" v-if="breakForm.breakValue >= 100">
              <div class="form-check form-switch">
                <input
                  id="isMaximumBreak"
                  v-model="breakForm.isMaximumBreak"
                  class="form-check-input"
                  type="checkbox"
                  :checked="breakForm.breakValue === 147"
                  :disabled="breakForm.breakValue === 147"
                />
                <label class="form-check-label" for="isMaximumBreak">
                  <strong>Maximum Break (147)</strong>
                  <div class="text-muted small">Automatically checked for 147 breaks</div>
                </label>
              </div>
            </div>

            <!-- Pot Sequence (Optional) -->
            <div class="mb-4" v-if="showAdvanced">
              <label class="form-label fw-bold">
                Pot Sequence
                <small class="text-muted">(Optional)</small>
              </label>
              <div class="pot-sequence-input">
                <div class="ball-buttons">
                  <button
                    v-for="ball in availableBalls"
                    :key="ball.value"
                    type="button"
                    class="btn ball-btn"
                    :style="{ backgroundColor: ball.color, color: ball.textColor }"
                    @click="addToPotSequence(ball.value)"
                    :disabled="!canPotBall(ball.value)"
                  >
                    {{ ball.value }}
                  </button>
                </div>
                
                <div class="sequence-display mt-3" v-if="breakForm.potSequence.length > 0">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="fw-bold">Sequence:</span>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click="clearSequence"
                    >
                      <i class="bi bi-trash"></i> Clear
                    </button>
                  </div>
                  
                  <div class="sequence-balls">
                    <span
                      v-for="(ballValue, index) in breakForm.potSequence"
                      :key="index"
                      class="badge sequence-ball"
                      :style="getBallStyle(ballValue)"
                      @click="removeFromSequence(index)"
                    >
                      {{ ballValue }}
                      <i class="bi bi-x ms-1"></i>
                    </span>
                  </div>
                  
                  <div class="mt-2">
                    <small class="text-muted">
                      Calculated total: {{ calculatedTotal }}
                      <span v-if="calculatedTotal !== breakForm.breakValue" class="text-warning">
                        (doesn't match break value)
                      </span>
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- Advanced Options Toggle -->
            <div class="mb-3">
              <button
                type="button"
                class="btn btn-link p-0 text-decoration-none"
                @click="showAdvanced = !showAdvanced"
              >
                <i :class="showAdvanced ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options
              </button>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
          <button
            type="button"
            class="btn btn-success"
            @click="submit"
            :disabled="!isValidBreak"
          >
            <i class="bi bi-trophy"></i>
            Record Break
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
import type { FrameBreak } from '@/types/match'

interface Props {
  show: boolean
  playerName: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'record', breakData: Omit<FrameBreak, 'id' | 'timestamp'>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form state
const breakForm = ref({
  breakValue: 0,
  isMaximumBreak: false,
  potSequence: [] as number[]
})

const showAdvanced = ref(false)

// Quick value buttons for common breaks
const quickValues = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 147]

// Snooker ball values and colors
const availableBalls = [
  { value: 1, color: '#ff0000', textColor: '#ffffff' }, // Red
  { value: 2, color: '#ffff00', textColor: '#000000' }, // Yellow
  { value: 3, color: '#00ff00', textColor: '#000000' }, // Green
  { value: 4, color: '#8b4513', textColor: '#ffffff' }, // Brown
  { value: 5, color: '#0000ff', textColor: '#ffffff' }, // Blue
  { value: 6, color: '#ffc0cb', textColor: '#000000' }, // Pink
  { value: 7, color: '#000000', textColor: '#ffffff' }  // Black
]

// Computed properties
const isValidBreak = computed(() => {
  return breakForm.value.breakValue > 0 && breakForm.value.breakValue <= 147
})

const calculatedTotal = computed(() => {
  return breakForm.value.potSequence.reduce((sum, ball) => sum + ball, 0)
})

// Methods
const close = () => {
  emit('update:show', false)
  resetForm()
}

const submit = () => {
  if (!isValidBreak.value) return

  const breakData: Omit<FrameBreak, 'id' | 'timestamp'> = {
    playerId: '', // Will be set by parent component
    playerName: props.playerName,
    breakValue: breakForm.value.breakValue,
    frameNumber: 0, // Will be set by parent component
    isMaximumBreak: breakForm.value.isMaximumBreak || breakForm.value.breakValue === 147,
    potSequence: [...breakForm.value.potSequence]
  }

  emit('record', breakData)
  resetForm()
}

const resetForm = () => {
  breakForm.value = {
    breakValue: 0,
    isMaximumBreak: false,
    potSequence: []
  }
  showAdvanced.value = false
}

const addToPotSequence = (ballValue: number) => {
  breakForm.value.potSequence.push(ballValue)
}

const removeFromSequence = (index: number) => {
  breakForm.value.potSequence.splice(index, 1)
}

const clearSequence = () => {
  breakForm.value.potSequence = []
}

const canPotBall = (ballValue: number) => {
  // Basic rule: can always pot red (1) or the lowest available colored ball
  if (ballValue === 1) return true
  
  // For colored balls, check if it's the next logical ball to pot
  const redCount = breakForm.value.potSequence.filter(b => b === 1).length
  const lastBall = breakForm.value.potSequence[breakForm.value.potSequence.length - 1]
  
  // If last ball was red, can pot any colored ball
  if (lastBall === 1) return ballValue > 1
  
  // If no reds left or in end game, must pot in order
  if (redCount === 0 || breakForm.value.potSequence.length > 30) {
    const expectedNext = Math.min(...availableBalls.filter(b => 
      b.value > 1 && !breakForm.value.potSequence.includes(b.value)
    ).map(b => b.value))
    return ballValue === expectedNext
  }
  
  return true
}

const getBallStyle = (ballValue: number) => {
  const ball = availableBalls.find(b => b.value === ballValue)
  return ball ? {
    backgroundColor: ball.color,
    color: ball.textColor
  } : {}
}

// Watch for maximum break
watch(() => breakForm.value.breakValue, (newValue) => {
  if (newValue === 147) {
    breakForm.value.isMaximumBreak = true
  } else if (newValue < 100) {
    breakForm.value.isMaximumBreak = false
  }
})

// Watch for show prop to reset form
watch(() => props.show, (newShow) => {
  if (newShow) {
    resetForm()
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

.ball-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ball-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #dee2e6;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-btn:hover:not(:disabled) {
  transform: scale(1.1);
  border-color: #adb5bd;
}

.ball-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sequence-balls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.sequence-ball {
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.sequence-ball:hover {
  opacity: 0.8;
}

.pot-sequence-input {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.form-control-lg {
  border: 2px solid #dee2e6;
}

.form-control-lg:focus {
  border-color: #28a745;
  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}

.btn.active {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
}
</style>