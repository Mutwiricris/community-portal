<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Bulk Player Registration</DialogTitle>
        <DialogDescription>
          Register multiple players for "{{ tournamentName }}" tournament
        </DialogDescription>
        
        <!-- Performance Info -->
        <div v-if="!loading && players.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-blue-700">
              📊 {{ players.length }} total players loaded
            </span>
            <span class="text-blue-600">
              🔍 {{ registeredPlayerIds.length }} already registered
            </span>
            <span class="text-green-600">
              ✅ {{ players.length - registeredPlayerIds.length }} eligible
            </span>
          </div>
        </div>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Mode Selection -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium">Registration Mode</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              :class="[
                'cursor-pointer transition-all hover:shadow-md',
                registrationMode === 'multi_select' ? 'ring-2 ring-primary bg-primary/5' : ''
              ]"
              @click="registrationMode = 'multi_select'"
            >
              <CardContent class="p-4 text-center">
                <Users class="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 class="font-medium">Multi-Select</h4>
                <p class="text-sm text-muted-foreground">Select multiple players from list</p>
              </CardContent>
            </Card>
            
            <Card 
              :class="[
                'cursor-pointer transition-all hover:shadow-md',
                registrationMode === 'csv_upload' ? 'ring-2 ring-primary bg-primary/5' : ''
              ]"
              @click="registrationMode = 'csv_upload'"
            >
              <CardContent class="p-4 text-center">
                <FileSpreadsheet class="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 class="font-medium">CSV Upload</h4>
                <p class="text-sm text-muted-foreground">Upload player list via CSV file</p>
              </CardContent>
            </Card>
            
            <Card 
              :class="[
                'cursor-pointer transition-all hover:shadow-md',
                registrationMode === 'community_bulk' ? 'ring-2 ring-primary bg-primary/5' : ''
              ]"
              @click="registrationMode = 'community_bulk'"
            >
              <CardContent class="p-4 text-center">
                <MapPin class="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 class="font-medium">By Community</h4>
                <p class="text-sm text-muted-foreground">Register all players from communities</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <!-- Multi-Select Mode -->
        <div v-if="registrationMode === 'multi_select'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium">Select Players</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">{{ selectedPlayers.length }} selected</span>
              <Button size="sm" variant="outline" @click="clearSelection">
                Clear All
              </Button>
              <Button size="sm" variant="outline" @click="selectAllEligible">
                Select All Eligible
              </Button>
            </div>
          </div>

          <!-- Page Size Selector -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium">Show per page:</label>
              <select 
                :value="pageSize" 
                @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
                class="flex h-8 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="text-sm text-muted-foreground">
              Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }} players
              <span v-if="players.length !== paginationInfo.total" class="text-xs">
                ({{ players.length }} total)
              </span>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Search Players</label>
              <div class="relative">
                <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search by name or email..."
                  class="pl-10"
                />
              </div>
            </div>
            
            <div class="space-y-2">
              <label class="text-sm font-medium">Filter by Community</label>
              <select v-model="communityFilter" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">All Communities</option>
                <option v-for="community in availableCommunities" :key="community.id" :value="community.id">
                  {{ community.name }}
                </option>
              </select>
            </div>
            
            <div class="space-y-2">
              <label class="text-sm font-medium">Registration Status</label>
              <select v-model="statusFilter" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="eligible">Eligible Only</option>
                <option value="all">All Players</option>
                <option value="registered">Already Registered</option>
              </select>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center py-8">
            <div class="text-center">
              <LoadingSpinner />
              <p class="text-sm text-muted-foreground mt-2">Loading players...</p>
            </div>
          </div>

          <!-- Players Grid -->
          <div v-else-if="filteredPlayers.length === 0" class="text-center py-8">
            <Users class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 class="text-lg font-medium mb-2">No Players Found</h3>
            <p class="text-muted-foreground">
              {{ searchQuery || communityFilter ? 'No players match your search criteria.' : 'No eligible players found.' }}
            </p>
          </div>

          <div v-else class="space-y-4">
            <!-- Players List -->
            <div class="border rounded-lg">
              <div class="sticky top-0 bg-background border-b p-3 flex items-center justify-between">
                <div class="flex items-center">
                  <Checkbox 
                    :checked="isAllPageSelected"
                    @update:checked="toggleAllPageSelection"
                    class="mr-2"
                  />
                  <span class="text-sm font-medium">Select All on Page ({{ paginatedPlayers.length }})</span>
                </div>
                <div class="text-xs text-muted-foreground">
                  Page {{ currentPage }} of {{ totalPages }}
                </div>
              </div>
              
              <div class="divide-y max-h-80 overflow-y-auto">
                <div
                  v-for="player in paginatedPlayers"
                  :key="player.uid"
              :class="[
                'flex items-center space-x-3 p-3 border-b last:border-b-0 transition-colors',
                isPlayerSelected(player.uid) ? 'bg-primary/5' : 'hover:bg-muted/50'
              ]"
            >
              <Checkbox 
                :checked="isPlayerSelected(player.uid)"
                @update:checked="togglePlayerSelection(player)"
                :disabled="!isPlayerEligible(player)"
              />
              
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {{ getInitials(player.displayName) }}
              </div>
              
              <div class="flex-1">
                <p class="font-medium">{{ player.displayName || player.email || 'Unknown User' }}</p>
                <p class="text-sm text-muted-foreground">{{ player.email || 'No email' }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <Badge :variant="getUserTypeVariant(player.userType || 'player') as any" class="text-xs">
                    {{ formatUserType(player.userType || 'player') }}
                  </Badge>
                  <span v-if="player.geographicalContext?.community" class="text-xs text-muted-foreground">
                    {{ player.geographicalContext.community.name }}
                  </span>
                  <span v-else class="text-xs text-orange-600 font-medium">
                    No Community
                  </span>
                </div>
              </div>
              
              <div class="text-right">
                <div v-if="isPlayerAlreadyRegistered(player.uid)" class="text-yellow-600">
                  <Badge variant="secondary" class="text-xs">Already Registered</Badge>
                </div>
                <div v-else-if="!hasValidCommunity(player)" class="text-orange-600">
                  <Badge variant="outline" class="text-xs border-orange-600 text-orange-600">No Community</Badge>
                </div>
                <div v-else-if="isPlayerSelected(player.uid)" class="text-primary">
                  <CheckCircle class="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Controls -->
          <div v-if="totalPages > 1" class="flex items-center justify-between border-t pt-4">
              <div class="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  @click="goToFirstPage"
                  :disabled="currentPage === 1"
                >
                  First
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  @click="goToPreviousPage"
                  :disabled="currentPage === 1"
                >
                  Previous
                </Button>
              </div>

              <!-- Page Numbers -->
              <div class="flex items-center gap-1">
                <template v-for="page in getVisiblePages()" :key="page">
                  <Button
                    v-if="page !== '...'"
                    size="sm"
                    :variant="page === currentPage ? 'default' : 'outline'"
                    @click="goToPage(page as number)"
                    class="w-8"
                  >
                    {{ page }}
                  </Button>
                  <span v-else class="px-2 text-muted-foreground">...</span>
                </template>
              </div>

              <div class="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  @click="goToNextPage"
                  :disabled="currentPage === totalPages"
                >
                  Next
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  @click="goToLastPage"
                  :disabled="currentPage === totalPages"
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- CSV Upload Mode -->
        <div v-if="registrationMode === 'csv_upload'" class="space-y-4">
          <h3 class="text-lg font-medium">CSV File Upload</h3>
          
          <!-- CSV Template Download -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-blue-900">CSV Template</h4>
                <p class="text-sm text-blue-700">Download the template to see the required format</p>
              </div>
              <Button size="sm" variant="outline" @click="downloadCSVTemplate">
                <Download class="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <!-- File Upload -->
          <div class="space-y-4">
            <label class="text-sm font-medium">Upload CSV File</label>
            <div 
              :class="[
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              ]"
              @drop="handleFileDrop"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".csv"
                @change="handleFileSelect"
                class="hidden"
              />
              
              <FileSpreadsheet class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              
              <div v-if="!csvFile">
                <h4 class="font-medium mb-2">Drag and drop your CSV file here</h4>
                <p class="text-sm text-muted-foreground mb-4">or click to browse files</p>
                <Button @click="() => fileInput?.click()">
                  Choose File
                </Button>
              </div>
              
              <div v-else class="space-y-2">
                <h4 class="font-medium text-green-600">{{ csvFile.name }}</h4>
                <p class="text-sm text-muted-foreground">{{ csvFile.size }} bytes</p>
                <div class="flex justify-center gap-2">
                  <Button size="sm" @click="processCsvFile">
                    <FileText class="h-4 w-4 mr-2" />
                    Process File
                  </Button>
                  <Button size="sm" variant="outline" @click="clearCsvFile">
                    <X class="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- CSV Processing Results -->
          <div v-if="csvProcessingResults" class="space-y-4">
            <h4 class="font-medium">Processing Results</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 class="font-medium text-green-800">Valid Entries</h5>
                <p class="text-2xl font-bold text-green-600">{{ csvProcessingResults.valid.length }}</p>
              </div>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 class="font-medium text-yellow-800">Already Registered</h5>
                <p class="text-2xl font-bold text-yellow-600">{{ csvProcessingResults.alreadyRegistered.length }}</p>
              </div>
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 class="font-medium text-red-800">Invalid Entries</h5>
                <p class="text-2xl font-bold text-red-600">{{ csvProcessingResults.invalid.length }}</p>
              </div>
            </div>

            <!-- Show invalid entries -->
            <div v-if="csvProcessingResults.invalid.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 class="font-medium text-red-800 mb-2">Invalid Entries</h5>
              <div class="space-y-1 text-sm text-red-700">
                <div v-for="(error, index) in csvProcessingResults.invalid.slice(0, 10)" :key="index">
                  Row {{ error.row }}: {{ error.reason }}
                </div>
                <div v-if="csvProcessingResults.invalid.length > 10" class="text-red-600">
                  ... and {{ csvProcessingResults.invalid.length - 10 }} more errors
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Community Bulk Mode -->
        <div v-if="registrationMode === 'community_bulk'" class="space-y-4">
          <h3 class="text-lg font-medium">Register by Community</h3>
          
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Select Communities</label>
              <p class="text-sm text-muted-foreground">All eligible players from selected communities will be registered</p>
            </div>

            <!-- Community Search -->
            <div class="space-y-2">
              <label class="text-sm font-medium">Search Communities</label>
              <div class="relative">
                <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="communitySearchQuery"
                  placeholder="Search by community name..."
                  class="pl-10"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
              <div
                v-for="community in filteredCommunities"
                :key="community.id"
                :class="[
                  'border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md',
                  selectedCommunities.includes(community.id) ? 'ring-2 ring-primary bg-primary/5' : ''
                ]"
                @click="toggleCommunitySelection(community.id)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium">{{ community.name }}</h4>
                    <p class="text-sm text-muted-foreground">{{ community.county || 'Unknown County' }}</p>
                    <p class="text-xs text-muted-foreground">{{ getCommunityPlayerCount(community.id) }} eligible players</p>
                  </div>
                  <Checkbox 
                    :checked="selectedCommunities.includes(community.id)"
                    @update:checked="toggleCommunitySelection(community.id)"
                  />
                </div>
              </div>
            </div>

            <div v-if="selectedCommunities.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 class="font-medium text-blue-900">Registration Summary</h4>
              <p class="text-sm text-blue-700">
                {{ getTotalPlayersFromSelectedCommunities() }} players will be registered from {{ selectedCommunities.length }} communities
              </p>
            </div>
          </div>
        </div>

        <!-- Registration Summary -->
        <div v-if="getRegistrationCount() > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-medium text-green-800">Registration Summary</h4>
          <div class="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p class="text-sm text-green-700">Players to Register</p>
              <p class="text-xl font-bold text-green-600">{{ getRegistrationCount() }}</p>
            </div>
            <div>
              <p class="text-sm text-green-700">Total Entry Fees</p>
              <p class="text-xl font-bold text-green-600">{{ formatCurrency(getRegistrationCount() * (tournament?.entryFee || 0), 'KES') }}</p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="flex gap-2">
        <Button variant="outline" @click="$emit('close')">
          Cancel
        </Button>
        <Button 
          @click="registerPlayers" 
          :disabled="getRegistrationCount() === 0 || registering"
          class="min-w-32"
        >
          {{ registering ? 'Registering...' : `Register ${getRegistrationCount()} Players` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  Search, 
  Users, 
  CheckCircle, 
  FileSpreadsheet, 
  MapPin, 
  Download,
  FileText,
  X
} from 'lucide-vue-next'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  doc, 
  getDoc, 
  writeBatch
} from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores'
import type { UserProfile } from '@/composables/useAuth'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogDescription from '@/components/ui/dialog-description.vue'
import DialogFooter from '@/components/ui/dialog-footer.vue'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Checkbox from '@/components/ui/checkbox.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface Props {
  open: boolean
  tournamentId: string
  tournamentName: string
  tournament: any
}

