import { 
  collection, 
  doc, 
  getDoc,
  onSnapshot, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
  type DocumentSnapshot,
  Timestamp
} from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import type { 
  LiveMatchState, 
  FrameUpdate, 
  LiveMatchEvent, 
  LiveMatchStats,
  LiveMatchSubscription,
  LiveMatchError,
  Match,
  Frame,
  FrameBreak,
  FrameFoul,
  LiveMatchSettings,
  TimerState
} from '@/types/match'

export class LiveMatchService {
  private db = getFirebaseDb()
  private activeSubscriptions = new Map<string, Unsubscribe>()

  /**
   * Get live match state by ID
   */
  async getLiveMatchState(matchId: string): Promise<LiveMatchState | null> {
    try {
      const liveMatchRef = doc(this.db, 'liveMatches', matchId)
      const docSnap = await getDoc(liveMatchRef)
      
      if (docSnap.exists()) {
        return docSnap.data() as LiveMatchState
      }
      
      return null
    } catch (error) {
      console.error('Error getting live match state:', error)
      return null
    }
  }

  /**
   * Get list of currently live match IDs
   */
  async getLiveMatchIds(): Promise<string[]> {
    try {
      const liveStatesRef = collection(this.db, 'liveMatchStates')
      const q = query(liveStatesRef, where('isLive', '==', true))
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => doc.id)
    } catch (error) {
      console.error('Error getting live match IDs:', error)
      return []
    }
  }

  /**
   * Stop a live match
   */
  async stopLiveMatch(matchId: string): Promise<void> {
    try {
      const liveStateRef = doc(this.db, 'liveMatchStates', matchId)
      await updateDoc(liveStateRef, {
        isLive: false,
        stoppedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // Clean up subscription if exists
      const subscription = this.activeSubscriptions.get(matchId)
      if (subscription) {
        subscription()
        this.activeSubscriptions.delete(matchId)
      }
    } catch (error) {
      console.error('Error stopping live match:', error)
      throw new LiveMatchError('Failed to stop live match', 'STOP_FAILED')
    }
  }

  /**
   * Initialize a match for live scoring
   */
  async makeMatchLive(
    matchId: string, 
    userId: string, 
    settings: Partial<LiveMatchSettings> = {}
  ): Promise<LiveMatchState> {
    try {
      const defaultSettings: LiveMatchSettings = {
        shotClockDuration: 60,
        shotClockWarningTime: 15,
        breakTimeDuration: 900, // 15 minutes
        autoAdvanceFrames: true,
        allowSpectatorView: true,
        recordDetailedStatistics: true,
        enableShotClock: true,
        maxFramesToWin: 3, // First to 3 frames
        soundEnabled: true,
        vibrationEnabled: false,
        ...settings
      }

      const liveMatchState: LiveMatchState = {
        matchId,
        tournamentId: '', // Will be populated from match document
        currentFrame: 1,
        totalFrames: 0,
        frames: [],
        shotClock: defaultSettings.shotClockDuration,
        matchTimer: 0,
        breakTimer: null,
        isOnBreak: false,
        isPaused: false,
        pauseReason: null,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId,
        scorekeeperId: userId,
        spectatorCount: 0,
        isLive: true,
        settings: defaultSettings
      }

      // Create initial frame
      const initialFrame: Frame = {
        frameNumber: 1,
        player1Score: 0,
        player2Score: 0,
        winner: null,
        startTime: Timestamp.now(),
        endTime: null,
        duration: null,
        breaks: [],
        fouls: [],
        isComplete: false,
        maxBreak: 0,
        totalPots: 0
      }

      liveMatchState.frames = [initialFrame]

      // Get tournament ID from match document
      const matchDoc = await this.getMatchDocument(matchId)
      if (matchDoc) {
        liveMatchState.tournamentId = matchDoc.tournamentId
      }

      // Save to Firestore
      await setDoc(doc(this.db, 'liveMatches', matchId), liveMatchState)

      // Update match status to in_progress using match service
      try {
        const { matchService } = await import('./matchService')
        await matchService.updateMatch(matchId, {
          status: 'in_progress' as const,
          actualStartTime: new Date()
        }, userId)
        console.log('✅ Match status updated to in_progress')
      } catch (updateError) {
        console.warn('⚠️ Could not update match status:', updateError)
        // Continue anyway as the live match state is more important
      }

      // Log event
      await this.logEvent(matchId, {
        type: 'match_start',
        frameNumber: 1,
        playerId: null,
        playerName: null,
        data: { reason: 'Match made live' },
        triggeredBy: userId,
        description: 'Match started and made live'
      })

      return liveMatchState

    } catch (error) {
      console.error('Error making match live:', error)
      throw new LiveMatchError({
        code: 'INVALID_UPDATE',
        message: `Failed to make match live: ${error}`,
        timestamp: Timestamp.now(),
        matchId,
        userId,
        recoverable: true,
        retryable: true
      })
    }
  }

  /**
   * Subscribe to live match updates
   */
  subscribeToLiveMatch(
    matchId: string, 
    callback: (state: LiveMatchState | null, error?: LiveMatchError) => void
  ): Unsubscribe {
    try {
      const unsubscribe = onSnapshot(
        doc(this.db, 'liveMatches', matchId),
        (snapshot: DocumentSnapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as LiveMatchState
            callback(data)
          } else {
            callback(null)
          }
        },
        (error) => {
          const liveError: LiveMatchError = {
            code: 'CONNECTION_LOST',
            message: `Real-time subscription error: ${error.message}`,
            timestamp: Timestamp.now(),
            matchId,
            userId: 'unknown',
            recoverable: true,
            retryable: true
          }
          callback(null, liveError)
        }
      )

      this.activeSubscriptions.set(matchId, unsubscribe)
      return unsubscribe

    } catch (error) {
      console.error('Error subscribing to live match:', error)
      throw new Error(`Failed to subscribe to live match: ${error}`)
    }
  }

  /**
   * Update live score for current frame
   */
  async updateLiveScore(
    matchId: string, 
    frameUpdate: FrameUpdate, 
    userId: string
  ): Promise<void> {
    try {
      // Get match document info before transaction for real-time updates
      const matchDocument = await this.getMatchDocument(matchId)
      
      await runTransaction(this.db, async (transaction) => {
        const liveMatchRef = doc(this.db, 'liveMatches', matchId)
        const liveMatchDoc = await transaction.get(liveMatchRef)

        if (!liveMatchDoc.exists()) {
          throw new Error('Live match not found')
        }

        const currentState = liveMatchDoc.data() as LiveMatchState
        const frameIndex = currentState.frames.findIndex(f => f.frameNumber === frameUpdate.frameNumber)

        if (frameIndex === -1) {
          throw new Error('Frame not found')
        }

        // Update frame data
        const updatedFrame = { ...currentState.frames[frameIndex] }
        
        if (frameUpdate.player1Score !== undefined) {
          updatedFrame.player1Score = frameUpdate.player1Score
        }
        
        if (frameUpdate.player2Score !== undefined) {
          updatedFrame.player2Score = frameUpdate.player2Score
        }

        if (frameUpdate.winner !== undefined) {
          updatedFrame.winner = frameUpdate.winner
        }

        if (frameUpdate.isComplete !== undefined) {
          updatedFrame.isComplete = frameUpdate.isComplete
          if (frameUpdate.isComplete) {
            updatedFrame.endTime = Timestamp.now()
            updatedFrame.duration = calculateDuration(updatedFrame.startTime, updatedFrame.endTime)
          }
        }

        // Add break if provided
        if (frameUpdate.break) {
          const breakRecord: FrameBreak = {
            id: `break_${Date.now()}`,
            timestamp: Timestamp.now(),
            frameNumber: frameUpdate.frameNumber,
            isMaximumBreak: frameUpdate.break.breakValue >= 147,
            potSequence: frameUpdate.break.potSequence || [],
            ...frameUpdate.break
          }
          updatedFrame.breaks.push(breakRecord)
          updatedFrame.maxBreak = Math.max(updatedFrame.maxBreak, breakRecord.breakValue)
        }

        // Add foul if provided
        if (frameUpdate.foul) {
          const foulRecord: FrameFoul = {
            id: `foul_${Date.now()}`,
            timestamp: Timestamp.now(),
            frameNumber: frameUpdate.frameNumber,
            description: frameUpdate.foul.description || null,
            ...frameUpdate.foul
          }
          updatedFrame.fouls.push(foulRecord)
        }

        // Update frames array
        const updatedFrames = [...currentState.frames]
        updatedFrames[frameIndex] = updatedFrame

        // Calculate current match scores for real-time updates
        const currentFrame = updatedFrame
        const completedFrames = updatedFrames.filter(f => f.isComplete)
        const frameWins = {
          player1: completedFrames.filter(f => f.winner === 'player1').length,
          player2: completedFrames.filter(f => f.winner === 'player2').length
        }

        // Update live match state
        const updatedState: Partial<LiveMatchState> = {
          frames: updatedFrames,
          lastUpdateTime: Timestamp.now(),
          lastUpdateBy: userId
        }

        transaction.update(liveMatchRef, updatedState)

        // CRITICAL: Also update the main match document in real-time
        if (matchDocument) {
          try {
            let matchDocRef: any
            if (matchDocument.tournamentId) {
              matchDocRef = doc(this.db, 'tournaments', matchDocument.tournamentId, 'matches', matchId)
            } else {
              matchDocRef = doc(this.db, 'matches', matchId)
            }

            // Update match document with current scores and frame wins in real-time
            const matchUpdates = {
              player1Score: currentFrame.player1Score,
              player2Score: currentFrame.player2Score,
              player1FrameWins: frameWins.player1,
              player2FrameWins: frameWins.player2,
              totalFramesPlayed: frameWins.player1 + frameWins.player2,
              updatedAt: Timestamp.now()
            }

            transaction.update(matchDocRef, matchUpdates)
            console.log('📊 Real-time match document updated:', matchUpdates)
          } catch (matchUpdateError) {
            console.warn('⚠️ Could not update match document in real-time:', matchUpdateError)
            // Continue with live match update even if match document update fails
          }
        }
      })

      // Log the update event
      await this.logEvent(matchId, {
        type: 'score_update',
        frameNumber: frameUpdate.frameNumber,
        playerId: null,
        playerName: null,
        data: {
          previousScore: frameUpdate.player1Score, // This should be improved to track previous vs new
          newScore: frameUpdate.player1Score
        },
        triggeredBy: userId,
        description: `Score updated for frame ${frameUpdate.frameNumber}`
      })

    } catch (error) {
      console.error('Error updating live score:', error)
      throw new LiveMatchError({
        code: 'INVALID_UPDATE',
        message: `Failed to update score: ${error}`,
        timestamp: Timestamp.now(),
        matchId,
        userId,
        recoverable: true,
        retryable: true
      })
    }
  }

  /**
   * Start a break period
   */
  async startBreak(matchId: string, duration: number, userId: string): Promise<void> {
    try {
      const updateData: Partial<LiveMatchState> = {
        isOnBreak: true,
        breakTimer: duration,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId
      }

      await updateDoc(doc(this.db, 'liveMatches', matchId), updateData)

      await this.logEvent(matchId, {
        type: 'break_start',
        frameNumber: null,
        playerId: null,
        playerName: null,
        data: { reason: 'Break started', duration },
        triggeredBy: userId,
        description: `Break started for ${duration} seconds`
      })

    } catch (error) {
      console.error('Error starting break:', error)
      throw new Error(`Failed to start break: ${error}`)
    }
  }

  /**
   * End current break
   */
  async endBreak(matchId: string, userId: string): Promise<void> {
    try {
      const updateData: Partial<LiveMatchState> = {
        isOnBreak: false,
        breakTimer: null,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId
      }

      await updateDoc(doc(this.db, 'liveMatches', matchId), updateData)

      await this.logEvent(matchId, {
        type: 'break_end',
        frameNumber: null,
        playerId: null,
        playerName: null,
        data: { reason: 'Break ended' },
        triggeredBy: userId,
        description: 'Break period ended'
      })

    } catch (error) {
      console.error('Error ending break:', error)
      throw new Error(`Failed to end break: ${error}`)
    }
  }

  /**
   * End current frame and optionally start next frame
   */
  async endFrame(matchId: string, frameNumber: number, winner: string, userId: string): Promise<void> {
    try {
      // Get match document info before transaction for real-time updates
      const matchDocument = await this.getMatchDocument(matchId)
      
      await runTransaction(this.db, async (transaction) => {
        const liveMatchRef = doc(this.db, 'liveMatches', matchId)
        const liveMatchDoc = await transaction.get(liveMatchRef)

        if (!liveMatchDoc.exists()) {
          throw new Error('Live match not found')
        }

        const currentState = liveMatchDoc.data() as LiveMatchState
        const frameIndex = currentState.frames.findIndex(f => f.frameNumber === frameNumber)

        if (frameIndex === -1) {
          throw new Error('Frame not found')
        }

        // Complete current frame
        const updatedFrames = [...currentState.frames]
        updatedFrames[frameIndex] = {
          ...updatedFrames[frameIndex],
          winner,
          isComplete: true,
          endTime: Timestamp.now(),
          duration: calculateDuration(updatedFrames[frameIndex].startTime, Timestamp.now())
        }

        // Check if match should continue
        const player1Frames = updatedFrames.filter(f => f.winner === currentState.frames[0]?.player1Score !== undefined ? 'player1' : null).length
        const player2Frames = updatedFrames.filter(f => f.winner === currentState.frames[0]?.player2Score !== undefined ? 'player2' : null).length
        const maxFrames = currentState.settings.maxFramesToWin

        let updatedState: Partial<LiveMatchState> = {
          frames: updatedFrames,
          lastUpdateTime: Timestamp.now(),
          lastUpdateBy: userId
        }

        // If match continues, create next frame
        if (Math.max(player1Frames, player2Frames) < maxFrames) {
          const nextFrame: Frame = {
            frameNumber: frameNumber + 1,
            player1Score: 0,
            player2Score: 0,
            winner: null,
            startTime: Timestamp.now(),
            endTime: null,
            duration: null,
            breaks: [],
            fouls: [],
            isComplete: false,
            maxBreak: 0,
            totalPots: 0
          }

          updatedFrames.push(nextFrame)
          updatedState.currentFrame = frameNumber + 1
        }

        transaction.update(liveMatchRef, updatedState)

        // CRITICAL: Also update the main match document in real-time
        if (matchDocument) {
          try {
            let matchDocRef: any
            if (matchDocument.tournamentId) {
              matchDocRef = doc(this.db, 'tournaments', matchDocument.tournamentId, 'matches', matchId)
            } else {
              matchDocRef = doc(this.db, 'matches', matchId)
            }

            // Calculate frame wins for real-time updates
            const completedFrames = updatedFrames.filter(f => f.isComplete)
            const frameWins = {
              player1: completedFrames.filter(f => f.winner === 'player1').length,
              player2: completedFrames.filter(f => f.winner === 'player2').length
            }

            // Update match document with current frame wins in real-time
            const matchUpdates = {
              player1FrameWins: frameWins.player1,
              player2FrameWins: frameWins.player2,
              totalFramesPlayed: frameWins.player1 + frameWins.player2,
              updatedAt: Timestamp.now()
            }

            transaction.update(matchDocRef, matchUpdates)
            console.log('🏁 Real-time match document updated after frame end:', matchUpdates)
          } catch (matchUpdateError) {
            console.warn('⚠️ Could not update match document after frame end:', matchUpdateError)
          }
        }
      })

      await this.logEvent(matchId, {
        type: 'frame_end',
        frameNumber,
        playerId: winner,
        playerName: null,
        data: { frameWinner: winner },
        triggeredBy: userId,
        description: `Frame ${frameNumber} completed, winner: ${winner}`
      })

    } catch (error) {
      console.error('Error ending frame:', error)
      throw new Error(`Failed to end frame: ${error}`)
    }
  }

  /**
   * Pause the match
   */
  async pauseMatch(matchId: string, reason: string, userId: string): Promise<void> {
    try {
      const updateData: Partial<LiveMatchState> = {
        isPaused: true,
        pauseReason: reason,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId
      }

      await updateDoc(doc(this.db, 'liveMatches', matchId), updateData)

      await this.logEvent(matchId, {
        type: 'match_pause',
        frameNumber: null,
        playerId: null,
        playerName: null,
        data: { reason },
        triggeredBy: userId,
        description: `Match paused: ${reason}`
      })

    } catch (error) {
      console.error('Error pausing match:', error)
      throw new Error(`Failed to pause match: ${error}`)
    }
  }

  /**
   * Resume the match
   */
  async resumeMatch(matchId: string, userId: string): Promise<void> {
    try {
      const updateData: Partial<LiveMatchState> = {
        isPaused: false,
        pauseReason: null,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId
      }

      await updateDoc(doc(this.db, 'liveMatches', matchId), updateData)

      await this.logEvent(matchId, {
        type: 'match_resume',
        frameNumber: null,
        playerId: null,
        playerName: null,
        data: { reason: 'Match resumed' },
        triggeredBy: userId,
        description: 'Match resumed from pause'
      })

    } catch (error) {
      console.error('Error resuming match:', error)
      throw new Error(`Failed to resume match: ${error}`)
    }
  }

  /**
   * Complete the live match
   */
  async completeMatch(matchId: string, winnerId: string, userId: string): Promise<void> {
    try {
      // Get match document first to find its location
      const matchDocument = await this.getMatchDocument(matchId)
      if (!matchDocument) {
        throw new Error('Match document not found in any collection')
      }

      await runTransaction(this.db, async (transaction) => {
        const liveMatchRef = doc(this.db, 'liveMatches', matchId)
        
        // Use the tournament-specific path for the match
        let matchRef: any
        if (matchDocument.tournamentId) {
          matchRef = doc(this.db, 'tournaments', matchDocument.tournamentId, 'matches', matchId)
        } else {
          matchRef = doc(this.db, 'matches', matchId)
        }

        const liveMatchDoc = await transaction.get(liveMatchRef)
        const matchDoc = await transaction.get(matchRef)

        if (!liveMatchDoc.exists()) {
          throw new Error('Live match document not found')
        }
        
        if (!matchDoc.exists()) {
          throw new Error('Match document not found')
        }

        const liveMatchData = liveMatchDoc.data() as LiveMatchState
        const matchData = matchDoc.data() as Match

        // Calculate final statistics
        const stats = this.calculateMatchStats(liveMatchData)

        // Update match document with final results
        const matchUpdateData = {
          status: 'completed' as const,
          winnerId,
          winnerName: winnerId === matchData.player1Id ? matchData.player1Name : matchData.player2Name,
          loserId: winnerId === matchData.player1Id ? matchData.player2Id : matchData.player1Id,
          loserName: winnerId === matchData.player1Id ? matchData.player2Name : matchData.player1Name,
          actualEndTime: serverTimestamp(),
          resultSubmittedAt: serverTimestamp(),
          resultSubmittedBy: userId,
          updatedAt: serverTimestamp()
        }

        transaction.update(matchRef, matchUpdateData)

        // Mark live match as completed but keep for historical data
        transaction.update(liveMatchRef, {
          isLive: false,
          lastUpdateTime: Timestamp.now(),
          lastUpdateBy: userId
        })

        // Save final statistics
        transaction.set(doc(this.db, 'matchStats', matchId), stats)
      })

      await this.logEvent(matchId, {
        type: 'match_complete',
        frameNumber: null,
        playerId: winnerId,
        playerName: null,
        data: { reason: 'Match completed' },
        triggeredBy: userId,
        description: `Match completed, winner: ${winnerId}`
      })

    } catch (error) {
      console.error('Error completing match:', error)
      throw new Error(`Failed to complete match: ${error}`)
    }
  }

  /**
   * Get live match statistics
   */
  async getLiveMatchStats(matchId: string): Promise<LiveMatchStats | null> {
    try {
      const liveMatchDoc = await this.getLiveMatchDocument(matchId)
      if (!liveMatchDoc) return null

      return this.calculateMatchStats(liveMatchDoc)
    } catch (error) {
      console.error('Error getting live match stats:', error)
      return null
    }
  }

  /**
   * Update timer state
   */
  async updateTimerState(matchId: string, timerState: Partial<TimerState>, userId: string): Promise<void> {
    try {
      const updateData: Partial<LiveMatchState> = {
        shotClock: timerState.shotClock?.timeRemaining || 0,
        matchTimer: timerState.matchTimer?.totalDuration || 0,
        breakTimer: timerState.breakTimer?.timeRemaining || null,
        lastUpdateTime: Timestamp.now(),
        lastUpdateBy: userId
      }

      await updateDoc(doc(this.db, 'liveMatches', matchId), updateData)
    } catch (error) {
      console.error('Error updating timer state:', error)
      throw new Error(`Failed to update timer state: ${error}`)
    }
  }

  /**
   * Clean up subscriptions
   */
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach(unsubscribe => unsubscribe())
    this.activeSubscriptions.clear()
  }

  // Private helper methods

  private async getLiveMatchDocument(matchId: string): Promise<LiveMatchState | null> {
    try {
      const docRef = doc(this.db, 'liveMatches', matchId)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() as LiveMatchState : null
    } catch (error) {
      console.error('Error getting live match document:', error)
      return null
    }
  }

  private async getMatchDocument(matchId: string): Promise<Match | null> {
    try {
      // First try to get tournament ID from live match state
      const liveState = await this.getLiveMatchState(matchId)
      const tournamentId = liveState?.tournamentId
      
      // Try to get match from the match service which checks indexed locations
      const { matchService } = await import('./matchService')
      
      // Use tournament ID if available for more efficient lookup
      if (tournamentId) {
        console.log('🔍 Getting match document with tournament context:', tournamentId)
        return await matchService.getMatch(matchId, tournamentId)
      } else {
        console.log('🔍 Getting match document without tournament context')
        return await matchService.getMatch(matchId)
      }
    } catch (error) {
      console.error('Error getting match document:', error)
      return null
    }
  }

  private async logEvent(matchId: string, eventData: Omit<LiveMatchEvent, 'id' | 'matchId' | 'timestamp'>): Promise<void> {
    try {
      const event: LiveMatchEvent = {
        id: `event_${Date.now()}`,
        matchId,
        timestamp: Timestamp.now(),
        ...eventData
      }

      await addDoc(collection(this.db, 'liveMatchEvents'), event)
    } catch (error) {
      console.error('Error logging event:', error)
      // Don't throw - event logging shouldn't break the main operation
    }
  }

  private calculateMatchStats(liveMatchData: LiveMatchState): LiveMatchStats {
    const frames = liveMatchData.frames
    const completedFrames = frames.filter(f => f.isComplete)
    
    // Initialize player stats
    const player1Stats: any = {
      playerId: 'player1', // This should be replaced with actual player ID
      playerName: 'Player 1', // This should be replaced with actual player name
      framesWon: 0,
      totalScore: 0,
      averageScorePerFrame: 0,
      breaks: [],
      fouls: [],
      highestBreak: 0,
      totalBreakValue: 0,
      breakCount: 0,
      foulCount: 0,
      shotsMissed: 0,
      potSuccess: 0,
      timeAtTable: 0
    }

    const player2Stats: any = { ...player1Stats, playerId: 'player2', playerName: 'Player 2' }

    // Calculate statistics from frames
    completedFrames.forEach(frame => {
      if (frame.winner === 'player1') player1Stats.framesWon++
      if (frame.winner === 'player2') player2Stats.framesWon++
      
      player1Stats.totalScore += frame.player1Score
      player2Stats.totalScore += frame.player2Score
      
      // Process breaks and fouls
      frame.breaks.forEach(breakRecord => {
        if (breakRecord.playerId === 'player1') {
          player1Stats.breaks.push(breakRecord)
          player1Stats.totalBreakValue += breakRecord.breakValue
          player1Stats.highestBreak = Math.max(player1Stats.highestBreak, breakRecord.breakValue)
        } else {
          player2Stats.breaks.push(breakRecord)
          player2Stats.totalBreakValue += breakRecord.breakValue
          player2Stats.highestBreak = Math.max(player2Stats.highestBreak, breakRecord.breakValue)
        }
      })

      frame.fouls.forEach(foul => {
        if (foul.playerId === 'player1') {
          player1Stats.fouls.push(foul)
        } else {
          player2Stats.fouls.push(foul)
        }
      })
    })

    // Calculate averages
    const completedFrameCount = Math.max(completedFrames.length, 1)
    player1Stats.averageScorePerFrame = player1Stats.totalScore / completedFrameCount
    player2Stats.averageScorePerFrame = player2Stats.totalScore / completedFrameCount
    player1Stats.breakCount = player1Stats.breaks.length
    player2Stats.breakCount = player2Stats.breaks.length
    player1Stats.foulCount = player1Stats.fouls.length
    player2Stats.foulCount = player2Stats.fouls.length

    const totalDuration = completedFrames.reduce((sum, frame) => sum + (frame.duration || 0), 0)
    const averageFrameDuration = totalDuration / completedFrameCount

    return {
      matchId: liveMatchData.matchId,
      player1Stats,
      player2Stats,
      matchDuration: liveMatchData.matchTimer,
      averageFrameDuration,
      totalBreaks: player1Stats.breakCount + player2Stats.breakCount,
      totalFouls: player1Stats.foulCount + player2Stats.foulCount,
      highestBreak: Math.max(player1Stats.highestBreak, player2Stats.highestBreak) > 0 
        ? (player1Stats.highestBreak > player2Stats.highestBreak ? player1Stats.breaks.find((b: any) => b.breakValue === player1Stats.highestBreak) : player2Stats.breaks.find((b: any) => b.breakValue === player2Stats.highestBreak))
        : null,
      frameHistory: frames,
      lastUpdated: Timestamp.now()
    }
  }
}

// Helper function to calculate duration between timestamps
function calculateDuration(startTime: Timestamp, endTime: Timestamp): number {
  return Math.floor((endTime.seconds - startTime.seconds))
}

// Export singleton instance
export const liveMatchService = new LiveMatchService()