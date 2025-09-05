<template>
  <div class="algorithm-monitoring-panel">
    <!-- Algorithm Health Status -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Algorithm Service Status</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-50 rounded-md p-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-600">Service Health</div>
              <div class="text-lg font-semibold">
                <span :class="[
                  'px-2 py-1 text-xs font-medium rounded-full',
                  algorithmHealth.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]">
                  {{ algorithmHealth.healthy ? 'Healthy' : 'Unhealthy' }}
                </span>
              </div>
            </div>
            <div :class="[
              'w-3 h-3 rounded-full',
              algorithmHealth.healthy ? 'bg-green-500' : 'bg-red-500'
            ]"></div>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Last check: {{ formatTime(automationStats.lastHealthCheck) }}
          </div>
        </div>

        <div class="bg-gray-50 rounded-md p-3">
          <div class="text-sm text-gray-600">Response Time</div>
          <div class="text-lg font-semibold text-gray-900">{{ algorithmHealth.responseTime }}ms</div>
          <div class="text-xs text-gray-500 mt-1">
            <span :class="[
              algorithmHealth.responseTime > 3000 ? 'text-red-500' : 
              algorithmHealth.responseTime > 1000 ? 'text-yellow-500' : 'text-green-500'
            ]">
              {{ algorithmHealth.responseTime > 3000 ? 'Slow' : 
                 algorithmHealth.responseTime > 1000 ? 'Moderate' : 'Fast' }}
            </span>
          </div>
        </div>

        <div class="bg-gray-50 rounded-md p-3">
          <div class="text-sm text-gray-600">Active Tournaments</div>
          <div class="text-lg font-semibold text-gray-900">{{ automationStats.activeTournaments }}</div>
          <div class="text-xs text-gray-500 mt-1">
            {{ automationStats.monitoredCommunities }} communities
          </div>
        </div>

        <div class="bg-gray-50 rounded-md p-3">
          <div class="text-sm text-gray-600">Success Rate</div>
          <div class="text-lg font-semibold text-gray-900">{{ automationStats.successRate }}%</div>
          <div class="text-xs text-gray-500 mt-1">
            {{ automationStats.successfulProgressions }}/{{ automationStats.successfulProgressions + automationStats.failedProgressions }} operations
          </div>
        </div>
      </div>
    </div>

    <!-- Real-time Monitoring -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">Real-time Monitoring</h3>
        <div class="flex items-center gap-2">
          <div :class="[
            'w-2 h-2 rounded-full',
            automationStats.isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          ]"></div>
          <span class="text-sm text-gray-600">
            {{ automationStats.isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive' }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Statistics</h4>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Matches Generated:</span>
              <span class="font-medium">{{ automationStats.totalMatchesGenerated }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Successful Progressions:</span>
              <span class="font-medium text-green-600">{{ automationStats.successfulProgressions }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Failed Progressions:</span>
              <span class="font-medium text-red-600">{{ automationStats.failedProgressions }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Last Progression:</span>
              <span class="font-medium">{{ formatTime(automationStats.lastProgressionTime) }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Monitoring Settings</h4>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Check Interval:</span>
              <span class="font-medium">{{ Math.floor(monitoringConfig.checkInterval / 1000) }}s</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Auto Progress:</span>
              <span :class="[
                'font-medium',
                monitoringConfig.autoProgress ? 'text-green-600' : 'text-gray-600'
              ]">
                {{ monitoringConfig.autoProgress ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Retry Failed:</span>
              <span :class="[
                'font-medium',
                monitoringConfig.retryFailedProgressions ? 'text-green-600' : 'text-gray-600'
              ]">
                {{ monitoringConfig.retryFailedProgressions ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Performance</h4>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Avg Response Time:</span>
              <span class="font-medium">{{ algorithmHealth.responseTime }}ms</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Uptime:</span>
              <span class="font-medium text-green-600">99.8%</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Error Rate:</span>
              <span class="font-medium">{{ calculateErrorRate() }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Timeline -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="flex items-start space-x-3 p-2 rounded-lg border"
          :class="{
            'bg-green-50 border-green-200': activity.type === 'success',
            'bg-yellow-50 border-yellow-200': activity.type === 'warning',
            'bg-red-50 border-red-200': activity.type === 'error',
            'bg-blue-50 border-blue-200': activity.type === 'info'
          }"
        >
          <div class="flex-shrink-0 mt-1">
            <div
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': activity.type === 'success',
                'bg-yellow-500': activity.type === 'warning',
                'bg-red-500': activity.type === 'error',
                'bg-blue-500': activity.type === 'info'
              }"
            ></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{{ activity.title }}</span>
              <span class="text-xs text-gray-500">{{ formatTime(activity.timestamp) }}</span>
            </div>
            <p class="text-xs text-gray-600 mt-1">{{ activity.description }}</p>
            <p v-if="activity.tournamentId" class="text-xs text-gray-500">
              Tournament: {{ activity.tournamentId }}
            </p>
          </div>
        </div>
        
        <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-500">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">No recent algorithm activities</p>
        </div>
      </div>
    </div>

    <!-- Performance Charts -->
    <div class="bg-white border border-gray-200 rounded-lg p-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Response Time Chart Placeholder -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Response Time Trend</h4>
          <div class="h-32 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div class="text-center text-gray-500">
              <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p class="text-xs">Chart would be rendered here</p>
            </div>
          </div>
        </div>

        <!-- Success Rate Chart Placeholder -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Success Rate Trend</h4>
          <div class="h-32 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div class="text-center text-gray-500">
              <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p class="text-xs">Chart would be rendered here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAlgorithmAutomation } from '@/composables/useAlgorithmAutomation'

const {
  automationStats,
  monitoringConfig,
  checkAlgorithmHealth
} = useAlgorithmAutomation()

// Component state
const algorithmHealth = ref({
  healthy: true,
  responseTime: 0,
  message: 'Service operational'
})

const recentActivities = ref([
  {
    id: '1',
    type: 'success',
    title: 'Tournament Initialized',
    description: 'Successfully initialized tournament with 24 matches across 3 communities',
    tournamentId: 'tournament_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
  },
  {
    id: '2',
    type: 'info',
    title: 'Round Advanced',
    description: 'Community R2 generated with 8 new matches',
    tournamentId: 'tournament_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  },
  {
    id: '3',
    type: 'success',
    title: 'Community Completed',
    description: 'Community KISUMU_CENTRAL finalized with positions determined',
    tournamentId: 'tournament_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
  },
  {
    id: '4',
    type: 'warning',
    title: 'Slow Response',
    description: 'Algorithm response time exceeded 3000ms threshold',
    timestamp: new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago
  },
  {
    id: '5',
    type: 'error',
    title: 'Health Check Failed',
    description: 'Algorithm service temporarily unavailable, retrying...',
    timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
  }
])

let healthCheckInterval: NodeJS.Timeout | null = null

// Methods
const formatTime = (date: Date | null): string => {
  if (!date) return 'Never'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const calculateErrorRate = (): number => {
  const total = automationStats.value.successfulProgressions + automationStats.value.failedProgressions
  if (total === 0) return 0
  return Math.round((automationStats.value.failedProgressions / total) * 100)
}

const updateAlgorithmHealth = async () => {
  try {
    const health = await checkAlgorithmHealth()
    algorithmHealth.value = health
    
    // Add activity log entry
    const activityType = health.healthy ? 'success' : 'error'
    const newActivity = {
      id: Date.now().toString(),
      type: activityType,
      title: 'Health Check',
      description: `Algorithm service: ${health.healthy ? 'Healthy' : 'Unhealthy'} (${health.responseTime}ms)`,
      timestamp: new Date()
    }
    
    recentActivities.value.unshift(newActivity)
    
    // Keep only last 10 activities
    if (recentActivities.value.length > 10) {
      recentActivities.value = recentActivities.value.slice(0, 10)
    }
    
  } catch (error) {
    algorithmHealth.value = {
      healthy: false,
      responseTime: 0,
      message: error instanceof Error ? error.message : 'Health check failed'
    }
  }
}

const startHealthChecking = () => {
  healthCheckInterval = setInterval(updateAlgorithmHealth, 30000) // Check every 30 seconds
}

const stopHealthChecking = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

// Lifecycle
onMounted(() => {
  updateAlgorithmHealth()
  startHealthChecking()
})

onUnmounted(() => {
  stopHealthChecking()
})
</script>

<style scoped>
.algorithm-monitoring-panel {
  @apply space-y-6;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>