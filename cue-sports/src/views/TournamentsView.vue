<template>
  <div class="space-y-6 p-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Tournaments</h1>
        <p class="text-muted-foreground">
          Manage cue sports tournaments across all levels and communities
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="refreshData" :disabled="loading">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
        <Button @click="openCreateDialog">
          <Plus class="h-4 w-4 mr-2" />
          Add Tournament
        </Button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search tournaments by name, location, or type..."
            class="pl-10"
            @input="debouncedSearch"
          />
        </div>
        <div class="flex gap-2">
          <Select v-model="selectedType" class="w-[140px]">
            <option value="all">All Types</option>
            <option value="community">Community</option>
            <option value="county">County</option>
            <option value="regional">Regional</option>
            <option value="national">National</option>
          </Select>
          
          <Select v-model="selectedStatus" class="w-[180px]">
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="registration_open">Registration Open</option>
            <option value="registration_closed">Registration Closed</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          
          <Select v-model="viewMode" class="w-[120px]">
            <option value="cards">Card View</option>
            <option value="table">Table View</option>
          </Select>
        </div>
      </div>
      
      <!-- Quick Filters -->
      <div class="flex gap-2 flex-wrap">
        <Button 
          size="sm" 
          variant="outline" 
          @click="toggleFilter('isFeatured')"
          :class="{ 'bg-primary text-primary-foreground': filters?.isFeatured }"
        >
          <Star class="h-3 w-3 mr-1" />
          Featured
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          @click="toggleFilter('isQualificationTournament')"
          :class="{ 'bg-primary text-primary-foreground': filters?.isQualificationTournament }"
        >
          <Trophy class="h-3 w-3 mr-1" />
          Qualification
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          @click="toggleFilter('registrationOpen')"
          :class="{ 'bg-primary text-primary-foreground': filters?.registrationOpen }"
        >
          <Users class="h-3 w-3 mr-1" />
          Open Registration
        </Button>
      </div>
      
      <!-- Stats Bar -->
      <div class="flex gap-4 text-sm text-muted-foreground">
        <span>Total Tournaments: <strong class="text-foreground">{{ totalTournaments }}</strong></span>
        <span>Active: <strong class="text-foreground">{{ activeTournaments }}</strong></span>
        <span>Total Prize Pool: <strong class="text-foreground">{{ formatCurrency(totalPrizePool, 'KES') }}</strong></span>
        <span>Total Registrations: <strong class="text-foreground">{{ totalRegistrations }}</strong></span>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedTournamentIds.length > 0" class="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
      <div class="flex items-center gap-4">
        <div class="text-sm">
          <span class="font-medium">
            {{ selectedTournamentIds.length }} tournament{{ selectedTournamentIds.length !== 1 ? 's' : '' }} selected
          </span>
          <span class="text-muted-foreground ml-2">•</span>
          <span class="text-muted-foreground ml-2">
            {{ selectedTournamentStats.totalPlayers }} players
          </span>
          <span class="text-muted-foreground ml-2">•</span>
          <span class="text-muted-foreground ml-2">
            {{ formatCurrency(selectedTournamentStats.totalPrizePool, 'KES') }} prize pool
          </span>
        </div>
        <Button size="sm" variant="outline" @click="clearSelection">
          Clear Selection
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Primary Actions -->
        <Button 
          size="sm" 
          @click="bulkInitializeMatches"
          :disabled="selectedTournamentIds.length === 0 || bulkInitializing"
        >
          <Cpu class="h-3 w-3 mr-1" :class="{ 'animate-pulse': bulkInitializing }" />
          {{ bulkInitializing ? 'Initializing...' : 'Initialize Matches' }}
        </Button>
        
        <!-- Secondary Actions -->
        <Button 
          size="sm" 
          variant="outline"
          @click="showBulkStatusModal = true"
          :disabled="selectedTournamentIds.length === 0"
        >
          <Settings class="h-3 w-3 mr-1" />
          Update Status
        </Button>
        
        <!-- More Actions Dropdown -->
        <div class="relative">
          <Button 
            size="sm" 
            variant="outline"
            @click="showMoreActions = !showMoreActions"
            :disabled="selectedTournamentIds.length === 0"
          >
            <MoreHorizontal class="h-3 w-3" />
          </Button>
          
          <div 
            v-if="showMoreActions"
            class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
          >
            <div class="py-1">
              <button
                @click="bulkExportData(); showMoreActions = false"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download class="h-3 w-3 inline mr-2" />
                Export Data
              </button>
              <button
                @click="bulkDuplicateTournaments(); showMoreActions = false"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Copy class="h-3 w-3 inline mr-2" />
                Duplicate Tournaments
              </button>
              <button
                @click="bulkArchiveTournaments(); showMoreActions = false"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Archive class="h-3 w-3 inline mr-2" />
                Archive Tournaments
              </button>
              <hr class="my-1 border-gray-200 dark:border-gray-600" />
              <button
                @click="bulkDeleteTournaments(); showMoreActions = false"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 class="h-3 w-3 inline mr-2" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-red-600">
      {{ error }}
    </div>

    <!-- Empty State -->
    <EmptyState 
      v-else-if="filteredTournaments.length === 0"
      title="No tournaments found"
      message="No tournaments match your current filters. Try adjusting your search criteria."
    />

    <!-- Card View -->
    <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TournamentCard
        v-for="tournament in paginatedTournaments"
        :key="tournament.id"
        :tournament="tournament"
        @edit="editTournament(tournament)"
        @register="registerForTournament(tournament)"
        @manage-registrations="manageRegistrations(tournament)"
        @delete="deleteTournamentConfirm(tournament)"
      />
    </div>

    <!-- Table View -->
    <div v-else-if="filteredTournaments.length > 0" class="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-12">
              <Checkbox 
                :checked="allSelected"
                @update:checked="toggleAllSelection"
              />
            </TableHead>
            <TableHead>Tournament</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registration</TableHead>
            <TableHead>Prize Pool</TableHead>
            <TableHead>Players</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="tournament in paginatedTournaments" :key="tournament.id">
            <TableCell>
              <Checkbox 
                :checked="selectedTournamentIds.includes(tournament.id)"
                @update:checked="toggleTournamentSelection(tournament.id)"
              />
            </TableCell>
            <TableCell class="font-medium">
              <div class="flex items-center space-x-3">
                <div v-if="tournament.bannerImage" class="w-10 h-10 rounded overflow-hidden">
                  <img :src="tournament.bannerImage" :alt="tournament.name" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  {{ getInitials(tournament.name) }}
                </div>
                <div>
                  <p class="font-medium">{{ tournament.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ tournament.location }}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="getTypeVariant(tournament.type)">
                {{ formatType(tournament.type) }}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge :variant="getStatusVariant(tournament.status)">
                {{ formatStatus(tournament.status) }}
              </Badge>
            </TableCell>
            <TableCell>
              <div class="text-sm">
                <p>{{ formatDate(tournament.registrationEndDate) }}</p>
                <p class="text-muted-foreground">{{ tournament.currentRegistrations }}/{{ tournament.maxPlayers }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="font-medium">{{ formatCurrency(tournament.prizePool, tournament.currency) }}</div>
              <div class="text-sm text-muted-foreground">{{ formatCurrency(tournament.entryFee, tournament.currency) }} entry</div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Users class="h-4 w-4 text-muted-foreground" />
                <span>{{ tournament.currentRegistrations }}/{{ tournament.maxPlayers }}</span>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button size="sm" variant="outline" @click="editTournament(tournament)">
                  <Edit class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" @click="manageRegistrations(tournament)">
                  <Users class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" @click="viewTournament(tournament)">
                  <Eye class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="destructive" @click="deleteTournamentConfirm(tournament)">
                  <Trash2 class="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        @click="currentPage--"
        :disabled="currentPage <= 1"
      >
        Previous
      </Button>
      <span class="flex items-center px-3 text-sm text-muted-foreground">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <Button 
        variant="outline" 
        size="sm" 
        @click="currentPage++"
        :disabled="currentPage >= totalPages"
      >
        Next
      </Button>
    </div>

    <!-- Tournament Details Dialog -->
    <TournamentDetails
      v-if="selectedTournament"
      :tournament="selectedTournament"
      :open="showDetailsDialog"
      @close="closeDetailsDialog"
      @updated="handleTournamentUpdated"
    />

    <!-- Tournament Creation Dialog -->
    <Dialog :open="showCreateDialog" @update:open="closeCreateDialog">
      <DialogContent class="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>
            Create a new tournament with all necessary details and configurations.
          </DialogDescription>
        </DialogHeader>
        
        <TournamentForm
          :loading="creatingTournament"
          @submit="handleCreateTournament"
          @cancel="closeCreateDialog"
        />
      </DialogContent>
    </Dialog>

    <!-- Delete Tournament Confirmation Dialog -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="Delete Tournament"
      :description="`Are you sure you want to delete '${selectedTournament?.name}'? This action cannot be undone and will remove all associated registrations and data.`"
      confirm-text="Delete Tournament"
      cancel-text="Cancel"
      :destructive="true"
      :loading="deletingTournament"
      @confirm="handleDeleteTournament"
      @cancel="showDeleteDialog = false"
    />

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      :open="showBulkDeleteDialog"
      title="Delete Multiple Tournaments"
      :description="`Are you sure you want to delete ${selectedTournamentIds.length} tournament${selectedTournamentIds.length !== 1 ? 's' : ''}? This action cannot be undone and will remove all associated registrations and data.`"
      confirm-text="Delete Tournaments"
      cancel-text="Cancel"
      :destructive="true"
      :loading="deletingTournament"
      @confirm="handleBulkDeleteTournaments"
      @cancel="showBulkDeleteDialog = false"
    />

    <!-- Bulk Status Update Modal -->
    <Dialog :open="showBulkStatusModal" @update:open="showBulkStatusModal = false">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Tournament Status</DialogTitle>
          <DialogDescription>
            Change the status for {{ selectedTournamentIds.length }} selected tournament{{ selectedTournamentIds.length !== 1 ? 's' : '' }}.
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">New Status</label>
            <select 
              v-model="bulkUpdateStatus"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select status...</option>
              <option value="upcoming">Upcoming</option>
              <option value="registration_open">Registration Open</option>
              <option value="registration_closed">Registration Closed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div class="flex justify-end space-x-2">
            <Button variant="outline" @click="showBulkStatusModal = false">Cancel</Button>
            <Button 
              @click="handleBulkStatusUpdate" 
              :disabled="!bulkUpdateStatus || updatingStatus"
            >
              {{ updatingStatus ? 'Updating...' : 'Update Status' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Star, 
  Trophy, 
  Users, 
  Edit, 
  Eye,
  Trash2,
  Cpu,
  Settings,
  Download,
  MoreHorizontal,
  Copy,
  Archive
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { collection, onSnapshot, FirestoreError, addDoc, Timestamp, updateDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useAuthStore } from '@/stores'
import { useTournaments } from '@/composables/useTournaments'
import { algorithmService } from '@/services/algorithmService'
import { autoFixRegistrationsCommunity } from '@/utils/fixRegistrationData'
import { safeToDate } from '@/utils/dateUtils'
import type { Tournament, TournamentFilters, CreateTournamentData } from '@/types/tournament'

// Components
import TournamentCard from '@/components/tournaments/TournamentCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TournamentDetails from '@/components/tournaments/TournamentDetails.vue'
import TournamentForm from '@/components/tournaments/TournamentForm.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogDescription from '@/components/ui/dialog-description.vue'

// UI Components
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import Select from '@/components/ui/select.vue'
import Badge from '@/components/ui/badge.vue'
import Checkbox from '@/components/ui/checkbox.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'

const router = useRouter()
const { success, error: showError } = useToast()
const authStore = useAuthStore()
const { deleteTournament } = useTournaments()

// State
const tournaments = ref<(Tournament & { id: string })[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedType = ref('all')
const selectedStatus = ref('all')
const viewMode = ref<'cards' | 'table'>('cards')
const currentPage = ref(1)
const pageSize = ref(12)
const selectedTournamentIds = ref<string[]>([])

// Filters
const filters = ref<TournamentFilters>({
  isFeatured: false,
  isQualificationTournament: false,
  registrationOpen: false
})

// Dialog states
const showDetailsDialog = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const showBulkStatusModal = ref(false)
const creatingTournament = ref(false)
const deletingTournament = ref(false)
const selectedTournament = ref<(Tournament & { id: string }) | null>(null)

// Bulk action states
const bulkInitializing = ref(false)
const updatingStatus = ref(false)
const bulkUpdateStatus = ref('')
const showMoreActions = ref(false)

// Computed properties
const filteredTournaments = computed(() => {
  let filtered = tournaments.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(tournament => 
      tournament.name.toLowerCase().includes(query) ||
      tournament.location.toLowerCase().includes(query) ||
      tournament.description.toLowerCase().includes(query) ||
      tournament.type.toLowerCase().includes(query) ||
      tournament.competitionLevel.toLowerCase().includes(query)
    )
  }

  // Filter by type
  if (selectedType.value !== 'all') {
    filtered = filtered.filter(tournament => tournament.type === selectedType.value)
  }

  // Filter by status
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(tournament => tournament.status === selectedStatus.value)
  }

  // Apply additional filters
  if (filters.value?.isFeatured) {
    filtered = filtered.filter(tournament => tournament.isFeatured)
  }

  if (filters.value?.isQualificationTournament) {
    filtered = filtered.filter(tournament => tournament.isQualificationTournament)
  }

  if (filters.value?.registrationOpen) {
    const now = new Date()
    filtered = filtered.filter(tournament => {
      const regStart = new Date(tournament.registrationStartDate as string)
      const regEnd = new Date(tournament.registrationEndDate as string)
      return tournament.status === 'registration_open' || 
             (now >= regStart && now <= regEnd && tournament.currentRegistrations < tournament.maxPlayers)
    })
  }

  return filtered
})

const paginatedTournaments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTournaments.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredTournaments.value.length / pageSize.value))

