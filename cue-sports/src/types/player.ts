export interface Player {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth?: Date
  rank?: number
  skill?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  status: 'active' | 'inactive' | 'archived'
  stats: PlayerStats
  tournaments: string[] // Tournament IDs
  communityId: string // Required community membership
  registrationDate: Date
  createdAt: Date
  updatedAt: Date
}

export interface PlayerStats {
  matchesPlayed: number
  matchesWon: number
  matchesLost: number
  winRate: number
  totalEarnings: number
  tournamentsPlayed: number
  tournamentsWon: number
  currentStreak: number
  bestStreak: number
}

export const defaultPlayerStats: PlayerStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  winRate: 0,
  totalEarnings: 0,
  tournamentsPlayed: 0,
  tournamentsWon: 0,
  currentStreak: 0,
  bestStreak: 0
}