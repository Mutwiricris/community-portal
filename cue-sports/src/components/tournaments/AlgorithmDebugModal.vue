<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Algorithm Debug Information</DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Tournament Info -->
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 class="font-medium text-blue-900 dark:text-blue-300 mb-2">Tournament Information</h3>
          <div class="text-sm space-y-1">
            <p><strong>ID:</strong> {{ tournament?.id }}</p>
            <p><strong>Name:</strong> {{ tournament?.name }}</p>
            <p><strong>Type:</strong> {{ tournament?.type }}</p>
            <p><strong>Status:</strong> {{ tournament?.status }}</p>
            <p><strong>Registered Players IDs:</strong> {{ tournament?.registeredPlayerIds?.length || 0 }}</p>
          </div>
        </div>

        <!-- Player Analysis -->
        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 class="font-medium text-green-900 dark:text-green-300 mb-2">Player Analysis</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="text-left p-2">Player Name</th>
                  <th class="text-left p-2">Player ID</th>
                  <th class="text-left p-2">Community ID</th>
                  <th class="text-left p-2">Community Name</th>
                  <th class="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="player in registeredPlayers" :key="player.id" class="border-b">
                  <td class="p-2">{{ player.playerName }}</td>
                  <td class="p-2 font-mono text-xs">{{ player.playerId }}</td>
                  <td class="p-2 font-mono text-xs">
                    <span v-if="player.communityId" class="text-green-600">{{ player.communityId }}</span>
                    <span v-else class="text-red-600">MISSING</span>
                  </td>
                  <td class="p-2">{{ player.communityName || 'N/A' }}</td>
                  <td class="p-2">
                    <Badge :variant="player.status === 'confirmed' ? 'default' : 'secondary'">
                      {{ player.status }}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Algorithm Requirements -->
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h3 class="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Algorithm Requirements</h3>
          <div class="text-sm space-y-2">
            <p>✅ Tournament must exist in Firebase</p>
            <p :class="hasRegisteredPlayerIds ? 'text-green-600' : 'text-red-600'">
              {{ hasRegisteredPlayerIds ? '✅' : '❌' }} Tournament must have registeredPlayerIds array
            </p>
            <p :class="hasConfirmedPlayers ? 'text-green-600' : 'text-red-600'">
              {{ hasConfirmedPlayers ? '✅' : '❌' }} Players must have confirmed status
            </p>
            <p :class="hasValidCommunityIds ? 'text-green-600' : 'text-red-600'">
              {{ hasValidCommunityIds ? '✅' : '❌' }} Players must have valid communityId
            </p>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="!hasValidCommunityIds" class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <h3 class="font-medium text-red-900 dark:text-red-300 mb-2">Fix Required</h3>
          <div class="text-sm text-red-700 dark:text-red-400">
            <p class="mb-2">Players are missing community IDs. The algorithm requires this information to group players correctly.</p>
            <p class="font-medium">Solutions:</p>
            <ul class="list-disc ml-5 mt-1">
              <li>Update player registrations with proper communityId values</li>
              <li>Ensure players are registered through community-specific registration flows</li>
              <li>Manually update the registration documents with community information</li>
            </ul>
          </div>
        </div>

        <!-- Test Algorithm Call -->
        <div class="border-t pt-4">
          <Button @click="testAlgorithmCall" :disabled="testing" variant="outline">
            <Cpu class="h-4 w-4 mr-2" :class="{ 'animate-pulse': testing }" />
            {{ testing ? 'Testing...' : 'Test Algorithm Call' }}
          </Button>
        </div>

        <!-- Algorithm Response -->
        <div v-if="algorithmResponse" class="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
          <h3 class="font-medium mb-2">Algorithm Response</h3>
          <pre class="text-xs overflow-x-auto">{{ JSON.stringify(algorithmResponse, null, 2) }}</pre>
        </div>
      </div>

      <DialogFooter>
        <Button @click="$emit('close')" variant="outline">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { algorithmService } from '@/services/algorithmService'
import type { Tournament, TournamentRegistration } from '@/types/tournament'
import { Cpu } from 'lucide-vue-next'

// UI Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogFooter from '@/components/ui/dialog-footer.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  open: boolean
  tournament: (Tournament & { id: string }) | null
  registeredPlayers: TournamentRegistration[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// State
const testing = ref(false)
const algorithmResponse = ref<any>(null)

// Computed
const hasRegisteredPlayerIds = computed(() => 
  props.tournament?.registeredPlayerIds && props.tournament.registeredPlayerIds.length > 0
)

const hasConfirmedPlayers = computed(() => 
  props.registeredPlayers.some(p => p.status === 'confirmed')
)

const hasValidCommunityIds = computed(() => 
  props.registeredPlayers.every(p => p.communityId && p.communityId.trim() !== '')
)

// Methods
const testAlgorithmCall = async () => {
  if (!props.tournament) return
  
  testing.value = true
  algorithmResponse.value = null
  
  try {
    const result = await algorithmService.initializeTournament({
      tournamentId: props.tournament.id,
      special: false,
      level: 'community',
      schedulingPreference: 'weekend'
    })
    
    algorithmResponse.value = result
  } catch (error) {
    algorithmResponse.value = {
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }
  } finally {
    testing.value = false
  }
}
</script>