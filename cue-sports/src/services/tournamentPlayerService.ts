import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import type { TournamentRegistration } from '@/types/tournament'

export interface TournamentPlayer {
  id: string
  name: string
  email?: string
  avatar?: string | null
  communityId: string
  communityName: string
  countyId?: string
  regionId?: string
  playerId: string
  registrationStatus: 'pending' | 'confirmed' | 'cancelled'
}

export class TournamentPlayerService {
  private db = getFirebaseDb()

  /**
   * Get confirmed registered players for a tournament with full user details
   */
  async getConfirmedRegisteredPlayers(tournamentId: string): Promise<TournamentPlayer[]> {
    try {
      // Get all confirmed registrations for this tournament
      const registrationsRef = collection(this.db, 'tournament_registrations')
      const registrationsQuery = query(
        registrationsRef,
        where('tournamentId', '==', tournamentId),
        where('status', '==', 'confirmed')
      )
      
      const registrationsSnapshot = await getDocs(registrationsQuery)
      
      if (registrationsSnapshot.empty) {
        return []
      }
      
      const registrations = registrationsSnapshot.docs.map(doc => doc.data() as TournamentRegistration)
      
      // Extract unique player IDs for batch fetching
      const playerIds = [...new Set(registrations.map(reg => reg.playerId))]
      
      // Batch fetch user documents (max 30 per batch due to Firestore limitations)
      const batchSize = 30
      const userDataMap = new Map<string, any>()
      
      for (let i = 0; i < playerIds.length; i += batchSize) {
        const batch = playerIds.slice(i, i + batchSize)
        
        // Use Promise.all for parallel fetching within each batch
        const userPromises = batch.map(async playerId => {
          try {
            const userRef = doc(this.db, 'users', playerId)
            const userDoc = await getDoc(userRef)
            return { playerId, userData: userDoc.exists() ? userDoc.data() : null }
          } catch (error) {
            return { playerId, userData: null }
          }
        })
        
        const userResults = await Promise.all(userPromises)
        userResults.forEach(({ playerId, userData }) => {
          if (userData) {
            userDataMap.set(playerId, userData)
          }
        })
      }
      
      // Build player objects using cached user data
      const players: TournamentPlayer[] = []
      
      for (const registration of registrations) {
        const userData = userDataMap.get(registration.playerId)
        
        const player: TournamentPlayer = {
          id: registration.playerId,
          playerId: registration.playerId,
          name: userData?.playerName || userData?.displayName || userData?.fullName || userData?.name || registration.playerName,
          email: userData?.email || registration.playerEmail,
          avatar: userData?.photoURL || userData?.avatar || registration.playerAvatar,
          communityId: userData?.communityId || registration.communityId,
          communityName: userData?.communityName || registration.communityName,
          countyId: userData?.countyId,
          regionId: userData?.regionId,
          registrationStatus: registration.status
        }
        
        players.push(player)
      }
      
      return players
      
    } catch (error) {
      console.error('❌ Error loading tournament players:', error)
      throw new Error(`Failed to load tournament players: ${error}`)
    }
  }

  /**
   * Prepare player data for algorithm API
   */
  preparePlayersForAlgorithm(players: TournamentPlayer[]) {
    return players.map(player => ({
      id: player.playerId,
      name: player.name,
      communityId: player.communityId,
      countyId: player.countyId,
      regionId: player.regionId,
      points: 0, // Initial points
      currentRanking: null
    }))
  }

  /**
   * Validate tournament player requirements - optimized batch validation
   */
  validatePlayerRequirements(players: TournamentPlayer[], tournamentType?: string): { valid: boolean; message: string } {
    // Early exit for empty player list
    if (players.length === 0) {
      return {
        valid: false,
        message: 'No players found for tournament'
      }
    }

    const minPlayers = this.getMinimumPlayers(tournamentType)
    
    // Batch validation checks
    const validationResults = this.performBatchValidation(players, minPlayers)
    
    if (validationResults.length > 0) {
      return {
        valid: false,
        message: `Validation failed: ${validationResults.join('; ')}`
      }
    }
    
    return {
      valid: true,
      message: `${players.length} players validated and ready for tournament`
    }
  }

  /**
   * Perform all validation checks in a single pass for performance
   */
  private performBatchValidation(players: TournamentPlayer[], minPlayers: number): string[] {
    const issues: string[] = []
    const playerIds = new Set<string>()
    const communities = new Set<string>()
    
    // Single pass validation
    for (const player of players) {
      // Check for duplicates
      if (playerIds.has(player.playerId)) {
        issues.push(`Duplicate player registration: ${player.name} (${player.playerId})`)
      } else {
        playerIds.add(player.playerId)
      }
      
      // Collect communities for diversity check
      if (player.communityId) {
        communities.add(player.communityId)
      }
      
      // Check required fields
      if (!player.name || player.name.trim() === '') {
        issues.push(`Player ${player.playerId} missing name`)
      }
      
      if (!player.communityId) {
        issues.push(`Player ${player.name} missing community assignment`)
      }
    }
    
    // Minimum player count check
    if (players.length < minPlayers) {
      issues.push(`Insufficient players: found ${players.length}, minimum required: ${minPlayers}`)
    }
    
    // Even number check for bracket tournaments
    if (players.length % 2 !== 0) {
      issues.push(`Tournament requires even number of players: found ${players.length}`)
    }
    
    return issues
  }

  /**
   * Get minimum player requirements based on tournament type
   */
  private getMinimumPlayers(tournamentType?: string): number {
    switch (tournamentType) {
      case 'community':
        return 4 // Minimum for community tournament
      case 'county':
        return 2 // County winners
      case 'regional':
        return 2 // Regional winners
      case 'national':
        return 2 // National finalists
      default:
        return 4 // Default minimum
    }
  }

  /**
   * Get player statistics for tournament planning
   */
  async getTournamentPlayerStats(tournamentId: string) {
    try {
      const registrationsRef = collection(this.db, 'tournament_registrations')
      const allRegistrationsQuery = query(
        registrationsRef,
        where('tournamentId', '==', tournamentId)
      )
      
      const snapshot = await getDocs(allRegistrationsQuery)
      const registrations = snapshot.docs.map(doc => doc.data() as TournamentRegistration)
      
      const stats = {
        total: registrations.length,
        confirmed: registrations.filter(r => r.status === 'confirmed').length,
        pending: registrations.filter(r => r.status === 'pending').length,
        cancelled: registrations.filter(r => r.status === 'cancelled').length,
        byStatus: {
          confirmed: registrations.filter(r => r.status === 'confirmed'),
          pending: registrations.filter(r => r.status === 'pending'),
          cancelled: registrations.filter(r => r.status === 'cancelled')
        },
        communities: [...new Set(registrations.map(r => r.communityId))].length,
        readyForTournament: registrations.filter(r => r.status === 'confirmed').length >= 4
      }
      
      return stats
    } catch (error) {
      console.error('Error getting tournament player stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export const tournamentPlayerService = new TournamentPlayerService()