interface CSVProcessingResult {
  valid: Array<{ email: string; name?: string; community?: string; row: number }>
  invalid: Array<{ row: number; reason: string; data: any }>
  alreadyRegistered: Array<{ email: string; name?: string; row: number }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  playersRegistered: [registrations: any[]]
}>()

const { success, error: showError } = useToast()

// State
const loading = ref(false)
const registering = ref(false)
const registrationMode = ref<'multi_select' | 'csv_upload' | 'community_bulk'>('multi_select')
const searchQuery = ref('')
const communityFilter = ref('')
const statusFilter = ref('eligible')
const communitySearchQuery = ref('')
const selectedPlayers = ref<UserProfile[]>([])
const selectedCommunities = ref<string[]>([])
const players = ref<UserProfile[]>([])
const availableCommunities = ref<any[]>([])
const registeredPlayerIds = ref<string[]>([])

// Pagination state
const currentPage = ref(1)
const pageSize = ref(10)
const totalPlayers = ref(0)

// CSV Upload State
const csvFile = ref<File | null>(null)
const isDragOver = ref(false)
const csvProcessingResults = ref<CSVProcessingResult | null>(null)
const fileInput = ref<HTMLInputElement>()

// Computed
const filteredPlayers = computed(() => {
  let filtered = players.value

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(player => {
      const name = player.displayName || ''
      const email = player.email || ''
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
    })
  }

  // Filter by community
  if (communityFilter.value) {
    filtered = filtered.filter(player => 
      player.geographicalContext?.community?.id === communityFilter.value
    )
  }

  // Filter by status
  if (statusFilter.value === 'eligible') {
    filtered = filtered.filter(player => isPlayerEligible(player))
  } else if (statusFilter.value === 'registered') {
    filtered = filtered.filter(player => isPlayerAlreadyRegistered(player.uid))
  }

  // Update total count
  totalPlayers.value = filtered.length

  return filtered
})