const totalTournaments = computed(() => tournaments.value.length)

const activeTournaments = computed(() => {
  return tournaments.value.filter(tournament => 
    tournament.status === 'ongoing' || tournament.status === 'registration_open'
  ).length
})

const totalPrizePool = computed(() => 
  tournaments.value.reduce((sum, tournament) => sum + (tournament.prizePool || 0), 0)
)

const totalRegistrations = computed(() => 
  tournaments.value.reduce((sum, tournament) => sum + (tournament.currentRegistrations || 0), 0)
)


const allSelected = computed(() => 
  paginatedTournaments.value.length > 0 && 
  paginatedTournaments.value.every(tournament => selectedTournamentIds.value.includes(tournament.id))
)

const someSelected = computed(() => 
  selectedTournamentIds.value.length > 0 && 
  !allSelected.value
)

const selectedTournamentStats = computed(() => {
  const selectedTournaments = tournaments.value.filter(t => 
    selectedTournamentIds.value.includes(t.id)
  )
  
  return {
    totalPlayers: selectedTournaments.reduce((sum, t) => sum + (t.currentRegistrations || 0), 0),
    totalPrizePool: selectedTournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0),
    statusBreakdown: selectedTournaments.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
})

// Methods
const loadTournaments = async () => {
  try {
    loading.value = true
    error.value = null
    
    console.log('Loading tournaments...')
    
    const db = getFirebaseDb()
    const tournamentsRef = collection(db, 'tournaments')
    
    const unsubscribe = onSnapshot(
      tournamentsRef,
      (snapshot) => {
        console.log('Tournaments snapshot received:', snapshot)
        const data = snapshot.docs.map(doc => {
          const docData = doc.data()
          console.log('Raw tournament data:', docData)
          return {
            id: doc.id,
            ...docData,
            // Ensure required arrays exist with defaults
            registeredPlayerIds: docData.registeredPlayerIds || [],
            qualifiedPlayersList: docData.qualifiedPlayersList || [],
            parentTournamentIds: docData.parentTournamentIds || [],
            childTournamentIds: docData.childTournamentIds || [],
            allowedCommunityIds: docData.allowedCommunityIds || [],
            currentRegistrations: docData.currentRegistrations || 0,
            maxPlayers: docData.maxPlayers || 16,
            prizePool: docData.prizePool || 0,
            entryFee: docData.entryFee || 0
          }
        }) as (Tournament & { id: string })[]
        
        console.log('Tournaments processed:', data)
        tournaments.value = data
        loading.value = false
      },
      (err: FirestoreError) => {
        console.error('Firestore error details:', err)
        error.value = 'Failed to load tournaments'
        loading.value = false
        showError('Error', 'Failed to load tournaments')
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('Load tournaments error:', err)
    error.value = 'Failed to load tournaments'
    loading.value = false
    showError('Error', 'Failed to load tournaments')
  }
}

const refreshData = async () => {
  await loadTournaments()
  success('Success', 'Tournaments refreshed')
}

const debouncedSearch = (() => {
  let timeout: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      currentPage.value = 1
    }, 300)
  }
})()

