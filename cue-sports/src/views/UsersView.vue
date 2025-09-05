<template>
  <div class="space-y-6 p-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Users</h1>
        <p class="text-muted-foreground">
          Manage system users and administrators
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="refreshData" :disabled="loading">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </Button>
        <Button variant="outline" @click="handleExport">
          <Download class="h-4 w-4 mr-2" />
          Export
        </Button>
        <!-- Removed sync button since we only use Firestore -->
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search users by name or email..."
            class="pl-10"
            @input="debouncedSearch"
          />
        </div>
        <div class="flex gap-2">
          <select v-model="selectedRole" class="w-[180px] rounded-md border border-input bg-background px-3 py-2">
            <option value="all">All Roles</option>
            <option value="administrator">Administrators</option>
            <option value="user">Regular Users</option>
            <option value="community_admin">Community Admins</option>
          </select>
          
          <select v-model="pageSize" class="w-[120px] rounded-md border border-input bg-background px-3 py-2">
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>
      
      <!-- Stats Bar -->
      <div class="flex gap-4 text-sm text-muted-foreground">
        <span>Total Users: <strong class="text-foreground">{{ totalUsers }}</strong></span>
        <span>Administrators: <strong class="text-foreground">{{ adminCount }}</strong></span>
        <span>Regular Users: <strong class="text-foreground">{{ userCount }}</strong></span>
        <span>Without Community: <strong class="text-orange-600">{{ disabledUsersCount }}</strong></span>
        <!-- Removed sync stats since we only use Firestore -->
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedUserIds.length > 0" class="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
      <div class="flex items-center gap-4">
        <div class="text-sm">
          <span class="font-medium">
            {{ selectedUserIds.length }} user{{ selectedUserIds.length !== 1 ? 's' : '' }} selected
          </span>
        </div>
        <Button size="sm" variant="outline" @click="clearSelection">
          Clear Selection
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline"
          @click="bulkActivateUsers()"
          :disabled="selectedUserIds.length === 0 || bulkLoading"
        >
          <UserCheck class="h-3 w-3 mr-1" />
          {{ bulkLoading ? 'Processing...' : 'Activate' }}
        </Button>
        
        <Button 
          size="sm" 
          variant="outline"
          @click="bulkDeactivateUsers()"
          :disabled="selectedUserIds.length === 0 || bulkLoading"
        >
          <UserX class="h-3 w-3 mr-1" />
          {{ bulkLoading ? 'Processing...' : 'Deactivate' }}
        </Button>
        
        <Button 
          size="sm" 
          variant="outline"
          @click="bulkUpdateUserRoles()"
          :disabled="selectedUserIds.length === 0 || bulkLoading"
        >
          <Settings class="h-3 w-3 mr-1" />
          Update Roles
        </Button>
        
        <Button 
          size="sm" 
          variant="destructive"
          @click="bulkDeleteUsers()"
          :disabled="selectedUserIds.length === 0 || bulkLoading"
        >
          <Trash2 class="h-3 w-3 mr-1" />
          Delete
        </Button>
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

    <!-- Users Table -->
    <div v-else-if="displayedUsers.length > 0" class="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-12">
              <Checkbox 
                :checked="allCurrentPageSelected"
                @update:checked="toggleAllSelection"
              />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow 
            v-for="user in displayedUsers" 
            :key="user.uid"
            :class="{ 'opacity-50 bg-muted/20': !hasValidCommunity(user) }"
          >
            <TableCell>
              <Checkbox 
                :checked="selectedUserIds.includes(user.uid)"
                @update:checked="toggleUserSelection(user.uid)"
                :disabled="!hasValidCommunity(user)"
              />
            </TableCell>
            <TableCell class="font-medium">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <User class="h-4 w-4" />
                </div>
                <div class="flex flex-col">
                  <span>{{ user.displayName || 'No name' }}</span>
                  <span v-if="!hasValidCommunity(user)" class="text-xs text-orange-600 font-medium">
                    No Community - Disabled
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>{{ user.email }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Badge :variant="user.role === 'admin' ? 'default' : 'secondary'">
                  {{ user.userType }}
                </Badge>
                <Badge v-if="!hasValidCommunity(user)" variant="outline" class="text-orange-600 border-orange-600">
                  Disabled
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <div v-if="user.geographicalContext" class="text-sm">
                <p>{{ user.geographicalContext.community?.name || 'N/A' }}</p>
                <p class="text-muted-foreground">{{ user.geographicalContext.county?.name || 'N/A' }}</p>
              </div>
              <div v-else class="text-sm">
                <span class="text-orange-600 font-medium">Not assigned</span>
                <p class="text-muted-foreground text-xs">User cannot register players</p>
              </div>
            </TableCell>
            <TableCell>
              {{ formatDate(user.updatedAt) }}
            </TableCell>
            <TableCell class="text-right">
              <Button
                variant="ghost"
                size="icon"
                @click="viewUserDetails(user)"
                :disabled="!hasValidCommunity(user)"
              >
                <Eye class="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="text-center py-12">
      <Users class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 class="text-lg font-medium mb-2">No users found</h3>
      <p class="text-muted-foreground">
        {{ searchQuery || selectedRole !== 'all' ? 'No users match your filter criteria.' : 'No users in the system yet.' }}
      </p>
    </div>
    
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <div class="text-sm text-muted-foreground">
        Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ totalFilteredUsers }} users
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          @click="goToPage(1)"
          :disabled="currentPage === 1"
        >
          <ChevronsLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        
        <div class="flex items-center gap-1">
          <span class="text-sm">Page</span>
          <select 
            v-model="currentPage" 
            class="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
            @change="goToPage(parseInt($event.target.value))"
          >
            <option 
              v-for="page in totalPages" 
              :key="page" 
              :value="page"
            >
              {{ page }}
            </option>
          </select>
          <span class="text-sm">of {{ totalPages }}</span>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
        >
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>

  <!-- User Details Modal -->
  <Dialog v-model:open="showUserDetails">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
      </DialogHeader>
      <div v-if="selectedUser" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-muted-foreground">Display Name</label>
            <p class="font-medium">{{ selectedUser.displayName || 'Not set' }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-foreground">Email</label>
            <p class="font-medium">{{ selectedUser.email }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-foreground">User ID</label>
            <p class="font-mono text-sm">{{ selectedUser.uid }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-muted-foreground">Role</label>
            <Badge :variant="selectedUser.role === 'admin' ? 'default' : 'secondary'">
              {{ selectedUser.userType }}
            </Badge>
          </div>
        </div>
        
        <div v-if="selectedUser.geographicalContext" class="border-t pt-4">
          <h4 class="font-medium mb-2">Geographical Assignment</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label class="text-muted-foreground">Community</label>
              <p>{{ selectedUser.geographicalContext.community?.name || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-muted-foreground">County</label>
              <p>{{ selectedUser.geographicalContext.county?.name || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-muted-foreground">Region ID</label>
              <p class="font-mono">{{ selectedUser.geographicalContext.regionId }}</p>
            </div>
            <div>
              <label class="text-muted-foreground">Assignment Method</label>
              <p>{{ selectedUser.geographicalContext.assignmentMethod }}</p>
            </div>
          </div>
        </div>
        
        <div class="border-t pt-4">
          <label class="text-sm font-medium text-muted-foreground">Last Updated</label>
          <p>{{ formatDate(selectedUser.updatedAt, true) }}</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Users, User, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, RefreshCw, Settings, UserX, UserCheck, Trash2 } from 'lucide-vue-next'
import { useUserManagement, type ExtendedUserProfile } from '@/composables/useUserManagement'
import { useToast } from '@/composables/useToast'
import { useDebounceFn } from '@vueuse/core'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'
import Checkbox from '@/components/ui/checkbox.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const { success, error: showError } = useToast()

// Use the simplified user management composable
const {
  users,
  loading,
  error,
  totalUsers,
  adminCount,
  userCount,
  fetchAllUsers,
  updateUser,
  deleteUser,
  exportUsers
} = useUserManagement()

// Local state
const bulkLoading = ref(false)
const searchQuery = ref('')
const selectedRole = ref<'all' | 'administrator' | 'user' | 'community_admin'>('all')
const showUserDetails = ref(false)
const selectedUser = ref<ExtendedUserProfile | null>(null)
const selectedUserIds = ref<string[]>([])

// Pagination state
const currentPage = ref(1)
const pageSize = ref('25')
const totalFilteredUsers = ref(0)

// Computed values
const filteredUsers = computed(() => {
  let filtered = users.value

  // Apply role filter
  if (selectedRole.value !== 'all') {
    filtered = filtered.filter(user => user.userType === selectedRole.value)
  }

  // Apply search filter
  if (searchQuery.value) {
    const searchTerm = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.displayName?.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    )
  }

  return filtered
})

// Client-side pagination
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / parseInt(pageSize.value)))
const startIndex = computed(() => (currentPage.value - 1) * parseInt(pageSize.value))
const endIndex = computed(() => Math.min(startIndex.value + parseInt(pageSize.value), filteredUsers.value.length))

const displayedUsers = computed(() => {
  return filteredUsers.value.slice(startIndex.value, endIndex.value)
})

const enabledCurrentPageUsers = computed(() => {
  return displayedUsers.value.filter(hasValidCommunity)
})

const allCurrentPageSelected = computed(() => {
  return enabledCurrentPageUsers.value.length > 0 && 
    enabledCurrentPageUsers.value.every(user => selectedUserIds.value.includes(user.uid))
})

const disabledUsersCount = computed(() => {
  return filteredUsers.value.filter(user => !hasValidCommunity(user)).length
})

// Remove sync-related computed properties

// Watch for filter changes
watch([selectedRole, pageSize, searchQuery], () => {
  currentPage.value = 1
  clearSelection()
})

// Debounced search function
const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1
  clearSelection()
}, 300)

const formatDate = (date: any, includeTime = false) => {
  if (!date) return 'N/A'
  
  const d = date.toDate ? date.toDate() : new Date(date)
  
  if (includeTime) {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d)
  }
  
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium'
  }).format(d)
}

