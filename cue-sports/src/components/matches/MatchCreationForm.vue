<template>
  <div class="match-creation-form">
    <!-- Form Header -->
    <div class="border-b border-gray-200 pb-4 mb-6">
      <h2 class="text-xl font-semibold text-gray-900">Create New Match</h2>
      <p class="text-sm text-gray-600 mt-1">
        Set up a match between registered tournament players
      </p>
    </div>

    <!-- Validation Errors -->
    <div v-if="validationErrors.length > 0" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <h4 class="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
      <ul class="text-sm text-red-700 space-y-1">
        <li v-for="error in validationErrors" :key="error" class="flex items-start gap-2">
          <span class="text-red-500">•</span>
          {{ error }}
        </li>
      </ul>
    </div>

    <!-- Validation Warnings -->
    <div v-if="validationWarnings.length > 0" class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 class="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
      <ul class="text-sm text-yellow-700 space-y-1">
        <li v-for="warning in validationWarnings" :key="warning" class="flex items-start gap-2">
          <span class="text-yellow-500">•</span>
          {{ warning }}
        </li>
      </ul>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Tournament Selection -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Tournament Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tournament *
            </label>
            <select
              v-model="formData.tournamentId"
              required
              :disabled="tournamentsLoading"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              @change="handleTournamentChange"
            >
              <option value="">
                {{ tournamentsLoading ? 'Loading tournaments...' : availableTournaments.length === 0 ? 'No tournaments available' : 'Select Tournament' }}
              </option>
              <option
                v-for="tournament in availableTournaments"
                :key="tournament.id"
                :value="tournament.id"
              >
                {{ tournament.name }} ({{ tournament.hierarchicalLevel }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Community
            </label>
            <select
              v-model="formData.communityId"
              required
              :disabled="availableCommunities.length === 1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Community</option>
              <option
                v-for="community in availableCommunities"
                :key="community.id"
                :value="community.id"
              >
                {{ community.name }}
              </option>
            </select>
            <p v-if="availableCommunities.length === 1" class="text-xs text-gray-500 mt-1">
              <span class="inline-flex items-center">
                <svg class="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                Community automatically selected from tournament
              </span>
            </p>
          </div>
          
          <!-- Tournament Loading Debug Info -->
          <div class="text-xs text-gray-500 mt-2">
            <div v-if="tournamentsLoading" class="flex items-center text-blue-500">
              <svg class="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Loading tournaments from database...
            </div>
            <div v-else-if="tournaments.length === 0" class="text-orange-500">
              No tournaments found in database.
            </div>
            <div v-else-if="availableTournaments.length === 0" class="text-orange-500">
              {{ tournaments.length }} tournaments loaded, but none available for match creation.
            </div>
            <div v-else class="text-green-500">
              ✓ {{ tournaments.length }} total tournaments, {{ availableTournaments.length }} available for matches
            </div>
          </div>
        </div>

        <!-- Tournament Details Card -->
        <div v-if="selectedTournament" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-medium text-blue-900 mb-3">Tournament Details</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-blue-700 font-medium">Status:</span>
              <span class="ml-2 capitalize">{{ selectedTournament.status.replace('_', ' ') }}</span>
            </div>
            <div>
              <span class="text-blue-700 font-medium">Level:</span>
              <span class="ml-2 capitalize">{{ selectedTournament.hierarchicalLevel }}</span>
            </div>
            <div>
              <span class="text-blue-700 font-medium">Max Players:</span>
              <span class="ml-2">{{ selectedTournament.maxPlayers }}</span>
            </div>
            <div>
              <span class="text-blue-700 font-medium">Registered:</span>
              <span class="ml-2">{{ selectedTournament.currentRegistrations || 0 }}</span>
            </div>
            <div>
              <span class="text-blue-700 font-medium">Start Date:</span>
              <span class="ml-2">{{ formatDate(selectedTournament.startDate) }}</span>
            </div>
            <div>
              <span class="text-blue-700 font-medium">Entry Fee:</span>
              <span class="ml-2">{{ selectedTournament.currency }} {{ selectedTournament.entryFee }}</span>
            </div>
          </div>
          <div v-if="selectedTournament.description" class="mt-3 pt-3 border-t border-blue-200">
            <span class="text-blue-700 font-medium">Description:</span>
            <p class="text-blue-800 mt-1">{{ selectedTournament.description }}</p>
          </div>
        </div>

        <!-- Tournament Progress Card -->
        <div v-if="tournamentProgress" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-medium text-green-900 mb-3">Tournament Progress</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-green-700 font-medium">Total Matches:</span>
              <span class="ml-2">{{ tournamentProgress.totalMatches }}</span>
            </div>
            <div>
              <span class="text-green-700 font-medium">Completed:</span>
              <span class="ml-2">{{ tournamentProgress.completedMatches }}</span>
            </div>
            <div>
              <span class="text-green-700 font-medium">Ongoing:</span>
              <span class="ml-2">{{ tournamentProgress.ongoingMatches }}</span>
            </div>
            <div>
              <span class="text-green-700 font-medium">Progress:</span>
              <span class="ml-2">{{ tournamentProgress.completionPercentage }}%</span>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-green-200">
            <div class="flex flex-wrap gap-4 text-sm">
              <div>
                <span class="text-green-700 font-medium">Current Round:</span>
                <span class="ml-2">{{ tournamentProgress.currentRound || 'Not started' }}</span>
              </div>
              <div>
                <span class="text-green-700 font-medium">Suggested Next:</span>
                <span class="ml-2">{{ suggestedRoundNumber }} - Match {{ tournamentProgress.nextMatchNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Match Details -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Match Details</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Round Number *
            </label>
            <div class="flex gap-2">
              <input
                v-model="formData.roundNumber"
                type="text"
                required
                placeholder="e.g., R1, Community_SF"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                v-if="suggestedRoundNumber && suggestedRoundNumber !== formData.roundNumber"
                type="button"
                @click="formData.roundNumber = suggestedRoundNumber"
                class="px-3 py-2 text-xs bg-green-100 text-green-700 border border-green-300 rounded-md hover:bg-green-200"
                title="Use suggested round"
              >
                {{ suggestedRoundNumber }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Match Number *
            </label>
            <div class="flex gap-2">
              <input
                v-model.number="formData.matchNumber"
                type="number"
                required
                min="1"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                v-if="tournamentProgress && tournamentProgress.nextMatchNumber !== formData.matchNumber"
                type="button"
                @click="formData.matchNumber = tournamentProgress.nextMatchNumber"
                class="px-3 py-2 text-xs bg-green-100 text-green-700 border border-green-300 rounded-md hover:bg-green-200"
                title="Use suggested match number"
              >
                {{ tournamentProgress.nextMatchNumber }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Match Type *
            </label>
            <select
              v-model="formData.matchType"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="qualifying">Qualifying</option>
              <option value="elimination">Elimination</option>
              <option value="semi_final">Semi-Final</option>
              <option value="final">Final</option>
              <option value="positioning">Positioning</option>
              <option value="bye">Bye</option>
            </select>
          </div>
        </div>

        <!-- Match Properties -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="flex items-center">
            <input
              id="isLevelFinal"
              v-model="formData.isLevelFinal"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="isLevelFinal" class="ml-2 text-sm text-gray-700">
              Level Final Match
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="determinesTop3"
              v-model="formData.determinesTop3"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label for="determinesTop3" class="ml-2 text-sm text-gray-700">
              Determines Top 3
            </label>
          </div>

          <div class="flex items-center">
            <input
              id="isByeMatch"
              v-model="formData.isByeMatch"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              @change="handleByeMatchChange"
            />
            <label for="isByeMatch" class="ml-2 text-sm text-gray-700">
              Bye Match
            </label>
          </div>
        </div>

        <!-- Position Determination -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Determines Positions *
          </label>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="position in availablePositions"
              :key="position"
              class="flex items-center"
            >
              <input
                :id="`position-${position}`"
                v-model="selectedPositions"
                :value="position"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label :for="`position-${position}`" class="ml-2 text-sm text-gray-700">
                {{ formatPosition(position) }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Player Selection -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Player Selection</h3>
        
        <div v-if="!formData.isByeMatch" class="space-y-6">
          <!-- Player 1 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Player 1 *
            </label>
            <div v-if="selectedPlayer1" class="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                    {{ getPlayerInitials(selectedPlayer1.name) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ selectedPlayer1.name }}</p>
                    <p class="text-sm text-gray-600">{{ selectedPlayer1.communityName }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removePlayer1"
                  class="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              @click="showPlayer1Selector = true"
              class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              + Select Player 1
            </button>
          </div>

          <!-- Player 2 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Player 2 *
            </label>
            <div v-if="selectedPlayer2" class="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                    {{ getPlayerInitials(selectedPlayer2.name) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ selectedPlayer2.name }}</p>
                    <p class="text-sm text-gray-600">{{ selectedPlayer2.communityName }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removePlayer2"
                  class="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              @click="showPlayer2Selector = true"
              class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              + Select Player 2
            </button>
          </div>
        </div>

        <!-- Bye Match Player -->
        <div v-else>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Advancing Player *
            </label>
            <div v-if="selectedPlayer1" class="border border-gray-200 rounded-lg p-4 bg-green-50">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-medium">
                    {{ getPlayerInitials(selectedPlayer1.name) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ selectedPlayer1.name }}</p>
                    <p class="text-sm text-gray-600">{{ selectedPlayer1.communityName }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removePlayer1"
                  class="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              @click="showPlayer1Selector = true"
              class="w-full px-4 py-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:border-green-400 hover:text-green-800 transition-colors"
            >
              + Select Advancing Player
            </button>
          </div>
        </div>
      </div>

      <!-- Scheduling (Optional) -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Scheduling (Optional)</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date & Time
            </label>
            <input
              v-model="formData.scheduledDateTime"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Venue
            </label>
            <input
              v-model="formData.venueName"
              type="text"
              placeholder="Venue name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Venue Address
            </label>
            <input
              v-model="formData.venueAddress"
              type="text"
              placeholder="Venue address"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Table Number
            </label>
            <input
              v-model.number="formData.tableNumber"
              type="number"
              min="1"
              placeholder="Table number"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Additional Options -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Additional Options</h3>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Admin Notes
          </label>
          <textarea
            v-model="formData.adminNotes"
            rows="3"
            placeholder="Optional notes about this match..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Maximum Breaks
          </label>
          <input
            v-model.number="formData.maximumBreaks"
            type="number"
            min="0"
            placeholder="Maximum breaks allowed"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          @click="handleCancel"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          type="button"
          @click="validateForm"
          :disabled="loading"
          class="px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 disabled:opacity-50"
        >
          Validate
        </button>
        
        <button
          type="submit"
          :disabled="loading || !isFormValid"
          class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Creating...' : 'Create Match' }}
        </button>
      </div>
    </form>

    <!-- Player Selection Modals -->
    <div v-if="showPlayer1Selector || showPlayer2Selector" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">
            Select {{ showPlayer1Selector ? 'Player 1' : 'Player 2' }}
          </h3>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <PlayerSelector
            v-if="formData.tournamentId"
            :tournament-id="formData.tournamentId"
            :max-selection="1"
            :exclude-player-ids="getExcludedPlayerIds()"
            :require-same-community="false"
            :auto-load-players="true"
            :use-simplified-loading="true"
            @players-selected="handlePlayerSelected"
          />
        </div>
        
        <div class="p-6 border-t border-gray-200 flex justify-end">
          <button
            @click="closePlayerSelector"
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { useTournaments } from '@/composables/useTournaments'
import { useAuth } from '@/composables/useAuth'
import type { MatchCreationData } from '@/types/match'
import type { MatchPlayer } from '@/composables/useMatchPlayers'
import type { Tournament } from '@/types/tournament'
import PlayerSelector from './PlayerSelector.vue'

interface Props {
  preSelectedTournamentId?: string
}

interface Emits {
  (e: 'matchCreated', matchId: string): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { createMatch, loading, validationErrors, validationWarnings, validateMatchCreation, searchMatches } = useMatches()
const { tournaments, getTournament, loadAllTournaments, subscribeTournaments, createTournament, loading: tournamentsLoading } = useTournaments()
const { user } = useAuth()

// Form data
const formData = reactive<Partial<MatchCreationData>>({
  tournamentId: props.preSelectedTournamentId || '',
  tournamentLevel: 'community',
  roundNumber: '',
  matchNumber: 1,
  matchType: '',
  player1Id: '',
  player1Name: '',
  player1Points: 0,
  player1CommunityId: '',
  player2Id: '',
  player2Name: '',
  player2Points: 0,
  player2CommunityId: '',
  communityId: '',
  determinesPositions: [],
  isLevelFinal: false,
  determinesTop3: false,
  isByeMatch: false,
  scheduledDateTime: undefined,
  venueName: '',
  venueAddress: '',
  tableNumber: undefined,
  adminNotes: '',
  maximumBreaks: undefined,
  createdBy: user.value?.uid || ''
})

// Local state
const selectedTournament = ref<Tournament | null>(null)
const tournamentMatches = ref<any[]>([])
const selectedPlayer1 = ref<MatchPlayer | null>(null)
const selectedPlayer2 = ref<MatchPlayer | null>(null)
const selectedPositions = ref<number[]>([])
const showPlayer1Selector = ref(false)
const showPlayer2Selector = ref(false)

// Computed
const availableTournaments = computed(() => {
  const filtered = tournaments.value.filter(t => 
    ['registration_open', 'ongoing', 'registration_closed', 'upcoming'].includes(t.status)
  )
  
  // If no tournaments are loaded, provide a fallback message
  if (filtered.length === 0 && tournaments.value.length === 0) {
    return []
  }
  
  return filtered
})

const availableCommunities = computed(() => {
  const tournament = selectedTournament.value || tournaments.value.find(t => t.id === formData.tournamentId)
  if (!tournament) return []
  
  // For tournaments, the community is determined by the tournament's geographical scope
  if (tournament.geographicalScope?.communityId && tournament.geographicalScope?.communityName) {
    return [{
      id: tournament.geographicalScope.communityId,
      name: tournament.geographicalScope.communityName
    }]
  }
  
  // Fallback to allowed community IDs if geographical scope is not set
  if (tournament.allowedCommunityIds && tournament.allowedCommunityIds.length > 0) {
    return tournament.allowedCommunityIds.map(id => {
      // Extract readable name from community ID
      // Example: "COMM_KIAMBU_JUJA_005" -> "Kiambu Juja 005"
      const nameFromId = id
        .replace('COMM_', '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      
      return {
        id,
        name: nameFromId || id
      }
    })
  }
  
  // Default community based on tournament level and location
  const communityName = tournament.geographicalScope?.communityName || 
                        tournament.location || 
                        `${tournament.hierarchicalLevel} Community`
  return [{
    id: `community_${tournament.id}`,
    name: communityName
  }]
})

const availablePositions = computed(() => {
  return [1, 2, 3, 4, 5, 6, 7, 8]
})

const tournamentProgress = computed(() => {
  if (!selectedTournament.value || !tournamentMatches.value.length) return null
  
  const matches = tournamentMatches.value
  const totalMatches = matches.length
  const completedMatches = matches.filter(m => m.status === 'completed').length
  const ongoingMatches = matches.filter(m => m.status === 'ongoing').length
  const scheduledMatches = matches.filter(m => m.status === 'scheduled').length
  
  const rounds = [...new Set(matches.map(m => m.roundNumber))].sort()
  const currentRound = rounds[rounds.length - 1] || ''
  const nextMatchNumber = Math.max(...matches.map(m => m.matchNumber || 0), 0) + 1
  
  return {
    totalMatches,
    completedMatches,
    ongoingMatches,
    scheduledMatches,
    rounds,
    currentRound,
    nextMatchNumber,
    completionPercentage: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
  }
})

const suggestedRoundNumber = computed(() => {
  if (!tournamentProgress.value) return 'R1'
  const { currentRound } = tournamentProgress.value
  if (!currentRound) return 'R1'
  
  // Simple logic to suggest next round
  if (currentRound.startsWith('R')) {
    const roundNum = parseInt(currentRound.slice(1))
    return `R${roundNum + 1}`
  }
  return currentRound
})

const isFormValid = computed(() => {
  const required = [
    formData.tournamentId,
    formData.communityId,
    formData.roundNumber,
    formData.matchNumber,
    formData.matchType,
    formData.player1Id,
    selectedPositions.value.length > 0
  ]
  
  if (!formData.isByeMatch) {
    required.push(formData.player2Id)
  }
  
  return required.every(field => field)
})

// Methods
const loadTournamentData = async (tournamentId: string) => {
  if (!tournamentId) return
  
  try {
    const tournament = await getTournament(tournamentId)
    if (tournament) {
      selectedTournament.value = tournament
      formData.tournamentLevel = tournament.hierarchicalLevel as any
      
      // Auto-set community based on tournament's geographical scope or first available
      const communities = availableCommunities.value
      if (communities.length > 0) {
        formData.communityId = communities[0].id
      }
    }

    // Load existing matches for this tournament
    const searchResult = await searchMatches({ filters: { tournamentId } })
    tournamentMatches.value = searchResult.matches || []
    
    // Suggest next match number
    if (tournamentProgress.value) {
      formData.matchNumber = tournamentProgress.value.nextMatchNumber
      if (!formData.roundNumber) {
        formData.roundNumber = suggestedRoundNumber.value
      }
    }
  } catch (error) {
    console.error('Failed to load tournament:', error)
  }
}

const handleTournamentChange = async () => {
  // Reset selections
  selectedPlayer1.value = null
  selectedPlayer2.value = null
  formData.player1Id = ''
  formData.player2Id = ''
  formData.player1Name = ''
  formData.player2Name = ''
  formData.player1Points = 0
  formData.player2Points = 0
  formData.player1CommunityId = ''
  formData.player2CommunityId = ''
  formData.communityId = ''
  selectedTournament.value = null
  
  if (formData.tournamentId) {
    await loadTournamentData(formData.tournamentId)
  }
}

const handleByeMatchChange = () => {
  if (formData.isByeMatch) {
    selectedPlayer2.value = null
    formData.player2Id = ''
    formData.player2Name = ''
    formData.player2Points = 0
    formData.player2CommunityId = ''
  }
}

const handlePlayerSelected = (players: MatchPlayer[]) => {
  if (players.length === 0) return
  
  const player = players[0]
  
  if (showPlayer1Selector.value) {
    selectedPlayer1.value = player
    formData.player1Id = player.id
    formData.player1Name = player.name
    formData.player1Points = player.points
    formData.player1CommunityId = player.communityId
    
    if (!formData.communityId) {
      formData.communityId = player.communityId
    }
    
    showPlayer1Selector.value = false
  } else if (showPlayer2Selector.value) {
    selectedPlayer2.value = player
    formData.player2Id = player.id
    formData.player2Name = player.name
    formData.player2Points = player.points
    formData.player2CommunityId = player.communityId
    
    showPlayer2Selector.value = false
  }
}

const removePlayer1 = () => {
  selectedPlayer1.value = null
  formData.player1Id = ''
  formData.player1Name = ''
  formData.player1Points = 0
  formData.player1CommunityId = ''
}

const removePlayer2 = () => {
  selectedPlayer2.value = null
  formData.player2Id = ''
  formData.player2Name = ''
  formData.player2Points = 0
  formData.player2CommunityId = ''
}

const closePlayerSelector = () => {
  showPlayer1Selector.value = false
  showPlayer2Selector.value = false
}

const getExcludedPlayerIds = (): string[] => {
  const excluded: string[] = []
  if (selectedPlayer1.value) excluded.push(selectedPlayer1.value.id)
  if (selectedPlayer2.value) excluded.push(selectedPlayer2.value.id)
  return excluded
}

const getPlayerInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatPosition = (position: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = position % 100
  
  if (remainder >= 11 && remainder <= 13) {
    return `${position}th`
  }
  
  const suffix = suffixes[position % 10] || suffixes[0]
  return `${position}${suffix}`
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const validateForm = async () => {
  if (!isFormValid.value) return
  
  const matchData = buildMatchData()
  await validateMatchCreation(matchData)
}

const buildMatchData = (): MatchCreationData => {
  return {
    ...formData,
    determinesPositions: selectedPositions.value,
    scheduledDateTime: formData.scheduledDateTime ? new Date(formData.scheduledDateTime) : undefined,
    createdBy: user.value?.uid || ''
  } as MatchCreationData
}

const handleSubmit = async () => {
  if (!isFormValid.value) return
  
  const matchData = buildMatchData()
  const match = await createMatch(matchData, user.value?.uid || '')
  
  if (match) {
    emit('matchCreated', match.id)
  }
}

const handleCancel = () => {
  emit('cancel')
}

// Watch for position changes
watch(selectedPositions, (newPositions) => {
  formData.determinesPositions = newPositions
})

// Watch for available communities changes and auto-select
watch(availableCommunities, (newCommunities) => {
  if (newCommunities.length === 1 && !formData.communityId) {
    formData.communityId = newCommunities[0].id
  }
}, { immediate: true })

// Watch tournaments array for debugging
watch(tournaments, (newTournaments) => {
  console.log('Tournaments array updated:', newTournaments.length, 'tournaments')
  if (newTournaments.length > 0) {
    const tournament = newTournaments[0]
    console.log('Sample tournament:', tournament.name, '- Status:', tournament.status)
    console.log('Tournament ID:', tournament.id)
    console.log('Community scope:', tournament.geographicalScope?.communityName)
    console.log('Available for match creation:', availableTournaments.value.length)
  }
}, { immediate: true })

// Helper function to create sample tournaments if none exist
const createSampleTournaments = async () => {
  const sampleTournaments = [
    {
      name: 'Spring Championship 2025',
      hierarchicalLevel: 'community' as const,
      status: 'registration_open' as const,
      location: 'City Sports Center',
      venue: 'Main Hall',
      maxPlayers: 32,
      entryFee: 500,
      prizePool: 10000,
      currency: 'KES',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-17'),
      registrationStartDate: new Date('2025-02-01'),
      registrationEndDate: new Date('2025-03-10'),
      description: 'Annual spring championship tournament',
      competitionLevel: 'Community Level',
      type: 'community',
      isQualificationTournament: false,
      progressionEnabled: false,
      isFeatured: true,
      isNationalTournament: false,
      estimatedDuration: '3 days',
      createdBy: 'admin',
      geographicalScope: {
        communityId: 'community_001',
        communityName: 'Central Community'
      }
    },
    {
      name: 'County Championship 2025',
      hierarchicalLevel: 'county' as const,
      status: 'ongoing' as const,
      location: 'County Arena',
      venue: 'Championship Hall',
      maxPlayers: 64,
      entryFee: 1000,
      prizePool: 50000,
      currency: 'KES',
      startDate: new Date('2025-02-20'),
      endDate: new Date('2025-02-25'),
      registrationStartDate: new Date('2025-01-15'),
      registrationEndDate: new Date('2025-02-15'),
      description: 'Annual county championship',
      competitionLevel: 'County Level',
      type: 'county',
      isQualificationTournament: true,
      progressionEnabled: true,
      isFeatured: true,
      isNationalTournament: false,
      estimatedDuration: '5 days',
      createdBy: 'admin',
      geographicalScope: {
        communityId: 'community_002',
        communityName: 'North County'
      }
    }
  ]

  for (const tournament of sampleTournaments) {
    try {
      await createTournament(tournament)
      console.log('Created sample tournament:', tournament.name)
    } catch (error) {
      console.log('Sample tournament may already exist:', tournament.name)
    }
  }
}

// Lifecycle
onMounted(async () => {
  try {
    // Load all tournaments from Firestore
    console.log('Loading tournaments from Firestore...')
    const loadedTournaments = await loadAllTournaments()
    console.log('Loaded tournaments:', loadedTournaments?.length || 0, 'tournaments')
    
    // If no tournaments exist, create sample ones for testing (commented out - using real data)
    // if (!loadedTournaments || loadedTournaments.length === 0) {
    //   console.log('No tournaments found, creating sample tournaments...')
    //   await createSampleTournaments()
    //   await loadAllTournaments()
    // }
    
    // Also subscribe for real-time updates
    subscribeTournaments()
    
    // Load tournament data if pre-selected
    if (props.preSelectedTournamentId) {
      await loadTournamentData(props.preSelectedTournamentId)
    }
  } catch (error) {
    console.error('Failed to load tournaments:', error)
  }
})
</script>

<style scoped>
.match-creation-form {
  @apply max-w-4xl mx-auto;
}
</style>