<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Community Admin Management</h1>
            <p class="text-gray-600">Manage community administrators and their county assignments</p>
          </div>
          <div class="flex items-center gap-2">
            <Button @click="loadAdmins" :disabled="loading" variant="outline">
              <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
              Refresh
            </Button>
            <Button @click="openCreateAdmin">
              <Plus class="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Total Admins</p>
                <p class="text-2xl font-bold">{{ stats.totalAdmins }}</p>
              </div>
              <Users class="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Active Admins</p>
                <p class="text-2xl font-bold">{{ stats.activeAdmins }}</p>
              </div>
              <UserCheck class="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Assigned Counties</p>
                <p class="text-2xl font-bold">{{ stats.assignedCounties }}</p>
              </div>
              <MapPin class="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Unassigned</p>
                <p class="text-2xl font-bold">{{ stats.unassignedAdmins }}</p>
              </div>
              <UserX class="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Filters and Search -->
      <div class="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <SearchInput 
                  v-model="filters.search" 
                  placeholder="Search by name or email..."
                  @search="applyFilters"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">County</label>
                <select 
                  v-model="filters.county" 
                  @change="applyFilters"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Counties</option>
                  <option v-for="county in counties" :key="county" :value="county">
                    {{ county }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  v-model="filters.status" 
                  @change="applyFilters"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Assignment</label>
                <select 
                  v-model="filters.assignment" 
                  @change="applyFilters"
                  class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Admin List -->
      <div class="mb-8">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>Community Administrators ({{ filteredAdmins.length }})</span>
              <div class="flex items-center gap-2">
                <Button @click="bulkAction('activate')" :disabled="selectedAdmins.length === 0" size="sm" variant="outline">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Activate Selected
                </Button>
                <Button @click="bulkAction('deactivate')" :disabled="selectedAdmins.length === 0" size="sm" variant="outline">
                  <UserX class="w-4 h-4 mr-2" />
                  Deactivate Selected
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left p-3">
                      <input 
                        type="checkbox" 
                        @change="toggleSelectAll"
                        :checked="allSelected"
                        class="rounded"
                      />
                    </th>
                    <th class="text-left p-3">Admin</th>
                    <th class="text-left p-3">Contact</th>
                    <th class="text-left p-3">Assignment</th>
                    <th class="text-left p-3">Status</th>
                    <th class="text-left p-3">Last Active</th>
                    <th class="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="admin in filteredAdmins" :key="admin.id" class="border-b hover:bg-gray-50">
                    <td class="p-3">
                      <input 
                        type="checkbox" 
                        v-model="selectedAdmins"
                        :value="admin.id"
                        class="rounded"
                      />
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-3">
                        <Avatar class="w-10 h-10">
                          <AvatarImage :src="admin.photoURL" :alt="admin.name" />
                          <AvatarFallback>{{ admin.name?.substring(0, 2).toUpperCase() }}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p class="font-medium">{{ admin.name }}</p>
                          <p class="text-sm text-gray-600">ID: {{ admin.id }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div>
                        <p class="text-sm">{{ admin.email }}</p>
                        <p class="text-sm text-gray-600">{{ admin.phone || 'No phone' }}</p>
                      </div>
                    </td>
                    <td class="p-3">
                      <div v-if="admin.countyId">
                        <p class="text-sm font-medium">{{ admin.countyId }}</p>
                        <p class="text-sm text-gray-600">{{ admin.communityId || 'No community' }}</p>
                      </div>
                      <Badge v-else variant="outline">Unassigned</Badge>
                    </td>
                    <td class="p-3">
                      <Badge :variant="admin.isActive ? 'default' : 'secondary'">
                        {{ admin.isActive ? 'Active' : 'Inactive' }}
                      </Badge>
                    </td>
                    <td class="p-3">
                      <span class="text-sm text-gray-600">
                        {{ formatLastActive(admin.lastActive) }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <Button @click="manageCountyAssignment(admin)" size="sm" variant="outline">
                          <Settings class="w-4 h-4 mr-2" />
                          Manage County
                        </Button>
                        <Button @click="viewAdminDetails(admin)" size="sm" variant="ghost">
                          <Eye class="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button @click="editAdmin(admin)" size="sm" variant="ghost">
                          <Edit class="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="filteredAdmins.length === 0" class="text-center py-8">
              <EmptyState 
                title="No Community Admins Found"
                description="No administrators match your current filters."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- County Management Modal -->
    <Dialog v-model:open="countyManagementOpen">
      <DialogContent class="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage County Assignment</DialogTitle>
          <DialogDescription>
            Configure {{ selectedAdmin?.name }}'s county and community assignments
          </DialogDescription>
        </DialogHeader>
        
        <div v-if="selectedAdmin" class="space-y-6">
          <!-- Current Assignment -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium mb-3">Current Assignment</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">County</p>
                <p class="font-medium">{{ selectedAdmin.countyId || 'Not assigned' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Community</p>
                <p class="font-medium">{{ selectedAdmin.communityId || 'Not assigned' }}</p>
              </div>
            </div>
          </div>

          <!-- New Assignment -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Assign County</label>
              <select 
                v-model="assignmentForm.countyId" 
                @change="loadCommunitiesForCounty"
                class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select County</option>
                <option v-for="county in counties" :key="county" :value="county">
                  {{ county }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Assign Community</label>
              <select 
                v-model="assignmentForm.communityId"
                :disabled="!assignmentForm.countyId"
                class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Community</option>
                <option v-for="community in availableCommunities" :key="community.id" :value="community.id">
                  {{ community.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Permissions -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-3">Tournament Management Permissions</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-3">
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canManageMatches" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can manage matches</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canInitializeRounds" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can initialize rounds</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canFinalizeTournaments" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can finalize tournaments</span>
                </label>
              </div>
              <div class="space-y-3">
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canViewReports" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can view reports</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canManageSchedules" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can manage schedules</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    v-model="assignmentForm.permissions.canExportData" 
                    class="mr-3 rounded"
                  />
                  <span class="text-sm">Can export data</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Assignment Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Assignment Notes</label>
            <textarea 
              v-model="assignmentForm.notes"
              rows="3"
              class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this assignment..."
            ></textarea>
          </div>
        </div>

        <DialogFooter>
          <Button @click="countyManagementOpen = false" variant="outline">Cancel</Button>
          <Button @click="saveAssignment" :disabled="savingAssignment">
            {{ savingAssignment ? 'Saving...' : 'Save Assignment' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Admin Details Modal -->
    <Dialog v-model:open="adminDetailsOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Admin Details</DialogTitle>
        </DialogHeader>
        
        <div v-if="selectedAdmin" class="space-y-4">
          <div class="flex items-center gap-4">
            <Avatar class="w-16 h-16">
              <AvatarImage :src="selectedAdmin.photoURL" :alt="selectedAdmin.name" />
              <AvatarFallback>{{ selectedAdmin.name?.substring(0, 2).toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div>
              <h3 class="text-lg font-semibold">{{ selectedAdmin.name }}</h3>
              <p class="text-gray-600">{{ selectedAdmin.email }}</p>
              <Badge :variant="selectedAdmin.isActive ? 'default' : 'secondary'">
                {{ selectedAdmin.isActive ? 'Active' : 'Inactive' }}
              </Badge>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">County Assignment</p>
              <p class="font-medium">{{ selectedAdmin.countyId || 'Not assigned' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Community Assignment</p>
              <p class="font-medium">{{ selectedAdmin.communityId || 'Not assigned' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Created At</p>
              <p class="font-medium">{{ formatDate(selectedAdmin.createdAt) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Last Active</p>
              <p class="font-medium">{{ formatLastActive(selectedAdmin.lastActive) }}</p>
            </div>
          </div>

          <!-- Activity Stats -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium mb-3">Activity Statistics</h4>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-2xl font-bold text-blue-600">{{ selectedAdmin.stats?.tournamentsManaged || 0 }}</p>
                <p class="text-sm text-gray-600">Tournaments</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-green-600">{{ selectedAdmin.stats?.matchesCompleted || 0 }}</p>
                <p class="text-sm text-gray-600">Matches</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-purple-600">{{ selectedAdmin.stats?.roundsGenerated || 0 }}</p>
                <p class="text-sm text-gray-600">Rounds</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button @click="adminDetailsOpen = false" variant="outline">Close</Button>
          <Button @click="editAdmin(selectedAdmin)">Edit Admin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { 
  RefreshCw, 
  Plus, 
  Users, 
  UserCheck, 
  UserX, 
  MapPin, 
  Settings, 
  Eye, 
  Edit 
} from 'lucide-vue-next'

const router = useRouter()
const { success, error: showError } = useToast()

// State
const loading = ref(false)
const admins = ref([])
const selectedAdmins = ref([])
const counties = ref(['COUNTY_KISUMU', 'COUNTY_SIAYA', 'COUNTY_HOMABAY'])
const availableCommunities = ref([])

// Modals
const countyManagementOpen = ref(false)
const adminDetailsOpen = ref(false)
const selectedAdmin = ref(null)
const savingAssignment = ref(false)

// Filters
const filters = ref({
  search: '',
  county: '',
  status: '',
  assignment: ''
})

// Forms
const assignmentForm = ref({
  countyId: '',
  communityId: '',
  permissions: {
    canManageMatches: true,
    canInitializeRounds: true,
    canFinalizeTournaments: true,
    canViewReports: true,
    canManageSchedules: true,
    canExportData: true
  },
  notes: ''
})

// Computed
const stats = computed(() => ({
  totalAdmins: admins.value.length,
  activeAdmins: admins.value.filter(a => a.isActive).length,
  assignedCounties: new Set(admins.value.filter(a => a.countyId).map(a => a.countyId)).size,
  unassignedAdmins: admins.value.filter(a => !a.countyId).length
}))

const filteredAdmins = computed(() => {
  let filtered = [...admins.value]

  if (filters.value.search) {
    filtered = filtered.filter(admin =>
      admin.name.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      admin.email.toLowerCase().includes(filters.value.search.toLowerCase())
    )
  }

  if (filters.value.county) {
    filtered = filtered.filter(admin => admin.countyId === filters.value.county)
  }

  if (filters.value.status) {
    filtered = filtered.filter(admin => 
      filters.value.status === 'active' ? admin.isActive : !admin.isActive
    )
  }

  if (filters.value.assignment) {
    filtered = filtered.filter(admin => 
      filters.value.assignment === 'assigned' ? admin.countyId : !admin.countyId
    )
  }

  return filtered
})

const allSelected = computed(() => 
  selectedAdmins.value.length === filteredAdmins.value.length && filteredAdmins.value.length > 0
)

// Methods
const loadAdmins = async () => {
  loading.value = true
  try {
    // Mock data - replace with actual API call
    admins.value = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700123456',
        countyId: 'COUNTY_KISUMU',
        communityId: 'COMM_KISUMU_CENTRAL_001',
        isActive: true,
        createdAt: new Date('2024-01-15'),
        lastActive: new Date('2024-01-20'),
        photoURL: null,
        stats: {
          tournamentsManaged: 12,
          matchesCompleted: 145,
          roundsGenerated: 28
        }
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+254700123457',
        countyId: 'COUNTY_KISUMU',
        communityId: 'COMM_KISUMU_EAST_002',
        isActive: true,
        createdAt: new Date('2024-01-10'),
        lastActive: new Date('2024-01-19'),
        photoURL: null,
        stats: {
          tournamentsManaged: 8,
          matchesCompleted: 98,
          roundsGenerated: 15
        }
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: null,
        countyId: null,
        communityId: null,
        isActive: false,
        createdAt: new Date('2024-01-05'),
        lastActive: new Date('2024-01-18'),
        photoURL: null,
        stats: {
          tournamentsManaged: 0,
          matchesCompleted: 0,
          roundsGenerated: 0
        }
      }
    ]
  } catch (error) {
    showError('Failed to load admins', error.message)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  // Filters are applied via computed property
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedAdmins.value = []
  } else {
    selectedAdmins.value = filteredAdmins.value.map(admin => admin.id)
  }
}

const bulkAction = async (action) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    selectedAdmins.value.forEach(adminId => {
      const admin = admins.value.find(a => a.id === adminId)
      if (admin) {
        admin.isActive = action === 'activate'
      }
    })
    
    success(`${action === 'activate' ? 'Activated' : 'Deactivated'} ${selectedAdmins.value.length} admins`)
    selectedAdmins.value = []
  } catch (error) {
    showError('Bulk action failed', error.message)
  }
}

const manageCountyAssignment = (admin) => {
  selectedAdmin.value = admin
  assignmentForm.value = {
    countyId: admin.countyId || '',
    communityId: admin.communityId || '',
    permissions: {
      canManageMatches: true,
      canInitializeRounds: true,
      canFinalizeTournaments: true,
      canViewReports: true,
      canManageSchedules: true,
      canExportData: true
    },
    notes: ''
  }
  countyManagementOpen.value = true
}

const loadCommunitiesForCounty = () => {
  if (!assignmentForm.value.countyId) {
    availableCommunities.value = []
    return
  }
  
  // Mock communities for county
  availableCommunities.value = [
    { id: 'COMM_KISUMU_CENTRAL_001', name: 'Kisumu Central' },
    { id: 'COMM_KISUMU_EAST_002', name: 'Kisumu East' },
    { id: 'COMM_KISUMU_WEST_003', name: 'Kisumu West' }
  ]
}

const saveAssignment = async () => {
  if (!selectedAdmin.value) return
  
  savingAssignment.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update admin
    const adminIndex = admins.value.findIndex(a => a.id === selectedAdmin.value.id)
    if (adminIndex >= 0) {
      admins.value[adminIndex] = {
        ...admins.value[adminIndex],
        countyId: assignmentForm.value.countyId,
        communityId: assignmentForm.value.communityId
      }
    }
    
    success('Assignment saved successfully')
    countyManagementOpen.value = false
  } catch (error) {
    showError('Failed to save assignment', error.message)
  } finally {
    savingAssignment.value = false
  }
}

const viewAdminDetails = (admin) => {
  selectedAdmin.value = admin
  adminDetailsOpen.value = true
}

const editAdmin = (admin) => {
  router.push(`/admin/community-admins/${admin.id}/edit`)
}

const openCreateAdmin = () => {
  router.push('/admin/community-admins/create')
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const formatLastActive = (date) => {
  if (!date) return 'Never'
  const now = new Date()
  const diff = now - new Date(date)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

// Lifecycle
onMounted(() => {
  loadAdmins()
})
</script>