const toggleFilter = (filterKey: keyof TournamentFilters) => {
  if (filters.value) {
    filters.value[filterKey] = !filters.value[filterKey] as any
  }
  currentPage.value = 1
}

const openCreateDialog = () => {
  showCreateDialog.value = true
}

const editTournament = (tournament: Tournament & { id: string }) => {
  selectedTournament.value = tournament
  showDetailsDialog.value = true
}

const viewTournament = (tournament: Tournament & { id: string }) => {
  router.push({ name: 'TournamentDetail', params: { id: tournament.id } })
}

const registerForTournament = (tournament: Tournament & { id: string }) => {
  // TODO: Implement tournament registration
  console.log('Register for tournament:', tournament.id)
}

const manageRegistrations = (tournament: Tournament & { id: string }) => {
  // TODO: Open registration management modal
  console.log('Manage registrations for tournament:', tournament.id)
}

const deleteTournamentConfirm = (tournament: Tournament & { id: string }) => {
  selectedTournament.value = tournament
  showDeleteDialog.value = true
}

const handleDeleteTournament = async () => {
  if (!selectedTournament.value) return
  
  try {
    deletingTournament.value = true
    await deleteTournament(selectedTournament.value.id)
    success('Success', 'Tournament deleted successfully')
    showDeleteDialog.value = false
    selectedTournament.value = null
  } catch (error) {
    console.error('Error deleting tournament:', error)
    showError('Error', 'Failed to delete tournament')
  } finally {
    deletingTournament.value = false
  }
}

