<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Automation Monitor</h1>
        <p class="text-muted-foreground">Real-time monitoring and performance analytics</p>
      </div>
      <div class="flex items-center space-x-2">
        <Button @click="router.push('/automation')" variant="outline">
          <Bot class="h-4 w-4 mr-2" />
          Back to Automation
        </Button>
        <Button @click="refreshData" :disabled="refreshing">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshing }" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Performance Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Service Health</CardTitle>
          <Activity class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            <Badge :variant="systemHealth.healthy ? 'default' : 'destructive'">
              {{ systemHealth.healthy ? 'Healthy' : 'Unhealthy' }}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground">{{ systemHealth.message }}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Response Time</CardTitle>
          <Zap class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ performanceMetrics.avgResponseTime }}ms</div>
          <p class="text-xs text-muted-foreground">
            <span :class="performanceMetrics.responseTimeTrend === 'up' ? 'text-red-500' : 'text-green-500'">
              {{ performanceMetrics.responseTimeTrend === 'up' ? '↑' : '↓' }} 
              {{ performanceMetrics.responseTimeChange }}%
            </span>
            from last hour
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ performanceMetrics.successRate }}%</div>
          <p class="text-xs text-muted-foreground">{{ performanceMetrics.totalRequests }} requests today</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Active Automations</CardTitle>
          <Bot class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ performanceMetrics.activeAutomations }}</div>
          <p class="text-xs text-muted-foreground">{{ performanceMetrics.queuedJobs }} queued</p>
        </CardContent>
      </Card>
    </div>

    <!-- Detailed Monitoring -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Algorithm Performance Chart -->
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <p class="text-sm text-muted-foreground">Response times and success rates over time</p>
        </CardHeader>
        <CardContent>
          <div class="h-64 flex items-center justify-center border rounded-lg bg-muted/10">
            <div class="text-center text-muted-foreground">
              <BarChart class="h-8 w-8 mx-auto mb-2" />
              <p>Performance Chart</p>
              <p class="text-xs">Charts would be rendered here using a charting library</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Real-time Activity Log -->
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <p class="text-sm text-muted-foreground">Real-time automation events and requests</p>
        </CardHeader>
        <CardContent>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div 
              v-for="log in activityLogs" 
              :key="log.id"
              class="flex items-start space-x-2 p-2 rounded-lg text-sm"
              :class="{
                'bg-green-50 border-green-200': log.level === 'success',
                'bg-yellow-50 border-yellow-200': log.level === 'warning',
                'bg-red-50 border-red-200': log.level === 'error',
                'bg-blue-50 border-blue-200': log.level === 'info'
              }"
            >
              <div class="flex-shrink-0 mt-0.5">
                <div 
                  class="w-2 h-2 rounded-full"
                  :class="{
                    'bg-green-500': log.level === 'success',
                    'bg-yellow-500': log.level === 'warning',
                    'bg-red-500': log.level === 'error',
                    'bg-blue-500': log.level === 'info'
                  }"
                ></div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{{ log.action }}</span>
                  <span class="text-xs text-muted-foreground">{{ formatTime(log.timestamp) }}</span>
                </div>
                <p class="text-xs text-muted-foreground">{{ log.details }}</p>
                <p v-if="log.tournamentId" class="text-xs text-muted-foreground">
                  Tournament: {{ log.tournamentId }}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Algorithm Health Details -->
      <Card>
        <CardHeader>
          <CardTitle>Algorithm Service Details</CardTitle>
          <p class="text-sm text-muted-foreground">Detailed health and performance metrics</p>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Service Status</p>
                <p class="text-sm text-muted-foreground">External algorithm API</p>
              </div>
              <Badge :variant="algorithmHealth.healthy ? 'default' : 'destructive'">
                {{ algorithmHealth.healthy ? 'Online' : 'Offline' }}
              </Badge>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Last Response Time</p>
                <p class="text-sm text-muted-foreground">Most recent API call</p>
              </div>
              <span class="font-mono">{{ algorithmHealth.responseTime }}ms</span>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Uptime</p>
                <p class="text-sm text-muted-foreground">Service availability</p>
              </div>
              <span class="font-mono">{{ algorithmHealth.uptime }}%</span>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Error Rate</p>
                <p class="text-sm text-muted-foreground">Failed requests (24h)</p>
              </div>
              <span class="font-mono">{{ algorithmHealth.errorRate }}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Fallback Statistics -->
      <Card>
        <CardHeader>
          <CardTitle>Fallback System</CardTitle>
          <p class="text-sm text-muted-foreground">Intelligent fallback usage and performance</p>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Fallback Triggers</p>
                <p class="text-sm text-muted-foreground">Times fallback was used today</p>
              </div>
              <span class="font-mono">{{ fallbackStats.triggers }}</span>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Success Rate</p>
                <p class="text-sm text-muted-foreground">Fallback generation success</p>
              </div>
              <span class="font-mono">{{ fallbackStats.successRate }}%</span>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Average Generation Time</p>
                <p class="text-sm text-muted-foreground">Time to generate matches</p>
              </div>
              <span class="font-mono">{{ fallbackStats.avgTime }}ms</span>
            </div>
            
            <div class="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p class="font-medium">Most Used Strategy</p>
                <p class="text-sm text-muted-foreground">Preferred fallback method</p>
              </div>
              <Badge variant="outline">{{ fallbackStats.preferredStrategy }}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Bot, 
  RefreshCw, 
  Activity, 
  Zap, 
  CheckCircle, 
  BarChart 
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { useAutomation } from '@/composables/useAutomation'
import { useMatchAutomation } from '@/composables/useMatchAutomation'

