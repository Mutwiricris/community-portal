<template>
  <Card class="hover:shadow-md transition-shadow cursor-pointer" @click="$emit('click')">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {{ getInitials(player.firstName, player.lastName) }}
          </div>
          <div>
            <CardTitle class="text-lg">{{ player.firstName }} {{ player.lastName }}</CardTitle>
            <p class="text-sm text-muted-foreground">{{ player.email }}</p>
          </div>
        </div>
        <Badge :variant="getStatusVariant(player.status)">
          {{ formatStatus(player.status) }}
        </Badge>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Player Info -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center space-x-2">
          <Trophy class="h-4 w-4 text-muted-foreground" />
          <span>Rank #{{ player.rank || 'Unranked' }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <Star class="h-4 w-4 text-muted-foreground" />
          <span>{{ formatSkill(player.skill) }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          <span>{{ formatDate(player.registrationDate) }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <Target class="h-4 w-4 text-muted-foreground" />
          <span>{{ player.stats.winRate }}% Win Rate</span>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-secondary/50 rounded p-2">
          <div class="font-semibold">{{ player.stats.matchesPlayed }}</div>
          <div class="text-muted-foreground">Matches</div>
        </div>
        <div class="bg-green-100 dark:bg-green-900/20 rounded p-2">
          <div class="font-semibold text-green-700 dark:text-green-400">{{ player.stats.matchesWon }}</div>
          <div class="text-muted-foreground">Wins</div>
        </div>
        <div class="bg-blue-100 dark:bg-blue-900/20 rounded p-2">
          <div class="font-semibold text-blue-700 dark:text-blue-400">{{ player.stats.tournamentsPlayed }}</div>
          <div class="text-muted-foreground">Tournaments</div>
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
            @click.stop="$emit('archive')" 
            variant="outline"
            v-if="player.status === 'active'"
          >
            <Archive class="h-3 w-3 mr-1" />
            Archive
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('activate')" 
            variant="outline"
            v-else-if="player.status === 'archived'"
          >
            <UserCheck class="h-3 w-3 mr-1" />
            Activate
          </Button>
        </div>
        <Button size="sm" @click.stop="$emit('view')">
          View Profile
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Trophy, Star, Calendar, Target, Edit, Archive, UserCheck } from 'lucide-vue-next'
import { Player } from '@/types/player'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  player: Player & { id: string }
}

defineProps<Props>()

defineEmits<{
  click: []
  edit: []
  archive: []
  activate: []
  view: []
}>()

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const formatStatus = (status: Player['status']) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getStatusVariant = (status: Player['status']) => {
  const variants = {
    active: 'success',
    inactive: 'secondary',
    archived: 'outline'
  }
  return variants[status] as any
}

const formatSkill = (skill?: Player['skill']) => {
  if (!skill) return 'Not specified'
  return skill.charAt(0).toUpperCase() + skill.slice(1)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date))
}
</script>