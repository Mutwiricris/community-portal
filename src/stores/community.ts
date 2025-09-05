import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Community,
  Member,
  Player,
  Tournament,
  Match,
  TournamentPlayer,
  CommunityStats,
  DashboardData,
  ActivityItem,
} from '@/types'
import { useAuthStore } from './auth'
import {
  FirebaseCommunityService,
  type FirestoreCommunity,
  type FirestorePlayer,
} from '@/services/firebase'
import { apiService } from '@/services/api'

export const useCommunityStore = defineStore('community', () => {
  const activeCommunity = ref<Community | null>(null)
  const communities = ref<Community[]>([])
  const members = ref<Member[]>([])
  const players = ref<Player[]>([])
  const communityMembers = ref<Player[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Tournament-related state
  const tournaments = ref<Tournament[]>([])
  const matches = ref<Match[]>([])
  const tournamentPlayers = ref<TournamentPlayer[]>([])
  const communityStats = ref<CommunityStats | null>(null)
  const dashboardData = ref<DashboardData | null>(null)
  const recentActivity = ref<ActivityItem[]>([])
  const tournamentLoading = ref(false)
  const tournamentError = ref<string | null>(null)

  // Helper function to convert Firestore community to local Community type
  const convertFirestoreCommunity = (firestoreCommunity: FirestoreCommunity): Community => {
    return {
      id: firestoreCommunity.id,
      name: firestoreCommunity.name,
      description: firestoreCommunity.description,
      leaderId: firestoreCommunity.adminUserId,
      leaderName: '', // Will be populated from user data
      memberCount: firestoreCommunity.memberCount,
      createdAt: new Date(firestoreCommunity.createdAt),
      updatedAt: new Date(firestoreCommunity.lastActivityAt),
      // Additional fields from Firestore
      location: firestoreCommunity.location,
      county: firestoreCommunity.county,
      tags: firestoreCommunity.tags,
      initials: firestoreCommunity.initials,
      logoUrl: firestoreCommunity.logoUrl,
      followerCount: firestoreCommunity.followerCount,
      membersIds: firestoreCommunity.members_id || [],
    }
  }

  // Helper function to convert Firestore player to local Player type
  const convertFirestorePlayer = (firestorePlayer: FirestorePlayer): Player => {
    return {
      uid: firestorePlayer.uid,
      email: firestorePlayer.email,
      displayName: firestorePlayer.displayName,
      fullName: firestorePlayer.fullName,
      phoneNumber: firestorePlayer.phoneNumber,
      userType: firestorePlayer.userType,
      isActive: firestorePlayer.isActive,
      createdAt: new Date(firestorePlayer.createdAt),
      updatedAt: new Date(firestorePlayer.updatedAt),
    }
  }

  const fetchCommunities = async () => {
    const authStore = useAuthStore()
    console.log('Auth store user:', authStore.user)
    console.log('Is authenticated:', authStore.isAuthenticated)

    if (!authStore.user || !authStore.user.uid) {
      error.value = 'Not authenticated or missing user ID'
      console.warn('User not authenticated, using mock data for development')

      // Use mock data for development when user is not authenticated
      if (process.env.NODE_ENV === 'development') {
        communities.value = [
          {
            id: 'downtown_players_001',
            name: 'Downtown Players',
            description:
              'Premier billiards community in downtown Nairobi. Weekly tournaments, professional coaching, and competitive gameplay for all skill levels.',
            leaderId: 'mock_user_id',
            leaderName: 'Mock Community Leader',
            memberCount: 25,
            createdAt: new Date('2025-05-06'),
            updatedAt: new Date('2025-06-05'),
            location: 'Downtown',
            county: 'Nairobi',
            tags: ['Competitive', 'Professional Coaching', 'Downtown'],
            initials: 'DP',
            logoUrl: null,
            followerCount: 0,
            activeTournaments: 2,
            totalTournaments: 5,
            completedMatches: 15,
            pendingMatches: 3,
            lastTournamentActivity: new Date(),
          },
        ]
      }
      return
    }

    try {
      isLoading.value = true
      error.value = null

      // Fetch communities from Firebase for the logged-in community leader
      const firestoreCommunities = await FirebaseCommunityService.fetchCommunitiesForLeader(
        authStore.user.uid,
      )

      // Convert Firestore communities to local Community type
      communities.value = firestoreCommunities.map(convertFirestoreCommunity)

      console.log(`Fetched ${communities.value.length} communities for leader`)
    } catch (err: any) {
      console.error('Error fetching communities:', err)
      error.value = err.message || 'Failed to fetch communities'

      // Fallback to mock data in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for development')
        communities.value = [
          {
            id: 'downtown_players_001',
            name: 'Downtown Players',
            description:
              'Premier billiards community in downtown Nairobi. Weekly tournaments, professional coaching, and competitive gameplay for all skill levels.',
            leaderId: authStore.user.uid,
            leaderName: authStore.user.displayName || authStore.user.email,
            memberCount: 25,
            createdAt: new Date('2025-05-06'),
            updatedAt: new Date('2025-06-05'),
            location: 'Downtown',
            county: 'Nairobi',
            tags: ['Competitive', 'Professional Coaching', 'Downtown'],
            initials: 'DP',
            logoUrl: null,
            followerCount: 0,
          },
        ]
      }
    } finally {
      isLoading.value = false
    }
  }

  const fetchCommunityById = async (communityId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const firestoreCommunity = await FirebaseCommunityService.fetchCommunityById(communityId)

      if (firestoreCommunity) {
        const community = convertFirestoreCommunity(firestoreCommunity)

        // Update the community in the local array if it exists
        const index = communities.value.findIndex((c) => c.id === communityId)
        if (index !== -1) {
          communities.value[index] = community
        } else {
          communities.value.push(community)
        }

        return community
      }

      return null
    } catch (err: any) {
      console.error('Error fetching community by ID:', err)
      error.value = err.message || 'Failed to fetch community'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const getCommunityStats = async () => {
    const authStore = useAuthStore()
    console.log('Getting community stats for user:', authStore.user?.uid)

    if (!authStore.user || !authStore.user.uid) {
      console.warn('User not authenticated, returning mock stats for development')

      // Return mock stats for development
      if (process.env.NODE_ENV === 'development') {
        return {
          totalCommunities: 1,
          totalMembers: 25,
          totalFollowers: 10,
          activeCommunityMembers: 25,
          activeCommunity: communities.value[0] || null,
        }
      }

      return {
        totalCommunities: 0,
        totalMembers: 0,
        totalFollowers: 0,
        activeCommunityMembers: 0,
        activeCommunity: null,
      }
    }

    try {
      // Get stats from Firebase
      const stats = await FirebaseCommunityService.getCommunityStats(authStore.user.uid)

      // Set active community if we have one
      if (stats.activeCommunity && !activeCommunity.value) {
        activeCommunity.value = convertFirestoreCommunity(stats.activeCommunity)
      }

      return {
        totalCommunities: stats.totalCommunities,
        totalMembers: stats.totalMembers,
        totalFollowers: stats.totalFollowers,
        activeCommunityMembers: stats.activeCommunityMembers,
        activeCommunity: stats.activeCommunity
          ? convertFirestoreCommunity(stats.activeCommunity)
          : null,
      }
    } catch (err: any) {
      console.error('Error getting community stats:', err)

      // Fallback to local calculation
      return {
        totalCommunities: communities.value.length,
        totalMembers: communities.value.reduce((sum, community) => sum + community.memberCount, 0),
        totalFollowers: communities.value.reduce(
          (sum, community) => sum + (community.followerCount || 0),
          0,
        ),
        activeCommunityMembers: activeCommunity.value?.memberCount || 0,
        activeCommunity: activeCommunity.value,
      }
    }
  }

  const setActiveCommunity = async (communityId: string) => {
    try {
      let community = communities.value.find((c) => c.id === communityId)

      // If community not found locally, fetch from Firebase
      if (!community) {
        community = await fetchCommunityById(communityId)
      }

      if (community) {
        activeCommunity.value = community
        await fetchMembers(communityId)
        console.log(`Set active community: ${community.name}`)
      }
    } catch (error) {
      console.error('Error setting active community:', error)
    }
  }

  // Keep existing methods for local operations (create, update, delete, etc.)
  const createCommunity = async (data: { name: string; description: string }) => {
    const authStore = useAuthStore()
    if (!authStore.user || !authStore.user.uid)
      return { success: false, error: 'Not authenticated or missing user ID' }

    try {
      isLoading.value = true
      error.value = null

      // TODO: Implement Firebase create community
      // For now, use local implementation
      const communityData = {
        id: Date.now().toString(),
        name: data.name,
        description: data.description,
        leaderId: authStore.user.uid,
        leaderName: authStore.user.displayName || authStore.user.email,
        memberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: '',
        county: '',
        tags: [],
        initials: data.name
          .split(' ')
          .map((word) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        logoUrl: null,
        followerCount: 0,
      }

      communities.value.unshift(communityData)
      return { success: true, community: communityData }
    } catch (err: any) {
      error.value = err.message || 'Failed to create community'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const updateCommunity = async (id: string, data: { name?: string; description?: string }) => {
    try {
      isLoading.value = true
      error.value = null

      // TODO: Implement Firebase update community
      // For now, use local implementation
      const updates = {
        ...data,
        updatedAt: new Date(),
      }

      const index = communities.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        communities.value[index] = { ...communities.value[index], ...updates }
      }

      if (activeCommunity.value?.id === id) {
        activeCommunity.value = { ...activeCommunity.value, ...updates }
      }

      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update community'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const deleteCommunity = async (id: string) => {
    try {
      isLoading.value = true
      error.value = null

      // TODO: Implement Firebase delete community
      // For now, use local implementation
      communities.value = communities.value.filter((c) => c.id !== id)
      if (activeCommunity.value?.id === id) {
        activeCommunity.value = null
      }

      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete community'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const fetchMembers = async (communityId: string) => {
    try {
      isLoading.value = true
      error.value = null

      // TODO: Implement Firebase fetch members
      // For now, use mock data
      members.value = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          communityId,
          role: 'member',
          status: 'active',
          joinedAt: new Date('2024-01-20'),
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@example.com',
          communityId,
          role: 'member',
          status: 'active',
          joinedAt: new Date('2024-02-05'),
        },
      ]
    } catch (err: any) {
      console.error('Error fetching members:', err)
      error.value = err.message || 'Failed to fetch members'
    } finally {
      isLoading.value = false
    }
  }

  const inviteMember = async (email: string, communityId: string) => {
    try {
      isLoading.value = true
      error.value = null

      // TODO: Implement Firebase member invitation
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to invite member'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // New methods for managing players and community members
  const fetchAllPlayers = async () => {
    try {
      isLoading.value = true
      error.value = null

      const firestorePlayers = await FirebaseCommunityService.fetchAllPlayers()
      players.value = firestorePlayers.map(convertFirestorePlayer)

      console.log(`Fetched ${players.value.length} players`)
    } catch (err: any) {
      console.error('Error fetching players:', err)
      error.value = err.message || 'Failed to fetch players'
    } finally {
      isLoading.value = false
    }
  }

  const fetchCommunityMembers = async (communityId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const firestoreMembers = await FirebaseCommunityService.fetchCommunityMembers(communityId)
      communityMembers.value = firestoreMembers.map(convertFirestorePlayer)

      console.log(`Fetched ${communityMembers.value.length} members for community ${communityId}`)
    } catch (err: any) {
      console.error('Error fetching community members:', err)
      error.value = err.message || 'Failed to fetch community members'
    } finally {
      isLoading.value = false
    }
  }

  const addMemberToCommunity = async (communityId: string, playerUid: string) => {
    try {
      isLoading.value = true
      error.value = null

      await FirebaseCommunityService.addMemberToCommunity(communityId, playerUid)

      // Update local state
      const community = communities.value.find((c) => c.id === communityId)
      if (community) {
        community.memberCount = (community.memberCount || 0) + 1
        if (community.membersIds) {
          community.membersIds.push(playerUid)
        } else {
          community.membersIds = [playerUid]
        }
      }

      // Refresh community members if we're viewing this community
      if (activeCommunity.value?.id === communityId) {
        await fetchCommunityMembers(communityId)
      }

      return { success: true }
    } catch (err: any) {
      console.error('Error adding member to community:', err)
      error.value = err.message || 'Failed to add member to community'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const removeMemberFromCommunity = async (communityId: string, playerUid: string) => {
    try {
      isLoading.value = true
      error.value = null

      await FirebaseCommunityService.removeMemberFromCommunity(communityId, playerUid)

      // Update local state
      const community = communities.value.find((c) => c.id === communityId)
      if (community) {
        community.memberCount = Math.max(0, (community.memberCount || 0) - 1)
        if (community.membersIds) {
          community.membersIds = community.membersIds.filter((id) => id !== playerUid)
        }
      }

      // Refresh community members if we're viewing this community
      if (activeCommunity.value?.id === communityId) {
        await fetchCommunityMembers(communityId)
      }

      return { success: true }
    } catch (err: any) {
      console.error('Error removing member from community:', err)
      error.value = err.message || 'Failed to remove member from community'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const checkPlayerMembership = async (communityId: string, playerUid: string) => {
    try {
      return await FirebaseCommunityService.isPlayerMemberOfCommunity(communityId, playerUid)
    } catch (err: any) {
      console.error('Error checking player membership:', err)
      return false
    }
  }

  // Computed properties for tournament data
  const activeTournaments = computed(() => tournaments.value.filter((t) => t.status === 'ongoing'))

  const upcomingTournaments = computed(() =>
    tournaments.value.filter((t) => t.status === 'upcoming'),
  )

  const completedTournaments = computed(() =>
    tournaments.value.filter((t) => t.status === 'completed'),
  )

  const pendingMatches = computed(() => matches.value.filter((m) => m.status === 'pending'))

  const completedMatches = computed(() => matches.value.filter((m) => m.status === 'completed'))

  const inProgressMatches = computed(() => matches.value.filter((m) => m.status === 'in_progress'))

  const topPlayers = computed(() =>
    tournamentPlayers.value
      .sort((a, b) => b.performanceStats.winRate - a.performanceStats.winRate)
      .slice(0, 10),
  )

  const canGenerateNextRound = computed(() => {
    if (!activeCommunity.value || activeTournaments.value.length === 0) return false

    // Check if all matches in current round are completed
    const currentTournament = activeTournaments.value[0]
    const currentRoundMatches = matches.value.filter(
      (m) =>
        m.tournamentId === currentTournament.id && m.roundNumber === currentTournament.currentRound,
    )

    return (
      currentRoundMatches.length > 0 && currentRoundMatches.every((m) => m.status === 'completed')
    )
  })

  const canFinalizeTournaments = computed(() => {
    return activeTournaments.value.some(
      (t) =>
        t.currentRound === 'Community_Final' &&
        matches.value
          .filter((m) => m.tournamentId === t.id && m.roundNumber === 'Community_Final')
          .every((m) => m.status === 'completed'),
    )
  })

  // Tournament data fetching methods
  const fetchCommunityTournaments = async (communityId: string) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.getCommunityTournaments(communityId)

      if (response.success && response.data) {
        tournaments.value = response.data.map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: t.endDate ? new Date(t.endDate) : undefined,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }))

        console.log(`Fetched ${tournaments.value.length} tournaments for community ${communityId}`)
      } else {
        tournamentError.value = response.error || 'Failed to fetch tournaments'
      }
    } catch (err: any) {
      console.error('Error fetching community tournaments:', err)
      tournamentError.value = err.message || 'Failed to fetch tournaments'
    } finally {
      tournamentLoading.value = false
    }
  }

  const fetchCommunityMatches = async (communityId: string, filters?: any) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.getCommunityMatches(communityId, filters)

      if (response.success && response.data) {
        matches.value = response.data.map((m: any) => ({
          ...m,
          scheduledDateTime: m.scheduledDateTime ? new Date(m.scheduledDateTime) : undefined,
          completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        }))

        console.log(`Fetched ${matches.value.length} matches for community ${communityId}`)
      } else {
        tournamentError.value = response.error || 'Failed to fetch matches'
      }
    } catch (err: any) {
      console.error('Error fetching community matches:', err)
      tournamentError.value = err.message || 'Failed to fetch matches'
    } finally {
      tournamentLoading.value = false
    }
  }

  const fetchCommunityDashboardData = async (communityId: string) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.getCommunityDashboardData(communityId)

      if (response.success && response.data) {
        dashboardData.value = {
          ...response.data,
          communityStats: {
            ...response.data.communityStats,
            lastUpdated: new Date(response.data.communityStats.lastUpdated),
          },
          recentActivity: response.data.recentActivity.map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp),
          })),
        }

        // Update individual state arrays
        if (response.data.tournaments) {
          tournaments.value = response.data.tournaments.map((t: any) => t.tournament)
        }
        if (response.data.recentMatches) {
          matches.value = response.data.recentMatches
        }
        if (response.data.topPlayers) {
          tournamentPlayers.value = response.data.topPlayers
        }
        if (response.data.recentActivity) {
          recentActivity.value = response.data.recentActivity
        }

        console.log('Fetched comprehensive dashboard data for community', communityId)
      } else {
        tournamentError.value = response.error || 'Failed to fetch dashboard data'
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      tournamentError.value = err.message || 'Failed to fetch dashboard data'
    } finally {
      tournamentLoading.value = false
    }
  }

  const updateMatchResult = async (matchId: string, result: any) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.updateMatchResult(matchId, result)

      if (response.success && response.data) {
        // Update the match in local state
        const matchIndex = matches.value.findIndex((m) => m.id === matchId)
        if (matchIndex !== -1) {
          matches.value[matchIndex] = {
            ...matches.value[matchIndex],
            ...response.data,
            completedAt: response.data.completedAt
              ? new Date(response.data.completedAt)
              : undefined,
            updatedAt: new Date(response.data.updatedAt),
          }
        }

        console.log('Updated match result for match', matchId)
        return { success: true }
      } else {
        tournamentError.value = response.error || 'Failed to update match result'
        return { success: false, error: tournamentError.value }
      }
    } catch (err: any) {
      console.error('Error updating match result:', err)
      tournamentError.value = err.message || 'Failed to update match result'
      return { success: false, error: tournamentError.value }
    } finally {
      tournamentLoading.value = false
    }
  }

  const generateNextRound = async (tournamentId: string) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.generateNextRound(tournamentId)

      if (response.success) {
        // Refresh tournament and match data
        if (activeCommunity.value) {
          await fetchCommunityTournaments(activeCommunity.value.id)
          await fetchCommunityMatches(activeCommunity.value.id)
        }

        console.log('Generated next round for tournament', tournamentId)
        return { success: true }
      } else {
        tournamentError.value = response.error || 'Failed to generate next round'
        return { success: false, error: tournamentError.value }
      }
    } catch (err: any) {
      console.error('Error generating next round:', err)
      tournamentError.value = err.message || 'Failed to generate next round'
      return { success: false, error: tournamentError.value }
    } finally {
      tournamentLoading.value = false
    }
  }

  const finalizeTournament = async (tournamentId: string) => {
    try {
      tournamentLoading.value = true
      tournamentError.value = null

      const response = await apiService.finalizeTournament(tournamentId)

      if (response.success) {
        // Refresh tournament data
        if (activeCommunity.value) {
          await fetchCommunityTournaments(activeCommunity.value.id)
        }

        console.log('Finalized tournament', tournamentId)
        return { success: true, data: response.data }
      } else {
        tournamentError.value = response.error || 'Failed to finalize tournament'
        return { success: false, error: tournamentError.value }
      }
    } catch (err: any) {
      console.error('Error finalizing tournament:', err)
      tournamentError.value = err.message || 'Failed to finalize tournament'
      return { success: false, error: tournamentError.value }
    } finally {
      tournamentLoading.value = false
    }
  }

  return {
    // Existing community state
    activeCommunity,
    communities,
    members,
    players,
    communityMembers,
    isLoading,
    error,

    // Tournament state
    tournaments,
    matches,
    tournamentPlayers,
    communityStats,
    dashboardData,
    recentActivity,
    tournamentLoading,
    tournamentError,

    // Computed properties
    activeTournaments,
    upcomingTournaments,
    completedTournaments,
    pendingMatches,
    completedMatches,
    inProgressMatches,
    topPlayers,
    canGenerateNextRound,
    canFinalizeTournaments,

    // Existing methods
    fetchCommunities,
    fetchCommunityById,
    getCommunityStats,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    setActiveCommunity,
    fetchMembers,
    inviteMember,
    fetchAllPlayers,
    fetchCommunityMembers,
    addMemberToCommunity,
    removeMemberFromCommunity,
    checkPlayerMembership,

    // Tournament methods
    fetchCommunityTournaments,
    fetchCommunityMatches,
    fetchCommunityDashboardData,
    updateMatchResult,
    generateNextRound,
    finalizeTournament,
  }
})
