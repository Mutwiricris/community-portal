import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  orderBy 
} from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyChB7pS2BoG2f_OLkMnSMUYBNRAtffLJBY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "poolbilliard-167ad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "poolbilliard-167ad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "poolbilliard-167ad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "754521057099",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:754521057099:web:28cb929e680cfe8721eace",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-37V5HLC67R"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Types based on your Firestore structure
export interface FirestoreCommunity {
  id: string
  name: string
  description: string
  location: string
  county: string
  adminIds: string[]
  adminUserId: string
  memberCount: number
  followerCount: number
  followers: string[]
  members_id: string[]
  tags: string[]
  initials: string
  logoUrl: string | null
  createdAt: string
  lastActivityAt: string
}

export interface FirestoreCommunityLeader {
  uid: string
  email: string
  displayName: string
  fullName: string
  phoneNumber: string
  userType: 'community_leader'
  role: 'admin'
  communityId: string
  communityName: string
  countyId: string
  regionId: string
  isActive: boolean
  geographicalContext: {
    assignedAt: any // Firestore Timestamp
    assignmentMethod: string
    community: {
      id: string
      name: string
    }
    county: {
      id: string
      name: string | null
    }
    region: {
      id: string
    }
  }
  createdAt: number
  updatedAt: any // Firestore Timestamp
}

export interface FirestorePlayer {
  uid: string
  email: string
  displayName: string
  fullName?: string
  phoneNumber?: string
  userType: 'player'
  isActive: boolean
  createdAt: number
  updatedAt: any // Firestore Timestamp
}

export class FirebaseCommunityService {
  /**
   * Fetch communities for the logged-in community leader
   * @param userId - The UID of the logged-in user
   * @returns Promise with communities array
   */
  static async fetchCommunitiesForLeader(userId: string): Promise<FirestoreCommunity[]> {
    try {
      // First, get the community leader document to find their assigned communities
      const leaderQuery = query(
        collection(db, 'users'), // Assuming community leaders are in 'users' collection
        where('uid', '==', userId),
        where('userType', '==', 'community_leader'),
        where('isActive', '==', true)
      )
      
      const leaderSnapshot = await getDocs(leaderQuery)
      
      if (leaderSnapshot.empty) {
        console.log('No community leader found for user:', userId)
        return []
      }

      const leaderDoc = leaderSnapshot.docs[0].data() as FirestoreCommunityLeader
      const communityIds = [leaderDoc.communityId] // Primary community

      // Also check if the user is an admin in other communities
      const communitiesQuery = query(
        collection(db, 'communities'),
        where('adminIds', 'array-contains', userId)
      )
      
      const communitiesSnapshot = await getDocs(communitiesQuery)
      const communities: FirestoreCommunity[] = []

      for (const docSnapshot of communitiesSnapshot.docs) {
        const communityData = docSnapshot.data() as FirestoreCommunity
        communities.push({
          ...communityData,
          id: docSnapshot.id
        })
      }

      // Sort communities by last activity (most recent first)
      communities.sort((a, b) => 
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      )

      return communities
    } catch (error) {
      console.error('Error fetching communities for leader:', error)
      throw error
    }
  }

  /**
   * Fetch a specific community by ID
   * @param communityId - The ID of the community
   * @returns Promise with community data
   */
  static async fetchCommunityById(communityId: string): Promise<FirestoreCommunity | null> {
    try {
      const communityDoc = await getDoc(doc(db, 'communities', communityId))
      
      if (!communityDoc.exists()) {
        return null
      }

      return {
        ...communityDoc.data() as FirestoreCommunity,
        id: communityDoc.id
      }
    } catch (error) {
      console.error('Error fetching community:', error)
      throw error
    }
  }

