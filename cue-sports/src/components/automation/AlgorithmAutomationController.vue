<template>
  <div class="algorithm-automation-controller">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Algorithm Automation</h2>
          <p class="text-sm text-gray-600 mt-1">
            Fully automated tournament management using intelligent algorithms
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <div :class="[
            'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
            automationStats.isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          ]">
            <div :class="[
              'w-2 h-2 rounded-full',
              automationStats.isHealthy ? 'bg-green-500' : 'bg-red-500'
            ]"></div>
            {{ automationStats.isHealthy ? 'Algorithm Online' : 'Algorithm Offline' }}
          </div>
          
          <button
            @click="checkHealth"
            :disabled="checking"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {{ checking ? 'Checking...' : 'Check Health' }}
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
            <option value="">Choose tournament for algorithm automation</option>
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

    <!-- Algorithm Configuration -->
    <div v-if="selectedTournamentId && needsInitialization" class="border border-blue-200 bg-blue-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-blue-900 mb-4">
        <span class="inline-flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Algorithm Configuration
        </span>
      </h3>
      
      <p class="text-sm text-blue-700 mb-4">
        Configure the algorithm parameters for fully automated tournament management.
      </p>

      <div class="space-y-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">
              Tournament Level
            </label>
            <select
              v-model="algorithmConfig.level"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              v-model="algorithmConfig.special"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option :value="false">Regular Tournament</option>
              <option :value="true">Special Tournament (Mixed Players)</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">
              Scheduling Preference
            </label>
            <select
              v-model="algorithmConfig.schedulingPreference"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekend">Weekend Schedule</option>
              <option value="full_week">Full Week Schedule</option>
            </select>
          </div>
        </div>

        <div class="border-t border-blue-200 pt-4">
          <h4 class="text-md font-medium text-blue-800 mb-3">Automation Settings</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center">
              <input
                id="auto-progress"
                v-model="algorithmConfig.autoProgressRounds"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="auto-progress" class="ml-2 block text-sm text-blue-700">
                Automatically progress rounds when completed
              </label>
            </div>

            <div class="flex items-center">
              <input
                id="email-updates"
                v-model="algorithmConfig.notificationSettings.emailUpdates"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="email-updates" class="ml-2 block text-sm text-blue-700">
                Email updates on progression
              </label>
            </div>

            <div class="flex items-center">
              <input
                id="push-notifications"
                v-model="algorithmConfig.notificationSettings.pushNotifications"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="push-notifications" class="ml-2 block text-sm text-blue-700">
                Push notifications
              </label>
            </div>

            <div class="flex items-center">
              <input
                id="sms-updates"
                v-model="algorithmConfig.notificationSettings.smsUpdates"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="sms-updates" class="ml-2 block text-sm text-blue-700">
                SMS updates
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-blue-200">
        <div class="text-sm text-blue-600">
          <span class="font-medium">Algorithm Features:</span>
          Intelligent bracket generation, automatic round progression, smart positioning logic
        </div>
        <button
          @click="initializeWithAlgorithm"
          :disabled="isInitializing || !selectedTournamentId"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isInitializing ? 'Initializing...' : 'Initialize with Algorithm' }}
        </button>
      </div>
    </div>

    <!-- Active Automation Panel -->
    <div v-if="selectedTournamentId && !needsInitialization" class="border border-green-200 bg-green-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-green-900 mb-4">
        <span class="inline-flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Algorithm Automation Active
        </span>
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="bg-white rounded-md p-3 border border-green-200">
          <div class="text-sm text-green-600">Active Communities</div>
          <div class="text-lg font-semibold text-green-900">{{ automationStats.monitoredCommunities }}</div>
        </div>
        
        <div class="bg-white rounded-md p-3 border border-green-200">
          <div class="text-sm text-green-600">Matches Generated</div>
          <div class="text-lg font-semibold text-green-900">{{ automationStats.totalMatchesGenerated }}</div>
        </div>
        
        <div class="bg-white rounded-md p-3 border border-green-200">
          <div class="text-sm text-green-600">Success Rate</div>
          <div class="text-lg font-semibold text-green-900">{{ automationStats.successRate }}%</div>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div :class="[
              'w-2 h-2 rounded-full',
              automationStats.isMonitoring ? 'bg-green-500' : 'bg-gray-400'
            ]"></div>
            <span class="text-sm text-green-700">
              {{ automationStats.isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped' }}
            </span>
          </div>
          <div v-if="automationStats.lastProgressionTime" class="text-sm text-green-600">
            Last progression: {{ formatTimeAgo(automationStats.lastProgressionTime) }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="!automationStats.isMonitoring"
            @click="startMonitoring"
            :disabled="isProgressing"
            class="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Start Monitoring
          </button>
          
          <button
            v-if="automationStats.isMonitoring"
            @click="stopMonitoring"
            :disabled="isProgressing"
            class="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Stop Monitoring
          </button>

          <button
            @click="checkProgression"
            :disabled="isProgressing"
            class="px-3 py-1 text-sm border border-green-300 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50"
          >
            {{ isProgressing ? 'Checking...' : 'Check Now' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Community Management -->
    <div v-if="selectedTournamentId && communityList.length > 0" class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Community Management</h3>
      
      <div class="space-y-3">
        <div
          v-for="community in communityList"
          :key="community.id"
          class="flex items-center justify-between p-3 border border-gray-200 rounded-md"
        >
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h4 class="font-medium text-gray-900">{{ community.name }}</h4>
              <span :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                community.status === 'completed' ? 'bg-green-100 text-green-800' :
                community.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              ]">
                {{ community.status }}
              </span>
            </div>
            <div class="text-sm text-gray-600 mt-1">
              {{ community.completedMatches }}/{{ community.totalMatches }} matches completed
              <span v-if="community.currentRound"> • Current: {{ community.currentRound }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="community.canProgress"
              @click="generateCommunityRound(community.id)"
              :disabled="isProgressing"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Next Round
            </button>
            
            <button
              v-if="community.canFinalize"
              @click="finalizeCommunity(community.id)"
              :disabled="isProgressing"
              class="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Finalize
            </button>

            <button
              @click="viewCommunityPositions(community.id)"
              class="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Positions
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Monitoring Configuration -->
    <div v-if="selectedTournamentId" class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-3">Monitoring Configuration</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Check Interval (seconds)
          </label>
          <input
            v-model.number="monitoringSettings.checkInterval"
            type="number"
            min="10"
            max="300"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="updateMonitoringConfig"
          >
        </div>

        <div class="space-y-3">
          <div class="flex items-center">
            <input
              id="auto-progress-config"
              v-model="monitoringSettings.autoProgress"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              @change="updateMonitoringConfig"
            >
            <label for="auto-progress-config" class="ml-2 block text-sm text-gray-700">
              Automatic progression
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="retry-failed"
              v-model="monitoringSettings.retryFailedProgressions"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              @change="updateMonitoringConfig"
            >
            <label for="retry-failed" class="ml-2 block text-sm text-gray-700">
              Retry failed progressions
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAlgorithmAutomation } from '@/composables/useAlgorithmAutomation'
import { useTournaments } from '@/composables/useTournaments'
import { useMatches } from '@/composables/useMatches'
import type { AlgorithmTournamentConfig } from '@/services/algorithmMatchService'

const {
  state: automationState,
  automationStats,
  initializeTournamentAutomation,
  generateNextRound,
  finalizeCommunityTournament,
  startTournamentMonitoring,
  stopTournamentMonitoring,
  checkTournamentProgression,
  checkAlgorithmHealth,
  getTournamentPositions,
  updateMonitoringConfig,
  canProgressToNextRound
} = useAlgorithmAutomation()

const { tournaments, getTournaments } = useTournaments()
const { matches, getMatchesByTournament } = useMatches()

// Component state
const selectedTournamentId = ref('')
const selectedTournament = ref<any>(null)
const checking = ref(false)
const isInitializing = computed(() => automationState.value.isInitializing)
const isProgressing = computed(() => automationState.value.isProgressing)

// Algorithm configuration
const algorithmConfig = ref<AlgorithmTournamentConfig>({
  tournamentId: '',
  level: 'community',
  special: false,
  schedulingPreference: 'weekend',
  autoProgressRounds: true,
  notificationSettings: {
    emailUpdates: true,
    smsUpdates: false,
    pushNotifications: true
  }
})

// Monitoring settings
const monitoringSettings = ref({
  checkInterval: 30,
  autoProgress: true,
  retryFailedProgressions: true
})

// Computed properties
const eligibleTournaments = computed(() => {
  return tournaments.value.filter(tournament => 
    ['registrations_closed', 'in_progress', 'draft'].includes(tournament.status)
  )
})

const needsInitialization = computed(() => {
  if (!selectedTournament.value) return false
  return !selectedTournament.value.algorithmInitialized && 
         selectedTournament.value.status !== 'in_progress'
})

const communityList = computed(() => {
  if (!selectedTournamentId.value) return []
  
  const tournamentMatches = matches.value.filter(match => 
    match.tournamentId === selectedTournamentId.value
  )
  
  let communities = [...new Set(tournamentMatches.map(match => match.communityId).filter(Boolean))]
  
  // If no communities found in matches but tournament is selected, 
  // we'll need to get them from players (handled in loadTournamentData)
  if (communities.length === 0 && selectedTournament.value?.communities) {
    communities = selectedTournament.value.communities
  }
  
  return communities.map(communityId => {
    const communityMatches = tournamentMatches.filter(match => match.communityId === communityId)
    const completedMatches = communityMatches.filter(match => 
      match.status === 'completed' && match.winnerId && match.loserId
    )
    
    const hasFinalMatches = communityMatches.some(match => 
      match.roundNumber.includes('Final') || match.isLevelFinal
    )
    
    const allFinalMatchesCompleted = communityMatches
      .filter(match => match.roundNumber.includes('Final') || match.isLevelFinal)
      .every(match => match.status === 'completed' && match.winnerId && match.loserId)
    
    const canProgress = completedMatches.length === communityMatches.length && 
                       communityMatches.length > 0 && 
                       !hasFinalMatches
    
    const canFinalize = hasFinalMatches && allFinalMatchesCompleted
    
    // Determine current round
    const rounds = [...new Set(communityMatches.map(match => match.roundNumber))]
    const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : 'None'
    
    return {
      id: communityId,
      name: `Community ${communityId}`,
      status: canFinalize ? 'completed' : 
              communityMatches.length > 0 ? 'in_progress' : 'pending',
      totalMatches: communityMatches.length,
      completedMatches: completedMatches.length,
      currentRound,
      canProgress,
      canFinalize
    }
  })
})

// Methods
const handleTournamentChange = () => {
  selectedTournament.value = tournaments.value.find(t => t.id === selectedTournamentId.value)
  algorithmConfig.value.tournamentId = selectedTournamentId.value
  
  if (selectedTournamentId.value) {
    loadTournamentData()
  }
}

const loadTournamentData = async () => {
  if (!selectedTournamentId.value) return
  
  try {
    await getMatchesByTournament(selectedTournamentId.value)
    
    // If no matches exist yet, get community information from players
    const tournamentMatches = matches.value.filter(match => 
      match.tournamentId === selectedTournamentId.value
    )
    
    if (tournamentMatches.length === 0 && selectedTournament.value) {
      // Get communities from tournament players
      const communities = await algorithmMatchService.getCommunitiesFromTournament(selectedTournamentId.value)
      selectedTournament.value.communities = communities
      console.log('🏘️ Loaded communities from players:', communities)
    }
  } catch (error) {
    console.error('Error loading tournament data:', error)
  }
}

const checkHealth = async () => {
  checking.value = true
  try {
    await checkAlgorithmHealth()
  } finally {
    checking.value = false
  }
}

const initializeWithAlgorithm = async () => {
  if (!selectedTournamentId.value) return
  
  try {
    const result = await initializeTournamentAutomation(algorithmConfig.value)
    
    if (result.success) {
      await loadTournamentData()
      selectedTournament.value.algorithmInitialized = true
    }
  } catch (error) {
    console.error('Algorithm initialization failed:', error)
  }
}

const startMonitoring = async () => {
  if (!selectedTournamentId.value) return
  await startTournamentMonitoring(selectedTournamentId.value)
}

const stopMonitoring = async () => {
  if (!selectedTournamentId.value) return
  await stopTournamentMonitoring(selectedTournamentId.value)
}

const checkProgression = async () => {
  if (!selectedTournamentId.value) return
  await checkTournamentProgression(selectedTournamentId.value)
}

const generateCommunityRound = async (communityId: string) => {
  if (!selectedTournamentId.value) return
  
  try {
    const result = await generateNextRound(selectedTournamentId.value, communityId)
    if (result.success) {
      await loadTournamentData()
    }
  } catch (error) {
    console.error('Community round generation failed:', error)
  }
}

const finalizeCommunity = async (communityId: string) => {
  if (!selectedTournamentId.value) return
  
  try {
    const result = await finalizeCommunityTournament(selectedTournamentId.value, communityId)
    if (result.success) {
      await loadTournamentData()
    }
  } catch (error) {
    console.error('Community finalization failed:', error)
  }
}

const viewCommunityPositions = async (communityId: string) => {
  if (!selectedTournamentId.value) return
  
  try {
    const result = await getTournamentPositions(selectedTournamentId.value, 'community')
    console.log('Community positions:', result)
    // TODO: Show positions in a modal or dialog
  } catch (error) {
    console.error('Error getting positions:', error)
  }
}

const updateMonitoringConfigHandler = () => {
  updateMonitoringConfig({
    checkInterval: monitoringSettings.value.checkInterval * 1000, // Convert to milliseconds
    autoProgress: monitoringSettings.value.autoProgress,
    retryFailedProgressions: monitoringSettings.value.retryFailedProgressions,
    notifyOnCompletion: true,
    maxRetries: 3
  })
}

const getTournamentStatusColor = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'registrations_closed':
      return 'bg-yellow-100 text-yellow-800'
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// Lifecycle
onMounted(async () => {
  await getTournaments()
  await checkHealth()
})

// Watch for tournament selection changes
watch(selectedTournamentId, (newId) => {
  if (newId) {
    handleTournamentChange()
  }
})
</script>

<style scoped>
.algorithm-automation-controller {
  @apply space-y-6;
}
</style>