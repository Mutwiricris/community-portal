<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <Button variant="ghost" @click="router.push('/matches')">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Matches
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Create Match</h1>
          <p class="text-muted-foreground">Set up a new tournament match manually</p>
        </div>
      </div>
    </div>

    <!-- Creation Options -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Creation Form -->
      <div class="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Match Creation</CardTitle>
            <p class="text-sm text-muted-foreground">
              Create matches manually or use automated generation
            </p>
          </CardHeader>
          <CardContent>
            <!-- Creation Method Selector -->
            <div class="mb-6">
              <label class="text-sm font-medium mb-3 block">Creation Method</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  class="p-4 border rounded-lg cursor-pointer transition-colors"
                  :class="creationMethod === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'"
                  @click="creationMethod = 'manual'"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-4 h-4 rounded-full border-2" :class="creationMethod === 'manual' ? 'border-primary bg-primary' : 'border-muted-foreground'"></div>
                    <div>
                      <h3 class="font-medium">Manual Creation</h3>
                      <p class="text-sm text-muted-foreground">Create matches one by one with full control</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  class="p-4 border rounded-lg cursor-pointer transition-colors"
                  :class="creationMethod === 'automated' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'"
                  @click="creationMethod = 'automated'"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-4 h-4 rounded-full border-2" :class="creationMethod === 'automated' ? 'border-primary bg-primary' : 'border-muted-foreground'"></div>
                    <div>
                      <h3 class="font-medium">Automated Generation</h3>
                      <p class="text-sm text-muted-foreground">Use algorithms to generate multiple matches</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Manual Creation Form -->
            <div v-if="creationMethod === 'manual'">
              <MatchCreationForm 
                :pre-selected-tournament-id="preSelectedTournamentId"
                @match-created="handleMatchCreated" 
              />
            </div>

            <!-- Automated Generation Form -->
            <div v-else-if="creationMethod === 'automated'" class="space-y-6">
              <div class="p-4 border rounded-lg bg-blue-50">
                <div class="flex items-start space-x-3">
                  <Bot class="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 class="font-medium text-blue-900">Automated Match Generation</h3>
                    <p class="text-sm text-blue-700 mt-1">
                      Generate multiple matches automatically using tournament algorithms and player data.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Tournament Selection -->
              <div class="space-y-4">
                <div>
                  <label class="text-sm font-medium mb-2 block">Tournament</label>
                  <select 
                    v-model="automationConfig.tournamentId" 
                    class="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select a tournament</option>
                    <option 
                      v-for="tournament in availableTournaments" 
                      :key="tournament.id" 
                      :value="tournament.id"
                    >
                      {{ tournament.name }} ({{ tournament.hierarchicalLevel }})
                    </option>
                  </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium mb-2 block">Tournament Level</label>
                    <select 
                      v-model="automationConfig.level" 
                      class="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="community">Community Level</option>
                      <option value="county">County Level</option>
                      <option value="regional">Regional Level</option>
                      <option value="national">National Level</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="text-sm font-medium mb-2 block">Tournament Type</label>
                    <select 
                      v-model="automationConfig.special" 
                      class="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option :value="false">Regular Tournament</option>
                      <option :value="true">Special Tournament</option>
                    </select>
                  </div>
                </div>

                <div class="p-4 bg-blue-50 rounded-lg">
                  <div class="flex items-start space-x-3">
                    <Bot class="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 class="font-medium text-blue-900">Automatic Round Detection</h4>
                      <p class="text-sm text-blue-700 mt-1">
                        The algorithm automatically detects the current round and generates appropriate matches. No manual round input required.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="text-sm font-medium mb-2 block">Scheduling Preference</label>
                  <select 
                    v-model="automationConfig.schedulingPreference" 
                    class="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="weekend">Weekend Only</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <!-- Generation Actions -->
                <div class="flex items-center space-x-2 pt-4">
                  <Button 
                    @click="generateMatches" 
                    :disabled="!automationConfig.tournamentId || automatedGenerating || activeOperations.size > 0"
                    class="flex items-center space-x-2"
                  >
                    <div v-if="automatedGenerating" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <Bot v-else class="h-4 w-4" />
                    <span>{{ automatedGenerating ? 'Generating...' : 'Generate Matches' }}</span>
                  </Button>
                  
                  <Button variant="outline" @click="previewGeneration">
                    <Eye class="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Generated Matches Preview -->
        <Card v-if="generatedMatches.length > 0" class="mt-6">
          <CardHeader>
            <CardTitle>Generated Matches Preview</CardTitle>
            <p class="text-sm text-muted-foreground">{{ generatedMatches.length }} matches ready to create</p>
          </CardHeader>
          <CardContent>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="(match, index) in generatedMatches" 
                :key="index"
                class="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div class="font-medium">
                    {{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}
                  </div>
                  <div class="text-sm text-muted-foreground">
                    Match {{ match.matchNumber }} • {{ match.matchType }}
                  </div>
                </div>
                <Badge variant="outline">{{ match.tournamentLevel }}</Badge>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 mt-4 pt-4 border-t">
              <Button @click="createGeneratedMatches" :disabled="creating || activeOperations.size > 0">
                <div v-if="creating" class="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                <CheckCircle v-else class="h-4 w-4 mr-2" />
                {{ creating ? 'Creating...' : 'Create All Matches' }}
              </Button>
              <Button variant="outline" @click="clearGenerated">
                <X class="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Quick Stats -->
        <Card>
          <CardHeader>
            <CardTitle>Tournament Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Active Tournaments</span>
                <span class="font-medium">{{ tournamentStats.active }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Pending Matches</span>
                <span class="font-medium">{{ tournamentStats.pendingMatches }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-muted-foreground">Registered Players</span>
                <span class="font-medium">{{ tournamentStats.registeredPlayers }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Creation Tips -->
        <Card>
          <CardHeader>
            <CardTitle>Creation Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3 text-sm">
              <div class="flex items-start space-x-2">
                <Lightbulb class="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p>Use manual creation for special matches or when you need full control over player pairing.</p>
              </div>
              <div class="flex items-start space-x-2">
                <Lightbulb class="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p>Automated generation is perfect for regular tournament rounds with multiple matches.</p>
              </div>
              <div class="flex items-start space-x-2">
                <Lightbulb class="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p>Always preview generated matches before creating them to ensure they meet your requirements.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Recent Activity -->
        <Card>
          <CardHeader>
            <CardTitle>Recent Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div 
                v-for="match in recentMatches" 
                :key="match.id"
                class="flex items-center justify-between p-2 border rounded text-sm"
              >
                <div>
                  <div class="font-medium">{{ match.player1Name }} vs {{ match.player2Name || 'BYE' }}</div>
                  <div class="text-xs text-muted-foreground">{{ formatTimeAgo(match.createdAt) }}</div>
                </div>
                <Badge variant="outline" class="text-xs">{{ match.status }}</Badge>
              </div>
              
              <div v-if="recentMatches.length === 0" class="text-center py-4 text-muted-foreground text-sm">
                No recent matches
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Loading Screen -->
    <LoadingScreen
      v-if="showLoadingScreen"
      :title="loadingTitle"
      :subtitle="loadingSubtitle"
      :steps="loadingSteps"
      :logs="loadingLogs"
      :is-loading="isLoading"
      :can-cancel="isLoading"
      @cancel="handleLoadingCancel"
      @continue="handleLoadingContinue"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ArrowLeft, 
  Bot, 
  Eye, 
  CheckCircle, 
  X, 
  Lightbulb 
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import MatchCreationForm from '@/components/matches/MatchCreationForm.vue'
import { useMatches } from '@/composables/useMatches'
import { useTournaments } from '@/composables/useTournaments'
import { useAutomation } from '@/composables/useAutomation'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { algorithmServiceWithProgress } from '@/services/algorithmServiceWithProgress'
import { tournamentPlayerService } from '@/services/tournamentPlayerService'
import type { Match, MatchCreationData } from '@/types/match'
import LoadingScreen from '@/components/ui/LoadingScreen.vue'
import type { LoadingStep, LogMessage } from '@/components/ui/LoadingScreen.vue'

const router = useRouter()
const route = useRoute()
const { createMatchesBatch, matches, searchMatches } = useMatches()
const { initializeAutomation } = useAutomation()
const { user } = useAuth()
const { success, error: showError } = useToast()

// Get tournament ID from query params
const preSelectedTournamentId = computed(() => route.query.tournamentId as string || '')

// State
const creationMethod = ref<'manual' | 'automated'>('manual')
const automatedGenerating = ref(false)
const creating = ref(false)
const generatedMatches = ref<MatchCreationData[]>([])

// Track active operations to prevent conflicts
const activeOperations = ref(new Set<string>())

// Loading screen state
const showLoadingScreen = ref(false)
const loadingTitle = ref('')
const loadingSubtitle = ref('')
const loadingSteps = ref<LoadingStep[]>([])
const loadingLogs = ref<LogMessage[]>([])
const isLoading = ref(false)

const automationConfig = ref({
  tournamentId: '',
  level: 'community' as 'community' | 'county' | 'regional' | 'national',
  special: false,
  schedulingPreference: 'weekend' as 'weekend' | 'full_week'
})

// Tournament data
const { tournaments, loadAllTournaments, subscribeTournaments } = useTournaments()
const availableTournaments = computed(() => 
  tournaments.value.filter(t => ['registration_open', 'ongoing', 'registration_closed', 'upcoming'].includes(t.status))
)

const tournamentStats = ref({
  active: 5,
  pendingMatches: 23,
  registeredPlayers: 127
})

const recentMatches = ref<Match[]>([])

// Methods
const handleMatchCreated = (matchId: string) => {
  success('Match created successfully')
  router.push(`/matches/${matchId}`)
}

// Loading screen helpers
const initializeLoadingScreen = () => {
  loadingSteps.value = [
    { name: 'Validate', description: 'Validating tournament and player data', status: 'pending' },
    { name: 'Health Check', description: 'Testing algorithm service connectivity', status: 'pending' },
    { name: 'Prepare', description: 'Preparing tournament data for algorithm', status: 'pending' },
    { name: 'Connect', description: 'Connecting to algorithm service', status: 'pending' },
    { name: 'Process', description: 'Generating matches with algorithm', status: 'pending' },
    { name: 'Convert', description: 'Converting matches to application format', status: 'pending' }
  ]
  loadingLogs.value = []
  showLoadingScreen.value = true
  isLoading.value = true
}

const updateLoadingStep = (stepName: string, description: string, status: 'running' | 'completed' | 'error') => {
  const step = loadingSteps.value.find(s => s.name.toLowerCase() === stepName.toLowerCase())
  if (step) {
    step.description = description
    step.status = status
  }
}

const addLoadingLog = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  loadingLogs.value.push({
    message,
    type,
    timestamp: new Date()
  })
}

const generateMatches = async () => {
  if (!automationConfig.value.tournamentId) {
    showError('Please select a tournament')
    return
  }

  if (!user.value) {
    showError('User not authenticated')
    return
  }

  // Prevent multiple simultaneous operations
  const operationKey = `generate-${automationConfig.value.tournamentId}`
  if (activeOperations.value.has(operationKey)) {
    showError('Match generation is already in progress for this tournament')
    return
  }

  activeOperations.value.add(operationKey)
  automatedGenerating.value = true
  
  // Initialize loading screen
  loadingTitle.value = 'Generating Tournament Matches'
  loadingSubtitle.value = `Creating matches for ${automationConfig.value.level} level tournament`
  initializeLoadingScreen()
  
  try {
    // Progress callbacks
    const progressCallback = {
      onStepUpdate: updateLoadingStep,
      onLog: addLoadingLog
    }
    
    updateLoadingStep('validate', 'Getting confirmed registered players', 'running')
    
    // Get confirmed registered players
    const players = await tournamentPlayerService.getConfirmedRegisteredPlayers(automationConfig.value.tournamentId)
    addLoadingLog(`Found ${players.length} confirmed players`, 'info')
    
    if (players.length === 0) {
      throw new Error('No confirmed players registered for this tournament. Please ensure players are registered and their status is set to "confirmed".')
    }
    
    if (players.length < 4) {
      throw new Error(`Insufficient players for tournament. Found ${players.length}, minimum required: 4`)
    }
    
    // Validate player requirements
    const validation = tournamentPlayerService.validatePlayerRequirements(players)
    if (!validation.valid) {
      throw new Error(validation.message)
    }
    
    addLoadingLog(`Validated ${players.length} players successfully`, 'success')
    
    // Prepare players for algorithm
    const algorithmPlayers = tournamentPlayerService.preparePlayersForAlgorithm(players)
    
    updateLoadingStep('validate', 'Updating tournament document', 'running')
    
    // Update tournament document with registeredPlayersIds 
    const { updateTournament, getTournament } = useTournaments()
    
    await updateTournament(automationConfig.value.tournamentId, {
      registeredPlayersIds: algorithmPlayers.map(p => p.id),
      registeredPlayerIds: algorithmPlayers.map(p => p.id),
      currentRegistrations: algorithmPlayers.length,
      status: 'registration_closed'
    })
    
    addLoadingLog(`Tournament updated with ${algorithmPlayers.length} registered player IDs`, 'success')
    
    // Verify tournament document was updated correctly
    const updatedTournament = await getTournament(automationConfig.value.tournamentId)
    
    // Validate all algorithm requirements before API call
    const validationIssues = []
    
    if (!updatedTournament) {
      validationIssues.push('Tournament document not found')
    } else {
      if (!updatedTournament.registeredPlayersIds || updatedTournament.registeredPlayersIds.length === 0) {
        validationIssues.push('No registeredPlayersIds in tournament document')
      }
      if (!updatedTournament.name) {
        validationIssues.push('Tournament missing name field')
      }
      if (!['registration_closed', 'ongoing', 'upcoming'].includes(updatedTournament.status)) {
        validationIssues.push(`Tournament status '${updatedTournament.status}' may prevent algorithm processing`)
      }
      if (!updatedTournament.hierarchicalLevel) {
        validationIssues.push('Tournament missing hierarchicalLevel field')
      }
    }
    
    if (algorithmPlayers.length < 4) {
      validationIssues.push(`Insufficient players: ${algorithmPlayers.length} (minimum 4 required)`)
    }
    
    // Validate player data format
    algorithmPlayers.forEach((player, index) => {
      if (!player.id) validationIssues.push(`Player ${index + 1} missing ID`)
      if (!player.name) validationIssues.push(`Player ${index + 1} missing name`)
      if (!player.communityId) validationIssues.push(`Player ${index + 1} missing communityId`)
    })
    
    if (validationIssues.length > 0) {
      addLoadingLog(`Found ${validationIssues.length} validation issues`, 'warning')
      validationIssues.forEach(issue => addLoadingLog(issue, 'warning'))
      throw new Error(`Validation failed: ${validationIssues.join('; ')}`)
    } else {
      addLoadingLog('All algorithm requirements validated successfully', 'success')
    }
    
    // Test algorithm service connectivity
    const healthCheck = await algorithmServiceWithProgress.checkServiceHealth(progressCallback)
    
    if (!healthCheck.healthy) {
      throw new Error(`Algorithm service is not available: ${healthCheck.message}`)
    }
    
    // Call algorithm service based on method
    let algorithmResponse
    
    // Extract community ID from players first to determine tournament type
    const communities = [...new Set(algorithmPlayers.map(p => p.communityId).filter(Boolean))]
    addLoadingLog(`Found communities in tournament: ${communities.join(', ')}`, 'info')
    
    // Auto-detect if this should be a special tournament based on community diversity
    const shouldUseSpecialMode = automationConfig.value.special || communities.length > 1
    
    if (shouldUseSpecialMode && communities.length > 1) {
      addLoadingLog(`Auto-detected MULTI-COMMUNITY tournament (${communities.length} communities)`, 'info')
    }
    
    if (shouldUseSpecialMode) {
      addLoadingLog('Using SPECIAL tournament mode', 'info')
      // Special tournament initialization - handles players from multiple communities or special tournament rules
      algorithmResponse = await algorithmServiceWithProgress.initializeTournamentWithChunking({
        tournamentId: automationConfig.value.tournamentId,
        special: true,
        level: automationConfig.value.level || 'community',
        schedulingPreference: automationConfig.value.schedulingPreference,
        players: algorithmPlayers
      }, progressCallback)
    } else {
      // Single-community tournament - proceed with community-specific logic
      try {
        if (communities.length === 0) {
          throw new Error('No communities found in player data')
        }
        
        // Use the single community for round generation
        const communityId = communities[0]
        addLoadingLog(`Using community ID for round generation: ${communityId}`, 'info')
        
        // First try to generate next round
        algorithmResponse = await algorithmServiceWithProgress.generateCommunityRound({
          tournamentId: automationConfig.value.tournamentId,
          communityId: communityId,
          level: automationConfig.value.level
        }, progressCallback)
        
        if (!algorithmResponse.success) {
          // Check if tournament is already completed
          if (algorithmResponse.error && algorithmResponse.error.includes('Community tournament completed')) {
            throw new Error('This tournament has already been completed. Please create a new tournament or use a different tournament ID.')
          }
          
          // If next round fails for other reasons, try initialization
          addLoadingLog('Community round failed, trying tournament initialization...', 'warning')
          algorithmResponse = await algorithmServiceWithProgress.initializeTournamentWithChunking({
            tournamentId: automationConfig.value.tournamentId,
            level: automationConfig.value.level,
            schedulingPreference: automationConfig.value.schedulingPreference,
            players: algorithmPlayers
          }, progressCallback)
        }
      } catch (error) {
        // Fallback to initialization
        addLoadingLog('Falling back to tournament initialization', 'warning')
        algorithmResponse = await algorithmServiceWithProgress.initializeTournamentWithChunking({
          tournamentId: automationConfig.value.tournamentId,
          level: automationConfig.value.level,
          schedulingPreference: automationConfig.value.schedulingPreference,
          players: algorithmPlayers
        }, progressCallback)
      }
    }
    
    addLoadingLog(`Algorithm response - Success: ${algorithmResponse.success}`, algorithmResponse.success ? 'success' : 'error')
    addLoadingLog(`Matches returned: ${algorithmResponse.matches?.length || 0}`, 'info')
    
    if (!algorithmResponse.success) {
      // Check if matches were generated despite success=false (backend write issue)
      if (algorithmResponse.matches && algorithmResponse.matches.length > 0) {
        addLoadingLog('Backend returned success=false but matches exist - proceeding anyway', 'warning')
      } else if (algorithmResponse.metadata?.totalMatchesGenerated && algorithmResponse.metadata.totalMatchesGenerated > 0) {
        addLoadingLog(`Backend generated ${algorithmResponse.metadata.totalMatchesGenerated} matches but did not return them`, 'warning')
        throw new Error(`The algorithm generated ${algorithmResponse.metadata.totalMatchesGenerated} matches but could not return them. This is a known backend issue. Please check the Firebase console or try refreshing the page.`)
      } else {
        throw new Error(algorithmResponse.error || 'Algorithm failed to generate matches. This may be due to tournament already being initialized, insufficient players, or backend connectivity issues.')
      }
    }
    
    // Check if tournament is completed in algorithm system
    if ('tournamentComplete' in algorithmResponse && algorithmResponse.tournamentComplete === true) {
      addLoadingLog('Algorithm indicates tournament is completed', 'warning')
      throw new Error('Tournament appears to be completed in the algorithm system. To generate new matches, please create a new tournament with a different name/ID.')
    }
    
    if (!algorithmResponse.matches || algorithmResponse.matches.length === 0) {
      addLoadingLog('Algorithm succeeded but returned no matches', 'warning')
      throw new Error('Algorithm returned no matches. This may indicate all matches for this round have already been generated or the tournament is in a state where no new matches can be created.')
    }
    
    // Convert algorithm matches to our format
    const matchCreationData = algorithmServiceWithProgress.convertAlgorithmMatches(
      algorithmResponse.matches,
      automationConfig.value.tournamentId,
      user.value.uid,
      progressCallback
    )
    
    generatedMatches.value = matchCreationData
    addLoadingLog(`Generated ${matchCreationData.length} matches successfully`, 'success')
    
    // Provide context about tournament type
    if (shouldUseSpecialMode && communities.length > 1) {
      success(`Generated ${matchCreationData.length} matches for multi-community tournament (${communities.length} communities)`)
    } else if (shouldUseSpecialMode) {
      success(`Generated ${matchCreationData.length} matches for special tournament`)
    } else {
      success(`Generated ${matchCreationData.length} matches for ${communities[0]} community`)
    }
    
    // Mark loading as complete
    isLoading.value = false
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLoadingLog(`Match generation error: ${errorMessage}`, 'error')
    updateLoadingStep('process', 'Match generation failed', 'error')
    isLoading.value = false
    
    // Check if this might be a backend issue where matches were created but not returned
    if (error instanceof Error && error.message.includes('backend issue')) {
      // Import the check function
      const { checkAlgorithmMatches } = await import('@/utils/checkAlgorithmMatches')
      
      addLoadingLog('Waiting 2 seconds for backend writes to complete...', 'info')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if matches were actually created
      const result = await checkAlgorithmMatches(automationConfig.value.tournamentId)
      
      if (result.found && result.count > 0) {
        addLoadingLog(`Found ${result.count} matches in the database`, 'success')
        showError(
          'Matches Created Successfully', 
          `${result.count} matches were created but the algorithm couldn't return them properly. Please refresh the page to see the matches.`,
          'warning'
        )
      } else {
        showError('Failed to generate matches', errorMessage)
      }
    } else {
      showError('Failed to generate matches', errorMessage)
    }
  } finally {
    const operationKey = `generate-${automationConfig.value.tournamentId}`
    activeOperations.value.delete(operationKey)
    automatedGenerating.value = false
  }
}

// Loading screen event handlers
const handleLoadingCancel = () => {
  showLoadingScreen.value = false
  isLoading.value = false
  automatedGenerating.value = false
  
  // Clear any active operations
  const operationKey = `generate-${automationConfig.value.tournamentId}`
  activeOperations.value.delete(operationKey)
  
  addLoadingLog('Operation cancelled by user', 'warning')
}

const handleLoadingContinue = () => {
  showLoadingScreen.value = false
}

const previewGeneration = () => {
  success('Preview functionality - see generated matches below after generation')
}

const createGeneratedMatches = async () => {
  if (!user.value) {
    showError('User not authenticated')
    return
  }

  // Prevent multiple simultaneous creation operations
  const operationKey = `create-${automationConfig.value.tournamentId}`
  if (activeOperations.value.has(operationKey)) {
    showError('Match creation is already in progress')
    return
  }

  activeOperations.value.add(operationKey)
  creating.value = true
  
  // Initialize loading screen for match creation
  loadingTitle.value = 'Creating Tournament Matches'
  loadingSubtitle.value = `Saving ${generatedMatches.value.length} matches to database`
  loadingSteps.value = [
    { name: 'Validate', description: 'Validating match data', status: 'pending' },
    { name: 'Create', description: 'Creating matches in database', status: 'pending' },
    { name: 'Index', description: 'Indexing matches for search', status: 'pending' },
    { name: 'Complete', description: 'Finalizing match creation', status: 'pending' }
  ]
  loadingLogs.value = []
  showLoadingScreen.value = true
  isLoading.value = true
  
  try {
    updateLoadingStep('validate', 'Validating match data', 'running')
    addLoadingLog(`Validating ${generatedMatches.value.length} matches...`, 'info')
    
    if (generatedMatches.value.length === 0) {
      throw new Error('No matches to create')
    }
    
    updateLoadingStep('validate', 'Match data validated', 'completed')
    updateLoadingStep('create', 'Creating matches in database', 'running')
    
    addLoadingLog(`Creating ${generatedMatches.value.length} matches in database...`, 'info')
    const createdMatches = await createMatchesBatch(generatedMatches.value, user.value.uid)
    
    updateLoadingStep('create', 'Matches created successfully', 'completed')
    updateLoadingStep('index', 'Indexing matches', 'running')
    
    addLoadingLog(`Successfully created ${createdMatches.length} matches`, 'success')
    
    updateLoadingStep('index', 'Matches indexed', 'completed')
    updateLoadingStep('complete', 'Match creation completed', 'running')
    
    success(`Successfully created ${createdMatches.length} matches`)
    
    updateLoadingStep('complete', 'All operations completed', 'completed')
    isLoading.value = false
    
    // Small delay to show completion
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Clear generated matches and redirect
    generatedMatches.value = []
    showLoadingScreen.value = false
    router.push('/matches')
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLoadingLog(`Failed to create matches: ${errorMessage}`, 'error')
    updateLoadingStep('create', 'Match creation failed', 'error')
    isLoading.value = false
    
    showError('Failed to create matches', errorMessage)
  } finally {
    const operationKey = `create-${automationConfig.value.tournamentId}`
    activeOperations.value.delete(operationKey)
    creating.value = false
  }
}

const clearGenerated = () => {
  // Clear any active operations for this tournament
  const operationKeys = Array.from(activeOperations.value).filter(key => 
    key.includes(automationConfig.value.tournamentId)
  )
  operationKeys.forEach(key => activeOperations.value.delete(key))
  
  generatedMatches.value = []
  automatedGenerating.value = false
  creating.value = false
  success('Cleared generated matches')
}

// Helper to check if any operations are active
const hasActiveOperations = computed(() => activeOperations.value.size > 0)

// Helper to get active operation types
const getActiveOperations = computed(() => Array.from(activeOperations.value))

const formatTimeAgo = (date: string | Date): string => {
  const now = new Date()
  const matchDate = new Date(date)
  const diffMs = now.getTime() - matchDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// Lifecycle
onMounted(async () => {
  try {
    // Check if automated method is requested from query params
    if (route.query.method === 'automated') {
      creationMethod.value = 'automated'
    }
    
    // Set pre-selected tournament if provided
    if (preSelectedTournamentId.value) {
      automationConfig.value.tournamentId = preSelectedTournamentId.value
    }
    
    // Load all tournaments from Firestore
    await loadAllTournaments()
    
    // Subscribe to tournaments for real-time updates
    subscribeTournaments()
    
    // Load recent matches
    const searchResult = await searchMatches({})
    recentMatches.value = searchResult.matches
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})
</script>