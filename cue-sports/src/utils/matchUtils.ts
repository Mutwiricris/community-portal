import type { Match, MatchFilters, TournamentBracket, PlayerPosition } from '../types/match'
import type { Tournament } from '../types/tournament'

// Match status utilities
export const matchStatusUtils = {
  /**
   * Check if a match can be started
   */
  canStartMatch(match: Match): boolean {
    return match.status === 'scheduled' && 
           match.scheduledDateTime && 
           new Date() >= new Date(match.scheduledDateTime.toString())
  },

  /**
   * Check if a match can be completed
   */
  canCompleteMatch(match: Match): boolean {
    return match.status === 'in_progress'
  },

  /**
   * Check if a match can be cancelled
   */
  canCancelMatch(match: Match): boolean {
    return ['pending', 'scheduled', 'in_progress'].includes(match.status)
  },

  /**
   * Check if a match can be rescheduled
   */
  canRescheduleMatch(match: Match): boolean {
    return ['pending', 'scheduled'].includes(match.status)
  },

  /**
   * Check if a match result can be edited
   */
  canEditResult(match: Match): boolean {
    return match.status === 'completed' && 
           match.resultSubmittedAt &&
           new Date().getTime() - new Date(match.resultSubmittedAt.toString()).getTime() < 24 * 60 * 60 * 1000 // 24 hours
  },

  /**
   * Get available status transitions for a match
   */
  getAvailableStatusTransitions(currentStatus: Match['status']): Match['status'][] {
    const transitions: Record<Match['status'], Match['status'][]> = {
      'pending': ['scheduled', 'cancelled'],
      'scheduled': ['in_progress', 'cancelled', 'pending'],
      'in_progress': ['completed', 'cancelled'],
      'completed': ['disputed'],
      'cancelled': ['pending', 'scheduled'],
      'disputed': ['completed', 'cancelled']
    }
    return transitions[currentStatus] || []
  },

  /**
   * Get match status display information
   */
  getStatusDisplay(status: Match['status']): { label: string; color: string; icon: string } {
    const statusMap = {
      'pending': { label: 'Pending', color: 'gray', icon: 'clock' },
      'scheduled': { label: 'Scheduled', color: 'blue', icon: 'calendar' },
      'in_progress': { label: 'In Progress', color: 'yellow', icon: 'play' },
      'completed': { label: 'Completed', color: 'green', icon: 'check' },
      'cancelled': { label: 'Cancelled', color: 'red', icon: 'x' },
      'disputed': { label: 'Disputed', color: 'orange', icon: 'alert-triangle' }
    }
    return statusMap[status] || statusMap['pending']
  }
}

// Match type utilities
export const matchTypeUtils = {
  /**
   * Get match type display information
   */
  getTypeDisplay(type: Match['matchType']): { label: string; description: string } {
    const typeMap = {
      'qualifying': { 
        label: 'Qualifying', 
        description: 'Initial tournament rounds' 
      },
      'elimination': { 
        label: 'Elimination', 
        description: 'Knockout stage matches' 
      },
      'semi_final': { 
        label: 'Semi-Final', 
        description: 'Determines final and third place' 
      },
      'final': { 
        label: 'Final', 
        description: 'Championship match' 
      },
      'positioning': { 
        label: 'Positioning', 
        description: 'Determines final rankings' 
      },
      'bye': { 
        label: 'Bye', 
        description: 'Automatic advancement' 
      }
    }
    return typeMap[type] || typeMap['qualifying']
  },

  /**
   * Check if match type requires special handling
   */
  isSpecialMatch(match: Match): boolean {
    return match.isLevelFinal || match.determinesTop3 || match.isByeMatch
  },

  /**
   * Get match importance level
   */
  getImportanceLevel(match: Match): 'low' | 'medium' | 'high' | 'critical' {
    if (match.isLevelFinal) return 'critical'
    if (match.determinesTop3) return 'high'
    if (match.matchType === 'semi_final') return 'high'
    if (match.matchType === 'final') return 'critical'
    if (match.matchType === 'elimination') return 'medium'
    return 'low'
  }
}

