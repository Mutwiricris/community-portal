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

export interface ProgressCallback {
  onStepUpdate: (step: string, description: string, status: 'running' | 'completed' | 'error') => void
  onLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void
}

export class AlgorithmServiceWithProgress {
  private baseUrl = '/api/algorithm'
  private timeout = 60000 // 1 minute for regular requests
  private countyTimeout = 600000 // 10 minutes for county tournaments
  private specialTimeout = 900000 // 15 minutes for special tournaments
  private largePlayerSetTimeout = 1200000 // 20 minutes for tournaments with 50+ players
  private retryAttempts = 3
  private retryDelay = 2000 // 2 seconds initial delay

  async initializeTournamentWithChunking(
    params: AlgorithmInitParams, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmResponse> {
    const playerCount = params.players?.length || 0
    
    // For very large tournaments (200+ players), use chunked processing
    if (playerCount >= 200) {
      return this.initializeLargeTournament(params, progressCallback)
    }
    
    return this.initializeTournament(params, progressCallback)
  }

  private async initializeLargeTournament(
    params: AlgorithmInitParams, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmResponse> {
    const log = progressCallback?.onLog || (() => {})
    const updateStep = progressCallback?.onStepUpdate || (() => {})

    log('Large tournament detected - using chunked processing', 'info')
    
    // For very large tournaments, we might need to:
    // 1. Process in smaller batches
    // 2. Use different tournament structure
    // 3. Implement progressive loading
    
    // For now, use the regular initialization with extended timeout
    return this.initializeTournament({
      ...params,
      // Add metadata to indicate large tournament
    }, progressCallback)
  }

  async initializeTournament(
    params: AlgorithmInitParams, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmResponse> {
    const log = progressCallback?.onLog || (() => {})
    const updateStep = progressCallback?.onStepUpdate || (() => {})

    try {
      updateStep('validate', 'Validating tournament parameters', 'running')
      log('Starting tournament initialization', 'info')
      
      if (!params.tournamentId) {
        throw new Error('Tournament ID is required')
      }

      log(`Tournament ID: ${params.tournamentId}`, 'info')
      log(`Level: ${params.level || 'auto-detect'}`, 'info')
      log(`Special mode: ${params.special ? 'enabled' : 'disabled'}`, 'info')
      
      // Determine appropriate timeout based on tournament characteristics
      const playerCount = params.players?.length || 0
      const isSpecial = params.special || false
      const customTimeout = this.determineTimeout(playerCount, isSpecial, params.level)
      
      log(`Player count: ${playerCount}, Using timeout: ${Math.round(customTimeout/1000)}s`, 'info')
      
      updateStep('validate', 'Tournament parameters validated', 'completed')
      updateStep('prepare', 'Preparing algorithm request', 'running')

      const requestBody: any = {
        tournamentId: params.tournamentId,
        special: params.special || false,
        schedulingPreference: params.schedulingPreference || 'weekend'
      }

      if (!requestBody.special && params.level) {
        requestBody.level = params.level
        log(`Added level parameter for regular tournament: ${params.level}`, 'info')
      } else if (requestBody.special) {
        log('Special tournament mode - level parameter not sent to algorithm', 'info')
      }

      if (params.players && params.players.length > 0) {
        log(`Algorithm will fetch ${params.players.length} players from database`, 'info')
      }

      updateStep('prepare', 'Request prepared successfully', 'completed')
      updateStep('connect', 'Connecting to algorithm service', 'running')

      log('Connecting to algorithm service...', 'info')
      const response = await this.makeRequestWithProgress('/initialize-tournament', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }, progressCallback, customTimeout)

      updateStep('connect', 'Connected to algorithm service', 'completed')
      updateStep('process', 'Processing algorithm response', 'running')

      const result = await this.processAlgorithmResponse(response, progressCallback)
      
      if (result.success) {
        log(`Successfully generated ${result.matches?.length || 0} matches`, 'success')
        updateStep('process', 'Algorithm processing completed', 'completed')
      } else {
        updateStep('process', 'Algorithm processing failed', 'error')
        log(`Algorithm error: ${result.error}`, 'error')
      }
      
      return result
    } catch (error) {
      updateStep('process', 'Tournament initialization failed', 'error')
      log(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      return this.handleAlgorithmError(error, 'initialize', params.tournamentId)
    }
  }

  async generateCommunityRound(
    request: AlgorithmRoundRequest, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmRoundResponse> {
    const log = progressCallback?.onLog || (() => {})
    const updateStep = progressCallback?.onStepUpdate || (() => {})

    try {
      updateStep('validate', 'Validating round request', 'running')
      log('Starting community round generation', 'info')
      
      const requestBody: any = {
        tournamentId: request.tournamentId
      }
      
      if (request.communityId) {
        requestBody.communityId = request.communityId
        log(`Community ID: ${request.communityId}`, 'info')
      }
      
      if (request.completedMatches && request.completedMatches.length > 0) {
        requestBody.completedMatches = request.completedMatches
        log(`Completed matches: ${request.completedMatches.length}`, 'info')
      }

      updateStep('validate', 'Request validated', 'completed')
      updateStep('connect', 'Connecting to algorithm service', 'running')

      log('Sending round generation request...', 'info')
      const response = await this.makeRequestWithProgress('/community/next-round', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }, progressCallback)

      updateStep('connect', 'Connected successfully', 'completed')
      updateStep('process', 'Generating round matches', 'running')

      const result = await this.processCommunityResponse(response, progressCallback)
      
      if (result.success) {
        log(`Generated ${result.matches?.length || 0} matches for round ${result.roundNumber}`, 'success')
        updateStep('process', 'Round generation completed', 'completed')
      } else {
        updateStep('process', 'Round generation failed', 'error')
        log(`Round generation error: ${result.error}`, 'error')
      }
      
      return result
    } catch (error) {
      updateStep('process', 'Community round generation failed', 'error')
      log(`Round generation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      return this.handleRoundError(error, 'community', request.tournamentId)
    }
  }

  async checkServiceHealth(progressCallback?: ProgressCallback): Promise<{ 
    healthy: boolean; 
    message: string; 
    responseTime: number 
  }> {
    const log = progressCallback?.onLog || (() => {})
    const updateStep = progressCallback?.onStepUpdate || (() => {})
    
    const startTime = Date.now()
    
    try {
      updateStep('health', 'Checking algorithm service health', 'running')
      log('Testing algorithm service connectivity...', 'info')
      
      const response = await fetch(`${this.baseUrl}/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })

      const responseTime = Date.now() - startTime
      log(`Response time: ${responseTime}ms`, 'info')

      if (response.ok) {
        const data = await response.json()
        const healthy = data.success || false
        
        if (healthy) {
          log('Algorithm service is operational', 'success')
          updateStep('health', 'Service health check passed', 'completed')
        } else {
          log('Algorithm service health check failed', 'warning')
          updateStep('health', 'Service health check failed', 'error')
        }
        
        return {
          healthy,
          message: data.message || 'Algorithm service is operational',
          responseTime
        }
      } else {
        log(`Service returned ${response.status}: ${response.statusText}`, 'error')
        updateStep('health', 'Service health check failed', 'error')
        return {
          healthy: false,
          message: `Service returned ${response.status}: ${response.statusText}`,
          responseTime
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const message = error instanceof Error ? error.message : 'Service unavailable'
      log(`Health check failed: ${message}`, 'error')
      updateStep('health', 'Service health check failed', 'error')
      
      return {
        healthy: false,
        message,
        responseTime
      }
    }
  }

  convertAlgorithmMatches(
    algorithmMatches: AlgorithmMatch[], 
    tournamentId: string,
    createdBy: string,
    progressCallback?: ProgressCallback
  ): MatchCreationData[] {
    const log = progressCallback?.onLog || (() => {})
    const updateStep = progressCallback?.onStepUpdate || (() => {})

    updateStep('convert', 'Converting algorithm matches to application format', 'running')
    log(`Converting ${algorithmMatches.length} algorithm matches...`, 'info')

    const converted = algorithmMatches.map(algMatch => ({
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

    log(`Successfully converted ${converted.length} matches`, 'success')
    updateStep('convert', 'Match conversion completed', 'completed')
    
    return converted
  }

  private determineTimeout(playerCount: number, isSpecial: boolean, level?: string): number {
    // Base timeout decisions
    if (playerCount >= 100) {
      return this.largePlayerSetTimeout // 20 minutes for 100+ players
    }
    
    if (playerCount >= 50) {
      return this.specialTimeout // 15 minutes for 50+ players
    }
    
    if (isSpecial) {
      return this.specialTimeout // 15 minutes for special tournaments
    }
    
    if (level === 'county' || level === 'regional' || level === 'national') {
      return this.countyTimeout // 10 minutes for higher levels
    }
    
    return this.timeout // 1 minute for regular small tournaments
  }

  private async makeRequestWithProgress(
    endpoint: string, 
    options: RequestInit, 
    progressCallback?: ProgressCallback,
    customTimeout?: number
  ): Promise<Response> {
    const log = progressCallback?.onLog || (() => {})
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

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        log(`API attempt ${attempt}/${this.retryAttempts}: ${endpoint}`, 'info')
        const response = await fetch(url, finalOptions)
        
        if (!response.ok) {
          const errorText = await response.text()
          log(`HTTP ${response.status}: ${response.statusText}`, 'error')
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
        }
        
        log(`API call successful on attempt ${attempt}`, 'success')
        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        log(`Attempt ${attempt} failed: ${errorMessage}`, 'warning')
        
        if (attempt === this.retryAttempts) {
          log(`All ${this.retryAttempts} attempts failed`, 'error')
          throw error
        }
        
        // Exponential backoff with jitter
        const baseDelay = this.retryDelay * Math.pow(2, attempt - 1)
        const jitter = Math.random() * 1000 // Add up to 1 second random jitter
        const delay = baseDelay + jitter
        
        log(`Waiting ${Math.round(delay)}ms before retry (exponential backoff)...`, 'info')
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('All retry attempts failed')
  }

  private async processAlgorithmResponse(
    response: Response, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmResponse> {
    const log = progressCallback?.onLog || (() => {})
    
    log('Processing algorithm response...', 'info')
    const data = await response.json()
    
    if (data.totalMatches && data.totalMatches > 0 && (!data.matches || data.matches.length === 0)) {
      log(`Backend generated ${data.totalMatches} matches but did not return them`, 'warning')
      data.metadata = {
        ...data.metadata,
        totalMatchesGenerated: data.totalMatches,
        backendIssue: 'matches_not_returned'
      }
    }
    
    const result = {
      success: data.success || false,
      tournamentId: data.tournamentId || '',
      matches: data.matches || [],
      roundInfo: data.roundInfo,
      winners: data.winners,
      error: data.error,
      message: data.message,
      metadata: data.metadata
    }
    
    log(`Response processed: ${result.success ? 'success' : 'failed'}`, result.success ? 'success' : 'error')
    if (result.matches) {
      log(`Matches returned: ${result.matches.length}`, 'info')
    }
    
    return result
  }

  private async processCommunityResponse(
    response: Response, 
    progressCallback?: ProgressCallback
  ): Promise<AlgorithmRoundResponse> {
    const log = progressCallback?.onLog || (() => {})
    
    log('Processing community round response...', 'info')
    const data = await response.json()
    
    const result = {
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
    
    log(`Community response processed: ${result.success ? 'success' : 'failed'}`, result.success ? 'success' : 'error')
    if (result.matches) {
      log(`Round ${result.roundNumber} matches: ${result.matches.length}`, 'info')
    }
    
    return result
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
    
    if (roundNumber.startsWith('R')) return 'community'
    
    return 'community'
  }
}

export const algorithmServiceWithProgress = new AlgorithmServiceWithProgress()