<template>
  <div class="match-scheduler">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <h2 class="text-xl font-semibold text-gray-900">Match Scheduler</h2>
      <p class="text-sm text-gray-600 mt-1">
        Schedule matches and manage tournament calendar
      </p>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <select
          v-model="selectedTournamentId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="loadTournamentMatches"
        >
          <option value="">All Tournaments</option>
          <option
            v-for="tournament in activeTournaments"
            :key="tournament.id"
            :value="tournament.id"
          >
            {{ tournament.name }}
          </option>
        </select>
      </div>

      <div>
        <select
          v-model="selectedStatus"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="filterMatches"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      <div>
        <select
          v-model="selectedVenue"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="filterMatches"
        >
          <option value="">All Venues</option>
          <option
            v-for="venue in availableVenues"
            :key="venue"
            :value="venue"
          >
            {{ venue }}
          </option>
        </select>
      </div>

      <button
        @click="showCreateMatchModal = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 whitespace-nowrap"
      >
        + Create Match
      </button>
    </div>

    <!-- View Toggle -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <div class="flex bg-gray-100 rounded-lg p-1">
          <button
            :class="[
              'px-3 py-1 text-sm rounded-md transition-colors',
              currentView === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            ]"
            @click="currentView = 'calendar'"
          >
            Calendar
          </button>
          <button
            :class="[
              'px-3 py-1 text-sm rounded-md transition-colors',
              currentView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            ]"
            @click="currentView = 'list'"
          >
            List
          </button>
        </div>

        <div class="text-sm text-gray-600">
          {{ filteredMatches.length }} matches
        </div>
      </div>

      <div v-if="currentView === 'calendar'" class="flex items-center gap-2">
        <button
          @click="previousPeriod"
          class="p-1 text-gray-600 hover:text-gray-900"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <span class="text-sm font-medium text-gray-900 min-w-[120px] text-center">
          {{ formatPeriod(currentDate) }}
        </span>
        
        <button
          @click="nextPeriod"
          class="p-1 text-gray-600 hover:text-gray-900"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <button
          @click="goToToday"
          class="ml-2 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Today
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <LoadingSpinner />
      <p class="text-gray-600 mt-2">Loading matches...</p>
    </div>

    <!-- Calendar View -->
    <div v-else-if="currentView === 'calendar'" class="calendar-view">
      <!-- Calendar Header -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div
          v-for="day in weekDays"
          :key="day"
          class="p-2 text-center text-sm font-medium text-gray-700"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-1 bg-gray-200 rounded-lg overflow-hidden">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          :class="[
            'min-h-[120px] bg-white p-2',
            {
              'bg-gray-50 text-gray-400': !day.isCurrentMonth,
              'bg-blue-50': day.isToday
            }
          ]"
        >
          <!-- Date -->
          <div class="text-sm font-medium mb-1">
            {{ day.date.getDate() }}
          </div>

          <!-- Matches for this day -->
          <div class="space-y-1">
            <div
              v-for="match in getMatchesForDay(day.date)"
              :key="match.id"
              :class="[
                'text-xs p-1 rounded cursor-pointer',
                getMatchStatusColor(match.status)
              ]"
              @click="selectMatch(match)"
            >
              <div class="font-medium truncate">
                {{ formatMatchTime(match.scheduledDateTime) }}
              </div>
              <div class="truncate">
                {{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}
              </div>
            </div>
          </div>

          <!-- Add match button for current month days -->
          <button
            v-if="day.isCurrentMonth && !day.isPast"
            @click="createMatchForDay(day.date)"
            class="w-full text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded p-1 mt-1"
          >
            + Add Match
          </button>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="list-view">
      <div class="space-y-4">
        <div
          v-for="match in paginatedMatches"
          :key="match.id"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
          @click="selectMatch(match)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <span :class="['px-2 py-1 text-xs font-medium rounded-full', getMatchStatusColor(match.status)]">
                {{ getStatusLabel(match.status) }}
              </span>
              <span class="text-sm text-gray-600">
                Match #{{ match.matchNumber }}
              </span>
              <span class="text-sm text-gray-600">
                {{ match.roundNumber }}
              </span>
            </div>
            
            <div class="text-sm text-gray-600">
              {{ formatMatchDateTime(match.scheduledDateTime) }}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="font-medium text-gray-900 mb-1">Players</h4>
              <p class="text-sm text-gray-600">
                {{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}
              </p>
            </div>

            <div>
              <h4 class="font-medium text-gray-900 mb-1">Venue</h4>
              <p class="text-sm text-gray-600">
                {{ match.venueName || 'Not assigned' }}
                {{ match.tableNumber ? `(Table ${match.tableNumber})` : '' }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500">
              {{ match.tournamentId }} • {{ match.communityId }}
            </div>
            
            <div class="flex gap-2">
              <button
                v-if="canReschedule(match)"
                @click.stop="rescheduleMatch(match)"
                class="text-xs text-blue-600 hover:text-blue-800"
              >
                Reschedule
              </button>
              <button
                v-if="canCancel(match)"
                @click.stop="cancelMatch(match)"
                class="text-xs text-red-600 hover:text-red-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <nav class="flex items-center gap-2">
          <button
            :disabled="currentPage === 1"
            @click="currentPage--"
            class="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span class="px-3 py-2 text-sm text-gray-600">
            {{ currentPage }} of {{ totalPages }}
          </span>
          
          <button
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            class="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      </div>
    </div>

    <!-- Match Details Modal -->
    <div v-if="selectedMatch" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">
              Match Details
            </h3>
            <button
              @click="selectedMatch = null"
              class="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto">
          <MatchDetailsCard 
            :match="selectedMatch"
            :show-actions="true"
            @rescheduled="handleMatchRescheduled"
            @cancelled="handleMatchCancelled"
            @started="handleMatchStarted"
          />
        </div>
      </div>
    </div>

    <!-- Create Match Modal -->
    <div v-if="showCreateMatchModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">
              Create New Match
            </h3>
            <button
              @click="showCreateMatchModal = false"
              class="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <MatchCreationForm
            :pre-selected-tournament-id="selectedTournamentId"
            @match-created="handleMatchCreated"
            @cancel="showCreateMatchModal = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { useTournaments } from '@/composables/useTournaments'
import type { Match } from '@/types/match'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import MatchCreationForm from './MatchCreationForm.vue'
import MatchDetailsCard from './MatchDetailsCard.vue'

// Composables
const { 
  matches, 
  loading, 
  getMatchesByTournament, 
  rescheduleMatch: rescheduleMatchService,
  cancelMatch: cancelMatchService,
  startMatch
} = useMatches()
const { tournaments } = useTournaments()

// Local state
const currentView = ref<'calendar' | 'list'>('calendar')
const currentDate = ref(new Date())
const selectedTournamentId = ref('')
const selectedStatus = ref('')
const selectedVenue = ref('')
const selectedMatch = ref<Match | null>(null)
const showCreateMatchModal = ref(false)
const currentPage = ref(1)
const matchesPerPage = 20

// Calendar setup
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const activeTournaments = computed(() =>
  tournaments.value.filter(t => ['registration_open', 'ongoing'].includes(t.status))
)

const filteredMatches = computed(() => {
  let filtered = matches.value

  if (selectedTournamentId.value) {
    filtered = filtered.filter(m => m.tournamentId === selectedTournamentId.value)
  }

  if (selectedStatus.value) {
    filtered = filtered.filter(m => m.status === selectedStatus.value)
  }

  if (selectedVenue.value) {
    filtered = filtered.filter(m => m.venueName === selectedVenue.value)
  }

  return filtered
})

const paginatedMatches = computed(() => {
  const start = (currentPage.value - 1) * matchesPerPage
  const end = start + matchesPerPage
  return filteredMatches.value.slice(start, end)
})

const totalPages = computed(() =>
  Math.ceil(filteredMatches.value.length / matchesPerPage)
)

const availableVenues = computed(() => {
  const venues = new Set<string>()
  matches.value.forEach(match => {
    if (match.venueName) venues.add(match.venueName)
  })
  return Array.from(venues).sort()
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days = []
  const today = new Date()

  // Add days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isPast: date < today
    })
  }

  // Add days from current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isPast: date < today
    })
  }

  // Add days from next month to fill the grid
  const remainingCells = 42 - days.length
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isPast: date < today
    })
  }

  return days
})