// Tournament level utilities
export const tournamentLevelUtils = {
  /**
   * Get hierarchy order
   */
  getHierarchyOrder(level: Match['tournamentLevel']): number {
    const order = {
      'community': 1,
      'county': 2,
      'regional': 3,
      'national': 4
    }
    return order[level] || 0
  },

  /**
   * Get next tournament level
   */
  getNextLevel(currentLevel: Match['tournamentLevel']): Match['tournamentLevel'] | null {
    const progression = {
      'community': 'county',
      'county': 'regional',
      'regional': 'national',
      'national': null
    }
    return progression[currentLevel] as Match['tournamentLevel'] | null
  },

  /**
   * Get level display information
   */
  getLevelDisplay(level: Match['tournamentLevel']): { label: string; color: string } {
    const levelMap = {
      'community': { label: 'Community', color: 'green' },
      'county': { label: 'County', color: 'blue' },
      'regional': { label: 'Regional', color: 'purple' },
      'national': { label: 'National', color: 'gold' }
    }
    return levelMap[level] || levelMap['community']
  }
}

// Round utilities
export const roundUtils = {
  /**
   * Parse round number to get level and stage
   */
  parseRoundNumber(roundNumber: string): { level: string; stage: string; roundNum?: number } {
    if (roundNumber.startsWith('R')) {
      const roundNum = parseInt(roundNumber.substring(1))
      return { level: 'qualifying', stage: 'round', roundNum }
    }

    if (roundNumber.includes('_')) {
      const [level, stage] = roundNumber.split('_')
      return { level: level.toLowerCase(), stage: stage.toLowerCase() }
    }

    return { level: 'unknown', stage: roundNumber.toLowerCase() }
  },

  /**
   * Get round display name
   */
  getRoundDisplayName(roundNumber: string): string {
    const parsed = roundUtils.parseRoundNumber(roundNumber)
    
    if (parsed.level === 'qualifying' && parsed.roundNum) {
      return `Round ${parsed.roundNum}`
    }

    const stageNames: Record<string, string> = {
      'sf': 'Semi-Final',
      'f': 'Final',
      'wf': 'Winners Final',
      'lf': 'Losers Final',
      'final': 'Final'
    }

    const stageName = stageNames[parsed.stage] || parsed.stage
    const levelName = parsed.level.charAt(0).toUpperCase() + parsed.level.slice(1)

    return `${levelName} ${stageName}`
  },

  /**
   * Get round order for sorting
   */
  getRoundOrder(roundNumber: string): number {
    const parsed = roundUtils.parseRoundNumber(roundNumber)
    
    if (parsed.level === 'qualifying' && parsed.roundNum) {
      return parsed.roundNum
    }

    const stageOrder: Record<string, number> = {
      'sf': 100,
      'wf': 101,
      'lf': 102,
      'f': 103,
      'final': 103
    }

    const levelMultiplier = {
      'community': 1000,
      'county': 2000,
      'regional': 3000,
      'national': 4000
    }[parsed.level] || 0

    return levelMultiplier + (stageOrder[parsed.stage] || 0)
  }
}

