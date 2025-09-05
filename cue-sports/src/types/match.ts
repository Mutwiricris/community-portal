import type { Timestamp } from 'firebase/firestore'
import type { Player } from './player'

// Core match types based on Firestore structure analysis
export interface Match {
  id: string
  tournamentId: string
  tournamentLevel: 'community' | 'county' | 'regional' | 'national'
  tournamentName?: string // Added for indexed matches with tournament names
  
  // Round and match information
  roundNumber: string // e.g., "R1", "Community_SF", "Community_F"
  matchNumber: number
  matchType: 'qualifying' | 'elimination' | 'semi_final' | 'final' | 'positioning' | 'bye'
  
  // Player information
  player1Id: string
  player1Name: string
  player1Points: number
  player1CommunityId: string
  player2Id: string | null // null for bye matches
  player2Name: string | null
  player2Points: number | null
  player2CommunityId: string | null
  
  // Geographic information
  communityId: string
  countyId: string | null
  regionId: string | null
  
  // Match results
  winnerId: string | null
  winnerName: string | null
  loserId: string | null
  loserName: string | null
  
  // Scoring
  player1Score?: number
  player2Score?: number
  player1FrameWins?: number
  player2FrameWins?: number
  totalFramesPlayed?: number
  matchDurationMinutes?: number
  
  // Scheduling
  scheduledDate: string | Timestamp | null
  scheduledDateTime: string | Timestamp | null
  actualStartTime: string | Timestamp | null
  actualEndTime: string | Timestamp | null
  timeZone: string
  
  // Venue information
  venueId: string | null
  venueName: string | null
  venueAddress: string | null
  tableNumber: number | null
  
  // Match status and progression
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  determinesPositions: number[] // positions this match determines
  determinesTop3: boolean
  isLevelFinal: boolean
  isByeMatch: boolean
  positionBasedMatching: boolean
  positioningRound: number | null
  positioningStage: string | null
  geographicalSeparation: boolean
  
  // Game specifics
  maximumBreaks: number | null
  
  // Administrative
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
  createdBy: string
  resultSubmittedAt: string | Timestamp | null
  resultSubmittedBy: string | null
  adminNotes: string | null
  
  // Dispute handling
  disputeReason: string | null
  
  // Search optimization
  searchableText: string
}

export interface MatchResult {
  matchId: string
  winnerId: string
  loserId: string
  winnerScore?: number
  loserScore?: number
  completedAt: Date
  submittedBy: string
  notes?: string
  breaks?: MatchBreak[]
}

export interface MatchBreak {
  playerId: string
  breakValue: number
  frameNumber?: number
}

export interface MatchCreationData {
  tournamentId: string
  tournamentLevel: Match['tournamentLevel']
  roundNumber: string
  matchNumber: number
  matchType: Match['matchType']
  
  // Players
  player1Id: string
  player1Name: string
  player1Points: number
  player1CommunityId: string
  player2Id?: string | null
  player2Name?: string | null
  player2Points?: number | null
  player2CommunityId?: string | null
  
  // Location
  communityId: string
  countyId?: string | null
  regionId?: string | null
  
  // Scheduling
  scheduledDateTime?: Date | null
  venueId?: string | null
  venueName?: string | null
  venueAddress?: string | null
  tableNumber?: number | null
  
  // Match properties
  determinesPositions: number[]
  determinesTop3?: boolean
  isLevelFinal?: boolean
  isByeMatch?: boolean
  positionBasedMatching?: boolean
  positioningRound?: number | null
  positioningStage?: string | null
  geographicalSeparation?: boolean
  
  // Administrative
  createdBy: string
  adminNotes?: string | null
  maximumBreaks?: number | null
  timeZone?: string
}

export interface MatchUpdateData {
  // Scheduling updates
  scheduledDateTime?: Date | null
  venueId?: string | null
  venueName?: string | null
  venueAddress?: string | null
  tableNumber?: number | null
  
  // Status updates
  status?: Match['status']
  actualStartTime?: Date | null
  actualEndTime?: Date | null
  
