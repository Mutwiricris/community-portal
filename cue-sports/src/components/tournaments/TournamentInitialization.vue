<template>
  <Dialog :open="open" @close="handleClose">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Cpu class="h-5 w-5" />
          Initialize Tournament Matches
        </DialogTitle>
        <DialogDescription>
          Configure and initialize matches for {{ tournament?.name }}
        </DialogDescription>
      </DialogHeader>

      <!-- Algorithm Health Status -->
      <div class="mb-6">
        <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div class="flex items-center gap-2">
            <div 
              class="w-3 h-3 rounded-full" 
              :class="algorithmHealth.healthy ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-sm font-medium">Algorithm Service</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">{{ algorithmHealth.message }}</span>
            <Button 
              @click="checkAlgorithmHealth" 
              :disabled="checkingHealth" 
              size="sm" 
              variant="ghost"
            >
              <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': checkingHealth }" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Player Summary -->
      <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 class="font-medium text-blue-900 dark:text-blue-300 mb-2">Tournament Summary</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-blue-700 dark:text-blue-400">Registered Players:</span>
            <span class="ml-2 font-medium">{{ registeredPlayers.length }}</span>
          </div>
          <div>
            <span class="text-blue-700 dark:text-blue-400">Confirmed Players:</span>
            <span class="ml-2 font-medium">{{ confirmedPlayers.length }}</span>
          </div>
          <div v-if="communitySummary.length > 0">
            <span class="text-blue-700 dark:text-blue-400">Communities:</span>
            <span class="ml-2 font-medium">{{ communitySummary.length }}</span>
          </div>
          <div>
            <span class="text-blue-700 dark:text-blue-400">Tournament Type:</span>
            <span class="ml-2 font-medium">{{ tournament?.type }}</span>
          </div>
        </div>
      </div>

      <!-- Configuration Options -->
      <div class="space-y-6">
        <!-- Tournament Type Selection -->
        <div class="space-y-3">
          <Label>Tournament Type</Label>
          <RadioGroup v-model="config.special">
            <div class="flex items-center space-x-2">
              <RadioGroupItem :value="false" id="regular" />
              <label 
                for="regular" 
                class="text-sm font-medium cursor-pointer"
              >
                Regular Tournament (Community → County → Regional → National)
              </label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem :value="true" id="special" />
              <label 
                for="special" 
                class="text-sm font-medium cursor-pointer"
              >
                Special Tournament (Mixed-player elimination)
              </label>
            </div>
          </RadioGroup>
        </div>

        <!-- Level Selection (for regular tournaments) -->
        <div v-if="!config.special" class="space-y-3">
          <Label>Tournament Level</Label>
          <select 
            v-model="config.level"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="community">Community Level</option>
            <option value="county">County Level</option>
            <option value="regional">Regional Level</option>
            <option value="national">National Level</option>
          </select>
        </div>

        <!-- Scheduling Preference -->
        <div class="space-y-3">
          <Label>Scheduling Preference</Label>
          <select 
            v-model="config.schedulingPreference"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="weekend">Weekend Only</option>
            <option value="full_week">Full Week</option>
          </select>
        </div>

        <!-- Preview Section -->
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 class="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Initialization Preview</h4>
          <div class="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
            <p v-if="config.special">
              • Single elimination bracket with cross-community matches
            </p>
            <p v-else>
              • {{ config.level }} level tournament structure
            </p>
            <p>• {{ config.schedulingPreference === 'weekend' ? 'Weekend' : 'Full week' }} scheduling</p>
            <p>• Will generate matches for {{ confirmedPlayers.length }} players</p>
            <p v-if="!config.special && communitySummary.length > 0">
              • {{ communitySummary.length }} communities participating
            </p>
          </div>
        </div>

        <!-- Warning/Info Messages -->
        <div v-if="validationMessage" class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <p class="text-sm text-orange-700 dark:text-orange-400">{{ validationMessage }}</p>
        </div>
      </div>

      <!-- Actions -->
      <DialogFooter class="flex justify-between items-center">
        <Button @click="handleClose" variant="outline">Cancel</Button>
        <Button 
          @click="initializeTournament" 
          :disabled="!canInitialize || initializing"
        >
          <Cpu class="h-4 w-4 mr-2" :class="{ 'animate-pulse': initializing }" />
          {{ initializing ? 'Initializing...' : 'Initialize Tournament' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { algorithmService } from '@/services/algorithmService'
import { tournamentPlayerService } from '@/services/tournamentPlayerService'
import { useToast } from '@/composables/useToast'
import type { Tournament, TournamentRegistration } from '@/types/tournament'
import { 
  Cpu, 
  RefreshCw 
} from 'lucide-vue-next'

// UI Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogDescription from '@/components/ui/dialog-description.vue'
import DialogFooter from '@/components/ui/dialog-footer.vue'
import Button from '@/components/ui/button.vue'
import Label from '@/components/ui/label.vue'
import RadioGroup from '@/components/ui/radio-group.vue'
import RadioGroupItem from '@/components/ui/radio-group-item.vue'

interface Props {
  open: boolean
  tournament: (Tournament & { id: string }) | null
  registeredPlayers: TournamentRegistration[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  initialized: [result: any]
}>()

const { success, error: showError } = useToast()

// State
const algorithmHealth = ref({
  healthy: false,
  message: 'Checking...',
  responseTime: 0
})
const checkingHealth = ref(false)
const initializing = ref(false)

// Configuration
const config = ref({
  special: false,
  level: 'community' as 'community' | 'county' | 'regional' | 'national',
  schedulingPreference: 'weekend' as 'weekend' | 'full_week'
})

// Computed
const confirmedPlayers = computed(() => 
  props.registeredPlayers.filter(p => p.status === 'confirmed')
)

const communitySummary = computed(() => {
  const communities = new Map<string, number>()
  confirmedPlayers.value.forEach(player => {
    if (player.communityId) {
      communities.set(player.communityId, (communities.get(player.communityId) || 0) + 1)
    }
  })
  return Array.from(communities.entries()).map(([id, count]) => ({ id, count }))
})

const validationMessage = computed(() => {
  if (confirmedPlayers.value.length === 0) {
    return 'No confirmed players found. Please ensure players have confirmed status.'
  }
  
  if (confirmedPlayers.value.length < 2) {
    return 'At least 2 confirmed players are required to initialize a tournament.'
  }
  
  if (!config.value.special && config.value.level !== 'community' && communitySummary.value.length < 2) {
    return `${config.value.level} level tournaments require players from multiple communities.`
  }
  
  return ''
})

const canInitialize = computed(() => 
  algorithmHealth.value.healthy && 
  !initializing.value &&
  confirmedPlayers.value.length >= 2 &&
  !validationMessage.value
)

// Methods
const checkAlgorithmHealth = async () => {
  checkingHealth.value = true
  try {
    algorithmHealth.value = await algorithmService.checkServiceHealth()
  } catch (error) {
    algorithmHealth.value = {
      healthy: false,
      message: 'Service unavailable',
      responseTime: 0
    }
  } finally {
    checkingHealth.value = false
  }
}

const initializeTournament = async () => {
  if (!props.tournament || !canInitialize.value) return
  
  initializing.value = true
  
  try {
    console.log('🎯 Initializing tournament with algorithm...')
    console.log('Tournament ID:', props.tournament.id)
    console.log('Config:', config.value)
    console.log('Confirmed players:', confirmedPlayers.value.length)
    
    // Call the algorithm service
    const result = await algorithmService.initializeTournament({
      tournamentId: props.tournament.id,
      special: config.value.special,
      level: config.value.level,
      schedulingPreference: config.value.schedulingPreference
    })
    
    console.log('🎯 Algorithm response:', result)
    
    if (result.success) {
      success(
        'Tournament Initialized',
        `Successfully created ${result.matches?.length || 0} matches`
      )
      emit('initialized', result)
      handleClose()
    } else {
      throw new Error(result.error || 'Failed to initialize tournament')
    }
    
  } catch (error) {
    console.error('❌ Tournament initialization error:', error)
    showError(
      'Initialization Failed',
      error instanceof Error ? error.message : 'Failed to initialize tournament'
    )
  } finally {
    initializing.value = false
  }
}

const handleClose = () => {
  emit('close')
}

// Lifecycle
onMounted(() => {
  checkAlgorithmHealth()
})

// Watch tournament type to set appropriate defaults
watch(() => props.tournament, (tournament) => {
  if (tournament) {
    // Set default level based on tournament type
    if (tournament.type) {
      config.value.level = tournament.type as any
    }
  }
}, { immediate: true })
</script>