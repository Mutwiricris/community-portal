<template>
  <div class="match-management-panel">
    <!-- Quick Actions Header -->
    <div class="management-header">
      <div class="header-info">
        <h3>Match Management</h3>
        <p class="text-muted-foreground">Manage match lifecycle, scheduling, and operations</p>
      </div>
      
      <div class="header-actions">
        <Button @click="refreshMatches" variant="outline" size="sm" :disabled="loading">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
        <Button @click="showBulkActions = !showBulkActions" variant="outline" size="sm">
          <CheckSquare class="h-4 w-4 mr-2" />
          Bulk Actions
        </Button>
      </div>
    </div>

    <!-- Filters and Search -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>Filters & Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Search</label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                v-model="filters.search"
                type="text"
                placeholder="Search matches..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Status Filter -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Status</label>
            <select v-model="filters.status" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Tournament Filter -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Tournament</label>
            <select v-model="filters.tournament" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">All Tournaments</option>
              <option value="community">Community</option>
              <option value="county">County</option>
              <option value="regional">Regional</option>
              <option value="national">National</option>
            </select>
          </div>

          <!-- Date Range -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Date Range</label>
            <select v-model="filters.dateRange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        <!-- Custom Date Range -->
        <div v-if="filters.dateRange === 'custom'" class="grid grid-cols-2 gap-4 mt-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">From Date</label>
            <input
              v-model="filters.startDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">To Date</label>
            <input
              v-model="filters.endDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Bulk Actions Panel -->
    <Card v-if="showBulkActions" class="mb-6">
      <CardHeader>
        <CardTitle>Bulk Actions</CardTitle>
        <p class="text-sm text-muted-foreground">Select matches to perform bulk operations</p>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-4">
            <Button @click="selectAll" variant="outline" size="sm">
              <CheckSquare class="h-4 w-4 mr-2" />
              Select All ({{ filteredMatches.length }})
            </Button>
            <Button @click="clearSelection" variant="outline" size="sm">
              <X class="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
            <span class="text-sm text-muted-foreground">
              {{ selectedMatches.length }} matches selected
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            @click="bulkUpdateStatus('scheduled')" 
            variant="outline" 
            size="sm"
            :disabled="selectedMatches.length === 0"
          >
            <Calendar class="h-4 w-4 mr-2" />
            Schedule Selected
          </Button>
          <Button 
            @click="bulkUpdateStatus('in_progress')" 
            variant="outline" 
            size="sm"
            :disabled="selectedMatches.length === 0"
          >
            <Play class="h-4 w-4 mr-2" />
            Start Selected
          </Button>
          <Button 
            @click="bulkUpdateStatus('cancelled')" 
            variant="outline" 
            size="sm"
            :disabled="selectedMatches.length === 0"
          >
            <Ban class="h-4 w-4 mr-2" />
            Cancel Selected
          </Button>
          <Button 
            @click="bulkDelete" 
            variant="destructive" 
            size="sm"
            :disabled="selectedMatches.length === 0"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Matches Grid -->
    <div class="matches-grid">
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <div v-else-if="filteredMatches.length === 0" class="text-center py-12">
        <Calendar class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-lg font-medium text-muted-foreground mb-2">No matches found</h3>
        <p class="text-muted-foreground">Try adjusting your filters or create a new match</p>
        <Button @click="$router.push('/matches/create')" class="mt-4">
          <Plus class="h-4 w-4 mr-2" />
          Create New Match
        </Button>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="match in paginatedMatches" 
          :key="match.id"
          class="match-card"
          :class="{ 'selected': selectedMatches.includes(match.id) }"
        >
          <!-- Match Header -->
          <div class="match-header">
            <div class="flex items-center space-x-3">
              <input
                v-if="showBulkActions"
                type="checkbox"
                :checked="selectedMatches.includes(match.id)"
                @change="toggleSelection(match.id)"
                class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              
              <div class="match-info">
                <h4 class="font-semibold">{{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}</h4>
                <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{{ match.tournamentLevel }}</span>
                  <span>•</span>
                  <span>Round {{ match.roundNumber }}</span>
                  <span>•</span>
                  <span>Match #{{ match.matchNumber }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <Badge :variant="getStatusVariant(match.status)">{{ match.status }}</Badge>
              <div v-if="isMatchLive(match.id)" class="flex items-center text-red-600 text-xs font-medium">
                <div class="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-1"></div>
                LIVE
              </div>
            </div>
          </div>

          <!-- Match Details -->
          <div class="match-details">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Scheduled:</span>
                <span class="ml-2">{{ formatDate(match.scheduledDateTime) }}</span>
              </div>
              <div v-if="match.actualStartTime">
                <span class="text-muted-foreground">Started:</span>
                <span class="ml-2">{{ formatDate(match.actualStartTime) }}</span>
              </div>
              <div v-if="match.venueId">
                <span class="text-muted-foreground">Venue:</span>
                <span class="ml-2">{{ match.venueId }}</span>
              </div>
              <div v-if="match.tableNumber">
                <span class="text-muted-foreground">Table:</span>
                <span class="ml-2">{{ match.tableNumber }}</span>
              </div>
            </div>
          </div>

          <!-- Match Actions -->
          <div class="match-actions">
            <div class="action-buttons">
              <!-- Status Management -->
              <div class="button-group">
                <Button 
                  v-if="match.status === 'pending'" 
                  @click="updateMatchStatus(match.id, 'scheduled')"
                  variant="outline" 
                  size="sm"
                >
                  <Calendar class="h-3 w-3 mr-1" />
                  Schedule
                </Button>
                
                <Button 
                  v-if="match.status === 'scheduled'" 
                  @click="updateMatchStatus(match.id, 'in_progress')"
                  variant="outline" 
                  size="sm"
                >
                  <Play class="h-3 w-3 mr-1" />
                  Start
                </Button>
                
                <Button 
                  v-if="match.status === 'in_progress' && !isMatchLive(match.id)" 
                  @click="goLive(match)"
                  variant="outline" 
                  size="sm"
                >
                  <Radio class="h-3 w-3 mr-1" />
                  Go Live
                </Button>
                
                <Button 
                  v-if="match.status === 'in_progress'" 
                  @click="pauseMatch(match.id)"
                  variant="outline" 
                  size="sm"
                >
                  <Pause class="h-3 w-3 mr-1" />
                  Pause
                </Button>
                
                <Button 
                  v-if="match.status === 'in_progress'" 
                  @click="completeMatch(match.id)"
                  variant="outline" 
                  size="sm"
                >
                  <CheckCircle class="h-3 w-3 mr-1" />
                  Complete
                </Button>
              </div>

              <!-- Navigation & Management -->
              <div class="button-group">
                <Button 
                  @click="$router.push(`/matches/${match.id}`)"
                  variant="ghost" 
                  size="sm"
                >
                  <Eye class="h-3 w-3 mr-1" />
                  View
                </Button>
                
                <Button 
                  @click="editMatch(match)"
                  variant="ghost" 
                  size="sm"
                >
                  <Edit class="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                <Button 
                  @click="rescheduleMatch(match)"
                  variant="ghost" 
                  size="sm"
                >
                  <Clock class="h-3 w-3 mr-1" />
                  Reschedule
                </Button>
                
                <Button 
                  @click="deleteMatch(match.id)"
                  variant="ghost" 
                  size="sm"
                  class="text-red-600 hover:text-red-700"
                >
                  <Trash2 class="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="filteredMatches.length > itemsPerPage" class="pagination">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredMatches.length) }} of {{ filteredMatches.length }} matches
        </div>
        
        <div class="flex items-center space-x-2">
          <Button 
            @click="currentPage--" 
            :disabled="currentPage === 1"
            variant="outline" 
            size="sm"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          
          <span class="text-sm">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          
          <Button 
            @click="currentPage++" 
            :disabled="currentPage === totalPages"
            variant="outline" 
            size="sm"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Match Edit Modal -->
    <MatchEditModal
      v-model:show="showEditModal"
      :match="selectedMatch"
      @updated="handleMatchUpdated"
    />

    <!-- Reschedule Modal -->
    <MatchRescheduleModal
      v-model:show="showRescheduleModal"
      :match="selectedMatch"
      @updated="handleMatchUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  RefreshCw, 
  CheckSquare, 
  Search, 
  X, 
  Calendar, 
  Play, 
  Ban, 
  Trash2, 
  Plus,
  Radio,
  Pause,
  CheckCircle,
  Eye,
  Edit,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import MatchEditModal from '@/components/matches/MatchEditModal.vue'
import MatchRescheduleModal from '@/components/matches/MatchRescheduleModal.vue'
import { useMatches } from '@/composables/useMatches'
import { useToast } from '@/composables/useToast'
import { liveMatchService } from '@/services/liveMatchService'
import type { Match } from '@/types/match'

interface Props {
  matches: Match[]
  loading?: boolean
}

const props = defineProps<Props>()
const router = useRouter()
const { updateMatch, deleteMatch: removeMatch } = useMatches()
const { success, error: showError } = useToast()

// State
const selectedMatches = ref<string[]>([])
const showBulkActions = ref(false)
const showEditModal = ref(false)
const showRescheduleModal = ref(false)
const selectedMatch = ref<Match | null>(null)
const liveMatches = ref(new Set<string>())
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Filters
const filters = ref({
  search: '',
  status: '',
  tournament: '',
  dateRange: '',
  startDate: '',
  endDate: ''
})

// Computed
const filteredMatches = computed(() => {
  let filtered = props.matches

  // Search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(match => 
      match.player1Name.toLowerCase().includes(search) ||
      match.player2Name?.toLowerCase().includes(search) ||
      match.tournamentLevel.toLowerCase().includes(search) ||
      match.roundNumber.toString().includes(search)
    )
  }

  // Status filter
  if (filters.value.status) {
    filtered = filtered.filter(match => match.status === filters.value.status)
  }

  // Tournament filter
  if (filters.value.tournament) {
    filtered = filtered.filter(match => match.tournamentLevel === filters.value.tournament)
  }

  // Date range filter
  if (filters.value.dateRange && filters.value.dateRange !== 'custom') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    filtered = filtered.filter(match => {
      if (!match.scheduledDateTime) return false
      const matchDate = new Date(match.scheduledDateTime)
      
      switch (filters.value.dateRange) {
        case 'today':
          return matchDate >= today && matchDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        case 'week':
          const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
          const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          return matchDate >= weekStart && matchDate < weekEnd
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          return matchDate >= monthStart && matchDate < monthEnd
        default:
          return true
      }
    })
  }

  // Custom date range filter
  if (filters.value.dateRange === 'custom' && filters.value.startDate && filters.value.endDate) {
    const startDate = new Date(filters.value.startDate)
    const endDate = new Date(filters.value.endDate)
    filtered = filtered.filter(match => {
      if (!match.scheduledDateTime) return false
      const matchDate = new Date(match.scheduledDateTime)
      return matchDate >= startDate && matchDate <= endDate
    })
  }

  return filtered
})

