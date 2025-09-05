<template>
  <DashboardLayout>
    <div class="member-manager">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Member Manager</h1>
          <p class="text-gray-600">Manage community members</p>
        </div>
        <Button @click="showAddDialog = true">
          <UserPlus class="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <!-- Members List -->
      <div v-if="memberStore.isLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
      
      <div v-else-if="memberStore.members.length === 0" class="text-center py-12">
        <User class="h-24 w-24 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Members Yet</h3>
        <p class="text-gray-600 mb-6">Add your first member to get started</p>
        <Button size="lg" @click="showAddDialog = true">
          <UserPlus class="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          v-for="member in memberStore.members" 
          :key="member.id"
          class="member-card hover:shadow-lg transition-shadow"
        >
          <div class="member-header">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-semibold text-white mb-1">{{ member.name }}</h3>
                <p class="text-sm text-blue-100">{{ member.email }}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    class="text-white hover:bg-white/20 h-8 w-8 p-0"
                    @click.stop
                  >
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem @click="editMember(member)">
                    <UserCog class="mr-2 h-4 w-4" />
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="removeMember(member)" class="text-red-600">
                    <UserMinus class="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <CardContent class="p-4">
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>Joined {{ formatDate(member.joinedAt) }}</span>
              <Badge 
                :variant="member.role === 'leader' ? 'default' : 'secondary'"
                :class="member.role === 'leader' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ member.role }}
              </Badge>
            </div>
          </CardContent>
          
          <CardFooter class="flex justify-between p-4 pt-0 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              @click.stop="editMember(member)"
            >
              <UserCog class="mr-2 h-4 w-4" />
              Edit Role
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              class="text-red-600 hover:text-red-700"
              @click.stop="removeMember(member)"
            >
              <UserMinus class="mr-2 h-4 w-4" />
              Remove
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <!-- Add Member Dialog -->
      <Dialog v-model:open="showAddDialog">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="handleAddMember" class="space-y-4">
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="addForm.email"
                type="email"
                placeholder="Enter member email"
                :class="{ 'border-red-500': errors.email }"
                required
              />
              <small v-if="errors.email" class="text-red-500 text-xs">{{ errors.email }}</small>
            </div>
            
            <div class="space-y-2">
              <Label for="role">Role</Label>
              <select 
                id="role"
                v-model="addForm.role"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                :class="{ 'border-red-500': errors.role }"
                required
              >
                <option value="">Select role</option>
                <option value="member">Member</option>
                <option value="leader">Leader</option>
              </select>
              <small v-if="errors.role" class="text-red-500 text-xs">{{ errors.role }}</small>
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline"
                @click="showAddDialog = false"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                :disabled="!isAddFormValid || memberStore.isLoading"
              >
                <span v-if="memberStore.isLoading" class="mr-2 animate-spin">⏳</span>
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <!-- Remove Confirmation Dialog -->
      <AlertDialog v-model:open="showRemoveDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{{ memberToRemove?.name }}" from the community?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel @click="showRemoveDialog = false">Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmRemove" class="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMemberStore } from '@/stores/member'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { UserPlus, User, UserCog, UserMinus, MoreVertical } from 'lucide-vue-next'
import type { Member } from '@/types'

const memberStore = useMemberStore()

const showAddDialog = ref(false)
const showRemoveDialog = ref(false)
const memberToRemove = ref<Member | null>(null)

const addForm = ref({
  email: '',
  role: 'member'
})

const errors = ref({
  email: '',
  role: ''
})


const isAddFormValid = computed(() => {
  return addForm.value.email.trim() && addForm.value.role
})

const formatDate = (date: Date) => {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  )
}

const editMember = (member: Member) => {
  // TODO: Implement edit member functionality
  console.log('Edit member functionality will be available soon')
}

const removeMember = (member: Member) => {
  memberToRemove.value = member
  showRemoveDialog.value = true
}

const confirmRemove = async () => {
  if (!memberToRemove.value) return
  
  const result = await memberStore.removeMember(memberToRemove.value.id)
  showRemoveDialog.value = false
  memberToRemove.value = null
  
  if (result.success) {
    console.log('Member removed successfully')
  } else {
    console.error('Failed to remove member:', result.error)
  }
}


const handleAddMember = async () => {
  errors.value = { email: '', role: '' }
  
  if (!addForm.value.email.trim()) {
    errors.value.email = 'Email is required'
    return
  }
  
  if (!addForm.value.role) {
    errors.value.role = 'Role is required'
    return
  }
  
  const result = await memberStore.addMember({
    email: addForm.value.email.trim(),
    role: addForm.value.role
  })
  
  if (result.success) {
    showAddDialog.value = false
    addForm.value = { email: '', role: 'member' }
    console.log('Member added successfully')
  } else {
    console.error('Failed to add member:', result.error)
  }
}

onMounted(async () => {
  await memberStore.fetchMembers()
})
</script>

<style scoped>
.member-card {
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
}

.member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.member-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
  color: white;
}

/* Loading spinner animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>