const toggleTournamentSelection = (tournamentId: string) => {
  const index = selectedTournamentIds.value.indexOf(tournamentId)
  if (index > -1) {
    selectedTournamentIds.value.splice(index, 1)
  } else {
    selectedTournamentIds.value.push(tournamentId)
  }
}

const toggleAllSelection = () => {
  if (allSelected.value) {
    selectedTournamentIds.value = selectedTournamentIds.value.filter(
      id => !paginatedTournaments.value.some(tournament => tournament.id === id)
    )
  } else {
    const currentPageIds = paginatedTournaments.value.map(tournament => tournament.id)
    selectedTournamentIds.value = [...new Set([...selectedTournamentIds.value, ...currentPageIds])]
  }
}

const clearSelection = () => {
  selectedTournamentIds.value = []
}

const bulkDeleteTournaments = () => {
  if (selectedTournamentIds.value.length === 0) return
  showBulkDeleteDialog.value = true
}

const handleBulkDeleteTournaments = async () => {
  if (selectedTournamentIds.value.length === 0) return
  
  try {
    deletingTournament.value = true
    
    // Delete tournaments one by one
    const deletePromises = selectedTournamentIds.value.map(id => deleteTournament(id))
    await Promise.all(deletePromises)
    
    success('Success', `${selectedTournamentIds.value.length} tournaments deleted successfully`)
    showBulkDeleteDialog.value = false
    clearSelection()
  } catch (error) {
    console.error('Error deleting tournaments:', error)
    showError('Error', 'Failed to delete some tournaments')
  } finally {
    deletingTournament.value = false
  }
}

