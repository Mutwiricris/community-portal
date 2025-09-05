<template>
  <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Players</h1>
          <p class="text-muted-foreground">
            Manage player profiles and track performance
          </p>
        </div>
        <Button @click="showCreateForm = true">
          <Plus class="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>

      <!-- Search and Filters -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search players by name or email..."
            class="pl-10"
          />
        </div>
        <div class="flex space-x-1 border rounded-lg p-1">
          <button
            v-for="status in statuses"
            :key="status.value"
            @click="selectedStatus = status.value"
            :class="cn(
              'px-3 py-1 text-sm font-medium rounded transition-colors',
              selectedStatus === status.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )"
          >
            {{ status.label }}
            <Badge v-if="getCountByStatus(status.value) > 0" class="ml-2" variant="secondary">
              {{ getCountByStatus(status.value) }}
            </Badge>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8 text-red-600">
        {{ error }}
      </div>

      <!-- Players Grid -->
      <div v-else-if="filteredPlayers.length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PlayerCard
          v-for="player in filteredPlayers"
          :key="player.id"
          :player="player"
          @edit="editPlayer(player)"
          @archive="archivePlayer(player)"
          @activate="activatePlayer(player)"
          @view="viewPlayer(player)"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <Users class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-2">No players found</h3>
        <p class="text-muted-foreground mb-4">
          {{ searchQuery ? 'No players match your search criteria.' : 
             selectedStatus === 'all' ? 'Get started by adding your first player.' : 
             `No ${selectedStatus} players at the moment.` }}
        </p>
        <Button @click="showCreateForm = true" v-if="!searchQuery">
          <Plus class="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>
  </div>

  <!-- Create/Edit Modal -->
  <div
    v-if="showCreateForm || editingPlayer"
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="closeModal"
  >
    <div class="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <h2 class="text-2xl font-bold mb-6">
          {{ editingPlayer ? 'Edit Player' : 'Add New Player' }}
        </h2>
        <PlayerForm
          :player="editingPlayer"
          :loading="formLoading"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Users, Search } from 'lucide-vue-next'
import { Player } from '@/types/player'
import { usePlayers } from '@/composables/usePlayers'
import { cn } from '@/lib/utils'
import PlayerCard from '@/components/players/PlayerCard.vue'
import PlayerForm from '@/components/players/PlayerForm.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'

const router = useRouter()
const {
  players,
  loading,
  error,
  createPlayer,
  updatePlayer,
  archivePlayer: archivePlayerAction,
  activatePlayer: activatePlayerAction,
  subscribePlayers,
  searchPlayers
} = usePlayers()

const selectedStatus = ref<'all' | Player['status']>('all')
const searchQuery = ref('')
const showCreateForm = ref(false)
const editingPlayer = ref<(Player & { id: string }) | null>(null)
const formLoading = ref(false)

let unsubscribe: (() => void) | null = null

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' }
] as const

const filteredPlayers = computed(() => {
  let result = searchQuery.value ? searchPlayers(searchQuery.value) : players.value
  
  if (selectedStatus.value !== 'all') {
    result = result.filter(p => p.status === selectedStatus.value)
  }
  
  return result
})

const getCountByStatus = (status: 'all' | Player['status']) => {
  if (status === 'all') return players.value.length
  return players.value.filter(p => p.status === status).length
}

const editPlayer = (player: Player & { id: string }) => {
  editingPlayer.value = player
}

const archivePlayer = async (player: Player & { id: string }) => {
  try {
    await archivePlayerAction(player.id)
  } catch (err) {
    console.error('Error archiving player:', err)
  }
}

const activatePlayer = async (player: Player & { id: string }) => {
  try {
    await activatePlayerAction(player.id)
  } catch (err) {
    console.error('Error activating player:', err)
  }
}

const viewPlayer = (player: Player & { id: string }) => {
  router.push(`/players/${player.id}`)
}

const closeModal = () => {
  showCreateForm.value = false
  editingPlayer.value = null
}

const handleSubmit = async (data: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'registrationDate'>) => {
  try {
    formLoading.value = true
    
    if (editingPlayer.value) {
      await updatePlayer(editingPlayer.value.id, data)
    } else {
      await createPlayer(data)
    }
    
    closeModal()
  } catch (err) {
    console.error('Error saving player:', err)
  } finally {
    formLoading.value = false
  }
}

onMounted(() => {
  unsubscribe = subscribePlayers()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>