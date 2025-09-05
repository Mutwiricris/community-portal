<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin" />
      </div>

      <!-- Community Not Found -->
      <div v-else-if="!community" class="text-center py-12">
        <AlertCircle class="h-24 w-24 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-xl font-semibold mb-2">Community Not Found</h3>
        <p class="text-muted-foreground mb-6">The community you're looking for doesn't exist or you don't have access to it.</p>
        <Button @click="router.push('/communities')">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back to Communities
        </Button>
      </div>

      <!-- Community Details -->
      <div v-else>
        <!-- Header Section -->
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-4">
            <Button variant="ghost" size="icon" @click="router.push('/communities')">
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div class="space-y-1">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                  {{ community.initials || community.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <h1 class="text-3xl font-bold tracking-tight">{{ community.name }}</h1>
                  <div class="flex items-center space-x-4 text-muted-foreground">
                    <span class="flex items-center">
                      <Users class="mr-1 h-4 w-4" />
                      {{ community.memberCount }} members
                    </span>
                    <span v-if="community.location" class="flex items-center">
                      <MapPin class="mr-1 h-4 w-4" />
                      {{ community.location }}{{ community.county ? `, ${community.county}` : '' }}
                    </span>
                    <span v-if="community.followerCount" class="flex items-center">
                      <Heart class="mr-1 h-4 w-4" />
                      {{ community.followerCount }} followers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <Button variant="outline" @click="editCommunity">
              <Pencil class="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="icon">
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="viewMembers">
                  <Users class="mr-2 h-4 w-4" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuItem @click="shareCommunity">
                  <Share2 class="mr-2 h-4 w-4" />
                  Share Community
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="deleteCommunity" class="text-destructive">
                  <Trash2 class="mr-2 h-4 w-4" />
                  Delete Community
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="community.tags && community.tags.length > 0" class="flex flex-wrap gap-2">
          <Badge v-for="tag in community.tags" :key="tag" variant="secondary">
            {{ tag }}
          </Badge>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Total Members</CardTitle>
              <Users class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ community.memberCount }}</div>
              <p class="text-xs text-muted-foreground">
                Active players in community
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Followers</CardTitle>
              <Heart class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ community.followerCount || 0 }}</div>
              <p class="text-xs text-muted-foreground">
                Community followers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Active Since</CardTitle>
              <Calendar class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ formatDateShort(community.createdAt) }}</div>
              <p class="text-xs text-muted-foreground">
                {{ formatDateRelative(community.createdAt) }}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-sm font-medium">Last Activity</CardTitle>
              <Activity class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-bold">{{ formatDateShort(community.updatedAt) }}</div>
              <p class="text-xs text-muted-foreground">
                {{ formatDateRelative(community.updatedAt) }}
              </p>
            </CardContent>
          </Card>
        </div>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Community Description -->
          <div class="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-muted-foreground leading-relaxed">{{ community.description }}</p>
              </CardContent>
            </Card>

            <!-- Community Members -->
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <div>
                    <CardTitle>Community Members</CardTitle>
                    <CardDescription>Players in your community</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" @click="loadCommunityMembers">
                    <RefreshCw class="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <!-- Loading State -->
                <div v-if="communityStore.isLoading" class="flex justify-center py-8">
                  <Loader2 class="h-6 w-6 animate-spin" />
                </div>
                
                <!-- Members List -->
                <div v-else-if="communityStore.communityMembers.length > 0" class="space-y-3">
                  <div 
                    v-for="member in communityStore.communityMembers.slice(0, 5)" 
                    :key="member.uid"
                    class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User class="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p class="text-sm font-medium">{{ member.displayName }}</p>
                        <p class="text-xs text-muted-foreground">{{ member.email }}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Player</Badge>
                  </div>
                  
                  <div v-if="communityStore.communityMembers.length > 5" class="text-center pt-3">
                    <Button variant="ghost" size="sm" @click="viewAllMembers">
                      View All {{ communityStore.communityMembers.length }} Members
                    </Button>
                  </div>
                </div>
                
                <!-- Empty State -->
                <div v-else class="text-center py-8">
                  <Users class="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p class="text-sm text-muted-foreground mb-4">No members in this community yet</p>
                  <Button size="sm" @click="manageCommunityMembers">
                    <UserPlus class="mr-2 h-4 w-4" />
                    Add First Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Quick Actions -->
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <Button class="w-full justify-start" @click="viewMembers">
                  <Users class="mr-2 h-4 w-4" />
                  Manage Members
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="createTournament">
                  <Trophy class="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="createEvent">
                  <Calendar class="mr-2 h-4 w-4" />
                  Schedule Event
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="sendMessage">
                  <MessageSquare class="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="showMemberSelectionDialog">
                  <UserPlus class="mr-2 h-4 w-4" />
                  Select Members
                </Button>
              </CardContent>
            </Card>

            <!-- Community Leader -->
            <Card>
              <CardHeader>
                <CardTitle>Community Leader</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p class="font-medium">{{ community.leaderName || 'Community Leader' }}</p>
                    <p class="text-sm text-muted-foreground">Administrator</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Community Settings -->
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <Button variant="ghost" size="sm" class="w-full justify-start" @click="communitySettings">
                  <Settings class="mr-2 h-4 w-4" />
                  Community Settings
                </Button>
                <Button variant="ghost" size="sm" class="w-full justify-start" @click="privacySettings">
                  <Shield class="mr-2 h-4 w-4" />
                  Privacy Settings
                </Button>
                <Button variant="ghost" size="sm" class="w-full justify-start" @click="viewStats">
                  <BarChart3 class="mr-2 h-4 w-4" />
                  View Statistics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <!-- Edit Community Dialog -->
      <Dialog v-model:open="showEditDialog">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
            <DialogDescription>
              Update your community information.
            </DialogDescription>
          </DialogHeader>
          <form @submit.prevent="handleUpdateCommunity" class="space-y-4">
            <div class="space-y-2">
              <Label for="editName">Community Name</Label>
              <Input
                id="editName"
                v-model="editForm.name"
                placeholder="Enter community name"
                required
              />
            </div>
            
            <div class="space-y-2">
              <Label for="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                v-model="editForm.description"
                placeholder="Describe your community"
                rows="4"
                required
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" @click="showEditDialog = false">
                Cancel
              </Button>
              <Button type="submit" :disabled="communityStore.isLoading">
                <Loader2 v-if="communityStore.isLoading" class="mr-2 h-4 w-4 animate-spin" />
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog v-model:open="showDeleteDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{{ community?.name }}"? This action cannot be undone and will remove all members, tournaments, and data associated with this community.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- Member Selection Dialog -->
      <Dialog v-model:open="showMemberDialog">
        <DialogContent class="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Select Community Members</DialogTitle>
            <DialogDescription>
              Choose players from the users collection to add to {{ community?.name }}
            </DialogDescription>
          </DialogHeader>
          
          <div class="space-y-4">
            <!-- Search Bar -->
            <div class="flex items-center space-x-2">
              <Input
                v-model="searchQuery"
                placeholder="Search players by name or email..."
                class="flex-1"
              />
              <Button variant="outline" @click="loadAvailablePlayers" :disabled="communityStore.isLoading">
                <RefreshCw class="h-4 w-4" />
              </Button>
            </div>

            <!-- Selection Stats -->
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">
                {{ filteredAvailablePlayers.length }} players available
              </span>
              <span class="font-medium">
                {{ selectedPlayerIds.length }} selected
              </span>
            </div>

            <!-- Bulk Actions -->
            <div class="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                @click="selectAllFiltered"
                :disabled="filteredAvailablePlayers.length === 0"
              >
                <CheckSquare class="mr-2 h-4 w-4" />
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="clearSelection"
                :disabled="selectedPlayerIds.length === 0"
              >
                <Square class="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>

            <!-- Loading State -->
            <div v-if="communityStore.isLoading" class="flex justify-center py-8">
              <Loader2 class="h-8 w-8 animate-spin" />
            </div>

            <!-- Players List -->
            <div v-else class="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              <div 
                v-for="player in filteredAvailablePlayers" 
                :key="player.uid"
                class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                :class="{
                  'bg-primary/5 border-primary': selectedPlayerIds.includes(player.uid),
                  'hover:bg-muted/50': !selectedPlayerIds.includes(player.uid)
                }"
                @click="togglePlayerSelection(player.uid)"
              >
                <div class="flex items-center space-x-3">
                  <Checkbox 
                    :checked="selectedPlayerIds.includes(player.uid)"
                    @click.stop="togglePlayerSelection(player.uid)"
                  />
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p class="font-medium text-sm">{{ player.displayName }}</p>
                    <p class="text-xs text-muted-foreground">{{ player.email }}</p>
                    <div class="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" class="text-xs">{{ player.userType }}</Badge>
                      <span v-if="player.fullName" class="text-xs text-muted-foreground">
                        {{ player.fullName }}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  @click.stop="quickAddMember(player.uid)"
                  :disabled="communityStore.isLoading"
                >
                  <UserPlus class="h-4 w-4" />
                </Button>
              </div>
              
              <div v-if="filteredAvailablePlayers.length === 0" class="text-center py-8 text-muted-foreground">
                {{ searchQuery ? 'No players match your search.' : 'No available players found.' }}
              </div>
            </div>
          </div>
          
          <DialogFooter class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              {{ selectedPlayerIds.length }} player{{ selectedPlayerIds.length !== 1 ? 's' : '' }} selected
            </div>
            <div class="space-x-2">
              <Button variant="outline" @click="closeMemberDialog">
                Cancel
              </Button>
              <Button 
                @click="addSelectedMembers" 
                :disabled="selectedPlayerIds.length === 0 || communityStore.isLoading"
              >
                <UserPlus class="mr-2 h-4 w-4" />
                Add {{ selectedPlayerIds.length }} Member{{ selectedPlayerIds.length !== 1 ? 's' : '' }}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, 
  Users, 
  MapPin, 
  Heart, 
  Calendar, 
  Activity, 
  Pencil, 
  MoreHorizontal, 
  Share2, 
  Trash2, 
  Trophy, 
  MessageSquare, 
  User, 
  Settings, 
  Shield, 
  BarChart3,
  Loader2,
  AlertCircle,
  UserPlus,
  UserMinus,
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-vue-next'
import type { Community } from '@/types'