// Bulk initialize matches for selected tournaments
const bulkInitializeMatches = async () => {
  if (selectedTournamentIds.value.length === 0) return
  
  const confirmed = confirm(
    `Initialize matches for ${selectedTournamentIds.value.length} tournament${selectedTournamentIds.value.length !== 1 ? 's' : ''}? This will:\n\n` +
    '• Auto-fix player registration data if needed\n' +
    '• Call the algorithm API for each tournament\n' +
    '• Generate matches based on registered players\n\n' +
    'This action may take a few minutes.'
  )
  
  if (!confirmed) return
  
  bulkInitializing.value = true
  let successCount = 0
  let errorCount = 0
  
  try {
    for (const tournamentId of selectedTournamentIds.value) {
      try {
        console.log(`🎯 Initializing tournament ${tournamentId}...`)
        
        // Try to auto-fix registration data first
        try {
          await autoFixRegistrationsCommunity(tournamentId)
        } catch (fixError) {
          console.warn('Could not auto-fix registration data:', fixError)
        }
        
        // Call algorithm to initialize matches
        const result = await algorithmService.initializeTournament({
          tournamentId: tournamentId,
          special: false,
          level: 'community',
          schedulingPreference: 'weekend'
        })
        
        if (result.success) {
          successCount++
          console.log(`✅ Tournament ${tournamentId} initialized successfully`)
        } else {
          errorCount++
          console.error(`❌ Tournament ${tournamentId} failed:`, result.error)
        }
        
      } catch (error) {
        errorCount++
        console.error(`❌ Error initializing tournament ${tournamentId}:`, error)
      }
    }
    
    // Show results
    if (successCount > 0 && errorCount === 0) {
      success('Success', `All ${successCount} tournaments initialized successfully`)
    } else if (successCount > 0 && errorCount > 0) {
      success('Partial Success', `${successCount} tournaments initialized, ${errorCount} failed`)
    } else {
      showError('Error', `Failed to initialize all ${errorCount} tournaments`)
    }
    
    clearSelection()
    
  } catch (error) {
    console.error('Bulk initialization error:', error)
    showError('Error', 'Failed to initialize tournaments')
  } finally {
    bulkInitializing.value = false
  }
}

