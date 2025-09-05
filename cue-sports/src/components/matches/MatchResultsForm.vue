<template>
  <div class="match-results-form">
    <!-- Form Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Submit Match Result</h3>
      <p class="text-sm text-gray-600 mt-1">
        Record the outcome of the match between {{ match.player1Name }} and {{ match.player2Name || 'BYE' }}
      </p>
    </div>

    <!-- Auto-populated Notice -->
    <div v-if="autoPopulated" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div>
          <h4 class="font-medium text-green-800">Form Auto-Populated</h4>
          <p class="text-sm text-green-700">Winner and scores have been automatically determined from live match data. You can review and modify if needed.</p>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-700">{{ error }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Match Overview -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Match Overview</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Match:</span>
            <span class="font-medium text-gray-900 ml-2">#{{ match.matchNumber }} - {{ match.roundNumber }}</span>
          </div>
          <div>
            <span class="text-gray-600">Type:</span>
            <span class="font-medium text-gray-900 ml-2">{{ getMatchTypeLabel(match.matchType) }}</span>
          </div>
          <div>
            <span class="text-gray-600">Tournament:</span>
            <span class="font-medium text-gray-900 ml-2">{{ match.tournamentId }}</span>
          </div>
          <div>
            <span class="text-gray-600">Started:</span>
            <span class="font-medium text-gray-900 ml-2">{{ formatDateTime(match.actualStartTime) }}</span>
          </div>
        </div>
      </div>

      <!-- Bye Match Result -->
      <div v-if="match.isByeMatch" class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <div>
              <h4 class="font-medium text-green-800">Automatic Advancement</h4>
              <p class="text-sm text-green-700">{{ match.player1Name }} automatically advances due to bye match.</p>
            </div>
          </div>
        </div>

        <input v-model="formData.winnerId" type="hidden" />
        <input v-model="formData.loserId" type="hidden" />
      </div>

      <!-- Regular Match Result -->
      <div v-else class="space-y-6">
        <!-- Winner Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">
            Select Winner {{ autoPopulated ? '(Auto-selected based on match data) *' : '*' }}
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Player 1 Option -->
            <div
              :class="[
                'border-2 rounded-lg p-4 cursor-pointer transition-all',
                formData.winnerId === match.player1Id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
              @click="selectWinner(match.player1Id)"
            >
              <div class="flex items-center gap-3">
                <input
                  :checked="formData.winnerId === match.player1Id"
                  type="radio"
                  class="h-4 w-4 text-green-600 focus:ring-green-500"
                  readonly
                />
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ match.player1Name }}</p>
                  <p class="text-sm text-gray-600">{{ match.player1CommunityId }}</p>
                  <p class="text-sm text-gray-500">{{ match.player1Points }} points</p>
                </div>
                <div v-if="formData.winnerId === match.player1Id" class="text-green-600">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Player 2 Option -->
            <div
              :class="[
                'border-2 rounded-lg p-4 cursor-pointer transition-all',
                formData.winnerId === match.player2Id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
              @click="selectWinner(match.player2Id || '')"
            >
              <div class="flex items-center gap-3">
                <input
                  :checked="formData.winnerId === match.player2Id"
                  type="radio"
                  class="h-4 w-4 text-green-600 focus:ring-green-500"
                  readonly
                />
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{{ match.player2Name }}</p>
                  <p class="text-sm text-gray-600">{{ match.player2CommunityId }}</p>
                  <p class="text-sm text-gray-500">{{ match.player2Points }} points</p>
                </div>
                <div v-if="formData.winnerId === match.player2Id" class="text-green-600">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Score Entry (Optional) -->
        <div class="space-y-4">
          <h4 class="text-sm font-medium text-gray-700">
            Score Details {{ autoPopulated ? '(Auto-filled from live match)' : '(Optional)' }}
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ match.player1Name }} Score
              </label>
              <input
                v-model.number="formData.player1Score"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter score"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ match.player2Name }} Score
              </label>
              <input
                v-model.number="formData.player2Score"
                type="number"
                min="0"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter score"
              />
            </div>
          </div>
        </div>

        <!-- Frame Details -->
        <div v-if="autoPopulated && liveMatchData" class="space-y-4">
          <h4 class="text-sm font-medium text-gray-700">
            Frame Details (From Live Match)
          </h4>
          
          <!-- Frame Summary -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ formData.player1FrameWins }}</div>
                <div class="text-gray-600">{{ match.player1Name }} Frames</div>
              </div>
              <div class="text-center">
                <div class="text-lg text-gray-500">VS</div>
                <div class="text-gray-600">{{ formData.totalFramesPlayed }} Total</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ formData.player2FrameWins }}</div>
                <div class="text-gray-600">{{ match.player2Name || 'Player 2' }} Frames</div>
              </div>
            </div>
          </div>
          
          <!-- Individual Frame Breakdown -->
          <div v-if="liveMatchData.frames && liveMatchData.frames.length > 0" class="space-y-3">
            <h5 class="text-sm font-medium text-gray-600">Frame Breakdown</h5>
            <div class="max-h-48 overflow-y-auto space-y-2">
              <div 
                v-for="frame in liveMatchData.frames.filter(f => f.isComplete)" 
                :key="frame.frameNumber"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div class="flex items-center gap-3">
                  <span class="font-medium text-gray-700">Frame {{ frame.frameNumber }}</span>
                  <span v-if="frame.winner === 'player1'" class="text-green-600 font-medium">
                    🏆 {{ match.player1Name }}
                  </span>
                  <span v-else-if="frame.winner === 'player2'" class="text-green-600 font-medium">
                    🏆 {{ match.player2Name || 'Player 2' }}
                  </span>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-gray-600">
                    {{ frame.player1Score }} - {{ frame.player2Score }}
                  </span>
                  <span v-if="frame.maxBreak > 0" class="text-orange-600 text-xs">
                    High: {{ frame.maxBreak }}
                  </span>
                  <span v-if="frame.duration" class="text-gray-500 text-xs">
                    {{ Math.floor(frame.duration / 60) }}m {{ frame.duration % 60 }}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Breaks Entry (Optional) -->
        <div v-if="match.maximumBreaks || formData.breaks.length > 0" class="space-y-4">
          <h4 class="text-sm font-medium text-gray-700">
            Breaks {{ autoPopulated && formData.breaks.length > 0 ? '(Auto-imported from live match)' : '(Optional)' }}
          </h4>
          
          <div class="space-y-3">
            <div
              v-for="(breakEntry, index) in formData.breaks"
              :key="index"
              :class="[
                'flex items-center gap-3 p-3 rounded-md',
                autoPopulated ? 'bg-green-50 border border-green-200' : 'border border-gray-200'
              ]"
            >
              <div v-if="autoPopulated" class="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md">
                <span class="text-gray-900">
                  {{ breakEntry.playerId === match.player1Id ? match.player1Name : (match.player2Name || 'Player 2') }}
                </span>
              </div>
              <select
                v-else
                v-model="breakEntry.playerId"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Player</option>
                <option :value="match.player1Id">{{ match.player1Name }}</option>
                <option :value="match.player2Id">{{ match.player2Name }}</option>
              </select>
              
              <div class="w-24 px-3 py-2 bg-white border border-gray-300 rounded-md text-center font-medium">
                {{ breakEntry.breakValue }}
              </div>
              
              <div class="w-20 px-3 py-2 bg-white border border-gray-300 rounded-md text-center text-sm text-gray-600">
                F{{ breakEntry.frameNumber }}
              </div>
              
              <button
                v-if="!autoPopulated"
                type="button"
                @click="removeBreak(index)"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
              <div v-else class="w-5"></div>
            </div>
            
            <button
              v-if="formData.breaks.length < (match.maximumBreaks || 5)"
              type="button"
              @click="addBreak"
              class="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              + Add Break
            </button>
          </div>
        </div>
      </div>

      <!-- Match End Time -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Match End Time *
        </label>
        <input
          v-model="formData.completedAt"
          type="datetime-local"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Match Notes (Optional)
        </label>
        <textarea
          v-model="formData.notes"
          rows="3"
          placeholder="Any additional notes about the match..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
      </div>

      <!-- Result Summary -->
      <div v-if="formData.winnerId" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="text-sm font-medium text-blue-800 mb-3">Result Summary</h4>
        <div class="text-sm text-blue-700 space-y-2">
          <div class="flex justify-between">
            <span><strong>Winner:</strong></span>
            <span class="text-green-700 font-medium">{{ getWinnerName() }}</span>
          </div>
          <div class="flex justify-between">
            <span><strong>Loser:</strong></span>
            <span>{{ getLoserName() }}</span>
          </div>
          <div v-if="hasScores()" class="flex justify-between">
            <span><strong>Final Score:</strong></span>
            <span class="font-medium">{{ getWinnerScore() }} - {{ getLoserScore() }}</span>
          </div>
          <div v-if="formData.totalFramesPlayed > 0" class="flex justify-between">
            <span><strong>Frames Won:</strong></span>
            <span class="font-medium">{{ getWinnerFrames }} - {{ getLoserFrames }}</span>
          </div>
          <div v-if="formData.totalFramesPlayed > 0" class="flex justify-between">
            <span><strong>Total Frames:</strong></span>
            <span>{{ formData.totalFramesPlayed }}</span>
          </div>
          <div v-if="formData.breaks.length > 0" class="flex justify-between">
            <span><strong>Breaks Recorded:</strong></span>
            <span>{{ formData.breaks.length }}</span>
          </div>
          <div v-if="getHighestBreak > 0" class="flex justify-between">
            <span><strong>Highest Break:</strong></span>
            <span class="text-orange-600 font-medium">{{ getHighestBreak }}</span>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          :disabled="!isFormValid || loading"
          class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Submitting...' : 'Submit Result' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { useAuth } from '@/composables/useAuth'
