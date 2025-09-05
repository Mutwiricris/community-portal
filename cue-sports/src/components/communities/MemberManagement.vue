<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-5xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Manage Community Members - {{ community.name }}</DialogTitle>
        <p class="text-sm text-muted-foreground">
          Add or remove members from this community. Members can be regular users or community admins.
        </p>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Search and Add Members -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Add New Members</h3>
            <div class="text-sm text-muted-foreground">
              Current: {{ currentMembers.length }} members
            </div>
          </div>
          
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search users by name or email to add as members..."
              class="pl-10"
              @input="searchUsers"
            />
          </div>

          <!-- Available Users to Add -->
          <div v-if="loadingUsers" class="flex justify-center py-4">
            <LoadingSpinner />
          </div>
          
          <div v-else-if="searchQuery && availableUsers.length === 0" class="text-center py-8 text-muted-foreground">
            <Search class="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No eligible users found.</p>
          </div>
          
          <div v-else-if="availableUsers.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            <div 
              v-for="user in availableUsers" 
              :key="user.uid"
              class="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {{ getInitials(user.displayName) }}
                </div>
                <div>
                  <p class="font-medium text-sm">{{ user.displayName }}</p>
                  <p class="text-xs text-muted-foreground">{{ user.email }}</p>
                  <Badge variant="secondary" class="text-xs">{{ user.userType }}</Badge>
                </div>
              </div>
              <Button 
                size="sm" 
                @click="addMember(user.uid)"
                :disabled="submitting"
              >
                <UserPlus class="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <!-- Current Members -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">Current Members ({{ currentMembers.length }})</h3>
          
          <div v-if="loadingMembers" class="flex justify-center py-4">
            <LoadingSpinner />
          </div>
          
          <div v-else-if="currentMembers.length === 0" class="text-center py-8 text-muted-foreground">
            <Users class="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No members in this community yet.</p>
          </div>
          
          <div v-else class="space-y-3">
            <!-- Member Search -->
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="memberSearchQuery"
                placeholder="Search current members..."
                class="pl-10"
              />
            </div>

            <!-- Members List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              <div 
                v-for="member in filteredMembers" 
                :key="member.uid"
                class="flex items-center justify-between p-4 border rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {{ getInitials(member.displayName) }}
                  </div>
                  <div>
                    <p class="font-medium">{{ member.displayName }}</p>
                    <p class="text-sm text-muted-foreground">{{ member.email }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" class="text-xs">{{ member.userType }}</Badge>
                      <Badge 
                        v-if="isAdmin(member.uid)" 
                        variant="outline" 
                        class="text-xs"
                      >
                        Admin
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  @click="removeMember(member.uid)"
                  :disabled="submitting || isAdmin(member.uid)"
                >
                  <UserMinus class="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>

            <!-- Stats Summary -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-secondary/20 rounded-lg">
              <div class="text-center">
                <div class="text-2xl font-bold">{{ currentMembers.length }}</div>
                <div class="text-sm text-muted-foreground">Total Members</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">{{ regularMembers }}</div>
                <div class="text-sm text-muted-foreground">Regular Users</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">{{ communityAdmins }}</div>
                <div class="text-sm text-muted-foreground">Community Admins</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">{{ activeAdmins }}</div>
                <div class="text-sm text-muted-foreground">Active Admins</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" @click="$emit('close')">Close</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Users, UserPlus, UserMinus } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { getDoc, updateDoc, subscribeToCollection } from '@/utils/firestore'
import type { Community } from '@/types/community'
import type { UserProfile } from '@/composables/useAuth'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Badge from '@/components/ui/badge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface Props {
  community: Community & { id: string }
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// State
const searchQuery = ref('')
const memberSearchQuery = ref('')
const currentMembers = ref<UserProfile[]>([])
const availableUsers = ref<UserProfile[]>([])
const loadingMembers = ref(false)
const loadingUsers = ref(false)
const submitting = ref(false)

// Composables
const { success, error: showError } = useToast()

// Computed
const filteredMembers = computed(() => {
  if (!memberSearchQuery.value.trim()) return currentMembers.value
  
  const query = memberSearchQuery.value.toLowerCase()
  return currentMembers.value.filter(member => 
    (member.displayName?.toLowerCase() || '').includes(query) ||
    (member.email?.toLowerCase() || '').includes(query)
  )
})

const regularMembers = computed(() => 
  currentMembers.value.filter(m => m.userType === 'user').length
)

const communityAdmins = computed(() => 
  currentMembers.value.filter(m => m.userType === 'community_admin').length
)

const activeAdmins = computed(() => 
  currentMembers.value.filter(m => isAdmin(m.uid)).length
)

// Methods
const loadCurrentMembers = async () => {
  if (!props.community.members_id || !props.community.members_id.length) {
    currentMembers.value = []
    return
  }

  try {
    loadingMembers.value = true
    const members: UserProfile[] = []
    
    for (const memberId of props.community.members_id) {
      try {
        const memberDoc = await getDoc('users', memberId)
        if (memberDoc) {
          members.push({
            uid: memberId,
            email: memberDoc.email,
            displayName: memberDoc.displayName,
            role: memberDoc.role,
            userType: memberDoc.userType,
            geographicalContext: memberDoc.geographicalContext,
            updatedAt: memberDoc.updatedAt?.toDate ? memberDoc.updatedAt.toDate() : new Date(memberDoc.updatedAt)
          } as UserProfile)
        }
      } catch (error) {
        console.error(`Error loading member ${memberId}:`, error)
      }
    }
    
    currentMembers.value = members
  } catch (error) {
    console.error('Error loading current members:', error)
    showError('Error', 'Failed to load current members')
  } finally {
    loadingMembers.value = false
  }
}

const searchUsers = async () => {
  if (!searchQuery.value.trim()) {
    availableUsers.value = []
    return
  }

  try {
    loadingUsers.value = true
    
    const unsubscribe = subscribeToCollection(
      'users',
      (users) => {
        const query = searchQuery.value.toLowerCase()
        
        const filtered = users.filter((user: any) => {
          const userData = user as UserProfile & { id: string }
          
          // Must not already be a member of this community
          if (props.community.members_id && props.community.members_id.includes(userData.uid || userData.id)) return false
          
          // Match search query
          const searchableText = `${userData.displayName} ${userData.email}`.toLowerCase()
          return searchableText.includes(query)
        })
        
        availableUsers.value = filtered.slice(0, 20)
        loadingUsers.value = false
      },
      (error) => {
        console.error('Error searching users:', error)
        loadingUsers.value = false
      }
    )

    return unsubscribe
  } catch (error) {
    console.error('Error searching users:', error)
    showError('Error', 'Failed to search users')
    loadingUsers.value = false
  }
}

const addMember = async (userId: string) => {
  try {
    submitting.value = true
    
    const updatedMemberIds = [...(props.community.members_id || []), userId]
    const newMemberCount = updatedMemberIds.length
    
    await updateDoc('communities', props.community.id, {
      members_id: updatedMemberIds,
      memberCount: newMemberCount,
      lastActivityAt: new Date().toISOString()
    })
    
    success('Success', 'Member added successfully')
    emit('updated')
    
    // Refresh current members
    await loadCurrentMembers()
    
    // Remove from available users
    availableUsers.value = availableUsers.value.filter(u => u.uid !== userId)
  } catch (error) {
    console.error('Error adding member:', error)
    showError('Error', 'Failed to add member')
  } finally {
    submitting.value = false
  }
}

const removeMember = async (userId: string) => {
  if (isAdmin(userId)) {
    showError('Error', 'Cannot remove community admins. Remove admin status first.')
    return
  }

  try {
    submitting.value = true
    
    const updatedMemberIds = (props.community.members_id || []).filter(id => id !== userId)
    const newMemberCount = updatedMemberIds.length
    
    await updateDoc('communities', props.community.id, {
      members_id: updatedMemberIds,
      memberCount: newMemberCount,
      lastActivityAt: new Date().toISOString()
    })
    
    success('Success', 'Member removed successfully')
    emit('updated')
    
    // Refresh current members
    await loadCurrentMembers()
  } catch (error) {
    console.error('Error removing member:', error)
    showError('Error', 'Failed to remove member')
  } finally {
    submitting.value = false
  }
}

const isAdmin = (userId: string) => {
  return props.community.adminIds && props.community.adminIds.includes(userId)
}

const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

// Watchers
watch(() => props.open, (newVal) => {
  if (newVal) {
    loadCurrentMembers()
  } else {
    // Reset state when dialog closes
    searchQuery.value = ''
    memberSearchQuery.value = ''
    availableUsers.value = []
    currentMembers.value = []
  }
})

watch(searchQuery, (newVal) => {
  if (!newVal.trim()) {
    availableUsers.value = []
  }
})
</script>