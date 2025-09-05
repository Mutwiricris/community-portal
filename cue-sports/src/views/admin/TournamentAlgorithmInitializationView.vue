<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Tournament Algorithm Initialization</h1>
        <p class="text-gray-600">Initialize tournaments with automated match generation and bracket creation</p>
      </div>

      <!-- Service Health Check -->
      <div class="mb-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :class="healthStatus.healthy ? 'bg-green-500' : 'bg-red-500'"></div>
              Algorithm Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <span>{{ healthStatus.message }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">Response: {{ healthStatus.responseTime }}ms</span>
                <Button @click="checkHealth" :disabled="checkingHealth" size="sm" variant="outline">
                  <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': checkingHealth }" />
                  Check
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tournament Selection -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Selection</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Tournament</label>
              <select 
                v-model="selectedTournamentId" 
                @change="onTournamentSelect"
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a tournament...</option>
                <option v-for="tournament in eligibleTournaments" :key="tournament.id" :value="tournament.id">
                  {{ tournament.name }} ({{ tournament.status }})
                </option>
              </select>
            </div>

            <div v-if="selectedTournament">
              <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-medium text-blue-900 mb-2">{{ selectedTournament.name }}</h4>
                <div class="text-sm text-blue-700 space-y-1">
                  <p><span class="font-medium">Status:</span> {{ selectedTournament.status }}</p>
                  <p><span class="font-medium">Start Date:</span> {{ formatDate(selectedTournament.startDate) }}</p>
                  <p><span class="font-medium">End Date:</span> {{ formatDate(selectedTournament.endDate) }}</p>
                  <p><span class="font-medium">Level:</span> {{ selectedTournament.level }}</p>
                </div>
              </div>
            </div>

            <div v-if="tournamentStats">
              <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-medium text-green-900 mb-2">Tournament Statistics</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-green-700"><span class="font-medium">Registered Players:</span> {{ tournamentStats.totalPlayers }}</p>
                    <p class="text-green-700"><span class="font-medium">Communities:</span> {{ tournamentStats.communities.length }}</p>
                  </div>
                  <div>
                    <p class="text-green-700"><span class="font-medium">Counties:</span> {{ tournamentStats.counties.length }}</p>
                    <p class="text-green-700"><span class="font-medium">Regions:</span> {{ tournamentStats.regions.length }}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Algorithm Configuration</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Type</label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    v-model="algorithmConfig.special" 
                    :value="false" 
                    class="mr-2"
                  />
                  <span>Regular Tournament (Community → County → Regional → National)</span>
                </label>
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    v-model="algorithmConfig.special" 
                    :value="true" 
                    class="mr-2"
                  />
                  <span>Special Tournament (Mixed-player elimination)</span>
                </label>
              </div>
            </div>

            <div v-if="!algorithmConfig.special">
              <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Level</label>
              <select 
                v-model="algorithmConfig.level" 
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="community">Community Level</option>
                <option value="county">County Level</option>
                <option value="regional">Regional Level</option>
                <option value="national">National Level</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Scheduling Preference</label>
              <select 
                v-model="algorithmConfig.schedulingPreference" 
                class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekend">Weekend Only</option>
                <option value="full_week">Full Week</option>
              </select>
            </div>

            <div class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="font-medium text-yellow-900 mb-2">Expected Structure</h4>
              <div class="text-sm text-yellow-700">
                <p v-if="algorithmConfig.special">
                  • Single elimination bracket<br/>
                  • Cross-community competition<br/>
                  • Top 3 positions determined
                </p>
                <p v-else>
                  • {{ algorithmConfig.level }} level initialization<br/>
                  • Hierarchical progression structure<br/>
                  • Geographic grouping maintained
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Initialization Controls -->
      <div class="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Initialize Tournament</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 mb-2">Ready to initialize tournament with algorithm?</p>
                <div v-if="initializationPreview" class="text-sm text-gray-500">
                  <p>• Will generate {{ initializationPreview.estimatedMatches }} initial matches</p>
                  <p>• Tournament structure will be created for {{ initializationPreview.level }} level</p>
                  <p>• Scheduling optimized for {{ algorithmConfig.schedulingPreference === 'weekend' ? 'weekends' : 'full week' }}</p>
                </div>
              </div>
              <Button 
                @click="initializeTournament" 
                :disabled="!canInitialize || initializing"
                size="lg"
                class="ml-4"
              >
                <Cpu class="w-4 h-4 mr-2" :class="{ 'animate-pulse': initializing }" />
                {{ initializing ? 'Initializing...' : 'Initialize Tournament' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Initialization Results -->
      <div v-if="initializationResult" class="mt-6">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <CheckCircle v-if="initializationResult.success" class="w-5 h-5 text-green-600" />
              <XCircle v-else class="w-5 h-5 text-red-600" />
              Initialization {{ initializationResult.success ? 'Successful' : 'Failed' }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="initializationResult.success" class="space-y-4">
              <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-medium text-green-900 mb-2">Tournament Initialized Successfully</h4>
                <div class="text-sm text-green-700">
                  <p>• Tournament ID: {{ initializationResult.tournamentId }}</p>
                  <p>• Initial matches created: {{ initializationResult.matches?.length || 0 }}</p>
                  <p>• Bracket structure established</p>
                </div>
              </div>
              
              <div class="flex gap-2">
                <Button @click="navigateToAdmin" variant="outline">
                  <ArrowRight class="w-4 h-4 mr-2" />
                  Go to Admin Dashboard
                </Button>
                <Button @click="viewTournament" variant="outline">
                  <Eye class="w-4 h-4 mr-2" />
                  View Tournament
                </Button>
              </div>
            </div>
            
            <div v-else class="bg-red-50 p-4 rounded-lg">
              <h4 class="font-medium text-red-900 mb-2">Initialization Failed</h4>
              <p class="text-sm text-red-700">{{ initializationResult.error }}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournaments } from '@/composables/useTournaments'
import { algorithmService, type AlgorithmInitParams } from '@/services/algorithmService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/composables/useToast'
import { 
  RefreshCw, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Eye 
} from 'lucide-vue-next'

const router = useRouter()
const { success, error: showError } = useToast()
const { tournaments, loading, loadAllTournaments } = useTournaments()

// Health check
const healthStatus = ref({ healthy: false, message: 'Checking...', responseTime: 0 })
const checkingHealth = ref(false)

// Tournament selection
const selectedTournamentId = ref('')
const selectedTournament = ref(null)
const tournamentStats = ref(null)

// Algorithm configuration
const algorithmConfig = ref({
  special: false,
  level: 'community' as 'community' | 'county' | 'regional' | 'national',
  schedulingPreference: 'weekend' as 'weekend' | 'full_week'
})

// Initialization state
const initializing = ref(false)
const initializationResult = ref(null)
const initializationPreview = ref(null)

// Computed properties
const eligibleTournaments = computed(() => 
  tournaments.value.filter(t => t.status === 'upcoming' || t.status === 'registration_open')
)

const canInitialize = computed(() => 
  selectedTournamentId.value && 
  healthStatus.value.healthy && 
  !initializing.value &&
  tournamentStats.value
)

// Methods
const checkHealth = async () => {
  checkingHealth.value = true
  try {
    healthStatus.value = await algorithmService.checkServiceHealth()
  } catch (error) {
    healthStatus.value = { healthy: false, message: 'Service unavailable', responseTime: 0 }
  } finally {
    checkingHealth.value = false
  }
}

const onTournamentSelect = async () => {
  if (!selectedTournamentId.value) {
    selectedTournament.value = null
    tournamentStats.value = null
    return
  }

  selectedTournament.value = tournaments.value.find(t => t.id === selectedTournamentId.value)
  
  // Simulate getting tournament statistics
  // In a real implementation, this would fetch from the registrations collection
  tournamentStats.value = {
    totalPlayers: Math.floor(Math.random() * 50) + 20,
    communities: ['COMM_KISUMU_CENTRAL_001', 'COMM_KISUMU_EAST_002'],
    counties: ['COUNTY_KISUMU'],
    regions: ['REGION_NYANZA']
  }

  // Generate preview
  generateInitializationPreview()
}

const generateInitializationPreview = () => {
  if (!tournamentStats.value) return
  
  const players = tournamentStats.value.totalPlayers
  let estimatedMatches = 0
  
  if (algorithmConfig.value.special) {
    // Special tournament - single elimination
    estimatedMatches = Math.ceil(players * 0.8) // Rough estimate
  } else {
    // Regular tournament - depends on level
    switch (algorithmConfig.value.level) {
      case 'community':
        estimatedMatches = Math.ceil(players * 0.6)
        break
      case 'county':
        estimatedMatches = Math.ceil(tournamentStats.value.communities.length * 2)
        break
      case 'regional':
        estimatedMatches = Math.ceil(tournamentStats.value.counties.length * 2)
        break
      case 'national':
        estimatedMatches = Math.ceil(tournamentStats.value.regions.length * 2)
        break
    }
  }
  
  initializationPreview.value = {
    estimatedMatches,
    level: algorithmConfig.value.special ? 'special' : algorithmConfig.value.level
  }
}

const initializeTournament = async () => {
  if (!selectedTournamentId.value) return
  
  initializing.value = true
  initializationResult.value = null
  
  try {
    const params: AlgorithmInitParams = {
      tournamentId: selectedTournamentId.value,
      special: algorithmConfig.value.special,
      level: algorithmConfig.value.level,
      schedulingPreference: algorithmConfig.value.schedulingPreference
    }
    
    const result = await algorithmService.initializeTournament(params)
    
    initializationResult.value = result
    
    if (result.success) {
      success(
        'Tournament Initialized', 
        `Tournament has been successfully initialized with ${result.matches?.length || 0} matches created.`
      )
    } else {
      showError(
        'Initialization Failed', 
        result.error || 'Failed to initialize tournament'
      )
    }
  } catch (error) {
    showError(
      'Initialization Error', 
      error instanceof Error ? error.message : 'An unexpected error occurred'
    )
    initializationResult.value = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  } finally {
    initializing.value = false
  }
}

const navigateToAdmin = () => {
  if (!selectedTournament.value) return
  
  const level = algorithmConfig.value.special ? 'special' : algorithmConfig.value.level
  router.push(`/admin/algorithm/${level}/${selectedTournamentId.value}`)
}

const viewTournament = () => {
  if (!selectedTournamentId.value) return
  router.push(`/tournaments/${selectedTournamentId.value}`)
}

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(async () => {
  await loadAllTournaments()
  await checkHealth()
})
</script>