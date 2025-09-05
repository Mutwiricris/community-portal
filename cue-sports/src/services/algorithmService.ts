import type {
  AlgorithmRequest,
  AlgorithmResponse,
  Match,
  MatchCreationData,
  TournamentBracket
} from '@/types/match'

export interface AlgorithmInitParams {
  tournamentId: string
  special?: boolean
  level?: 'community' | 'county' | 'regional' | 'national'
  schedulingPreference?: 'weekend' | 'full_week'
  players?: AlgorithmPlayer[]
}

export interface AlgorithmRoundRequest {
  tournamentId: string
  level: 'community' | 'county' | 'regional' | 'national'
  communityId?: string
  countyId?: string
  regionId?: string
  currentRound?: string
  completedMatches?: string[]
}

export interface AlgorithmRoundResponse {
  success: boolean
  tournamentId: string
  roundNumber: string
  matches: AlgorithmMatch[]
  winners?: AlgorithmWinner[]
  nextRound?: string
  tournamentComplete?: boolean
  error?: string
  metadata?: {
    totalMatches: number
    playersRemaining: number
    estimatedDuration: string
    roundType: string
  }
}

export interface AlgorithmMatch {
  id: string
  matchNumber: number
  roundNumber: string
  matchType: 'qualifying' | 'elimination' | 'semi_final' | 'final' | 'positioning' | 'bye'
  player1: AlgorithmPlayer
  player2?: AlgorithmPlayer
  determinesPositions: number[]
  isLevelFinal: boolean
  determinesTop3: boolean
  isByeMatch: boolean
  communityId: string
  countyId?: string
  regionId?: string
  scheduledDateTime?: string
  venueId?: string
  adminNotes?: string
}

export interface AlgorithmPlayer {
  id: string
  name: string
  communityId: string
  countyId?: string
  regionId?: string
  points: number
  currentRanking?: number
}

export interface AlgorithmWinner {
  playerId: string
  playerName: string
  position: number
  communityId: string
  countyId?: string
  regionId?: string
  points: number
  qualifiesFor?: string
}

export interface AlgorithmError {
  code: string
  message: string
  details?: any
  timestamp: string
  tournamentId?: string
  level?: string
}

export class AlgorithmService {
  private baseUrl = '/api/algorithm'  // USE PROXY - CONFIGURED IN VITE.CONFIG.TS
  private timeout = 30000 // 30 seconds (default)
  private countyTimeout = 300000 // 5 minutes for county tournaments
  private specialTimeout = 600000 // 10 minutes for special tournaments
  private retryAttempts = 3
  private retryDelay = 1000 // 1 second

