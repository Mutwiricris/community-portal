<template>
  <div class="automation-controller">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Tournament Automation</h2>
          <p class="text-sm text-gray-600 mt-1">
            Manage automated tournament progression and match generation
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <div :class="[
            'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
            algorithmHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          ]">
            <div :class="[
              'w-2 h-2 rounded-full',
              algorithmHealthy ? 'bg-green-500' : 'bg-red-500'
            ]"></div>
            {{ algorithmHealthy ? 'Algorithm Online' : 'Algorithm Offline' }}
          </div>
          
          <button
            @click="checkAlgorithmHealth"
            :disabled="checking"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {{ checking ? 'Checking...' : 'Check Status' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tournament Selection -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-3">Tournament Selection</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select Tournament *
          </label>
          <select
            v-model="selectedTournamentId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="handleTournamentChange"
          >
            <option value="">Choose tournament to automate</option>
            <option
              v-for="tournament in eligibleTournaments"
              :key="tournament.id"
              :value="tournament.id"
            >
              {{ tournament.name }} ({{ tournament.hierarchicalLevel }})
            </option>
          </select>
        </div>

        <div v-if="selectedTournamentId">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Tournament Status
          </label>
          <div class="flex items-center gap-2">
            <span :class="[
              'px-2 py-1 text-xs font-medium rounded-full',
              getTournamentStatusColor(selectedTournament?.status)
            ]">
              {{ selectedTournament?.status || 'Unknown' }}
            </span>
            <span class="text-sm text-gray-600">
              {{ selectedTournament?.currentRegistrations || 0 }} registered players
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tournament Initialization -->
    <div v-if="selectedTournamentId && needsInitialization" class="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-blue-900 mb-4">
        <span class="inline-flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tournament Initialization Required
        </span>
      </h3>
      
      <p class="text-sm text-blue-700 mb-4">
        This tournament needs to be initialized with the algorithm to generate initial matches and bracket structure.
      </p>

      <div class="space-y-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">
              Tournament Level
            </label>
            <select
              v-model="initializationConfig.level"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="community">Community Level</option>
              <option value="county">County Level</option>
              <option value="regional">Regional Level</option>
              <option value="national">National Level</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">
              Tournament Type
            </label>
            <select
              v-model="initializationConfig.special"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option :value="false">Regular Tournament (Level-based)</option>
              <option :value="true">Special Tournament (Mixed players)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">
              Scheduling Preference
            </label>
            <select
              v-model="initializationConfig.schedulingPreference"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="weekend">Weekend Only (Fri-Sun)</option>
              <option value="full_week">Full Week (Mon-Sun)</option>
            </select>
          </div>
        </div>

        <div v-if="initializationConfig.special" class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p class="text-sm text-yellow-700">
            <strong>Special Tournament:</strong> Players from all communities will be mixed together regardless of geographical boundaries. 
            This creates a single elimination tournament to determine top 3 positions.
          </p>
        </div>

        <div v-else class="p-3 bg-green-50 border border-green-200 rounded-md">
          <p class="text-sm text-green-700">
            <strong>{{ initializationConfig.level.charAt(0).toUpperCase() + initializationConfig.level.slice(1) }} Level Tournament:</strong> 
            Tournament will follow hierarchical structure with proper geographical/organizational boundaries maintained.
          </p>
        </div>
      </div>

      <div class="flex justify-between items-center">
        <div class="text-sm text-blue-600">
          {{ selectedTournament?.currentRegistrations || 0 }} players will be processed by the algorithm
        </div>
        
        <button
          @click="initializeTournament"
          :disabled="!canInitialize || initializing"
          class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="initializing" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ initializing ? 'Initializing...' : 'Initialize Tournament' }}
        </button>
      </div>
    </div>

    <!-- Automation Status -->
    <div v-if="progressionStatus" class="mb-6">
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Automation Status</h3>
          
          <div class="flex items-center gap-2">
            <div :class="[
              'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
              progressionStatus.isProgressing ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            ]">
              <div :class="[
                'w-2 h-2 rounded-full',
                progressionStatus.isProgressing ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'
              ]"></div>
              {{ progressionStatus.isProgressing ? 'Processing' : 'Idle' }}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">
              {{ progressionStatus.currentLevel }}
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">
              Current Level
            </div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-900">
              {{ progressionStatus.currentRound }}
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">
              Current Round
            </div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">
              {{ progressionStatus.completedMatches }}/{{ progressionStatus.totalMatches }}
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">
              Matches Completed
            </div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">
              {{ progressionStatus.pendingMatches }}
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">
              Pending Matches
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            :style="{ width: `${getProgressPercentage()}%` }"
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          ></div>
        </div>

        <!-- Last Activity -->
        <div v-if="progressionStatus.lastProgressionAt" class="text-sm text-gray-600">
          Last progression: {{ formatDateTime(progressionStatus.lastProgressionAt) }}
        </div>
      </div>
    </div>

    <!-- Automation Controls -->
    <div v-if="selectedTournamentId" class="space-y-6">
      <!-- Start Automation -->
      <div v-if="!isAutomationActive" class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Start Automation</h3>
        
        <div class="space-y-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Scheduling Preference
              </label>
              <select
                v-model="automationConfig.schedulingPreference"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekend">Weekend Only</option>
                <option value="full_week">Full Week</option>
              </select>
            </div>

            <div class="space-y-3">
              <div class="flex items-center">
                <input
                  id="autoAdvance"
                  v-model="automationConfig.autoAdvanceRounds"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="autoAdvance" class="ml-2 text-sm text-gray-700">
                  Auto-advance rounds when complete
                </label>
              </div>
              
              <div class="flex items-center">
                <input
                  id="requireApproval"
                  v-model="automationConfig.requireManualApproval"
                  type="checkbox"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label for="requireApproval" class="ml-2 text-sm text-gray-700">
                  Require manual approval for progression
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            @click="startAutomation"
            :disabled="!canStartAutomation || starting"
            class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ starting ? 'Starting...' : 'Start Automation' }}
          </button>
        </div>
      </div>

      <!-- Active Automation Controls -->
      <div v-else class="space-y-4">
        <!-- Quick Actions -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <!-- General Controls -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">General Controls</h4>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="checkProgression"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  Check Progression
                </button>
                
                <button
                  @click="pauseAutomation"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
                >
                  Pause
                </button>
                
                <button
                  @click="stopAutomation"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                  Stop
                </button>
              </div>
            </div>

            <!-- Algorithm Controls -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-3">Algorithm Controls</h4>
              <div class="flex flex-wrap gap-2">
                <button
                  @click="generateNextRound"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  Next Round
                </button>
                
                <button
                  @click="finalizeTournament"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
                >
                  Finalize
                </button>
                
                <button
                  @click="getTournamentPositions"
                  :disabled="loading"
                  class="px-3 py-1 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                >
                  Get Positions
                </button>
              </div>
            </div>
          </div>

          <!-- Level-specific Controls -->
          <div v-if="progressionStatus?.currentLevel === 'community'" class="border-t pt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Community Level Controls</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Community ID</label>
                <select
                  v-model="selectedCommunityId"
                  class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select community for specific actions</option>
                  <option
                    v-for="community in availableCommunities"
                    :key="community.id"
                    :value="community.id"
                  >
                    {{ community.name }} ({{ community.playerCount }} players)
                  </option>
                </select>
              </div>
              
              <div class="flex items-end gap-2">
                <button
                  @click="generateCommunityRound"
                  :disabled="loading || !selectedCommunityId"
                  class="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  Community Round
                </button>
                
                <button
                  @click="finalizeCommunityWinners"
                  :disabled="loading || !selectedCommunityId"
                  class="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  Finalize Community
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Round Matches -->
        <div v-if="currentRoundMatches.length > 0" class="border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Current Round Matches ({{ progressionStatus.currentRound }})
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="match in currentRoundMatches"
              :key="match.id"
              class="flex items-center justify-between p-3 border border-gray-100 rounded-md"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-gray-900">
                  Match #{{ match.matchNumber }}
                </span>
                <span :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getMatchStatusColor(match.status)
                ]">
                  {{ getMatchStatusLabel(match.status) }}
                </span>
              </div>
              
              <div class="text-sm text-gray-600">
                {{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}
              </div>
              
              <div class="flex gap-2">
                <button
                  v-if="match.status === 'pending'"
                  @click="startMatch(match)"
                  class="text-xs text-blue-600 hover:text-blue-800"
                >
                  Start
                </button>
                <button
                  @click="viewMatch(match)"
                  class="text-xs text-gray-600 hover:text-gray-800"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Match Automation Controls -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Match Automation</h3>
          
          <div class="space-y-4">
            <!-- Auto-advance toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">Auto-advance Rounds</label>
                <p class="text-xs text-gray-500">Automatically advance rounds when all matches are completed</p>
              </div>
              <input
                v-model="autoAdvanceEnabled"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <!-- Match monitoring toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-700">Match Monitoring</label>
                <p class="text-xs text-gray-500">Monitor matches for completion and trigger automation</p>
              </div>
              <div class="flex items-center gap-2">
                <span :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  matchMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                ]">
                  {{ matchMonitoring ? 'Active' : 'Inactive' }}
                </span>
                <button
                  @click="toggleMatchMonitoring"
                  :disabled="!selectedTournamentId || !user"
                  class="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {{ matchMonitoring ? 'Stop' : 'Start' }}
                </button>
              </div>
            </div>

            <!-- Manual controls -->
            <div class="border-t pt-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  @click="manualAdvancement"
                  :disabled="loading || !selectedTournamentId"
                  class="px-3 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                >
                  Manual Advance
                </button>
                
                <button
                  @click="forceFinalization"
                  :disabled="loading || !selectedTournamentId || !selectedCommunityId"
                  class="px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                  Force Finalize
                </button>
                
                <button
                  @click="refreshAutomationStatus"
                  :disabled="loading"
                  class="px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Errors and Warnings -->
    <div v-if="progressionStatus && (progressionStatus.errors.length > 0 || progressionStatus.warnings.length > 0)" class="space-y-4">
      <!-- Errors -->
      <div v-if="progressionStatus.errors.length > 0" class="border border-red-200 bg-red-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-red-800 mb-3">Automation Errors</h4>
        <div class="space-y-2">
          <div
            v-for="error in progressionStatus.errors"
            :key="`${error.code}-${error.timestamp}`"
            class="flex items-start justify-between"
          >
            <div class="flex-1">
              <p class="text-sm text-red-700">{{ error.message }}</p>
              <p class="text-xs text-red-600">
                {{ error.level }} - {{ error.round }} - {{ formatDateTime(error.timestamp) }}
              </p>
            </div>
            <button
              v-if="!error.resolved"
              @click="resolveError(error)"
              class="text-xs text-red-600 hover:text-red-800 ml-2"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="progressionStatus.warnings.length > 0" class="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-yellow-800 mb-3">Automation Warnings</h4>
        <div class="space-y-1">
          <p
            v-for="warning in progressionStatus.warnings"
            :key="warning"
            class="text-sm text-yellow-700"
          >
            {{ warning }}
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Events -->
    <div v-if="recentEvents.length > 0" class="border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Events</h3>
      
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="event in recentEvents"
          :key="`${event.type}-${event.timestamp}`"
          class="flex items-center gap-3 p-2 border-l-4 border-gray-300"
        >
          <div :class="[
            'w-3 h-3 rounded-full',
            getEventColor(event.type)
          ]"></div>
          
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-900">
              {{ getEventTitle(event) }}
            </p>
            <p class="text-xs text-gray-600">
              {{ formatDateTime(event.timestamp) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { useTournaments } from '@/composables/useTournaments'
import { useAuth } from '@/composables/useAuth'
import { useMatchAutomation } from '@/composables/useMatchAutomation'
import { 
  tournamentProgressionService, 
  type ProgressionConfig, 
  type ProgressionStatus,
  type ProgressionEvent,
  type ProgressionError
} from '@/services/tournamentProgressionService'
import { algorithmService } from '@/services/algorithmService'
import type { Match } from '@/types/match'
import type { Tournament } from '@/types/tournament'

// Composables
const { 
  matches, 
  getMatchesByTournament, 
  getMatchesByRound,
  startMatch: startMatchService
} = useMatches()
const { tournaments } = useTournaments()
const { user } = useAuth()
const {
  isMonitoring: matchMonitoring,
  autoAdvanceEnabled,
  startMonitoring: startMatchMonitoring,
  stopMonitoring: stopMatchMonitoring,
  triggerManualAdvancement,
  forceFinalizeCommunity,
  getAutomationStatus: getMatchAutomationStatus
} = useMatchAutomation()

// Local state
const selectedTournamentId = ref('')
const selectedTournament = ref<Tournament | null>(null)
const progressionStatus = ref<ProgressionStatus | null>(null)
const currentRoundMatches = ref<Match[]>([])
const recentEvents = ref<ProgressionEvent[]>([])
const loading = ref(false)
const starting = ref(false)
const checking = ref(false)
const algorithmHealthy = ref(true)
const initializing = ref(false)
const tournamentInitialized = ref(false)
const selectedCommunityId = ref('')
const availableCommunities = ref<{ id: string; name: string; playerCount: number }[]>([])

// Automation configuration
const automationConfig = ref<Omit<ProgressionConfig, 'tournamentId'>>({
  enableAutomation: true,
  schedulingPreference: 'weekend',
  autoAdvanceRounds: true,
  requireManualApproval: false,
  venueSettings: {
    autoAssignTables: true
  },
  notificationSettings: {
    enableRoundNotifications: true,
    enableMatchNotifications: true,
    adminEmails: []
  }
})

// Initialization configuration
const initializationConfig = ref({
  level: 'community' as 'community' | 'county' | 'regional' | 'national',
  special: false,
  schedulingPreference: 'weekend' as 'weekend' | 'full_week'
})

// Computed
const eligibleTournaments = computed(() =>
  tournaments.value.filter(t => ['registration_open', 'ongoing'].includes(t.status))
)

const isAutomationActive = computed(() => {
  return progressionStatus.value !== null
})

const canStartAutomation = computed(() => {
  return selectedTournamentId.value && 
         algorithmHealthy.value && 
         selectedTournament.value?.status === 'ongoing'
})

const canAdvanceRound = computed(() => {
  return progressionStatus.value && 
         !progressionStatus.value.isProgressing &&
         progressionStatus.value.pendingMatches === 0
})

const canAdvanceLevel = computed(() => {
  return canAdvanceRound.value && 
         progressionStatus.value?.currentRound.includes('_F')
})

const needsInitialization = computed(() => {
  return selectedTournamentId.value && 
         selectedTournament.value?.status === 'registration_open' &&
         !tournamentInitialized.value
})

const canInitialize = computed(() => {
  return selectedTournamentId.value && 
         algorithmHealthy.value && 
         (selectedTournament.value?.currentRegistrations || 0) > 0
})

// Methods
const handleTournamentChange = async () => {
  if (selectedTournamentId.value) {
    selectedTournament.value = tournaments.value.find(t => t.id === selectedTournamentId.value) || null
    await loadTournamentData()
    
    // Check if tournament has matches (indicating it's been initialized)
    if (matches.value.length > 0) {
      tournamentInitialized.value = true
    }
  } else {
    selectedTournament.value = null
    progressionStatus.value = null
    currentRoundMatches.value = []
    tournamentInitialized.value = false
  }
}

const loadTournamentData = async () => {
  if (!selectedTournamentId.value) return

  loading.value = true
  try {
    // Load tournament matches
    await getMatchesByTournament(selectedTournamentId.value)
    
    // Get progression status if exists
    progressionStatus.value = tournamentProgressionService.getProgressionStatus(selectedTournamentId.value)
    
    if (progressionStatus.value) {
      // Load current round matches
      await loadCurrentRoundMatches()
    }
  } catch (error) {
    console.error('Error loading tournament data:', error)
  } finally {
    loading.value = false
  }
}

const loadCurrentRoundMatches = async () => {
  if (!selectedTournamentId.value || !progressionStatus.value) return

  try {
    currentRoundMatches.value = await getMatchesByRound(
      selectedTournamentId.value, 
      progressionStatus.value.currentRound
    )
  } catch (error) {
    console.error('Error loading current round matches:', error)
  }
}

const checkAlgorithmHealth = async () => {
  checking.value = true
  try {
    const health = await algorithmService.checkServiceHealth()
    algorithmHealthy.value = health.healthy
  } catch (error) {
    algorithmHealthy.value = false
  } finally {
    checking.value = false
  }
}

const initializeTournament = async () => {
  if (!selectedTournamentId.value || !user.value) return

  initializing.value = true
  try {
    console.log('🚀 Initializing tournament with algorithm...', {
      tournamentId: selectedTournamentId.value,
      config: initializationConfig.value
    })

    const result = await algorithmService.initializeTournament({
      tournamentId: selectedTournamentId.value,
      level: initializationConfig.value.level,
      special: initializationConfig.value.special,
      schedulingPreference: initializationConfig.value.schedulingPreference
    })

    console.log('🤖 Algorithm initialization result:', result)

    if (result.success) {
      tournamentInitialized.value = true
      
      // Update tournament status to ongoing if initialization was successful
      if (selectedTournament.value) {
        selectedTournament.value.status = 'ongoing'
      }

      await loadTournamentData()
      alert(`Tournament initialized successfully!\n\nMatches generated: ${result.matches?.length || 0}\nBrackets created: Yes\nReady for automation!`)
    } else {
      alert(`Failed to initialize tournament: ${result.error || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Error initializing tournament:', error)
    alert('Failed to initialize tournament: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    initializing.value = false
  }
}

const startAutomation = async () => {
  if (!selectedTournamentId.value || !user.value) return

  starting.value = true
  try {
    const config: ProgressionConfig = {
      ...automationConfig.value,
      tournamentId: selectedTournamentId.value
    }

    const result = await tournamentProgressionService.initializeProgression(
      selectedTournamentId.value,
      config,
      user.value.uid
    )

    if (result.success) {
      await loadTournamentData()
    } else {
      alert(`Failed to start automation: ${result.message}`)
    }
  } catch (error) {
    console.error('Error starting automation:', error)
    alert('Failed to start automation')
  } finally {
    starting.value = false
  }
}

const checkProgression = async () => {
  if (!selectedTournamentId.value || !user.value) return

  loading.value = true
  try {
    await tournamentProgressionService.checkAndProgressRound(
      selectedTournamentId.value,
      user.value.uid
    )
    await loadTournamentData()
  } catch (error) {
    console.error('Error checking progression:', error)
  } finally {
    loading.value = false
  }
}

const advanceRound = async () => {
  if (!selectedTournamentId.value || !user.value) return

  if (!confirm('Are you sure you want to advance to the next round?')) return

  loading.value = true
  try {
    await tournamentProgressionService.advanceToNextRound(
      selectedTournamentId.value,
      user.value.uid
    )
    await loadTournamentData()
  } catch (error) {
    console.error('Error advancing round:', error)
  } finally {
    loading.value = false
  }
}

const advanceLevel = async () => {
  if (!selectedTournamentId.value || !user.value) return

  if (!confirm('Are you sure you want to advance to the next tournament level?')) return

  loading.value = true
  try {
    await tournamentProgressionService.advanceToNextLevel(
      selectedTournamentId.value,
      user.value.uid
    )
    await loadTournamentData()
  } catch (error) {
    console.error('Error advancing level:', error)
  } finally {
    loading.value = false
  }
}

const pauseAutomation = () => {
  if (!selectedTournamentId.value) return

  tournamentProgressionService.stopProgression(selectedTournamentId.value)
  
  if (progressionStatus.value) {
    progressionStatus.value.isProgressing = false
  }
}

const stopAutomation = () => {
  if (!selectedTournamentId.value) return

  if (!confirm('Are you sure you want to stop automation? This will remove all automation settings.')) return

  tournamentProgressionService.stopProgression(selectedTournamentId.value)
  progressionStatus.value = null
  currentRoundMatches.value = []
  recentEvents.value = []
}

const generateNextRound = async () => {
  if (!selectedTournamentId.value || !progressionStatus.value) return

  loading.value = true
  try {
    const level = progressionStatus.value.currentLevel as 'community' | 'county' | 'regional' | 'national'
    
    console.log(`🔄 Generating next round for ${level} level...`)
    
    const result = await algorithmService.generateCommunityRound({
      tournamentId: selectedTournamentId.value,
      level,
      currentRound: progressionStatus.value.currentRound
    })

    console.log('🤖 Next round result:', result)

    if (result.success) {
      await loadTournamentData()
      alert(`Next round generated successfully!\n\nRound: ${result.roundNumber}\nMatches: ${result.matches.length}`)
    } else {
      alert(`Failed to generate next round: ${result.error}`)
    }
  } catch (error) {
    console.error('Error generating next round:', error)
    alert('Failed to generate next round')
  } finally {
    loading.value = false
  }
}

const generateCommunityRound = async () => {
  if (!selectedTournamentId.value || !selectedCommunityId.value) return

  loading.value = true
  try {
    console.log(`🏘️ Generating community round for ${selectedCommunityId.value}...`)
    
    const result = await algorithmService.generateCommunityRound({
      tournamentId: selectedTournamentId.value,
      level: 'community',
      communityId: selectedCommunityId.value
    })

    console.log('🤖 Community round result:', result)

    if (result.success) {
      await loadTournamentData()
      alert(`Community round generated successfully!\n\nCommunity: ${selectedCommunityId.value}\nRound: ${result.roundNumber}\nMatches: ${result.matches.length}`)
    } else {
      alert(`Failed to generate community round: ${result.error}`)
    }
  } catch (error) {
    console.error('Error generating community round:', error)
    alert('Failed to generate community round')
  } finally {
    loading.value = false
  }
}

const finalizeCommunityWinners = async () => {
  if (!selectedTournamentId.value || !selectedCommunityId.value) return

  loading.value = true
  try {
    console.log(`🏆 Finalizing community winners for ${selectedCommunityId.value}...`)
    
    const result = await algorithmService.finalizeCommunityWinners(selectedTournamentId.value)

    console.log('🤖 Community finalize result:', result)

    if (result.success) {
      await loadTournamentData()
      alert(`Community finalized successfully!\n\nCommunity: ${selectedCommunityId.value}\nFinal positions determined`)
    } else {
      alert(`Failed to finalize community: ${result.error}`)
    }
  } catch (error) {
    console.error('Error finalizing community:', error)
    alert('Failed to finalize community')
  } finally {
    loading.value = false
  }
}

const finalizeTournament = async () => {
  if (!selectedTournamentId.value || !progressionStatus.value) return

  if (!confirm('Are you sure you want to finalize the tournament? This will determine final positions.')) return

  loading.value = true
  try {
    const level = progressionStatus.value.currentLevel
    console.log(`🏆 Finalizing tournament at ${level} level...`)
    
    const result = await algorithmService.finalizeTournamentPositions(selectedTournamentId.value, level)

    console.log('🤖 Tournament finalize result:', result)

    if (result.success) {
      await loadTournamentData()
      
      const positionsList = Object.entries(result.positions)
        .map(([pos, player]: [string, any]) => `Position ${pos}: ${player?.name || 'N/A'}`)
        .join('\n')
      
      alert(`Tournament finalized successfully!\n\nLevel: ${result.level}\n\nFinal Positions:\n${positionsList}`)
    } else {
      alert(`Failed to finalize tournament: ${result.error}`)
    }
  } catch (error) {
    console.error('Error finalizing tournament:', error)
    alert('Failed to finalize tournament')
  } finally {
    loading.value = false
  }
}

const getTournamentPositions = async () => {
  if (!selectedTournamentId.value || !progressionStatus.value) return

  loading.value = true
  try {
    const level = progressionStatus.value.currentLevel
    console.log(`📊 Getting tournament positions for ${level} level...`)
    
    const result = await algorithmService.getTournamentPositions(selectedTournamentId.value, level)

    console.log('🤖 Tournament positions result:', result)

    if (result.success) {
      const positionsList = Object.entries(result.positions)
        .map(([pos, player]: [string, any]) => `Position ${pos}: ${player?.name || 'N/A'}`)
        .join('\n')
      
      alert(`Tournament Positions (${result.level} level):\n\n${positionsList}\n\nCompleted: ${result.completed ? 'Yes' : 'No'}`)
    } else {
      alert(`Failed to get tournament positions: ${result.error}`)
    }
  } catch (error) {
    console.error('Error getting tournament positions:', error)
    alert('Failed to get tournament positions')
  } finally {
    loading.value = false
  }
}

const toggleMatchMonitoring = () => {
  if (!selectedTournamentId.value || !user.value) return

  if (matchMonitoring.value) {
    stopMatchMonitoring(selectedTournamentId.value)
  } else {
    startMatchMonitoring(selectedTournamentId.value, user.value.uid)
  }
}

const manualAdvancement = async () => {
  if (!selectedTournamentId.value || !user.value) return

  loading.value = true
  try {
    // Get completed matches from current round
    const completedMatches = currentRoundMatches.value.filter(match => 
      match.status === 'completed' && match.winnerId && match.loserId
    )
    
    if (completedMatches.length === 0) {
      alert('No completed matches found to advance')
      return
    }

    const result = await triggerManualAdvancement(
      selectedTournamentId.value,
      completedMatches.map(m => m.id),
      user.value.uid
    )

    if (!result) {
      alert('Manual advancement did not trigger any progression')
    }
  } catch (error) {
    console.error('Error in manual advancement:', error)
    alert('Manual advancement failed')
  } finally {
    loading.value = false
  }
}

const forceFinalization = async () => {
  if (!selectedTournamentId.value || !selectedCommunityId.value || !user.value) return

  if (!confirm(`Are you sure you want to force finalize community ${selectedCommunityId.value}?`)) return

  loading.value = true
  try {
    const result = await forceFinalizeCommunity(
      selectedTournamentId.value,
      selectedCommunityId.value,
      user.value.uid
    )

    if (result) {
      await loadTournamentData()
    }
  } catch (error) {
    console.error('Error in force finalization:', error)
    alert('Force finalization failed')
  } finally {
    loading.value = false
  }
}

const refreshAutomationStatus = async () => {
  if (!selectedTournamentId.value) return

  loading.value = true
  try {
    await loadTournamentData()
    
    const matchStatus = getMatchAutomationStatus(selectedTournamentId.value)
    console.log('Match automation status:', matchStatus)
    
    alert(`Automation Status:\n\nMatch Monitoring: ${matchStatus.isMonitored ? 'Active' : 'Inactive'}\nAuto-advance: ${matchStatus.autoAdvanceEnabled ? 'Enabled' : 'Disabled'}\nQueued Matches: ${matchStatus.queuedMatches}`)
  } catch (error) {
    console.error('Error refreshing status:', error)
    alert('Failed to refresh automation status')
  } finally {
    loading.value = false
  }
}

const startMatch = async (match: Match) => {
  if (!user.value) return

  try {
    await startMatchService(match.id, user.value.uid)
    await loadCurrentRoundMatches()
  } catch (error) {
    console.error('Error starting match:', error)
  }
}

const viewMatch = (match: Match) => {
  // Navigate to match details
  // This would typically use router.push
  console.log('View match:', match.id)
}

const resolveError = (error: ProgressionError) => {
  error.resolved = true
  // In a real implementation, this would update the backend
}

// Event handling
const handleProgressionEvent = (event: ProgressionEvent) => {
  if (event.tournamentId === selectedTournamentId.value) {
    recentEvents.value.unshift(event)
    
    // Keep only last 20 events
    if (recentEvents.value.length > 20) {
      recentEvents.value = recentEvents.value.slice(0, 20)
    }

    // Refresh data on significant events
    if (['round_started', 'round_completed', 'level_completed'].includes(event.type)) {
      loadTournamentData()
    }
  }
}

// Helper methods
const getTournamentStatusColor = (status: string | undefined): string => {
  const colors = {
    'upcoming': 'bg-gray-100 text-gray-800',
    'registration_open': 'bg-blue-100 text-blue-800',
    'registration_closed': 'bg-yellow-100 text-yellow-800',
    'ongoing': 'bg-green-100 text-green-800',
    'completed': 'bg-purple-100 text-purple-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return colors[status || 'upcoming'] || 'bg-gray-100 text-gray-800'
}

const getMatchStatusColor = (status: string): string => {
  const colors = {
    'pending': 'bg-gray-100 text-gray-800',
    'scheduled': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getMatchStatusLabel = (status: string): string => {
  const labels = {
    'pending': 'Pending',
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return labels[status] || status
}

const getProgressPercentage = (): number => {
  if (!progressionStatus.value || progressionStatus.value.totalMatches === 0) return 0
  return Math.round((progressionStatus.value.completedMatches / progressionStatus.value.totalMatches) * 100)
}

const getEventColor = (eventType: string): string => {
  const colors = {
    'round_started': 'bg-blue-500',
    'round_completed': 'bg-green-500',
    'level_completed': 'bg-purple-500',
    'tournament_completed': 'bg-yellow-500',
    'error': 'bg-red-500',
    'match_created': 'bg-gray-500'
  }
  return colors[eventType] || 'bg-gray-500'
}

const getEventTitle = (event: ProgressionEvent): string => {
  const titles = {
    'round_started': `Round ${event.round} started`,
    'round_completed': `Round ${event.round} completed`,
    'level_completed': `${event.level} level completed`,
    'tournament_completed': 'Tournament completed',
    'error': `Error in ${event.level} ${event.round}`,
    'match_created': `Match created in ${event.round}`
  }
  return titles[event.type] || event.type
}

const formatDateTime = (date: Date | string): string => {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  checkAlgorithmHealth()
  tournamentProgressionService.addEventListener(handleProgressionEvent)
})

onUnmounted(() => {
  tournamentProgressionService.removeEventListener(handleProgressionEvent)
})
</script>

<style scoped>
.automation-controller {
  @apply max-w-6xl mx-auto space-y-6;
}
</style>