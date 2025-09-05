<template>
  <Card class="hover:shadow-md transition-shadow">
    <CardContent class="p-6">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
          {{ getInitials(user.displayName) }}
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-lg">{{ user.displayName }}</h3>
          <p class="text-sm text-muted-foreground">{{ user.email }}</p>
          <Badge :variant="getRoleVariant(role)" class="mt-1">
            {{ role || 'Member' }}
          </Badge>
        </div>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground">User Type:</span>
          <span class="font-medium">{{ formatUserType(user.userType) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Role:</span>
          <span class="font-medium">{{ formatRole(user.role || 'user') }}</span>
        </div>
        <div v-if="user.geographicalContext?.community?.name" class="flex justify-between">
          <span class="text-muted-foreground">Community:</span>
          <span class="font-medium">{{ user.geographicalContext.community.name }}</span>
        </div>
        <div v-if="user.geographicalContext?.county?.name" class="flex justify-between">
          <span class="text-muted-foreground">County:</span>
          <span class="font-medium">{{ user.geographicalContext.county.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground">Joined:</span>
          <span class="font-medium">{{ formatDate(user.updatedAt) }}</span>
        </div>
      </div>

      <div class="flex justify-between items-center mt-6 pt-4 border-t">
        <Button @click="$emit('viewDetails')" variant="outline" size="sm">
          <Eye class="h-3 w-3 mr-1" />
          View Details
        </Button>
        <Button 
          v-if="canRemove" 
          @click="$emit('remove')" 
          variant="outline" 
          size="sm"
          class="text-red-600 hover:text-red-700"
        >
          <UserMinus class="h-3 w-3 mr-1" />
          Remove
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Eye, UserMinus } from 'lucide-vue-next'
import type { UserProfile } from '@/composables/useAuth'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  user: UserProfile
  role: string
  canRemove?: boolean
}

defineProps<Props>()

defineEmits<{
  viewDetails: []
  remove: []
}>()

const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const formatUserType = (userType: string) => {
  const types = {
    'administrator': 'Administrator',
    'community_admin': 'Community Admin',
    'user': 'Regular User'
  }
  return types[userType as keyof typeof types] || userType
}

const formatRole = (role: string | undefined) => {
  if (!role) return 'User'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

const getRoleVariant = (role: string | undefined) => {
  if (!role) return 'secondary'
  if (role.includes('Admin')) return 'default'
  return 'secondary'
}

const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}
</script>