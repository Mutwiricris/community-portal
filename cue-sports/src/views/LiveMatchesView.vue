<template>
  <div class="live-matches-view">
    <!-- Hero Header -->
    <div class="hero-header">
      <div class="hero-background"></div>
      <div class="hero-content">
        <div class="header-text">
          <div class="live-badge">
            <div class="pulse-dot"></div>
            <span>LIVE BROADCASTING</span>
          </div>
          <h1 class="hero-title">Live Matches</h1>
          <p class="hero-subtitle">Real-time tournament action and live match management</p>
        </div>

        <div class="header-actions">
          <Button @click="refreshMatches" variant="outline" :disabled="loading" class="refresh-btn">
            <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
            Refresh
          </Button>
          
          <Button @click="$router.push('/matches')" class="all-matches-btn">
            <Calendar class="h-4 w-4 mr-2" />
            All Matches
          </Button>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-section">
      <div class="stats-grid">
        <Card class="stat-card live-stat">
          <CardContent class="stat-content">
            <div class="stat-icon">
              <Radio class="h-8 w-8" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ liveMatches.length }}</div>
              <div class="stat-label">Live Matches</div>
            </div>
            <div class="stat-trend up">
              <TrendingUp class="h-4 w-4" />
              Active
            </div>
          </CardContent>
        </Card>

        <Card class="stat-card viewers-stat">
          <CardContent class="stat-content">
            <div class="stat-icon">
              <Eye class="h-8 w-8" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ totalViewers }}</div>
              <div class="stat-label">Total Viewers</div>
            </div>
            <div class="stat-trend">
              <Users class="h-4 w-4" />
              Watching
            </div>
          </CardContent>
        </Card>

        <Card class="stat-card duration-stat">
          <CardContent class="stat-content">
            <div class="stat-icon">
              <Clock class="h-8 w-8" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ averageMatchDuration }}</div>
              <div class="stat-label">Avg Duration</div>
            </div>
            <div class="stat-trend">
              <Timer class="h-4 w-4" />
              Playing
            </div>
          </CardContent>
        </Card>

        <Card class="stat-card tournaments-stat">
          <CardContent class="stat-content">
            <div class="stat-icon">
              <Trophy class="h-8 w-8" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ activeTournaments }}</div>
              <div class="stat-label">Tournaments</div>
            </div>
            <div class="stat-trend">
              <Award class="h-4 w-4" />
              Active
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Content Area -->
    <div class="content-area">
      <!-- Loading State -->
      <div v-if="loading && liveMatches.length === 0" class="loading-state">
        <Card class="loading-card">
          <CardContent class="loading-content">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
            </div>
            <h3>Loading Live Matches</h3>
            <p>Connecting to live tournament feeds...</p>
          </CardContent>
        </Card>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && liveMatches.length === 0" class="empty-state">
        <Card class="empty-card">
          <CardContent class="empty-content">
            <div class="empty-icon">
              <RadioTower class="h-16 w-16" />
            </div>
            <h3>No Live Matches</h3>
            <p>There are currently no matches being broadcast live. Start watching when tournaments begin!</p>
            <div class="empty-actions">
              <Button @click="$router.push('/matches')" class="primary-action">
                <Calendar class="h-4 w-4 mr-2" />
                View All Matches
              </Button>
              <Button @click="$router.push('/matches/create')" variant="outline" class="secondary-action">
                <Plus class="h-4 w-4 mr-2" />
                Create Match
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Live Matches Grid -->
      <div v-else class="matches-grid">
        <Card
          v-for="liveMatch in liveMatches"
          :key="liveMatch.match.id"
          class="live-match-card"
        >
          <CardContent class="match-content">
            <!-- Match Header -->
            <div class="match-header">
              <div class="live-status">
                <div class="live-indicator">
                  <div class="pulse-dot"></div>
                  <span class="live-text">LIVE</span>
                </div>
                <div class="viewer-count">
                  <Eye class="h-3 w-3" />
                  <span>{{ liveMatch.state?.spectatorCount || 0 }}</span>
                </div>
              </div>
              
              <Badge :variant="getTournamentVariant(liveMatch.match.tournamentLevel)" class="tournament-badge">
                {{ liveMatch.match.tournamentLevel }}
              </Badge>
            </div>

            <!-- Players Section -->
            <div class="players-section">
              <div class="player player-1">
                <div class="player-avatar">
                  <User class="h-8 w-8" />
                </div>
                <div class="player-info">
                  <h4 class="player-name">{{ liveMatch.match.player1Name }}</h4>
                  <div class="player-details">
                    <Badge variant="outline" class="community-badge">
                      {{ liveMatch.match.player1CommunityId || 'Independent' }}
                    </Badge>
                  </div>
                </div>
                <div class="player-score">
                  <div class="score-value">{{ liveMatch.stats?.player1Stats.framesWon || 0 }}</div>
                  <div class="score-label">frames</div>
                </div>
              </div>

              <div class="vs-separator">
                <div class="vs-circle">
                  <span>VS</span>
                </div>
              </div>

              <div class="player player-2">
                <div class="player-avatar">
                  <User class="h-8 w-8" />
                </div>
                <div class="player-info">
                  <h4 class="player-name">{{ liveMatch.match.player2Name }}</h4>
                  <div class="player-details">
                    <Badge variant="outline" class="community-badge">
                      {{ liveMatch.match.player2CommunityId || 'Independent' }}
                    </Badge>
                  </div>
                </div>
                <div class="player-score">
                  <div class="score-value">{{ liveMatch.stats?.player2Stats.framesWon || 0 }}</div>
                  <div class="score-label">frames</div>
                </div>
              </div>
            </div>

            <!-- Match Info Grid -->
            <div class="match-info-grid">
              <div class="info-card">
                <Trophy class="h-4 w-4 text-yellow-600" />
                <div class="info-content">
                  <div class="info-value">{{ liveMatch.match.roundNumber }}</div>
                  <div class="info-label">Round</div>
                </div>
              </div>
              
              <div class="info-card">
                <Clock class="h-4 w-4 text-blue-600" />
                <div class="info-content">
                  <div class="info-value">{{ formatDuration(liveMatch.state?.matchTimer || 0) }}</div>
                  <div class="info-label">Duration</div>
                </div>
              </div>
              
              <div class="info-card">
                <Users class="h-4 w-4 text-green-600" />
                <div class="info-content">
                  <div class="info-value">{{ liveMatch.state?.spectatorCount || 0 }}</div>
                  <div class="info-label">Viewers</div>
                </div>
              </div>
              
              <div class="info-card">
                <Target class="h-4 w-4 text-purple-600" />
                <div class="info-content">
                  <div class="info-value">{{ liveMatch.stats?.highestBreak?.breakValue || 0 }}</div>
                  <div class="info-label">High Break</div>
                </div>
              </div>
            </div>

            <!-- Live Status Bar -->
            <div class="status-bar" v-if="liveMatch.stats">
              <div class="status-item">
                <div class="status-indicator frame">
                  <Hash class="h-3 w-3" />
                  <span>Frame {{ liveMatch.state?.currentFrame || 1 }}</span>
                </div>
              </div>
              
              <div class="status-item" v-if="liveMatch.state?.isOnBreak">
                <div class="status-indicator break">
                  <Coffee class="h-3 w-3" />
                  <span>On Break ({{ formatBreakTime(liveMatch.state.breakTimer) }})</span>
                </div>
              </div>
              
              <div class="status-item" v-else-if="liveMatch.state?.isPaused">
                <div class="status-indicator paused">
                  <Pause class="h-3 w-3" />
                  <span>Paused</span>
                </div>
              </div>
              
              <div class="status-item" v-else>
                <div class="status-indicator playing">
                  <Play class="h-3 w-3" />
                  <span>In Play</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <Button 
                @click="viewMatch(liveMatch.match.id)"
                class="watch-btn"
                size="sm"
              >
                <Eye class="h-4 w-4 mr-2" />
                Watch Live
              </Button>
              
              <Button 
                @click="openMatchSettings(liveMatch)"
                variant="outline"
                size="sm"
                class="settings-btn"
              >
                <Settings class="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <Button 
                @click="$router.push(`/matches/${liveMatch.match.id}`)"
                variant="ghost"
                size="sm"
                class="details-btn"
              >
                <MoreHorizontal class="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Quick Actions Toolbar -->
    <div class="quick-actions-toolbar" v-if="liveMatches.length > 0">
      <div class="toolbar-content">
        <div class="toolbar-info">
          <span>{{ liveMatches.length }} live matches</span>
          <small>Updates every 5 seconds</small>
        </div>
        
        <div class="toolbar-actions">
          <button 
            @click="pauseAllMatches"
            class="btn btn-sm btn-warning"
            :disabled="pausingAll"
          >
            <i class="bi bi-pause"></i>
            Pause All
          </button>
          
          <button 
            @click="exportLiveData"
            class="btn btn-sm btn-outline-primary"
          >
            <i class="bi bi-download"></i>
            Export Data
          </button>
        </div>
      </div>
    </div>

    <!-- Match Settings Modal -->
    <LiveMatchSettingsModal
      v-model:show="showSettingsModal"
      :live-match="selectedLiveMatch"
      @updated="refreshMatches"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { collection, query, where, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { 
  RefreshCw, 
  Calendar, 
  Radio, 
  Eye, 
  Users, 
  Clock, 
  Timer, 
  Trophy, 
  Award, 
  TrendingUp, 
  RadioTower, 
  Plus, 
  User, 
  Target, 
  Hash, 
  Coffee, 
  Pause, 
  Play, 
  Settings, 
  MoreHorizontal
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { getFirebaseDb } from '@/firebase/config'
import { useMatches } from '@/composables/useMatches'
import { liveMatchService } from '@/services/liveMatchService'
import LiveMatchSettingsModal from '@/components/matches/LiveMatchSettingsModal.vue'
import type { Match, LiveMatchState, LiveMatchStats } from '@/types/match'

interface LiveMatchData {
  match: Match
  state: LiveMatchState | null
  stats: LiveMatchStats | null
}

// Composables
const router = useRouter()
const { searchMatches } = useMatches()

// State
const liveMatches = ref<LiveMatchData[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const pausingAll = ref(false)
const showSettingsModal = ref(false)
const selectedLiveMatch = ref<LiveMatchData | null>(null)

// Subscriptions
let matchesUnsubscribe: Unsubscribe | null = null
const liveStateUnsubscribes = new Map<string, Unsubscribe>()

// Computed
const totalViewers = computed(() => {
  return liveMatches.value.reduce((total, lm) => total + (lm.state?.spectatorCount || 0), 0)
})

const averageMatchDuration = computed(() => {
  if (liveMatches.value.length === 0) return '0m'
  const totalDuration = liveMatches.value.reduce((total, lm) => total + (lm.state?.matchTimer || 0), 0)
  const avgDuration = totalDuration / liveMatches.value.length
  return formatDuration(avgDuration)
})

const activeTournaments = computed(() => {
  const tournaments = new Set(liveMatches.value.map(lm => lm.match.tournamentId))
  return tournaments.size
})

// Methods
const loadLiveMatches = async () => {
  loading.value = true
  error.value = null

  try {
    // Subscribe to live matches (status = 'in_progress')
    const db = getFirebaseDb()
    const matchesRef = collection(db, 'matches')
    const q = query(matchesRef, where('status', '==', 'in_progress'))

    matchesUnsubscribe = onSnapshot(q, async (snapshot) => {
      const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match))
      
      // Clear existing subscriptions
      liveStateUnsubscribes.forEach(unsub => unsub())
      liveStateUnsubscribes.clear()

      // Set up new live match data
      const newLiveMatches: LiveMatchData[] = []

      for (const match of matches) {
        const liveMatchData: LiveMatchData = {
          match,
          state: null,
          stats: null
        }

        // Subscribe to live state
        const stateUnsub = liveMatchService.subscribeToLiveMatch(
          match.id,
          (state, err) => {
            if (err) {
              console.error('Live state subscription error:', err)
              return
            }
            
            const index = liveMatches.value.findIndex(lm => lm.match.id === match.id)
            if (index !== -1) {
              liveMatches.value[index].state = state
            }
          }
        )

        liveStateUnsubscribes.set(match.id, stateUnsub)

        // Load stats
        try {
          const stats = await liveMatchService.getLiveMatchStats(match.id)
          liveMatchData.stats = stats
        } catch (err) {
          console.error('Error loading stats for match:', match.id, err)
        }

        newLiveMatches.push(liveMatchData)
      }

      liveMatches.value = newLiveMatches
      loading.value = false
    }, (err) => {
      error.value = err.message
      loading.value = false
    })

  } catch (err: any) {
    error.value = err.message || 'Failed to load live matches'
    loading.value = false
  }
}

const refreshMatches = () => {
  // Reload will trigger the subscription to refresh
  loadLiveMatches()
}

const viewMatch = (matchId: string) => {
  router.push(`/matches/${matchId}/live`)
}

const openMatchSettings = (liveMatch: LiveMatchData) => {
  selectedLiveMatch.value = liveMatch
  showSettingsModal.value = true
}

const pauseAllMatches = async () => {
  pausingAll.value = true
  
  try {
    const pausePromises = liveMatches.value.map(async (liveMatch) => {
      if (liveMatch.state && !liveMatch.state.isPaused) {
        return liveMatchService.pauseMatch(
          liveMatch.match.id,
          'Admin bulk pause',
          'admin' // This should be the actual user ID
        )
      }
    })

    await Promise.all(pausePromises)
  } catch (err) {
    console.error('Error pausing matches:', err)
  } finally {
    pausingAll.value = false
  }
}

const exportLiveData = () => {
  const data = liveMatches.value.map(lm => ({
    matchId: lm.match.id,
    players: `${lm.match.player1Name} vs ${lm.match.player2Name}`,
    tournament: lm.match.tournamentLevel,
    round: lm.match.roundNumber,
    duration: lm.state?.matchTimer || 0,
    currentFrame: lm.state?.currentFrame || 1,
    viewers: lm.state?.spectatorCount || 0,
    highestBreak: lm.stats?.highestBreak?.breakValue || 0,
    totalBreaks: lm.stats?.totalBreaks || 0,
    isPaused: lm.state?.isPaused || false,
    isOnBreak: lm.state?.isOnBreak || false
  }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `live-matches-${new Date().toISOString()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const formatBreakTime = (seconds: number | null): string => {
  if (!seconds) return '0m'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}

const getTournamentVariant = (level: string) => {
  switch (level.toLowerCase()) {
    case 'community': return 'secondary'
    case 'county': return 'outline'
    case 'regional': return 'default'
    case 'national': return 'destructive'
    default: return 'outline'
  }
}

// Lifecycle
onMounted(() => {
  loadLiveMatches()
})

onUnmounted(() => {
  // Clean up subscriptions
  if (matchesUnsubscribe) {
    matchesUnsubscribe()
  }
  
  liveStateUnsubscribes.forEach(unsub => unsub())
  liveStateUnsubscribes.clear()
})
</script>

<style scoped>
.live-matches-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.hero-header {
  position: relative;
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%);
  backdrop-filter: blur(10px);
}

.hero-content {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(220, 38, 127, 0.9);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.refresh-btn,
.all-matches-btn {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.1);
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.all-matches-btn {
  background: rgba(255, 255, 255, 0.2);
}

.all-matches-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.stats-section {
  padding: 0 2rem;
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.stat-content {
  padding: 2rem;
}

.live-stat .stat-icon { color: #dc2626; }
.viewers-stat .stat-icon { color: #3b82f6; }
.duration-stat .stat-icon { color: #059669; }
.tournaments-stat .stat-icon { color: #d97706; }

.stat-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stat-icon {
  padding: 1rem;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
}

.live-stat .stat-icon { background: rgba(220, 38, 38, 0.1); }
.viewers-stat .stat-icon { background: rgba(59, 130, 246, 0.1); }
.duration-stat .stat-icon { background: rgba(5, 150, 105, 0.1); }
.tournaments-stat .stat-icon { background: rgba(217, 119, 6, 0.1); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 0.25rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.stat-trend.up {
  color: #059669;
}

.content-area {
  padding: 0 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.loading-card,
.empty-card {
  max-width: 500px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.loading-content,
.empty-content {
  text-align: center;
  padding: 3rem;
}

.loading-spinner {
  margin-bottom: 2rem;
}

.spinner-ring {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(59, 130, 246, 0.2);
  border-top: 6px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content h3,
.empty-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.loading-content p,
.empty-content p {
  color: #64748b;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.empty-icon {
  color: #cbd5e1;
  margin-bottom: 2rem;
}

.empty-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-action {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.secondary-action {
  border-color: rgba(255, 255, 255, 0.3);
  color: #64748b;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 2rem;
}

.live-match-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  overflow: hidden;
}

.live-match-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  border-color: rgba(59, 130, 246, 0.5);
}

.match-content {
  padding: 2rem;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
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
  background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.live-text {
  letter-spacing: 0.5px;
}

.viewer-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}

.tournament-badge {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.players-section {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.player {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  truncate: true;
}

.player-details {
  margin-top: 0.5rem;
}

.community-badge {
  font-size: 0.75rem;
}

.player-score {
  text-align: center;
  margin-left: 1rem;
}

.score-value {
  font-size: 2rem;
  font-weight: 800;
  color: #3b82f6;
  line-height: 1;
}

.score-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 0.25rem;
}

.vs-separator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vs-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #64748b;
  font-size: 0.875rem;
  letter-spacing: 1px;
}

.match-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.info-card:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.info-content {
  flex: 1;
}

.info-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.info-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.status-item {
  flex: 1;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

.status-indicator.frame {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.status-indicator.break {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-indicator.paused {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-indicator.playing {
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.watch-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  flex: 1;
}

.settings-btn {
  border-color: #d1d5db;
}

.details-btn {
  color: #64748b;
}

.quick-actions-toolbar {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 50;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.toolbar-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toolbar-info span {
  font-weight: 700;
  color: #1e293b;
  font-size: 1.125rem;
}

.toolbar-info small {
  color: #64748b;
  font-weight: 500;
}

.toolbar-actions {
  display: flex;
  gap: 1rem;
}

@media (max-width: 1024px) {
  .hero-content {
    flex-direction: column;
    gap: 2rem;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .matches-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-header {
    padding: 2rem 1rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .stats-section,
  .content-area {
    padding: 0 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .stat-content {
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .players-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: center;
  }
  
  .vs-separator {
    order: -1;
  }
  
  .player {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .player-score {
    margin-left: 0;
  }
  
  .match-info-grid {
    grid-template-columns: 1fr;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .empty-actions {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .toolbar-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .toolbar-actions {
    justify-content: center;
  }
}
</style>