// Match scheduling utilities
export const schedulingUtils = {
  /**
   * Calculate estimated match duration
   */
  getEstimatedDuration(match: Match): number {
    // Base duration in minutes
    let baseDuration = 45

    // Adjust based on match type
    switch (match.matchType) {
      case 'final':
        baseDuration = 60
        break
      case 'semi_final':
        baseDuration = 55
        break
      case 'bye':
        baseDuration = 5
        break
    }

    // Adjust based on tournament level
    switch (match.tournamentLevel) {
      case 'national':
        baseDuration += 15
        break
      case 'regional':
        baseDuration += 10
        break
      case 'county':
        baseDuration += 5
        break
    }

    return baseDuration
  },

  /**
   * Check if matches can be scheduled in parallel
   */
  canScheduleInParallel(match1: Match, match2: Match): boolean {
    // Cannot schedule if they share players
    const match1Players = [match1.player1Id, match1.player2Id].filter(Boolean)
    const match2Players = [match2.player1Id, match2.player2Id].filter(Boolean)
    
    const hasSharedPlayers = match1Players.some(p => match2Players.includes(p))
    if (hasSharedPlayers) return false

    // Cannot schedule if they use the same venue/table
    if (match1.venueId && match2.venueId && 
        match1.venueId === match2.venueId && 
        match1.tableNumber === match2.tableNumber) {
      return false
    }

    return true
  },

  /**
   * Generate suggested time slots
   */
  generateTimeSlots(
    startDate: Date, 
    endDate: Date, 
    intervalMinutes: number = 60,
    workingHours: { start: number; end: number } = { start: 9, end: 18 }
  ): Date[] {
    const slots: Date[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      if (current.getHours() >= workingHours.start && current.getHours() < workingHours.end) {
        slots.push(new Date(current))
      }
      current.setMinutes(current.getMinutes() + intervalMinutes)
    }
    
    return slots
  }
}

// Match filtering utilities
export const filterUtils = {
  /**
   * Apply filters to matches array
   */
  applyFilters(matches: Match[], filters: MatchFilters): Match[] {
    return matches.filter(match => {
      if (filters.tournamentId && match.tournamentId !== filters.tournamentId) return false
      if (filters.tournamentLevel && match.tournamentLevel !== filters.tournamentLevel) return false
      if (filters.status && match.status !== filters.status) return false
      if (filters.matchType && match.matchType !== filters.matchType) return false
      if (filters.roundNumber && match.roundNumber !== filters.roundNumber) return false
      if (filters.communityId && match.communityId !== filters.communityId) return false
      if (filters.countyId && match.countyId !== filters.countyId) return false
      if (filters.regionId && match.regionId !== filters.regionId) return false
      if (filters.playerId && 
          match.player1Id !== filters.playerId && 
          match.player2Id !== filters.playerId) return false
      if (filters.venueId && match.venueId !== filters.venueId) return false
      if (filters.isLevelFinal !== undefined && match.isLevelFinal !== filters.isLevelFinal) return false
      if (filters.determinesTop3 !== undefined && match.determinesTop3 !== filters.determinesTop3) return false
      
      if (filters.dateRange) {
        const matchDate = match.scheduledDateTime ? new Date(match.scheduledDateTime.toString()) : null
        if (!matchDate) return false
        if (matchDate < filters.dateRange.start || matchDate > filters.dateRange.end) return false
      }
      
      return true
    })
  },

  /**
   * Sort matches
   */
  sortMatches(
    matches: Match[], 
    sortBy: 'scheduledDateTime' | 'matchNumber' | 'createdAt' | 'actualStartTime' = 'matchNumber',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Match[] {
    return [...matches].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'scheduledDateTime':
          aValue = a.scheduledDateTime ? new Date(a.scheduledDateTime.toString()).getTime() : 0
          bValue = b.scheduledDateTime ? new Date(b.scheduledDateTime.toString()).getTime() : 0
          break
        case 'matchNumber':
          aValue = a.matchNumber
          bValue = b.matchNumber
          break
        case 'createdAt':
          aValue = new Date(a.createdAt.toString()).getTime()
          bValue = new Date(b.createdAt.toString()).getTime()
          break
        case 'actualStartTime':
          aValue = a.actualStartTime ? new Date(a.actualStartTime.toString()).getTime() : 0
          bValue = b.actualStartTime ? new Date(b.actualStartTime.toString()).getTime() : 0
          break
        default:
          aValue = a.matchNumber
          bValue = b.matchNumber
      }

      if (sortOrder === 'desc') {
        return bValue - aValue
      }
      return aValue - bValue
    })
  }
}

