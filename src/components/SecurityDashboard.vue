<template>
  <div class="security-dashboard">
    <div class="dashboard-header">
      <h2 class="text-2xl font-bold mb-4">Security Dashboard</h2>
      <div class="flex gap-2">
        <Button @click="refreshData" :disabled="isLoading">
          <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button @click="exportEvents" variant="outline">
          <Download class="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button @click="clearEvents" variant="destructive">
          <Trash2 class="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">Total Events</p>
              <p class="text-2xl font-bold">{{ stats.totalEvents }}</p>
            </div>
            <Shield class="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">Critical Events</p>
              <p class="text-2xl font-bold text-red-600">{{ stats.eventsBySeverity.critical }}</p>
            </div>
            <AlertTriangle class="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">XSS Attempts</p>
              <p class="text-2xl font-bold text-orange-600">{{ stats.eventsByType.xss_attempt }}</p>
            </div>
            <Bug class="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">CSP Violations</p>
              <p class="text-2xl font-bold text-yellow-600">
                {{ stats.eventsByType.csp_violation }}
              </p>
            </div>
            <Lock class="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Filters -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label for="severity-filter">Severity</Label>
            <Select v-model="filters.severity">
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label for="type-filter">Event Type</Label>
            <Select v-model="filters.type">
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="xss_attempt">XSS Attempt</SelectItem>
                <SelectItem value="csp_violation">CSP Violation</SelectItem>
                <SelectItem value="token_tampering">Token Tampering</SelectItem>
                <SelectItem value="suspicious_login">Suspicious Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label for="source-filter">Source</Label>
            <Select v-model="filters.source">
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
                <SelectItem v-for="source in availableSources" :key="source" :value="source">
                  {{ source }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label for="time-range">Time Range</Label>
            <Select v-model="filters.timeRange">
              <SelectTrigger>
                <SelectValue placeholder="Last 24 hours" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last hour</SelectItem>
                <SelectItem value="24">Last 24 hours</SelectItem>
                <SelectItem value="168">Last week</SelectItem>
                <SelectItem value="720">Last month</SelectItem>
                <SelectItem value="">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Recent Events -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Recent Security Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <div
            v-for="event in filteredEvents.slice(0, 10)"
            :key="`${event.timestamp}-${event.type}`"
            class="flex items-center justify-between p-3 border rounded-lg"
            :class="getEventBorderClass(event.severity)"
          >
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full" :class="getSeverityColor(event.severity)"></div>
              <div>
                <p class="font-medium">{{ formatEventType(event.type) }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ formatTimestamp(event.timestamp) }} • {{ event.source }}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <Badge :variant="getSeverityVariant(event.severity)">
                {{ event.severity }}
              </Badge>
              <Button @click="showEventDetails(event)" variant="ghost" size="sm">
                <Eye class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div v-if="filteredEvents.length === 0" class="text-center py-8 text-muted-foreground">
            No security events found matching the current filters.
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Event Details Modal -->
    <Dialog v-model:open="showDetailsModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Security Event Details</DialogTitle>
        </DialogHeader>
        <div v-if="selectedEvent" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <p class="font-medium">{{ formatEventType(selectedEvent.type) }}</p>
            </div>
            <div>
              <Label>Severity</Label>
              <Badge :variant="getSeverityVariant(selectedEvent.severity)">
                {{ selectedEvent.severity }}
              </Badge>
            </div>
            <div>
              <Label>Source</Label>
              <p class="font-medium">{{ selectedEvent.source }}</p>
            </div>
            <div>
              <Label>Timestamp</Label>
              <p class="font-medium">{{ formatTimestamp(selectedEvent.timestamp) }}</p>
            </div>
            <div v-if="selectedEvent.userId">
              <Label>User ID</Label>
              <p class="font-medium">{{ selectedEvent.userId }}</p>
            </div>
            <div v-if="selectedEvent.sessionId">
              <Label>Session ID</Label>
              <p class="font-medium">{{ selectedEvent.sessionId }}</p>
            </div>
          </div>

          <div>
            <Label>Details</Label>
            <pre class="mt-2 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-64">{{
              JSON.stringify(selectedEvent.details, null, 2)
            }}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { SecurityEvent, SecurityEventType } from '@/services/xssProtection'
