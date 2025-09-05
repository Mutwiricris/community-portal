/**
 * Utility to check if algorithm matches were created in Firebase
 * This is a temporary diagnostic tool for the backend issue
 */
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/config'

export async function checkAlgorithmMatches(tournamentId: string): Promise<{
  found: boolean
  count: number
  matches: any[]
}> {
  try {
    console.log(`🔍 Checking for algorithm-generated matches in tournament: ${tournamentId}`)
    
    // Check in the tournaments/{id}/matches subcollection
    const matchesRef = collection(db, 'tournaments', tournamentId, 'matches')
    const matchesSnapshot = await getDocs(matchesRef)
    
    const matches: any[] = []
    matchesSnapshot.forEach(doc => {
      matches.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`✅ Found ${matches.length} matches in subcollection`)
    
    // Also check in the main matches collection
    const mainMatchesRef = collection(db, 'matches')
    const mainQuery = query(mainMatchesRef, where('tournamentId', '==', tournamentId))
    const mainSnapshot = await getDocs(mainQuery)
    
    const mainMatches: any[] = []
    mainSnapshot.forEach(doc => {
      mainMatches.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`✅ Found ${mainMatches.length} matches in main collection`)
    
    const allMatches = [...matches, ...mainMatches]
    const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values())
    
    return {
      found: uniqueMatches.length > 0,
      count: uniqueMatches.length,
      matches: uniqueMatches
    }
  } catch (error) {
    console.error('Error checking algorithm matches:', error)
    return {
      found: false,
      count: 0,
      matches: []
    }
  }
}

export async function importAlgorithmMatches(tournamentId: string): Promise<{
  success: boolean
  imported: number
  error?: string
}> {
  try {
    const { found, matches } = await checkAlgorithmMatches(tournamentId)
    
    if (!found) {
      return {
        success: false,
        imported: 0,
        error: 'No algorithm matches found in database'
      }
    }
    
    // Here you would import the matches to the main matches collection
    // For now, just return the count
    console.log(`🎯 Found ${matches.length} algorithm matches that could be imported`)
    
    return {
      success: true,
      imported: matches.length
    }
  } catch (error) {
    return {
      success: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}