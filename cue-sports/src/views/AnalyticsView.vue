<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Analytics</h1>
        <p class="text-muted-foreground">
          Insights and performance metrics
        </p>
      </div>
      <div class="flex gap-2">
        <select v-model="timeRange" class="rounded-md border px-3 py-2">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
        <Button variant="outline">
          <Download class="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <TrendingUp class="h-4 w-4 text-green-600" />
            <span class="ml-2 text-sm font-medium">Total Revenue</span>
          </div>
          <div class="text-2xl font-bold">$24,580</div>
          <p class="text-xs text-muted-foreground">
            <span class="text-green-600">+12%</span> from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <Users class="h-4 w-4 text-blue-600" />
            <span class="ml-2 text-sm font-medium">Active Players</span>
          </div>
          <div class="text-2xl font-bold">1,234</div>
          <p class="text-xs text-muted-foreground">
            <span class="text-green-600">+8%</span> from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <Trophy class="h-4 w-4 text-yellow-600" />
            <span class="ml-2 text-sm font-medium">Tournaments</span>
          </div>
          <div class="text-2xl font-bold">45</div>
          <p class="text-xs text-muted-foreground">
            <span class="text-green-600">+5</span> from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="p-6">
          <div class="flex items-center">
            <Target class="h-4 w-4 text-purple-600" />
            <span class="ml-2 text-sm font-medium">Avg Match Duration</span>
          </div>
          <div class="text-2xl font-bold">42m</div>
          <p class="text-xs text-muted-foreground">
            <span class="text-red-600">-3m</span> from last month
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts Grid -->
    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Revenue Trend -->
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div class="text-center">
              <BarChart3 class="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">Revenue chart would go here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Player Activity -->
      <Card>
        <CardHeader>
          <CardTitle>Player Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div class="text-center">
              <Activity class="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">Activity chart would go here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Tournament Performance -->
      <Card>
        <CardHeader>
          <CardTitle>Tournament Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div class="text-center">
              <PieChart class="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p class="text-muted-foreground">Performance chart would go here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Top Players -->
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="(player, index) in topPlayers" :key="player.id" class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <p class="font-medium">{{ player.name }}</p>
                <p class="text-sm text-muted-foreground">{{ player.wins }} wins</p>
              </div>
              <div class="text-right">
                <p class="font-bold">{{ player.rating }}</p>
                <p class="text-xs text-muted-foreground">Rating</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Download, 
  TrendingUp, 
  Users, 
  Trophy, 
  Target,
  BarChart3,
  Activity,
  PieChart
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'

const timeRange = ref('30d')

const topPlayers = ref([
  { id: 1, name: 'John Smith', wins: 24, rating: 2150 },
  { id: 2, name: 'Sarah Wilson', wins: 22, rating: 2120 },
  { id: 3, name: 'Mike Johnson', wins: 20, rating: 2080 },
  { id: 4, name: 'Emma Clark', wins: 18, rating: 2050 },
  { id: 5, name: 'Tom Brown', wins: 16, rating: 2020 }
])
</script>