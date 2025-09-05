import type { Timestamp } from 'firebase/firestore'

// Updated: 2025-01-02 17:36 - Force module refresh
export interface Tournament {
  id: string
  name: string
  description: string
  type: 'community' | 'county' | 'regional' | 'national'
  status: 'upcoming' | 'registration_open' | 'registration_closed' | 'ongoing' | 'completed' | 'cancelled'
  
  // Tournament hierarchy and qualification
  hierarchicalLevel: 'community' | 'county' | 'regional' | 'national'
  isQualificationTournament: boolean
  isNationalTournament: boolean
  isFeatured: boolean
  competitionLevel: string
  tournamentSeries?: string
  
  // Dates and timing
  startDate: string | Timestamp
  endDate: string | Timestamp
  registrationStartDate: string | Timestamp
  registrationEndDate: string | Timestamp
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
  estimatedDuration: string
  
  // Location and venue
  location: string
  venue: string
  geographicalScope: {
    communityId?: string
    communityName?: string
    countyId?: string
    countyName?: string
    regionId?: string
    regionName?: string
  }
  
  // Registration and participation
  maxPlayers: number
  expectedParticipants: number
  currentRegistrations: number
  registeredPlayerIds: string[]
  registeredPlayersIds?: string[] // For algorithm compatibility
  invitedPlayerIds: string[] | null
  allowedCommunityIds: string[]
  
  // Registration criteria and requirements
  registrationCriteria: 'open_registration' | 'communityOnly' | 'countyOnly' | 'regionalOnly' | 'inviteOnly'
  qualificationRequirement: 'open_registration' | 'qualification_required' | 'invite_only'
  
  // Qualification and progression
  progressionEnabled: boolean
  qualificationCriteria?: string
  qualifiesPlayerCount?: number
  qualifiedPlayersList: string[]
  nextLevelTournamentId?: string | null
  parentTournamentIds: string[]
  childTournamentIds: string[]
  
  // Financial
  entryFee: number
  currency: string
  prizePool: number
  
  // Media and branding
  bannerImage?: string
  
  // Administrative
  createdBy: string
}

export interface CreateTournamentData {
  name: string
  description: string
  type: Tournament['type']
  hierarchicalLevel: Tournament['hierarchicalLevel']
  competitionLevel: string
  
  // Dates
  startDate: Date
  endDate: Date
  registrationStartDate: Date
  registrationEndDate: Date
  estimatedDuration: string
  
  // Location
  location: string
  venue: string
  geographicalScope: Tournament['geographicalScope']
  
  // Participation
  maxPlayers: number
  expectedParticipants: number
  allowedCommunityIds: string[]
  
  // Registration
  registrationCriteria: Tournament['registrationCriteria']
  qualificationRequirement: Tournament['qualificationRequirement']
  
  // Qualification
  isQualificationTournament: boolean
  progressionEnabled: boolean
  qualificationCriteria?: string
  qualifiesPlayerCount?: number
  nextLevelTournamentId?: string
  
  // Financial
  entryFee: number
  currency: string
  prizePool: number
  
  // Features
  isFeatured?: boolean
  isNationalTournament?: boolean
  
  // Media
  bannerImage?: string
  
  // Series
  tournamentSeries?: string
}

export interface UpdateTournamentData {
  name?: string
  description?: string
  type?: Tournament['type']
  status?: Tournament['status']
  competitionLevel?: string
  
  // Dates
  startDate?: Date
  endDate?: Date
  registrationStartDate?: Date
  registrationEndDate?: Date
  estimatedDuration?: string
  
  // Location
  location?: string
  venue?: string
  
  // Participation
  maxPlayers?: number
  expectedParticipants?: number
  allowedCommunityIds?: string[]
  
  // Registration
  registrationCriteria?: Tournament['registrationCriteria']
  qualificationRequirement?: Tournament['qualificationRequirement']
  
  // Qualification
  isQualificationTournament?: boolean
  progressionEnabled?: boolean
  qualificationCriteria?: string
  qualifiesPlayerCount?: number
  
  // Financial
  entryFee?: number
  prizePool?: number
  
  // Media
  bannerImage?: string
  
  // Features
  isFeatured?: boolean
}

export interface TournamentRegistration {
  id: string
  playerId: string
  tournamentId: string
  tournamentName: string
  playerName: string
  playerEmail?: string
  playerAvatar?: string | null
  playerIds: string[]
  communityId: string
  communityName: string
  hierarchicalLevel: 'community' | 'county' | 'regional' | 'national'
  isNationalTournament: boolean
  entryFee: number
  status: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  registeredAt: string | Timestamp
  confirmedAt?: string | Timestamp | null
  cancelledAt?: string | Timestamp | null
  cancellationReason?: string | null
  paymentId?: string
  paymentCompletedAt?: string | Timestamp | null
  paymentFailedAt?: string | Timestamp | null
  paymentRefundedAt?: string | Timestamp | null
  paymentMethod?: 'cash' | 'mobile_money' | 'bank_transfer' | 'online'
  registeredBy?: string
  metadata?: {
    demoRegistration?: boolean
    registrationMethod?: string
    paymentReference?: string
    playerCommunityAtRegistration?: {
      id: string
      name: string
      county?: string
      region?: string
    }
  }
}

export interface TournamentQualification {
  playerId: string
  tournamentId: string
  qualifiedAt: Date
  qualificationPosition: number
  qualifiesFor?: string
  nextTournamentId?: string
}

export interface TournamentStats {
  totalTournaments: number
  activeTournaments: number
  upcomingTournaments: number
  completedTournaments: number
  totalRegistrations: number
  totalPrizePool: number
  averageParticipants: number
}

export interface TournamentFilters {
  type?: Tournament['type']
  status?: Tournament['status']
  hierarchicalLevel?: Tournament['hierarchicalLevel']
  isQualificationTournament?: boolean
  isFeatured?: boolean
  registrationOpen?: boolean
  communityId?: string
  countyId?: string
  regionId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  entryFeeRange?: {
    min: number
    max: number
  }
  prizePoolRange?: {
    min: number
    max: number
  }
}

export interface TournamentSearchParams {
  query?: string
  filters?: TournamentFilters
  sortBy?: 'startDate' | 'endDate' | 'registrationEndDate' | 'prizePool' | 'entryFee' | 'maxPlayers' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Legacy interfaces for match management (keeping for backward compatibility)
export interface Prize {
  position: number
  amount: number
  description?: string
}

export interface Match {
  id: string
  tournamentId: string
  round: number
  player1Id: string
  player2Id: string
  player1Score?: number
  player2Score?: number
  winnerId?: string
  status: 'scheduled' | 'ongoing' | 'completed'
  scheduledTime?: Date
  completedTime?: Date
}

export interface Bracket {
  tournamentId: string
  rounds: Round[]
}

export interface Round {
  roundNumber: number
  matches: Match[]
}