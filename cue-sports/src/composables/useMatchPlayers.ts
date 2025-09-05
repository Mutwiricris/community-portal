import { ref, computed } from 'vue'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from './useToast'
import type { TournamentRegistration } from '@/types/tournament'
import type { Player } from '@/types/player'

export interface MatchPlayer {
  id: string
  name: string
  email?: string
  avatar?: string | null
  communityId: string
  communityName: string
  points: number
  registrationStatus: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  isEligible: boolean
  eligibilityReason?: string
}

export const useMatchPlayers = () => {
  const db = getFirebaseDb()
  const { error: showError } = useToast()

  // State
  const registeredPlayers = ref<MatchPlayer[]>([])
  const availablePlayers = ref<MatchPlayer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const eligiblePlayers = computed(() =>
    availablePlayers.value.filter(p => p.isEligible)
  )

  const playersByCommunity = computed(() => {
    const groups: Record<string, MatchPlayer[]> = {}
    eligiblePlayers.value.forEach(player => {
      if (!groups[player.communityId]) {
        groups[player.communityId] = []
      }
      groups[player.communityId].push(player)
    })
    return groups
  })

  const playersWithPaidStatus = computed(() =>
    eligiblePlayers.value.filter(p => p.paymentStatus === 'paid')
  )

  // Load registered players for a tournament from tournament's registeredPlayerIds array
  const loadRegisteredPlayers = async (tournamentId: string): Promise<MatchPlayer[]> => {
    loading.value = true
    error.value = null

    try {
      // Get the tournament document directly by ID
      const tournamentRef = doc(db, 'tournaments', tournamentId)
      const tournamentSnap = await getDoc(tournamentRef)
      
      if (!tournamentSnap.exists()) {
        throw new Error(`Tournament with ID "${tournamentId}" not found`)
      }
      
      const tournamentData = tournamentSnap.data()
      const registeredPlayerIds = (tournamentData.registeredPlayerIds as string[]) || []
      
      console.log(`Found ${registeredPlayerIds.length} registered player IDs in tournament ${tournamentId}:`, registeredPlayerIds)
      
      if (registeredPlayerIds.length === 0) {
        console.warn(`No registered player IDs found in tournament ${tournamentId}`)
        registeredPlayers.value = []
        availablePlayers.value = []
        return []
      }

      // Get player details directly from players collection using the IDs
      const playerPromises = registeredPlayerIds.map(async (playerId) => {
        try {
          // Get player details directly by document ID
          const playerRef = doc(db, 'players', playerId)
          const playerSnap = await getDoc(playerRef)
          
          if (!playerSnap.exists()) {
            console.warn(`Player ${playerId} not found in players collection, will try to get from registration data`)
            
            // Try to get player info from tournament registrations as fallback
            const registrationsQuery = query(
              collection(db, 'tournament_registrations'),
              where('tournamentId', '==', tournamentId),
              where('playerId', '==', playerId)
            )
            
            const registrationsSnap = await getDocs(registrationsQuery)
            
            if (registrationsSnap.empty) {
              console.warn(`No registration found for player ${playerId} in tournament ${tournamentId}`)
              return null
            }
            
            const registrationData = registrationsSnap.docs[0].data() as TournamentRegistration
            
            // Create player from registration data only
            const matchPlayer: MatchPlayer = {
              id: playerId,
              name: registrationData.playerName || `Player ${playerId.slice(-4)}`,
              email: registrationData.playerEmail || undefined,
              avatar: registrationData.playerAvatar || undefined,
              communityId: registrationData.communityId || '',
              communityName: registrationData.communityName || 'Unknown Community',
              points: 0,
              registrationStatus: registrationData.status,
              paymentStatus: registrationData.paymentStatus,
              isEligible: checkPlayerEligibility(registrationData),
              eligibilityReason: getEligibilityReason(registrationData)
            }

            console.log(`Created player from registration data:`, matchPlayer)
            return matchPlayer
          }
          
          const playerData = playerSnap.data() as Player
          console.log(`Found player ${playerId} in players collection:`, playerData.name)
          
          // Get tournament registration for payment and status info
          const registrationsQuery = query(
            collection(db, 'tournament_registrations'),
            where('tournamentId', '==', tournamentId),
            where('playerId', '==', playerId)
          )
          
          const registrationsSnap = await getDocs(registrationsQuery)
          let registrationData: Partial<TournamentRegistration> = {}
          
          if (!registrationsSnap.empty) {
            registrationData = registrationsSnap.docs[0].data() as TournamentRegistration
          }

          const matchPlayer: MatchPlayer = {
            id: playerId,
            name: playerData.name || registrationData.playerName || 'Unknown Player',
            email: playerData.email || registrationData.playerEmail,
            avatar: playerData.avatar || registrationData.playerAvatar || undefined,
            communityId: playerData.communityId || registrationData.communityId || '',
            communityName: playerData.communityName || registrationData.communityName || '',
            points: calculatePlayerPoints(registrationData, playerData),
            registrationStatus: registrationData.status || 'confirmed',
            paymentStatus: registrationData.paymentStatus || 'paid',
            isEligible: checkPlayerEligibility(registrationData, playerData),
            eligibilityReason: getEligibilityReason(registrationData, playerData)
          }

          return matchPlayer
        } catch (err) {
          console.error(`Error loading player ${playerId}:`, err)
          return null
        }
      })

      const playerResults = await Promise.all(playerPromises)
      const players = playerResults.filter(p => p !== null) as MatchPlayer[]
      
      registeredPlayers.value = players
      availablePlayers.value = players.filter(p => p.isEligible)

      console.log(`Loaded ${players.length} players from tournament registeredPlayerIds`)
      console.log(`${availablePlayers.value.length} players are eligible for matches`)
      
      // Debug: Log players and their eligibility status
      players.forEach(player => {
        console.log(`Player ${player.name} (${player.id}): eligible=${player.isEligible}, reason=${player.eligibilityReason}, payment=${player.paymentStatus}, registration=${player.registrationStatus}`)
      })
      
      return players
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load registered players'
      showError(error.value)
      return []
    } finally {
      loading.value = false
    }
  }

  // Load players directly from tournament's registeredPlayerIds array (simplified approach)
  const loadPlayersFromTournament = async (tournamentId: string): Promise<MatchPlayer[]> => {
    loading.value = true
    error.value = null

    try {
      // Get the tournament document directly by ID
      const tournamentRef = doc(db, 'tournaments', tournamentId)
      const tournamentSnap = await getDoc(tournamentRef)
      
      if (!tournamentSnap.exists()) {
        throw new Error(`Tournament with ID "${tournamentId}" not found`)
      }
      
      const tournamentData = tournamentSnap.data()
      const registeredPlayerIds = (tournamentData.registeredPlayerIds as string[]) || []
      
      console.log(`Loading ${registeredPlayerIds.length} players directly from tournament ${tournamentId}`)
      
      if (registeredPlayerIds.length === 0) {
        registeredPlayers.value = []
        availablePlayers.value = []
        return []
      }

      // Get player details efficiently using direct document access
      const playerPromises = registeredPlayerIds.map(async (playerId) => {
        try {
          // Get player details directly by document ID
          const playerRef = doc(db, 'players', playerId)
          const playerSnap = await getDoc(playerRef)
          
          if (!playerSnap.exists()) {
            console.warn(`Player ${playerId} not found in players collection, creating basic player profile`)
            
            // Try to get basic info from tournament registrations as fallback
            try {
              const registrationsQuery = query(
                collection(db, 'tournament_registrations'),
                where('tournamentId', '==', tournamentId),
                where('playerId', '==', playerId)
              )
              
              const registrationsSnap = await getDocs(registrationsQuery)
              
              if (!registrationsSnap.empty) {
                const registrationData = registrationsSnap.docs[0].data() as TournamentRegistration
                
                // Create player from registration data
                const matchPlayer: MatchPlayer = {
                  id: playerId,
                  name: registrationData.playerName || `Player ${playerId.slice(-4)}`,
                  email: registrationData.playerEmail || undefined,
                  avatar: registrationData.playerAvatar || undefined,
                  communityId: registrationData.communityId || '',
                  communityName: registrationData.communityName || 'Unknown Community',
                  points: 0,
                  registrationStatus: registrationData.status,
                  paymentStatus: registrationData.paymentStatus,
                  isEligible: true, // Make them eligible since they're in registeredPlayerIds
                  eligibilityReason: registrationData.status !== 'confirmed' ? `Registration ${registrationData.status} but in registeredPlayerIds` : undefined
                }
                
                console.log(`Created player from registration data (fallback):`, matchPlayer)
                return matchPlayer
              }
            } catch (regErr) {
              console.warn(`Failed to get registration data for player ${playerId}:`, regErr)
            }
            
            // Create a basic player profile when player document doesn't exist and no registration found
            const matchPlayer: MatchPlayer = {
              id: playerId,
              name: `Player ${playerId.slice(-4)}`, // Use last 4 chars of ID as name
              email: undefined,
              avatar: undefined,
              communityId: '',
              communityName: 'Unknown Community',
              points: 0,
              registrationStatus: 'confirmed', // Assume confirmed since they're in registeredPlayerIds
              paymentStatus: 'paid', // Assume paid since they're registered
              isEligible: true, // Make them eligible since they're registered
              eligibilityReason: 'Created from tournament registeredPlayerIds (no player or registration data found)'
            }
            
            console.log(`Created basic player profile for ${playerId}:`, matchPlayer)
            return matchPlayer
          }
          
          const playerData = playerSnap.data() as Player
          console.log(`Found player ${playerId} in players collection:`, playerData.name)

          // Create MatchPlayer with defaults for tournament-specific fields
          const matchPlayer: MatchPlayer = {
            id: playerId,
            name: playerData.name || playerData.displayName || `Player ${playerId.slice(-4)}`,
            email: playerData.email || undefined,
            avatar: playerData.avatar || playerData.photoURL || undefined,
            communityId: playerData.communityId || '',
            communityName: playerData.communityName || 'Unknown Community',
            points: playerData.stats?.matchesWon ? playerData.stats.matchesWon * 2 : 0,
            registrationStatus: 'confirmed', // Assume confirmed since they're in registeredPlayerIds
            paymentStatus: 'paid', // Assume paid since they're registered
            isEligible: true, // Make them eligible since they're in registeredPlayerIds
            eligibilityReason: playerData.status !== 'active' ? 'Player account inactive but in registeredPlayerIds' : undefined
          }
          
          console.log(`Created player from player data:`, matchPlayer)

          return matchPlayer
        } catch (err) {
          console.error(`Error loading player ${playerId}:`, err)
          return null
        }
      })

      const playerResults = await Promise.all(playerPromises)
      const players = playerResults.filter(p => p !== null) as MatchPlayer[]
      
      registeredPlayers.value = players
      availablePlayers.value = players.filter(p => p.isEligible)

      console.log(`Loaded ${players.length} players directly from registeredPlayerIds`)
      console.log(`${availablePlayers.value.length} players are eligible for matches`)
      
      // Debug: Log players and their eligibility status
      players.forEach(player => {
        console.log(`Player ${player.name} (${player.id}): eligible=${player.isEligible}, reason=${player.eligibilityReason}, payment=${player.paymentStatus}, registration=${player.registrationStatus}`)
      })
      
      return players
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load players from tournament'
      showError(error.value)
      return []
    } finally {
      loading.value = false
    }
  }

  // Load players for specific community
  const loadPlayersByCommunity = async (tournamentId: string, communityId: string): Promise<MatchPlayer[]> => {
    loading.value = true
    error.value = null

    try {
      const registrationsQuery = query(
        collection(db, 'tournament_registrations'),
        where('tournamentId', '==', tournamentId),
        where('communityId', '==', communityId),
        where('status', '==', 'confirmed'),
        orderBy('playerName', 'asc')
      )

      const registrationsSnap = await getDocs(registrationsQuery)
      const registrations = registrationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentRegistration[]

      const players: MatchPlayer[] = registrations.map(registration => ({
        id: registration.playerId,
        name: registration.playerName,
        email: registration.playerEmail,
        avatar: registration.playerAvatar || undefined,
        communityId: registration.communityId,
        communityName: registration.communityName,
        points: 0, // Will be calculated based on performance
        registrationStatus: registration.status,
        paymentStatus: registration.paymentStatus,
        isEligible: checkPlayerEligibility(registration),
        eligibilityReason: getEligibilityReason(registration)
      }))

      return players.filter(p => p.isEligible)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load community players'
      showError(error.value)
      return []
    } finally {
      loading.value = false
    }
  }

  // Search players
  const searchPlayers = (query: string): MatchPlayer[] => {
    if (!query.trim()) return eligiblePlayers.value

    const searchTerm = query.toLowerCase().trim()
    return eligiblePlayers.value.filter(player =>
      player.name.toLowerCase().includes(searchTerm) ||
      player.email?.toLowerCase().includes(searchTerm) ||
      player.communityName.toLowerCase().includes(searchTerm)
    )
  }

  // Filter players by criteria
  const filterPlayers = (criteria: {
    communityId?: string
    paymentStatus?: TournamentRegistration['paymentStatus']
    minPoints?: number
    maxPoints?: number
  }): MatchPlayer[] => {
    let filtered = eligiblePlayers.value

    if (criteria.communityId) {
      filtered = filtered.filter(p => p.communityId === criteria.communityId)
    }

    if (criteria.paymentStatus) {
      filtered = filtered.filter(p => p.paymentStatus === criteria.paymentStatus)
    }

    if (criteria.minPoints !== undefined) {
      filtered = filtered.filter(p => p.points >= criteria.minPoints!)
    }

    if (criteria.maxPoints !== undefined) {
      filtered = filtered.filter(p => p.points <= criteria.maxPoints!)
    }

    return filtered
  }

  // Get player by ID
  const getPlayer = (playerId: string): MatchPlayer | null => {
    return availablePlayers.value.find(p => p.id === playerId) || null
  }

  // Check if two players can be matched
  const canPlayersBeMatched = (player1Id: string, player2Id: string): { canMatch: boolean; reason?: string } => {
    const player1 = getPlayer(player1Id)
    const player2 = getPlayer(player2Id)

    if (!player1 || !player2) {
      return { canMatch: false, reason: 'One or both players not found' }
    }

    if (!player1.isEligible || !player2.isEligible) {
      return { canMatch: false, reason: 'One or both players are not eligible' }
    }

    if (player1.paymentStatus !== 'paid' || player2.paymentStatus !== 'paid') {
      return { canMatch: false, reason: 'Payment required for both players' }
    }

    // Check if they're from the same community (might be required for certain rounds)
    if (player1.communityId !== player2.communityId) {
      return { canMatch: true, reason: 'Players from different communities - check tournament rules' }
    }

    return { canMatch: true }
  }

  // Get random player pairs for automated matching
  const generatePlayerPairs = (
    players: MatchPlayer[], 
    criteria?: {
      sameCommunity?: boolean
      balancePoints?: boolean
    }
  ): Array<[MatchPlayer, MatchPlayer]> => {
    const pairs: Array<[MatchPlayer, MatchPlayer]> = []
    const availablePlayers = [...players.filter(p => p.isEligible && p.paymentStatus === 'paid')]

    if (criteria?.balancePoints) {
      // Sort by points for balanced matching
      availablePlayers.sort((a, b) => b.points - a.points)
    } else {
      // Randomize for variety
      availablePlayers.sort(() => Math.random() - 0.5)
    }

    while (availablePlayers.length >= 2) {
      const player1 = availablePlayers.shift()!
      let player2Index = 0

      if (criteria?.sameCommunity) {
        // Find a player from the same community
        player2Index = availablePlayers.findIndex(p => p.communityId === player1.communityId)
        if (player2Index === -1) {
          // If no same-community player found, take the first available
          player2Index = 0
        }
      }

      if (availablePlayers.length > player2Index) {
        const player2 = availablePlayers.splice(player2Index, 1)[0]
        pairs.push([player1, player2])
      }
    }

    return pairs
  }

  // Helper functions
  const calculatePlayerPoints = (registration: TournamentRegistration, playerData?: Partial<Player>): number => {
    // Start with tournament-specific points or default
    let points = 0

    // Add points from player's overall stats if available
    if (playerData?.stats?.matchesWon) {
      points = playerData.stats.matchesWon * 2
    }

    // Add points from previous tournament performance
    // This would be calculated based on match history

    return points
  }

  const checkPlayerEligibility = (registration: TournamentRegistration, playerData?: Partial<Player>): boolean => {
    // Check registration status - allow both confirmed and pending for match creation
    if (!['confirmed', 'pending'].includes(registration.status)) return false

    // For match creation, allow players with pending payment status for admin-managed matches
    // Only require paid status for automated matches
    if (!['paid', 'pending'].includes(registration.paymentStatus)) return false

    // Check player status if available
    if (playerData?.status && playerData.status !== 'active') return false

    return true
  }

  const getEligibilityReason = (registration: TournamentRegistration, playerData?: Partial<Player>): string | undefined => {
    if (!['confirmed', 'pending'].includes(registration.status)) {
      return 'Registration not confirmed'
    }

    if (!['paid', 'pending'].includes(registration.paymentStatus)) {
      return 'Payment issues'
    }

    if (playerData?.status && playerData.status !== 'active') {
      return 'Player account inactive'
    }

    // Show warning for pending status but still allow
    if (registration.status === 'pending') {
      return 'Registration pending (allowed for match creation)'
    }

    if (registration.paymentStatus === 'pending') {
      return 'Payment pending (allowed for admin matches)'
    }

    return undefined
  }

  // Clear state
  const clearPlayers = () => {
    registeredPlayers.value = []
    availablePlayers.value = []
    error.value = null
  }

  return {
    // State
    registeredPlayers,
    availablePlayers,
    loading,
    error,

    // Computed
    eligiblePlayers,
    playersByCommunity,
    playersWithPaidStatus,

    // Methods
    loadRegisteredPlayers,
    loadPlayersFromTournament,
    loadPlayersByCommunity,
    searchPlayers,
    filterPlayers,
    getPlayer,
    canPlayersBeMatched,
    generatePlayerPairs,
    clearPlayers
  }
}