import { securityLogger } from '@/services/securityLogger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Shield, AlertTriangle, Bug, Lock, RefreshCw, Download, Trash2, Eye } from 'lucide-vue-next'

const isLoading = ref(false)
const stats = ref({
  totalEvents: 0,
  eventsByType: {} as Record<string, number>,
  eventsBySeverity: {} as Record<string, number>,
  eventsBySource: {} as Record<string, number>,
  recentEvents: [] as SecurityEvent[],
  criticalEvents: [] as SecurityEvent[],
})

const filters = ref({
  severity: '',
  type: '',
  source: '',
  timeRange: '24',
})

const allEvents = ref<SecurityEvent[]>([])
const selectedEvent = ref<SecurityEvent | null>(null)
const showDetailsModal = ref(false)

const availableSources = computed(() => {
  const sources = new Set<string>()
  allEvents.value.forEach((event) => sources.add(event.source))
  return Array.from(sources).sort()
})

const filteredEvents = computed(() => {
  let events = [...allEvents.value]

  // Filter by severity
  if (filters.value.severity) {
    events = events.filter((event) => event.severity === filters.value.severity)
  }

  // Filter by type
  if (filters.value.type) {
    events = events.filter((event) => event.type === filters.value.type)
  }

  // Filter by source
  if (filters.value.source) {
    events = events.filter((event) => event.source === filters.value.source)
  }

  // Filter by time range
  if (filters.value.timeRange) {
    const hours = parseInt(filters.value.timeRange)
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    events = events.filter((event) => new Date(event.timestamp) > cutoff)
  }

  // Sort by timestamp (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const refreshData = async () => {
  isLoading.value = true
  try {
    allEvents.value = securityLogger.getEvents()
    stats.value = securityLogger.getEventStats()
  } catch (error) {
    console.error('Failed to refresh security data:', error)
  } finally {
    isLoading.value = false
  }
}

const exportEvents = () => {
  try {
    const data = securityLogger.exportEvents()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-events-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export events:', error)
  }
}

const clearEvents = () => {
  if (
    confirm('Are you sure you want to clear all security events? This action cannot be undone.')
  ) {
    securityLogger.clearEvents()
    refreshData()
  }
}

const showEventDetails = (event: SecurityEvent) => {
  selectedEvent.value = event
  showDetailsModal.value = true
}

const formatEventType = (type: SecurityEventType): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const formatTimestamp = (timestamp: Date | string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500'
    case 'high':
      return 'bg-orange-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'low':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'destructive'
    case 'medium':
      return 'secondary'
    case 'low':
      return 'outline'
    default:
      return 'outline'
  }
}

const getEventBorderClass = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50'
    case 'high':
      return 'border-orange-200 bg-orange-50'
    case 'medium':
      return 'border-yellow-200 bg-yellow-50'
    case 'low':
      return 'border-blue-200 bg-blue-50'
    default:
      return 'border-gray-200'
  }
}

// Watch for filter changes and refresh data
watch(filters, refreshData, { deep: true })

onMounted(() => {
  refreshData()

  // Set up real-time updates
  const handleSecurityEvent = (event: SecurityEvent) => {
    allEvents.value.unshift(event)
    refreshData()
  }

  securityLogger.addEventListener(handleSecurityEvent)

  // Cleanup on unmount
  return () => {
    securityLogger.removeEventListener(handleSecurityEvent)
  }
})
</script>

<style scoped>
.security-dashboard {
  @apply p-6 max-w-7xl mx-auto;
}

.dashboard-header {
  @apply flex justify-between items-center mb-6;
}

@media (max-width: 768px) {
  .dashboard-header {
    @apply flex-col items-start gap-4;
  }
}
</style>
