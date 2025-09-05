<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Community Manager</h1>
          <p class="text-muted-foreground">
            Create and manage your communities
          </p>
        </div>
        <Dialog v-model:open="showCreateDialog">
          <DialogTrigger as-child>
            <Button>
              <Plus class="mr-2 h-4 w-4" />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
              <DialogDescription>
                Create a new community for your cuesport group.
              </DialogDescription>
            </DialogHeader>
            <form @submit.prevent="handleCreateCommunity" class="space-y-4">
              <div class="space-y-2">
                <Label for="name">Community Name</Label>
                <Input
                  id="name"
                  v-model="createForm.name"
                  placeholder="Enter community name"
                  required
                />
                <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
              </div>
              
              <div class="space-y-2">
                <Label for="description">Description</Label>
                <Textarea
                  id="description"
                  v-model="createForm.description"
                  placeholder="Describe your community"
                  required
                  rows="4"
                />
                <p v-if="errors.description" class="text-sm text-destructive">{{ errors.description }}</p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" @click="showCreateDialog = false">
                  Cancel
                </Button>
                <Button type="submit" :disabled="!isCreateFormValid || communityStore.isLoading">
                  <Loader2 v-if="communityStore.isLoading" class="mr-2 h-4 w-4 animate-spin" />
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <!-- Loading State -->
      <div v-if="communityStore.isLoading" class="flex justify-center py-8">
        <Loader2 class="h-8 w-8 animate-spin" />
      </div>
      
      <!-- Empty State -->
      <div v-else-if="communityStore.communities.length === 0" class="text-center py-12">
        <Users class="h-24 w-24 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-xl font-semibold mb-2">No Communities Yet</h3>
        <p class="text-muted-foreground mb-6">Create your first community to get started</p>
        <Button size="lg" @click="showCreateDialog = true">
          <Plus class="mr-2 h-4 w-4" />
          Create Community
        </Button>
      </div>
      
      <!-- Communities Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          v-for="community in communityStore.communities" 
          :key="community.id"
          class="cursor-pointer transition-colors hover:border-primary/50"
          @click="selectCommunity(community)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <CardTitle class="text-lg">{{ community.name }}</CardTitle>
                <CardDescription>{{ community.memberCount }} members</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger as-child @click.stop>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="editCommunity(community)">
                    <Pencil class="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="deleteCommunity(community)" class="text-destructive">
                    <Trash2 class="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent class="pb-3">
            <p class="text-sm text-muted-foreground line-clamp-3">{{ community.description }}</p>
          </CardContent>
          
          <CardFooter class="flex justify-between border-t pt-3">
            <div class="flex items-center space-x-2">
              <span class="text-xs text-muted-foreground">Created {{ formatDate(community.createdAt) }}</span>
              <Badge variant="outline">
                {{ community.memberCount > 0 ? 'Active' : 'New' }}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              @click.stop="viewMembers(community)"
            >
              <Users class="mr-2 h-4 w-4" />
              Members
            </Button>
          </CardFooter>
        </Card>
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
              Are you sure you want to delete "{{ communityToDelete?.name }}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Users, Pencil, Trash2, MoreHorizontal, Loader2 } from 'lucide-vue-next'
import type { Community } from '@/types'

const router = useRouter()
const communityStore = useCommunityStore()

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const currentEditingCommunity = ref<Community | null>(null)
const communityToDelete = ref<Community | null>(null)

const createForm = ref({
  name: '',
  description: ''
})

const editForm = ref({
  name: '',
  description: ''
})

const errors = ref({
  name: '',
  description: ''
})

const isCreateFormValid = computed(() => {
  return createForm.value.name.trim() && createForm.value.description.trim()
})

const formatDate = (date: Date) => {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    'day'
  )
}

const selectCommunity = (community: Community) => {
  router.push(`/communities/${community.id}`)
}

const viewMembers = (community: Community) => {
  communityStore.setActiveCommunity(community.id)
  router.push('/members')
}

const editCommunity = (community: Community) => {
  currentEditingCommunity.value = community
  editForm.value = {
    name: community.name,
    description: community.description
  }
  showEditDialog.value = true
}

const deleteCommunity = (community: Community) => {
  communityToDelete.value = community
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!communityToDelete.value) return
  
  const result = await communityStore.deleteCommunity(communityToDelete.value.id)
  showDeleteDialog.value = false
  communityToDelete.value = null
  
  if (result.success) {
    console.log('Community deleted successfully')
  } else {
    console.error('Failed to delete community:', result.error)
  }
}

const handleCreateCommunity = async () => {
  errors.value = { name: '', description: '' }
  
  if (!createForm.value.name.trim()) {
    errors.value.name = 'Community name is required'
    return
  }
  
  if (!createForm.value.description.trim()) {
    errors.value.description = 'Description is required'
    return
  }
  
  const result = await communityStore.createCommunity({
    name: createForm.value.name.trim(),
    description: createForm.value.description.trim()
  })
  
  if (result.success) {
    showCreateDialog.value = false
    createForm.value = { name: '', description: '' }
    console.log('Community created successfully')
  } else {
    console.error('Failed to create community:', result.error)
  }
}

const handleUpdateCommunity = async () => {
  if (!currentEditingCommunity.value) return
  
  const result = await communityStore.updateCommunity(
    currentEditingCommunity.value.id,
    {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim()
    }
  )
  
  if (result.success) {
    showEditDialog.value = false
    currentEditingCommunity.value = null
    console.log('Community updated successfully')
  } else {
    console.error('Failed to update community:', result.error)
  }
}

onMounted(async () => {
  await communityStore.fetchCommunities()
})
</script>