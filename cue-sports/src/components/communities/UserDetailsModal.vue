<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- User Header -->
        <div class="flex items-center space-x-6">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {{ getInitials(user.displayName) }}
          </div>
          <div>
            <h2 class="text-2xl font-bold">{{ user.displayName }}</h2>
            <p class="text-lg text-muted-foreground">{{ user.email }}</p>
            <div class="flex gap-2 mt-2">
              <Badge variant="default">{{ formatUserType(user.userType) }}</Badge>
              <Badge variant="secondary">{{ formatRole(user.role || 'user') }}</Badge>
            </div>
          </div>
        </div>

        <!-- User Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Account Information -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold border-b pb-2">Account Information</h3>
            
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-muted-foreground">User ID</label>
                <p class="font-mono text-sm bg-secondary/50 p-2 rounded">{{ user.uid }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-muted-foreground">Display Name</label>
                <p class="font-medium">{{ user.displayName || 'Not specified' }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-muted-foreground">Email Address</label>
                <p class="font-medium">{{ user.email }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-muted-foreground">User Type</label>
                <p class="font-medium">{{ formatUserType(user.userType) }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-muted-foreground">Role</label>
                <p class="font-medium">{{ formatRole(user.role || 'user') }}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p class="font-medium">{{ formatDateTime(user.updatedAt) }}</p>
              </div>
            </div>
          </div>

          <!-- Geographic Information -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold border-b pb-2">Geographic Context</h3>
            
            <div v-if="user.geographicalContext" class="space-y-3">
              <div v-if="user.geographicalContext.community?.name">
                <label class="text-sm font-medium text-muted-foreground">Community</label>
                <p class="font-medium">{{ user.geographicalContext.community.name }}</p>
                <p class="text-sm text-muted-foreground">ID: {{ user.geographicalContext.community.id }}</p>
              </div>
              
              <div v-if="user.geographicalContext.county?.name">
                <label class="text-sm font-medium text-muted-foreground">County</label>
                <p class="font-medium">{{ user.geographicalContext.county.name }}</p>
                <p class="text-sm text-muted-foreground">ID: {{ user.geographicalContext.county.id }}</p>
              </div>
              
              <div v-if="user.geographicalContext.region?.id">
                <label class="text-sm font-medium text-muted-foreground">Region</label>
                <p class="font-medium">{{ user.geographicalContext.region.id }}</p>
              </div>
              
              <div v-if="user.geographicalContext.assignedAt">
                <label class="text-sm font-medium text-muted-foreground">Assigned Date</label>
                <p class="font-medium">{{ formatDateTime(user.geographicalContext.assignedAt) }}</p>
              </div>
              
              <div v-if="user.geographicalContext.assignmentMethod">
                <label class="text-sm font-medium text-muted-foreground">Assignment Method</label>
                <p class="font-medium">{{ formatAssignmentMethod(user.geographicalContext.assignmentMethod) }}</p>
              </div>
            </div>
            
            <div v-else class="text-center py-8 text-muted-foreground">
              <MapPin class="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No geographic information available</p>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Additional Information</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <Calendar class="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div class="text-sm text-muted-foreground">Account Created</div>
              <div class="font-semibold">{{ formatDate(user.updatedAt) }}</div>
            </div>
            
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <Shield class="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div class="text-sm text-muted-foreground">Access Level</div>
              <div class="font-semibold">{{ (user.role || 'user') === 'admin' ? 'Full Access' : 'Limited Access' }}</div>
            </div>
            
            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <Users class="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div class="text-sm text-muted-foreground">User Status</div>
              <div class="font-semibold">{{ user.userType === 'administrator' ? 'Administrator' : 'Member' }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" @click="$emit('close')">Close</Button>
          <Button @click="copyUserId">
            <Copy class="h-4 w-4 mr-2" />
            Copy User ID
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { MapPin, Calendar, Shield, Users, Copy } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import type { UserProfile } from '@/composables/useAuth'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  user: UserProfile
  open: boolean
}

defineEmits<{
  close: []
}>()

const { success } = useToast()

const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const formatUserType = (userType: string) => {
  const types = {
    'administrator': 'System Administrator',
    'community_admin': 'Community Administrator',
    'user': 'Regular User'
  }
  return types[userType as keyof typeof types] || userType
}

const formatRole = (role: string | undefined) => {
  if (!role) return 'User'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

const formatDateTime = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatAssignmentMethod = (method: string) => {
  const methods = {
    'manual_registration': 'Manual Registration',
    'admin_assignment': 'Admin Assignment',
    'admin_removal': 'Admin Removal',
    'automatic': 'Automatic Assignment'
  }
  return methods[method as keyof typeof methods] || method
}

const props = defineProps<Props>()

const copyUserId = async () => {
  try {
    await navigator.clipboard.writeText(props.user.uid)
    success('Copied', 'User ID copied to clipboard')
  } catch (error) {
    console.error('Failed to copy user ID:', error)
  }
}
</script>