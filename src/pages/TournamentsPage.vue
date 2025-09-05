<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Tournaments</h1>
          <p class="text-gray-600 mt-1">Manage and organize cuesport tournaments</p>
        </div>
        <Button @click="showCreateDialog = true" class="flex items-center gap-2">
          <Plus class="h-4 w-4" />
          Create Tournament
        </Button>
      </div>

      <!-- Tournament Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Active Tournaments</p>
                <p class="text-2xl font-bold text-blue-600">{{ activeTournaments.length }}</p>
              </div>
              <Trophy class="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Upcoming</p>
                <p class="text-2xl font-bold text-green-600">{{ upcomingTournaments.length }}</p>
              </div>
              <Calendar class="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Participants</p>
                <p class="text-2xl font-bold text-purple-600">{{ totalParticipants }}</p>
              </div>
              <Users class="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Completed</p>
                <p class="text-2xl font-bold text-gray-600">{{ completedTournaments.length }}</p>
              </div>
              <CheckCircle class="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tournament List -->
      <Card>
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="tournaments.length === 0" class="text-center py-12">
            <Trophy class="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">No tournaments yet</h3>
            <p class="text-gray-500 mb-6">Create your first tournament to get started</p>
            <Button @click="showCreateDialog = true">
              <Plus class="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </div>
          
          <div v-else class="space-y-4">
            <div 
              v-for="tournament in tournaments" 
              :key="tournament.id"
              class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0">
                  <Trophy class="h-10 w-10 text-yellow-500" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-800">{{ tournament.name }}</h3>
                  <p class="text-sm text-gray-600">{{ tournament.description }}</p>
                  <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      {{ formatDate(tournament.startDate) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <Users class="h-3 w-3" />
                      {{ tournament.participants }} participants
                    </span>
                    <span class="flex items-center gap-1">
                      <MapPin class="h-3 w-3" />
                      {{ tournament.location }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <Badge :variant="getBadgeVariant(tournament.status)">
                  {{ tournament.status }}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Eye class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Create Tournament Dialog (placeholder) -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Create Tournament</h2>
        <p class="text-gray-600 mb-4">Tournament creation form will be implemented here</p>
        <div class="flex space-x-2">
          <Button @click="showCreateDialog = false" variant="outline">Cancel</Button>
          <Button @click="showCreateDialog = false">Create</Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  Calendar, 
  Users, 
  CheckCircle, 
  Plus, 
  Eye, 
  Edit,
  MapPin
} from 'lucide-vue-next'

const showCreateDialog = ref(false)

// Mock tournament data
const tournaments = ref([
  {
    id: 1,
    name: 'Spring Championship 2024',
    description: '8-ball pool tournament for all skill levels',
    startDate: new Date('2024-04-15'),
    endDate: new Date('2024-04-17'),
    location: 'Community Center',
    participants: 32,
    status: 'upcoming'
  },
  {
    id: 2,
    name: 'Weekly League Match',
    description: 'Regular weekly competition',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-03-20'),
    location: 'Local Pool Hall',
    participants: 16,
    status: 'active'
  },
  {
    id: 3,
    name: 'Winter Classic',
    description: 'Annual winter tournament',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-17'),
    location: 'Sports Complex',
    participants: 24,
    status: 'completed'
  }
])

const activeTournaments = computed(() => 
  tournaments.value.filter(t => t.status === 'active')
)

const upcomingTournaments = computed(() => 
  tournaments.value.filter(t => t.status === 'upcoming')
)

const completedTournaments = computed(() => 
  tournaments.value.filter(t => t.status === 'completed')
)

const totalParticipants = computed(() => 
  tournaments.value.reduce((sum, t) => sum + t.participants, 0)
)

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default'
    case 'upcoming': return 'secondary'
    case 'completed': return 'outline'
    default: return 'outline'
  }
}
</script>