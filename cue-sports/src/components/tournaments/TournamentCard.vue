<template>
  <Card class="hover:shadow-md transition-shadow cursor-pointer" @click="navigateToDetail">
    <CardHeader class="pb-3">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <CardTitle class="text-lg mb-1">{{ tournament.name }}</CardTitle>
          <p class="text-sm text-muted-foreground mb-2">{{ tournament.location }}</p>
          <div class="flex gap-2">
            <Badge :variant="getStatusVariant(tournament.status)" class="text-xs">
              {{ formatStatus(tournament.status) }}
            </Badge>
            <Badge :variant="getTypeVariant(tournament.type)" class="text-xs">
              {{ formatType(tournament.type) }}
            </Badge>
            <Badge v-if="tournament.isFeatured" variant="default" class="text-xs">
              Featured
            </Badge>
            <Badge v-if="tournament.isQualificationTournament" variant="secondary" class="text-xs">
              Qualification
            </Badge>
          </div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold text-green-600">
            {{ formatCurrency(tournament.prizePool, tournament.currency) }}
          </div>
          <div class="text-xs text-muted-foreground">Prize Pool</div>
        </div>
      </div>
    </CardHeader>

    <!-- Banner Image -->
    <div v-if="tournament.bannerImage" class="px-6">
      <img 
        :src="tournament.bannerImage" 
        :alt="tournament.name"
        class="w-full h-32 object-cover rounded-lg mb-4"
      />
    </div>

    <CardContent class="space-y-4">
      <!-- Tournament Info -->
      <div class="text-sm text-muted-foreground line-clamp-2">
        {{ tournament.description }}
      </div>
      
      <!-- Key Dates -->
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="flex items-center space-x-2">
          <Calendar class="h-4 w-4 text-muted-foreground" />
          <div>
            <div class="font-medium">Start Date</div>
            <div class="text-muted-foreground">{{ formatDate(tournament.startDate) }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <Clock class="h-4 w-4 text-muted-foreground" />
          <div>
            <div class="font-medium">Registration</div>
            <div class="text-muted-foreground">{{ formatDate(tournament.registrationEndDate) }}</div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
          <div class="font-semibold text-blue-700 dark:text-blue-400">
            {{ displayRegistrationCount }}/{{ tournament.maxPlayers }}
          </div>
          <div class="text-muted-foreground">Players</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded p-2">
          <div class="font-semibold text-green-700 dark:text-green-400">
            {{ formatCurrency(tournament.entryFee, tournament.currency) }}
          </div>
          <div class="text-muted-foreground">Entry Fee</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded p-2">
          <div class="font-semibold text-purple-700 dark:text-purple-400">
            {{ tournament.estimatedDuration }}
          </div>
          <div class="text-muted-foreground">Duration</div>
        </div>
      </div>

      <!-- Registration Progress -->
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted-foreground">Registration Progress</span>
          <span class="font-medium">
            {{ Math.round((displayRegistrationCount / tournament.maxPlayers) * 100) }}%
          </span>
        </div>
        <div class="w-full bg-secondary/30 rounded-full h-2">
          <div 
            class="bg-primary h-2 rounded-full transition-all duration-300"
            :style="{ width: `${Math.min((displayRegistrationCount / tournament.maxPlayers) * 100, 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Geographical Scope -->
      <div v-if="tournament.geographicalScope" class="flex items-center space-x-2 text-sm">
        <MapPin class="h-4 w-4 text-muted-foreground" />
        <span class="text-muted-foreground">
          {{ formatGeographicalScope(tournament.geographicalScope) }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-2 border-t">
        <div class="flex space-x-2">
          <Button size="sm" @click.stop="$emit('edit')" variant="outline">
            <Edit class="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('manageRegistrations')" 
            variant="outline"
          >
            <Users class="h-3 w-3 mr-1" />
            Players
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('delete')" 
            variant="destructive"
          >
            <Trash2 class="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
        <div class="flex space-x-2">
          <Button 
            v-if="canRegister" 
            size="sm" 
            @click.stop="$emit('register')"
            class="bg-green-600 hover:bg-green-700"
          >
            <UserPlus class="h-3 w-3 mr-1" />
            Register
          </Button>
          <Button size="sm" @click.stop="navigateToDetail">
            View Details
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentRegistrations } from '@/composables/useTournamentRegistrations'
import { 
  Calendar, 
  Clock, 
  Edit, 
  Users, 
  UserPlus, 
  MapPin,
  Trash2
} from 'lucide-vue-next'
import { formatTimestamp } from '@/utils/firestore'
import { safeToDate } from '@/utils/dateUtils'
import type { Tournament } from '@/types/tournament'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  tournament: Tournament & { id: string }
}

const props = defineProps<Props>()
const router = useRouter()

defineEmits<{
  edit: []
  register: []
  manageRegistrations: []
  delete: []
}>()

// Get real-time registration count
const { currentRegistrations } = useTournamentRegistrations(props.tournament.id)

// Use real-time count if available, fallback to stored count
const displayRegistrationCount = computed(() => {
  return currentRegistrations.value ?? props.tournament.currentRegistrations ?? 0
})

const canRegister = computed(() => {
  const now = new Date()
  const regEnd = safeToDate(props.tournament.registrationEndDate)
  const regStart = safeToDate(props.tournament.registrationStartDate)
  
  // If dates are invalid, return false
  if (!regEnd || !regStart) {
    return false
  }
  
  return props.tournament.status === 'registration_open' || 
         (props.tournament.status === 'upcoming' && 
          now >= regStart && 
          now <= regEnd && 
          displayRegistrationCount.value < props.tournament.maxPlayers)
})

const getStatusVariant = (status: string) => {
  const variants = {
    'upcoming': 'secondary' as const,
    'registration_open': 'default' as const,
    'registration_closed': 'outline' as const,
    'ongoing': 'default' as const,
    'completed': 'secondary' as const,
    'cancelled': 'destructive' as const
  }
  return variants[status as keyof typeof variants] || 'secondary' as const
}

const getTypeVariant = (type: string) => {
  const variants = {
    'community': 'secondary' as const,
    'county': 'default' as const,
    'regional': 'default' as const, 
    'national': 'default' as const
  }
  return variants[type as keyof typeof variants] || 'secondary' as const
}

const formatStatus = (status: string) => {
  const formats = {
    'upcoming': 'Upcoming',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'ongoing': 'Ongoing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
}

const formatType = (type: string) => {
  const formats = {
    'community': 'Community',
    'county': 'County',
    'regional': 'Regional',
    'national': 'National'
  }
  return formats[type as keyof typeof formats] || type
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'KES') {
    return `KES ${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

const formatDate = (date: string | Date | any) => {
  const dateValue = safeToDate(date)
  if (!dateValue) {
    return 'Invalid Date'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateValue)
}

const formatGeographicalScope = (scope: Tournament['geographicalScope']) => {
  if (scope.communityName) {
    return `${scope.communityName}, ${scope.countyName || ''}`
  }
  if (scope.countyName) {
    return `${scope.countyName}, ${scope.regionName || ''}`
  }
  if (scope.regionName) {
    return scope.regionName
  }
  return 'National'
}

const navigateToDetail = () => {
  router.push({ name: 'TournamentDetail', params: { id: props.tournament.id } })
}
</script>