// Player utilities for matches
export const playerUtils = {
  /**
   * Get player information from match
   */
  getPlayerInfo(match: Match, playerId: string): { 
    name: string; 
    points: number; 
    communityId: string; 
    isPlayer1: boolean 
  } | null {
    if (match.player1Id === playerId) {
      return {
        name: match.player1Name,
        points: match.player1Points,
        communityId: match.player1CommunityId,
        isPlayer1: true
      }
    }
    
    if (match.player2Id === playerId) {
      return {
        name: match.player2Name!,
        points: match.player2Points!,
        communityId: match.player2CommunityId!,
        isPlayer1: false
      }
    }
    
    return null
  },

  /**
   * Get opponent information
   */
  getOpponentInfo(match: Match, playerId: string): {
    id: string;
    name: string;
    points: number;
    communityId: string;
  } | null {
    if (match.player1Id === playerId && match.player2Id) {
      return {
        id: match.player2Id,
        name: match.player2Name!,
        points: match.player2Points!,
        communityId: match.player2CommunityId!
      }
    }
    
    if (match.player2Id === playerId) {
      return {
        id: match.player1Id,
        name: match.player1Name,
        points: match.player1Points,
        communityId: match.player1CommunityId
      }
    }
    
    return null
  },

  /**
   * Check if player won the match
   */
  didPlayerWin(match: Match, playerId: string): boolean | null {
    if (match.status !== 'completed' || !match.winnerId) return null
    return match.winnerId === playerId
  }
}

// Position and ranking utilities
export const positionUtils = {
  /**
   * Format position display
   */
  formatPosition(position: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd']
    const remainder = position % 100
    
    if (remainder >= 11 && remainder <= 13) {
      return `${position}th`
    }
    
    const suffix = suffixes[position % 10] || suffixes[0]
    return `${position}${suffix}`
  },

  /**
   * Get position color/badge
   */
  getPositionBadge(position: number): { color: string; icon?: string } {
    switch (position) {
      case 1:
        return { color: 'gold', icon: 'trophy' }
      case 2:
        return { color: 'silver', icon: 'medal' }
      case 3:
        return { color: 'bronze', icon: 'medal' }
      default:
        return { color: 'gray' }
    }
  },

  /**
   * Calculate points for position
   */
  calculatePositionPoints(position: number, tournamentLevel: Match['tournamentLevel']): number {
    const basePoints = {
      'community': 10,
      'county': 25,
      'regional': 50,
      'national': 100
    }[tournamentLevel] || 10

    const multiplier = Math.max(1, 5 - position + 1)
    return basePoints * multiplier
  }
}

// Date and time utilities
export const dateUtils = {
  /**
   * Format match date/time
   */
  formatMatchDateTime(timestamp: any): string {
    if (!timestamp) return 'Not scheduled'
    
    const date = new Date(timestamp.toString())
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  /**
   * Get relative time
   */
  getRelativeTime(timestamp: any): string {
    if (!timestamp) return ''
    
    const date = new Date(timestamp.toString())
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`
    } else if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else {
      return `In ${diffDays} days`
    }
  },

  /**
   * Check if match is upcoming
   */
  isUpcoming(match: Match): boolean {
    if (!match.scheduledDateTime) return false
    return new Date(match.scheduledDateTime.toString()) > new Date()
  },

  /**
   * Check if match is overdue
   */
  isOverdue(match: Match): boolean {
    if (!match.scheduledDateTime || match.status === 'completed') return false
    const scheduledTime = new Date(match.scheduledDateTime.toString())
    const now = new Date()
    const estimatedDuration = schedulingUtils.getEstimatedDuration(match)
    
    return now.getTime() > scheduledTime.getTime() + (estimatedDuration * 60 * 1000)
  }
}

// Export all utilities as a single object for convenience
export const matchUtils = {
  status: matchStatusUtils,
  type: matchTypeUtils,
  level: tournamentLevelUtils,
  round: roundUtils,
  scheduling: schedulingUtils,
  filter: filterUtils,
  player: playerUtils,
  position: positionUtils,
  date: dateUtils
}