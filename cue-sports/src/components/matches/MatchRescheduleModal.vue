<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3>Reschedule Match</h3>
        <button @click="closeModal" class="btn-close">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body" v-if="match">
        <!-- Current Schedule Info -->
        <div class="current-schedule">
          <h4>Current Schedule</h4>
          <div class="schedule-info">
            <div class="match-details">
              <h5>{{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}</h5>
              <p class="text-muted-foreground">
                {{ match.tournamentLevel }} • Round {{ match.roundNumber }} • Match #{{ match.matchNumber }}
              </p>
            </div>
            
            <div class="current-time">
              <div class="flex items-center space-x-2 text-sm">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                <span>{{ formatCurrentSchedule() }}</span>
              </div>
              <div v-if="match.venueId" class="flex items-center space-x-2 text-sm">
                <MapPin class="h-4 w-4 text-muted-foreground" />
                <span>{{ match.venueId }}</span>
                <span v-if="match.tableNumber">- {{ match.tableNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Reschedule Form -->
        <form @submit.prevent="rescheduleMatch">
          <div class="form-section">
            <h4>New Schedule</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="newDate">New Date</label>
                <input
                  id="newDate"
                  v-model="form.newDate"
                  type="date"
                  class="form-control"
                  :min="minDate"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="newTime">New Time</label>
                <input
                  id="newTime"
                  v-model="form.newTime"
                  type="time"
                  class="form-control"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="newVenue">Venue</label>
                <input
                  id="newVenue"
                  v-model="form.venue"
                  type="text"
                  class="form-control"
                  placeholder="Venue name or location"
                />
              </div>
              
              <div class="form-group">
                <label for="newTable">Table/Court</label>
                <input
                  id="newTable"
                  v-model="form.table"
                  type="text"
                  class="form-control"
                  placeholder="Table number or court"
                />
              </div>
            </div>
          </div>

          <!-- Reason for Reschedule -->
          <div class="form-section">
            <h4>Reschedule Reason</h4>
            
            <div class="form-group">
              <label for="rescheduleReason">Reason</label>
              <select id="rescheduleReason" v-model="form.reason" class="form-control" required>
                <option value="">Select a reason</option>
                <option value="player_unavailable">Player Unavailable</option>
                <option value="venue_conflict">Venue Conflict</option>
                <option value="equipment_issue">Equipment Issue</option>
                <option value="weather">Weather Conditions</option>
                <option value="administrative">Administrative</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="rescheduleNotes">Additional Notes</label>
              <textarea
                id="rescheduleNotes"
                v-model="form.notes"
                class="form-control"
                rows="3"
                placeholder="Optional: Provide additional details about the reschedule..."
              ></textarea>
            </div>
          </div>

          <!-- Notification Options -->
          <div class="form-section">
            <h4>Notifications</h4>
            
            <div class="space-y-3">
              <div class="form-check">
                <input
                  id="notifyPlayers"
                  v-model="form.notifyPlayers"
                  type="checkbox"
                  class="form-check-input"
                />
                <label for="notifyPlayers" class="form-check-label">
                  Notify players about the schedule change
                </label>
              </div>
              
              <div class="form-check">
                <input
                  id="notifyOfficials"
                  v-model="form.notifyOfficials"
                  type="checkbox"
                  class="form-check-input"
                />
                <label for="notifyOfficials" class="form-check-label">
                  Notify tournament officials
                </label>
              </div>
              
              <div class="form-check">
                <input
                  id="updatePublicSchedule"
                  v-model="form.updatePublicSchedule"
                  type="checkbox"
                  class="form-check-input"
                />
                <label for="updatePublicSchedule" class="form-check-label">
                  Update public tournament schedule
                </label>
              </div>
            </div>
          </div>

          <!-- Reschedule History -->
          <div v-if="rescheduleHistory.length > 0" class="form-section">
            <h4>Previous Reschedules</h4>
            <div class="reschedule-history">
              <div 
                v-for="(reschedule, index) in rescheduleHistory" 
                :key="index"
                class="history-item"
              >
                <div class="history-date">
                  <span class="font-medium">{{ formatDate(reschedule.date) }}</span>
                  <span class="text-muted-foreground">{{ reschedule.time }}</span>
                </div>
                <div class="history-reason">
                  <Badge variant="outline">{{ reschedule.reason }}</Badge>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <Button type="button" @click="closeModal" variant="outline" :disabled="saving">
          Cancel
        </Button>
        <Button type="button" @click="rescheduleMatch" :disabled="saving || !isFormValid">
          <Clock class="h-4 w-4 mr-2" />
          {{ saving ? 'Rescheduling...' : 'Reschedule Match' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, Clock, Calendar, MapPin } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
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
const form = ref({
  newDate: '',
  newTime: '',
  venue: '',
  table: '',
  reason: '',
  notes: '',
  notifyPlayers: true,
  notifyOfficials: true,
  updatePublicSchedule: true
})

// Mock reschedule history - in real app, this would come from the match data
const rescheduleHistory = ref([
  // Example entries - would be loaded from match.rescheduleHistory
])

// Computed
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const minDate = computed(() => {
  // Minimum date is today
  return new Date().toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return form.value.newDate && 
         form.value.newTime && 
         form.value.reason
})

// Methods
const closeModal = () => {
  showModal.value = false
}

const formatCurrentSchedule = (): string => {
  if (!props.match?.scheduledDateTime) {
    return 'Not scheduled'
  }
  
  return new Date(props.match.scheduledDateTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const initializeForm = () => {
  if (props.match) {
    // Pre-fill with current values
    if (props.match.scheduledDateTime) {
      const date = new Date(props.match.scheduledDateTime)
      form.value.newDate = date.toISOString().split('T')[0]
      form.value.newTime = date.toTimeString().split(' ')[0].substring(0, 5)
    }
    
    form.value.venue = props.match.venueId || ''
    form.value.table = props.match.tableNumber || ''
    
    // Reset other fields
    form.value.reason = ''
    form.value.notes = ''
    form.value.notifyPlayers = true
    form.value.notifyOfficials = true
    form.value.updatePublicSchedule = true
  }
}

const rescheduleMatch = async () => {
  if (!props.match || !isFormValid.value) return

  saving.value = true
  
  try {
    // Create new scheduled date/time
    const newScheduledDateTime = new Date(`${form.value.newDate}T${form.value.newTime}`).toISOString()
    
    // Create reschedule record
    const rescheduleRecord = {
      previousDateTime: props.match.scheduledDateTime,
      newDateTime: newScheduledDateTime,
      reason: form.value.reason,
      notes: form.value.notes,
      rescheduledBy: 'current_user', // In real app, get from auth
      rescheduledAt: new Date().toISOString()
    }
    
    // Update match with new schedule
    const updateData = {
      scheduledDateTime: newScheduledDateTime,
      venueId: form.value.venue || props.match.venueId,
      tableNumber: form.value.table || props.match.tableNumber,
      rescheduleHistory: [
        ...(props.match.rescheduleHistory || []),
        rescheduleRecord
      ],
      updatedAt: new Date().toISOString()
    }

    await updateMatch(props.match.id, updateData, 'current_user')
    
    // Handle notifications (in real app, this would trigger actual notifications)
    if (form.value.notifyPlayers) {
      console.log('Notifying players about reschedule')
    }
    if (form.value.notifyOfficials) {
      console.log('Notifying officials about reschedule')
    }
    if (form.value.updatePublicSchedule) {
      console.log('Updating public schedule')
    }
    
    success('Match rescheduled successfully')
    emit('updated')
  } catch (err) {
    showError('Failed to reschedule match')
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
  max-width: 700px;
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

.current-schedule {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.current-schedule h4 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-weight: 600;
}

.schedule-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.match-details h5 {
  margin: 0 0 0.25rem 0;
  color: #1e293b;
  font-weight: 600;
}

.current-time {
  text-align: right;
  space-y: 0.25rem;
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

.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-check-input {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.form-check-label {
  cursor: pointer;
  margin-bottom: 0;
  color: #374151;
  font-weight: 500;
  font-size: 0.875rem;
}

.reschedule-history {
  space-y: 0.75rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.history-date {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
  
  .schedule-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .current-time {
    text-align: left;
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>