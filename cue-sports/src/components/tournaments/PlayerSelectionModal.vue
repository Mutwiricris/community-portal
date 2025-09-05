<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Register Player for Tournament</DialogTitle>
        <DialogDescription>
          Select a player (userType: "player") to register for "{{ tournamentName }}"
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Search Players -->
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

        <!-- Filter by User Type -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Player Type</label>
          <Select v-model="userTypeFilter">
            <option value="all">All Players</option>
            <option value="player">Players Only</option>
          </Select>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>

        <!-- No Players Found -->
        <div v-else-if="filteredPlayers.length === 0" class="text-center py-8">
          <Users class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 class="text-lg font-medium mb-2">No Players Found</h3>
          <p class="text-muted-foreground">
            {{ searchQuery ? 'No players match your search criteria.' : 'No users with userType "player" found. Please ensure users have the correct userType.' }}
          </p>
        </div>

        <!-- Players List -->
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <div
            v-for="player in filteredPlayers"
            :key="player.uid"
            @click="selectPlayer(player)"
            :class="[
              'flex items-center space-x-3 p-3 rounded-lg border transition-colors',
              isPlayerAlreadyRegistered(player.uid) 
                ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 cursor-not-allowed opacity-60'
                : !hasValidCommunity(player)
                ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 cursor-not-allowed opacity-60'
                : selectedPlayer?.uid === player.uid
                ? 'border-primary bg-primary/5 cursor-pointer'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800 cursor-pointer'
            ]"
          >
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
            <div v-if="isPlayerAlreadyRegistered(player.uid)" class="text-yellow-600">
              <Badge variant="secondary" class="text-xs">Already Registered</Badge>
            </div>
            <div v-else-if="!hasValidCommunity(player)" class="text-orange-600">
              <Badge variant="outline" class="text-xs border-orange-600 text-orange-600">Cannot Register</Badge>
            </div>
            <div v-else-if="selectedPlayer?.uid === player.uid" class="text-primary">
              <CheckCircle class="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="flex gap-2">
        <Button variant="outline" @click="$emit('close')">
          Cancel
        </Button>
        <Button 
          variant="outline" 
          @click="$emit('openBulkRegistration')"
          class="flex items-center gap-2"
        >
          <Users class="h-4 w-4" />
          Bulk Register
        </Button>
        <Button 
          @click="registerPlayer" 
          :disabled="!selectedPlayer || registering || (selectedPlayer && (isPlayerAlreadyRegistered(selectedPlayer.uid) || !hasValidCommunity(selectedPlayer)))"
          class="min-w-24"
        >
          {{ registering ? 'Registering...' : 'Register Player' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Users, CheckCircle } from 'lucide-vue-next'
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore'
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
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Select from '@/components/ui/select.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface Props {
  open: boolean
  tournamentId: string
  tournamentName: string
  tournament: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  playerRegistered: [registration: any]
  openBulkRegistration: []
}>()

const { success, error: showError } = useToast()

// State
const loading = ref(false)
const registering = ref(false)
const searchQuery = ref('')
const userTypeFilter = ref('all')
const selectedPlayer = ref<UserProfile | null>(null)
const players = ref<UserProfile[]>([])
const registeredPlayerIds = ref<string[]>([])

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

  return filtered
})

// Methods
const loadPlayers = async () => {
  try {
    loading.value = true
    const db = getFirebaseDb()
    
    // Get all users with userType "player"
    const usersRef = collection(db, 'users')
    const q = query(
      usersRef,
      where('userType', '==', 'player') // Only allow users with userType "player"
    )
    
    const snapshot = await getDocs(q)
    players.value = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as UserProfile[]
    
  } catch (err) {
    console.error('Error loading players:', err)
    showError('Error', 'Failed to load players')
  } finally {
    loading.value = false
  }
}

const selectPlayer = (player: UserProfile) => {
  // Don't allow selecting already registered players
  if (isPlayerAlreadyRegistered(player.uid)) {
    return
  }
  
  // Don't allow selecting players without communities
  if (!hasValidCommunity(player)) {
    return
  }
  
  selectedPlayer.value = player
}

const isPlayerAlreadyRegistered = (playerId: string) => {
  return registeredPlayerIds.value.includes(playerId)
}

const hasValidCommunity = (player: UserProfile): boolean => {
  return !!(player.geographicalContext?.community?.id && player.geographicalContext.community.name)
}

const loadRegisteredPlayerIds = async () => {
  try {
    const db = getFirebaseDb()
    const registrationsRef = collection(db, 'tournament_registrations')
    const q = query(
      registrationsRef,
      where('tournamentId', '==', props.tournamentId)
    )
    
    const snapshot = await getDocs(q)
    registeredPlayerIds.value = snapshot.docs.map(doc => doc.data().playerId)
  } catch (err) {
    console.error('Error loading registered player IDs:', err)
  }
}

