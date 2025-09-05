<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Manage Community Admins - {{ community.name }}</DialogTitle>
        <p class="text-sm text-muted-foreground">
          Assign up to 2 community administrators. Only users with 'community_admin' user type can be assigned.
        </p>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Current Admins -->
        <div>
          <h3 class="text-lg font-semibold mb-3">Current Admins ({{ currentAdmins.length }}/2)</h3>
          
          <div v-if="loadingAdmins" class="flex justify-center py-4">
            <LoadingSpinner />
          </div>
          
          <div v-else-if="currentAdmins.length === 0" class="text-center py-8 text-muted-foreground">
            <Crown class="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No admins assigned to this community yet.</p>
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="admin in currentAdmins" 
              :key="admin.uid"
              class="flex items-center justify-between p-4 border rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  {{ getInitials(admin.displayName) }}
                </div>
                <div>
                  <p class="font-medium">{{ admin.displayName }}</p>
                  <p class="text-sm text-muted-foreground">{{ admin.email }}</p>
                  <Badge variant="secondary" class="text-xs mt-1">{{ admin.userType }}</Badge>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                @click="removeAdmin(admin.uid)"
                :disabled="submitting"
              >
                <UserMinus class="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>

        <!-- Add New Admin -->
        <div v-if="currentAdmins.length < 2">
          <h3 class="text-lg font-semibold mb-3">Add New Admin</h3>
          
          <!-- Search for Users -->
          <div class="space-y-4">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Search users by name or email..."
                class="pl-10"
                @input="searchUsers"
              />
            </div>

            <!-- Available Users -->
            <div v-if="loadingUsers" class="flex justify-center py-4">
              <LoadingSpinner />
            </div>
            
            <div v-else-if="searchQuery && availableUsers.length === 0" class="text-center py-8 text-muted-foreground">
              <Search class="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No eligible users found.</p>
              <p class="text-xs">Only users with 'community_admin' user type can be assigned.</p>
            </div>
            
            <div v-else-if="availableUsers.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="user in availableUsers" 
                :key="user.uid"
                class="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {{ getInitials(user.displayName) }}
                  </div>
                  <div>
                    <p class="font-medium">{{ user.displayName }}</p>
                    <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" class="text-xs">{{ user.userType }}</Badge>
                      <span v-if="user.geographicalContext?.community?.name" class="text-xs text-muted-foreground">
                        Current: {{ user.geographicalContext.community.name }}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  @click="addAdmin(user.uid)"
                  :disabled="submitting"
                >
                  <UserPlus class="h-4 w-4 mr-1" />
                  Add Admin
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Max Admins Reached -->
        <div v-else class="text-center py-8 text-muted-foreground">
          <Crown class="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
          <p class="font-medium">Maximum admins reached</p>
          <p class="text-sm">This community has the maximum number of admins (2).</p>
          <p class="text-xs">Remove an admin to add a new one.</p>
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
import { ref, watch } from 'vue'
import { Search, Crown, UserMinus, UserPlus } from 'lucide-vue-next'
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
const currentAdmins = ref<UserProfile[]>([])
const availableUsers = ref<UserProfile[]>([])
const loadingAdmins = ref(false)
const loadingUsers = ref(false)
const submitting = ref(false)

// Composables
const { success, error: showError } = useToast()

// Methods
const loadCurrentAdmins = async () => {
  if (!props.community.adminIds || !props.community.adminIds.length) {
    currentAdmins.value = []
    return
  }

  try {
    loadingAdmins.value = true
    const admins: UserProfile[] = []
    
    for (const adminId of props.community.adminIds) {
      try {
        const adminDoc = await getDoc('users', adminId)
        if (adminDoc) {
          admins.push({
            uid: adminId,
            email: adminDoc.email,
            displayName: adminDoc.displayName,
            role: adminDoc.role,
            userType: adminDoc.userType,
            geographicalContext: adminDoc.geographicalContext,
            updatedAt: adminDoc.updatedAt?.toDate ? adminDoc.updatedAt.toDate() : new Date(adminDoc.updatedAt)
          } as UserProfile)
        }
      } catch (error) {
        console.error(`Error loading admin ${adminId}:`, error)
      }
    }
    
    currentAdmins.value = admins
  } catch (error) {
    console.error('Error loading current admins:', error)
    showError('Error', 'Failed to load current admins')
  } finally {
    loadingAdmins.value = false
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
        
        // Filter users based on search criteria and eligibility
        const filtered = users.filter((user: any) => {
          const userData = user as UserProfile & { id: string }
          
          // Must be community_admin user type
          if (userData.userType !== 'community_admin') return false
          
          // Must not already be an admin of this community
          if (props.community.adminIds && props.community.adminIds.includes(userData.uid || userData.id)) return false
          
          // Match search query
          const searchableText = `${userData.displayName} ${userData.email}`.toLowerCase()
          return searchableText.includes(query)
        })
        
        availableUsers.value = filtered.slice(0, 10) // Limit results
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

const addAdmin = async (userId: string) => {
  if (currentAdmins.value.length >= 2) {
    showError('Error', 'Cannot add more than 2 admins')
    return
  }

  try {
    submitting.value = true
    
    const updatedAdminIds = [...(props.community.adminIds || []), userId]
    
    await updateDoc('communities', props.community.id, {
      adminIds: updatedAdminIds,
      lastActivityAt: new Date().toISOString()
    })
    
    // Update user's geographical context to point to this community
    const user = availableUsers.value.find(u => u.uid === userId)
    if (user) {
      await updateDoc('users', userId, {
        'geographicalContext.community': {
          id: props.community.id,
          name: props.community.name
        },
        'geographicalContext.assignedAt': new Date(),
        'geographicalContext.assignmentMethod': 'admin_assignment'
      })
    }
    
    success('Success', 'Admin added successfully')
    emit('updated')
    
    // Refresh current admins
    await loadCurrentAdmins()
    
    // Clear search
    searchQuery.value = ''
    availableUsers.value = []
  } catch (error) {
    console.error('Error adding admin:', error)
    showError('Error', 'Failed to add admin')
  } finally {
    submitting.value = false
  }
}

const removeAdmin = async (userId: string) => {
  try {
    submitting.value = true
    
    const updatedAdminIds = (props.community.adminIds || []).filter(id => id !== userId)
    
    await updateDoc('communities', props.community.id, {
      adminIds: updatedAdminIds,
      lastActivityAt: new Date().toISOString()
    })
    
    // Clear user's community assignment
    await updateDoc('users', userId, {
      'geographicalContext.community': {
        id: '',
        name: ''
      },
      'geographicalContext.assignedAt': new Date(),
      'geographicalContext.assignmentMethod': 'admin_removal'
    })
    
    success('Success', 'Admin removed successfully')
    emit('updated')
    
    // Refresh current admins
    await loadCurrentAdmins()
  } catch (error) {
    console.error('Error removing admin:', error)
    showError('Error', 'Failed to remove admin')
  } finally {
    submitting.value = false
  }
}

const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

// Watchers
watch(() => props.open, (newVal) => {
  if (newVal) {
    loadCurrentAdmins()
  } else {
    // Reset state when dialog closes
    searchQuery.value = ''
    availableUsers.value = []
    currentAdmins.value = []
  }
})

watch(searchQuery, (newVal) => {
  if (!newVal.trim()) {
    availableUsers.value = []
  }
})
</script>