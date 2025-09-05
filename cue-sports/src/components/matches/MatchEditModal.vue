<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3>Edit Match</h3>
        <button @click="closeModal" class="btn-close">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body" v-if="match">
        <form @submit.prevent="saveMatch">
          <!-- Basic Match Info -->
          <div class="form-section">
            <h4>Match Information</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="player1">Player 1</label>
                <input
                  id="player1"
                  v-model="form.player1Name"
                  type="text"
                  class="form-control"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="player2">Player 2</label>
                <input
                  id="player2"
                  v-model="form.player2Name"
                  type="text"
                  class="form-control"
                  placeholder="Leave empty for BYE"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-group">
                <label for="tournamentLevel">Tournament Level</label>
                <select id="tournamentLevel" v-model="form.tournamentLevel" class="form-control" required>
                  <option value="community">Community</option>
                  <option value="county">County</option>
                  <option value="regional">Regional</option>
                  <option value="national">National</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="roundNumber">Round</label>
                <input
                  id="roundNumber"
                  v-model="form.roundNumber"
                  type="text"
                  class="form-control"
                  placeholder="e.g., R1, QF, SF, F"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="matchNumber">Match Number</label>
                <input
                  id="matchNumber"
                  v-model.number="form.matchNumber"
                  type="number"
                  class="form-control"
                  min="1"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="matchType">Match Type</label>
                <select id="matchType" v-model="form.matchType" class="form-control" required>
                  <option value="singles">Singles</option>
                  <option value="doubles">Doubles</option>
                  <option value="team">Team</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" v-model="form.status" class="form-control" required>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Scheduling -->
          <div class="form-section">
            <h4>Scheduling</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="scheduledDate">Scheduled Date</label>
                <input
                  id="scheduledDate"
                  v-model="scheduledDate"
                  type="date"
                  class="form-control"
                />
              </div>
              
              <div class="form-group">
                <label for="scheduledTime">Scheduled Time</label>
                <input
                  id="scheduledTime"
                  v-model="scheduledTime"
                  type="time"
                  class="form-control"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="venueId">Venue</label>
                <input
                  id="venueId"
                  v-model="form.venueId"
                  type="text"
                  class="form-control"
                  placeholder="Venue name or ID"
                />
              </div>
              
              <div class="form-group">
                <label for="tableNumber">Table Number</label>
                <input
                  id="tableNumber"
                  v-model="form.tableNumber"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Table 1, Court A"
                />
              </div>
            </div>
          </div>

          <!-- Scores (if match is completed) -->
          <div v-if="form.status === 'completed'" class="form-section">
            <h4>Match Results</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-group">
                <label for="player1Score">{{ form.player1Name }} Score</label>
                <input
                  id="player1Score"
                  v-model.number="form.player1Score"
                  type="number"
                  class="form-control"
                  min="0"
                />
              </div>
              
              <div class="form-group">
                <label for="player2Score">{{ form.player2Name || 'Player 2' }} Score</label>
                <input
                  id="player2Score"
                  v-model.number="form.player2Score"
                  type="number"
                  class="form-control"
                  min="0"
                />
              </div>
              
              <div class="form-group">
                <label for="winnerId">Winner</label>
                <select id="winnerId" v-model="form.winnerId" class="form-control">
                  <option value="">No winner</option>
                  <option :value="form.player1Id">{{ form.player1Name }}</option>
                  <option v-if="form.player2Name" :value="form.player2Id">{{ form.player2Name }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="form-section">
            <h4>Additional Information</h4>
            
            <div class="form-group">
              <label for="adminNotes">Admin Notes</label>
              <textarea
                id="adminNotes"
                v-model="form.adminNotes"
                class="form-control"
                rows="3"
                placeholder="Internal notes about this match..."
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="tournamentId">Tournament ID</label>
                <input
                  id="tournamentId"
                  v-model="form.tournamentId"
                  type="text"
                  class="form-control"
                  placeholder="Associated tournament ID"
                />
              </div>
              
              <div class="form-group">
                <label for="player1Points">Player 1 Points</label>
                <input
                  id="player1Points"
                  v-model.number="form.player1Points"
                  type="number"
                  class="form-control"
                  min="0"
                  placeholder="Tournament points"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="player1CommunityId">Player 1 Community</label>
                <input
                  id="player1CommunityId"
                  v-model="form.player1CommunityId"
                  type="text"
                  class="form-control"
                  placeholder="Community ID"
                />
              </div>
              
              <div class="form-group">
                <label for="player2Points">Player 2 Points</label>
                <input
                  id="player2Points"
                  v-model.number="form.player2Points"
                  type="number"
                  class="form-control"
                  min="0"
                  placeholder="Tournament points"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="player2CommunityId">Player 2 Community</label>
              <input
                id="player2CommunityId"
                v-model="form.player2CommunityId"
                type="text"
                class="form-control"
                placeholder="Community ID"
              />
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <Button type="button" @click="closeModal" variant="outline" :disabled="saving">
          Cancel
        </Button>
        <Button type="button" @click="saveMatch" :disabled="saving">
          <Save class="h-4 w-4 mr-2" />
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Save } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import { useMatches } from '@/composables/useMatches'
import { useToast } from '@/composables/useToast'
import type { Match } from '@/types/match'

interface Props {
  show: boolean
  match: Match | null
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateMatch } = useMatches()
const { success, error: showError } = useToast()

// State
const saving = ref(false)
const form = ref<Partial<Match>>({})
const scheduledDate = ref('')
const scheduledTime = ref('')

// Computed
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

// Methods
const closeModal = () => {
  showModal.value = false
}

const initializeForm = () => {
  if (props.match) {
    form.value = { ...props.match }
    
    // Parse scheduled date/time
    if (props.match.scheduledDateTime) {
      const date = new Date(props.match.scheduledDateTime)
      scheduledDate.value = date.toISOString().split('T')[0]
      scheduledTime.value = date.toTimeString().split(' ')[0].substring(0, 5)
    }
  }
}

const saveMatch = async () => {
  if (!props.match) return

  saving.value = true
  
  try {
    // Combine date and time for scheduledDateTime
    let scheduledDateTime = null
    if (scheduledDate.value && scheduledTime.value) {
      scheduledDateTime = new Date(`${scheduledDate.value}T${scheduledTime.value}`).toISOString()
    } else if (scheduledDate.value) {
      scheduledDateTime = new Date(`${scheduledDate.value}T00:00:00`).toISOString()
    }

    const updateData = {
      ...form.value,
      scheduledDateTime,
      updatedAt: new Date().toISOString()
    }

    await updateMatch(props.match.id, updateData, 'current_user')
    
    success('Match updated successfully')
    emit('updated')
  } catch (err) {
    showError('Failed to update match')
  } finally {
    saving.value = false
  }
}

// Watch for match changes
watch(() => props.match, initializeForm, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
  font-weight: 600;
  font-size: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-weight: 600;
  font-size: 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control:disabled {
  background: #f9fafb;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

@media (max-width: 768px) {
  .modal-content {
    margin: 0.5rem;
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>