// Paginated players for current page
const paginatedPlayers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredPlayers.value.slice(startIndex, endIndex)
})

// Total pages calculation
const totalPages = computed(() => {
  return Math.ceil(totalPlayers.value / pageSize.value)
})

// Check if all players on current page are selected
const isAllPageSelected = computed(() => {
  const eligiblePlayers = paginatedPlayers.value.filter(p => isPlayerEligible(p))
  return eligiblePlayers.length > 0 && eligiblePlayers.every(p => isPlayerSelected(p.uid))
})

// Pagination info
const paginationInfo = computed(() => {
  const start = Math.min((currentPage.value - 1) * pageSize.value + 1, totalPlayers.value)
  const end = Math.min(currentPage.value * pageSize.value, totalPlayers.value)
  return { start, end, total: totalPlayers.value }
})

// Filtered communities for community bulk mode
const filteredCommunities = computed(() => {
  if (!communitySearchQuery.value.trim()) {
    return availableCommunities.value
  }
  
  const query = communitySearchQuery.value.toLowerCase()
  return availableCommunities.value.filter(community => 
    community.name.toLowerCase().includes(query) ||
    (community.county && community.county.toLowerCase().includes(query))
  )
})

// Methods
const loadPlayers = async () => {
  try {
    loading.value = true
    const db = getFirebaseDb()
    
    // Get all users with userType "player"
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('userType', '==', 'player'))
    
    const snapshot = await getDocs(q)
    players.value = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as UserProfile[]
    
  } catch (err) {
    console.error('Error loading players:', err)
    showError('Failed to load players')
  } finally {
    loading.value = false
  }
}

