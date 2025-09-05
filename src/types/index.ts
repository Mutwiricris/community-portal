export interface User {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  userType: 'community_leader' | 'member'
  bio?: string
  createdAt: Date
  updatedAt: Date
}

export interface Community {
  id: string
  name: string
  description: string
  leaderId: string
  leaderName: string
  memberCount: number
  createdAt: Date
  updatedAt: Date
  location?: string
  county?: string
  tags?: string[]
  initials?: string
  logoUrl?: string | null
  followerCount?: number
  membersIds?: string[]
  // Tournament-related fields
  activeTournaments?: number
  totalTournaments?: number
  completedMatches?: number
  pendingMatches?: number
  lastTournamentActivity?: Date
}

export interface Player {
  uid: string
  email: string
  displayName: string
  fullName?: string
  phoneNumber?: string
  userType: 'player'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Member {
  id: string
  uid: string
  email: string
  displayName: string | null
  name: string // Added for compatibility with MemberManager component
  photoURL: string | null
  communityId: string
  role: 'member' | 'moderator'
  joinedAt: Date
  status: 'active' | 'inactive' | 'pending'
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface CommunityState {
  activeCommunity: Community | null
  communities: Community[]
  members: Member[]
  isLoading: boolean
}

// Tournament-related types
export interface Tournament {
  id: string
  name: string
  description: string
  communityId: string
  communityName: string
  level: 'community' | 'county' | 'regional' | 'national'
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  currentRound: string
  totalRounds: number
  startDate: Date
  endDate?: Date
  maxParticipants: number
  registeredParticipants: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Match {
  id: string
  tournamentId: string
  tournamentName: string
  communityId: string
  roundNumber: string
  matchNumber: number
  matchType: 'regular' | 'semi_final' | 'final' | 'community_final'
  player1Id: string
  player1Name: string
  player1Points?: number
  player1Score?: string
  player2Id: string
  player2Name: string
  player2Points?: number
  player2Score?: string
  winnerId?: string
  loserId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'disputed'
  scheduledDateTime?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface TournamentPlayer extends Player {
  tournamentId: string
  registrationDate: Date
  currentRound?: string
  isEliminated: boolean
  finalPosition?: number
  performanceStats: {
    matchesPlayed: number
    matchesWon: number
    matchesLost: number
    winRate: number
    averageScore: number
  }
}

export interface CommunityStats {
  communityId: string
  totalTournaments: number
  activeTournaments: number
  completedTournaments: number
  totalMatches: number
  completedMatches: number
  pendingMatches: number
  totalPlayers: number
  activePlayers: number
  tournamentCompletionRate: number
  averageMatchDuration: number
  playerParticipationRate: number
  lastUpdated: Date
}

export interface TournamentOverview {
  tournament: Tournament
  roundProgress: {
    current: number
    total: number
    percentage: number
  }
  matchesStatus: {
    total: number
    completed: number
    pending: number
    inProgress: number
  }
  canAdvanceRound: boolean
  canFinalize: boolean
  nextRoundReady: boolean
}

export interface DashboardData {
  communityStats: CommunityStats
  tournaments: TournamentOverview[]
  recentMatches: Match[]
  topPlayers: TournamentPlayer[]
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'match_completed' | 'tournament_started' | 'player_registered' | 'round_advanced'
  title: string
  description: string
  timestamp: Date
  relatedId: string
  communityId: string
}
