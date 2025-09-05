<template>
  <div class="player-selector">
    <!-- Search and Filter Header -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search players by name, email, or community..."
          @input="handleSearch"
        />
      </div>
      
      <div class="flex gap-2">
        <select
          v-model="selectedCommunityFilter"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="handleCommunityFilter"
        >
          <option value="">All Communities</option>
          <option
            v-for="community in communities"
            :key="community.id"
            :value="community.id"
          >
            {{ community.name }}
          </option>
        </select>

        <select
          v-model="selectedPaymentFilter"
          class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @change="handlePaymentFilter"
        >
          <option value="">All Payment Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <button
        v-if="showClearButton"
        @click="clearFilters"
        class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
      >
        Clear Filters
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <LoadingSpinner />
      <p class="text-gray-600 mt-2">Loading players...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div class="text-red-600 mb-2">{{ error }}</div>
      <button
        @click="retryLoad"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPlayers.length === 0" class="text-center py-8">
      <div class="text-gray-600 mb-2">No players found</div>
      <p class="text-sm text-gray-500">
        {{ searchQuery ? 'Try adjusting your search or filters' : 'No eligible players available for this tournament' }}
      </p>
    </div>

    <!-- Players Grid -->
    <div v-else class="space-y-4">
      <!-- Selected Players Summary -->
      <div v-if="selectedPlayers.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 class="font-medium text-blue-900 mb-2">
          Selected Players ({{ selectedPlayers.length }})
        </h4>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="player in selectedPlayers"
            :key="player.id"
            class="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            <span>{{ player.name }}</span>
            <button
              @click="removePlayer(player.id)"
              class="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Community Groups -->
      <div v-if="groupByCommunity" class="space-y-6">
        <div
          v-for="(players, communityId) in groupedPlayers"
          :key="communityId"
          class="border border-gray-200 rounded-lg"
        >
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 class="font-medium text-gray-900">
              {{ getCommunityName(communityId) }}
              <span class="text-sm text-gray-500">({{ players.length }} players)</span>
            </h3>
          </div>
          <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PlayerCard
                v-for="player in players"
                :key="player.id"
                :player="player"
                :selected="isPlayerSelected(player.id)"
                :disabled="isPlayerDisabled(player.id)"
                @select="selectPlayer"
                @deselect="deselectPlayer"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Flat List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlayerCard
          v-for="player in filteredPlayers"
          :key="player.id"
          :player="player"
          :selected="isPlayerSelected(player.id)"
          :disabled="isPlayerDisabled(player.id)"
          @select="selectPlayer"
          @deselect="deselectPlayer"
        />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <nav class="flex items-center gap-2">
          <button
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
            class="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span class="px-3 py-2 text-sm text-gray-600">
            {{ currentPage }} of {{ totalPages }}
          </span>
          
          <button
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
            class="px-3 py-2 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </nav>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="showActions && selectedPlayers.length > 0" class="mt-6 flex justify-end gap-3">
      <button
        @click="clearSelection"
        class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        Clear Selection
      </button>
      
      <button
        @click="confirmSelection"
        :disabled="!canConfirmSelection"
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ confirmButtonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMatchPlayers, type MatchPlayer } from '@/composables/useMatchPlayers'
import SearchInput from '@/components/common/SearchInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PlayerCard from './PlayerCard.vue'

interface Props {
  tournamentId: string
  maxSelection?: number
  minSelection?: number
  groupByCommunity?: boolean
  showActions?: boolean
  confirmButtonText?: string
  excludePlayerIds?: string[]
  requireSameCommunity?: boolean
  autoLoadPlayers?: boolean
  useSimplifiedLoading?: boolean // Use tournament registeredPlayerIds directly instead of complex registration queries
}

interface Emits {
  (e: 'playersSelected', players: MatchPlayer[]): void
  (e: 'playerAdded', player: MatchPlayer): void
  (e: 'playerRemoved', playerId: string): void
  (e: 'selectionCleared'): void
}

const props = withDefaults(defineProps<Props>(), {
  maxSelection: undefined,
  minSelection: 1,
  groupByCommunity: true,
  showActions: true,
  confirmButtonText: 'Confirm Selection',
  excludePlayerIds: () => [],
  requireSameCommunity: false,
  autoLoadPlayers: true,
  useSimplifiedLoading: false
})

const emit = defineEmits<Emits>()

// Composables
const {
  availablePlayers,
  playersByCommunity,
  loading,
  error,
  loadRegisteredPlayers,
  loadPlayersFromTournament,
  searchPlayers,
  filterPlayers
} = useMatchPlayers()

// Local state
const selectedPlayers = ref<MatchPlayer[]>([])
const searchQuery = ref('')
const selectedCommunityFilter = ref('')
const selectedPaymentFilter = ref('')
const currentPage = ref(1)
const playersPerPage = 12

