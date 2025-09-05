<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button variant="ghost" size="icon" @click="router.back()">
            <ArrowLeft class="h-4 w-4" />
          </Button>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Select Members</h1>
            <p class="text-muted-foreground">
              Choose players to add to {{ communityName }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <Badge variant="outline">
            {{ selectedPlayers.length }} selected
          </Badge>
          <Button 
            @click="addSelectedMembers" 
            :disabled="selectedPlayers.length === 0 || communityStore.isLoading"
          >
            <UserPlus class="mr-2 h-4 w-4" />
            Add {{ selectedPlayers.length }} Member{{ selectedPlayers.length !== 1 ? 's' : '' }}
          </Button>
        </div>
      </div>

      <!-- Search and Filters -->
      <Card>
        <CardHeader>
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <Input
                v-model="searchQuery"
                placeholder="Search players by name or email..."
                class="max-w-sm"
              >
                <template #prefix>
                  <Search class="h-4 w-4 text-muted-foreground" />
                </template>
              </Input>
            </div>
            <Button variant="outline" @click="refreshPlayers">
              <RefreshCw class="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <Loader2 class="h-8 w-8 animate-spin" />
      </div>

      <!-- Players Grid -->
      <div v-else-if="filteredPlayers.length > 0">
        <!-- Select All Controls -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              @click="selectAllVisible"
              :disabled="allVisibleSelected"
            >
              <CheckSquare class="mr-2 h-4 w-4" />
              Select All ({{ filteredPlayers.length }})
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              @click="clearSelection"
              :disabled="selectedPlayers.length === 0"
            >
              <Square class="mr-2 h-4 w-4" />
              Clear Selection
            </Button>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ filteredPlayers.length }} player{{ filteredPlayers.length !== 1 ? 's' : '' }} available
          </p>
        </div>

        <!-- Players List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            v-for="player in filteredPlayers" 
            :key="player.uid"
            class="cursor-pointer transition-all duration-200"
            :class="{
              'ring-2 ring-primary bg-primary/5': isPlayerSelected(player.uid),
              'hover:border-primary/50': !isPlayerSelected(player.uid)
            }"
            @click="togglePlayerSelection(player.uid)"
          >
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User class="h-6 w-6 text-primary" />
                  </div>
                  <div class="space-y-1">
                    <CardTitle class="text-lg">{{ player.displayName }}</CardTitle>
                    <CardDescription class="text-sm">{{ player.email }}</CardDescription>
                  </div>
                </div>
                <div class="flex items-center">
                  <Checkbox 
                    :checked="isPlayerSelected(player.uid)"
                    @click.stop="togglePlayerSelection(player.uid)"
                    class="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent class="pt-0">
              <div class="space-y-2">
                <div v-if="player.fullName" class="flex items-center text-sm text-muted-foreground">
                  <User class="mr-2 h-4 w-4" />
                  {{ player.fullName }}
                </div>
                <div v-if="player.phoneNumber" class="flex items-center text-sm text-muted-foreground">
                  <Phone class="mr-2 h-4 w-4" />
                  {{ player.phoneNumber }}
                </div>
                <div class="flex items-center justify-between">
                  <Badge variant="secondary">
                    {{ player.userType }}
                  </Badge>
                  <span class="text-xs text-muted-foreground">
                    Active: {{ formatDate(player.createdAt) }}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && filteredPlayers.length === 0" class="text-center py-12">
        <Users class="h-24 w-24 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Players Found</h3>
        <p class="text-muted-foreground mb-6">
          {{ searchQuery ? 'No players match your search criteria.' : 'No players are available to add to this community.' }}
        </p>
        <div class="space-x-2">
          <Button variant="outline" @click="searchQuery = ''">
            Clear Search
          </Button>
          <Button @click="refreshPlayers">
            <RefreshCw class="mr-2 h-4 w-4" />
            Refresh Players
          </Button>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="communityStore.error" class="text-center py-8">
        <AlertCircle class="h-16 w-16 text-destructive mx-auto mb-4" />
        <h3 class="text-lg font-semibold mb-2">Error Loading Players</h3>
        <p class="text-muted-foreground mb-4">{{ communityStore.error }}</p>
        <Button @click="refreshPlayers">
          <RefreshCw class="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>

      <!-- Confirmation Dialog -->
      <AlertDialog v-model:open="showConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Members to Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add {{ selectedPlayers.length }} member{{ selectedPlayers.length !== 1 ? 's' : '' }} to {{ communityName }}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmAddMembers">
              <UserPlus class="mr-2 h-4 w-4" />
              Add Members
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommunityStore } from '@/stores/community'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft,
  User,
  Users,
  UserPlus,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
  Phone,
  Loader2,
  AlertCircle
} from 'lucide-vue-next'
import type { Player } from '@/types'

