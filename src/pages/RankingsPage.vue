<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Player Rankings</h1>
          <p class="text-gray-600 mt-1">Community leaderboards and player standings</p>
        </div>
        <Button @click="refreshRankings" class="flex items-center gap-2">
          <RotateCcw class="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <!-- Ranking Categories -->
      <div class="flex space-x-4">
        <Button 
          v-for="category in categories"
          :key="category.id"
          :variant="activeCategory === category.id ? 'default' : 'outline'"
          @click="activeCategory = category.id"
        >
          {{ category.name }}
        </Button>
      </div>

      <!-- Top 3 Podium -->
      <Card>
        <CardHeader>
          <CardTitle>{{ getCurrentCategoryName() }} - Top 3</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-3 gap-4">
            <!-- 2nd Place -->
            <div class="text-center order-1">
              <div class="relative">
                <div class="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
                  <span class="text-2xl font-bold text-gray-600">2</span>
                </div>
                <Medal class="absolute -top-1 -right-1 h-8 w-8 text-gray-400" />
              </div>
              <h3 class="font-semibold text-gray-800">{{ rankings[1]?.name || 'TBD' }}</h3>
              <p class="text-sm text-gray-600">{{ rankings[1]?.points || 0 }} pts</p>
              <Badge variant="secondary" class="mt-1">2nd</Badge>
            </div>
            
            <!-- 1st Place -->
            <div class="text-center order-2">
              <div class="relative">
                <div class="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-2 border-4 border-yellow-300">
                  <Crown class="h-8 w-8 text-yellow-600" />
                </div>
                <Trophy class="absolute -top-2 -right-2 h-10 w-10 text-yellow-500" />
              </div>
              <h3 class="font-bold text-gray-800 text-lg">{{ rankings[0]?.name || 'TBD' }}</h3>
              <p class="text-sm text-gray-600">{{ rankings[0]?.points || 0 }} pts</p>
              <Badge class="mt-1">Champion</Badge>
            </div>
            
            <!-- 3rd Place -->
            <div class="text-center order-3">
              <div class="relative">
                <div class="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <span class="text-2xl font-bold text-orange-600">3</span>
                </div>
                <Medal class="absolute -top-1 -right-1 h-8 w-8 text-orange-400" />
              </div>
              <h3 class="font-semibold text-gray-800">{{ rankings[2]?.name || 'TBD' }}</h3>
              <p class="text-sm text-gray-600">{{ rankings[2]?.points || 0 }} pts</p>
              <Badge variant="outline" class="mt-1">3rd</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Full Rankings Table -->
      <Card>
        <CardHeader>
          <CardTitle>Complete Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            <div 
              v-for="(player, index) in rankings" 
              :key="player.id"
              class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              :class="{
                'bg-yellow-50 border-yellow-200': index === 0,
                'bg-gray-50 border-gray-200': index === 1,
                'bg-orange-50 border-orange-200': index === 2
              }"
            >
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    :class="{
                      'bg-yellow-200 text-yellow-800': index === 0,
                      'bg-gray-200 text-gray-800': index === 1,
                      'bg-orange-200 text-orange-800': index === 2,
                      'bg-blue-100 text-blue-800': index > 2
                    }"
                  >
                    {{ index + 1 }}
                  </div>
                </div>
                
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User class="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ player.name }}</h3>
                    <p class="text-sm text-gray-600">{{ player.community }}</p>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-6 text-sm">
                <div class="text-center">
                  <p class="font-bold text-gray-800">{{ player.points }}</p>
                  <p class="text-gray-600">Points</p>
                </div>
                <div class="text-center">
                  <p class="font-bold text-green-600">{{ player.wins }}</p>
                  <p class="text-gray-600">Wins</p>
                </div>
                <div class="text-center">
                  <p class="font-bold text-red-600">{{ player.losses }}</p>
                  <p class="text-gray-600">Losses</p>
                </div>
                <div class="text-center">
                  <p class="font-bold text-blue-600">{{ player.winRate }}%</p>
                  <p class="text-gray-600">Win Rate</p>
                </div>
                
                <div class="flex items-center space-x-1">
                  <div 
                    class="flex items-center"
                    :class="{
                      'text-green-600': player.trend === 'up',
                      'text-red-600': player.trend === 'down',
                      'text-gray-600': player.trend === 'stable'
                    }"
                  >
                    <TrendingUp v-if="player.trend === 'up'" class="h-4 w-4" />
                    <TrendingDown v-else-if="player.trend === 'down'" class="h-4 w-4" />
                    <Minus v-else class="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Pagination -->
          <div class="flex items-center justify-between mt-6">
            <p class="text-sm text-gray-600">
              Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, totalPlayers) }} of {{ totalPlayers }} players
            </p>
            <div class="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                @click="currentPage--"
                :disabled="currentPage === 1"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                @click="currentPage++"
                :disabled="currentPage * pageSize >= totalPlayers"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
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
  Crown, 
  Medal, 
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw
} from 'lucide-vue-next'

