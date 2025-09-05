<template>
  <div class="modal fade" :class="{ show: show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-exclamation-triangle text-warning"></i>
            Record Foul - {{ playerName }}
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="submit">
            <!-- Foul Type Selection -->
            <div class="mb-4">
              <label class="form-label fw-bold">Foul Type</label>
              <div class="row g-2">
                <div 
                  v-for="foulType in foulTypes" 
                  :key="foulType.value"
                  class="col-6"
                >
                  <input
                    :id="foulType.value"
                    v-model="foulForm.foulType"
                    type="radio"
                    :value="foulType.value"
                    class="btn-check"
                    required
                  />
                  <label 
                    :for="foulType.value" 
                    class="btn btn-outline-warning w-100 text-start"
                  >
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <div class="fw-bold">{{ foulType.label }}</div>
                        <small class="text-muted">{{ foulType.description }}</small>
                      </div>
                      <span class="badge bg-warning text-dark">{{ foulType.points }}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Custom Points (for variable fouls) -->
            <div class="mb-4" v-if="selectedFoulType?.variable">
              <label for="foulPoints" class="form-label fw-bold">Foul Points</label>
              <select
                id="foulPoints"
                v-model.number="foulForm.points"
                class="form-select"
                required
              >
                <option value="">Select points...</option>
                <option value="4">4 points</option>
                <option value="5">5 points</option>
                <option value="6">6 points</option>
                <option value="7">7 points</option>
              </select>
              <div class="form-text">
                Minimum 4 points, or value of ball involved if higher
              </div>
            </div>

            <!-- Description/Notes -->
            <div class="mb-4">
              <label for="foulDescription" class="form-label fw-bold">
                Description
                <small class="text-muted">(Optional)</small>
              </label>
              <textarea
                id="foulDescription"
                v-model="foulForm.description"
                class="form-control"
                rows="3"
                placeholder="Additional details about the foul..."
              ></textarea>
            </div>

            <!-- Foul Summary -->
            <div class="alert alert-warning" v-if="selectedFoulType">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>{{ selectedFoulType.label }}</strong>
                  <div class="small">{{ selectedFoulType.description }}</div>
                </div>
                <div class="text-end">
                  <div class="h5 mb-0">+{{ foulPoints }} points</div>
                  <small class="text-muted">awarded to opponent</small>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
          <button
            type="button"
            class="btn btn-warning"
            @click="submit"
            :disabled="!isValidFoul"
          >
            <i class="bi bi-exclamation-triangle"></i>
            Record Foul
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
import type { FrameFoul } from '@/types/match'

interface Props {
  show: boolean
  playerName: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'record', foulData: Omit<FrameFoul, 'id' | 'timestamp'>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Foul types with their standard point values
const foulTypes = [
  {
    value: 'miss',
    label: 'Miss',
    description: 'Failed to hit the target ball',
    points: 4,
    variable: true
  },
  {
    value: 'in_off',
    label: 'In-Off',
    description: 'Cue ball potted',
    points: 4,
    variable: true
  },
  {
    value: 'wrong_ball',
    label: 'Wrong Ball',
    description: 'Hit wrong ball first',
    points: 4,
    variable: true
  },
  {
    value: 'touching_ball',
    label: 'Touching Ball',
    description: 'Cue ball touching object ball',
    points: 4,
    variable: true
  },
  {
    value: 'push_shot',
    label: 'Push Shot',
    description: 'Cue stick contacted cue ball more than once',
    points: 4,
    variable: false
  },
  {
    value: 'jump_shot',
    label: 'Jump Shot',
    description: 'Cue ball left the table surface',
    points: 4,
    variable: false
  },
  {
    value: 'free_ball',
    label: 'Free Ball Foul',
    description: 'Foul when free ball awarded',
    points: 4,
    variable: true
  },
  {
    value: 'unsporting',
    label: 'Unsporting Behavior',
    description: 'Unsporting conduct',
    points: 4,
    variable: false
  }
]

// Form state
const foulForm = ref({
  foulType: '',
  points: 4,
  description: ''
})

// Computed properties
const selectedFoulType = computed(() => {
  return foulTypes.find(ft => ft.value === foulForm.value.foulType)
})

const foulPoints = computed(() => {
  if (!selectedFoulType.value) return 4
  
  if (selectedFoulType.value.variable) {
    return foulForm.value.points || 4
  }
  
  return selectedFoulType.value.points
})

const isValidFoul = computed(() => {
  const hasType = foulForm.value.foulType !== ''
  const hasValidPoints = !selectedFoulType.value?.variable || foulForm.value.points > 0
  
  return hasType && hasValidPoints
})

// Methods
const close = () => {
  emit('update:show', false)
  resetForm()
}

const submit = () => {
  if (!isValidFoul.value || !selectedFoulType.value) return

  const foulData: Omit<FrameFoul, 'id' | 'timestamp'> = {
    playerId: '', // Will be set by parent component
    playerName: props.playerName,
    foulType: foulForm.value.foulType as FrameFoul['foulType'],
    points: foulPoints.value,
    frameNumber: 0, // Will be set by parent component
    description: foulForm.value.description.trim() || null
  }

  emit('record', foulData)
  resetForm()
}

const resetForm = () => {
  foulForm.value = {
    foulType: '',
    points: 4,
    description: ''
  }
}

// Watch for foul type changes to set default points
watch(() => foulForm.value.foulType, (newType) => {
  const foulType = foulTypes.find(ft => ft.value === newType)
  if (foulType && !foulType.variable) {
    foulForm.value.points = foulType.points
  } else if (foulType && foulType.variable) {
    foulForm.value.points = 4 // Default minimum
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

.btn-check:checked + .btn {
  background-color: var(--bs-warning);
  border-color: var(--bs-warning);
  color: var(--bs-dark);
}

.btn-check:focus + .btn {
  box-shadow: 0 0 0 0.25rem rgba(255, 193, 7, 0.25);
}

.alert-warning {
  border-left: 4px solid var(--bs-warning);
}

.badge {
  font-size: 0.75rem;
}

.form-control:focus,
.form-select:focus {
  border-color: var(--bs-warning);
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}
</style>