  /**
   * Check if user is a community leader and get their role
   * @param userId - The UID of the user
   * @returns Promise with leader data or null
   */
  static async getCommunityLeaderInfo(userId: string): Promise<FirestoreCommunityLeader | null> {
    try {
      const leaderQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        where('userType', '==', 'community_leader')
      )
      
      const leaderSnapshot = await getDocs(leaderQuery)
      
      if (leaderSnapshot.empty) {
        return null
      }

      return leaderSnapshot.docs[0].data() as FirestoreCommunityLeader
    } catch (error) {
      console.error('Error fetching community leader info:', error)
      throw error
    }
  }

  /**
   * Get communities by county for regional leaders
   * @param countyId - The county ID
   * @returns Promise with communities array
   */
  static async fetchCommunitiesByCounty(countyId: string): Promise<FirestoreCommunity[]> {
    try {
      const communitiesQuery = query(
        collection(db, 'communities'),
        where('county', '==', countyId.replace('COUNTY_', '')), // Remove COUNTY_ prefix if present
        orderBy('lastActivityAt', 'desc')
      )
      
      const communitiesSnapshot = await getDocs(communitiesQuery)
      const communities: FirestoreCommunity[] = []

      communitiesSnapshot.docs.forEach(docSnapshot => {
        communities.push({
          ...docSnapshot.data() as FirestoreCommunity,
          id: docSnapshot.id
        })
      })

      return communities
    } catch (error) {
      console.error('Error fetching communities by county:', error)
      throw error
    }
  }

  /**
   * Get community statistics for a leader
   * @param userId - The UID of the community leader
   * @returns Promise with stats object
   */
  static async getCommunityStats(userId: string) {
    try {
      const communities = await this.fetchCommunitiesForLeader(userId)
      
      const totalCommunities = communities.length
      const totalMembers = communities.reduce((sum, community) => sum + community.memberCount, 0)
      const totalFollowers = communities.reduce((sum, community) => sum + community.followerCount, 0)
      
      // Get most active community
      const activeCommunity = communities.length > 0 ? communities[0] : null

      return {
        totalCommunities,
        totalMembers,
        totalFollowers,
        activeCommunity,
        activeCommunityMembers: activeCommunity?.memberCount || 0,
        communities
      }
    } catch (error) {
      console.error('Error getting community stats:', error)
      throw error
    }
  }

  /**
   * Fetch all players (users with userType 'player')
   * @returns Promise with players array
   */
  static async fetchAllPlayers(): Promise<FirestorePlayer[]> {
    try {
      const playersQuery = query(
        collection(db, 'users'),
        where('userType', '==', 'player'),
        where('isActive', '==', true)
      )
      
      const playersSnapshot = await getDocs(playersQuery)
      const players: FirestorePlayer[] = []

      playersSnapshot.docs.forEach(docSnapshot => {
        players.push({
          ...docSnapshot.data() as FirestorePlayer,
          uid: docSnapshot.id
        })
      })

      return players
    } catch (error) {
      console.error('Error fetching players:', error)
      throw error
    }
  }

  /**
   * Fetch members of a specific community
   * @param communityId - The ID of the community
   * @returns Promise with community members array
   */
  static async fetchCommunityMembers(communityId: string): Promise<FirestorePlayer[]> {
    try {
      // First get the community to get the members_id array
      const communityDoc = await getDoc(doc(db, 'communities', communityId))
      
      if (!communityDoc.exists()) {
        throw new Error('Community not found')
      }

      const communityData = communityDoc.data() as FirestoreCommunity
      const memberIds = communityData.members_id || []

      if (memberIds.length === 0) {
        return []
      }

      // Fetch the player details for each member ID
      const members: FirestorePlayer[] = []
      
      // Firebase 'in' queries are limited to 10 items, so we might need to batch
      const batchSize = 10
      for (let i = 0; i < memberIds.length; i += batchSize) {
        const batchIds = memberIds.slice(i, i + batchSize)
        
        const membersQuery = query(
          collection(db, 'users'),
          where('uid', 'in', batchIds),
          where('userType', '==', 'player')
        )
        
        const membersSnapshot = await getDocs(membersQuery)
        
        membersSnapshot.docs.forEach(docSnapshot => {
          members.push({
            ...docSnapshot.data() as FirestorePlayer,
            uid: docSnapshot.id
          })
        })
      }

      return members
    } catch (error) {
      console.error('Error fetching community members:', error)
      throw error
    }
  }

  /**
   * Add a player to a community
   * @param communityId - The ID of the community
   * @param playerUid - The UID of the player to add
   * @returns Promise with success status
   */
  static async addMemberToCommunity(communityId: string, playerUid: string): Promise<void> {
    try {
      const communityRef = doc(db, 'communities', communityId)
      
      // Add the player's UID to the members_id array
      await updateDoc(communityRef, {
        members_id: arrayUnion(playerUid),
        memberCount: await this.calculateMemberCount(communityId) + 1
      })
    } catch (error) {
      console.error('Error adding member to community:', error)
      throw error
    }
  }

  /**
   * Remove a player from a community
   * @param communityId - The ID of the community
   * @param playerUid - The UID of the player to remove
   * @returns Promise with success status
   */
  static async removeMemberFromCommunity(communityId: string, playerUid: string): Promise<void> {
    try {
      const communityRef = doc(db, 'communities', communityId)
      
      // Remove the player's UID from the members_id array
      await updateDoc(communityRef, {
        members_id: arrayRemove(playerUid),
        memberCount: Math.max(0, await this.calculateMemberCount(communityId) - 1)
      })
    } catch (error) {
      console.error('Error removing member from community:', error)
      throw error
    }
  }

  /**
   * Calculate the current member count for a community
   * @param communityId - The ID of the community
   * @returns Promise with member count
   */
  private static async calculateMemberCount(communityId: string): Promise<number> {
    try {
      const communityDoc = await getDoc(doc(db, 'communities', communityId))
      
      if (!communityDoc.exists()) {
        return 0
      }

      const communityData = communityDoc.data() as FirestoreCommunity
      return (communityData.members_id || []).length
    } catch (error) {
      console.error('Error calculating member count:', error)
      return 0
    }
  }

  /**
   * Check if a player is a member of a community
   * @param communityId - The ID of the community
   * @param playerUid - The UID of the player
   * @returns Promise with boolean result
   */
  static async isPlayerMemberOfCommunity(communityId: string, playerUid: string): Promise<boolean> {
    try {
      const communityDoc = await getDoc(doc(db, 'communities', communityId))
      
      if (!communityDoc.exists()) {
        return false
      }

      const communityData = communityDoc.data() as FirestoreCommunity
      return (communityData.members_id || []).includes(playerUid)
    } catch (error) {
      console.error('Error checking player membership:', error)
      return false
    }
  }
}