const hasValidCommunity = (user: ExtendedUserProfile): boolean => {
  return !!(user.geographicalContext?.community?.id && user.geographicalContext.community.name)
}

const viewUserDetails = (user: ExtendedUserProfile) => {
  selectedUser.value = user
  showUserDetails.value = true
}

const loadUsers = async () => {
  await fetchAllUsers()
}

const refreshData = async () => {
  currentPage.value = 1
  clearSelection()
  await loadUsers()
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// Export is now handled by the composable
const handleExport = () => {
  exportUsers()
}

// Selection methods
const toggleUserSelection = (userId: string) => {
  const user = users.value.find(u => u.uid === userId)
  if (!user || !hasValidCommunity(user)) return
  
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(userId)
  }
}

const toggleAllSelection = () => {
  const currentPageEnabledIds = enabledCurrentPageUsers.value.map(user => user.uid)
  
  if (allCurrentPageSelected.value) {
    // Deselect all on current page
    selectedUserIds.value = selectedUserIds.value.filter(id => !currentPageEnabledIds.includes(id))
  } else {
    // Select all on current page
    selectedUserIds.value = [...new Set([...selectedUserIds.value, ...currentPageEnabledIds])]
  }
}

const clearSelection = () => {
  selectedUserIds.value = []
}

// Bulk action methods
const bulkActivateUsers = async () => {
  if (selectedUserIds.value.length === 0) return
  
  const confirmed = confirm(
    `Activate ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}?`
  )
  
  if (!confirmed) return
  
  try {
    bulkLoading.value = true
    const db = getFirebaseDb()
    
    const updatePromises = selectedUserIds.value.map(async (userId) => {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, { 
        isActive: true, 
        updatedAt: new Date() 
      })
    })
    
    await Promise.all(updatePromises)
    
    success(`Successfully activated ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}`)
    clearSelection()
    await refreshData()
  } catch (err) {
    console.error('Error activating users:', err)
    showError('Failed to activate users')
  } finally {
    bulkLoading.value = false
  }
}

