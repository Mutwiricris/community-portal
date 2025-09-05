<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Algorithm Automation</h1>
        <p class="text-muted-foreground">Fully automated tournament management using intelligent algorithms</p>
      </div>
      <div class="flex items-center space-x-2">
        <Button @click="router.push('/automation')" variant="outline">
          <Bot class="h-4 w-4 mr-2" />
          Manual Automation
        </Button>
        <Button @click="router.push('/automation/monitor')" variant="outline">
          <Activity class="h-4 w-4 mr-2" />
          Monitor Performance
        </Button>
      </div>
    </div>

    <!-- Algorithm Status Banner -->
    <div v-if="!automationStats.isHealthy" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-red-800">Algorithm Service Offline</h3>
          <p class="text-sm text-red-700 mt-1">
            The algorithm service is currently unavailable. Ensure your development server is running and the proxy is configured correctly.
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Algorithm Controller -->
      <div class="lg:col-span-2">
        <AlgorithmAutomationController />
      </div>

      <!-- Algorithm Monitoring Sidebar -->
      <div class="space-y-6">
        <AlgorithmMonitoringPanel />
        
        <!-- Quick Actions -->
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Quick Actions</CardTitle>
            <p class="text-sm text-muted-foreground">Common algorithm operations</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <Button
                @click="checkAlgorithmHealth"
                variant="outline"
                size="sm"
                class="w-full justify-start"
                :disabled="checking"
              >
                <Activity class="h-4 w-4 mr-2" />
                {{ checking ? 'Checking...' : 'Check Algorithm Health' }}
              </Button>

              <Button
                @click="showAlgorithmStats"
                variant="outline"
                size="sm"
                class="w-full justify-start"
              >
                <BarChart class="h-4 w-4 mr-2" />
                View Performance Stats
              </Button>

              <Button
                @click="refreshAllData"
                variant="outline"
                size="sm"
                class="w-full justify-start"
                :disabled="refreshing"
              >
                <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshing }" />
                {{ refreshing ? 'Refreshing...' : 'Refresh All Data' }}
              </Button>

              <Button
                @click="showApiDocumentation"
                variant="outline"
                size="sm"
                class="w-full justify-start"
              >
                <FileText class="h-4 w-4 mr-2" />
                API Documentation
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Algorithm Features -->
        <Card>
          <CardHeader>
            <CardTitle class="text-lg">Algorithm Features</CardTitle>
            <p class="text-sm text-muted-foreground">What our algorithm provides</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Intelligent Bracket Generation</div>
                  <div class="text-xs text-muted-foreground">Optimized tournament structures based on player count</div>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Automatic Round Progression</div>
                  <div class="text-xs text-muted-foreground">Smart detection of completed rounds and automatic advancement</div>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Enhanced Positioning Logic</div>
                  <div class="text-xs text-muted-foreground">Handles 1, 2, 3+ player scenarios intelligently</div>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Community Management</div>
                  <div class="text-xs text-muted-foreground">Separate community brackets with automatic finalization</div>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Hierarchical Tournaments</div>
                  <div class="text-xs text-muted-foreground">Community → County → Regional → National progression</div>
                </div>
              </div>

              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <div class="text-sm font-medium">Scheduling Suggestions</div>
                  <div class="text-xs text-muted-foreground">Weekend vs full-week schedule optimization</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Algorithm Statistics Modal -->
    <div v-if="showStatsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Algorithm Performance Statistics</h3>
          <button @click="showStatsModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">Total Tournaments</div>
            <div class="text-2xl font-bold text-gray-900">{{ automationStats.activeTournaments }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">Matches Generated</div>
            <div class="text-2xl font-bold text-gray-900">{{ automationStats.totalMatchesGenerated }}</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">Success Rate</div>
            <div class="text-2xl font-bold text-green-600">{{ automationStats.successRate }}%</div>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">Active Communities</div>
            <div class="text-2xl font-bold text-gray-900">{{ automationStats.monitoredCommunities }}</div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Successful Operations</div>
            <div class="text-lg text-green-600">{{ automationStats.successfulProgressions }}</div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Failed Operations</div>
            <div class="text-lg text-red-600">{{ automationStats.failedProgressions }}</div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Service Health</div>
            <div :class="[
              'text-lg',
              automationStats.isHealthy ? 'text-green-600' : 'text-red-600'
            ]">
              {{ automationStats.isHealthy ? 'Healthy' : 'Unhealthy' }}
            </div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-700 mb-2">Last Health Check</div>
            <div class="text-lg text-gray-600">{{ formatTime(automationStats.lastHealthCheck) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- API Documentation Modal -->
    <div v-if="showApiModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Algorithm API Documentation</h3>
          <button @click="showApiModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-6">
          <div>
            <h4 class="text-md font-semibold mb-2">Tournament Initialization</h4>
            <div class="bg-gray-100 rounded-lg p-4 font-mono text-sm">
              <div class="text-green-600">POST</div>
              <div class="text-blue-600">/api/algorithm/initialize-tournament</div>
              <div class="text-xs text-gray-500 mt-1">Proxied to: https://thomasngomono.pythonanywhere.com</div>
              <div class="mt-2 text-gray-600">
                {<br>
                &nbsp;&nbsp;"tournamentId": "string",<br>
                &nbsp;&nbsp;"special": false,<br>
                &nbsp;&nbsp;"level": "community",<br>
                &nbsp;&nbsp;"schedulingPreference": "weekend"<br>
                }
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-md font-semibold mb-2">Community Round Generation</h4>
            <div class="bg-gray-100 rounded-lg p-4 font-mono text-sm">
              <div class="text-green-600">POST</div>
              <div class="text-blue-600">/api/algorithm/community/next-round</div>
              <div class="text-xs text-gray-500 mt-1">Proxied to: https://thomasngomono.pythonanywhere.com</div>
              <div class="mt-2 text-gray-600">
                {<br>
                &nbsp;&nbsp;"tournamentId": "string",<br>
                &nbsp;&nbsp;"communityId": "string"<br>
                }
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-md font-semibold mb-2">Tournament Finalization</h4>
            <div class="bg-gray-100 rounded-lg p-4 font-mono text-sm">
              <div class="text-green-600">POST</div>
              <div class="text-blue-600">/api/algorithm/finalize</div>
              <div class="text-xs text-gray-500 mt-1">Proxied to: https://thomasngomono.pythonanywhere.com</div>
              <div class="mt-2 text-gray-600">
                {<br>
                &nbsp;&nbsp;"tournamentId": "string",<br>
                &nbsp;&nbsp;"communityId": "string"<br>
                }
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-md font-semibold mb-2">Health Check</h4>
            <div class="bg-gray-100 rounded-lg p-4 font-mono text-sm">
              <div class="text-blue-600">GET</div>
              <div class="text-blue-600">/api/algorithm/test-connection</div>
              <div class="text-xs text-gray-500 mt-1">Proxied to: https://thomasngomono.pythonanywhere.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Bot, 
  Activity, 
  BarChart,
  RefreshCw,
  FileText
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import AlgorithmAutomationController from '@/components/automation/AlgorithmAutomationController.vue'
import AlgorithmMonitoringPanel from '@/components/automation/AlgorithmMonitoringPanel.vue'
import { useAlgorithmAutomation } from '@/composables/useAlgorithmAutomation'

const router = useRouter()
const { automationStats, checkAlgorithmHealth } = useAlgorithmAutomation()

// Component state
const checking = ref(false)
const refreshing = ref(false)
const showStatsModal = ref(false)
const showApiModal = ref(false)

// Methods
const checkHealth = async () => {
  checking.value = true
  try {
    await checkAlgorithmHealth()
  } finally {
    checking.value = false
  }
}

const refreshAllData = async () => {
  refreshing.value = true
  try {
    await checkAlgorithmHealth()
    // Add any other data refresh calls here
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate loading
  } finally {
    refreshing.value = false
  }
}

const showAlgorithmStats = () => {
  showStatsModal.value = true
}

const showApiDocumentation = () => {
  showApiModal.value = true
}

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
</script>