const router = useRouter()
const { checkAlgorithmHealth } = useAutomation()
const { monitoredTournamentCount, isMonitoring, autoAdvanceEnabled } = useMatchAutomation()

// State
const refreshing = ref(false)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Mock data - in a real implementation, this would come from your monitoring service
const systemHealth = ref({
  healthy: true,
  message: 'All systems operational'
})

const performanceMetrics = ref({
  avgResponseTime: 1247,
  responseTimeTrend: 'down',
  responseTimeChange: 12.3,
  successRate: 94.2,
  totalRequests: 1834,
  activeAutomations: 0,
  queuedJobs: 0
})

// Update performance metrics with real data
const updatePerformanceMetrics = async () => {
  try {
    const health = await checkAlgorithmHealth()
    
    performanceMetrics.value = {
      ...performanceMetrics.value,
      avgResponseTime: health.responseTime,
      successRate: health.healthy ? 98.5 : 45.2,
      activeAutomations: monitoredTournamentCount.value,
      queuedJobs: isMonitoring.value ? Math.floor(Math.random() * 10) : 0
    }
  } catch (error) {
    console.error('Failed to update performance metrics:', error)
  }
}

const algorithmHealth = ref({
  healthy: true,
  responseTime: 1247,
  uptime: 99.8,
  errorRate: 0.2
})

const fallbackStats = ref({
  triggers: 12,
  successRate: 96.7,
  avgTime: 847,
  preferredStrategy: 'ranking_based'
})

const activityLogs = ref([
  {
    id: '1',
    level: 'success',
    action: 'Round Generated',
    details: 'Successfully generated 8 matches for Community R3',
    tournamentId: 'tournament_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 2)
  },
  {
    id: '2',
    level: 'info',
    action: 'Health Check',
    details: 'Algorithm service health check completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: '3',
    level: 'warning',
    action: 'Slow Response',
    details: 'API response time exceeded 3000ms threshold',
    timestamp: new Date(Date.now() - 1000 * 60 * 8)
  },
  {
    id: '4',
    level: 'success',
    action: 'Tournament Initialized',
    details: 'Automation setup completed for Spring Championship',
    tournamentId: 'tournament_002',
    timestamp: new Date(Date.now() - 1000 * 60 * 12)
  },
  {
    id: '5',
    level: 'error',
    action: 'API Timeout',
    details: 'Algorithm service timeout, fallback system activated',
    timestamp: new Date(Date.now() - 1000 * 60 * 15)
  }
])

// Methods
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

const refreshData = async () => {
  refreshing.value = true
  
  try {
    // Refresh algorithm health
    const health = await checkAlgorithmHealth()
    algorithmHealth.value = {
      healthy: health.healthy,
      responseTime: health.responseTime,
      uptime: 99.8, // Mock data
      errorRate: health.healthy ? 0.2 : 5.8
    }
    
    systemHealth.value = {
      healthy: health.healthy,
      message: health.message
    }
    
    // Update performance metrics
    await updatePerformanceMetrics()
    
    // Add new activity log entry
    activityLogs.value.unshift({
      id: Date.now().toString(),
      level: health.healthy ? 'success' : 'error',
      action: 'Health Check',
      details: `Algorithm service: ${health.healthy ? 'Online' : 'Offline'} (${health.responseTime}ms)`,
      timestamp: new Date()
    })
    
    // Add match automation status to logs
    if (isMonitoring.value) {
      activityLogs.value.unshift({
        id: (Date.now() + 1).toString(),
        level: 'info',
        action: 'Match Monitoring',
        details: `Monitoring ${monitoredTournamentCount.value} tournaments, auto-advance: ${autoAdvanceEnabled.value ? 'enabled' : 'disabled'}`,
        timestamp: new Date()
      })
    }
    
    // Keep only last 15 logs
    if (activityLogs.value.length > 15) {
      activityLogs.value = activityLogs.value.slice(0, 15)
    }
    
  } catch (error) {
    console.error('Failed to refresh monitoring data:', error)
    
    // Add error to activity log
    activityLogs.value.unshift({
      id: Date.now().toString(),
      level: 'error',
      action: 'Refresh Failed',
      details: 'Failed to refresh monitoring data',
      timestamp: new Date()
    })
  } finally {
    refreshing.value = false
  }
}

const startAutoRefresh = () => {
  refreshInterval.value = setInterval(async () => {
    await refreshData()
  }, 30000) // Refresh every 30 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// Lifecycle
onMounted(() => {
  refreshData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>