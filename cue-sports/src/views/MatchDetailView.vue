<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <Button variant="ghost" @click="router.push('/matches')">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Match Details</h1>
          <p class="text-muted-foreground" v-if="match">
            <span v-if="match.tournamentName" class="font-medium">{{ match.tournamentName }} • </span>
            {{ match.tournamentLevel }} • Round {{ match.roundNumber }} • Match {{ match.matchNumber }}
          </p>
        </div>
      </div>
      <div class="flex items-center space-x-2" v-if="match">
        <Badge :variant="getStatusVariant(match.status)">{{ match.status }}</Badge>
        <div v-if="isLive" class="flex items-center text-red-600 text-sm font-medium">
          <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
          LIVE
        </div>
        <Button v-if="match.status === 'scheduled'" @click="startMatch">
          <Play class="h-4 w-4 mr-2" />
          Start Match
        </Button>
        <Button v-if="match.status === 'in_progress'" @click="isLive ? viewLiveMatch() : goLive()" :variant="isLive ? 'default' : 'outline'">
          <Radio v-if="!isLive" class="h-4 w-4 mr-2" />
          <Eye v-if="isLive" class="h-4 w-4 mr-2" />
          {{ isLive ? 'View Live Match' : 'Go Live' }}
        </Button>
        <Button v-if="match.status === 'in_progress'" @click="submitMatchResult" variant="default" class="bg-green-600 hover:bg-green-700">
          <Trophy class="h-4 w-4 mr-2" />
          Submit Final Result
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <AlertCircle class="h-8 w-8 text-red-500 mx-auto mb-2" />
      <p class="text-red-600">{{ error }}</p>
      <Button @click="loadMatch" class="mt-4" variant="outline">
        <RefreshCw class="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>

    <!-- Match Content -->
    <div v-else-if="match" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Live Match Control (full width when active) -->
      <div v-if="match.status === 'in_progress' && isLive" class="lg:col-span-3">
        <LiveMatchControl :match="match" />
      </div>

      <!-- Match Management Panel (when in progress) -->
      <div v-if="match.status === 'in_progress'" class="lg:col-span-3">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <!-- Match Control Panel -->
          <div class="xl:col-span-3">
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <div>
                    <CardTitle>Match Management</CardTitle>
                    <p class="text-sm text-muted-foreground">Control match progression, scoring, and live status</p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <Button 
                      @click="isLive ? viewLiveMatch() : goLive()" 
                      :variant="isLive ? 'default' : 'outline'"
                      size="sm"
                    >
                      <Radio v-if="!isLive" class="h-3 w-3 mr-1" />
                      <Eye v-if="isLive" class="h-3 w-3 mr-1" />
                      {{ isLive ? 'View Live' : 'Go Live' }}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MatchControlPanel :match="match" :is-live="isLive" @match-updated="handleMatchUpdated" />
              </CardContent>
            </Card>
          </div>
          
          <!-- Match Info Sidebar -->
          <div>
            <MatchInfoSidebar :match="match" @venue-updated="handleVenueUpdated" />
          </div>
        </div>
      </div>

      <!-- Main Match Info -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Players and Score -->
        <Card>
          <CardHeader>
            <CardTitle>Match Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-6">
              <!-- Score Display -->
              <div class="text-center">
                <div class="flex items-center justify-center space-x-8">
                  <!-- Player 1 -->
                  <div class="text-center">
                    <div class="text-4xl font-bold" :class="{ 'text-green-600': match.status === 'completed' && correctWinner?.id === match.player1Id }">
                      {{ match.player1Score !== undefined ? match.player1Score : '-' }}
                    </div>
                    <div class="font-medium text-lg">{{ match.player1Name }}</div>
                    <div class="text-sm text-muted-foreground">
                      {{ match.player1Points }} pts
                      <span v-if="match.player1FrameWins !== undefined" class="block">
                        {{ match.player1FrameWins }} frames
                      </span>
                    </div>
                  </div>
                  
                  <!-- VS -->
                  <div class="text-2xl text-muted-foreground font-bold">VS</div>
                  
                  <!-- Player 2 or BYE -->
                  <div class="text-center">
                    <div class="text-4xl font-bold" :class="{ 'text-green-600': match.status === 'completed' && correctWinner?.id === match.player2Id }">
                      {{ match.player2Score !== undefined ? match.player2Score : '-' }}
                    </div>
                    <div class="font-medium text-lg">{{ match.player2Name || 'BYE' }}</div>
                    <div class="text-sm text-muted-foreground">
                      {{ match.player2Name ? `${match.player2Points} pts` : 'Automatic Win' }}
                      <span v-if="match.player2FrameWins !== undefined" class="block">
                        {{ match.player2FrameWins }} frames
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Winner Display -->
                <div v-if="match.status === 'completed' && correctWinner" class="mt-4 space-y-2">
                  <Badge variant="default" class="text-lg px-4 py-1">
                    🏆 Winner: {{ correctWinner.name }}
                  </Badge>
                  
                  <!-- Detailed Result Breakdown -->
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <div class="font-medium text-green-800 mb-2">Final Result</div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <div class="text-gray-600">{{ match.player1Name }}</div>
                        <div class="font-bold text-lg">{{ correctWinner.scores.player1 }} points</div>
                        <div v-if="correctWinner.frames.player1 > 0" class="text-sm text-gray-500">
                          {{ correctWinner.frames.player1 }} frames
                        </div>
                      </div>
                      <div>
                        <div class="text-gray-600">{{ match.player2Name || 'Player 2' }}</div>
                        <div class="font-bold text-lg">{{ correctWinner.scores.player2 }} points</div>
                        <div v-if="correctWinner.frames.player2 > 0" class="text-sm text-gray-500">
                          {{ correctWinner.frames.player2 }} frames
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="match.matchDurationMinutes" class="text-sm text-muted-foreground">
                    Match Duration: {{ match.matchDurationMinutes }} minutes
                  </div>
                  <div v-if="match.totalFramesPlayed" class="text-sm text-muted-foreground">
                    Total Frames Played: {{ match.totalFramesPlayed }}
                  </div>
                </div>
              </div>
              
              <!-- Match Progress -->
              <div v-if="match.status === 'in_progress'" class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Match Progress</span>
                  <span>{{ getProgressPercentage(match) }}%</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2">
                  <div 
                    class="bg-primary h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${getProgressPercentage(match)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Match Timeline -->
        <Card>
          <CardHeader>
            <CardTitle>Match Timeline</CardTitle>
            <p class="text-sm text-muted-foreground">Key events and match progression</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex items-center space-x-3 p-3 border rounded-lg">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                <div>
                  <p class="font-medium">Match Created</p>
                  <p class="text-sm text-muted-foreground">{{ formatDateTime(match.createdAt) }}</p>
                </div>
              </div>
              
              <div v-if="match.scheduledDateTime" class="flex items-center space-x-3 p-3 border rounded-lg">
                <Clock class="h-4 w-4 text-muted-foreground" />
                <div>
                  <p class="font-medium">Scheduled Start</p>
                  <p class="text-sm text-muted-foreground">{{ formatDateTime(match.scheduledDateTime) }}</p>
                </div>
              </div>
              
              <div v-if="match.actualStartTime" class="flex items-center space-x-3 p-3 border rounded-lg">
                <Play class="h-4 w-4 text-green-600" />
                <div>
                  <p class="font-medium">Match Started</p>
                  <p class="text-sm text-muted-foreground">{{ formatDateTime(match.actualStartTime) }}</p>
                </div>
              </div>
              
              <div v-if="match.actualEndTime" class="flex items-center space-x-3 p-3 border rounded-lg bg-green-50">
                <Trophy class="h-4 w-4 text-yellow-600" />
                <div class="flex-1">
                  <p class="font-medium">Match Completed</p>
                  <p class="text-sm text-muted-foreground">{{ formatDateTime(match.actualEndTime) }}</p>
                  <div v-if="correctWinner" class="mt-2 space-y-1">
                    <p class="text-sm font-medium text-green-700">
                      🏆 Winner: {{ correctWinner.name }}
                    </p>
                    <div v-if="match.player1Score !== undefined && match.player2Score !== undefined" class="text-xs text-gray-600">
                      <p>Final Score: {{ match.player1Name }}: {{ correctWinner.scores.player1 }} - {{ match.player2Name || 'Player 2' }}: {{ correctWinner.scores.player2 }}</p>
                      <p v-if="correctWinner.frames.player1 > 0 || correctWinner.frames.player2 > 0">
                        Frames: {{ correctWinner.frames.player1 }} - {{ correctWinner.frames.player2 }}
                      </p>
                      <p v-if="match.matchDurationMinutes">
                        Duration: {{ match.matchDurationMinutes }} minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Result Submission Timeline Entry -->
              <div v-if="match.resultSubmittedAt" class="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50">
                <CheckCircle class="h-4 w-4 text-blue-600" />
                <div>
                  <p class="font-medium">Result Submitted</p>
                  <p class="text-sm text-muted-foreground">{{ formatDateTime(match.resultSubmittedAt) }}</p>
                  <p v-if="match.resultSubmittedBy" class="text-xs text-gray-500">
                    Submitted by user {{ match.resultSubmittedBy }}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Result Submission -->
        <Card v-if="match.status === 'in_progress'">
          <CardHeader>
            <CardTitle>Submit Match Result</CardTitle>
            <p class="text-sm text-muted-foreground">Enter the final scores and winner</p>
          </CardHeader>
          <CardContent>
            <MatchResultsForm :match="match" @result-submitted="handleResultSubmitted" />
          </CardContent>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Match Information -->
        <Card>
          <CardHeader>
            <CardTitle>Match Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Tournament Level</span>
                <Badge variant="outline">{{ match.tournamentLevel }}</Badge>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Match Type</span>
                <Badge variant="secondary">{{ match.matchType }}</Badge>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Round</span>
                <span class="font-medium">{{ match.roundNumber }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Match Number</span>
                <span class="font-medium">#{{ match.matchNumber }}</span>
              </div>
              <div v-if="match.venueId" class="flex justify-between">
                <span class="text-sm text-muted-foreground">Venue</span>
                <span class="font-medium">{{ match.venueId }}</span>
              </div>
              <div v-if="match.tableNumber" class="flex justify-between">
                <span class="text-sm text-muted-foreground">Table</span>
                <span class="font-medium">{{ match.tableNumber }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Admin Notes -->
        <Card v-if="match.adminNotes">
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm">{{ match.adminNotes }}</p>
          </CardContent>
        </Card>

        <!-- Actions -->
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <Button variant="outline" class="w-full" @click="editMatch">
                <Edit class="h-4 w-4 mr-2" />
                Edit Match
              </Button>
              <Button variant="outline" class="w-full" @click="exportMatch">
                <Download class="h-4 w-4 mr-2" />
                Export Details
              </Button>
              <Button variant="destructive" class="w-full" @click="deleteMatch">
                <Trash2 class="h-4 w-4 mr-2" />
                Delete Match
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :is-open="showConfirmModal"
      :title="confirmModalData.title"
      :message="confirmModalData.message"
      :details="confirmModalData.details"
      :warning-text="confirmModalData.warningText"
      :variant="confirmModalData.variant"
      confirm-text="Submit Result"
      cancel-text="Cancel"
      @confirm="confirmModalData.onConfirm"
      @cancel="showConfirmModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ArrowLeft, 
  Play, 
  Trophy, 
  AlertCircle, 
  RefreshCw,
  Calendar,
  Clock,
  Edit,
  Download,
  Trash2,
  Radio,
  Eye,
  CheckCircle
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import MatchResultsForm from '@/components/matches/MatchResultsForm.vue'
import LiveMatchControl from '@/components/matches/LiveMatchControl.vue'
import MatchControlPanel from '@/components/matches/MatchControlPanel.vue'
import MatchInfoSidebar from '@/components/matches/MatchInfoSidebar.vue'
import ConfirmationModal from '@/components/ui/ConfirmationModal.vue'
import { useMatches } from '@/composables/useMatches'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { liveMatchService } from '@/services/liveMatchService'
import type { Match } from '@/types/match'

const router = useRouter()
const route = useRoute()
const { success, error: showError } = useToast()
const { getMatch, updateMatch, getAllMatchesWithTournamentNames } = useMatches()
const authStore = useAuthStore()

// Props
interface Props {
  id: string
}

const props = defineProps<Props>()

// State
const match = ref<Match | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isLive = ref(false)
const makingLive = ref(false)
const showConfirmModal = ref(false)
const confirmModalData = ref({
  title: '',
  message: '',
  details: [] as Array<{label: string, value: string}>,
  warningText: '',
  variant: 'info' as 'danger' | 'warning' | 'success' | 'info',
  onConfirm: () => {}
})

// Computed
const correctWinner = computed(() => {
  if (!match.value || match.value.status !== 'completed') {
    return null
  }

  // Determine the correct winner based on actual scores
  const player1Score = match.value.player1Score || 0
  const player2Score = match.value.player2Score || 0
  const player1FrameWins = match.value.player1FrameWins || 0
  const player2FrameWins = match.value.player2FrameWins || 0
  const totalFrames = player1FrameWins + player2FrameWins

  let correctWinnerId: string
  let correctWinnerName: string

  // Use points as primary determinant
  if (player1Score > 0 || player2Score > 0) {
    if (player1Score > player2Score) {
      correctWinnerId = match.value.player1Id
      correctWinnerName = match.value.player1Name
    } else {
      correctWinnerId = match.value.player2Id || ''
      correctWinnerName = match.value.player2Name || 'Player 2'
    }
  }
  // Only use frame wins for multi-frame matches without point scores
  else if (totalFrames > 1 && (player1FrameWins > 0 || player2FrameWins > 0)) {
    if (player1FrameWins > player2FrameWins) {
      correctWinnerId = match.value.player1Id
      correctWinnerName = match.value.player1Name
    } else {
      correctWinnerId = match.value.player2Id || ''
      correctWinnerName = match.value.player2Name || 'Player 2'
    }
  }
  // Fallback to stored winner
  else {
    correctWinnerId = match.value.winnerId || ''
    correctWinnerName = match.value.winnerName || ''
  }

  return {
    id: correctWinnerId,
    name: correctWinnerName,
    isCorrection: correctWinnerId !== match.value.winnerId, // Flag if this differs from stored winner
    scores: { player1: player1Score, player2: player2Score },
    frames: { player1: player1FrameWins, player2: player2FrameWins }
  }
})

// Methods
const loadMatch = async () => {
  loading.value = true
  error.value = null
  
  try {
    const matchId = props.id || route.params.id as string
    console.log('🔍 Loading match details for ID:', matchId)
    
    // Try 1: Direct match fetch (with tournament context if available)
    let foundMatch = null
    const tournamentId = route.query.tournamentId as string
    
    if (tournamentId) {
      console.log('🔍 Using tournament context:', tournamentId)
      foundMatch = await getMatch(matchId, tournamentId)
    }
    
    // Try 2: If no match found or no tournament context, search all indexed matches
    if (!foundMatch) {
      console.log('🔍 Searching all indexed matches for match ID...')
      try {
        const allMatches = await getAllMatchesWithTournamentNames()
        foundMatch = allMatches.find(m => m.id === matchId)
        
        if (foundMatch) {
          console.log('✅ Found match in indexed locations:', foundMatch.tournamentName || foundMatch.tournamentId)
          // Convert to proper Match type (remove tournamentName if it's not in the original interface)
          const { tournamentName, ...matchData } = foundMatch
          foundMatch = { ...matchData, tournamentName } as Match & { tournamentName?: string }
        }
      } catch (searchError) {
        console.warn('⚠️ Could not search indexed matches:', searchError)
      }
    }
    
    // Try 3: Fallback to basic getMatch
    if (!foundMatch) {
      console.log('🔍 Fallback to basic match fetch...')
      foundMatch = await getMatch(matchId)
    }
    
    if (!foundMatch) {
      throw new Error(`Match not found with ID: ${matchId}`)
    }
    
    match.value = foundMatch
    console.log('✅ Match loaded successfully:', foundMatch.player1Name, 'vs', foundMatch.player2Name)
    
    // Check if match is live
    if (match.value?.status === 'in_progress') {
      try {
        const liveState = await liveMatchService.getLiveMatchState(matchId)
        isLive.value = liveState?.isLive || false
        console.log('📺 Match live status:', isLive.value)
      } catch (err) {
        // Not live if we can't get live state
        isLive.value = false
      }
    }
  } catch (err) {
    console.error('❌ Failed to load match:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load match'
  } finally {
    loading.value = false
  }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'in_progress': return 'destructive'
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'pending': return 'outline'
    default: return 'outline'
  }
}

const getProgressPercentage = (match: Match): number => {
  // Use frame wins if available, otherwise fall back to total scores
  if (match.player1FrameWins !== undefined && match.player2FrameWins !== undefined) {
    const totalFrames = match.player1FrameWins + match.player2FrameWins
    const maxFrames = 9 // Best of 9 (first to 5)
    return Math.min((totalFrames / maxFrames) * 100, 100)
  }
  
  if (!match.player1Score && !match.player2Score) return 0
  const totalScore = (match.player1Score || 0) + (match.player2Score || 0)
  // Estimate progress based on typical snooker frame scores (around 60-80 points per frame)
  const estimatedPointsPerFrame = 70
  const estimatedMaxPoints = 9 * estimatedPointsPerFrame // 630 points for 9 frames
  return Math.min((totalScore / estimatedMaxPoints) * 100, 100)
}

const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return 'Not set'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const startMatch = async () => {
  if (!match.value) return
  
  if (!authStore.user?.uid) {
    showError('Authentication required to start match')
    return
  }
  
  try {
    console.log('🏁 Starting match:', match.value.id)
    const updateData = {
      status: 'in_progress' as const,
      actualStartTime: new Date()
    }
    
    const updatedMatch = await updateMatch(match.value.id, updateData, authStore.user.uid, match.value.tournamentId)
    
    if (updatedMatch) {
      // Update local state
      match.value.status = 'in_progress'
      match.value.actualStartTime = updatedMatch.actualStartTime
      
      // Automatically make the match live for real-time scoring
      console.log('📺 Making match live for real-time scoring...')
      await liveMatchService.makeMatchLive(match.value.id, authStore.user.uid, {
        shotClockDuration: 60,
        breakTimeDuration: 300,
        autoAdvanceFrames: true,
        allowSpectatorView: true,
        recordDetailedStatistics: true,
        enableShotClock: false,
        maxFramesToWin: 5,
        soundEnabled: false,
        vibrationEnabled: false
      })
      
      isLive.value = true
      console.log('✅ Match started and made live successfully')
      success('Match started and is now live!')
    } else {
      throw new Error('Failed to update match')
    }
  } catch (err) {
    console.error('❌ Failed to start match:', err)
    showError('Failed to start match')
  }
}

const submitMatchResult = async () => {
  if (!match.value) return
  
  if (!authStore.user?.uid) {
    showError('Authentication required to submit result')
    return
  }
  
  try {
    // Get current match scores from live match state if available
    let currentScores = { player1: 0, player2: 0 }
    let frameWins = { player1: 0, player2: 0 }
    
    if (isLive.value) {
      try {
        const liveState = await liveMatchService.getLiveMatchState(match.value.id)
        if (liveState && liveState.frames) {
          // Calculate scores from live match frames
          const completedFrames = liveState.frames.filter(f => f.isComplete)
          frameWins.player1 = completedFrames.filter(f => f.winner === 'player1').length
          frameWins.player2 = completedFrames.filter(f => f.winner === 'player2').length
          
          // Get current frame scores
          const currentFrame = liveState.frames[liveState.currentFrame - 1]
          if (currentFrame) {
            currentScores.player1 = currentFrame.player1Score
            currentScores.player2 = currentFrame.player2Score
          }
        }
      } catch (liveError) {
        console.warn('Could not get live match state, using basic match data')
      }
    }
    
    // Use stored match scores if available
    if (match.value.player1Score !== undefined) currentScores.player1 = match.value.player1Score
    if (match.value.player2Score !== undefined) currentScores.player2 = match.value.player2Score
    if (match.value.player1FrameWins !== undefined) frameWins.player1 = match.value.player1FrameWins
    if (match.value.player2FrameWins !== undefined) frameWins.player2 = match.value.player2FrameWins
    
    // Determine winner: Use points as primary determinant, frames only if it's a multi-frame match
    let winner: 'player1' | 'player2'
    const totalFrames = frameWins.player1 + frameWins.player2
    
    // If we have actual scores (points), use those as primary determinant
    if (currentScores.player1 > 0 || currentScores.player2 > 0) {
      winner = currentScores.player1 > currentScores.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by points:', winner, `(${currentScores.player1}-${currentScores.player2})`)
    } 
    // Only use frame wins if no point scores available AND it's clearly a multi-frame match
    else if (totalFrames > 1 && (frameWins.player1 > 0 || frameWins.player2 > 0)) {
      winner = frameWins.player1 > frameWins.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by frames:', winner, `(${frameWins.player1}-${frameWins.player2})`)
    }
    // Fallback: if no scores or frames, default to player1
    else {
      winner = 'player1'
      console.log('🏆 Winner defaulted to player1 (no valid scores found)')
    }
    
    const winnerId = winner === 'player1' ? match.value.player1Id : match.value.player2Id
    const winnerName = winner === 'player1' ? match.value.player1Name : (match.value.player2Name || 'Player 2')
    
    // Show styled confirmation modal
    confirmModalData.value = {
      title: 'Submit Final Match Result',
      message: `Are you sure you want to submit the final result with ${winnerName} as the winner?`,
      details: [
        { label: 'Winner', value: winnerName },
        { label: 'Final Score', value: `${match.value.player1Name}: ${currentScores.player1} - ${match.value.player2Name || 'Player 2'}: ${currentScores.player2}` },
        { label: 'Frames Won', value: `${frameWins.player1} - ${frameWins.player2}` },
        { label: 'Match Duration', value: `${Math.floor((new Date().getTime() - new Date(match.value.actualStartTime || new Date()).getTime()) / 1000 / 60)} minutes` }
      ],
      warningText: 'This action will complete the match and end live status. This cannot be undone.',
      variant: 'warning',
      onConfirm: async () => {
        showConfirmModal.value = false
        await executeMatchSubmission(currentScores, frameWins, winner, winnerId, winnerName)
      }
    }
    showConfirmModal.value = true
    
  } catch (err) {
    console.error('❌ Failed to prepare match result submission:', err)
    showError('Failed to prepare match result submission')
  }
  
  const executeMatchSubmission = async (currentScores: any, frameWins: any, winner: string, winnerId: string, winnerName: string) => {
    if (!match.value) return
    
    try {
      console.log('📝 Submitting match result from detail view:', match.value.id, 'Winner:', winnerId)
      
      // Calculate match duration
      const matchStartTime = match.value.actualStartTime ? new Date(match.value.actualStartTime) : new Date()
      const matchEndTime = new Date()
      const matchDuration = Math.floor((matchEndTime.getTime() - matchStartTime.getTime()) / 1000 / 60)
      
      // Complete live match if active
      if (isLive.value) {
        console.log('📺 Completing live match...')
        await liveMatchService.completeMatch(match.value.id, winnerId, authStore.user.uid)
      }
      
      // Submit comprehensive result
      const finalResult = {
        status: 'completed' as const,
        actualEndTime: matchEndTime,
        winnerId,
        winnerName,
        loserId: winner === 'player1' ? match.value.player2Id : match.value.player1Id,
        loserName: winner === 'player1' ? (match.value.player2Name || 'Player 2') : match.value.player1Name,
        player1Score: currentScores.player1,
        player2Score: currentScores.player2,
        player1FrameWins: frameWins.player1,
        player2FrameWins: frameWins.player2,
        totalFramesPlayed: frameWins.player1 + frameWins.player2,
        matchDurationMinutes: matchDuration,
        resultSubmittedAt: matchEndTime,
        resultSubmittedBy: authStore.user.uid,
        adminNotes: `Final Result: ${winnerName} wins ${winner === 'player1' ? currentScores.player1 : currentScores.player2}-${winner === 'player1' ? currentScores.player2 : currentScores.player1} (${winner === 'player1' ? frameWins.player1 : frameWins.player2}-${winner === 'player1' ? frameWins.player2 : frameWins.player1} frames)`
      }
      
      await updateMatch(match.value.id, finalResult, authStore.user.uid, match.value.tournamentId)
      
      // Update local state
      Object.assign(match.value, finalResult)
      isLive.value = false
      
      success(`🏆 Match completed! Final Result: ${winnerName} wins ${winner === 'player1' ? currentScores.player1 : currentScores.player2}-${winner === 'player1' ? currentScores.player2 : currentScores.player1}`)
      
    } catch (err) {
      console.error('❌ Failed to submit match result:', err)
      showError('Failed to submit match result')
    }
  }
}

const handleResultSubmitted = (result: any) => {
  if (match.value) {
    match.value.status = 'completed'
    match.value.actualEndTime = new Date().toISOString()
    match.value.winnerId = result.winnerId
  }
  success('Match result submitted successfully')
}

const editMatch = () => {
  // Navigate to edit view or open edit modal
  success('Edit functionality coming soon')
}

const exportMatch = () => {
  // Export match details
  success('Export functionality coming soon')
}

const deleteMatch = () => {
  // Delete match with confirmation
  success('Delete functionality coming soon')
}

const goLive = async () => {
  if (!match.value) return
  
  if (!authStore.user?.uid) {
    showError('Authentication required to make match live')
    return
  }
  
  makingLive.value = true
  try {
    console.log('📺 Making match live:', match.value.id)
    await liveMatchService.makeMatchLive(match.value.id, authStore.user.uid, {
      shotClockDuration: 60,
      breakTimeoutDuration: 300,
      enableWarnings: true,
      allowSpectators: true,
      enableCommentary: false,
      autoSaveScores: true,
      notifyFrameEnd: true,
      notifyBreakRecord: true
    })
    
    isLive.value = true
    console.log('✅ Match is now live')
    success('Match is now live!')
  } catch (err) {
    console.error('❌ Failed to make match live:', err)
    showError('Failed to make match live')
  } finally {
    makingLive.value = false
  }
}

const viewLiveMatch = () => {
  if (match.value) {
    router.push(`/matches/${match.value.id}/live`)
  }
}

const handleMatchUpdated = (updatedMatch: any) => {
  // Handle match updates from control panel
  if (match.value) {
    match.value = { ...match.value, ...updatedMatch }
  }
  success('Match updated successfully')
}

const handleVenueUpdated = (venueData: any) => {
  // Handle venue updates
  if (match.value) {
    match.value = { ...match.value, ...venueData }
  }
  success('Venue updated successfully')
}

// Lifecycle
onMounted(() => {
  loadMatch()
})
</script>