const route = useRoute()
const router = useRouter()
const communityStore = useCommunityStore()

const isLoading = ref(true)
const searchQuery = ref('')
const selectedPlayers = ref<string[]>([])
const showConfirmDialog = ref(false)

const communityId = computed(() => route.params.id as string)
const communityName = computed(() => {
  const community = communityStore.communities.find(c => c.id === communityId.value)
  return community?.name || 'Community'
})

const filteredPlayers = computed(() => {
  if (!searchQuery.value) {
    return availablePlayers.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return availablePlayers.value.filter(player => 
    player.displayName.toLowerCase().includes(query) ||
    player.email.toLowerCase().includes(query) ||
    (player.fullName && player.fullName.toLowerCase().includes(query))
  )
})

const availablePlayers = computed(() => {
  // Get current community members
  const community = communityStore.communities.find(c => c.id === communityId.value)
  const currentMemberIds = community?.membersIds || []
  
  // Filter out players who are already members
  return communityStore.players.filter(player => 
    !currentMemberIds.includes(player.uid) && player.isActive
  )
})

const allVisibleSelected = computed(() => {
  return filteredPlayers.value.length > 0 && 
         filteredPlayers.value.every(player => selectedPlayers.value.includes(player.uid))
})

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(date)
}

const isPlayerSelected = (playerUid: string) => {
  return selectedPlayers.value.includes(playerUid)
}

const togglePlayerSelection = (playerUid: string) => {
  const index = selectedPlayers.value.indexOf(playerUid)
  if (index > -1) {
    selectedPlayers.value.splice(index, 1)
  } else {
    selectedPlayers.value.push(playerUid)
  }
}

const selectAllVisible = () => {
  const visibleUids = filteredPlayers.value.map(p => p.uid)
  selectedPlayers.value = [...new Set([...selectedPlayers.value, ...visibleUids])]
}

const clearSelection = () => {
  selectedPlayers.value = []
}

const refreshPlayers = async () => {
  isLoading.value = true
  try {
    await communityStore.fetchAllPlayers()
  } finally {
    isLoading.value = false
  }
}

const addSelectedMembers = () => {
  if (selectedPlayers.value.length === 0) return
  showConfirmDialog.value = true
}

const confirmAddMembers = async () => {
  showConfirmDialog.value = false
  
  try {
    // Add each selected player to the community
    for (const playerUid of selectedPlayers.value) {
      await communityStore.addMemberToCommunity(communityId.value, playerUid)
    }
    
    console.log(`Successfully added ${selectedPlayers.value.length} members to community`)
    
    // Navigate back to community details
    router.push(`/communities/${communityId.value}`)
  } catch (error) {
    console.error('Error adding members:', error)
  }
}

onMounted(async () => {
  isLoading.value = true
  
  try {
    // Load communities if not already loaded
    if (communityStore.communities.length === 0) {
      await communityStore.fetchCommunities()
    }
    
    // Load all available players
    await communityStore.fetchAllPlayers()
  } finally {
    isLoading.value = false
  }
})
</script>