<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
        <p class="text-gray-600">Complete oversight and management of tournament algorithm system</p>
      </div>

      <!-- Quick Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Active Tournaments" 
          :value="systemStats.activeTournaments"
          :trend="systemStats.tournamentTrend"
          icon="Trophy"
          color="blue"
        />
        <StatsCard 
          title="Total Matches" 
          :value="systemStats.totalMatches"
          :trend="systemStats.matchTrend"
          icon="Zap"
          color="green"
        />
        <StatsCard 
          title="Algorithm Calls" 
          :value="systemStats.algorithmCalls"
          :trend="systemStats.algorithmTrend"
          icon="Cpu"
          color="purple"
        />
        <StatsCard 
          title="Success Rate" 
          :value="systemStats.successRate + '%'"
          :trend="systemStats.successTrend"
          icon="CheckCircle"
          color="emerald"
        />
      </div>

      <!-- Algorithm Service Status -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :class="algorithmHealth.healthy ? 'bg-green-500' : 'bg-red-500'"></div>
              Algorithm Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span>Service Status</span>
                <Badge :variant="algorithmHealth.healthy ? 'default' : 'destructive'">
                  {{ algorithmHealth.healthy ? 'Operational' : 'Down' }}
                </Badge>
              </div>
              <div class="flex items-center justify-between">
                <span>Response Time</span>
                <span class="text-sm text-gray-600">{{ algorithmHealth.responseTime }}ms</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Last Check</span>
                <span class="text-sm text-gray-600">{{ formatTime(algorithmHealth.lastCheck) }}</span>
              </div>
              <Button @click="checkAlgorithmHealth" :disabled="checkingHealth" size="sm" class="w-full">
                <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': checkingHealth }" />
                Check Health
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tournament Levels Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <Building2 class="w-4 h-4" />
                  Community Level
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-600">{{ levelStats.community.active }}</span>
                  <Badge variant="outline">{{ levelStats.community.completion }}% Complete</Badge>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  County Level
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-600">{{ levelStats.county.active }}</span>
                  <Badge variant="outline">{{ levelStats.county.completion }}% Complete</Badge>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <Map class="w-4 h-4" />
                  Regional Level
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-600">{{ levelStats.regional.active }}</span>
                  <Badge variant="outline">{{ levelStats.regional.completion }}% Complete</Badge>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <Globe class="w-4 h-4" />
                  National Level
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-600">{{ levelStats.national.active }}</span>
                  <Badge variant="outline">{{ levelStats.national.completion }}% Complete</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Community Admin Management -->
      <div class="mb-8">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>Community Admin Management</span>
              <Button @click="loadCommunityAdmins" :disabled="loadingAdmins" size="sm" variant="outline">
                <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': loadingAdmins }" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <!-- Search and Filter -->
              <div class="flex items-center gap-4 mb-4">
                <div class="flex-1">
                  <SearchInput 
                    v-model="adminSearch" 
                    placeholder="Search community admins..."
                    @search="filterAdmins"
                  />
                </div>
                <select 
                  v-model="selectedCountyFilter" 
                  @change="filterAdmins"
                  class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Counties</option>
                  <option v-for="county in availableCounties" :key="county" :value="county">
                    {{ county }}
                  </option>
                </select>
              </div>

              <!-- Community Admins Table -->
              <div class="overflow-x-auto">
                <table class="w-full table-auto">
                  <thead>
                    <tr class="border-b">
                      <th class="text-left p-3">Admin Name</th>
                      <th class="text-left p-3">Email</th>
                      <th class="text-left p-3">Community</th>
                      <th class="text-left p-3">County</th>
                      <th class="text-left p-3">Status</th>
                      <th class="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="admin in filteredAdmins" :key="admin.id" class="border-b hover:bg-gray-50">
                      <td class="p-3">
                        <div class="flex items-center gap-2">
                          <Avatar class="w-8 h-8">
                            <AvatarImage :src="admin.photoURL" :alt="admin.name" />
                            <AvatarFallback>{{ admin.name?.substring(0, 2).toUpperCase() }}</AvatarFallback>
                          </Avatar>
                          <span class="font-medium">{{ admin.name }}</span>
                        </div>
                      </td>
                      <td class="p-3 text-sm text-gray-600">{{ admin.email }}</td>
                      <td class="p-3 text-sm">{{ admin.communityId || 'Not Assigned' }}</td>
                      <td class="p-3 text-sm">{{ admin.countyId || 'Not Assigned' }}</td>
                      <td class="p-3">
                        <Badge :variant="admin.isActive ? 'default' : 'secondary'">
                          {{ admin.isActive ? 'Active' : 'Inactive' }}
                        </Badge>
                      </td>
                      <td class="p-3">
                        <div class="flex items-center gap-2">
                          <Button @click="openCountyManagement(admin)" size="sm" variant="outline">
                            <Settings class="w-4 h-4 mr-2" />
                            Manage County
                          </Button>
                          <Button @click="viewAdminDetails(admin)" size="sm" variant="ghost">
                            <Eye class="w-4 h-4 mr-2" />
                            View
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
                  description="No community administrators match your search criteria."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Real-time Tournament Monitoring -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Active Tournament Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div v-for="tournament in activeTournaments" :key="tournament.id" class="border rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium">{{ tournament.name }}</h4>
                  <Badge :variant="getTournamentStatusVariant(tournament.status)">
                    {{ tournament.status }}
                  </Badge>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-600">Level: {{ tournament.level }}</p>
                    <p class="text-gray-600">Matches: {{ tournament.totalMatches }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Completed: {{ tournament.completedMatches }}</p>
                    <p class="text-gray-600">Progress: {{ tournament.progress }}%</p>
                  </div>
                </div>
                <div class="mt-2 flex items-center gap-2">
                  <Button @click="viewTournament(tournament)" size="sm" variant="outline">
                    <Eye class="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button @click="manageTournament(tournament)" size="sm" variant="outline">
                    <Settings class="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Algorithm Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                  <h4 class="font-medium text-blue-900">Successful Calls</h4>
                  <p class="text-2xl font-bold text-blue-600">{{ performanceMetrics.successfulCalls }}</p>
                  <p class="text-sm text-blue-600">{{ performanceMetrics.successRate }}% success rate</p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                  <h4 class="font-medium text-red-900">Failed Calls</h4>
                  <p class="text-2xl font-bold text-red-600">{{ performanceMetrics.failedCalls }}</p>
                  <p class="text-sm text-red-600">{{ performanceMetrics.failureRate }}% failure rate</p>
                </div>
              </div>
              
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">Average Response Times</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>Initialize Tournament:</span>
                    <span>{{ performanceMetrics.avgInitTime }}ms</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Generate Round:</span>
                    <span>{{ performanceMetrics.avgRoundTime }}ms</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Finalize Winners:</span>
                    <span>{{ performanceMetrics.avgFinalizeTime }}ms</span>
                  </div>
                </div>
              </div>

              <Button @click="viewDetailedMetrics" size="sm" class="w-full">
                <BarChart3 class="w-4 h-4 mr-2" />
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Quick Actions -->
      <div class="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button @click="initializeTournament" class="h-20 flex flex-col items-center justify-center">
                <Cpu class="w-6 h-6 mb-2" />
                Initialize Tournament
              </Button>
              <Button @click="monitorAlgorithm" variant="outline" class="h-20 flex flex-col items-center justify-center">
                <Activity class="w-6 h-6 mb-2" />
                Monitor Algorithm
              </Button>
              <Button @click="manageAdmins" variant="outline" class="h-20 flex flex-col items-center justify-center">
                <Users class="w-6 h-6 mb-2" />
                Manage Admins
              </Button>
              <Button @click="viewReports" variant="outline" class="h-20 flex flex-col items-center justify-center">
                <FileText class="w-6 h-6 mb-2" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- County Management Modal -->
    <Dialog v-model:open="countyManagementOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage County Assignment</DialogTitle>
          <DialogDescription>
            Assign {{ selectedAdmin?.name }} to manage specific counties and communities
          </DialogDescription>
        </DialogHeader>
        
        <div v-if="selectedAdmin" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium mb-2">Current Assignment</h4>
            <p class="text-sm text-gray-600">Community: {{ selectedAdmin.communityId || 'Not assigned' }}</p>
            <p class="text-sm text-gray-600">County: {{ selectedAdmin.countyId || 'Not assigned' }}</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Assign County</label>
              <select 
                v-model="assignmentData.countyId" 
                @change="loadCommunitiesForCounty"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select County</option>
                <option v-for="county in availableCounties" :key="county" :value="county">
                  {{ county }}
                </option>
              </select>
            </div>

            <div v-if="assignmentData.countyId">
              <label class="block text-sm font-medium text-gray-700 mb-2">Assign Community</label>
              <select 
                v-model="assignmentData.communityId"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Community</option>
                <option v-for="community in availableCommunities" :key="community.id" :value="community.id">
                  {{ community.name }}
                </option>
              </select>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">Access Permissions</h4>
              <div class="space-y-2 text-sm text-blue-700">
                <label class="flex items-center">
                  <input type="checkbox" v-model="assignmentData.canManageMatches" class="mr-2" />
                  Can manage matches
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="assignmentData.canInitializeRounds" class="mr-2" />
                  Can initialize rounds
                </label>
                <label class="flex items-center">
                  <input type="checkbox" v-model="assignmentData.canFinalizeTournaments" class="mr-2" />
                  Can finalize tournaments
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button @click="countyManagementOpen = false" variant="outline">Cancel</Button>
          <Button @click="saveCountyAssignment" :disabled="savingAssignment">
            {{ savingAssignment ? 'Saving...' : 'Save Assignment' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournaments } from '@/composables/useTournaments'
import { algorithmService } from '@/services/algorithmService'
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
import StatsCard from '@/components/dashboard/StatsCard.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { 
  RefreshCw, 
  Trophy, 
  Zap, 
  Cpu, 
  CheckCircle, 
  Building2, 
  MapPin, 
  Map, 
  Globe, 
  Settings, 
  Eye, 
  Activity, 
  Users, 
  FileText, 
  BarChart3 
} from 'lucide-vue-next'

const router = useRouter()
const { success, error: showError } = useToast()
const { tournaments, loadAllTournaments } = useTournaments()

// System stats
const systemStats = ref({
  activeTournaments: 0,
  totalMatches: 0,
  algorithmCalls: 0,
  successRate: 0,
  tournamentTrend: 0,
  matchTrend: 0,
  algorithmTrend: 0,
  successTrend: 0
})

// Algorithm health
const algorithmHealth = ref({
  healthy: false,
  message: 'Checking...',
  responseTime: 0,
  lastCheck: new Date()
})
const checkingHealth = ref(false)

// Level statistics
const levelStats = ref({
  community: { active: 0, completion: 0 },
  county: { active: 0, completion: 0 },
  regional: { active: 0, completion: 0 },
  national: { active: 0, completion: 0 }
})

// Community admin management
const communityAdmins = ref([])
const filteredAdmins = ref([])
const loadingAdmins = ref(false)
const adminSearch = ref('')
const selectedCountyFilter = ref('')

// County management
const countyManagementOpen = ref(false)
const selectedAdmin = ref(null)
const assignmentData = ref({
  countyId: '',
  communityId: '',
  canManageMatches: true,
  canInitializeRounds: true,
  canFinalizeTournaments: true
})
const savingAssignment = ref(false)

// Available data
const availableCounties = ref(['COUNTY_KISUMU', 'COUNTY_SIAYA', 'COUNTY_HOMABAY'])
const availableCommunities = ref([])

// Active tournaments
const activeTournaments = ref([])

// Performance metrics
const performanceMetrics = ref({
  successfulCalls: 0,
  failedCalls: 0,
  successRate: 0,
  failureRate: 0,
  avgInitTime: 0,
  avgRoundTime: 0,
  avgFinalizeTime: 0
})

// Auto-refresh interval
let refreshInterval: NodeJS.Timeout | null = null

// Methods
const checkAlgorithmHealth = async () => {
  checkingHealth.value = true
  try {
    const health = await algorithmService.checkServiceHealth()
    algorithmHealth.value = {
      ...health,
      lastCheck: new Date()
    }
  } catch (error) {
    algorithmHealth.value = {
      healthy: false,
      message: 'Service unavailable',
      responseTime: 0,
      lastCheck: new Date()
    }
  } finally {
    checkingHealth.value = false
  }
}

const loadSystemStats = async () => {
  try {
    // Load tournaments and calculate stats
    await loadAllTournaments()
    
    const active = tournaments.value.filter(t => t.status === 'ongoing').length
    const total = tournaments.value.length
    
    systemStats.value = {
      activeTournaments: active,
      totalMatches: tournaments.value.reduce((sum, t) => sum + (t.totalMatches || 0), 0),
      algorithmCalls: Math.floor(Math.random() * 1000) + 500, // Mock data
      successRate: 97.5,
      tournamentTrend: 12,
      matchTrend: 8,
      algorithmTrend: 15,
      successTrend: 2
    }

    // Calculate level stats
    levelStats.value = {
      community: { 
        active: tournaments.value.filter(t => t.level === 'community' && t.status === 'ongoing').length,
        completion: 75 
      },
      county: { 
        active: tournaments.value.filter(t => t.level === 'county' && t.status === 'ongoing').length,
        completion: 60 
      },
      regional: { 
        active: tournaments.value.filter(t => t.level === 'regional' && t.status === 'ongoing').length,
        completion: 45 
      },
      national: { 
        active: tournaments.value.filter(t => t.level === 'national' && t.status === 'ongoing').length,
        completion: 30 
      }
    }

    // Set active tournaments
    activeTournaments.value = tournaments.value
      .filter(t => t.status === 'ongoing')
      .map(t => ({
        ...t,
        totalMatches: Math.floor(Math.random() * 50) + 20,
        completedMatches: Math.floor(Math.random() * 30) + 10,
        progress: Math.floor(Math.random() * 80) + 20
      }))

    // Mock performance metrics
    performanceMetrics.value = {
      successfulCalls: 1247,
      failedCalls: 32,
      successRate: 97.5,
      failureRate: 2.5,
      avgInitTime: 1250,
      avgRoundTime: 850,
      avgFinalizeTime: 950
    }
  } catch (error) {
    showError('Failed to load system statistics', error.message)
  }
}

const loadCommunityAdmins = async () => {
  loadingAdmins.value = true
  try {
    // Mock community admin data
    communityAdmins.value = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        communityId: 'COMM_KISUMU_CENTRAL_001',
        countyId: 'COUNTY_KISUMU',
        isActive: true,
        photoURL: null
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        communityId: 'COMM_KISUMU_EAST_002',
        countyId: 'COUNTY_KISUMU',
        isActive: true,
        photoURL: null
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        communityId: null,
        countyId: null,
        isActive: false,
        photoURL: null
      }
    ]
    
    filterAdmins()
  } catch (error) {
    showError('Failed to load community admins', error.message)
  } finally {
    loadingAdmins.value = false
  }
}

