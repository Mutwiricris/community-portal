<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h3>Live Match Settings</h3>
        <button @click="closeModal" class="btn-close">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body" v-if="liveMatch">
        <div class="match-info">
          <h4>{{ liveMatch.match.player1Name }} vs {{ liveMatch.match.player2Name }}</h4>
          <p class="match-meta">
            {{ liveMatch.match.roundNumber }} • {{ liveMatch.match.matchType }} • {{ liveMatch.match.tournamentLevel }}
          </p>
        </div>

        <form @submit.prevent="saveSettings">
          <!-- Timer Settings -->
          <div class="settings-section">
            <h5>Timer Settings</h5>
            
            <div class="form-group">
              <label for="shotClock">Shot Clock (seconds)</label>
              <input
                id="shotClock"
                v-model.number="settings.shotClockDuration"
                type="number"
                min="10"
                max="300"
                class="form-control"
                :disabled="saving"
              />
              <small class="form-text">Time limit for each shot (10-300 seconds)</small>
            </div>

            <div class="form-group">
              <label for="breakTimeout">Break Timeout (seconds)</label>
              <input
                id="breakTimeout"
                v-model.number="settings.breakTimeoutDuration"
                type="number"
                min="60"
                max="1800"
                class="form-control"
                :disabled="saving"
              />
              <small class="form-text">Maximum break duration (1-30 minutes)</small>
            </div>

            <div class="form-group">
              <div class="form-check">
                <input
                  id="enableWarnings"
                  v-model="settings.enableWarnings"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="enableWarnings" class="form-check-label">
                  Enable Timer Warnings
                </label>
              </div>
              <small class="form-text">Show warnings when timers are about to expire</small>
            </div>
          </div>

          <!-- Match Settings -->
          <div class="settings-section">
            <h5>Match Settings</h5>
            
            <div class="form-group">
              <div class="form-check">
                <input
                  id="allowSpectators"
                  v-model="settings.allowSpectators"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="allowSpectators" class="form-check-label">
                  Allow Spectators
                </label>
              </div>
              <small class="form-text">Allow others to watch this live match</small>
            </div>

            <div class="form-group">
              <div class="form-check">
                <input
                  id="enableCommentary"
                  v-model="settings.enableCommentary"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="enableCommentary" class="form-check-label">
                  Enable Commentary
                </label>
              </div>
              <small class="form-text">Allow commentary during the match</small>
            </div>

            <div class="form-group">
              <div class="form-check">
                <input
                  id="autoSaveScores"
                  v-model="settings.autoSaveScores"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="autoSaveScores" class="form-check-label">
                  Auto-save Scores
                </label>
              </div>
              <small class="form-text">Automatically save scores every 30 seconds</small>
            </div>
          </div>

          <!-- Notification Settings -->
          <div class="settings-section">
            <h5>Notifications</h5>
            
            <div class="form-group">
              <div class="form-check">
                <input
                  id="notifyFrameEnd"
                  v-model="settings.notifyFrameEnd"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="notifyFrameEnd" class="form-check-label">
                  Notify on Frame End
                </label>
              </div>
            </div>

            <div class="form-group">
              <div class="form-check">
                <input
                  id="notifyBreakRecord"
                  v-model="settings.notifyBreakRecord"
                  type="checkbox"
                  class="form-check-input"
                  :disabled="saving"
                />
                <label for="notifyBreakRecord" class="form-check-label">
                  Notify on Break Records
                </label>
              </div>
            </div>
          </div>

          <!-- Current Status -->
          <div class="settings-section" v-if="liveMatch.state">
            <h5>Current Status</h5>
            <div class="status-grid">
              <div class="status-item">
                <span class="status-label">Match Duration</span>
                <span class="status-value">{{ formatDuration(liveMatch.state.matchTimer) }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Current Frame</span>
                <span class="status-value">{{ liveMatch.state.currentFrame }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Spectators</span>
                <span class="status-value">{{ liveMatch.state.spectatorCount || 0 }}</span>
              </div>
              <div class="status-item">
                <span class="status-label">Status</span>
                <span class="status-value" :class="getStatusClass(liveMatch.state)">
                  {{ getStatusText(liveMatch.state) }}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" @click="closeModal" class="btn btn-secondary" :disabled="saving">
          Cancel
        </button>
        <button type="button" @click="saveSettings" class="btn btn-primary" :disabled="saving">
          <i v-if="saving" class="bi bi-hourglass-split spin"></i>
          <i v-else class="bi bi-check"></i>
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { liveMatchService } from '@/services/liveMatchService'
import type { LiveMatchSettings, LiveMatchState } from '@/types/match'

interface LiveMatchData {
  match: any
  state: LiveMatchState | null
  stats: any
}

interface Props {
  show: boolean
  liveMatch: LiveMatchData | null
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const saving = ref(false)
const settings = ref<LiveMatchSettings>({
  shotClockDuration: 60,
  breakTimeoutDuration: 300,
  enableWarnings: true,
  allowSpectators: true,
  enableCommentary: false,
  autoSaveScores: true,
  notifyFrameEnd: true,
  notifyBreakRecord: true
})

// Computed
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

// Methods
const closeModal = () => {
  showModal.value = false
}

const saveSettings = async () => {
  if (!props.liveMatch) return

  saving.value = true
  
  try {
    await liveMatchService.updateLiveMatchSettings(
      props.liveMatch.match.id,
      settings.value
    )
    
    emit('updated')
    closeModal()
  } catch (error) {
    console.error('Error saving settings:', error)
  } finally {
    saving.value = false
  }
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

const getStatusClass = (state: LiveMatchState): string => {
  if (state.isPaused) return 'status-paused'
  if (state.isOnBreak) return 'status-break'
  if (state.isLive) return 'status-live'
  return 'status-inactive'
}

const getStatusText = (state: LiveMatchState): string => {
  if (state.isPaused) return 'Paused'
  if (state.isOnBreak) return 'On Break'
  if (state.isLive) return 'Live'
  return 'Inactive'
}

// Watch for live match changes to update settings
watch(() => props.liveMatch, (newLiveMatch) => {
  if (newLiveMatch?.state?.settings) {
    settings.value = { ...settings.value, ...newLiveMatch.state.settings }
  }
}, { immediate: true })
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
  max-width: 600px;
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
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
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

.match-info {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.match-info h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.match-meta {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section h5 {
  margin: 0 0 1rem 0;
  color: #374151;
  font-weight: 600;
  font-size: 1.1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
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

.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.form-check-label {
  cursor: pointer;
  margin-bottom: 0;
  color: #374151;
  font-weight: 500;
}

.form-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.status-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.status-value {
  font-weight: 600;
  color: #1e293b;
}

.status-live {
  color: #dc2626;
}

.status-paused {
  color: #f59e0b;
}

.status-break {
  color: #059669;
}

.status-inactive {
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn {
  padding: 0.75rem 1.5rem;
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

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
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
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column;
  }
}
</style>