// Bulk status update
const handleBulkStatusUpdate = async () => {
  if (!bulkUpdateStatus.value || selectedTournamentIds.value.length === 0) return
  
  updatingStatus.value = true
  let successCount = 0
  
  try {
    const db = getFirebaseDb()
    const updatePromises = selectedTournamentIds.value.map(async (tournamentId) => {
      const tournamentRef = doc(db, 'tournaments', tournamentId)
      await updateDoc(tournamentRef, {
        status: bulkUpdateStatus.value,
        updatedAt: Timestamp.now()
      })
    })
    
    await Promise.all(updatePromises)
    successCount = selectedTournamentIds.value.length
    
    success('Success', `Updated status for ${successCount} tournaments`)
    showBulkStatusModal.value = false
    bulkUpdateStatus.value = ''
    clearSelection()
    
  } catch (error) {
    console.error('Error updating tournament status:', error)
    showError('Error', 'Failed to update tournament status')
  } finally {
    updatingStatus.value = false
  }
}

// Export tournament data
const bulkExportData = async () => {
  if (selectedTournamentIds.value.length === 0) return
  
  try {
    const db = getFirebaseDb()
    const exportData = []
    
    // Get selected tournaments data
    for (const tournamentId of selectedTournamentIds.value) {
      const tournament = tournaments.value.find(t => t.id === tournamentId)
      if (tournament) {
        // Get registration data
        const registrationsRef = collection(db, 'tournament_registrations')
        const registrationsQuery = query(registrationsRef, where('tournamentId', '==', tournamentId))
        const registrationsSnapshot = await getDocs(registrationsQuery)
        
        const registrations = registrationsSnapshot.docs.map(doc => doc.data())
        
        exportData.push({
          tournament: {
            id: tournament.id,
            name: tournament.name,
            type: tournament.type,
            status: tournament.status,
            location: tournament.location,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            maxPlayers: tournament.maxPlayers,
            prizePool: tournament.prizePool,
            entryFee: tournament.entryFee
          },
          registrations: registrations
        })
      }
    }
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tournaments_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    success('Success', `Exported data for ${selectedTournamentIds.value.length} tournaments`)
    
  } catch (error) {
    console.error('Error exporting tournament data:', error)
    showError('Error', 'Failed to export tournament data')
  }
}