const route = useRoute()
const router = useRouter()
const communityStore = useCommunityStore()

const isLoading = ref(true)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showMemberDialog = ref(false)
const searchQuery = ref('')
const selectedPlayerIds = ref<string[]>([])

const editForm = ref({
  name: '',
  description: ''
})

const community = computed(() => {
  const id = route.params.id as string
  return communityStore.communities.find(c => c.id === id) || null
})

const availablePlayers = computed(() => {
  if (!community.value) return []
  
  const currentMemberIds = communityStore.communityMembers.map(m => m.uid)
  return communityStore.players.filter(player => 
    !currentMemberIds.includes(player.uid) && player.isActive
  )
})

const filteredAvailablePlayers = computed(() => {
  if (!searchQuery.value) return availablePlayers.value
  
  const query = searchQuery.value.toLowerCase()
  return availablePlayers.value.filter(player =>
    player.displayName.toLowerCase().includes(query) ||
    player.email.toLowerCase().includes(query) ||
    (player.fullName && player.fullName.toLowerCase().includes(query))
  )
})

const recentActivities = ref([
  {
    id: 1,
    icon: Users,
    title: 'New member joined',
    description: 'John Smith joined the community',
    time: '2 hours ago'
  },
  {
    id: 2,
    icon: Trophy,
    title: 'Tournament created',
    description: 'Weekly Championship tournament scheduled',
    time: '1 day ago'
  },
  {
    id: 3,
    icon: MessageSquare,
    title: 'New announcement',
    description: 'Important updates about club rules',
    time: '3 days ago'
  },
  {
    id: 4,
    icon: Calendar,
    title: 'Event completed',
    description: 'Practice session completed successfully',
    time: '1 week ago'
  }
])

