<template>
  <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-center py-8 text-red-600">
      {{ error }}
    </div>

    <div v-else-if="player" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <Button variant="ghost" @click="$router.back()" class="mb-4">
            <ArrowLeft class="mr-2 h-4 w-4" />
            Back to Players
          </Button>
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {{ getInitials(player.firstName, player.lastName) }}
            </div>
            <div>
              <h1 class="text-3xl font-bold tracking-tight">{{ player.firstName }} {{ player.lastName }}</h1>
              <p class="text-muted-foreground">{{ player.email }}</p>
            </div>
          </div>
        </div>
        <Badge :variant="getStatusVariant(player.status)">
          {{ formatStatus(player.status) }}
        </Badge>
      </div>

      <!-- Player Info Cards -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent class="flex items-center p-6">
            <Trophy class="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 class="font-medium">Rank</h3>
              <p class="text-sm text-muted-foreground">#{{ player.rank || 'Unranked' }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="flex items-center p-6">
            <Star class="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <h3 class="font-medium">Skill Level</h3>
              <p class="text-sm text-muted-foreground">{{ formatSkill(player.skill) }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="flex items-center p-6">
            <Target class="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 class="font-medium">Win Rate</h3>
              <p class="text-sm text-muted-foreground">{{ player.stats.winRate }}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="flex items-center p-6">
            <DollarSign class="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 class="font-medium">Total Earnings</h3>
              <p class="text-sm text-muted-foreground">${{ player.stats.totalEarnings.toFixed(2) }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Statistics -->
      <div class="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Match Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span>Matches Played</span>
                <span class="font-medium">{{ player.stats.matchesPlayed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Matches Won</span>
                <span class="font-medium text-green-600">{{ player.stats.matchesWon }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Matches Lost</span>
                <span class="font-medium text-red-600">{{ player.stats.matchesLost }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Current Streak</span>
                <span class="font-medium">{{ player.stats.currentStreak }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Best Streak</span>
                <span class="font-medium">{{ player.stats.bestStreak }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tournament History</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span>Tournaments Played</span>
                <span class="font-medium">{{ player.stats.tournamentsPlayed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Tournaments Won</span>
                <span class="font-medium text-yellow-600">{{ player.stats.tournamentsWon }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Tournament Win Rate</span>
                <span class="font-medium">{{ getTournamentWinRate() }}%</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Registration Date</span>
                <span class="font-medium">{{ formatDate(player.registrationDate) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Contact Information -->
      <Card v-if="player.phone || player.dateOfBirth">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-2">
            <div v-if="player.phone" class="flex items-center space-x-2">
              <Phone class="h-4 w-4 text-muted-foreground" />
              <span>{{ player.phone }}</span>
            </div>
            <div v-if="player.dateOfBirth" class="flex items-center space-x-2">
              <Calendar class="h-4 w-4 text-muted-foreground" />
              <span>{{ formatDateOfBirth(player.dateOfBirth) }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  ArrowLeft, Trophy, Star, Target, DollarSign, Phone, Calendar 
} from 'lucide-vue-next'
import { Player } from '@/types/player'
import { usePlayers } from '@/composables/usePlayers'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'

const route = useRoute()
const { getPlayer } = usePlayers()

const player = ref<(Player & { id: string }) | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

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
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

const formatDateOfBirth = (date: Date) => {
  const birthDate = new Date(date)
  const age = new Date().getFullYear() - birthDate.getFullYear()
  return `${formatDate(birthDate)} (${age} years old)`
}

const getTournamentWinRate = () => {
  if (!player.value || player.value.stats.tournamentsPlayed === 0) return 0
  return Math.round((player.value.stats.tournamentsWon / player.value.stats.tournamentsPlayed) * 100)
}

onMounted(async () => {
  try {
    const id = route.params.id as string
    player.value = await getPlayer(id)
    if (!player.value) {
      error.value = 'Player not found'
    }
  } catch (err) {
    error.value = 'Failed to load player'
  } finally {
    loading.value = false
  }
})
</script>