// Duplicate tournaments
const bulkDuplicateTournaments = async () => {
  if (selectedTournamentIds.value.length === 0) return
  
  const confirmed = confirm(
    `Create duplicates of ${selectedTournamentIds.value.length} tournament${selectedTournamentIds.value.length !== 1 ? 's' : ''}?\n\n` +
    'This will create new tournaments with "(Copy)" appended to their names.'
  )
  
  if (!confirmed) return
  
  try {
    const db = getFirebaseDb()
    let duplicatedCount = 0
    
    for (const tournamentId of selectedTournamentIds.value) {
      const tournament = tournaments.value.find(t => t.id === tournamentId)
      if (tournament) {
        const duplicateData = {
          ...tournament,
          name: `${tournament.name} (Copy)`,
          status: 'upcoming',
          currentRegistrations: 0,
          registeredPlayerIds: [],
          qualifiedPlayersList: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: authStore.user?.uid || 'unknown'
        }
        
        // Remove the id field since we're creating a new document
        delete (duplicateData as any).id
        
        await addDoc(collection(db, 'tournaments'), duplicateData)
        duplicatedCount++
      }
    }
    
    success('Success', `Created ${duplicatedCount} duplicate tournaments`)
    clearSelection()
    
  } catch (error) {
    console.error('Error duplicating tournaments:', error)
    showError('Error', 'Failed to duplicate tournaments')
  }
}

// Archive tournaments (change status to completed)
const bulkArchiveTournaments = async () => {
  if (selectedTournamentIds.value.length === 0) return
  
  const confirmed = confirm(
    `Archive ${selectedTournamentIds.value.length} tournament${selectedTournamentIds.value.length !== 1 ? 's' : ''}?\n\n` +
    'This will change their status to "completed" and they will no longer accept new registrations.'
  )
  
  if (!confirmed) return
  
  try {
    const db = getFirebaseDb()
    const updatePromises = selectedTournamentIds.value.map(async (tournamentId) => {
      const tournamentRef = doc(db, 'tournaments', tournamentId)
      await updateDoc(tournamentRef, {
        status: 'completed',
        updatedAt: Timestamp.now()
      })
    })
    
    await Promise.all(updatePromises)
    
    success('Success', `Archived ${selectedTournamentIds.value.length} tournaments`)
    clearSelection()
    
  } catch (error) {
    console.error('Error archiving tournaments:', error)
    showError('Error', 'Failed to archive tournaments')
  }
}

const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedTournament.value = null
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
}