  // Initialize tournament with algorithm - EXACT API CONTRACT FROM TEST FILES
  async initializeTournament(params: AlgorithmInitParams): Promise<AlgorithmResponse> {
    try {
      
      // Validate parameters
      if (!params.tournamentId) {
        throw new Error('Tournament ID is required')
      }

      // Use EXACT request structure from test files
      const requestBody: any = {
        tournamentId: params.tournamentId,
        special: params.special || false,
        schedulingPreference: params.schedulingPreference || 'weekend'
      }

      // Add level parameter ONLY for non-special tournaments (per test file)
      if (!requestBody.special && params.level) {
        requestBody.level = params.level
      } else if (requestBody.special) {
      }
      

      // IMPORTANT: Do NOT send players data in initialization request
      // The algorithm gets players from the database itself (per test files)
      // The test files only send tournamentId, special, level, schedulingPreference
      if (params.players && params.players.length > 0) {
      }

      const response = await this.makeRequest('/initialize-tournament', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      
      const result = await this.processAlgorithmResponse(response)
      
      
      return result
    } catch (error) {
      return this.handleAlgorithmError(error, 'initialize', params.tournamentId)
    }
  }

  // Generate next round for community level - EXACT API CONTRACT FROM TEST FILES  
  async generateCommunityRound(request: AlgorithmRoundRequest): Promise<AlgorithmRoundResponse> {
    try {
      // Use EXACT request structure from test files - minimal fields
      const requestBody: any = {
        tournamentId: request.tournamentId
      }
      
      // Add communityId if provided
      if (request.communityId) {
        requestBody.communityId = request.communityId
      }
      
      // NO currentRound parameter - algorithm auto-detects (per test file)
      // Only add completed matches if provided for round validation
      if (request.completedMatches && request.completedMatches.length > 0) {
        requestBody.completedMatches = request.completedMatches
      }


      const response = await this.makeRequest('/community/next-round', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const result = await this.processCommunityResponse(response)
      
      return result
    } catch (error) {
      return this.handleRoundError(error, 'community', request.tournamentId)
    }
  }

  // Finalize community winners - EXACT API CONTRACT FROM TEST FILES
  async finalizeCommunityWinners(tournamentId: string, communityId?: string): Promise<AlgorithmRoundResponse> {
    try {
      // Use EXACT request structure from test files
      const requestBody: any = {
        tournamentId
      }
      
      // Add communityId if provided
      if (communityId) {
        requestBody.communityId = communityId
      }


      const response = await this.makeRequest('/finalize', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const result = await this.processCommunityResponse(response)
      
      return result
    } catch (error) {
      return this.handleRoundError(error, 'community_finalize', tournamentId)
    }
  }

  // Initialize county level
  async initializeCountyTournament(tournamentId: string): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/county/initialize', {
        method: 'POST',
        body: JSON.stringify({ tournamentId })
      })

      return this.processCountyResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'county_init', tournamentId)
    }
  }

  // Generate next round for county level
  async generateCountyRound(request: AlgorithmRoundRequest): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/county/next-round', {
        method: 'POST',
        body: JSON.stringify({
          tournamentId: request.tournamentId,
          currentRound: request.currentRound,
          completedMatches: request.completedMatches || []
        })
      })

      return this.processCountyResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'county', request.tournamentId)
    }
  }

  // Initialize regional level
  async initializeRegionalTournament(tournamentId: string): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/regional/initialize', {
        method: 'POST',
        body: JSON.stringify({ tournamentId })
      })

      return this.processRegionalResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'regional_init', tournamentId)
    }
  }

  // Generate next round for regional level
  async generateRegionalRound(request: AlgorithmRoundRequest): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/regional/next-round', {
        method: 'POST',
        body: JSON.stringify({
          tournamentId: request.tournamentId,
          currentRound: request.currentRound,
          completedMatches: request.completedMatches || []
        })
      })

      return this.processRegionalResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'regional', request.tournamentId)
    }
  }

  // Initialize national level
  async initializeNationalTournament(tournamentId: string): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/national/initialize', {
        method: 'POST',
        body: JSON.stringify({ tournamentId })
      })

      return this.processNationalResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'national_init', tournamentId)
    }
  }

  // Generate next round for national level
  async generateNationalRound(request: AlgorithmRoundRequest): Promise<AlgorithmRoundResponse> {
    try {
      const response = await this.makeRequest('/national/next-round', {
        method: 'POST',
        body: JSON.stringify({
          tournamentId: request.tournamentId,
          currentRound: request.currentRound,
          completedMatches: request.completedMatches || []
        })
      })

      return this.processNationalResponse(response)
    } catch (error) {
      return this.handleRoundError(error, 'national', request.tournamentId)
    }
  }

  // Get tournament positions for any level
  async getTournamentPositions(tournamentId: string, level?: string): Promise<{
    success: boolean;
    positions: { [position: string]: AlgorithmPlayer };
    level: string;
    completed: boolean;
    error?: string;
  }> {
    try {
      const requestBody: any = { tournamentId }
      if (level) requestBody.level = level

      const response = await this.makeRequest('/tournament/positions', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      return {
        success: data.success || false,
        positions: data.positions || {},
        level: data.level || 'community',
        completed: data.completed || false,
        error: data.error
      }
    } catch (error) {
      return {
        success: false,
        positions: {},
        level: level || 'community',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Reset tournament data in algorithm (clears stored bracket data)
  async resetTournament(tournamentId: string): Promise<{
    success: boolean
    message: string
    error?: string
  }> {
    try {
      console.log(`🔄 Attempting to reset tournament data for ${tournamentId}`)
      
      // Since there's no dedicated reset endpoint, provide a workaround solution
      // The best approach is to use a new tournament ID
      return {
        success: false,
        message: `Tournament ${tournamentId} appears to be completed in the algorithm system. To generate new matches, please:\n\n1. Create a new tournament with a different name/ID, OR\n2. Use a different tournament ID, OR\n3. Contact support to manually reset tournament data\n\nThe algorithm system maintains its own state and currently has this tournament marked as completed.`,
        error: 'Tournament already completed - reset not available'
      }
    } catch (error) {
      console.error('❌ Tournament reset failed:', error)
      return {
        success: false,
        message: 'Failed to reset tournament data',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Finalize tournament positions
  async finalizeTournamentPositions(tournamentId: string, level?: string): Promise<{
    success: boolean;
    positions: { [position: string]: AlgorithmPlayer };
    level: string;
    message: string;
    error?: string;
  }> {
    try {
      const requestBody: any = { tournamentId }
      if (level) requestBody.level = level

      const response = await this.makeRequest('/finalize', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      return {
        success: data.success || false,
        positions: data.positions || {},
        level: data.level || 'community',
        message: data.message || 'Tournament finalized',
        error: data.error
      }
    } catch (error) {
      return {
        success: false,
        positions: {},
        level: level || 'community',
        message: 'Finalization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Check algorithm service health
  async checkServiceHealth(): Promise<{ healthy: boolean; message: string; responseTime: number }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.baseUrl}/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        return {
          healthy: data.success || false,
          message: data.message || 'Algorithm service is operational',
          responseTime
        }
      } else {
        return {
          healthy: false,
          message: `Service returned ${response.status}: ${response.statusText}`,
          responseTime
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Service unavailable',
        responseTime
      }
    }
  }

  // Convert algorithm matches to our match format
  convertAlgorithmMatches(
    algorithmMatches: AlgorithmMatch[], 
    tournamentId: string,
    createdBy: string
  ): MatchCreationData[] {
    return algorithmMatches.map(algMatch => ({
      tournamentId,
      tournamentLevel: this.determineTournamentLevel(algMatch.roundNumber),
      roundNumber: algMatch.roundNumber,
      matchNumber: algMatch.matchNumber,
      matchType: algMatch.matchType,
      player1Id: algMatch.player1.id,
      player1Name: algMatch.player1.name,
      player1Points: algMatch.player1.points,
      player1CommunityId: algMatch.player1.communityId,
      player2Id: algMatch.player2?.id || null,
      player2Name: algMatch.player2?.name || null,
      player2Points: algMatch.player2?.points || null,
      player2CommunityId: algMatch.player2?.communityId || null,
      communityId: algMatch.communityId,
      countyId: algMatch.countyId || null,
      regionId: algMatch.regionId || null,
      determinesPositions: algMatch.determinesPositions,
      isLevelFinal: algMatch.isLevelFinal,
      determinesTop3: algMatch.determinesTop3,
      isByeMatch: algMatch.isByeMatch,
      scheduledDateTime: algMatch.scheduledDateTime ? new Date(algMatch.scheduledDateTime) : undefined,
      venueId: algMatch.venueId || null,
      adminNotes: algMatch.adminNotes || `Generated by algorithm for ${algMatch.roundNumber}`,
      createdBy,
      timeZone: 'Africa/Nairobi'
    }))
  }

  // Private helper methods
  private async makeRequest(endpoint: string, options: RequestInit, customTimeout?: number): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    const timeoutDuration = customTimeout || this.timeout
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(timeoutDuration)
    }

    const finalOptions = { ...defaultOptions, ...options }

    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, finalOptions)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
        }
        
        return response
      } catch (error) {
        
        if (attempt === this.retryAttempts) {
          throw error
        }
        
        // Wait before retry
        const delay = this.retryDelay * attempt
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('All retry attempts failed')
  }

  private async processAlgorithmResponse(response: Response): Promise<AlgorithmResponse> {
    const data = await response.json()
    
    
    // Check if the response has totalMatches but no matches array (backend issue)
    if (data.totalMatches && data.totalMatches > 0 && (!data.matches || data.matches.length === 0)) {
      // Add totalMatches to metadata for frontend handling
      data.metadata = {
        ...data.metadata,
        totalMatchesGenerated: data.totalMatches,
        backendIssue: 'matches_not_returned'
      }
    }
    
    return {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      matches: data.matches || [],
      roundInfo: data.roundInfo,
      winners: data.winners,
      error: data.error,
      message: data.message,
      metadata: data.metadata
    }
  }

  private async processCommunityResponse(response: Response): Promise<AlgorithmRoundResponse> {
    const data = await response.json()
    
    return {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      roundNumber: data.roundNumber || '',
      matches: data.matches || [],
      winners: data.winners,
      nextRound: data.nextRound,
      tournamentComplete: data.tournamentComplete || false,
      error: data.error,
      metadata: data.metadata
    }
  }

  private async processCountyResponse(response: Response): Promise<AlgorithmRoundResponse> {
    const data = await response.json()
    
    return {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      roundNumber: data.roundNumber || '',
      matches: data.matches || [],
      winners: data.winners,
      nextRound: data.nextRound,
      tournamentComplete: data.tournamentComplete || false,
      error: data.error,
      metadata: data.metadata
    }
  }

  private async processRegionalResponse(response: Response): Promise<AlgorithmRoundResponse> {
    const data = await response.json()
    
    return {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      roundNumber: data.roundNumber || '',
      matches: data.matches || [],
      winners: data.winners,
      nextRound: data.nextRound,
      tournamentComplete: data.tournamentComplete || false,
      error: data.error,
      metadata: data.metadata
    }
  }

  private async processNationalResponse(response: Response): Promise<AlgorithmRoundResponse> {
    const data = await response.json()
    
    return {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      roundNumber: data.roundNumber || '',
      matches: data.matches || [],
      winners: data.winners,
      nextRound: data.nextRound,
      tournamentComplete: data.tournamentComplete || false,
      error: data.error,
      metadata: data.metadata
    }
  }

  private handleAlgorithmError(error: any, operation: string, tournamentId: string): AlgorithmResponse {
    const algorithmError: AlgorithmError = {
      code: 'ALGORITHM_ERROR',
      message: error instanceof Error ? error.message : 'Unknown algorithm error',
      details: error,
      timestamp: new Date().toISOString(),
      tournamentId
    }


    return {
      success: false,
      tournamentId,
      matches: [],
      error: algorithmError.message
    }
  }

  private handleRoundError(error: any, operation: string, tournamentId: string): AlgorithmRoundResponse {
    const algorithmError: AlgorithmError = {
      code: 'ROUND_GENERATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown round generation error',
      details: error,
      timestamp: new Date().toISOString(),
      tournamentId
    }


    return {
      success: false,
      tournamentId,
      roundNumber: '',
      matches: [],
      error: algorithmError.message
    }
  }

  private determineTournamentLevel(roundNumber: string): 'community' | 'county' | 'regional' | 'national' {
    if (roundNumber.toLowerCase().includes('community')) return 'community'
    if (roundNumber.toLowerCase().includes('county')) return 'county'
    if (roundNumber.toLowerCase().includes('regional')) return 'regional'
    if (roundNumber.toLowerCase().includes('national')) return 'national'
    
    // Default based on round format
    if (roundNumber.startsWith('R')) return 'community'
    
    return 'community'
  }

  // Fetch indexed matches from algorithm's storage
  private async fetchIndexedMatches(tournamentId: string): Promise<AlgorithmMatch[]> {
    try {
      // Try to get matches from algorithm's indexed structure
      const response = await this.makeRequest('/tournament/matches', {
        method: 'POST',
        body: JSON.stringify({ tournamentId })
      })
      
      const data = await response.json()
      return data.matches || []
    } catch (error) {
      return []
    }
  }
}

// Export singleton instance
export const algorithmService = new AlgorithmService()