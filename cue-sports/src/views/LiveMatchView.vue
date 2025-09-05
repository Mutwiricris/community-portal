<template>
  <div class="live-match-view">
    <!-- Header with Live Indicator -->
    <div class="live-header">
      <div class="header-content">
        <div class="header-left">
          <button @click="router.push('/matches')" class="btn-back">
            <i class="bi bi-arrow-left"></i>
            <span>Back to Matches</span>
          </button>
          
          <div class="live-indicator">
            <div class="pulse-dot"></div>
            <span class="live-text">LIVE</span>
          </div>
        </div>

        <div class="header-right">
          <div class="match-info">
            <h1 class="match-title" v-if="match">
              {{ match.player1Name }} vs {{ match.player2Name }}
            </h1>
            <div class="match-meta" v-if="match">
              <span>{{ match.roundNumber }}</span>
              <span class="separator">•</span>
              <span>{{ match.matchType }}</span>
              <span class="separator">•</span>
              <span>{{ match.tournamentLevel }}</span>
            </div>
          </div>

          <div class="header-actions">
            <button 
              @click="toggleFullscreen"
              class="btn btn-outline-light"
              :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
            >
              <i :class="isFullscreen ? 'bi bi-fullscreen-exit' : 'bi bi-fullscreen'"></i>
            </button>
            
            <button 
              @click="shareMatch"
              class="btn btn-outline-light"
              title="Share Live Match"
            >
              <i class="bi bi-share"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading live match...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-content">
        <i class="bi bi-exclamation-triangle"></i>
        <h3>Unable to Load Match</h3>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="loadMatch" class="btn btn-primary">
            <i class="bi bi-arrow-clockwise"></i>
            Retry
          </button>
          <button @click="router.push('/matches')" class="btn btn-outline-secondary">
            Back to Matches
          </button>
        </div>
      </div>
    </div>

    <!-- Live Match Interface -->
    <div v-else-if="match" class="live-content">
      <LiveMatchControl :match="match" />
    </div>

    <!-- Spectator Mode Toggle -->
    <div class="spectator-toggle" v-if="match && !loading">
      <button 
        @click="toggleSpectatorMode"
        class="btn btn-sm"
        :class="isSpectatorMode ? 'btn-warning' : 'btn-outline-secondary'"
      >
        <i :class="isSpectatorMode ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
        {{ isSpectatorMode ? 'Exit Spectator' : 'Spectator Mode' }}
      </button>
    </div>

    <!-- Live Match Stats Sidebar (Hidden in spectator mode) -->
    <div v-if="!isSpectatorMode && liveStats" class="stats-sidebar">
      <div class="stats-content">
        <h4>Live Statistics</h4>
        
        <div class="stat-group">
          <h6>Match Progress</h6>
          <div class="stat-item">
            <span class="stat-label">Duration</span>
            <span class="stat-value">{{ formatDuration(liveStats.matchDuration) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Frames Played</span>
            <span class="stat-value">{{ liveStats.frameHistory.length }}</span>
          </div>
        </div>

        <div class="stat-group">
          <h6>Performance</h6>
          <div class="stat-item">
            <span class="stat-label">Highest Break</span>
            <span class="stat-value">{{ liveStats.highestBreak?.breakValue || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Breaks</span>
            <span class="stat-value">{{ liveStats.totalBreaks }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Fouls</span>
            <span class="stat-value">{{ liveStats.totalFouls }}</span>
          </div>
        </div>

        <div class="stat-group">
          <h6>Player Stats</h6>
          <div class="player-stats">
            <div class="player-stat">
              <strong>{{ match.player1Name }}</strong>
              <div class="stat-item">
                <span class="stat-label">Avg Score</span>
                <span class="stat-value">{{ liveStats.player1Stats.averageScorePerFrame.toFixed(1) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Breaks</span>
                <span class="stat-value">{{ liveStats.player1Stats.breakCount }}</span>
              </div>
            </div>
            
            <div class="player-stat">
              <strong>{{ match.player2Name }}</strong>
              <div class="stat-item">
                <span class="stat-label">Avg Score</span>
                <span class="stat-value">{{ liveStats.player2Stats.averageScorePerFrame.toFixed(1) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Breaks</span>
                <span class="stat-value">{{ liveStats.player2Stats.breakCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <ShareMatchModal
      v-model:show="showShareModal"
      :match="match"
      :live-url="liveUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMatches } from '@/composables/useMatches'
import { liveMatchService } from '@/services/liveMatchService'
import LiveMatchControl from '@/components/matches/LiveMatchControl.vue'
import ShareMatchModal from '@/components/matches/ShareMatchModal.vue'
import type { Match, LiveMatchStats } from '@/types/match'

interface Props {
  id: string
}

const props = defineProps<Props>()

// Composables
const router = useRouter()
const route = useRoute()
const { getMatch } = useMatches()

// State
const match = ref<Match | null>(null)
const liveStats = ref<LiveMatchStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isSpectatorMode = ref(false)
const isFullscreen = ref(false)
const showShareModal = ref(false)

// Computed
const liveUrl = computed(() => {
  if (!match.value) return ''
  return `${window.location.origin}/matches/${match.value.id}/live`
})

// Methods
const loadMatch = async () => {
  loading.value = true
  error.value = null

  try {
    const matchData = await getMatch(props.id)
    if (!matchData) {
      error.value = 'Match not found'
      return
    }

    match.value = matchData

    // If match is not in progress, redirect to regular match detail
    if (matchData.status !== 'in_progress') {
      router.push(`/matches/${props.id}`)
      return
    }

    // Load live statistics
    await loadLiveStats()

  } catch (err: any) {
    error.value = err.message || 'Failed to load match'
    console.error('Error loading match:', err)
  } finally {
    loading.value = false
  }
}

const loadLiveStats = async () => {
  if (!match.value) return

  try {
    const stats = await liveMatchService.getLiveMatchStats(match.value.id)
    liveStats.value = stats
  } catch (err) {
    console.error('Error loading live stats:', err)
  }
}

const toggleSpectatorMode = () => {
  isSpectatorMode.value = !isSpectatorMode.value
  
  // Hide/show UI elements for spectator mode
  document.body.classList.toggle('spectator-mode', isSpectatorMode.value)
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const shareMatch = () => {
  showShareModal.value = true
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

// Lifecycle
onMounted(() => {
  loadMatch()
  
  // Set up periodic stats refresh
  const statsInterval = setInterval(loadLiveStats, 10000) // Update every 10 seconds
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })

  // Cleanup interval on unmount
  onUnmounted(() => {
    clearInterval(statsInterval)
    document.body.classList.remove('spectator-mode')
  })
})

// Handle route changes
watch(() => props.id, () => {
  loadMatch()
})
</script>

<style scoped>
.live-match-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.live-header {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(-2px);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(220, 38, 127, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.match-info {
  text-align: center;
  color: white;
}

.match-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.match-meta {
  font-size: 0.9rem;
  opacity: 0.9;
}

.separator {
  margin: 0 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  color: white;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #fbbf24;
}

.error-content h3 {
  margin-bottom: 0.5rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.live-content {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.spectator-toggle {
  position: fixed;
  top: 120px;
  right: 20px;
  z-index: 90;
}

.stats-sidebar {
  position: fixed;
  top: 120px;
  right: 20px;
  width: 280px;
  max-height: calc(100vh - 140px);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow-y: auto;
  z-index: 80;
  transition: transform 0.3s ease;
}

.stats-content {
  padding: 1.5rem;
}

.stats-content h4 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.stat-group {
  margin-bottom: 1.5rem;
}

.stat-group h6 {
  margin: 0 0 0.75rem 0;
  color: #64748b;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
}

.stat-value {
  font-weight: 600;
  color: #1e293b;
}

.player-stats {
  display: grid;
  gap: 1rem;
}

.player-stat {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.player-stat strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #1e293b;
  font-size: 0.9rem;
}

/* Spectator mode styles */
:global(body.spectator-mode) .stats-sidebar {
  transform: translateX(320px);
}

:global(body.spectator-mode) .spectator-toggle {
  right: 300px;
}

/* Responsive design */
@media (max-width: 1200px) {
  .stats-sidebar {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    max-height: none;
    margin-top: 1.5rem;
  }

  .spectator-toggle {
    position: relative;
    top: auto;
    right: auto;
    text-align: center;
    margin: 1rem 0;
  }

  :global(body.spectator-mode) .stats-sidebar,
  :global(body.spectator-mode) .spectator-toggle {
    transform: none;
    right: auto;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-left,
  .header-right {
    width: 100%;
    justify-content: center;
  }

  .match-title {
    font-size: 1.25rem;
  }

  .live-content {
    padding: 1rem;
  }
}
</style>