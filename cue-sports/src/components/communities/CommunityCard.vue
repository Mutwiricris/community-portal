<template>
  <Card class="hover:shadow-md transition-shadow cursor-pointer" @click="navigateToDetail">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            {{ community.initials }}
          </div>
          <div>
            <CardTitle class="text-lg">{{ community.name }}</CardTitle>
            <p class="text-sm text-muted-foreground">{{ community.location }}, {{ community.county }}</p>
          </div>
        </div>
        <Badge :variant="getActivityVariant()" class="text-xs">
          {{ getActivityStatus() }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Community Info -->
      <div class="text-sm text-muted-foreground line-clamp-2">
        {{ community.description }}
      </div>
      
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center space-x-2">
          <Users class="h-4 w-4 text-muted-foreground" />
          <span>{{ community.memberCount || 0 }} Members</span>
        </div>
        <div class="flex items-center space-x-2">
          <Crown class="h-4 w-4 text-muted-foreground" />
          <span>{{ community.adminIds?.length || 0 }}/2 Admins</span>
        </div>
        <div class="flex items-center space-x-2">
          <Heart class="h-4 w-4 text-muted-foreground" />
          <span>{{ community.followerCount || 0 }} Followers</span>
        </div>
        <div class="flex items-center space-x-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          <span>{{ formatDate(community.lastActivityAt) }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div class="flex flex-wrap gap-1" v-if="community.tags && community.tags.length > 0">
        <Badge 
          v-for="tag in community.tags.slice(0, 3)" 
          :key="tag" 
          variant="secondary" 
          class="text-xs"
        >
          {{ tag }}
        </Badge>
        <span v-if="community.tags.length > 3" class="text-xs text-muted-foreground">
          +{{ community.tags.length - 3 }} more
        </span>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-secondary/50 rounded p-2">
          <div class="font-semibold">{{ community.memberCount || 0 }}</div>
          <div class="text-muted-foreground">Members</div>
        </div>
        <div class="bg-blue-100 dark:bg-blue-900/20 rounded p-2">
          <div class="font-semibold text-blue-700 dark:text-blue-400">{{ community.followerCount || 0 }}</div>
          <div class="text-muted-foreground">Followers</div>
        </div>
        <div class="bg-green-100 dark:bg-green-900/20 rounded p-2">
          <div class="font-semibold text-green-700 dark:text-green-400">{{ community.adminIds?.length || 0 }}</div>
          <div class="text-muted-foreground">Admins</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-2">
        <div class="flex space-x-2">
          <Button size="sm" @click.stop="$emit('edit')" variant="outline">
            <Edit class="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('manageAdmins')" 
            variant="outline"
            :disabled="(community.adminIds?.length || 0) >= 2"
          >
            <UserPlus class="h-3 w-3 mr-1" />
            Admins
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('manageMembers')" 
            variant="outline"
          >
            <Users class="h-3 w-3 mr-1" />
            Members
          </Button>
        </div>
        <Button size="sm" @click.stop="navigateToDetail">
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Users, Crown, Heart, Calendar, Edit, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { formatTimestamp } from '@/utils/firestore'
import type { Community } from '@/types/community'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  community: Community & { id: string }
}

const props = defineProps<Props>()
const router = useRouter()

defineEmits<{
  edit: []
  manageAdmins: []
  manageMembers: []
}>()

const getActivityStatus = () => {
  const lastActivity = formatTimestamp(props.community.lastActivityAt)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return 'Active'
  if (daysDiff <= 30) return 'Recent'
  return 'Inactive'
}

const getActivityVariant = () => {
  const status = getActivityStatus()
  return status === 'Active' ? 'success' : status === 'Recent' ? 'secondary' : 'outline'
}

const formatDate = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateValue)
}

const navigateToDetail = () => {
  router.push({ name: 'CommunityDetail', params: { id: props.community.id } })
}
</script>