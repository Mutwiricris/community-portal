<template>
  <DashboardLayout>
    <div class="space-y-6">
      <!-- Welcome Section -->
      <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">Welcome back, {{ userDisplayName }}</h1>
        <p class="text-muted-foreground">
          Here's an overview of your community leadership activities
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Communities</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalCommunities }}</div>
            <p class="text-xs text-muted-foreground">Communities you lead</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Members</CardTitle>
            <User class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalMembers }}</div>
            <p class="text-xs text-muted-foreground">Across all communities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Total Followers</CardTitle>
            <Star class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalFollowers }}</div>
            <p class="text-xs text-muted-foreground">Community followers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Active Tournaments</CardTitle>
            <Trophy class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ tournamentStats.activeTournaments }}</div>
            <p class="text-xs text-muted-foreground">
              {{ tournamentStats.totalTournaments }} total tournaments
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Quick Actions -->
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription> Common tasks for community management </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button
            class="h-auto flex-col space-y-2 p-4"
            variant="outline"
            @click="navigateTo('/communities')"
          >
            <Users class="h-6 w-6" />
            <span>Manage Communities</span>
          </Button>
          <Button
            class="h-auto flex-col space-y-2 p-4"
            variant="outline"
            @click="navigateTo('/members')"
          >
            <UserPlus class="h-6 w-6" />
            <span>Add Members</span>
          </Button>
          <Button
            class="h-auto flex-col space-y-2 p-4"
            variant="outline"
            @click="navigateTo('/tournaments')"
          >
            <Trophy class="h-6 w-6" />
            <span>Manage Tournaments</span>
          </Button>
          <Button
            class="h-auto flex-col space-y-2 p-4"
            variant="outline"
            @click="showMatchOverview = true"
          >
            <Calendar class="h-6 w-6" />
            <span>Schedule Event</span>
          </Button>
        </CardContent>
      </Card>

      <!-- Tournament Overview -->
      <Card v-if="activeTournaments.length > 0">
        <CardHeader>
          <CardTitle>Active Tournaments</CardTitle>
          <CardDescription> Ongoing tournaments in your community </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div
              v-for="tournament in activeTournaments"
              :key="tournament.id"
              class="flex items-center justify-between p-4 border rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy class="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p class="text-sm font-medium">{{ tournament.name }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ tournament.currentRound }} • {{ tournament.registeredParticipants }} players
                  </p>
                </div>
              </div>
              <div class="text-right">
                <Badge :variant="tournament.status === 'ongoing' ? 'default' : 'secondary'">
                  {{ tournament.status }}
                </Badge>
                <p class="text-xs text-muted-foreground mt-1">
                  {{
                    Math.round(
                      ((tournament.registeredParticipants - getActivePlayers(tournament.id)) /
                        tournament.registeredParticipants) *
                        100,
                    )
                  }}% complete
                </p>
              </div>
            </div>
          </div>
          <Separator class="my-4" />
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!canGenerateNextRound"
              @click="handleGenerateNextRound"
            >
              Generate Next Round
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="!canFinalizeTournaments"
              @click="handleFinalizeTournament"
            >
              Finalize Tournament
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Active Matches Overview -->
      <Card v-if="pendingMatches.length > 0 || inProgressMatches.length > 0">
        <CardHeader>
          <CardTitle>Active Matches</CardTitle>
          <CardDescription> Matches requiring attention </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div
              v-for="match in [...inProgressMatches, ...pendingMatches].slice(0, 5)"
              :key="match.id"
              class="flex items-center justify-between p-3 border rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div
                  :class="[
                    'h-3 w-3 rounded-full',
                    match.status === 'pending'
                      ? 'bg-red-500'
                      : match.status === 'in_progress'
                        ? 'bg-yellow-500'
                        : 'bg-green-500',
                  ]"
                ></div>
                <div>
                  <p class="text-sm font-medium">
                    {{ match.player1Name }} vs {{ match.player2Name }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ match.tournamentName }} • {{ match.roundNumber }}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" @click="openMatchDetails(match)"> View </Button>
            </div>
          </div>
          <Separator class="my-4" />
          <Button variant="outline" class="w-full" @click="showMatchOverview = true">
            View All Matches
          </Button>
        </CardContent>
      </Card>

      <!-- Recent Activity & Community Overview -->
      <div class="grid gap-4 md:grid-cols-2">
        <!-- Recent Activity -->
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription> Latest updates from your communities </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="recentActivities.length > 0" class="space-y-4">
              <div
                v-for="activity in recentActivities"
                :key="activity.id"
                class="flex items-center space-x-4"
              >
                <Avatar class="h-9 w-9">
                  <AvatarImage :src="activity.user.avatar" :alt="activity.user.name" />
                  <AvatarFallback>{{ activity.user.initials }}</AvatarFallback>
                </Avatar>
                <div class="space-y-1 flex-1 min-w-0">
                  <p class="text-sm font-medium leading-none">{{ activity.user.name }}</p>
                  <p class="text-sm text-muted-foreground truncate">
                    {{ activity.description }}
                  </p>
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ activity.timestamp }}
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-muted-foreground mb-4">No recent activity yet</p>
              <p class="text-xs text-muted-foreground">
                Activity will appear here as members interact with your communities
              </p>
            </div>
            <Separator class="my-4" />
            <Button variant="outline" class="w-full" @click="navigateTo('/messages')">
              View All Activity
            </Button>
          </CardContent>
        </Card>

        <!-- Community Overview -->
        <Card>
          <CardHeader>
            <CardTitle>Community Overview</CardTitle>
            <CardDescription> Your active communities at a glance </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="communities.length > 0" class="space-y-4">
              <div
                v-for="community in communities"
                :key="community.id"
                class="flex items-center justify-between"
              >
                <div class="flex items-center space-x-3">
                  <div class="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users class="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p class="text-sm font-medium">{{ community.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ community.memberCount }} members</p>
                  </div>
                </div>
                <Badge variant="secondary">{{ community.status }}</Badge>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <p class="text-sm text-muted-foreground mb-4">No communities yet</p>
              <p class="text-xs text-muted-foreground">
                Create your first community to get started
              </p>
            </div>
            <Separator class="my-4" />
            <Button variant="outline" class="w-full" @click="navigateTo('/communities')">
              {{ communities.length > 0 ? 'Manage All Communities' : 'Create Community' }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCommunityStore } from '@/stores/community'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Users, User, Star, UserPlus, Trophy, Calendar } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const communityStore = useCommunityStore()

