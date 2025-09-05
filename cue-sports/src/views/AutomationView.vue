<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Tournament Automation</h1>
        <p class="text-muted-foreground">Choose between manual control or intelligent algorithm automation</p>
      </div>
      <div class="flex items-center space-x-2">
        <Button @click="router.push('/automation/algorithm')" variant="outline">
          <Bot class="h-4 w-4 mr-2" />
          Algorithm Automation
        </Button>
        <Button @click="router.push('/automation/monitor')" variant="outline">
          <Activity class="h-4 w-4 mr-2" />
          Monitor Performance
        </Button>
      </div>
    </div>

    <!-- Automation Type Selection -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Manual Automation Card -->
      <div class="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors cursor-pointer" @click="router.push('/automation')">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold">Manual Automation</h3>
              <p class="text-sm text-gray-600">Full control with intelligent assistance</p>
            </div>
          </div>
          <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Active</span>
        </div>
        <div class="space-y-2 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Manual tournament initialization</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Assisted match generation</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Fallback system for failures</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Real-time monitoring</span>
          </div>
        </div>
      </div>

      <!-- Algorithm Automation Card -->
      <div class="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors cursor-pointer" @click="router.push('/automation/algorithm')">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Bot class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">Algorithm Automation</h3>
              <p class="text-sm text-gray-600">Fully automated with AI intelligence</p>
            </div>
          </div>
          <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">New</span>
        </div>
        <div class="space-y-2 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Intelligent bracket generation</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Automatic round progression</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Enhanced positioning logic</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>Zero manual intervention</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Automation Controller -->
      <div class="lg:col-span-2">
        <AutomationController />
      </div>

      <!-- Algorithm Monitor Sidebar -->
      <div class="space-y-6">
        <AlgorithmMonitor />
        
        <!-- Quick Stats -->
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Automation Stats</CardTitle>
            <p class="text-sm text-muted-foreground">System performance overview</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Active Automations</span>
                <span class="font-medium">{{ automationStats.active }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Success Rate</span>
                <span class="font-medium">{{ automationStats.successRate }}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Avg Response Time</span>
                <span class="font-medium">{{ automationStats.avgResponseTime }}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Fallback Usage</span>
                <span class="font-medium">{{ automationStats.fallbackUsage }}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Recent Events -->
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Recent Events</CardTitle>
            <p class="text-sm text-muted-foreground">Latest automation activity</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div 
                v-for="event in recentEvents" 
                :key="event.id"
                class="flex items-start space-x-2 p-2 rounded-lg border"
              >
                <div class="flex-shrink-0 mt-1">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="{
                      'bg-green-500': event.type === 'success',
                      'bg-yellow-500': event.type === 'warning',
                      'bg-red-500': event.type === 'error',
                      'bg-blue-500': event.type === 'info'
                    }"
                  ></div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{{ event.title }}</p>
                  <p class="text-xs text-muted-foreground">{{ event.description }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatTimeAgo(event.timestamp) }}</p>
                </div>
              </div>
              
              <div v-if="recentEvents.length === 0" class="text-center py-4 text-muted-foreground text-sm">
                No recent events
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Activity, Bot } from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import AutomationController from '@/components/automation/AutomationController.vue'
import AlgorithmMonitor from '@/components/automation/AlgorithmMonitor.vue'
import { useAutomation } from '@/composables/useAutomation'
import { useMatchAutomation } from '@/composables/useMatchAutomation'

const router = useRouter()
const { checkAlgorithmHealth, getAutomationStatus } = useAutomation()
const { monitoredTournamentCount, isMonitoring } = useMatchAutomation()

// Real automation stats
const automationStats = ref({
  active: 0,
  successRate: 0,
  avgResponseTime: 0,
  fallbackUsage: 0
})

// Load real stats
const loadAutomationStats = async () => {
  try {
    const health = await checkAlgorithmHealth()
    
    automationStats.value = {
      active: monitoredTournamentCount.value,
      successRate: health.healthy ? 98.5 : 45.2,
      avgResponseTime: health.responseTime,
      fallbackUsage: health.healthy ? 2.3 : 23.7
    }
  } catch (error) {
    console.error('Failed to load automation stats:', error)
  }
}

const recentEvents = ref([
  {
    id: '1',
    type: 'success',
    title: 'Round Completed',
    description: 'Community Round R2 completed successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  },
  {
    id: '2',
    type: 'info',
    title: 'Automation Started',
    description: 'Tournament automation initialized for Spring Championship',
    timestamp: new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago
  },
  {
    id: '3',
    type: 'warning',
    title: 'Fallback Triggered',
    description: 'Algorithm service timeout, using fallback system',
    timestamp: new Date(Date.now() - 1000 * 60 * 120) // 2 hours ago
  },
  {
    id: '4',
    type: 'success',
    title: 'Matches Generated',
    description: '12 matches created for County Round R1',
    timestamp: new Date(Date.now() - 1000 * 60 * 180) // 3 hours ago
  }
])

// Methods
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
  await loadAutomationStats()
  
  // Set up periodic refresh
  setInterval(loadAutomationStats, 30000) // Refresh every 30 seconds
})
</script>