const bulkDeactivateUsers = async () => {
  if (selectedUserIds.value.length === 0) return
  
  const confirmed = confirm(
    `Deactivate ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}?`
  )
  
  if (!confirmed) return
  
  try {
    bulkLoading.value = true
    const db = getFirebaseDb()
    
    const updatePromises = selectedUserIds.value.map(async (userId) => {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, { 
        isActive: false, 
        updatedAt: new Date() 
      })
    })
    
    await Promise.all(updatePromises)
    
    success(`Successfully deactivated ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}`)
    clearSelection()
    await refreshData()
  } catch (err) {
    console.error('Error deactivating users:', err)
    showError('Failed to deactivate users')
  } finally {
    bulkLoading.value = false
  }
}

const bulkUpdateUserRoles = async () => {
  if (selectedUserIds.value.length === 0) return
  
  const newRole = prompt('Enter new role (administrator, user, community_admin):')
  if (!newRole || !['administrator', 'user', 'community_admin'].includes(newRole)) {
    showError('Invalid role. Please enter: administrator, user, or community_admin')
    return
  }
  
  const confirmed = confirm(
    `Update role to "${newRole}" for ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}?`
  )
  
  if (!confirmed) return
  
  try {
    bulkLoading.value = true
    const db = getFirebaseDb()
    
    const updatePromises = selectedUserIds.value.map(async (userId) => {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, { 
        userType: newRole,
        role: newRole === 'administrator' ? 'admin' : 'user',
        updatedAt: new Date() 
      })
    })
    
    await Promise.all(updatePromises)
    
    success(`Successfully updated roles for ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}`)
    clearSelection()
    await refreshData()
  } catch (err) {
    console.error('Error updating user roles:', err)
    showError('Failed to update user roles')
  } finally {
    bulkLoading.value = false
  }
}

const bulkDeleteUsers = async () => {
  if (selectedUserIds.value.length === 0) return
  
  const confirmed = confirm(
    `DELETE ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}? This action cannot be undone!`
  )
  
  if (!confirmed) return
  
  try {
    bulkLoading.value = true
    const db = getFirebaseDb()
    
    const deletePromises = selectedUserIds.value.map(async (userId) => {
      const userRef = doc(db, 'users', userId)
      await deleteDoc(userRef)
    })
    
    await Promise.all(deletePromises)
    
    success(`Successfully deleted ${selectedUserIds.value.length} user${selectedUserIds.value.length !== 1 ? 's' : ''}`)
    clearSelection()
    await refreshData()
  } catch (err) {
    console.error('Error deleting users:', err)
    showError('Failed to delete users')
  } finally {
    bulkLoading.value = false
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>