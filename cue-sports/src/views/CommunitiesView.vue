<template>
  <div class="space-y-6 p-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Communities</h1>
        <p class="text-muted-foreground">
          Manage cue sports communities and their members
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="refreshData" :disabled="loading">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
        <Button @click="openCreateDialog">
          <Plus class="h-4 w-4 mr-2" />
          Add Community
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
            placeholder="Search communities by name, location, or tags..."
            class="pl-10"
            @input="debouncedSearch"
          />
        </div>
        <div class="flex gap-2">
          <Select v-model="selectedCounty" class="w-[180px]">
            <option value="all">All Counties</option>
            <option v-for="county in uniqueCounties" :key="county" :value="county">
              {{ county }}
            </option>
          </Select>
          
          <Select v-model="viewMode" class="w-[120px]">
            <option value="cards">Card View</option>
            <option value="table">Table View</option>
          </Select>
        </div>
      </div>
      
      <!-- Stats Bar -->
      <div class="flex gap-4 text-sm text-muted-foreground">
        <span>Total Communities: <strong class="text-foreground">{{ totalCommunities }}</strong></span>
        <span>Active: <strong class="text-foreground">{{ activeCommunities }}</strong></span>
        <span>Total Members: <strong class="text-foreground">{{ totalMembers }}</strong></span>
        <span>Total Admins: <strong class="text-foreground">{{ totalAdmins }}</strong></span>
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
      v-else-if="filteredCommunities.length === 0"
      title="No communities found"
      description="No communities match your current filters. Try adjusting your search criteria."
      icon="Building"
    />

    <!-- Card View -->
    <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CommunityCard
        v-for="community in paginatedCommunities"
        :key="community.id"
        :community="community"
        @edit="editCommunity(community)"
        @manage-admins="manageAdmins(community)"
        @manage-members="manageMembers(community)"
      />
    </div>

    <!-- Table View -->
    <div v-else-if="filteredCommunities.length > 0" class="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Community</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Admins</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="community in paginatedCommunities" :key="community.id">
            <TableCell class="font-medium">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {{ community.initials }}
                </div>
                <div>
                  <p class="font-medium">{{ community.name }}</p>
                  <p class="text-sm text-muted-foreground">{{ community.description.substring(0, 50) }}...</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="text-sm">
                <p>{{ community.location }}</p>
                <p class="text-muted-foreground">{{ community.county }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Users class="h-4 w-4 text-muted-foreground" />
                <span>{{ community.memberCount }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center space-x-1">
                <Crown class="h-4 w-4 text-muted-foreground" />
                <span>{{ community.adminIds.length }}/2</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="getActivityVariant(community.lastActivityAt)">
                {{ getActivityStatus(community.lastActivityAt) }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button size="sm" variant="outline" @click="editCommunity(community)">
                  <Edit class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" @click="manageAdmins(community)">
                  <Crown class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" @click="manageMembers(community)">
                  <Users class="h-3 w-3" />
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

    <!-- Community Details Dialog -->
    <CommunityDetails
      v-if="selectedCommunity"
      :community="selectedCommunity"
      :open="showDetailsDialog"
      @close="closeDetailsDialog"
      @updated="handleCommunityUpdated"
    />

    <!-- Admin Management Dialog -->
    <AdminManagement
      v-if="selectedCommunity"
      :community="selectedCommunity"
      :open="showAdminDialog"
      @close="closeAdminDialog"
      @updated="handleCommunityUpdated"
    />

    <!-- Member Management Dialog -->
    <MemberManagement
      v-if="selectedCommunity"
      :community="selectedCommunity"
      :open="showMemberDialog"
      @close="closeMemberDialog"
      @updated="handleCommunityUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, RefreshCw, Plus, Edit, Users, Crown } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { collection, onSnapshot, FirestoreError } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { isWithinDays } from '@/utils/dateUtils'
import type { Community } from '@/types/community'

// Components
import CommunityCard from '@/components/communities/CommunityCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CommunityDetails from '@/components/communities/CommunityDetails.vue'
import AdminManagement from '@/components/communities/AdminManagement.vue'
import MemberManagement from '@/components/communities/MemberManagement.vue'

// UI Components
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import Select from '@/components/ui/select.vue'
import Badge from '@/components/ui/badge.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'

// State
const communities = ref<(Community & { id: string })[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const selectedCounty = ref('all')
const viewMode = ref<'cards' | 'table'>('cards')
const currentPage = ref(1)
const pageSize = ref(12)

// Dialog states
const showDetailsDialog = ref(false)
const showAdminDialog = ref(false)
const showMemberDialog = ref(false)
const selectedCommunity = ref<(Community & { id: string }) | null>(null)

// Composables
const { success, error: showError } = useToast()

// Computed properties
const filteredCommunities = computed(() => {
  let filtered = communities.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(community => 
      community.name.toLowerCase().includes(query) ||
      community.location.toLowerCase().includes(query) ||
      community.county.toLowerCase().includes(query) ||
      community.description.toLowerCase().includes(query) ||
      community.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // Filter by county
  if (selectedCounty.value !== 'all') {
    filtered = filtered.filter(community => community.county === selectedCounty.value)
  }

  return filtered
})

const paginatedCommunities = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredCommunities.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredCommunities.value.length / pageSize.value))

const uniqueCounties = computed(() => {
  const counties = communities.value.map(c => c.county)
  return [...new Set(counties)].sort()
})

const totalCommunities = computed(() => communities.value.length)

const activeCommunities = computed(() => {
  return communities.value.filter(community => 
    isWithinDays(community.lastActivityAt, 30)
  ).length
})

const totalMembers = computed(() => 
  communities.value.reduce((sum, community) => sum + (community.memberCount || 0), 0)
)

const totalAdmins = computed(() => 
  communities.value.reduce((sum, community) => sum + (community.adminIds?.length || 0), 0)
)

// Methods
const loadCommunities = async () => {
  try {
    loading.value = true
    error.value = null
    
    console.log('Loading communities...')
    
    const db = getFirebaseDb()
    const communitiesRef = collection(db, 'communities')
    
    const unsubscribe = onSnapshot(
      communitiesRef,
      (snapshot) => {
        console.log('Communities snapshot received:', snapshot)
        const data = snapshot.docs.map(doc => {
          const docData = doc.data()
          console.log('Raw community data:', docData)
          return {
            id: doc.id,
            ...docData,
            // Ensure required arrays exist with defaults
            adminIds: docData.adminIds || [],
            members_id: docData.members_id || [],
            followers: docData.followers || [],
            tags: docData.tags || [],
            memberCount: docData.memberCount || 0,
            followerCount: docData.followerCount || 0
          }
        }) as (Community & { id: string })[]
        
        console.log('Communities processed:', data)
        communities.value = data
        loading.value = false
      },
      (err: FirestoreError) => {
        console.error('Firestore error details:', err)
        error.value = 'Failed to load communities'
        loading.value = false
        showError('Error', 'Failed to load communities')
      }
    )

    return unsubscribe
  } catch (err) {
    console.error('Load communities error:', err)
    error.value = 'Failed to load communities'
    loading.value = false
    showError('Error', 'Failed to load communities')
  }
}

const refreshData = async () => {
  await loadCommunities()
  success('Success', 'Communities refreshed')
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

const openCreateDialog = () => {
  selectedCommunity.value = null
  showDetailsDialog.value = true
}

const editCommunity = (community: Community & { id: string }) => {
  selectedCommunity.value = community
  showDetailsDialog.value = true
}

const manageAdmins = (community: Community & { id: string }) => {
  selectedCommunity.value = community
  showAdminDialog.value = true
}

const manageMembers = (community: Community & { id: string }) => {
  selectedCommunity.value = community
  showMemberDialog.value = true
}

const closeDetailsDialog = () => {
  showDetailsDialog.value = false
  selectedCommunity.value = null
}

const closeAdminDialog = () => {
  showAdminDialog.value = false
  selectedCommunity.value = null
}

const closeMemberDialog = () => {
  showMemberDialog.value = false
  selectedCommunity.value = null
}

const handleCommunityUpdated = () => {
  // Communities will be updated automatically via subscription
  success('Success', 'Community updated successfully')
}

const getActivityStatus = (lastActivityAt: string | Date | any) => {
  // Handle Firebase Timestamp
  const lastActivity = lastActivityAt && typeof lastActivityAt === 'object' && lastActivityAt.toDate ? 
    lastActivityAt.toDate() : new Date(lastActivityAt)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return 'Active'
  if (daysDiff <= 30) return 'Recent'
  return 'Inactive'
}

const getActivityVariant = (lastActivityAt: string | Date | any) => {
  const status = getActivityStatus(lastActivityAt)
  return status === 'Active' ? 'success' : status === 'Recent' ? 'secondary' : 'outline'
}

// Watchers
watch([selectedCounty, searchQuery], () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadCommunities()
})
</script>