const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredMatches.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredMatches.value.length / itemsPerPage.value)
})

// Methods
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'in_progress': return 'destructive'
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'pending': return 'outline'
    case 'cancelled': return 'destructive'
    default: return 'outline'
  }
}

const isMatchLive = (matchId: string): boolean => {
  return liveMatches.value.has(matchId)
}

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'Not scheduled'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleSelection = (matchId: string) => {
  const index = selectedMatches.value.indexOf(matchId)
  if (index > -1) {
    selectedMatches.value.splice(index, 1)
  } else {
    selectedMatches.value.push(matchId)
  }
}

const selectAll = () => {
  selectedMatches.value = filteredMatches.value.map(match => match.id)
}

const clearSelection = () => {
  selectedMatches.value = []
}

const updateMatchStatus = async (matchId: string, status: string) => {
  try {
    await updateMatch(matchId, { status }, 'current_user')
    success(`Match ${status}`)
    refreshMatches()
  } catch (err) {
    showError(`Failed to update match status`)
  }
}

const bulkUpdateStatus = async (status: string) => {
  try {
    const promises = selectedMatches.value.map(matchId => 
      updateMatch(matchId, { status }, 'current_user')
    )
    await Promise.all(promises)
    success(`${selectedMatches.value.length} matches updated to ${status}`)
    selectedMatches.value = []
    refreshMatches()
  } catch (err) {
    showError('Failed to update matches')
  }
}