const loadCommunities = async () => {
  try {
    const db = getFirebaseDb()
    const communitiesRef = collection(db, 'communities')
    const snapshot = await getDocs(communitiesRef)
    
    availableCommunities.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (err) {
    console.error('Error loading communities:', err)
  }
}

const loadRegisteredPlayerIds = async () => {
  try {
    const db = getFirebaseDb()
    const registrationsRef = collection(db, 'tournament_registrations')
    const q = query(registrationsRef, where('tournamentId', '==', props.tournamentId))
    
    const snapshot = await getDocs(q)
    registeredPlayerIds.value = snapshot.docs.map(doc => doc.data().playerId)
  } catch (err) {
    console.error('Error loading registered player IDs:', err)
  }
}

const isPlayerSelected = (playerId: string): boolean => {
  return selectedPlayers.value.some(p => p.uid === playerId)
}

const isPlayerAlreadyRegistered = (playerId: string): boolean => {
  return registeredPlayerIds.value.includes(playerId)
}

const hasValidCommunity = (player: UserProfile): boolean => {
  return !!(player.geographicalContext?.community?.id && player.geographicalContext.community.name)
}

const isPlayerEligible = (player: UserProfile): boolean => {
  return hasValidCommunity(player) && !isPlayerAlreadyRegistered(player.uid)
}

const togglePlayerSelection = (player: UserProfile) => {
  if (!isPlayerEligible(player)) return
  
  const index = selectedPlayers.value.findIndex(p => p.uid === player.uid)
  if (index === -1) {
    selectedPlayers.value.push(player)
  } else {
    selectedPlayers.value.splice(index, 1)
  }
}

const toggleAllPageSelection = () => {
  const eligiblePlayers = paginatedPlayers.value.filter(p => isPlayerEligible(p))
  
  if (isAllPageSelected.value) {
    // Deselect all on current page
    eligiblePlayers.forEach(player => {
      const index = selectedPlayers.value.findIndex(p => p.uid === player.uid)
      if (index !== -1) {
        selectedPlayers.value.splice(index, 1)
      }
    })
  } else {
    // Select all eligible on current page
    eligiblePlayers.forEach(player => {
      if (!isPlayerSelected(player.uid)) {
        selectedPlayers.value.push(player)
      }
    })
  }
}

const selectAllEligible = () => {
  const eligiblePlayers = players.value.filter(p => isPlayerEligible(p))
  selectedPlayers.value = [...eligiblePlayers]
}

const clearSelection = () => {
  selectedPlayers.value = []
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const goToFirstPage = () => {
  currentPage.value = 1
}

const goToLastPage = () => {
  currentPage.value = totalPages.value
}

const goToPreviousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const changePageSize = (newSize: number) => {
  pageSize.value = newSize
  currentPage.value = 1 // Reset to first page when changing page size
}

// Get visible page numbers for pagination
const getVisiblePages = (): (number | string)[] => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)
    
    if (current <= 3) {
      // Near the beginning
      for (let i = 2; i <= 4; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 2) {
      // Near the end
      pages.push('...')
      for (let i = total - 3; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // In the middle
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

const toggleCommunitySelection = (communityId: string) => {
  const index = selectedCommunities.value.indexOf(communityId)
  if (index === -1) {
    selectedCommunities.value.push(communityId)
  } else {
    selectedCommunities.value.splice(index, 1)
  }
}

const getCommunityPlayerCount = (communityId: string): number => {
  return players.value.filter(p => 
    p.geographicalContext?.community?.id === communityId && isPlayerEligible(p)
  ).length
}

const getTotalPlayersFromSelectedCommunities = (): number => {
  return players.value.filter(p => 
    selectedCommunities.value.includes(p.geographicalContext?.community?.id || '') && 
    isPlayerEligible(p)
  ).length
}

const getRegistrationCount = (): number => {
  switch (registrationMode.value) {
    case 'multi_select':
      return selectedPlayers.value.length
    case 'csv_upload':
      return csvProcessingResults.value?.valid.length || 0
    case 'community_bulk':
      return getTotalPlayersFromSelectedCommunities()
    default:
      return 0
  }
}

// CSV Upload Methods
const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    handleFileSelect({ target: { files } } as any)
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type === 'text/csv') {
    csvFile.value = file
    csvProcessingResults.value = null
  } else {
    showError('Please select a valid CSV file')
  }
}

const clearCsvFile = () => {
  csvFile.value = null
  csvProcessingResults.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const downloadCSVTemplate = () => {
  const csvContent = 'email,name,community_name\nexample@email.com,John Doe,Community Name\n'
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'bulk_registration_template.csv'
  link.click()
  window.URL.revokeObjectURL(url)
}

const processCsvFile = async () => {
  if (!csvFile.value) return
  
  try {
    const text = await csvFile.value.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    const results: CSVProcessingResult = {
      valid: [],
      invalid: [],
      alreadyRegistered: []
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const rowData: any = {}
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || ''
      })
      
      // Validate required fields
      if (!rowData.email) {
        results.invalid.push({ row: i + 1, reason: 'Email is required', data: rowData })
        continue
      }
      
      // Find player by email
      const player = players.value.find(p => p.email === rowData.email)
      if (!player) {
        results.invalid.push({ row: i + 1, reason: 'Player not found', data: rowData })
        continue
      }
      
      // Check if already registered
      if (isPlayerAlreadyRegistered(player.uid)) {
        results.alreadyRegistered.push({ email: rowData.email, name: rowData.name, row: i + 1 })
        continue
      }
      
      // Check eligibility
      if (!isPlayerEligible(player)) {
        results.invalid.push({ row: i + 1, reason: 'Player not eligible (no community or already registered)', data: rowData })
        continue
      }
      
      results.valid.push({ email: rowData.email, name: rowData.name, community: rowData.community_name, row: i + 1 })
    }
    
    csvProcessingResults.value = results
    
  } catch (err) {
    console.error('Error processing CSV:', err)
    showError('Failed to process CSV file')
  }
}

const registerPlayers = async () => {
  if (getRegistrationCount() === 0) return
  
  try {
    registering.value = true
    const db = getFirebaseDb()
    const authStore = useAuthStore()
    const batch = writeBatch(db)
    const registrations: any[] = []
    
    let playersToRegister: UserProfile[] = []
    
    // Determine which players to register based on mode
    switch (registrationMode.value) {
      case 'multi_select':
        playersToRegister = selectedPlayers.value
        break
      case 'csv_upload':
        if (csvProcessingResults.value?.valid) {
          playersToRegister = csvProcessingResults.value.valid
            .map(item => players.value.find(p => p.email === item.email))
            .filter(Boolean) as UserProfile[]
        }
        break
      case 'community_bulk':
        playersToRegister = players.value.filter(p => 
          selectedCommunities.value.includes(p.geographicalContext?.community?.id || '') && 
          isPlayerEligible(p)
        )
        break
    }
    
    // Create registration documents
    for (const player of playersToRegister) {
      // Fetch community data
      let playerCommunity = {
        id: '',
        name: '',
        county: '',
        region: ''
      }

      if (player.geographicalContext?.community?.id) {
        try {
          const communityDoc = await getDoc(doc(db, 'communities', player.geographicalContext.community.id))
          if (communityDoc.exists()) {
            const communityData = communityDoc.data()
            playerCommunity = {
              id: communityDoc.id,
              name: communityData.name || player.geographicalContext.community.name || '',
              county: communityData.county || '',
              region: communityData.region || ''
            }
          }
        } catch (err) {
          console.warn('Could not fetch community data:', err)
          playerCommunity = {
            id: player.geographicalContext?.community?.id || '',
            name: player.geographicalContext?.community?.name || '',
            county: '',
            region: ''
          }
        }
      }
      
      const registrationData = {
        playerId: player.uid,
        tournamentId: props.tournamentId,
        tournamentName: props.tournamentName,
        playerName: player.displayName || player.email || 'Unknown User',
        playerEmail: player.email,
        playerAvatar: null,
        playerIds: [player.uid],
        communityId: playerCommunity.id,
        communityName: playerCommunity.name,
        hierarchicalLevel: props.tournament.hierarchicalLevel || 'community',
        isNationalTournament: props.tournament.isNationalTournament || false,
        entryFee: props.tournament.entryFee || 0,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        registeredAt: Timestamp.now(),
        confirmedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        paymentId: `payment_${player.uid}_${Date.now()}`,
        paymentCompletedAt: null,
        paymentMethod: 'cash' as const,
        registeredBy: authStore.user?.uid || 'system',
        metadata: {
          demoRegistration: false,
          registrationMethod: `bulk_registration_${registrationMode.value}`,
          paymentReference: `REF_${Date.now()}`,
          playerCommunityAtRegistration: playerCommunity
        }
      }
      
      const docRef = doc(collection(db, 'tournament_registrations'))
      batch.set(docRef, registrationData)
      registrations.push(registrationData)
    }
    
    // Update tournament registration count
    if (registrations.length > 0) {
      const tournamentRef = doc(db, 'tournaments', props.tournamentId)
      const tournamentDoc = await getDoc(tournamentRef)
      
      if (tournamentDoc.exists()) {
        const tournamentData = tournamentDoc.data()
        const currentCount = tournamentData.currentRegistrations || 0
        const currentPlayerIds = tournamentData.registeredPlayerIds || []
        
        const newPlayerIds = registrations.map(r => r.playerId)
        const updatedPlayerIds = [...new Set([...currentPlayerIds, ...newPlayerIds])]
        
        batch.update(tournamentRef, {
          currentRegistrations: currentCount + registrations.length,
          registeredPlayerIds: updatedPlayerIds
        })
      }
      
      await batch.commit()
      
      success(`Successfully registered ${registrations.length} players`)
      emit('playersRegistered', registrations)
      emit('close')
    }
    
  } catch (err) {
    console.error('Error registering players:', err)
    showError('Failed to register players')
  } finally {
    registering.value = false
  }
}

// Utility functions
const getInitials = (name: string | undefined | null) => {
  if (!name || typeof name !== 'string') {
    return '??'
  }
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getUserTypeVariant = (userType: string) => {
  const variants = {
    'administrator': 'destructive',
    'community_admin': 'default',
    'user': 'secondary',
    'player': 'success'
  }
  return variants[userType as keyof typeof variants] || 'secondary'
}

const formatUserType = (userType: string) => {
  const formats = {
    'administrator': 'Administrator',
    'community_admin': 'Community Admin',
    'user': 'User',
    'player': 'Player'
  }
  return formats[userType as keyof typeof formats] || userType
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

// Lifecycle
onMounted(() => {
  if (props.open) {
    loadPlayers()
    loadCommunities()
    loadRegisteredPlayerIds()
  }
})

// Watch for modal open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadPlayers()
    loadCommunities()
    loadRegisteredPlayerIds()
    
    // Reset state
    selectedPlayers.value = []
    selectedCommunities.value = []
    searchQuery.value = ''
    communityFilter.value = ''
    statusFilter.value = 'eligible'
    communitySearchQuery.value = ''
    registrationMode.value = 'multi_select'
    currentPage.value = 1
    pageSize.value = 10
    clearCsvFile()
  }
})

// Reset to first page when filters change
watch([searchQuery, communityFilter, statusFilter], () => {
  currentPage.value = 1
})
</script>