// Methods
const loadTournamentMatches = async () => {
  if (selectedTournamentId.value) {
    await getMatchesByTournament(selectedTournamentId.value)
  }
}

const filterMatches = () => {
  currentPage.value = 1
}

const previousPeriod = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextPeriod = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const goToToday = () => {
  currentDate.value = new Date()
}

const formatPeriod = (date: Date): string => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString()
}

const getMatchesForDay = (date: Date): Match[] => {
  return filteredMatches.value.filter(match => {
    if (!match.scheduledDateTime) return false
    const matchDate = new Date(match.scheduledDateTime.toString())
    return isSameDay(matchDate, date)
  })
}

const formatMatchTime = (dateTime: any): string => {
  if (!dateTime) return ''
  const date = new Date(dateTime.toString())
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatMatchDateTime = (dateTime: any): string => {
  if (!dateTime) return 'Not scheduled'
  const date = new Date(dateTime.toString())
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
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

const getStatusLabel = (status: string): string => {
  const labels = {
    'pending': 'Pending',
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return labels[status] || status
}

const canReschedule = (match: Match): boolean => {
  return ['pending', 'scheduled'].includes(match.status)
}

const canCancel = (match: Match): boolean => {
  return ['pending', 'scheduled', 'in_progress'].includes(match.status)
}

const selectMatch = (match: Match) => {
  selectedMatch.value = match
}

const createMatchForDay = (date: Date) => {
  showCreateMatchModal.value = true
  // You could pre-fill the date in the form here
}

const rescheduleMatch = async (match: Match) => {
  // This would open a reschedule modal or inline editor
  const newDateTime = prompt('Enter new date/time (YYYY-MM-DD HH:MM):')
  if (newDateTime) {
    const date = new Date(newDateTime)
    await rescheduleMatchService(match.id, date, 'admin')
  }
}

const cancelMatch = async (match: Match) => {
  if (confirm('Are you sure you want to cancel this match?')) {
    await cancelMatchService(match.id, 'admin', 'Cancelled by admin')
  }
}

const handleMatchCreated = (matchId: string) => {
  showCreateMatchModal.value = false
  if (selectedTournamentId.value) {
    loadTournamentMatches()
  }
}

const handleMatchRescheduled = () => {
  selectedMatch.value = null
  if (selectedTournamentId.value) {
    loadTournamentMatches()
  }
}

const handleMatchCancelled = () => {
  selectedMatch.value = null
  if (selectedTournamentId.value) {
    loadTournamentMatches()
  }
}

const handleMatchStarted = () => {
  selectedMatch.value = null
  if (selectedTournamentId.value) {
    loadTournamentMatches()
  }
}

// Lifecycle
onMounted(() => {
  if (activeTournaments.value.length === 1) {
    selectedTournamentId.value = activeTournaments.value[0].id
    loadTournamentMatches()
  }
})

// Watch for filter changes
watch(selectedTournamentId, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.calendar-view {
  @apply w-full;
}

.list-view {
  @apply w-full;
}
</style>