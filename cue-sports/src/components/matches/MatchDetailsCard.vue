<template>
  <div class="match-details-card space-y-6">
    <!-- Match Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <h3 class="text-lg font-semibold text-gray-900">
            Match #{{ match.matchNumber }}
          </h3>
          <span :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusColor(match.status)]">
            {{ getStatusLabel(match.status) }}
          </span>
          <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {{ getTypeLabel(match.matchType) }}
          </span>
        </div>
        <p class="text-sm text-gray-600">
          {{ match.roundNumber }} • {{ match.tournamentLevel }}
        </p>
      </div>
      
      <div class="text-right">
        <p class="text-sm font-medium text-gray-900">
          {{ formatDateTime(match.scheduledDateTime) }}
        </p>
        <p class="text-xs text-gray-600">
          {{ getRelativeTime(match.scheduledDateTime) }}
        </p>
      </div>
    </div>

    <!-- Players -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Player 1 -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Player 1</h4>
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-medium">
            {{ getPlayerInitials(match.player1Name) }}
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-900">{{ match.player1Name }}</p>
            <p class="text-sm text-gray-600">{{ match.player1CommunityId }}</p>
            <p class="text-sm text-gray-500">{{ match.player1Points }} points</p>
          </div>
          <div v-if="match.winnerId === match.player1Id" class="text-green-600">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Player 2 or Bye -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">
          {{ match.isByeMatch ? 'Bye Match' : 'Player 2' }}
        </h4>
        <div v-if="!match.isByeMatch && match.player2Name" class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-medium">
            {{ getPlayerInitials(match.player2Name) }}
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-900">{{ match.player2Name }}</p>
            <p class="text-sm text-gray-600">{{ match.player2CommunityId }}</p>
            <p class="text-sm text-gray-500">{{ match.player2Points }} points</p>
          </div>
          <div v-if="match.winnerId === match.player2Id" class="text-green-600">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-16 text-gray-500">
          <div class="text-center">
            <svg class="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm">{{ match.player1Name }} advances automatically</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Match Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Venue & Schedule -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-3">Venue & Schedule</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Venue:</span>
            <span class="text-gray-900">{{ match.venueName || 'Not assigned' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Address:</span>
            <span class="text-gray-900">{{ match.venueAddress || 'Not provided' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Table:</span>
            <span class="text-gray-900">{{ match.tableNumber ? `Table ${match.tableNumber}` : 'Not assigned' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Scheduled:</span>
            <span class="text-gray-900">{{ formatDateTime(match.scheduledDateTime) }}</span>
          </div>
          <div v-if="match.actualStartTime" class="flex justify-between">
            <span class="text-gray-600">Started:</span>
            <span class="text-gray-900">{{ formatDateTime(match.actualStartTime) }}</span>
          </div>
          <div v-if="match.actualEndTime" class="flex justify-between">
            <span class="text-gray-600">Completed:</span>
            <span class="text-gray-900">{{ formatDateTime(match.actualEndTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Match Properties -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-3">Match Properties</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Tournament:</span>
            <span class="text-gray-900">{{ match.tournamentId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Community:</span>
            <span class="text-gray-900">{{ match.communityId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Determines Positions:</span>
            <span class="text-gray-900">{{ formatPositions(match.determinesPositions) }}</span>
          </div>
          <div v-if="match.isLevelFinal" class="flex justify-between">
            <span class="text-gray-600">Level Final:</span>
            <span class="text-green-600">Yes</span>
          </div>
          <div v-if="match.determinesTop3" class="flex justify-between">
            <span class="text-gray-600">Determines Top 3:</span>
            <span class="text-green-600">Yes</span>
          </div>
          <div v-if="match.maximumBreaks" class="flex justify-between">
            <span class="text-gray-600">Max Breaks:</span>
            <span class="text-gray-900">{{ match.maximumBreaks }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Result Information -->
    <div v-if="match.status === 'completed'" class="border border-green-200 bg-green-50 rounded-lg p-4">
      <h4 class="text-sm font-medium text-green-800 mb-3">Match Result</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-green-700">Winner:</span>
          <span class="font-medium text-green-900 ml-2">{{ match.winnerName }}</span>
        </div>
        <div>
          <span class="text-green-700">Result Submitted:</span>
          <span class="text-green-900 ml-2">{{ formatDateTime(match.resultSubmittedAt) }}</span>
        </div>
        <div v-if="match.resultSubmittedBy">
          <span class="text-green-700">Submitted By:</span>
          <span class="text-green-900 ml-2">{{ match.resultSubmittedBy }}</span>
        </div>
      </div>
    </div>

    <!-- Admin Notes -->
    <div v-if="match.adminNotes" class="border border-gray-200 rounded-lg p-4">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Admin Notes</h4>
      <p class="text-sm text-gray-600">{{ match.adminNotes }}</p>
    </div>

    <!-- Actions -->
    <div v-if="showActions" class="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
      <button
        v-if="canStart"
        @click="startMatch"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
      >
        Start Match
      </button>
      
      <button
        v-if="canSubmitResult"
        @click="showResultForm = true"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
      >
        Submit Result
      </button>
      
      <button
        v-if="canReschedule"
        @click="showRescheduleForm = true"
        class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
      >
        Reschedule
      </button>
      
      <button
        v-if="canCancel"
        @click="confirmCancel"
        class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
      >
        Cancel Match
      </button>
      
      <button
        @click="$emit('edit')"
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
      >
        Edit Details
      </button>
    </div>

    <!-- Reschedule Form Modal -->
    <div v-if="showRescheduleForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Reschedule Match</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                New Date & Time
              </label>
              <input
                v-model="rescheduleDateTime"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                v-model="rescheduleReason"
                rows="3"
                placeholder="Reason for rescheduling..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>
          
          <div class="flex justify-end gap-3 mt-6">
            <button
              @click="showRescheduleForm = false"
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="submitReschedule"
              :disabled="!rescheduleDateTime"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Result Form Modal -->
    <div v-if="showResultForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-lg w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Submit Match Result</h3>
          
          <MatchResultsForm
            :match="match"
            @result-submitted="handleResultSubmitted"
            @cancel="showResultForm = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { useAuth } from '@/composables/useAuth'
import type { Match } from '@/types/match'
import MatchResultsForm from './MatchResultsForm.vue'

interface Props {
  match: Match
  showActions?: boolean
}

interface Emits {
  (e: 'started'): void
  (e: 'rescheduled'): void
  (e: 'cancelled'): void
  (e: 'resultSubmitted'): void
  (e: 'edit'): void
}

const props = withDefaults(defineProps<Props>(), {
  showActions: false
})

const emit = defineEmits<Emits>()

// Composables
const { startMatch: startMatchService, rescheduleMatch: rescheduleMatchService, cancelMatch: cancelMatchService } = useMatches()
const { user } = useAuth()

// Local state
const showRescheduleForm = ref(false)
const showResultForm = ref(false)
const rescheduleDateTime = ref('')
const rescheduleReason = ref('')

// Computed
const canStart = computed(() => {
  return props.match.status === 'scheduled' && 
         props.match.scheduledDateTime && 
         new Date() >= new Date(props.match.scheduledDateTime.toString())
})

const canSubmitResult = computed(() => {
  return props.match.status === 'in_progress'
})

const canReschedule = computed(() => {
  return ['pending', 'scheduled'].includes(props.match.status)
})

const canCancel = computed(() => {
  return ['pending', 'scheduled', 'in_progress'].includes(props.match.status)
})

// Methods
const getPlayerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getStatusColor = (status: string): string => {
  const colors = {
    'pending': 'bg-gray-100 text-gray-800',
    'scheduled': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'disputed': 'bg-orange-100 text-orange-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string): string => {
  const labels = {
    'pending': 'Pending',
    'scheduled': 'Scheduled',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'disputed': 'Disputed'
  }
  return labels[status] || status
}

const getTypeLabel = (type: string): string => {
  const labels = {
    'qualifying': 'Qualifying',
    'elimination': 'Elimination',
    'semi_final': 'Semi-Final',
    'final': 'Final',
    'positioning': 'Positioning',
    'bye': 'Bye'
  }
  return labels[type] || type
}

const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return 'Not scheduled'
  const date = new Date(timestamp.toString())
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getRelativeTime = (timestamp: any): string => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp.toString())
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`
  } else if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else {
    return `In ${diffDays} days`
  }
}

const formatPositions = (positions: number[]): string => {
  if (!positions || positions.length === 0) return 'None'
  return positions.map(p => {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const remainder = p % 100
    if (remainder >= 11 && remainder <= 13) {
      return `${p}th`
    }
    const suffix = suffixes[p % 10] || suffixes[0]
    return `${p}${suffix}`
  }).join(', ')
}

const startMatch = async () => {
  const success = await startMatchService(props.match.id, user.value?.uid || '')
  if (success) {
    emit('started')
  }
}

const submitReschedule = async () => {
  if (!rescheduleDateTime.value) return
  
  const newDate = new Date(rescheduleDateTime.value)
  const success = await rescheduleMatchService(props.match.id, newDate, user.value?.uid || '')
  
  if (success) {
    showRescheduleForm.value = false
    rescheduleDateTime.value = ''
    rescheduleReason.value = ''
    emit('rescheduled')
  }
}

const confirmCancel = () => {
  if (confirm('Are you sure you want to cancel this match?')) {
    cancelMatch()
  }
}

const cancelMatch = async () => {
  const success = await cancelMatchService(props.match.id, user.value?.uid || '', 'Cancelled by admin')
  if (success) {
    emit('cancelled')
  }
}

const handleResultSubmitted = () => {
  showResultForm.value = false
  emit('resultSubmitted')
}
</script>

<style scoped>
.match-details-card {
  @apply w-full;
}
</style>