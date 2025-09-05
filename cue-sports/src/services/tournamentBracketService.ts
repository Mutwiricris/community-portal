import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { getFirebaseDb } from '../firebase/config'
import type {
  TournamentBracket,
  Match,
  MatchResult,
  PlayerPosition,
  CommunityPositions,
  CountyPositions,
  RegionalPositions,
  NationalPositions
} from '../types/match'

export class TournamentBracketService {
  private db = getFirebaseDb()
  private bracketsCollection = collection(this.db, 'tournament_brackets')
  private matchesCollection = collection(this.db, 'matches')

  // Get tournament bracket
  async getTournamentBracket(tournamentId: string): Promise<TournamentBracket | null> {
    try {
      const docRef = doc(this.bracketsCollection, tournamentId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        return { tournamentId: docSnap.id, ...docSnap.data() } as TournamentBracket
      }
      
      return null
    } catch (error) {
      console.error('Error getting tournament bracket:', error)
      throw new Error(`Failed to get tournament bracket: ${error}`)
    }
  }

  // Update bracket after match completion
  async updateBracketAfterMatch(tournamentId: string, matchResult: MatchResult): Promise<void> {
    try {
      await runTransaction(this.db, async (transaction) => {
        const bracketRef = doc(this.bracketsCollection, tournamentId)
        const bracketSnap = await transaction.get(bracketRef)
        
        if (!bracketSnap.exists()) {
          throw new Error('Tournament bracket not found')
        }

        const bracket = { tournamentId, ...bracketSnap.data() } as TournamentBracket
        
        // Get the completed match details
        const matchRef = doc(this.matchesCollection, matchResult.matchId)
        const matchSnap = await transaction.get(matchRef)
        
        if (!matchSnap.exists()) {
          throw new Error('Match not found')
        }

        const match = { id: matchSnap.id, ...matchSnap.data() } as Match

        // Update bracket based on match result
        const updatedBracket = this.processBracketUpdate(bracket, match, matchResult)
        
        transaction.update(bracketRef, {
          ...updatedBracket,
          lastUpdated: serverTimestamp()
        })
      })
    } catch (error) {
      console.error('Error updating bracket after match:', error)
      throw new Error(`Failed to update bracket after match: ${error}`)
    }
  }

  // Advance players to next round
  async advancePlayersToNextRound(tournamentId: string, currentRound: string): Promise<void> {
    try {
      await runTransaction(this.db, async (transaction) => {
        const bracketRef = doc(this.bracketsCollection, tournamentId)
        const bracketSnap = await transaction.get(bracketRef)
        
        if (!bracketSnap.exists()) {
          throw new Error('Tournament bracket not found')
        }

        const bracket = { tournamentId, ...bracketSnap.data() } as TournamentBracket
        
        // Get completed matches from current round
        const matchesQuery = query(
          this.matchesCollection,
          where('tournamentId', '==', tournamentId),
          where('roundNumber', '==', currentRound),
          where('status', '==', 'completed')
        )
        
        const matchesSnap = await transaction.get(matchesQuery)
        const completedMatches = matchesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Match[]

        // Process advancement logic
        const updatedBracket = this.processPlayerAdvancement(bracket, completedMatches, currentRound)
        
        transaction.update(bracketRef, {
          ...updatedBracket,
          lastUpdated: serverTimestamp()
        })
      })
    } catch (error) {
      console.error('Error advancing players to next round:', error)
      throw new Error(`Failed to advance players to next round: ${error}`)
    }
  }

  // Check if round is complete
  async checkRoundCompletion(tournamentId: string, roundNumber: string): Promise<boolean> {
    try {
      const matchesQuery = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId),
        where('roundNumber', '==', roundNumber)
      )
      
      const matchesSnap = await getDocs(matchesQuery)
      const matches = matchesSnap.docs.map(doc => doc.data()) as Match[]
      
      if (matches.length === 0) {
        return false
      }

