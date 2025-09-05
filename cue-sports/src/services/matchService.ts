import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { getFirebaseDb } from '../firebase/config'
import type {
  Match,
  MatchCreationData,
  MatchUpdateData,
  MatchResult,
  MatchFilters,
  MatchSearchParams,
  MatchAuditLog
} from '../types/match'

export class MatchService {
  private db = getFirebaseDb()
  private matchesCollection = collection(this.db, 'matches')
  private auditCollection = collection(this.db, 'tournament_audit_logs')
  
  // Helper to get tournament matches subcollection
  private getTournamentMatchesCollection(tournamentId: string) {
    return collection(this.db, 'tournaments', tournamentId, 'matches')
  }
  
  // Get ALL matches from all indexed locations for a tournament
  async getAllIndexedMatches(tournamentId: string): Promise<Match[]> {
    console.log('🔍 Fetching ALL indexed matches for tournament:', tournamentId)
    const allMatches: Match[] = []
    const matchIds = new Set<string>()
    
    try {
      // 1. Check tournament subcollection (tournaments/{id}/matches)
      try {
        const subcollectionRef = this.getTournamentMatchesCollection(tournamentId)
        const subcollectionSnapshot = await getDocs(subcollectionRef)
        
        if (!subcollectionSnapshot.empty) {
          console.log('✅ Found', subcollectionSnapshot.size, 'matches in tournament subcollection')
          subcollectionSnapshot.docs.forEach(doc => {
            if (!matchIds.has(doc.id)) {
              matchIds.add(doc.id)
              allMatches.push({ id: doc.id, ...doc.data() } as Match)
            }
          })
        }
      } catch (subError) {
        console.log('⚠️ No tournament subcollection')
      }
      
      // 2. Check tournament_matches collection (if exists)
      try {
        const tournamentMatchesRef = collection(this.db, 'tournament_matches')
        const q = query(tournamentMatchesRef, where('tournamentId', '==', tournamentId))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          console.log('✅ Found', snapshot.size, 'matches in tournament_matches collection')
          snapshot.docs.forEach(doc => {
            if (!matchIds.has(doc.id)) {
              matchIds.add(doc.id)
              allMatches.push({ id: doc.id, ...doc.data() } as Match)
            }
          })
        }
      } catch (error) {
        console.log('⚠️ No tournament_matches collection')
      }
      
      // 3. Check indexed_matches collection (if exists)
      try {
        const indexedMatchesRef = collection(this.db, 'indexed_matches')
        const q = query(indexedMatchesRef, where('tournamentId', '==', tournamentId))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          console.log('✅ Found', snapshot.size, 'matches in indexed_matches collection')
          snapshot.docs.forEach(doc => {
            if (!matchIds.has(doc.id)) {
              matchIds.add(doc.id)
              allMatches.push({ id: doc.id, ...doc.data() } as Match)
            }
          })
        }
      } catch (error) {
        console.log('⚠️ No indexed_matches collection')
      }
      
      // 4. Finally check root matches collection
      const rootQuery = query(this.matchesCollection, where('tournamentId', '==', tournamentId))
      const rootSnapshot = await getDocs(rootQuery)
      
      if (!rootSnapshot.empty) {
        console.log('✅ Found', rootSnapshot.size, 'matches in root collection')
        rootSnapshot.docs.forEach(doc => {
          if (!matchIds.has(doc.id)) {
            matchIds.add(doc.id)
            allMatches.push({ id: doc.id, ...doc.data() } as Match)
          }
        })
      }
      
      console.log('📊 Total unique matches found:', allMatches.length)
      
      // If still no matches found, try fetching from algorithm API
      if (allMatches.length === 0) {
        console.log('🤖 No matches in any collection, checking algorithm API...')
        try {
          const algorithmMatches = await this.fetchMatchesFromAlgorithm(tournamentId)
          if (algorithmMatches && algorithmMatches.length > 0) {
            console.log('✅ Found', algorithmMatches.length, 'matches from algorithm API')
            allMatches.push(...algorithmMatches)
          }
        } catch (apiError) {
          console.log('⚠️ Could not fetch from algorithm API:', apiError)
        }
      }
      