const stats = ref({
  totalCommunities: 0,
  totalMembers: 0,
  totalFollowers: 0,
  activeCommunityMembers: 0,
})

const tournamentStats = ref({
  activeTournaments: 0,
  totalTournaments: 0,
  completedMatches: 0,
  pendingMatches: 0,
})

const showMatchOverview = ref(false)
const selectedMatch = ref(null)

const recentActivities = ref<
  Array<{
    id: number
    user: {
      name: string
      avatar: string
      initials: string
    }
    description: string
    timestamp: string
  }>
>([])

const communities = computed(() => {
  return communityStore.communities.map((community) => ({
    id: community.id,
    name: community.name,
    memberCount: community.memberCount,
    status: community.memberCount > 20 ? 'Active' : community.memberCount > 10 ? 'Growing' : 'New',
  }))
})

const userDisplayName = computed(() => {
  return authStore.user?.displayName || 'Community Leader'
})

const activeCommunityName = computed(() => {
  return communityStore.activeCommunity?.name || 'No active community'
})

// Tournament computed properties
const activeTournaments = computed(() => communityStore.activeTournaments)
const pendingMatches = computed(() => communityStore.pendingMatches)
const inProgressMatches = computed(() => communityStore.inProgressMatches)
const canGenerateNextRound = computed(() => communityStore.canGenerateNextRound)
const canFinalizeTournaments = computed(() => communityStore.canFinalizeTournaments)

const navigateTo = (path: string) => {
  router.push(path)
}

// Tournament methods
const getActivePlayers = (tournamentId: string) => {
  return (
    communityStore.matches.filter(
      (m) =>
        m.tournamentId === tournamentId && (m.status === 'pending' || m.status === 'in_progress'),
    ).length * 2
  ) // Approximate active players
}

const handleGenerateNextRound = async () => {
  if (activeTournaments.value.length > 0) {
    const result = await communityStore.generateNextRound(activeTournaments.value[0].id)
    if (result.success) {
      // Refresh data
      await loadDashboardData()
    }
  }
}

const handleFinalizeTournament = async () => {
  const finalizableTournament = activeTournaments.value.find(
    (t) => t.currentRound === 'Community_Final',
  )

  if (finalizableTournament) {
    const result = await communityStore.finalizeTournament(finalizableTournament.id)
    if (result.success) {
      // Refresh data
      await loadDashboardData()
    }
  }
}

const openMatchDetails = (match: any) => {
  selectedMatch.value = match
  // TODO: Open match details modal
}

const loadDashboardData = async () => {
  if (communityStore.activeCommunity) {
    try {
      await communityStore.fetchCommunityDashboardData(communityStore.activeCommunity.id)

      // Update tournament stats
      tournamentStats.value = {
        activeTournaments: communityStore.activeTournaments.length,
        totalTournaments: communityStore.tournaments.length,
        completedMatches: communityStore.completedMatches.length,
        pendingMatches: communityStore.pendingMatches.length,
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)

      // Use mock tournament stats for development
      if (process.env.NODE_ENV === 'development') {
        tournamentStats.value = {
          activeTournaments: 2,
          totalTournaments: 5,
          completedMatches: 15,
          pendingMatches: 3,
        }
      }
    }
  }
}

onMounted(async () => {
  // Load dashboard data
  await communityStore.fetchCommunities()

  // Get comprehensive stats from the store
  const communityStats = await communityStore.getCommunityStats()

  // Update stats with real data
  stats.value = {
    totalCommunities: communityStats.totalCommunities,
    totalMembers: communityStats.totalMembers,
    totalFollowers: communityStats.totalFollowers,
    activeCommunityMembers: communityStats.activeCommunityMembers,
  }

  // Load tournament data if we have an active community
  if (communityStore.activeCommunity) {
    await loadDashboardData()
  } else if (communityStore.communities.length > 0) {
    // Set the first community as active if none is set
    await communityStore.setActiveCommunity(communityStore.communities[0].id)
    await loadDashboardData()
  }

  // TODO: Replace with real activity data from Firebase
  // For now, keep activities empty until real activity tracking is implemented
  recentActivities.value = []
})
</script>