// Computed
const filteredPlayers = computed(() => {
  let players = availablePlayers.value

  // Apply search
  if (searchQuery.value.trim()) {
    players = searchPlayers(searchQuery.value)
  }

  // Apply filters
  const filterCriteria: any = {}
  if (selectedCommunityFilter.value) {
    filterCriteria.communityId = selectedCommunityFilter.value
  }
  if (selectedPaymentFilter.value) {
    filterCriteria.paymentStatus = selectedPaymentFilter.value
  }

  if (Object.keys(filterCriteria).length > 0) {
    players = filterPlayers(filterCriteria)
  }

  // Exclude specified players
  players = players.filter(p => !props.excludePlayerIds.includes(p.id))

  // Pagination
  const start = (currentPage.value - 1) * playersPerPage
  const end = start + playersPerPage
  
  return players.slice(start, end)
})

const groupedPlayers = computed(() => {
  if (!props.groupByCommunity) return {}
  
  const groups: Record<string, MatchPlayer[]> = {}
  filteredPlayers.value.forEach(player => {
    if (!groups[player.communityId]) {
      groups[player.communityId] = []
    }
    groups[player.communityId].push(player)
  })
  
  return groups
})

const communities = computed(() => {
  const communityMap = new Map()
  availablePlayers.value.forEach(player => {
    if (!communityMap.has(player.communityId)) {
      communityMap.set(player.communityId, {
        id: player.communityId,
        name: player.communityName
      })
    }
  })
  return Array.from(communityMap.values())
})

const totalPages = computed(() => {
  const totalPlayers = availablePlayers.value.filter(p => 
    !props.excludePlayerIds.includes(p.id)
  ).length
  return Math.ceil(totalPlayers / playersPerPage)
})

const showClearButton = computed(() => 
  searchQuery.value.trim() || selectedCommunityFilter.value || selectedPaymentFilter.value
)

const canConfirmSelection = computed(() => {
  const count = selectedPlayers.value.length
  if (count < props.minSelection) return false
  if (props.maxSelection && count > props.maxSelection) return false
  
  // Check same community requirement
  if (props.requireSameCommunity && count > 1) {
    const firstCommunity = selectedPlayers.value[0]?.communityId
    return selectedPlayers.value.every(p => p.communityId === firstCommunity)
  }
  
  return true
})

// Methods
const loadPlayers = async () => {
  if (props.tournamentId) {
    if (props.useSimplifiedLoading) {
      await loadPlayersFromTournament(props.tournamentId)
    } else {
      await loadRegisteredPlayers(props.tournamentId)
    }
  }
}

const retryLoad = () => {
  loadPlayers()
}

const selectPlayer = (player: MatchPlayer) => {
  if (isPlayerDisabled(player.id)) return
  
  if (props.maxSelection && selectedPlayers.value.length >= props.maxSelection) {
    return
  }
  
  if (!isPlayerSelected(player.id)) {
    selectedPlayers.value.push(player)
    emit('playerAdded', player)
  }
}

const deselectPlayer = (playerId: string) => {
  removePlayer(playerId)
}

const removePlayer = (playerId: string) => {
  const index = selectedPlayers.value.findIndex(p => p.id === playerId)
  if (index !== -1) {
    selectedPlayers.value.splice(index, 1)
    emit('playerRemoved', playerId)
  }
}

const isPlayerSelected = (playerId: string): boolean => {
  return selectedPlayers.value.some(p => p.id === playerId)
}

const isPlayerDisabled = (playerId: string): boolean => {
  if (props.excludePlayerIds.includes(playerId)) return true
  
  if (props.maxSelection && selectedPlayers.value.length >= props.maxSelection) {
    return !isPlayerSelected(playerId)
  }
  
  if (props.requireSameCommunity && selectedPlayers.value.length > 0) {
    const firstCommunity = selectedPlayers.value[0].communityId
    const player = availablePlayers.value.find(p => p.id === playerId)
    return player?.communityId !== firstCommunity
  }
  
  return false
}

const getCommunityName = (communityId: string): string => {
  const player = availablePlayers.value.find(p => p.communityId === communityId)
  return player?.communityName || communityId
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleCommunityFilter = () => {
  currentPage.value = 1
}

const handlePaymentFilter = () => {
  currentPage.value = 1
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCommunityFilter.value = ''
  selectedPaymentFilter.value = ''
  currentPage.value = 1
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const clearSelection = () => {
  selectedPlayers.value = []
  emit('selectionCleared')
}

const confirmSelection = () => {
  if (canConfirmSelection.value) {
    emit('playersSelected', [...selectedPlayers.value])
  }
}

// Lifecycle
onMounted(() => {
  if (props.autoLoadPlayers) {
    loadPlayers()
  }
})

// Watch for tournament changes
watch(() => props.tournamentId, (newTournamentId) => {
  if (newTournamentId && props.autoLoadPlayers) {
    clearSelection()
    loadPlayers()
  }
})

// Expose methods for parent component
defineExpose({
  loadPlayers,
  clearSelection,
  getSelectedPlayers: () => selectedPlayers.value,
  selectPlayerById: (playerId: string) => {
    const player = availablePlayers.value.find(p => p.id === playerId)
    if (player) selectPlayer(player)
  }
})
</script>

<style scoped>
.player-selector {
  @apply w-full;
}
</style>