const bulkDelete = async () => {
  if (!confirm(`Are you sure you want to delete ${selectedMatches.value.length} matches?`)) {
    return
  }
  
  try {
    const promises = selectedMatches.value.map(matchId => removeMatch(matchId))
    await Promise.all(promises)
    success(`${selectedMatches.value.length} matches deleted`)
    selectedMatches.value = []
    refreshMatches()
  } catch (err) {
    showError('Failed to delete matches')
  }
}

const goLive = async (match: Match) => {
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
    router.push(`/matches/${match.id}/live`)
  } catch (err) {
    showError('Failed to make match live')
  }
}

const pauseMatch = async (matchId: string) => {
  try {
    await updateMatch(matchId, { status: 'paused' }, 'current_user')
    success('Match paused')
    refreshMatches()
  } catch (err) {
    showError('Failed to pause match')
  }
}

const completeMatch = async (matchId: string) => {
  try {
    await updateMatch(matchId, { 
      status: 'completed',
      actualEndTime: new Date().toISOString()
    }, 'current_user')
    success('Match completed')
    refreshMatches()
  } catch (err) {
    showError('Failed to complete match')
  }
}

const editMatch = (match: Match) => {
  selectedMatch.value = match
  showEditModal.value = true
}

const rescheduleMatch = (match: Match) => {
  selectedMatch.value = match
  showRescheduleModal.value = true
}