const handleCreateTournament = async (tournamentData: CreateTournamentData) => {
  try {
    creatingTournament.value = true
    const db = getFirebaseDb()
    
    // Debug: Log the incoming tournament data
    console.log('Creating tournament with data:', tournamentData)
    
    // Validate required fields
    if (!tournamentData.name || !tournamentData.description) {
      throw new Error('Tournament name and description are required')
    }
    
    if (!tournamentData.location || !tournamentData.venue) {
      throw new Error('Tournament location and venue are required')
    }
    
    // Prepare tournament data for Firestore
    const newTournament = {
      // Basic information
      name: tournamentData.name,
      description: tournamentData.description,
      type: tournamentData.type,
      hierarchicalLevel: tournamentData.type, // Match type to hierarchical level
      competitionLevel: tournamentData.competitionLevel || 'Local Community Level',
      tournamentSeries: tournamentData.tournamentSeries || null,
      
      // Convert dates to Timestamps
      startDate: Timestamp.fromDate(tournamentData.startDate),
      endDate: Timestamp.fromDate(tournamentData.endDate),
      registrationStartDate: Timestamp.fromDate(tournamentData.registrationStartDate),
      registrationEndDate: Timestamp.fromDate(tournamentData.registrationEndDate),
      estimatedDuration: tournamentData.estimatedDuration,
      
      // Location and venue
      location: tournamentData.location,
      venue: tournamentData.venue,
      geographicalScope: tournamentData.geographicalScope || {},
      
      // Participation
      maxPlayers: tournamentData.maxPlayers || 16,
      expectedParticipants: tournamentData.expectedParticipants || 16,
      allowedCommunityIds: tournamentData.allowedCommunityIds || [],
      
      // Registration
      registrationCriteria: tournamentData.registrationCriteria || 'open_registration',
      qualificationRequirement: tournamentData.qualificationRequirement || 'open_registration',
      
      // Qualification settings
      isQualificationTournament: tournamentData.isQualificationTournament || false,
      progressionEnabled: tournamentData.progressionEnabled || false,
      qualificationCriteria: tournamentData.qualificationCriteria || null,
      qualifiesPlayerCount: tournamentData.qualifiesPlayerCount || null,
      nextLevelTournamentId: tournamentData.nextLevelTournamentId || null,
      
      // Financial
      entryFee: tournamentData.entryFee || 0,
      currency: tournamentData.currency || 'KES',
      prizePool: tournamentData.prizePool || 0,
      
      // Features
      isFeatured: tournamentData.isFeatured || false,
      isNationalTournament: tournamentData.isNationalTournament || false,
      
      // Media
      bannerImage: tournamentData.bannerImage || null,
      
      // Initialize arrays and counters
      registeredPlayerIds: [],
      qualifiedPlayersList: [],
      parentTournamentIds: [],
      childTournamentIds: [],
      currentRegistrations: 0,
      
      // Initialize invited players
      invitedPlayerIds: null,
      
      // Set default status
      status: 'upcoming' as const,
      
      // Add metadata
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: authStore.user?.uid || 'system'
    }
    
    // Debug: Log the prepared tournament object
    console.log('Prepared tournament object:', newTournament)
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'tournaments'), newTournament)
    console.log('Tournament created with ID:', docRef.id)
    
    success('Success', 'Tournament created successfully')
    closeCreateDialog()
    
  } catch (err: any) {
    console.error('Error creating tournament:', err)
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    })
    
    // Show more specific error message based on error type
    let errorMessage = 'Failed to create tournament'
    
    if (err.code === 'permission-denied') {
      errorMessage = 'Permission denied. You need administrator privileges to create tournaments. Please contact your system administrator.'
    } else if (err.code === 'unauthenticated') {
      errorMessage = 'Authentication required. Please log in and try again.'
    } else if (err.message) {
      errorMessage = err.message
    }
    
    showError('Error', errorMessage)
  } finally {
    creatingTournament.value = false
  }
}

const handleTournamentUpdated = () => {
  // Tournaments will be updated automatically via subscription
  success('Success', 'Tournament updated successfully')
}

// Utility functions
const getInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getStatusVariant = (status: string) => {
  const variants = {
    'upcoming': 'secondary' as const,
    'registration_open': 'default' as const,
    'registration_closed': 'outline' as const,
    'ongoing': 'default' as const,
    'completed': 'secondary' as const,
    'cancelled': 'destructive' as const
  }
  return variants[status as keyof typeof variants] || 'secondary' as const
}

const getTypeVariant = (type: string) => {
  const variants = {
    'community': 'secondary' as const,
    'county': 'default' as const,
    'regional': 'default' as const, 
    'national': 'default' as const
  }
  return variants[type as keyof typeof variants] || 'secondary' as const
}

const formatStatus = (status: string) => {
  const formats = {
    'upcoming': 'Upcoming',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'ongoing': 'Ongoing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
}

const formatType = (type: string) => {
  const formats = {
    'community': 'Community',
    'county': 'County',
    'regional': 'Regional',
    'national': 'National'
  }
  return formats[type as keyof typeof formats] || type
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'KES') {
    return `KES ${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

const formatDate = (date: string | Date | any) => {
  const dateValue = safeToDate(date)
  if (!dateValue) {
    return 'Invalid Date'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateValue)
}

// Watchers
watch([selectedType, selectedStatus, searchQuery], () => {
  currentPage.value = 1
  clearSelection()
})

// Click outside handler for dropdown
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showMoreActions.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadTournaments()
  document.addEventListener('click', handleClickOutside)
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>