const filterAdmins = () => {
  let filtered = [...communityAdmins.value]
  
  if (adminSearch.value) {
    filtered = filtered.filter(admin => 
      admin.name.toLowerCase().includes(adminSearch.value.toLowerCase()) ||
      admin.email.toLowerCase().includes(adminSearch.value.toLowerCase())
    )
  }
  
  if (selectedCountyFilter.value) {
    filtered = filtered.filter(admin => admin.countyId === selectedCountyFilter.value)
  }
  
  filteredAdmins.value = filtered
}

const openCountyManagement = (admin) => {
  selectedAdmin.value = admin
  assignmentData.value = {
    countyId: admin.countyId || '',
    communityId: admin.communityId || '',
    canManageMatches: true,
    canInitializeRounds: true,
    canFinalizeTournaments: true
  }
  countyManagementOpen.value = true
}

const loadCommunitiesForCounty = () => {
  if (!assignmentData.value.countyId) {
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

const saveCountyAssignment = async () => {
  if (!selectedAdmin.value) return
  
  savingAssignment.value = true
  try {
    // Mock API call to save assignment
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update the admin in the list
    const adminIndex = communityAdmins.value.findIndex(a => a.id === selectedAdmin.value.id)
    if (adminIndex >= 0) {
      communityAdmins.value[adminIndex] = {
        ...communityAdmins.value[adminIndex],
        countyId: assignmentData.value.countyId,
        communityId: assignmentData.value.communityId
      }
    }
    
    filterAdmins()
    success('Assignment saved successfully')
    countyManagementOpen.value = false
  } catch (error) {
    showError('Failed to save assignment', error.message)
  } finally {
    savingAssignment.value = false
  }
}

const viewAdminDetails = (admin) => {
  router.push(`/admin/community-admins/${admin.id}`)
}

const getTournamentStatusVariant = (status) => {
  switch (status) {
    case 'ongoing': return 'default'
    case 'completed': return 'secondary'
    case 'upcoming': return 'outline'
    default: return 'secondary'
  }
}

const viewTournament = (tournament) => {
  router.push(`/tournaments/${tournament.id}`)
}

const manageTournament = (tournament) => {
  router.push(`/admin/tournaments/${tournament.id}`)
}

const initializeTournament = () => {
  router.push('/admin/algorithm/initialize')
}

const monitorAlgorithm = () => {
  router.push('/admin/algorithm/monitor')
}

const manageAdmins = () => {
  router.push('/admin/community-admins')
}

const viewReports = () => {
  router.push('/admin/reports')
}

const viewDetailedMetrics = () => {
  router.push('/admin/analytics')
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString()
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadSystemStats(),
    loadCommunityAdmins(),
    checkAlgorithmHealth()
  ])
  
  // Set up auto-refresh
  refreshInterval = setInterval(async () => {
    await loadSystemStats()
    await checkAlgorithmHealth()
  }, 30000) // Refresh every 30 seconds
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>