const deleteMatch = async (matchId: string) => {
  if (!confirm('Are you sure you want to delete this match?')) {
    return
  }
  
  try {
    await removeMatch(matchId)
    success('Match deleted')
    refreshMatches()
  } catch (err) {
    showError('Failed to delete match')
  }
}

const refreshMatches = () => {
  // Emit event to parent to refresh matches
  emit('refresh')
}

const handleMatchUpdated = () => {
  showEditModal.value = false
  showRescheduleModal.value = false
  selectedMatch.value = null
  refreshMatches()
}

const loadLiveMatches = async () => {
  try {
    const liveMatchIds = await liveMatchService.getLiveMatchIds()
    liveMatches.value = new Set(liveMatchIds)
  } catch (err) {
    console.error('Failed to load live matches:', err)
  }
}

// Watch for filter changes to reset pagination
watch(() => filters.value, () => {
  currentPage.value = 1
}, { deep: true })

// Emits
interface Emits {
  (e: 'refresh'): void
}

const emit = defineEmits<Emits>()

// Lifecycle
onMounted(() => {
  loadLiveMatches()
})
</script>

<style scoped>
.match-management-panel {
  space-y: 1.5rem;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-info h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.matches-grid {
  space-y: 1rem;
}

.match-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.match-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.match-card.selected {
  border-color: #3b82f6;
  background: #f8fafc;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.match-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.match-details {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
}

.match-actions {
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

@media (max-width: 768px) {
  .management-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .button-group {
    justify-content: center;
  }
}
</style>