  // Result updates
  winnerId?: string | null
  winnerName?: string | null
  loserId?: string | null
  loserName?: string | null
  
  // Administrative
  adminNotes?: string | null
  disputeReason?: string | null
  resultSubmittedBy?: string | null
  maximumBreaks?: number | null
}

// Tournament bracket types
export interface TournamentBracket {
  tournamentId: string
  bracketType: 'community_elimination' | 'county_elimination' | 'regional_elimination' | 'national_elimination'
  hierarchicalLevel: 'community' | 'county' | 'regional' | 'national'
  
  // Advancement rules
  advancementRules: {
    losersEliminated: boolean
    winnersAdvance: boolean
    positioningRules: Record<string, string> // e.g., "3_players": "quarter_final_semi_final"
    finalPositions: number[]
    type: 'single_elimination' | 'double_elimination' | 'round_robin'
  }
  
  // Bracket levels and communities
  bracketLevels: {
    community: Record<string, CommunityBracket>
    county: Record<string, CountyBracket>
    regional: Record<string, RegionalBracket>
    national: Record<string, NationalBracket>
  }
  
  // Participant scope
  participantScope: {
    scopeType: 'auto_detected' | 'manual'
    allowedCommunityIds: string[]
    allowedCountyIds: string[]
    allowedRegionIds: string[]
  }
  
  // Current positions and winners
  positions: {
    community: Record<string, CommunityPositions>
    county: Record<string, CountyPositions>
    regional: Record<string, RegionalPositions>
    national: Record<string, NationalPositions>
  }
  
  winners: {
    community: Record<string, CommunityWinners>
    county: Record<string, CountyWinners>
    regional: Record<string, RegionalWinners>
    national: Record<string, NationalWinners>
  }
  
  // Round management
  roundStatus: Record<string, 'pending' | 'in_progress' | 'completed'>
  rounds: {
    community: Record<string, Record<string, string[]>>
    county: Record<string, Record<string, string[]>>
    regional: Record<string, Record<string, string[]>>
    national: Record<string, Record<string, string[]>>
  }
  
  createdAt: string | Timestamp
  lastUpdated: string | Timestamp
}

export interface CommunityBracket {
  communityId: string
  currentRound: string
  playersCount: number
  status: 'active' | 'completed' | 'cancelled'
}

export interface CountyBracket {
  countyId: string
  currentRound: string
  playersCount: number
  status: 'active' | 'completed' | 'cancelled'
}

export interface RegionalBracket {
  regionId: string
  currentRound: string
  playersCount: number
  status: 'active' | 'completed' | 'cancelled'
}

export interface NationalBracket {
  currentRound: string
  playersCount: number
  status: 'active' | 'completed' | 'cancelled'
}

export interface PlayerPosition {
  player: {
    id: string | null
    name: string
    communityId: string
    countyId: string | null
    regionId: string | null
    points: number
  } | null
  status: 'determined' | 'pending'
  roundDetermined: string | null
}

export interface CommunityPositions {
  eliminatedPlayers: string[]
  lastRoundPlayed: string
  position1: PlayerPosition
  position2: PlayerPosition
  position3: PlayerPosition
  tournamentComplete: boolean
}

export interface CountyPositions {
  eliminatedPlayers: string[]
  lastRoundPlayed: string
  position1: PlayerPosition
  position2: PlayerPosition
  position3: PlayerPosition
  tournamentComplete: boolean
}

export interface RegionalPositions {
  eliminatedPlayers: string[]
  lastRoundPlayed: string
  position1: PlayerPosition
  position2: PlayerPosition
  position3: PlayerPosition
  tournamentComplete: boolean
}

export interface NationalPositions {
  eliminatedPlayers: string[]
  lastRoundPlayed: string
  position1: PlayerPosition
  position2: PlayerPosition
  position3: PlayerPosition
  tournamentComplete: boolean
}

export interface CommunityWinners {
  completedAt: string | Timestamp
  position1: PlayerPosition['player']
  position2: PlayerPosition['player']
  position3: PlayerPosition['player']
}

