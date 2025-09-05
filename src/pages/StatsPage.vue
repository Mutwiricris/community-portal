<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">League Statistics</h1>
        <p class="text-gray-600 mt-1">Comprehensive statistics and analytics</p>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Games</p>
                <p class="text-2xl font-bold text-blue-600">1,247</p>
              </div>
              <BarChart3 class="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Active Players</p>
                <p class="text-2xl font-bold text-green-600">89</p>
              </div>
              <Users class="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Tournaments</p>
                <p class="text-2xl font-bold text-purple-600">23</p>
              </div>
              <Trophy class="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Win Rate</p>
                <p class="text-2xl font-bold text-orange-600">67%</p>
              </div>
              <Target class="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Games Per Month</CardTitle>
          </CardHeader>
          <CardContent class="h-80 flex items-center justify-center">
            <div class="text-center">
              <BarChart3 class="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500">Chart component will be implemented here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Player Performance</CardTitle>
          </CardHeader>
          <CardContent class="h-80 flex items-center justify-center">
            <div class="text-center">
              <TrendingUp class="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500">Performance chart will be implemented here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Top Players -->
      <Card>
        <CardHeader>
          <CardTitle>Top Players This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div 
              v-for="(player, index) in topPlayers" 
              :key="player.id"
              class="flex items-center justify-between p-4 border rounded-lg"
            >
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                    {{ index + 1 }}
                  </div>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">{{ player.name }}</h3>
                  <p class="text-sm text-gray-600">{{ player.gamesPlayed }} games played</p>
                </div>
              </div>
              
              <div class="text-right">
                <p class="text-lg font-bold text-green-600">{{ player.winRate }}%</p>
                <p class="text-sm text-gray-500">win rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Detailed Statistics -->
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="space-y-2">
              <h4 class="font-semibold text-gray-700">Game Types</h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>8-Ball</span>
                  <span class="font-medium">456 games</span>
                </div>
                <div class="flex justify-between">
                  <span>9-Ball</span>
                  <span class="font-medium">398 games</span>
                </div>
                <div class="flex justify-between">
                  <span>Straight Pool</span>
                  <span class="font-medium">234 games</span>
                </div>
                <div class="flex justify-between">
                  <span>Snooker</span>
                  <span class="font-medium">159 games</span>
                </div>
              </div>
            </div>
            
            <div class="space-y-2">
              <h4 class="font-semibold text-gray-700">Monthly Trends</h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>January</span>
                  <span class="font-medium">234 games</span>
                </div>
                <div class="flex justify-between">
                  <span>February</span>
                  <span class="font-medium">289 games</span>
                </div>
                <div class="flex justify-between">
                  <span>March</span>
                  <span class="font-medium">321 games</span>
                </div>
                <div class="flex justify-between">
                  <span>April</span>
                  <span class="font-medium">403 games</span>
                </div>
              </div>
            </div>
            
            <div class="space-y-2">
              <h4 class="font-semibold text-gray-700">Achievements</h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Perfect Games</span>
                  <span class="font-medium">12</span>
                </div>
                <div class="flex justify-between">
                  <span>Tournaments Won</span>
                  <span class="font-medium">7</span>
                </div>
                <div class="flex justify-between">
                  <span>Longest Streak</span>
                  <span class="font-medium">15 wins</span>
                </div>
                <div class="flex justify-between">
                  <span>Best Break</span>
                  <span class="font-medium">147</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  Users, 
  Trophy, 
  Target,
  TrendingUp
} from 'lucide-vue-next'

// Mock data for top players
const topPlayers = ref([
  { id: 1, name: 'John Smith', gamesPlayed: 45, winRate: 87 },
  { id: 2, name: 'Sarah Johnson', gamesPlayed: 38, winRate: 82 },
  { id: 3, name: 'Mike Chen', gamesPlayed: 42, winRate: 79 },
  { id: 4, name: 'Emily Davis', gamesPlayed: 35, winRate: 76 },
  { id: 5, name: 'David Wilson', gamesPlayed: 40, winRate: 73 }
])
</script>