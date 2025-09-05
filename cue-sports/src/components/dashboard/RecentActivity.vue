<template>
  <Card>
    <CardHeader>
      <CardTitle>Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div v-for="activity in activities" :key="activity.id" class="flex items-center space-x-4">
          <div :class="cn('w-2 h-2 rounded-full', getActivityColor(activity.type))" />
          <div class="flex-1 space-y-1">
            <p class="text-sm font-medium">{{ activity.title }}</p>
            <p class="text-xs text-muted-foreground">{{ activity.description }}</p>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ formatTime(activity.timestamp) }}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'

interface Activity {
  id: string
  type: 'tournament' | 'player' | 'order' | 'finance'
  title: string
  description: string
  timestamp: Date
}

const activities = ref<Activity[]>([
  {
    id: '1',
    type: 'tournament',
    title: 'New Tournament Created',
    description: 'Spring Championship 2024 has been created',
    timestamp: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: '2',
    type: 'player',
    title: 'Player Registered',
    description: 'John Smith registered for the tournament',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: '3',
    type: 'order',
    title: 'Product Order',
    description: 'Championship Cue Set ordered by Mike Wilson',
    timestamp: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: '4',
    type: 'finance',
    title: 'Payment Received',
    description: '$150 entry fee payment from tournament registration',
    timestamp: new Date(Date.now() - 45 * 60 * 1000)
  }
])

const getActivityColor = (type: Activity['type']) => {
  const colors = {
    tournament: 'bg-blue-500',
    player: 'bg-green-500',
    order: 'bg-yellow-500',
    finance: 'bg-purple-500'
  }
  return colors[type]
}

const formatTime = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>