const activeCategory = ref('overall')
const currentPage = ref(1)
const pageSize = 10

const categories = [
  { id: 'overall', name: 'Overall' },
  { id: '8ball', name: '8-Ball' },
  { id: '9ball', name: '9-Ball' },
  { id: 'snooker', name: 'Snooker' },
  { id: 'straight', name: 'Straight Pool' }
]

// Mock rankings data
const allRankings = ref({
  overall: [
    { id: 1, name: 'Alex Rodriguez', community: 'Downtown Billiards', points: 2450, wins: 89, losses: 12, winRate: 88, trend: 'up' },
    { id: 2, name: 'Sarah Chen', community: 'Elite Pool Club', points: 2380, wins: 76, losses: 15, winRate: 84, trend: 'up' },
    { id: 3, name: 'Mike Johnson', community: 'Metro Sports', points: 2290, wins: 68, losses: 18, winRate: 79, trend: 'stable' },
    { id: 4, name: 'Emily Davis', community: 'Central Hall', points: 2210, wins: 72, losses: 22, winRate: 77, trend: 'down' },
    { id: 5, name: 'David Wilson', community: 'Champions Club', points: 2150, wins: 65, losses: 20, winRate: 76, trend: 'up' },
    { id: 6, name: 'Lisa Thompson', community: 'Pro Billiards', points: 2090, wins: 58, losses: 19, winRate: 75, trend: 'stable' },
    { id: 7, name: 'James Brown', community: 'City Cues', points: 2030, wins: 62, losses: 24, winRate: 72, trend: 'down' },
    { id: 8, name: 'Maria Garcia', community: 'Royal Snooker', points: 1980, wins: 55, losses: 21, winRate: 72, trend: 'up' },
    { id: 9, name: 'Tom Anderson', community: 'Ace Pool Hall', points: 1920, wins: 51, losses: 23, winRate: 69, trend: 'stable' },
    { id: 10, name: 'Anna White', community: 'Diamond Tables', points: 1870, wins: 49, losses: 25, winRate: 66, trend: 'down' },
    { id: 11, name: 'Chris Taylor', community: 'Golden Cue', points: 1820, wins: 46, losses: 26, winRate: 64, trend: 'up' },
    { id: 12, name: 'Nicole Lee', community: 'Premium Pool', points: 1780, wins: 44, losses: 27, winRate: 62, trend: 'stable' }
  ],
  '8ball': [
    { id: 1, name: 'Mike Johnson', community: 'Metro Sports', points: 1890, wins: 45, losses: 8, winRate: 85, trend: 'up' },
    { id: 2, name: 'Alex Rodriguez', community: 'Downtown Billiards', points: 1850, wins: 42, losses: 9, winRate: 82, trend: 'stable' },
    { id: 3, name: 'Sarah Chen', community: 'Elite Pool Club', points: 1780, wins: 38, losses: 10, winRate: 79, trend: 'up' }
  ]
})

const rankings = computed(() => {
  const data = (allRankings.value as any)[activeCategory.value] || allRankings.value.overall
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return data.slice(start, end)
})

const totalPlayers = computed(() => {
  return (allRankings.value as any)[activeCategory.value]?.length || allRankings.value.overall.length
})

const getCurrentCategoryName = () => {
  const category = categories.find(c => c.id === activeCategory.value)
  return category?.name || 'Overall'
}

const refreshRankings = () => {
  console.log('Refreshing rankings...')
  // TODO: Implement actual refresh logic
}
</script>