      // Check if all matches are completed
      return matches.every(match => match.status === 'completed')
    } catch (error) {
      console.error('Error checking round completion:', error)
      throw new Error(`Failed to check round completion: ${error}`)
    }
  }

  // Update player positions
  async updatePositions(tournamentId: string, positions: PlayerPosition[]): Promise<void> {
    try {
      const bracketRef = doc(this.bracketsCollection, tournamentId)
      
      await runTransaction(this.db, async (transaction) => {
        const bracketSnap = await transaction.get(bracketRef)
        
        if (!bracketSnap.exists()) {
          throw new Error('Tournament bracket not found')
        }

        const bracket = { tournamentId, ...bracketSnap.data() } as TournamentBracket
        
        // Update positions based on tournament level
        const updatedBracket = this.updateBracketPositions(bracket, positions)
        
        transaction.update(bracketRef, {
          ...updatedBracket,
          lastUpdated: serverTimestamp()
        })
      })
    } catch (error) {
      console.error('Error updating positions:', error)
      throw new Error(`Failed to update positions: ${error}`)
    }
  }

  // Get tournament winners by level
  async getTournamentWinners(tournamentId: string, level: 'community' | 'county' | 'regional' | 'national'): Promise<PlayerPosition[]> {
    try {
      const bracket = await this.getTournamentBracket(tournamentId)
      
      if (!bracket) {
        throw new Error('Tournament bracket not found')
      }

      const winners: PlayerPosition[] = []
      
      switch (level) {
        case 'community':
          Object.values(bracket.winners.community).forEach(communityWinners => {
            if (communityWinners.position1) {
              winners.push({
                player: communityWinners.position1,
                status: 'determined',
                roundDetermined: 'Community_F'
              })
            }
            if (communityWinners.position2) {
              winners.push({
                player: communityWinners.position2,
                status: 'determined',
                roundDetermined: 'Community_F'
              })
            }
            if (communityWinners.position3) {
              winners.push({
                player: communityWinners.position3,
                status: 'determined',
                roundDetermined: 'Community_SF'
              })
            }
          })
          break
        case 'county':
          Object.values(bracket.winners.county).forEach(countyWinners => {
            if (countyWinners.position1) {
              winners.push({
                player: countyWinners.position1,
                status: 'determined',
                roundDetermined: 'County_F'
              })
            }
          })
          break
        case 'regional':
          Object.values(bracket.winners.regional).forEach(regionalWinners => {
            if (regionalWinners.position1) {
              winners.push({
                player: regionalWinners.position1,
                status: 'determined',
                roundDetermined: 'Regional_F'
              })
            }
          })
          break
        case 'national':
          Object.values(bracket.winners.national).forEach(nationalWinners => {
            if (nationalWinners.position1) {
              winners.push({
                player: nationalWinners.position1,
                status: 'determined',
                roundDetermined: 'National_F'
              })
            }
          })
          break
      }

      return winners
    } catch (error) {
      console.error('Error getting tournament winners:', error)
      throw new Error(`Failed to get tournament winners: ${error}`)
    }
  }

  // Update round status
  async updateRoundStatus(tournamentId: string, roundNumber: string, status: 'pending' | 'in_progress' | 'completed'): Promise<void> {
    try {
      const bracketRef = doc(this.bracketsCollection, tournamentId)
      
      await updateDoc(bracketRef, {
        [`roundStatus.${roundNumber}`]: status,
        lastUpdated: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating round status:', error)
      throw new Error(`Failed to update round status: ${error}`)
    }
  }

  // Check if tournament is complete
  async checkTournamentCompletion(tournamentId: string): Promise<boolean> {
    try {
      const bracket = await this.getTournamentBracket(tournamentId)
      
      if (!bracket) {
        return false
      }

      // Check if all required rounds are completed
      const requiredRounds = this.getRequiredRounds(bracket)
      
      return requiredRounds.every(round => 
        bracket.roundStatus[round] === 'completed'
      )
    } catch (error) {
      console.error('Error checking tournament completion:', error)
      throw new Error(`Failed to check tournament completion: ${error}`)
    }
  }

  // Private helper methods

  private processBracketUpdate(bracket: TournamentBracket, match: Match, result: MatchResult): Partial<TournamentBracket> {
    const updates: any = {}

    // Update round status if this was the last match in the round
    if (this.isLastMatchInRound(bracket, match)) {
      updates[`roundStatus.${match.roundNumber}`] = 'completed'
    }

    // Update positions based on match type and result
    if (match.isLevelFinal) {
      const positionUpdates = this.updateFinalPositions(bracket, match, result)
      Object.assign(updates, positionUpdates)
    }

    // Update winners if tournament level is complete
    if (match.determinesTop3 || match.isLevelFinal) {
      const winnerUpdates = this.updateWinners(bracket, match, result)
      Object.assign(updates, winnerUpdates)
    }

    return updates
  }

  private processPlayerAdvancement(bracket: TournamentBracket, completedMatches: Match[], currentRound: string): Partial<TournamentBracket> {
    const updates: any = {}

    // Get winners from completed matches
    const winners = completedMatches
      .filter(match => match.winnerId)
      .map(match => ({
        playerId: match.winnerId!,
        playerName: match.winnerName!,
        communityId: match.communityId,
        countyId: match.countyId,
        regionId: match.regionId,
        points: match.winnerId === match.player1Id ? match.player1Points : match.player2Points!
      }))

    // Determine next round based on tournament structure
    const nextRound = this.getNextRound(currentRound, bracket.advancementRules.type)
    
    if (nextRound) {
      // Create matches for next round would be handled by the match creation service
      updates[`roundStatus.${nextRound}`] = 'pending'
    }

    return updates
  }

  private updateBracketPositions(bracket: TournamentBracket, positions: PlayerPosition[]): Partial<TournamentBracket> {
    const updates: any = {}

    positions.forEach((position, index) => {
      const positionNumber = index + 1
      
      // Update based on hierarchical level
      switch (bracket.hierarchicalLevel) {
        case 'community':
          Object.keys(bracket.positions.community).forEach(communityId => {
            updates[`positions.community.${communityId}.position_${positionNumber}`] = position
          })
          break
        case 'county':
          Object.keys(bracket.positions.county || {}).forEach(countyId => {
            updates[`positions.county.${countyId}.position_${positionNumber}`] = position
          })
          break
        case 'regional':
          Object.keys(bracket.positions.regional || {}).forEach(regionId => {
            updates[`positions.regional.${regionId}.position_${positionNumber}`] = position
          })
          break
        case 'national':
          Object.keys(bracket.positions.national || {}).forEach(nationalId => {
            updates[`positions.national.${nationalId}.position_${positionNumber}`] = position
          })
          break
      }
    })

    return updates
  }

  private updateFinalPositions(bracket: TournamentBracket, match: Match, result: MatchResult): any {
    const updates: any = {}
    
    // This would contain logic to update final positions based on the match result
    // Implementation depends on specific tournament structure
    
    return updates
  }

  private updateWinners(bracket: TournamentBracket, match: Match, result: MatchResult): any {
    const updates: any = {}
    
    if (match.isLevelFinal) {
      const winnerPlayer = {
        id: result.winnerId,
        name: match.winnerId === match.player1Id ? match.player1Name : match.player2Name!,
        communityId: match.winnerId === match.player1Id ? match.player1CommunityId : match.player2CommunityId!,
        countyId: match.countyId,
        regionId: match.regionId,
        points: match.winnerId === match.player1Id ? match.player1Points : match.player2Points!
      }

      const loserPlayer = {
        id: result.loserId,
        name: match.loserId === match.player1Id ? match.player1Name : match.player2Name!,
        communityId: match.loserId === match.player1Id ? match.player1CommunityId : match.player2CommunityId!,
        countyId: match.countyId,
        regionId: match.regionId,
        points: match.loserId === match.player1Id ? match.player1Points : match.player2Points!
      }

      switch (match.tournamentLevel) {
        case 'community':
          updates[`winners.community.${match.communityId}`] = {
            completedAt: serverTimestamp(),
            position1: winnerPlayer,
            position2: loserPlayer,
            position3: null // Would be determined from semi-final
          }
          break
        case 'county':
          updates[`winners.county.${match.countyId}`] = {
            completedAt: serverTimestamp(),
            position1: winnerPlayer,
            position2: loserPlayer,
            position3: null
          }
          break
        case 'regional':
          updates[`winners.regional.${match.regionId}`] = {
            completedAt: serverTimestamp(),
            position1: winnerPlayer,
            position2: loserPlayer,
            position3: null
          }
          break
        case 'national':
          updates[`winners.national.national`] = {
            completedAt: serverTimestamp(),
            position1: winnerPlayer,
            position2: loserPlayer,
            position3: null
          }
          break
      }
    }

    return updates
  }

  private isLastMatchInRound(bracket: TournamentBracket, match: Match): boolean {
    // This would check if the current match is the last one to complete in the round
    // Implementation would depend on the specific tournament structure
    return match.isLevelFinal
  }

  private getRequiredRounds(bracket: TournamentBracket): string[] {
    const rounds: string[] = []
    
    switch (bracket.hierarchicalLevel) {
      case 'community':
        rounds.push('Community_SF', 'Community_F')
        break
      case 'county':
        rounds.push('County_SF', 'County_F')
        break
      case 'regional':
        rounds.push('Regional_SF', 'Regional_F')
        break
      case 'national':
        rounds.push('National_SF', 'National_F')
        break
    }

    return rounds
  }

  private getNextRound(currentRound: string, tournamentType: string): string | null {
    // Map current round to next round based on tournament structure
    const roundProgression: Record<string, string> = {
      'R1': 'R2',
      'R2': 'Community_SF',
      'Community_SF': 'Community_F',
      'Community_F': 'County_SF',
      'County_SF': 'County_F',
      'County_F': 'Regional_SF',
      'Regional_SF': 'Regional_F',
      'Regional_F': 'National_SF',
      'National_SF': 'National_F'
    }

    return roundProgression[currentRound] || null
  }
}

// Export singleton instance
export const tournamentBracketService = new TournamentBracketService()