const formatDateShort = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const formatDateRelative = (date: Date) => {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  )
}

const editCommunity = () => {
  if (!community.value) return
  
  editForm.value = {
    name: community.value.name,
    description: community.value.description
  }
  showEditDialog.value = true
}

const deleteCommunity = () => {
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!community.value) return
  
  const result = await communityStore.deleteCommunity(community.value.id)
  showDeleteDialog.value = false
  
  if (result.success) {
    router.push('/communities')
  } else {
    console.error('Failed to delete community:', result.error)
  }
}

const handleUpdateCommunity = async () => {
  if (!community.value) return
  
  const result = await communityStore.updateCommunity(
    community.value.id,
    {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim()
    }
  )
  
  if (result.success) {
    showEditDialog.value = false
  } else {
    console.error('Failed to update community:', result.error)
  }
}

const viewMembers = () => {
  if (!community.value) return
  communityStore.setActiveCommunity(community.value.id)
  router.push('/members')
}

const shareCommunity = () => {
  if (!community.value) return
  navigator.clipboard.writeText(`${window.location.origin}/communities/${community.value.id}`)
  console.log('Community link copied to clipboard')
}

const createTournament = () => {
  router.push('/tournaments/create')
}

const createEvent = () => {
  router.push('/events/create')
}

const sendMessage = () => {
  router.push('/messages')
}