import { liveMatchService } from '@/services/liveMatchService'
import type { Match, MatchResult, MatchBreak } from '@/types/match'

interface Props {
  match: Match
}

interface Emits {
  (e: 'resultSubmitted', matchId: string): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { submitMatchResult, loading } = useMatches()
const { user } = useAuth()

// Form data
const formData = reactive({
  winnerId: '',
  loserId: '',
  player1Score: undefined as number | undefined,
  player2Score: undefined as number | undefined,
  player1FrameWins: 0,
  player2FrameWins: 0,
  totalFramesPlayed: 0,
  completedAt: '',
  notes: '',
  breaks: [] as MatchBreak[]
})

// Local state
const error = ref('')
const autoPopulated = ref(false)
const liveMatchData = ref<any>(null)

// Computed
const isFormValid = computed(() => {
  if (props.match.isByeMatch) {
    return formData.completedAt
  }
  
  return formData.winnerId && formData.loserId && formData.completedAt
})

// Methods
const selectWinner = (winnerId: string) => {
  formData.winnerId = winnerId
  // Automatically set loser based on winner selection
  if (winnerId === props.match.player1Id) {
    formData.loserId = props.match.player2Id || ''
  } else {
    formData.loserId = props.match.player1Id
  }
  console.log('🎯 Winner selected:', winnerId, 'Loser automatically set:', formData.loserId)
}

const addBreak = () => {
  formData.breaks.push({
    playerId: '',
    breakValue: 0,
    frameNumber: 1
  })
}

const removeBreak = (index: number) => {
  formData.breaks.splice(index, 1)
}

const getMatchTypeLabel = (type: string): string => {
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
  if (!timestamp) return 'Not started'
  const date = new Date(timestamp.toString())
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getWinnerName = (): string => {
  if (formData.winnerId === props.match.player1Id) {
    return props.match.player1Name
  } else if (formData.winnerId === props.match.player2Id) {
    return props.match.player2Name || ''
  }
  return ''
}

const getLoserName = (): string => {
  if (formData.loserId === props.match.player1Id) {
    return props.match.player1Name
  } else if (formData.loserId === props.match.player2Id) {
    return props.match.player2Name || ''
  }
  return ''
}

const hasScores = (): boolean => {
  return formData.player1Score !== undefined && formData.player2Score !== undefined
}

const getWinnerScore = (): number => {
  if (formData.winnerId === props.match.player1Id) {
    return formData.player1Score || 0
  } else {
    return formData.player2Score || 0
  }
}

const getLoserScore = (): number => {
  if (formData.loserId === props.match.player1Id) {
    return formData.player1Score || 0
  } else {
    return formData.player2Score || 0
  }
}

const getWinnerFrames = computed((): number => {
  if (formData.winnerId === props.match.player1Id) {
    return formData.player1FrameWins
  } else {
    return formData.player2FrameWins
  }
})

const getLoserFrames = computed((): number => {
  if (formData.loserId === props.match.player1Id) {
    return formData.player1FrameWins
  } else {
    return formData.player2FrameWins
  }
})

const getHighestBreak = computed((): number => {
  if (formData.breaks.length === 0) return 0
  return Math.max(...formData.breaks.map(b => b.breakValue))
})

const handleSubmit = async () => {
  if (!isFormValid.value) return
  
  error.value = ''
  
  try {
    // If this is from live match data, complete the live match first
    if (autoPopulated.value && liveMatchData.value && props.match.status === 'in_progress') {
      console.log('📺 Completing live match before result submission...')
      try {
        await liveMatchService.completeMatch(props.match.id, formData.winnerId, user.value?.uid || '')
        console.log('✅ Live match completed')
      } catch (liveError) {
        console.warn('⚠️ Could not complete live match:', liveError)
        // Continue with result submission anyway
      }
    }
    
    const result: MatchResult = {
      matchId: props.match.id,
      winnerId: formData.winnerId,
      loserId: formData.loserId,
      completedAt: new Date(formData.completedAt),
      submittedBy: user.value?.uid || '',
      notes: formData.notes || undefined,
      breaks: formData.breaks.filter(b => b.playerId && b.breakValue > 0)
    }

    // Add scores if provided
    if (hasScores()) {
      result.winnerScore = getWinnerScore()
      result.loserScore = getLoserScore()
    }

    console.log('📝 Submitting match result via form:', result)
    const updatedMatch = await submitMatchResult(result)
    
    if (updatedMatch) {
      console.log('✅ Match result submitted successfully')
      emit('resultSubmitted', updatedMatch.id)
    }
  } catch (err) {
    console.error('❌ Failed to submit match result:', err)
    error.value = err instanceof Error ? err.message : 'Failed to submit result'
  }
}

// Auto-populate from live match data
const autoPopulateFromLiveMatch = async () => {
  try {
    // Try to get live match state first
    const liveState = await liveMatchService.getLiveMatchState(props.match.id)
    
    if (liveState && liveState.frames) {
      console.log('📊 Auto-populating form from live match data...')
      liveMatchData.value = liveState
      
      // Calculate scores and frame wins from live data
      const completedFrames = liveState.frames.filter(f => f.isComplete)
      const frameWins = {
        player1: completedFrames.filter(f => f.winner === 'player1').length,
        player2: completedFrames.filter(f => f.winner === 'player2').length
      }
      
      // Get current frame scores
      const currentFrame = liveState.frames[liveState.currentFrame - 1]
      const currentScores = {
        player1: currentFrame ? currentFrame.player1Score : 0,
        player2: currentFrame ? currentFrame.player2Score : 0
      }
      
      // Determine winner: Use points as primary determinant, frames only if it's a multi-frame match
      let winner: 'player1' | 'player2'
      const totalFrames = frameWins.player1 + frameWins.player2
      
      // If we have actual scores (points), use those as primary determinant
      if (currentScores.player1 > 0 || currentScores.player2 > 0) {
        winner = currentScores.player1 > currentScores.player2 ? 'player1' : 'player2'
        console.log('🏆 Winner determined by points:', winner, `(${currentScores.player1}-${currentScores.player2})`)
      } 
      // Only use frame wins if no point scores available AND it's clearly a multi-frame match
      else if (totalFrames > 1 && (frameWins.player1 > 0 || frameWins.player2 > 0)) {
        winner = frameWins.player1 > frameWins.player2 ? 'player1' : 'player2'
        console.log('🏆 Winner determined by frames:', winner, `(${frameWins.player1}-${frameWins.player2})`)
      }
      // Fallback: if no scores or frames, default to player1 (this shouldn't happen)
      else {
        winner = 'player1'
        console.log('🏆 Winner defaulted to player1 (no valid scores found)')
      }
      
      // Auto-populate form
      formData.winnerId = winner === 'player1' ? props.match.player1Id : props.match.player2Id
      formData.loserId = winner === 'player1' ? props.match.player2Id : props.match.player1Id
      formData.player1Score = currentScores.player1
      formData.player2Score = currentScores.player2
      formData.player1FrameWins = frameWins.player1
      formData.player2FrameWins = frameWins.player2
      formData.totalFramesPlayed = frameWins.player1 + frameWins.player2
      
      // Extract breaks from live data
      const allBreaks: MatchBreak[] = []
      completedFrames.forEach(frame => {
        frame.breaks.forEach(breakRecord => {
          allBreaks.push({
            playerId: breakRecord.playerId,
            breakValue: breakRecord.breakValue,
            frameNumber: frame.frameNumber
          })
        })
      })
      formData.breaks = allBreaks
      
      // Auto-populate notes with match summary
      const winnerName = winner === 'player1' ? props.match.player1Name : props.match.player2Name
      formData.notes = `Match completed via live scoring. Final Result: ${winnerName} wins ${winner === 'player1' ? currentScores.player1 : currentScores.player2}-${winner === 'player1' ? currentScores.player2 : currentScores.player1} (${winner === 'player1' ? frameWins.player1 : frameWins.player2}-${winner === 'player1' ? frameWins.player2 : frameWins.player1} frames)`
      
      autoPopulated.value = true
      console.log('✅ Form auto-populated from live match data')
      
      return true
    }
  } catch (error) {
    console.log('⚠️ Could not fetch live match data:', error)
  }
  
  // Fallback: try to use stored match scores
  if (props.match.player1Score !== undefined && props.match.player2Score !== undefined) {
    console.log('📊 Auto-populating from stored match scores...')
    
    const winner = props.match.player1Score > props.match.player2Score ? 'player1' : 'player2'
    formData.winnerId = winner === 'player1' ? props.match.player1Id : props.match.player2Id
    formData.loserId = winner === 'player1' ? props.match.player2Id : props.match.player1Id
    formData.player1Score = props.match.player1Score
    formData.player2Score = props.match.player2Score
    formData.player1FrameWins = props.match.player1FrameWins || 0
    formData.player2FrameWins = props.match.player2FrameWins || 0
    formData.totalFramesPlayed = (props.match.player1FrameWins || 0) + (props.match.player2FrameWins || 0)
    
    const winnerName = winner === 'player1' ? props.match.player1Name : props.match.player2Name
    formData.notes = `Final Result: ${winnerName} wins ${props.match.player1Score}-${props.match.player2Score}`
    
    autoPopulated.value = true
    console.log('✅ Form auto-populated from stored match scores')
    return true
  }
  
  return false
}

// Initialize form
onMounted(async () => {
  // Set default completion time to now
  const now = new Date()
  formData.completedAt = now.toISOString().slice(0, 16)

  // For bye matches, automatically set the winner
  if (props.match.isByeMatch) {
    formData.winnerId = props.match.player1Id
    formData.loserId = ''
    return
  }
  
  // For in-progress matches, try to auto-populate from live/stored data
  if (props.match.status === 'in_progress') {
    await autoPopulateFromLiveMatch()
  }
})
</script>

<style scoped>
.match-results-form {
  @apply w-full;
}
</style>