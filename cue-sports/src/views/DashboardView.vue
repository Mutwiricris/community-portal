<template>
  <div class="space-y-8 p-6">
      <!-- Dashboard Header -->
      <DashboardHeader 
        :user-name="userName"
        @new-tournament="handleNewTournament"
        @refresh="refreshDashboard"
      />

      <!-- Stats Grid -->
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tournaments"
          :value="stats.tournaments"
          :change="12"
          :icon="Trophy"
        />
        <StatsCard
          title="Active Players"
          :value="stats.players"
          :change="8"
          :icon="Users"
        />
        <StatsCard
          title="Live Matches"
          :value="stats.liveMatches"
          :change="-2"
          :icon="Play"
        />
        <StatsCard
          title="Monthly Revenue"
          :value="`$${stats.revenue.toLocaleString()}`"
          :change="15"
          :icon="DollarSign"
        />
      </div>

      <!-- Main Content Grid -->
      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Revenue Chart -->
        <div class="lg:col-span-8">
          <RevenueChart />
        </div>
        
        <!-- Live Matches -->
        <div class="lg:col-span-4">
          <LiveMatches />
        </div>
      </div>

      <!-- Secondary Content Grid -->
      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Recent Activity -->
        <div class="lg:col-span-8">
          <RecentActivity />
        </div>
        
        <!-- Upcoming Events -->
        <div class="lg:col-span-4">
          <UpcomingEvents />
        </div>
      </div>

      <!-- Quick Actions -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
        <QuickActionsGrid />
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, Users, Play, DollarSign } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import RecentActivity from '@/components/dashboard/RecentActivity.vue'
import LiveMatches from '@/components/dashboard/LiveMatches.vue'
import UpcomingEvents from '@/components/dashboard/UpcomingEvents.vue'
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid.vue'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => {
  return authStore.user?.displayName || authStore.user?.email?.split('@')[0] || 'User'
})

const stats = ref({
  tournaments: 24,
  players: 156,
  liveMatches: 8,
  revenue: 12580
})

onMounted(() => {
  loadStats()
})

const loadStats = async () => {
  // In a real app, this would fetch from Firestore
  // For now, we'll use mock data
}

const handleNewTournament = () => {
  router.push('/tournaments/new')
}

const refreshDashboard = () => {
  loadStats()
  // Refresh other dashboard components if needed
}
</script>