const communitySettings = () => {
  router.push('/settings/community')
}

const privacySettings = () => {
  router.push('/settings/privacy')
}

const viewStats = () => {
  router.push('/stats')
}

const showMemberSelectionDialog = async () => {
  if (!community.value) return
  
  showMemberDialog.value = true
  
  // Load available players and current members
  await Promise.all([
    communityStore.fetchAllPlayers(),
    communityStore.fetchCommunityMembers(community.value.id)
  ])
}

const loadCommunityMembers = async () => {
  if (!community.value) return
  await communityStore.fetchCommunityMembers(community.value.id)
}

const viewAllMembers = () => {
  if (!community.value) return
  communityStore.setActiveCommunity(community.value.id)
  router.push('/members')
}

const loadAvailablePlayers = async () => {
  await communityStore.fetchAllPlayers()
}

const togglePlayerSelection = (playerUid: string) => {
  const index = selectedPlayerIds.value.indexOf(playerUid)
  if (index > -1) {
    selectedPlayerIds.value.splice(index, 1)
  } else {
    selectedPlayerIds.value.push(playerUid)
  }
}

const selectAllFiltered = () => {
  const filteredUids = filteredAvailablePlayers.value.map(p => p.uid)
  selectedPlayerIds.value = [...new Set([...selectedPlayerIds.value, ...filteredUids])]
}

const clearSelection = () => {
  selectedPlayerIds.value = []
}

const quickAddMember = async (playerUid: string) => {
  if (!community.value) return
  
  const result = await communityStore.addMemberToCommunity(community.value.id, playerUid)
  
  if (result.success) {
    console.log('Member added successfully')
    // Refresh the current members display
    await loadCommunityMembers()
  } else {
    console.error('Failed to add member:', result.error)
  }
}

const addSelectedMembers = async () => {
  if (!community.value || selectedPlayerIds.value.length === 0) return
  
  try {
    // Add each selected player
    for (const playerUid of selectedPlayerIds.value) {
      await communityStore.addMemberToCommunity(community.value.id, playerUid)
    }
    
    console.log(`Successfully added ${selectedPlayerIds.value.length} members`)
    
    // Clear selection and refresh
    selectedPlayerIds.value = []
    await Promise.all([
      loadCommunityMembers(),
      communityStore.fetchAllPlayers()
    ])
    
  } catch (error) {
    console.error('Error adding selected members:', error)
  }
}

const closeMemberDialog = () => {
  showMemberDialog.value = false
  selectedPlayerIds.value = []
  searchQuery.value = ''
}

onMounted(async () => {
  isLoading.value = true
  
  // Fetch communities if not already loaded
  if (communityStore.communities.length === 0) {
    await communityStore.fetchCommunities()
  }
  
  // If community still not found, try fetching by ID
  if (!community.value) {
    const id = route.params.id as string
    await communityStore.fetchCommunityById(id)
  }
  
  // Load community members
  if (community.value) {
    await loadCommunityMembers()
  }
  
  isLoading.value = false
})
</script>