export interface CountyWinners {
  completedAt: string | Timestamp
  position1: PlayerPosition['player']
  position2: PlayerPosition['player']
  position3: PlayerPosition['player']
}

export interface RegionalWinners {
  completedAt: string | Timestamp
  position1: PlayerPosition['player']
  position2: PlayerPosition['player']
  position3: PlayerPosition['player']
}

export interface NationalWinners {
  completedAt: string | Timestamp
  position1: PlayerPosition['player']
  position2: PlayerPosition['player']
  position3: PlayerPosition['player']
}

// Match search and filtering
export interface MatchFilters {
  tournamentId?: string
  tournamentLevel?: Match['tournamentLevel']
  status?: Match['status']
  matchType?: Match['matchType']
  roundNumber?: string
  communityId?: string
  countyId?: string
  regionId?: string
  playerId?: string
  venueId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  isLevelFinal?: boolean
  determinesTop3?: boolean
}

export interface MatchSearchParams {
  query?: string
  filters?: MatchFilters
  sortBy?: 'scheduledDateTime' | 'matchNumber' | 'createdAt' | 'actualStartTime'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Algorithm integration types
export interface AlgorithmRequest {
  tournamentId: string
  level: 'community' | 'county' | 'regional' | 'national'
  special?: boolean
  schedulingPreference?: 'weekend' | 'full_week'
}

export interface AlgorithmResponse {
  success: boolean
  tournamentId: string
  matches: Match[]
  roundInfo?: {
    roundNumber: string
    totalMatches: number
    completedMatches: number
  }
  winners?: PlayerPosition['player'][]
  error?: string
  message?: string
  metadata?: {
    totalMatches?: number
    playersRemaining?: number
    estimatedDuration?: string
    roundType?: string
  }
}

// Match validation types
export interface MatchValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface MatchValidationRules {
  validatePlayerEligibility: boolean
  checkSchedulingConflicts: boolean
  validateVenueAvailability: boolean
  ensureBracketConsistency: boolean
  validateMatchType: boolean
}

// Live Match Scoring Types
export interface LiveMatchState {
  matchId: string
  tournamentId: string
  currentFrame: number
  totalFrames: number
  frames: Frame[]
  shotClock: number // seconds remaining on shot clock
  matchTimer: number // total match duration in seconds
  breakTimer: number | null // break duration in seconds
  isOnBreak: boolean
  isPaused: boolean
  pauseReason: string | null
  lastUpdateTime: Timestamp
  lastUpdateBy: string
  scorekeeperId: string // person managing the live scoring
  spectatorCount: number
  isLive: boolean
  settings: LiveMatchSettings
}

export interface Frame {
  frameNumber: number
  player1Score: number
  player2Score: number
  winner: string | null
  startTime: Timestamp
  endTime: Timestamp | null
  duration: number | null // in seconds
  breaks: FrameBreak[]
  fouls: FrameFoul[]
  isComplete: boolean
  maxBreak: number
  totalPots: number
}

export interface FrameBreak {
  id: string
  playerId: string
  playerName: string
  breakValue: number
  timestamp: Timestamp
  frameNumber: number
  isMaximumBreak: boolean
  potSequence: number[] // sequence of ball values potted
}

export interface FrameFoul {
  id: string
  playerId: string
  playerName: string
  foulType: 'miss' | 'in_off' | 'wrong_ball' | 'touching_ball' | 'push_shot' | 'jump_shot' | 'free_ball' | 'unsporting'
  points: number
  timestamp: Timestamp
  frameNumber: number
  description: string | null
}

export interface LiveMatchSettings {
  shotClockDuration: number // default shot clock time in seconds
  shotClockWarningTime: number // warning threshold in seconds
  breakTimeDuration: number // standard break time in seconds
  autoAdvanceFrames: boolean
  allowSpectatorView: boolean
  recordDetailedStatistics: boolean
  enableShotClock: boolean
  maxFramesToWin: number
  soundEnabled: boolean
  vibrationEnabled: boolean
}

export interface FrameUpdate {
  frameNumber: number
  player1Score?: number
  player2Score?: number
  winner?: string | null
  isComplete?: boolean
  break?: Omit<FrameBreak, 'id' | 'timestamp'>
  foul?: Omit<FrameFoul, 'id' | 'timestamp'>
}

export interface LiveMatchEvent {
  id: string
  matchId: string
  type: 'frame_start' | 'frame_end' | 'break_start' | 'break_end' | 'score_update' | 'break_recorded' | 'foul_recorded' | 'match_pause' | 'match_resume' | 'match_complete'
  timestamp: Timestamp
  frameNumber: number | null
  playerId: string | null
  playerName: string | null
  data: {
    score?: number
    breakValue?: number
    foulPoints?: number
    frameWinner?: string
    reason?: string
    previousScore?: number
    newScore?: number
  }
  triggeredBy: string
  description: string
}

export interface LiveMatchStats {
  matchId: string
  player1Stats: PlayerMatchStats
  player2Stats: PlayerMatchStats
  matchDuration: number
  averageFrameDuration: number
  totalBreaks: number
  totalFouls: number
  highestBreak: FrameBreak | null
  frameHistory: Frame[]
  lastUpdated: Timestamp
}

export interface PlayerMatchStats {
  playerId: string
  playerName: string
  framesWon: number
  totalScore: number
  averageScorePerFrame: number
  breaks: FrameBreak[]
  fouls: FrameFoul[]
  highestBreak: number
  totalBreakValue: number
  breakCount: number
  foulCount: number
  shotsMissed: number
  potSuccess: number
  timeAtTable: number // total time in seconds
}

export interface LiveMatchSubscription {
  matchId: string
  userId: string
  role: 'scorekeeper' | 'spectator' | 'player' | 'referee'
  subscribedAt: Timestamp
  lastActivity: Timestamp
  permissions: {
    canUpdateScore: boolean
    canPauseMatch: boolean
    canEndFrame: boolean
    canRecordBreaks: boolean
    canRecordFouls: boolean
    canCompleteMatch: boolean
  }
}

// Timer-related types
export interface TimerState {
  shotClock: {
    timeRemaining: number
    isRunning: boolean
    isWarning: boolean
    hasExpired: boolean
    lastStartTime: Timestamp | null
  }
  matchTimer: {
    totalDuration: number
    isRunning: boolean
    startTime: Timestamp | null
    pausedDuration: number
  }
  breakTimer: {
    timeRemaining: number | null
    isActive: boolean
    startTime: Timestamp | null
  }
}

export interface TimerEvent {
  type: 'shot_clock_start' | 'shot_clock_stop' | 'shot_clock_warning' | 'shot_clock_expired' | 'match_timer_start' | 'match_timer_pause' | 'match_timer_resume' | 'break_timer_start' | 'break_timer_end'
  timestamp: Timestamp
  data?: {
    duration?: number
    reason?: string
  }
}

// Error handling for live matches
export interface LiveMatchError {
  code: 'CONNECTION_LOST' | 'PERMISSION_DENIED' | 'INVALID_UPDATE' | 'CONCURRENT_MODIFICATION' | 'TIMER_SYNC_ERROR' | 'DATA_CORRUPTION'
  message: string
  timestamp: Timestamp
  matchId: string
  userId: string
  recoverable: boolean
  retryable: boolean
  context?: {
    frameNumber?: number
    lastValidState?: Partial<LiveMatchState>
    conflictingUpdate?: any
  }
}

// Audit types for match operations
export interface MatchAuditLog {
  id: string
  entityType: 'match'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'result_submit' | 'live_start' | 'live_score_update' | 'live_complete'
  actionBy: string
  actionByRole: string
  beforeState: Partial<Match> | null
  afterState: Partial<Match>
  changedFields: string[]
  reason: string
  category: 'administrative' | 'competition' | 'technical'
  severity: 'info' | 'warning' | 'error'
  timestamp: string | Timestamp
  tournamentId: string
  sessionId: string
  ipAddress: string
  userAgent: string
  tags: string[]
}