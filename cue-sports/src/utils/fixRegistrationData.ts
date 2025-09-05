import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'

/**
 * Fix tournament registrations by adding missing community information
 * This is a utility function to patch existing data
 */
export async function fixTournamentRegistrations(tournamentId: string, communityId: string, communityName: string) {
  const db = getFirebaseDb()
  
  try {
    // Get all registrations for this tournament
    const registrationsRef = collection(db, 'tournament_registrations')
    const q = query(registrationsRef, where('tournamentId', '==', tournamentId))
    const snapshot = await getDocs(q)
    
    let updated = 0
    const updates: Promise<void>[] = []
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      
      // Only update if missing community information
      if (!data.communityId || data.communityId === '') {
        const updatePromise = updateDoc(doc(db, 'tournament_registrations', docSnap.id), {
          communityId: communityId,
          communityName: communityName
        })
        updates.push(updatePromise)
        updated++
      }
    })
    
    // Execute all updates
    await Promise.all(updates)
    
    console.log(`✅ Updated ${updated} registrations with community information`)
    return { success: true, updated }
    
  } catch (error) {
    console.error('❌ Error fixing registrations:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Infer community ID from player ID if it follows the pattern
 * user_comm_COUNTY_COMMUNITY_XXX_timestamp_random
 */
export function inferCommunityFromPlayerId(playerId: string): { communityId: string | null, communityName: string | null } {
  // Check if player ID follows the expected pattern
  if (playerId.startsWith('user_comm_')) {
    const parts = playerId.split('_')
    if (parts.length >= 5) {
      // Extract county and community parts
      const county = parts[2] // e.g., "bungoma"
      const community = parts[3] // e.g., "kimilili"
      const subId = parts[4] // e.g., "003"
      
      const communityId = `COMM_${county.toUpperCase()}_${community.toUpperCase()}_${subId}`
      const communityName = `${community.charAt(0).toUpperCase() + community.slice(1)} ${subId}`
      
      return { communityId, communityName }
    }
  }
  
  return { communityId: null, communityName: null }
}

/**
 * Auto-fix registrations by inferring community from player IDs
 */
export async function autoFixRegistrationsCommunity(tournamentId: string) {
  const db = getFirebaseDb()
  
  try {
    // Get all registrations for this tournament
    const registrationsRef = collection(db, 'tournament_registrations')
    const q = query(registrationsRef, where('tournamentId', '==', tournamentId))
    const snapshot = await getDocs(q)
    
    let updated = 0
    const updates: Promise<void>[] = []
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      
      // Only update if missing community information
      if (!data.communityId || data.communityId === '') {
        const { communityId, communityName } = inferCommunityFromPlayerId(data.playerId)
        
        if (communityId && communityName) {
          const updatePromise = updateDoc(doc(db, 'tournament_registrations', docSnap.id), {
            communityId: communityId,
            communityName: communityName
          })
          updates.push(updatePromise)
          updated++
          console.log(`🔧 Fixing ${data.playerName}: ${communityId}`)
        }
      }
    })
    
    // Execute all updates
    await Promise.all(updates)
    
    console.log(`✅ Auto-fixed ${updated} registrations with inferred community information`)
    return { success: true, updated }
    
  } catch (error) {
    console.error('❌ Error auto-fixing registrations:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}