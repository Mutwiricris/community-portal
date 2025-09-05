<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Match Management</h1>
        <p class="text-muted-foreground">Create, manage, and monitor tournament matches</p>
      </div>
      <div class="flex items-center space-x-2">
        <Button 
          @click="router.push('/matches/create')"
          class="flex items-center space-x-2"
        >
          <Plus class="h-4 w-4" />
          <span>Create Match</span>
        </Button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Matches</CardTitle>
          <Gamepad2 class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ matchStats.active }}</div>
          <p class="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Pending</CardTitle>
          <Clock class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ matchStats.pending }}</div>
          <p class="text-xs text-muted-foreground">Awaiting scheduling</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Completed</CardTitle>
          <CheckCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ matchStats.completed }}</div>
          <p class="text-xs text-muted-foreground">This week</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Automation</CardTitle>
          <Bot class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ matchStats.automated }}%</div>
          <p class="text-xs text-muted-foreground">Auto-generated</p>
        </CardContent>
      </Card>
    </div>

    <!-- Match Management Tabs -->
    <div class="space-y-4">
      <!-- Tab Navigation -->
      <div class="border-b border-border">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="activeTab = tab.value"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Management Tab -->
      <div v-if="activeTab === 'management'" class="space-y-4">
        <MatchManagementPanel 
          :matches="matches" 
          :loading="loading"
          @refresh="refreshMatches"
        />
      </div>

      <!-- Active Matches Tab -->
      <div v-if="activeTab === 'active'" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Matches</CardTitle>
            <p class="text-sm text-muted-foreground">Matches currently in progress</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-if="loading" class="flex justify-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <div v-else-if="activeMatches.length === 0" class="text-center py-8 text-muted-foreground">
                No active matches at the moment
                <div class="text-xs mt-2">
                  Total matches loaded: {{ matches.length }}
                </div>
                <div class="text-xs mt-1">
                  Status breakdown: {{ Object.entries(matches.reduce((acc, m) => { acc[m.status] = (acc[m.status] || 0) + 1; return acc; }, {})).map(([status, count]) => `${status}: ${count}`).join(', ') }}
                </div>
              </div>
              <div v-else class="space-y-4">
                <div 
                  v-for="match in activeMatches" 
                  :key="match.id"
                  class="group border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <!-- Match Header -->
                  <div class="p-4 border-b border-gray-100">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <Badge :variant="getMatchStatusVariant(match.status)">
                          {{ formatStatusLabel(match.status) }}
                        </Badge>
                        <div v-if="isMatchLive(match.id)" class="flex items-center text-red-600 text-sm font-medium">
                          <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
                          LIVE
                        </div>
                        <div class="text-sm text-muted-foreground">
                          {{ formatMatchInfo(match) }}
                        </div>
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {{ formatTimeAgo(match.actualStartTime || match.scheduledDateTime) }}
                      </div>
                    </div>
                  </div>

                  <!-- Players and Current Status -->
                  <div class="p-4">
                    <div class="flex items-center justify-between mb-4">
                      <!-- Player 1 -->
                      <div class="flex-1">
                        <div class="font-semibold text-lg">{{ match.player1Name }}</div>
                        <div class="text-sm text-muted-foreground">
                          {{ match.player1Points }} tournament points
                        </div>
                        <div v-if="match.player1Score !== undefined" class="text-lg font-bold text-blue-600 mt-1">
                          {{ match.player1Score }} points
                        </div>
                      </div>

                      <!-- VS Divider -->
                      <div class="px-6">
                        <div class="text-center">
                          <div class="text-lg font-semibold text-muted-foreground">VS</div>
                          <div v-if="match.status === 'in_progress'" class="text-xs text-orange-600 font-medium mt-1">
                            In Progress
                          </div>
                        </div>
                      </div>

                      <!-- Player 2 -->
                      <div class="flex-1 text-right">
                        <div class="font-semibold text-lg">{{ match.player2Name || 'BYE' }}</div>
                        <div class="text-sm text-muted-foreground">
                          {{ match.player2Name ? `${match.player2Points} tournament points` : 'Automatic Win' }}
                        </div>
                        <div v-if="match.player2Score !== undefined" class="text-lg font-bold text-blue-600 mt-1">
                          {{ match.player2Score }} points
                        </div>
                      </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-2">
                      <Button 
                        v-if="match.status === 'in_progress'"
                        @click="isMatchLive(match.id) ? router.push(`/matches/${match.id}/live`) : goLive(match)"
                        size="sm"
                        :variant="isMatchLive(match.id) ? 'default' : 'outline'"
                      >
                        <Radio v-if="!isMatchLive(match.id)" class="h-3 w-3 mr-1" />
                        <Eye v-if="isMatchLive(match.id)" class="h-3 w-3 mr-1" />
                        {{ isMatchLive(match.id) ? 'View Live' : 'Go Live' }}
                      </Button>
                      <Button 
                        @click="router.push(`/matches/${match.id}${match.tournamentId ? '?tournamentId=' + match.tournamentId : ''}`)"
                        size="sm"
                        variant="ghost"
                      >
                        <Eye class="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Scheduled Matches Tab -->
      <div v-if="activeTab === 'scheduled'" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Matches</CardTitle>
            <p class="text-sm text-muted-foreground">Upcoming matches awaiting start</p>
          </CardHeader>
          <CardContent>
            <MatchCreationForm />
          </CardContent>
        </Card>
      </div>

      <!-- Completed Matches Tab -->
      <div v-if="activeTab === 'completed'" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <p class="text-sm text-muted-foreground">Recently completed matches with detailed results</p>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="flex justify-center p-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <div v-else-if="completedMatches.length === 0" class="text-center py-8 text-muted-foreground">
              No completed matches found
            </div>
            <div v-else class="space-y-4">
              <div 
                v-for="match in completedMatches" 
                :key="match.id"
                class="group border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                @click="router.push(`/matches/${match.id}${match.tournamentId ? '?tournamentId=' + match.tournamentId : ''}`)"
              >
                <!-- Match Header -->
                <div class="p-4 border-b border-gray-100">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <Badge variant="outline" class="text-green-600 border-green-200 bg-green-50">
                        <CheckCircle class="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                      <div class="text-sm text-muted-foreground">
                        {{ formatMatchInfo(match) }}
                      </div>
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {{ formatDate(match.actualEndTime) }}
                    </div>
                  </div>
                </div>

                <!-- Players and Results -->
                <div class="p-4">
                  <div class="flex items-center justify-between">
                    <!-- Player 1 -->
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <div class="flex-1">
                          <div class="font-semibold text-lg" :class="{ 'text-green-600': getCorrectWinner(match)?.id === match.player1Id }">
                            {{ match.player1Name }}
                          </div>
                          <div class="text-sm text-muted-foreground">
                            {{ match.player1Points }} tournament points
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-2xl font-bold" :class="{ 'text-green-600': getCorrectWinner(match)?.id === match.player1Id }">
                            {{ match.player1Score !== undefined ? match.player1Score : '-' }}
                          </div>
                          <div v-if="match.player1FrameWins !== undefined && match.player1FrameWins > 0" class="text-sm text-muted-foreground">
                            {{ match.player1FrameWins }} frames
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- VS Divider -->
                    <div class="px-6">
                      <div class="text-center">
                        <div class="text-lg font-semibold text-muted-foreground">VS</div>
                        <div v-if="match.matchDurationMinutes" class="text-xs text-muted-foreground">
                          {{ match.matchDurationMinutes }}min
                        </div>
                      </div>
                    </div>

                    <!-- Player 2 -->
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <div class="text-right">
                          <div class="text-2xl font-bold" :class="{ 'text-green-600': getCorrectWinner(match)?.id === match.player2Id }">
                            {{ match.player2Score !== undefined ? match.player2Score : '-' }}
                          </div>
                          <div v-if="match.player2FrameWins !== undefined && match.player2FrameWins > 0" class="text-sm text-muted-foreground">
                            {{ match.player2FrameWins }} frames
                          </div>
                        </div>
                        <div class="flex-1 text-right">
                          <div class="font-semibold text-lg" :class="{ 'text-green-600': getCorrectWinner(match)?.id === match.player2Id }">
                            {{ match.player2Name || 'BYE' }}
                          </div>
                          <div class="text-sm text-muted-foreground">
                            {{ match.player2Name ? `${match.player2Points} tournament points` : 'Automatic Win' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Winner Banner -->
                  <div v-if="getCorrectWinner(match)" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-center space-x-2">
                      <Trophy class="h-4 w-4 text-green-600" />
                      <span class="font-semibold text-green-800">
                        🏆 Winner: {{ getCorrectWinner(match)?.name }}
                      </span>
                      <span class="text-sm text-green-600">
                        ({{ getWinningScore(match) }} points)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Automation Tab -->
      <div v-if="activeTab === 'automation'" class="space-y-4">
        <!-- Algorithm Service Status -->
        <Card>
          <CardHeader>
            <CardTitle>Algorithm Service Status</CardTitle>
            <p class="text-sm text-muted-foreground">Real-time algorithm service monitoring</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 class="font-medium">Service Health</h3>
                  <p class="text-sm text-muted-foreground">{{ algorithmHealth.message }}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <Badge :variant="algorithmHealth.healthy ? 'default' : 'destructive'">
                    {{ algorithmHealth.healthy ? 'Operational' : 'Down' }}
                  </Badge>
                  <span class="text-xs text-muted-foreground">{{ algorithmHealth.responseTime }}ms</span>
                  <Button size="sm" @click="checkHealth" :disabled="checkingHealth">
                    <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': checkingHealth }" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Automated Matches Overview -->
        <Card>
          <CardHeader>
            <CardTitle>Automated Matches</CardTitle>
            <p class="text-sm text-muted-foreground">Matches generated by the algorithm system</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <!-- Statistics -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 bg-blue-50 rounded-lg">
                  <div class="text-2xl font-bold text-blue-600">{{ allMatchesWithTournaments.filter(m => 
                    m.adminNotes?.includes('algorithm') || 
                    m.adminNotes?.includes('Generated by algorithm') ||
                    m.createdBy === 'algorithm_service' ||
                    m.createdBy === 'algorithm-system'
                  ).length }}</div>
                  <p class="text-sm text-blue-600">Algorithm Generated</p>
                </div>
                <div class="p-4 bg-green-50 rounded-lg">
                  <div class="text-2xl font-bold text-green-600">{{ allMatchesWithTournaments.filter(m => 
                    (m.adminNotes?.includes('algorithm') || 
                     m.adminNotes?.includes('Generated by algorithm') ||
                     m.createdBy === 'algorithm_service' ||
                     m.createdBy === 'algorithm-system') &&
                    m.status === 'completed'
                  ).length }}</div>
                  <p class="text-sm text-green-600">Completed</p>
                </div>
                <div class="p-4 bg-orange-50 rounded-lg">
                  <div class="text-2xl font-bold text-orange-600">{{ allMatchesWithTournaments.filter(m => 
                    (m.adminNotes?.includes('algorithm') || 
                     m.adminNotes?.includes('Generated by algorithm') ||
                     m.createdBy === 'algorithm_service' ||
                     m.createdBy === 'algorithm-system') &&
                    m.status === 'pending'
                  ).length }}</div>
                  <p class="text-sm text-orange-600">Pending</p>
                </div>
              </div>

              <!-- Recent Automated Matches -->
              <div class="space-y-2 max-h-64 overflow-y-auto">
                <h4 class="font-medium">Recent Algorithm-Generated Matches</h4>
                <div v-if="automatedMatches.length === 0" class="text-center py-4 text-muted-foreground">
                  No automated matches found
                </div>
                <div v-else class="space-y-2">
                  <div 
                    v-for="match in automatedMatches.slice(0, 5)" 
                    :key="match.id"
                    class="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div class="flex-1">
                      <div class="font-medium">{{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ match.tournamentLevel }} • {{ match.roundNumber }} • {{ match.matchType }}
                      </div>
                    </div>
                    <div class="text-right">
                      <Badge variant="outline">{{ match.status }}</Badge>
                      <div class="text-xs text-muted-foreground mt-1">
                        <Bot class="w-3 h-3 inline mr-1" />
                        Auto-generated
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Round Information -->
              <div class="border-t pt-4">
                <h4 class="font-medium mb-3">Tournament Round Status</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div v-for="(roundInfo, tournament) in tournamentRounds" :key="tournament" class="p-3 border rounded-lg">
                    <div class="font-medium text-sm">{{ tournament }}</div>
                    <div class="text-xs text-muted-foreground mt-1">
                      Current Round: {{ roundInfo.currentRound }} • 
                      {{ roundInfo.completedMatches }}/{{ roundInfo.totalMatches }} completed
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        class="bg-blue-600 h-2 rounded-full" 
                        :style="{ width: `${(roundInfo.completedMatches / roundInfo.totalMatches) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Quick Actions -->
        <Card>
          <CardHeader>
            <CardTitle>Automation Actions</CardTitle>
            <p class="text-sm text-muted-foreground">Manage tournament automation and monitoring</p>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button @click="router.push('/matches/create?method=automated')" class="h-20 flex flex-col items-center justify-center">
                <Bot class="w-6 h-6 mb-2" />
                <span>Generate Matches</span>
                <span class="text-xs text-muted-foreground">Use algorithm to create matches</span>
              </Button>
              
              <Button @click="router.push('/automation')" variant="outline" class="h-20 flex flex-col items-center justify-center">
                <Activity class="w-6 h-6 mb-2" />
                <span>Monitor Automation</span>
                <span class="text-xs text-muted-foreground">View automation status</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Plus, 
  Gamepad2, 
  Clock, 
  CheckCircle, 
  Bot, 
  RefreshCw,
  Activity,
  Radio,
  Eye,
  Trophy
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import MatchCreationForm from '@/components/matches/MatchCreationForm.vue'
import MatchManagementPanel from '@/components/matches/MatchManagementPanel.vue'
import { useMatches } from '@/composables/useMatches'
import { useAutomation } from '@/composables/useAutomation'
import { liveMatchService } from '@/services/liveMatchService'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { matches, loading, searchMatches, getAllMatchesWithTournamentNames } = useMatches()
const { checkAlgorithmHealth } = useAutomation()
const { success, error: showError } = useToast()

// State
const algorithmHealth = ref({ healthy: false, message: '', responseTime: 0 })
const checkingHealth = ref(false)
const activeTab = ref('management')
const liveMatches = ref(new Set<string>())
const allMatchesWithTournaments = ref<(any & { tournamentName?: string })[]>([])

const tabs = [
  { value: 'management', label: 'Management' },
  { value: 'active', label: 'Active Matches' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'automation', label: 'Automation' }
]

// Computed properties
const activeMatches = computed(() => 
  allMatchesWithTournaments.value.filter(match => match.status === 'in_progress' || match.status === 'pending')
    .sort((a, b) => {
      // Prioritize in_progress matches, then by start time
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
      return new Date(b.actualStartTime || b.scheduledDateTime || 0).getTime() - new Date(a.actualStartTime || a.scheduledDateTime || 0).getTime()
    })
)

const scheduledMatches = computed(() => 
  matches.value.filter(match => match.status === 'scheduled')
)

const completedMatches = computed(() => 
  allMatchesWithTournaments.value.filter(match => match.status === 'completed')
    .sort((a, b) => new Date(b.actualEndTime || 0).getTime() - new Date(a.actualEndTime || 0).getTime())
    .slice(0, 15)
)

// Additional computed properties for automation
const automatedMatches = computed(() => 
  matches.value.filter(match => 
    match.adminNotes?.includes('algorithm') || 
    match.adminNotes?.includes('Generated by algorithm') ||
    match.createdBy === 'algorithm_service'
  )
)

const tournamentRounds = computed(() => {
  const rounds = {}
  // Use matches with tournament names for better display
  allMatchesWithTournaments.value.forEach(match => {
    const tournament = match.tournamentName || match.tournamentId || 'Unknown Tournament'
    if (!rounds[tournament]) {
      rounds[tournament] = {
        currentRound: 'R1',
        totalMatches: 0,
        completedMatches: 0
      }
    }
    rounds[tournament].totalMatches++
    if (match.status === 'completed') {
      rounds[tournament].completedMatches++
    }
    // Update current round to the highest round found
    if (match.roundNumber && match.roundNumber > rounds[tournament].currentRound) {
      rounds[tournament].currentRound = match.roundNumber
    }
  })
  return rounds
})

const matchStats = computed(() => ({
  active: activeMatches.value.length,
  pending: scheduledMatches.value.length,
  completed: completedMatches.value.length,
  automated: matches.value.length > 0 
    ? Math.round((automatedMatches.value.length / matches.value.length) * 100)
    : 0
}))

// Methods
const formatTimeAgo = (date: string | Date | undefined): string => {
  if (!date) return 'Unknown'
  const now = new Date()
  const matchDate = new Date(date)
  const diffMs = now.getTime() - matchDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffHours < 1) return 'Just started'
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'Unknown'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatMatchInfo = (match: any): string => {
  const parts = []
  if (match.tournamentLevel) parts.push(match.tournamentLevel.charAt(0).toUpperCase() + match.tournamentLevel.slice(1))
  if (match.roundNumber) parts.push(`Round ${match.roundNumber}`)
  if (match.matchNumber) parts.push(`Match ${match.matchNumber}`)
  return parts.join(' • ')
}

const getCorrectWinner = (match: any) => {
  if (!match || match.status !== 'completed') return null

  const player1Score = match.player1Score || 0
  const player2Score = match.player2Score || 0
  const player1FrameWins = match.player1FrameWins || 0
  const player2FrameWins = match.player2FrameWins || 0
  const totalFrames = player1FrameWins + player2FrameWins

  let correctWinnerId: string
  let correctWinnerName: string

  // Use points as primary determinant
  if (player1Score > 0 || player2Score > 0) {
    if (player1Score > player2Score) {
      correctWinnerId = match.player1Id
      correctWinnerName = match.player1Name
    } else {
      correctWinnerId = match.player2Id || ''
      correctWinnerName = match.player2Name || 'Player 2'
    }
  }
  // Only use frame wins for multi-frame matches without point scores
  else if (totalFrames > 1 && (player1FrameWins > 0 || player2FrameWins > 0)) {
    if (player1FrameWins > player2FrameWins) {
      correctWinnerId = match.player1Id
      correctWinnerName = match.player1Name
    } else {
      correctWinnerId = match.player2Id || ''
      correctWinnerName = match.player2Name || 'Player 2'
    }
  }
  // Fallback to stored winner
  else {
    correctWinnerId = match.winnerId || ''
    correctWinnerName = match.winnerName || ''
  }

  return {
    id: correctWinnerId,
    name: correctWinnerName
  }
}

const getWinningScore = (match: any): string => {
  const winner = getCorrectWinner(match)
  if (!winner) return ''

  const player1Score = match.player1Score || 0
  const player2Score = match.player2Score || 0

  if (winner.id === match.player1Id) {
    return `${player1Score}`
  } else {
    return `${player2Score}`
  }
}

const checkHealth = async () => {
  checkingHealth.value = true
  try {
    algorithmHealth.value = await checkAlgorithmHealth()
  } catch (error) {
    algorithmHealth.value = {
      healthy: false,
      message: 'Health check failed',
      responseTime: 0
    }
  } finally {
    checkingHealth.value = false
  }
}

const getMatchStatusVariant = (status: string) => {
  switch (status) {
    case 'in_progress': return 'destructive'
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'pending': return 'outline'
    default: return 'outline'
  }
}

const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'scheduled': return 'Scheduled'
    case 'pending': return 'Pending'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

const isMatchLive = (matchId: string): boolean => {
  return liveMatches.value.has(matchId)
}

const goLive = async (match: any) => {
  try {
    await liveMatchService.makeMatchLive(match.id, 'current_user', {
      shotClockDuration: 60,
      breakTimeoutDuration: 300,
      enableWarnings: true,
      allowSpectators: true,
      enableCommentary: false,
      autoSaveScores: true,
      notifyFrameEnd: true,
      notifyBreakRecord: true
    })
    
    liveMatches.value.add(match.id)
    success(`${match.player1Name} vs ${match.player2Name} is now live!`)
    
    // Redirect to live match view
    router.push(`/matches/${match.id}/live`)
  } catch (err) {
    showError('Failed to make match live')
  }
}

const loadLiveMatches = async () => {
  // Load currently live matches to update button states
  try {
    const liveMatchIds = await liveMatchService.getLiveMatchIds()
    liveMatches.value = new Set(liveMatchIds)
  } catch (err) {
    console.error('Failed to load live matches:', err)
  }
}

const refreshMatches = async () => {
  try {
    await Promise.all([
      loadAllMatchesFromIndexes(),
      loadLiveMatches()
    ])
  } catch (error) {
    console.error('Error refreshing matches:', error)
  }
}

// Load all matches from all tournaments with names
const loadAllMatchesFromIndexes = async () => {
  try {
    console.log('🔍 Loading ALL matches from ALL indexed locations...')
    allMatchesWithTournaments.value = await getAllMatchesWithTournamentNames()
    console.log(`✅ Loaded ${allMatchesWithTournaments.value.length} matches with tournament names`)
    
    // Show tournament breakdown
    const tournamentBreakdown = new Map<string, number>()
    allMatchesWithTournaments.value.forEach(match => {
      const name = match.tournamentName || 'Unknown'
      tournamentBreakdown.set(name, (tournamentBreakdown.get(name) || 0) + 1)
    })
    
    console.log('📋 Tournament breakdown:')
    tournamentBreakdown.forEach((count, name) => {
      console.log(`  - ${name}: ${count} matches`)
    })
  } catch (error) {
    console.error('Error loading indexed matches:', error)
    showError('Failed to load matches from indexed locations')
  }
}

// Lifecycle
onMounted(async () => {
  console.log('MatchesView mounted, loading matches from all indexed locations...')
  try {
    await Promise.all([
      loadAllMatchesFromIndexes(), // Load from all indexed locations
      checkHealth(),
      loadLiveMatches()
    ])
    console.log('Total matches loaded:', matches.value.length)
    console.log('Matches with tournament names:', allMatchesWithTournaments.value.length)
    console.log('Sample match with tournament:', allMatchesWithTournaments.value[0])
  } catch (error) {
    console.error('Error loading matches:', error)
  }
})
</script>