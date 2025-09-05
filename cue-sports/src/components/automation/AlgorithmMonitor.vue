<template>
  <div class="algorithm-monitor">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Algorithm Monitor</h2>
          <p class="text-sm text-gray-600 mt-1">
            Real-time monitoring of algorithm service performance and activity
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          <button
            @click="refreshAll"
            :disabled="loading"
            class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
          
          <div class="flex items-center">
            <input
              id="autoRefresh"
              v-model="autoRefresh"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="autoRefresh" class="ml-2 text-sm text-gray-700">
              Auto-refresh (30s)
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Health Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Service Status</p>
            <p :class="[
              'text-lg font-semibold',
              serviceHealth.healthy ? 'text-green-600' : 'text-red-600'
            ]">
              {{ serviceHealth.healthy ? 'Online' : 'Offline' }}
            </p>
          </div>
          <div :class="[
            'w-3 h-3 rounded-full',
            serviceHealth.healthy ? 'bg-green-500' : 'bg-red-500'
          ]"></div>
        </div>
      </div>

      <div class="border border-gray-200 rounded-lg p-4">
        <div>
          <p class="text-sm font-medium text-gray-600">Response Time</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ serviceHealth.responseTime }}ms
          </p>
        </div>
      </div>

      <div class="border border-gray-200 rounded-lg p-4">
        <div>
          <p class="text-sm font-medium text-gray-600">Active Tournaments</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ activeTournaments.length }}
          </p>
        </div>
      </div>

      <div class="border border-gray-200 rounded-lg p-4">
        <div>
          <p class="text-sm font-medium text-gray-600">Last Check</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ formatTime(lastHealthCheck) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Algorithm Endpoint Statistics -->
    <div class="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Algorithm Endpoint Statistics</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div class="text-center">
          <div class="text-xl font-bold text-blue-600">
            {{ endpointStats.initialization.count }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Initializations
          </div>
          <div class="text-xs text-gray-400">
            Avg: {{ endpointStats.initialization.avgResponseTime }}ms
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-green-600">
            {{ endpointStats.communityRounds.count }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Community Rounds
          </div>
          <div class="text-xs text-gray-400">
            Avg: {{ endpointStats.communityRounds.avgResponseTime }}ms
          </div>
        </div>

        <div class="text-center">
          <div class="text-xl font-bold text-purple-600">
            {{ endpointStats.finalization.count }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Finalizations
          </div>
          <div class="text-xs text-gray-400">
            Avg: {{ endpointStats.finalization.avgResponseTime }}ms
          </div>
        </div>

        <div class="text-center">
          <div class="text-xl font-bold text-indigo-600">
            {{ endpointStats.positions.count }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Position Queries
          </div>
          <div class="text-xs text-gray-400">
            Avg: {{ endpointStats.positions.avgResponseTime }}ms
          </div>
        </div>
      </div>

      <!-- Success Rate -->
      <div class="border-t pt-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-700">Overall Success Rate</span>
          <span class="text-sm font-semibold text-gray-900">{{ overallSuccessRate }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :style="{ width: `${overallSuccessRate}%` }"
            :class="[
              'h-2 rounded-full transition-all duration-300',
              overallSuccessRate >= 95 ? 'bg-green-500' : 
              overallSuccessRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'
            ]"
          ></div>
        </div>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">
            {{ performanceMetrics.totalRequests }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Total Requests
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">
            {{ performanceMetrics.successfulRequests }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Successful
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-2xl font-bold text-red-600">
            {{ performanceMetrics.failedRequests }}
          </div>
          <div class="text-xs text-gray-500 uppercase tracking-wide">
            Failed
          </div>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Success Rate</span>
          <span>{{ getSuccessRate() }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :style="{ width: `${getSuccessRate()}%` }"
            class="bg-green-600 h-2 rounded-full transition-all duration-300"
          ></div>
        </div>
      </div>
    </div>

    <!-- Active Operations -->
    <div v-if="activeOperations.length > 0" class="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Active Operations</h3>
      
      <div class="space-y-3">
        <div
          v-for="operation in activeOperations"
          :key="operation.id"
          class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md"
        >
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <p class="font-medium text-gray-900">{{ operation.type }}</p>
              <p class="text-sm text-gray-600">{{ operation.tournamentId }} - {{ operation.level }}</p>
            </div>
          </div>
          
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">
              {{ formatDuration(operation.startTime) }}
            </p>
            <p class="text-xs text-gray-600">Running</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
        <button
          @click="clearActivity"
          class="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear
        </button>
      </div>
      
      <div v-if="recentActivity.length === 0" class="text-center py-8 text-gray-500">
        No recent activity
      </div>
      
      <div v-else class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="activity in recentActivity"
          :key="activity.id"
          class="flex items-start gap-3 p-2 border-l-4 border-gray-300"
        >
          <div :class="[
            'w-3 h-3 rounded-full mt-1 flex-shrink-0',
            getActivityStatusColor(activity.status)
          ]"></div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ activity.operation }}
              </p>
              <span :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                getActivityStatusBadge(activity.status)
              ]">
                {{ activity.status }}
              </span>
            </div>
            
            <p class="text-xs text-gray-600">
              {{ activity.tournamentId }} - {{ activity.level }}
            </p>
            
            <div class="flex items-center justify-between mt-1">
              <p class="text-xs text-gray-500">
                {{ formatDateTime(activity.timestamp) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ activity.duration }}ms
              </p>
            </div>
            
            <p v-if="activity.error" class="text-xs text-red-600 mt-1">
              {{ activity.error }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Algorithm Response Times Chart -->
    <div class="border border-gray-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Response Time History</h3>
      
      <div class="h-48 flex items-end justify-between space-x-1">
        <div
          v-for="(time, index) in responseTimeHistory"
          :key="index"
          class="bg-blue-500 rounded-t-sm min-w-[8px] flex-1"
          :style="{ height: `${(time / Math.max(...responseTimeHistory)) * 100}%` }"
          :title="`${time}ms`"
        ></div>
      </div>
      
      <div class="flex justify-between text-xs text-gray-500 mt-2">
        <span>{{ responseTimeHistory.length }} samples</span>
        <span>Max: {{ Math.max(...responseTimeHistory) }}ms</span>
        <span>Avg: {{ Math.round(responseTimeHistory.reduce((a, b) => a + b, 0) / responseTimeHistory.length) }}ms</span>
      </div>
    </div>

    <!-- Error Log -->
    <div v-if="errorLog.length > 0" class="border border-red-200 bg-red-50 rounded-lg p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-red-800">Error Log</h3>
        <button
          @click="clearErrors"
          class="text-sm text-red-600 hover:text-red-800"
        >
          Clear
        </button>
      </div>
      
      <div class="space-y-3 max-h-48 overflow-y-auto">
        <div
          v-for="error in errorLog"
          :key="error.id"
          class="p-3 bg-white border border-red-200 rounded-md"
        >
          <div class="flex items-center justify-between mb-2">
            <p class="font-medium text-red-800">{{ error.operation }}</p>
            <p class="text-xs text-red-600">{{ formatDateTime(error.timestamp) }}</p>
          </div>
          
          <p class="text-sm text-red-700">{{ error.message }}</p>
          
          <div v-if="error.details" class="mt-2">
            <button
              @click="toggleErrorDetails(error.id)"
              class="text-xs text-red-600 hover:text-red-800"
            >
              {{ expandedErrors.has(error.id) ? 'Hide' : 'Show' }} Details
            </button>
            
            <pre
              v-if="expandedErrors.has(error.id)"
              class="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded overflow-x-auto"
            >{{ JSON.stringify(error.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { algorithmService } from '@/services/algorithmService'
import { tournamentProgressionService, type ProgressionEvent } from '@/services/tournamentProgressionService'

interface ServiceHealth {
  healthy: boolean
  message: string
  responseTime: number
}

interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
}

interface ActiveOperation {
  id: string
  type: string
  tournamentId: string
  level: string
  startTime: Date
}

interface ActivityRecord {
  id: string
  operation: string
  tournamentId: string
  level: string
  status: 'success' | 'error' | 'timeout'
  timestamp: Date
  duration: number
  error?: string
}

interface ErrorRecord {
  id: string
  operation: string
  message: string
  timestamp: Date
  details?: any
}

interface EndpointStats {
  count: number
  successCount: number
  errorCount: number
  totalResponseTime: number
  avgResponseTime: number
}

interface EndpointStatistics {
  initialization: EndpointStats
  communityRounds: EndpointStats
  finalization: EndpointStats
  positions: EndpointStats
}

// Local state
const loading = ref(false)
const autoRefresh = ref(true)
const lastHealthCheck = ref<Date>(new Date())
const serviceHealth = ref<ServiceHealth>({
  healthy: false,
  message: 'Checking...',
  responseTime: 0
})
const performanceMetrics = ref<PerformanceMetrics>({
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0
})
const activeOperations = ref<ActiveOperation[]>([])
const recentActivity = ref<ActivityRecord[]>([])
const errorLog = ref<ErrorRecord[]>([])
const responseTimeHistory = ref<number[]>([])
const expandedErrors = ref<Set<string>>(new Set())

// Endpoint statistics
const endpointStats = ref<EndpointStatistics>({
  initialization: {
    count: 0,
    successCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    avgResponseTime: 0
  },
  communityRounds: {
    count: 0,
    successCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    avgResponseTime: 0
  },
  finalization: {
    count: 0,
    successCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    avgResponseTime: 0
  },
  positions: {
    count: 0,
    successCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
    avgResponseTime: 0
  }
})

// Auto-refresh timer
let refreshTimer: NodeJS.Timeout | null = null

// Computed properties
const overallSuccessRate = computed(() => {
  const totalRequests = Object.values(endpointStats.value).reduce((sum, stat) => sum + stat.count, 0)
  const totalSuccesses = Object.values(endpointStats.value).reduce((sum, stat) => sum + stat.successCount, 0)
  
  if (totalRequests === 0) return 100
  return Math.round((totalSuccesses / totalRequests) * 100)
})

// Computed
const activeTournaments = computed(() => {
  const tournaments = new Set<string>()
  activeOperations.value.forEach(op => tournaments.add(op.tournamentId))
  recentActivity.value.forEach(activity => tournaments.add(activity.tournamentId))
  return Array.from(tournaments)
})

// Methods
const refreshAll = async () => {
  loading.value = true
  try {
    await Promise.all([
      checkServiceHealth(),
      updatePerformanceMetrics()
    ])
  } finally {
    loading.value = false
  }
}

const checkServiceHealth = async () => {
  try {
    const health = await algorithmService.checkServiceHealth()
    serviceHealth.value = health
    lastHealthCheck.value = new Date()
    
    // Update response time history
    responseTimeHistory.value.push(health.responseTime)
    if (responseTimeHistory.value.length > 50) {
      responseTimeHistory.value = responseTimeHistory.value.slice(-50)
    }
    
    // Update performance metrics
    performanceMetrics.value.totalRequests++
    if (health.healthy) {
      performanceMetrics.value.successfulRequests++
    } else {
      performanceMetrics.value.failedRequests++
      addErrorRecord('health_check', health.message)
    }
  } catch (error) {
    serviceHealth.value = {
      healthy: false,
      message: error instanceof Error ? error.message : 'Health check failed',
      responseTime: 0
    }
    lastHealthCheck.value = new Date()
    performanceMetrics.value.totalRequests++
    performanceMetrics.value.failedRequests++
    addErrorRecord('health_check', serviceHealth.value.message, error)
  }
}

const updatePerformanceMetrics = async () => {
  // In a real implementation, this would fetch metrics from a monitoring service
  // For now, we'll use local tracking
}

const addActiveOperation = (type: string, tournamentId: string, level: string): string => {
  const id = `${type}_${tournamentId}_${Date.now()}`
  activeOperations.value.push({
    id,
    type,
    tournamentId,
    level,
    startTime: new Date()
  })
  return id
}

const removeActiveOperation = (id: string) => {
  const index = activeOperations.value.findIndex(op => op.id === id)
  if (index !== -1) {
    activeOperations.value.splice(index, 1)
  }
}

const addActivityRecord = (
  operation: string,
  tournamentId: string,
  level: string,
  status: 'success' | 'error' | 'timeout',
  duration: number,
  error?: string
) => {
  const record: ActivityRecord = {
    id: `${operation}_${tournamentId}_${Date.now()}`,
    operation,
    tournamentId,
    level,
    status,
    timestamp: new Date(),
    duration,
    error
  }
  
  recentActivity.value.unshift(record)
  
  // Keep only last 50 records
  if (recentActivity.value.length > 50) {
    recentActivity.value = recentActivity.value.slice(0, 50)
  }
}

const addErrorRecord = (operation: string, message: string, details?: any) => {
  const error: ErrorRecord = {
    id: `error_${Date.now()}`,
    operation,
    message,
    timestamp: new Date(),
    details
  }
  
  errorLog.value.unshift(error)
  
  // Keep only last 20 errors
  if (errorLog.value.length > 20) {
    errorLog.value = errorLog.value.slice(0, 20)
  }
}

const clearActivity = () => {
  recentActivity.value = []
}

const clearErrors = () => {
  errorLog.value = []
  expandedErrors.value.clear()
}

// Update endpoint statistics
const updateEndpointStats = (
  endpoint: keyof EndpointStatistics,
  success: boolean,
  responseTime: number
) => {
  const stats = endpointStats.value[endpoint]
  stats.count++
  stats.totalResponseTime += responseTime
  stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.count)
  
  if (success) {
    stats.successCount++
  } else {
    stats.errorCount++
  }
}

const toggleErrorDetails = (errorId: string) => {
  if (expandedErrors.value.has(errorId)) {
    expandedErrors.value.delete(errorId)
  } else {
    expandedErrors.value.add(errorId)
  }
}

// Event handlers
const handleProgressionEvent = (event: ProgressionEvent) => {
  addActivityRecord(
    event.type,
    event.tournamentId,
    event.level,
    'success',
    0
  )

  if (event.type === 'error') {
    addErrorRecord(
      `${event.level}_${event.round}`,
      event.data?.message || 'Unknown error',
      event.data
    )
  }
}

// Helper methods
const getSuccessRate = (): number => {
  if (performanceMetrics.value.totalRequests === 0) return 100
  return Math.round(
    (performanceMetrics.value.successfulRequests / performanceMetrics.value.totalRequests) * 100
  )
}

const getActivityStatusColor = (status: string): string => {
  const colors = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'timeout': 'bg-yellow-500'
  }
  return colors[status] || 'bg-gray-500'
}

const getActivityStatusBadge = (status: string): string => {
  const badges = {
    'success': 'bg-green-100 text-green-800',
    'error': 'bg-red-100 text-red-800',
    'timeout': 'bg-yellow-100 text-yellow-800'
  }
  return badges[status] || 'bg-gray-100 text-gray-800'
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (startTime: Date): string => {
  const duration = Date.now() - startTime.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// Auto-refresh setup
const setupAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      checkServiceHealth()
    }, 30000) // 30 seconds
  }
}

// Lifecycle
onMounted(() => {
  refreshAll()
  setupAutoRefresh()
  tournamentProgressionService.addEventListener(handleProgressionEvent)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  tournamentProgressionService.removeEventListener(handleProgressionEvent)
})

// Watch auto-refresh setting
import { watch } from 'vue'
watch(autoRefresh, setupAutoRefresh)
</script>

<style scoped>
.algorithm-monitor {
  @apply max-w-6xl mx-auto;
}
</style>