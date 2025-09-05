import type { Timestamp } from 'firebase/firestore'

export interface Community {
  id: string
  name: string
  description: string
  initials: string
  location: string
  county: string
  logoUrl: string | null
  
  // Admin management (max 2)
  adminIds?: string[]
  adminUserId?: string
  
  // Member management
  members_id?: string[]
  memberCount?: number
  
  // Followers
  followers?: string[]
  followerCount?: number
  
  // Activity tracking
  createdAt: string | Timestamp
  lastActivityAt: string | Timestamp
  
  // Tags for categorization
  tags?: string[]
}

export interface CreateCommunityData {
  name: string
  description: string
  initials: string
  location: string
  county: string
  logoUrl?: string | null
  tags?: string[]
}

export interface UpdateCommunityData {
  name?: string
  description?: string
  initials?: string
  location?: string
  county?: string
  logoUrl?: string | null
  tags?: string[]
}

export interface CommunityAdmin {
  userId: string
  displayName: string
  email: string
  assignedAt: Date
  assignedBy: string
}

export interface CommunityMember {
  userId: string
  displayName: string
  email: string
  joinedAt: Date
  role: 'member' | 'admin'
}

export interface CommunityStats {
  totalMembers: number
  totalAdmins: number
  totalFollowers: number
  recentActivity: Date | null
}

export interface CommunityFilters {
  county?: string
  location?: string
  tags?: string[]
  hasActiveAdmins?: boolean
  memberCountRange?: {
    min: number
    max: number
  }
}