      // Sort by match number
      return allMatches.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
      
    } catch (error) {
      console.error('Error fetching all indexed matches:', error)
      throw new Error(`Failed to fetch indexed matches: ${error}`)
    }
  }
  
  // Fetch matches directly from algorithm API
  private async fetchMatchesFromAlgorithm(tournamentId: string): Promise<Match[]> {
    try {
      const response = await fetch('/api/algorithm/tournament/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tournamentId })
      })
      
      if (!response.ok) {
        throw new Error(`Algorithm API returned ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.matches) {
        // Convert algorithm matches to our Match type
        return data.matches.map((algMatch: any) => ({
          id: algMatch.id || `${tournamentId}_${algMatch.matchNumber}`,
          tournamentId: tournamentId,
          tournamentLevel: algMatch.tournamentLevel || 'community',
          roundNumber: algMatch.roundNumber,
          matchNumber: algMatch.matchNumber,
          matchType: algMatch.matchType,
          player1Id: algMatch.player1?.id || algMatch.player1Id,
          player1Name: algMatch.player1?.name || algMatch.player1Name,
          player1Points: algMatch.player1?.points || algMatch.player1Points || 0,
          player1CommunityId: algMatch.player1?.communityId || algMatch.player1CommunityId,
          player2Id: algMatch.player2?.id || algMatch.player2Id || null,
          player2Name: algMatch.player2?.name || algMatch.player2Name || null,
          player2Points: algMatch.player2?.points || algMatch.player2Points || null,
          player2CommunityId: algMatch.player2?.communityId || algMatch.player2CommunityId || null,
          communityId: algMatch.communityId,
          countyId: algMatch.countyId || null,
          regionId: algMatch.regionId || null,
          determinesPositions: algMatch.determinesPositions || [],
          isLevelFinal: algMatch.isLevelFinal || false,
          determinesTop3: algMatch.determinesTop3 || false,
          isByeMatch: algMatch.isByeMatch || false,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'algorithm-system'
        }))
      }
      
      return []
    } catch (error) {
      console.error('Error fetching matches from algorithm:', error)
      return []
    }
  }

  // Create a new match
  async createMatch(data: MatchCreationData, createdBy: string): Promise<Match> {
    try {
      // Generate searchable text for optimization  
      const searchableText = this.generateSearchableText(data)
      
      const matchData: Omit<Match, 'id'> = {
        ...data,
        player2Id: data.player2Id || null,
        player2Name: data.player2Name || null,
        player2Points: data.player2Points || null,
        player2CommunityId: data.player2CommunityId || null,
        countyId: data.countyId || null,
        regionId: data.regionId || null,
        winnerId: null,
        winnerName: null,
        loserId: null,
        loserName: null,
        scheduledDate: data.scheduledDateTime ? Timestamp.fromDate(data.scheduledDateTime) : null,
        scheduledDateTime: data.scheduledDateTime ? Timestamp.fromDate(data.scheduledDateTime) : null,
        actualStartTime: null,
        actualEndTime: null,
        venueId: data.venueId || null,
        venueName: data.venueName || null,
        venueAddress: data.venueAddress || null,
        tableNumber: data.tableNumber || null,
        status: 'pending',
        determinesTop3: data.determinesTop3 || false,
        isLevelFinal: data.isLevelFinal || false,
        isByeMatch: data.isByeMatch || false,
        positionBasedMatching: data.positionBasedMatching || false,
        positioningRound: data.positioningRound || null,
        positioningStage: data.positioningStage || null,
        geographicalSeparation: data.geographicalSeparation || false,
        maximumBreaks: data.maximumBreaks || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy,
        resultSubmittedAt: null,
        resultSubmittedBy: null,
        adminNotes: data.adminNotes || null,
        disputeReason: null,
        timeZone: data.timeZone || 'Africa/Nairobi',
        searchableText
      }

      const docRef = await addDoc(this.matchesCollection, matchData)
      const createdMatch = { id: docRef.id, ...matchData } as Match

      // Log the creation
      await this.logMatchAudit({
        entityId: docRef.id,
        action: 'create',
        actionBy: createdBy,
        beforeState: null,
        afterState: createdMatch,
        changedFields: ['all'],
        reason: 'Match created',
        tournamentId: data.tournamentId
      })

      return createdMatch
    } catch (error) {
      console.error('Error creating match:', error)
      throw new Error(`Failed to create match: ${error}`)
    }
  }

  // Get match by ID - check indexed locations if we have context
  async getMatch(matchId: string, tournamentId?: string): Promise<Match | null> {
    try {
      // If we have tournamentId, check indexed location first
      if (tournamentId) {
        try {
          const subcollectionRef = this.getTournamentMatchesCollection(tournamentId)
          const docRef = doc(subcollectionRef, matchId)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            console.log('✅ Found match in indexed location:', tournamentId)
            return { id: docSnap.id, ...docSnap.data() } as Match
          }
        } catch (subError) {
          console.log('⚠️ Match not in provided tournament:', tournamentId)
        }
      }
      
      // Fallback to root collection
      const docRef = doc(this.matchesCollection, matchId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        console.log('✅ Found match in root collection')
        return { id: docSnap.id, ...docSnap.data() } as Match
      }
      
      // Last resort: comprehensive search across ALL tournaments
      console.log('🔍 Doing comprehensive search across all tournaments for match:', matchId)
      const allMatches = await this.getAllMatchesWithTournamentNames()
      const foundMatch = allMatches.find(match => match.id === matchId)
      
      if (foundMatch) {
        console.log('✅ Found match in comprehensive search:', foundMatch.tournamentName || foundMatch.tournamentId)
        // Remove tournamentName if it exists as it's not in the Match interface
        const { tournamentName, ...matchData } = foundMatch as any
        return matchData as Match
      }
      
      console.log('❌ Match not found anywhere:', matchId)
      return null
    } catch (error) {
      console.error('Error getting match:', error)
      throw new Error(`Failed to get match: ${error}`)
    }
  }

  // Update match in its indexed location
  async updateMatch(matchId: string, updates: MatchUpdateData, updatedBy: string, tournamentId?: string): Promise<Match> {
    try {
      console.log('📝 Updating match:', matchId, 'with updates:', updates)
      
      // First, find where the match is stored - try comprehensive search
      let existingMatch: Match | null = null
      
      // Try with tournament context first if provided
      if (tournamentId) {
        existingMatch = await this.getMatch(matchId, tournamentId)
      }
      
      // If still not found, try comprehensive search across all indexed locations
      if (!existingMatch) {
        console.log('🔍 Match not found with direct lookup, searching all indexed locations...')
        
        // Get all tournaments and search their subcollections
        try {
          const tournamentsRef = collection(this.db, 'tournaments')
          const tournamentsSnapshot = await getDocs(tournamentsRef)
          
          for (const tournamentDoc of tournamentsSnapshot.docs) {
            try {
              const subcollectionRef = this.getTournamentMatchesCollection(tournamentDoc.id)
              const docRef = doc(subcollectionRef, matchId)
              const docSnap = await getDoc(docRef)
              
              if (docSnap.exists()) {
                console.log('✅ Found match in tournament:', tournamentDoc.id)
                existingMatch = { id: docSnap.id, ...docSnap.data() } as Match
                break
              }
            } catch (subError) {
              // Continue searching other tournaments
            }
          }
        } catch (searchError) {
          console.warn('Could not search tournaments:', searchError)
        }
        
        // Final fallback to root collection
        if (!existingMatch) {
          existingMatch = await this.getMatch(matchId)
        }
      }
      
      if (!existingMatch) {
        throw new Error('Match not found in any collection')
      }
      
      console.log('✅ Found match to update, tournament:', existingMatch.tournamentId)
      
      // Try to update in indexed location first (if we have tournament context)
      let updateSuccessful = false
      if (existingMatch.tournamentId) {
        try {
          const subcollectionRef = this.getTournamentMatchesCollection(existingMatch.tournamentId)
          const subcollectionDocRef = doc(subcollectionRef, matchId)
          
          return await runTransaction(this.db, async (transaction) => {
            const docSnap = await transaction.get(subcollectionDocRef)
            
            if (docSnap.exists()) {
              console.log('📝 Updating in tournament subcollection')
              return await this.performMatchUpdate(transaction, subcollectionDocRef, docSnap, updates, updatedBy, existingMatch)
            } else {
              throw new Error('Match not in subcollection')
            }
          })
        } catch (subError) {
          console.log('⚠️ Could not update in subcollection, trying root collection')
        }
      }
      
      // Fallback to root collection
      const docRef = doc(this.matchesCollection, matchId)
      
      return await runTransaction(this.db, async (transaction) => {
        const docSnap = await transaction.get(docRef)
        
        if (!docSnap.exists()) {
          throw new Error('Match not found in root collection either')
        }
        
        console.log('📝 Updating in root collection')
        return await this.performMatchUpdate(transaction, docRef, docSnap, updates, updatedBy, existingMatch)
      })
      
    } catch (error) {
      console.error('❌ Error updating match:', error)
      throw new Error(`Failed to update match: ${error}`)
    }
  }
  
  // Helper method to perform the actual update
  private async performMatchUpdate(
    transaction: any,
    docRef: any,
    docSnap: any,
    updates: MatchUpdateData,
    updatedBy: string,
    existingMatch: Match
  ): Promise<Match> {
    const beforeState = { id: docSnap.id, ...docSnap.data() } as Match

    
    // Convert Date objects to Timestamps
    const processedUpdates: any = { ...updates }
    if (updates.scheduledDateTime) {
      processedUpdates.scheduledDateTime = Timestamp.fromDate(updates.scheduledDateTime)
      processedUpdates.scheduledDate = Timestamp.fromDate(updates.scheduledDateTime)
    }
    if (updates.actualStartTime) {
      processedUpdates.actualStartTime = Timestamp.fromDate(updates.actualStartTime)
    }
    if (updates.actualEndTime) {
      processedUpdates.actualEndTime = Timestamp.fromDate(updates.actualEndTime)
    }

    const updateData = {
      ...processedUpdates,
      updatedAt: serverTimestamp()
    }

    transaction.update(docRef, updateData)
    
    const afterState = { ...beforeState, ...updateData } as Match
    const changedFields = Object.keys(updates)

    // Log the update
    try {
      await this.logMatchAudit({
        entityId: docSnap.id,
        action: 'update',
        actionBy: updatedBy,
        beforeState,
        afterState,
        changedFields,
        reason: 'Match updated',
        tournamentId: beforeState.tournamentId
      })
    } catch (auditError) {
      console.warn('⚠️ Could not log audit:', auditError)
    }

    console.log('✅ Match updated successfully')
    return afterState
  }

  // Submit match result
  async submitMatchResult(result: MatchResult): Promise<Match> {
    try {
      // First find the match in indexed locations
      const existingMatch = await this.getMatch(result.matchId)
      if (!existingMatch) {
        throw new Error('Match not found in any collection')
      }

      return await runTransaction(this.db, async (transaction) => {
        // Use the tournament-specific path if available
        let docRef: any
        if (existingMatch.tournamentId) {
          docRef = doc(this.db, 'tournaments', existingMatch.tournamentId, 'matches', result.matchId)
        } else {
          docRef = doc(this.matchesCollection, result.matchId)
        }
        
        const docSnap = await transaction.get(docRef)
        
        if (!docSnap.exists()) {
          throw new Error('Match not found in expected location')
        }

        const beforeState = { id: docSnap.id, ...docSnap.data() } as Match
        
        const updateData = {
          winnerId: result.winnerId,
          loserId: result.loserId,
          status: 'completed' as const,
          actualEndTime: Timestamp.fromDate(result.completedAt),
          resultSubmittedAt: serverTimestamp(),
          resultSubmittedBy: result.submittedBy,
          adminNotes: result.notes || beforeState.adminNotes,
          updatedAt: serverTimestamp()
        }

        // Update winner and loser names based on player IDs
        if (result.winnerId === beforeState.player1Id) {
          updateData.winnerName = beforeState.player1Name
          updateData.loserName = beforeState.player2Name
        } else {
          updateData.winnerName = beforeState.player2Name
          updateData.loserName = beforeState.player1Name
        }

        transaction.update(docRef, updateData)
        
        const afterState = { ...beforeState, ...updateData } as Match

        // Log the result submission
        await this.logMatchAudit({
          entityId: result.matchId,
          action: 'result_submit',
          actionBy: result.submittedBy,
          beforeState,
          afterState,
          changedFields: ['winnerId', 'loserId', 'status', 'actualEndTime', 'resultSubmittedAt', 'resultSubmittedBy'],
          reason: 'Match result submitted',
          tournamentId: beforeState.tournamentId
        })

        return afterState
      })
    } catch (error) {
      console.error('Error submitting match result:', error)
      throw new Error(`Failed to submit match result: ${error}`)
    }
  }

  // Get matches by tournament - now uses getAllIndexedMatches for comprehensive search
  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    try {
      // Use the comprehensive indexed match fetching
      return await this.getAllIndexedMatches(tournamentId)
    } catch (error) {
      console.error('Error getting tournament matches:', error)
      throw new Error(`Failed to get tournament matches: ${error}`)
    }
  }

  // Get matches by round - check both collections
  async getMatchesByRound(tournamentId: string, roundNumber: string): Promise<Match[]> {
    try {
      // Try 1: Check tournament subcollection first
      try {
        const subcollectionRef = this.getTournamentMatchesCollection(tournamentId)
        const q = query(
          subcollectionRef,
          where('roundNumber', '==', roundNumber),
          orderBy('matchNumber', 'asc')
        )
        const subcollectionSnapshot = await getDocs(q)
        
        if (!subcollectionSnapshot.empty) {
          return subcollectionSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Match[]
        }
      } catch (subError) {
        console.log('⚠️ Subcollection query failed:', subError)
      }
      
      // Try 2: Fall back to root collection
      const q = query(
        this.matchesCollection,
        where('tournamentId', '==', tournamentId),
        where('roundNumber', '==', roundNumber),
        orderBy('matchNumber', 'asc')
      )
      
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[]
    } catch (error) {
      console.error('Error getting round matches:', error)
      throw new Error(`Failed to get round matches: ${error}`)
    }
  }

  // Get ALL matches from ALL tournaments with tournament names
  async getAllMatchesWithTournamentNames(): Promise<(Match & { tournamentName?: string })[]> {
    console.log('🔍 Fetching ALL matches from ALL tournaments with names...')
    
    try {
      // Get all tournaments first to get names
      const tournamentsRef = collection(this.db, 'tournaments')
      const tournamentsSnapshot = await getDocs(tournamentsRef)
      const tournamentNames = new Map<string, string>()
      
      tournamentsSnapshot.docs.forEach(doc => {
        const tournamentData = doc.data()
        tournamentNames.set(doc.id, tournamentData.name || tournamentData.title || `Tournament ${doc.id}`)
      })
      
      console.log(`📋 Found ${tournamentNames.size} tournaments`)
      
      const allMatches: (Match & { tournamentName?: string })[] = []
      const matchIds = new Set<string>()
      
      // For each tournament, fetch all indexed matches
      for (const [tournamentId, tournamentName] of tournamentNames) {
        console.log(`🔍 Fetching matches for: ${tournamentName} (${tournamentId})`)
        
        try {
          // 1. Check tournament subcollection
          const subcollectionRef = this.getTournamentMatchesCollection(tournamentId)
          const subcollectionSnapshot = await getDocs(subcollectionRef)
          
          subcollectionSnapshot.docs.forEach(doc => {
            const matchId = `${tournamentId}_${doc.id}`
            if (!matchIds.has(matchId)) {
              matchIds.add(matchId)
              allMatches.push({
                id: doc.id,
                ...doc.data(),
                tournamentName
              } as Match & { tournamentName: string })
            }
          })
          
          if (subcollectionSnapshot.size > 0) {
            console.log(`  ✅ Found ${subcollectionSnapshot.size} matches in subcollection`)
          }
        } catch (subError) {
          console.log(`  ⚠️ No subcollection for ${tournamentName}`)
        }
      }
      
      // Also check other indexed collections
      await this.addMatchesFromIndexedCollections(allMatches, matchIds, tournamentNames)
      
      // Finally check root matches collection and add tournament names
      await this.addMatchesFromRootCollection(allMatches, matchIds, tournamentNames)
      
      console.log(`📊 Total matches found: ${allMatches.length}`)
      
      // Sort by tournament name, then match number
      return allMatches.sort((a, b) => {
        const tournamentCompare = (a.tournamentName || '').localeCompare(b.tournamentName || '')
        if (tournamentCompare !== 0) return tournamentCompare
        return (a.matchNumber || 0) - (b.matchNumber || 0)
      })
      
    } catch (error) {
      console.error('Error fetching all matches with tournament names:', error)
      throw new Error(`Failed to fetch all matches: ${error}`)
    }
  }
  
  // Helper: Add matches from indexed collections
  private async addMatchesFromIndexedCollections(
    allMatches: (Match & { tournamentName?: string })[], 
    matchIds: Set<string>,
    tournamentNames: Map<string, string>
  ): Promise<void> {
    // Check tournament_matches collection
    try {
      const tournamentMatchesRef = collection(this.db, 'tournament_matches')
      const snapshot = await getDocs(tournamentMatchesRef)
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const matchId = `${data.tournamentId}_${doc.id}`
        if (!matchIds.has(matchId)) {
          matchIds.add(matchId)
          allMatches.push({
            id: doc.id,
            ...data,
            tournamentName: tournamentNames.get(data.tournamentId) || `Tournament ${data.tournamentId}`
          } as Match & { tournamentName: string })
        }
      })
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} matches in tournament_matches collection`)
      }
    } catch (error) {
      console.log('⚠️ No tournament_matches collection')
    }
    
    // Check indexed_matches collection
    try {
      const indexedMatchesRef = collection(this.db, 'indexed_matches')
      const snapshot = await getDocs(indexedMatchesRef)
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const matchId = `${data.tournamentId}_${doc.id}`
        if (!matchIds.has(matchId)) {
          matchIds.add(matchId)
          allMatches.push({
            id: doc.id,
            ...data,
            tournamentName: tournamentNames.get(data.tournamentId) || `Tournament ${data.tournamentId}`
          } as Match & { tournamentName: string })
        }
      })
      
      if (!snapshot.empty) {
        console.log(`✅ Found ${snapshot.size} matches in indexed_matches collection`)
      }
    } catch (error) {
      console.log('⚠️ No indexed_matches collection')
    }
  }
  
  // Helper: Add matches from root collection with tournament names
  private async addMatchesFromRootCollection(
    allMatches: (Match & { tournamentName?: string })[], 
    matchIds: Set<string>,
    tournamentNames: Map<string, string>
  ): Promise<void> {
    try {
      const rootSnapshot = await getDocs(this.matchesCollection)
      
      rootSnapshot.docs.forEach(doc => {
        const data = doc.data()
        const matchId = `${data.tournamentId}_${doc.id}`
        if (!matchIds.has(matchId)) {
          matchIds.add(matchId)
          allMatches.push({
            id: doc.id,
            ...data,
            tournamentName: tournamentNames.get(data.tournamentId) || `Tournament ${data.tournamentId}`
          } as Match & { tournamentName: string })
        }
      })
      
      if (!rootSnapshot.empty) {
        console.log(`✅ Found ${rootSnapshot.size} matches in root collection`)
      }
    } catch (error) {
      console.log('⚠️ Error accessing root matches collection:', error)
    }
  }

  // Search matches with filters - check indexed locations first
  async searchMatches(params: MatchSearchParams): Promise<{ matches: Match[], total: number, hasMore: boolean }> {
    try {
      // If searching by tournamentId, try indexed location first
      if (params.filters?.tournamentId) {
        console.log('🔍 Searching indexed matches for tournament:', params.filters.tournamentId)
        
        try {
          const subcollectionRef = this.getTournamentMatchesCollection(params.filters.tournamentId)
          let q = query(subcollectionRef)
          
          // Apply other filters to subcollection query
          const filters = params.filters
          if (filters.status) q = query(q, where('status', '==', filters.status))
          if (filters.matchType) q = query(q, where('matchType', '==', filters.matchType))
          if (filters.roundNumber) q = query(q, where('roundNumber', '==', filters.roundNumber))
          if (filters.communityId) q = query(q, where('communityId', '==', filters.communityId))
          if (filters.playerId) q = query(q, where('player1Id', '==', filters.playerId))
          
          // Apply sorting
          const sortBy = params.sortBy || 'createdAt'
          const sortOrder = params.sortOrder || 'desc'
          q = query(q, orderBy(sortBy, sortOrder))
          
          // Apply pagination
          const limitCount = params.limit || 50
          q = query(q, limit(limitCount + 1))
          
          const querySnapshot = await getDocs(q)
          
          if (!querySnapshot.empty) {
            console.log('✅ Found', querySnapshot.size, 'matches in indexed location')
            const docs = querySnapshot.docs
            const hasMore = docs.length > limitCount
            const matches = docs.slice(0, limitCount).map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Match[]
            
            return {
              matches,
              total: matches.length,
              hasMore
            }
          }
        } catch (subError) {
          console.log('⚠️ Indexed search failed, falling back to root collection:', subError)
        }
      }
      
      // Fallback to root collection search
      console.log('🔍 Searching root matches collection')
      let q = query(this.matchesCollection)

      // Apply filters
      if (params.filters) {
        const filters = params.filters
        
        if (filters.tournamentId) {
          q = query(q, where('tournamentId', '==', filters.tournamentId))
        }
        if (filters.tournamentLevel) {
          q = query(q, where('tournamentLevel', '==', filters.tournamentLevel))
        }
        if (filters.status) {
          q = query(q, where('status', '==', filters.status))
        }
        if (filters.matchType) {
          q = query(q, where('matchType', '==', filters.matchType))
        }
        if (filters.roundNumber) {
          q = query(q, where('roundNumber', '==', filters.roundNumber))
        }
        if (filters.communityId) {
          q = query(q, where('communityId', '==', filters.communityId))
        }
        if (filters.countyId) {
          q = query(q, where('countyId', '==', filters.countyId))
        }
        if (filters.regionId) {
          q = query(q, where('regionId', '==', filters.regionId))
        }
        if (filters.playerId) {
          q = query(q, where('player1Id', '==', filters.playerId))
          // Note: For player2Id, we'd need a separate query and merge results
        }
        if (filters.venueId) {
          q = query(q, where('venueId', '==', filters.venueId))
        }
        if (filters.isLevelFinal !== undefined) {
          q = query(q, where('isLevelFinal', '==', filters.isLevelFinal))
        }
        if (filters.determinesTop3 !== undefined) {
          q = query(q, where('determinesTop3', '==', filters.determinesTop3))
        }
      }

      // Apply sorting
      const sortBy = params.sortBy || 'createdAt'
      const sortOrder = params.sortOrder || 'desc'
      q = query(q, orderBy(sortBy, sortOrder))

      // Apply pagination
      const limitCount = params.limit || 50
      q = query(q, limit(limitCount + 1)) // Get one extra to check if there are more

      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs
      
      const hasMore = docs.length > limitCount
      const matches = docs.slice(0, limitCount).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Match[]

      return {
        matches,
        total: matches.length, // This is a simplified total, real implementation might need a count query
        hasMore
      }
    } catch (error) {
      console.error('Error searching matches:', error)
      throw new Error(`Failed to search matches: ${error}`)
    }
  }

  // Create multiple matches in batch
  async createMatchesBatch(matchesData: MatchCreationData[], createdBy: string): Promise<Match[]> {
    try {
      console.log('💾 Creating batch of', matchesData.length, 'matches for user:', createdBy)
      
      // Validate input
      if (!matchesData || matchesData.length === 0) {
        throw new Error('No match data provided')
      }
      
      if (!createdBy || createdBy === 'current_user') {
        throw new Error('Invalid user ID for match creation')
      }

      const batch = writeBatch(this.db)
      const createdMatches: Match[] = []

      for (let i = 0; i < matchesData.length; i++) {
        const data = matchesData[i]
        console.log(`💾 Processing match ${i + 1}:`, {
          player1: data.player1Name,
          player2: data.player2Name,
          round: data.roundNumber
        })
        
        // Validate required fields
        if (!data.tournamentId) {
          throw new Error(`Match ${i + 1}: Missing tournamentId`)
        }
        if (!data.player1Id || !data.player1Name) {
          throw new Error(`Match ${i + 1}: Missing player1 data`)
        }
        
        const searchableText = this.generateSearchableText(data)
        const docRef = doc(this.matchesCollection)
        
        const matchData: Omit<Match, 'id'> = {
          ...data,
          player2Id: data.player2Id || null,
          player2Name: data.player2Name || null,
          player2Points: data.player2Points || null,
          player2CommunityId: data.player2CommunityId || null,
          countyId: data.countyId || null,
          regionId: data.regionId || null,
          winnerId: null,
          winnerName: null,
          loserId: null,
          loserName: null,
          scheduledDate: data.scheduledDateTime ? Timestamp.fromDate(data.scheduledDateTime) : null,
          scheduledDateTime: data.scheduledDateTime ? Timestamp.fromDate(data.scheduledDateTime) : null,
          actualStartTime: null,
          actualEndTime: null,
          venueId: data.venueId || null,
          venueName: data.venueName || null,
          venueAddress: data.venueAddress || null,
          tableNumber: data.tableNumber || null,
          status: 'pending',
          determinesTop3: data.determinesTop3 || false,
          isLevelFinal: data.isLevelFinal || false,
          isByeMatch: data.isByeMatch || false,
          positionBasedMatching: data.positionBasedMatching || false,
          positioningRound: data.positioningRound || null,
          positioningStage: data.positioningStage || null,
          geographicalSeparation: data.geographicalSeparation || false,
          maximumBreaks: data.maximumBreaks || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy,
          resultSubmittedAt: null,
          resultSubmittedBy: null,
          adminNotes: data.adminNotes || null,
          disputeReason: null,
          timeZone: data.timeZone || 'Africa/Nairobi',
          searchableText
        }

        batch.set(docRef, matchData)
        createdMatches.push({ id: docRef.id, ...matchData } as Match)
      }

      console.log('💾 Committing batch write...')
      await batch.commit()
      console.log('✅ Batch write committed successfully')

      // Log batch creation
      await this.logMatchAudit({
        entityId: 'batch',
        action: 'create',
        actionBy: createdBy,
        beforeState: null,
        afterState: { count: createdMatches.length },
        changedFields: ['batch_create'],
        reason: `Batch created ${createdMatches.length} matches via algorithm`,
        tournamentId: matchesData[0]?.tournamentId || 'unknown'
      })

      console.log('✅ Successfully created', createdMatches.length, 'matches')
      return createdMatches
    } catch (error) {
      console.error('❌ Error creating matches batch:', error)
      throw new Error(`Failed to create matches batch: ${error}`)
    }
  }

  // Delete match
  async deleteMatch(matchId: string, deletedBy: string): Promise<void> {
    try {
      const docRef = doc(this.matchesCollection, matchId)
      
      await runTransaction(this.db, async (transaction) => {
        const docSnap = await transaction.get(docRef)
        
        if (!docSnap.exists()) {
          throw new Error('Match not found')
        }

        const beforeState = { id: docSnap.id, ...docSnap.data() } as Match
        
        transaction.delete(docRef)

        // Log the deletion
        await this.logMatchAudit({
          entityId: matchId,
          action: 'delete',
          actionBy: deletedBy,
          beforeState,
          afterState: null,
          changedFields: ['deleted'],
          reason: 'Match deleted',
          tournamentId: beforeState.tournamentId
        })
      })
    } catch (error) {
      console.error('Error deleting match:', error)
      throw new Error(`Failed to delete match: ${error}`)
    }
  }

  // Helper method to generate searchable text
  private generateSearchableText(data: MatchCreationData): string {
    const parts = [
      data.player1Name,
      data.player2Name,
      data.tournamentId,
      data.communityId,
      data.tournamentLevel,
      data.roundNumber,
      data.matchType
    ].filter(Boolean)

    return parts.join(' ').toLowerCase()
  }

  // Live Match Methods
  async makeMatchLive(matchId: string, userId: string): Promise<void> {
    try {
      const updateData: Partial<MatchUpdateData> = {
        status: 'in_progress',
        actualStartTime: new Date()
      }

      await this.updateMatch(matchId, updateData, userId)

      await this.logMatchAudit({
        entityId: matchId,
        action: 'live_start',
        actionBy: userId,
        beforeState: { status: 'scheduled' },
        afterState: { status: 'in_progress' },
        changedFields: ['status', 'actualStartTime'],
        reason: 'Match made live for scoring',
        tournamentId: 'unknown' // Would need to be passed or fetched
      })
    } catch (error) {
      console.error('Error making match live:', error)
      throw error
    }
  }

  async completeMatch(matchId: string, winnerId: string, userId: string): Promise<void> {
    try {
      // Get current match to determine loser
      const match = await this.getMatch(matchId)
      if (!match) throw new Error('Match not found')

      const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id
      const winnerName = winnerId === match.player1Id ? match.player1Name : match.player2Name
      const loserName = winnerId === match.player1Id ? match.player2Name : match.player1Name

      const updateData: Partial<MatchUpdateData> = {
        status: 'completed',
        winnerId,
        winnerName,
        loserId,
        loserName,
        actualEndTime: new Date(),
        resultSubmittedAt: new Date(),
        resultSubmittedBy: userId
      }

      await this.updateMatch(matchId, updateData, userId)

      await this.logMatchAudit({
        entityId: matchId,
        action: 'live_complete',
        actionBy: userId,
        beforeState: { status: 'in_progress' },
        afterState: { 
          status: 'completed',
          winnerId,
          winnerName,
          loserId,
          loserName
        },
        changedFields: ['status', 'winnerId', 'winnerName', 'loserId', 'loserName', 'actualEndTime'],
        reason: 'Match completed via live scoring',
        tournamentId: match.tournamentId
      })
    } catch (error) {
      console.error('Error completing match:', error)
      throw error
    }
  }

  // Helper method to log match audit
  private async logMatchAudit(auditData: {
    entityId: string
    action: string
    actionBy: string
    beforeState: any
    afterState: any
    changedFields: string[]
    reason: string
    tournamentId: string
  }): Promise<void> {
    try {
      const auditLog: Omit<MatchAuditLog, 'id'> = {
        entityType: 'match',
        entityId: auditData.entityId,
        action: auditData.action as any,
        actionBy: auditData.actionBy,
        actionByRole: 'admin', // This should be determined based on the user's role
        beforeState: auditData.beforeState,
        afterState: auditData.afterState,
        changedFields: auditData.changedFields,
        reason: auditData.reason,
        category: 'competition',
        severity: 'info',
        timestamp: serverTimestamp(),
        tournamentId: auditData.tournamentId,
        sessionId: 'session_001', // This should be the actual session ID
        ipAddress: '0.0.0.0', // This should be the actual IP address
        userAgent: navigator.userAgent,
        tags: ['match_management']
      }

      await addDoc(this.auditCollection, auditLog)
    } catch (error) {
      console.error('Error logging match audit:', error)
      // Don't throw here as audit logging shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const matchService = new MatchService()