const registerPlayer = async () => {
  if (!selectedPlayer.value || !props.tournament) return
  
  // Validate that player has a valid community
  if (!hasValidCommunity(selectedPlayer.value)) {
    showError('Error', 'Player must be assigned to a community before registration')
    return
  }

  try {
    registering.value = true
    const db = getFirebaseDb()
    const authStore = useAuthStore()
    
    // Check if player is already registered for this tournament
    const existingRegistrationQuery = query(
      collection(db, 'tournament_registrations'),
      where('playerId', '==', selectedPlayer.value.uid),
      where('tournamentId', '==', props.tournamentId)
    )
    
    const existingRegistrations = await getDocs(existingRegistrationQuery)
    
    if (!existingRegistrations.empty) {
      showError('Error', `${selectedPlayer.value.displayName || selectedPlayer.value.email} is already registered for this tournament`)
      registering.value = false
      return
    }
    
    // Fetch the player's complete community data
    let playerCommunity = {
      id: '',
      name: '',
      county: '',
      region: ''
    }

    if (selectedPlayer.value.geographicalContext?.community?.id) {
      try {
        const communityDoc = await getDoc(doc(db, 'communities', selectedPlayer.value.geographicalContext.community.id))
        if (communityDoc.exists()) {
          const communityData = communityDoc.data()
          playerCommunity = {
            id: communityDoc.id,
            name: communityData.name || selectedPlayer.value.geographicalContext.community.name || '',
            county: communityData.county || '',
            region: communityData.region || ''
          }
        }
      } catch (err) {
        console.warn('Could not fetch community data:', err)
        // Fallback to basic community info from user profile
        playerCommunity = {
          id: selectedPlayer.value.geographicalContext?.community?.id || '',
          name: selectedPlayer.value.geographicalContext?.community?.name || '',
          county: '',
          region: ''
        }
      }
    }
    
    // Create comprehensive registration document
    const registrationData = {
      playerId: selectedPlayer.value.uid,
      tournamentId: props.tournamentId,
      tournamentName: props.tournamentName,
      playerName: selectedPlayer.value.displayName || selectedPlayer.value.email || 'Unknown User',
      playerEmail: selectedPlayer.value.email,
      playerAvatar: null,
      playerIds: [selectedPlayer.value.uid],
      communityId: playerCommunity.id,
      communityName: playerCommunity.name,
      hierarchicalLevel: props.tournament.hierarchicalLevel || 'community',
      isNationalTournament: props.tournament.isNationalTournament || false,
      entryFee: props.tournament.entryFee || 0,
      status: 'pending' as const, // Start as pending until payment is confirmed
      paymentStatus: 'pending' as const, // Payment starts as pending
      registeredAt: Timestamp.now(),
      confirmedAt: null, // Will be set when payment is confirmed
      cancelledAt: null,
      cancellationReason: null,
      paymentId: `payment_${selectedPlayer.value.uid}_${Date.now()}`,
      paymentCompletedAt: null, // Will be set when payment is completed
      paymentMethod: 'cash' as const, // Default to cash for admin registrations
      registeredBy: authStore.user?.uid || 'system',
      metadata: {
        demoRegistration: false,
        registrationMethod: 'admin_registration',
        paymentReference: `REF_${Date.now()}`,
        playerCommunityAtRegistration: {
          id: playerCommunity.id,
          name: playerCommunity.name,
          county: playerCommunity.county,
          region: playerCommunity.region
        }
      }
    }

    // Add to tournament_registrations collection
    await addDoc(collection(db, 'tournament_registrations'), registrationData)
    
    // Update tournament's currentRegistrations count and registeredPlayerIds array
    const tournamentRef = doc(db, 'tournaments', props.tournamentId)
    const tournamentDoc = await getDoc(tournamentRef)
    if (tournamentDoc.exists()) {
      const tournamentData = tournamentDoc.data()
      const currentCount = tournamentData.currentRegistrations || 0
      const currentPlayerIds = tournamentData.registeredPlayerIds || []
      
      // Add player ID to registeredPlayerIds array if not already present
      const updatedPlayerIds = currentPlayerIds.includes(selectedPlayer.value.uid) 
        ? currentPlayerIds 
        : [...currentPlayerIds, selectedPlayer.value.uid]
      
      await updateDoc(tournamentRef, {
        currentRegistrations: currentCount + 1,
        registeredPlayerIds: updatedPlayerIds
      })
    }
    
    success('Success', `${selectedPlayer.value.displayName || selectedPlayer.value.email || 'User'} has been registered for the tournament`)
    
    // Emit event with registration data
    emit('playerRegistered', registrationData)
    
    // Close modal
    emit('close')
    
  } catch (err) {
    console.error('Error registering player:', err)
    showError('Error', 'Failed to register player')
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

// Lifecycle
onMounted(() => {
  if (props.open) {
    loadPlayers()
    loadRegisteredPlayerIds()
  }
})

// Watch for modal open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadPlayers()
    loadRegisteredPlayerIds()
    selectedPlayer.value = null
    searchQuery.value = ''
    userTypeFilter.value = 'all'
  }
})
</script>