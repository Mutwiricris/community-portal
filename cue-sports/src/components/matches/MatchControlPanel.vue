<template>
  <div class="match-control-panel">
    <!-- Match Status Controls -->
    <div class="control-section">
      <h4>Match Controls</h4>
      <div class="control-buttons">
        <Button 
          @click="startMatch" 
          :disabled="match.status !== 'scheduled'" 
          variant="outline"
          size="sm"
        >
          <Play class="h-4 w-4 mr-2" />
          {{ match.status === 'in_progress' ? 'Match Started' : 'Start Match' }}
        </Button>
        
        <Button 
          @click="pauseMatch" 
          :disabled="match.status !== 'in_progress'" 
          variant="outline"
          size="sm"
        >
          <Pause class="h-4 w-4 mr-2" />
          Pause Match
        </Button>
        
        <Button 
          @click="resumeMatch" 
          :disabled="match.status !== 'paused'" 
          variant="outline"
          size="sm"
        >
          <RotateCcw class="h-4 w-4 mr-2" />
          Resume Match
        </Button>
        
        <Button 
          @click="completeMatch" 
          :disabled="match.status !== 'in_progress'" 
          variant="outline"
          size="sm"
        >
          <CheckCircle class="h-4 w-4 mr-2" />
          Complete Match
        </Button>
      </div>
    </div>

    <!-- Live Match Status -->
    <div v-if="isLive" class="live-status-section">
      <div class="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="flex items-center text-red-600">
            <div class="w-3 h-3 bg-red-600 rounded-full animate-pulse mr-2"></div>
            <span class="font-semibold">LIVE MATCH</span>
          </div>
          <span class="text-sm text-red-700">This match is currently being broadcast live</span>
        </div>
        <Button @click="stopLive" variant="outline" size="sm">
          <StopCircle class="h-4 w-4 mr-2" />
          Stop Live
        </Button>
      </div>
    </div>

    <!-- Score Management -->
    <div class="control-section">
      <h4>Score Management</h4>
      
      <!-- Current Score Display -->
      <div class="score-display">
        <div class="player-score">
          <div class="player-info">
            <h5>{{ match.player1Name }}</h5>
            <span class="community">{{ match.player1CommunityId || 'No Community' }}</span>
          </div>
          <div class="score-value">{{ currentScores.player1 }}</div>
        </div>
        
        <div class="vs-divider">VS</div>
        
        <div class="player-score">
          <div class="player-info">
            <h5>{{ match.player2Name || 'BYE' }}</h5>
            <span class="community">{{ match.player2CommunityId || 'No Community' }}</span>
          </div>
          <div class="score-value">{{ currentScores.player2 }}</div>
        </div>
      </div>

      <!-- Score Input -->
      <div class="score-input-section">
        <div class="input-group">
          <label>{{ match.player1Name }} Score</label>
          <div class="score-controls">
            <Button @click="adjustScore('player1', -1)" variant="outline" size="sm" :disabled="currentScores.player1 <= 0">
              <Minus class="h-3 w-3" />
            </Button>
            <input 
              v-model.number="currentScores.player1" 
              type="number" 
              min="0" 
              class="score-input"
              @change="updateScores"
            />
            <Button @click="adjustScore('player1', 1)" variant="outline" size="sm">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div class="input-group">
          <label>{{ match.player2Name || 'Player 2' }} Score</label>
          <div class="score-controls">
            <Button @click="adjustScore('player2', -1)" variant="outline" size="sm" :disabled="currentScores.player2 <= 0">
              <Minus class="h-3 w-3" />
            </Button>
            <input 
              v-model.number="currentScores.player2" 
              type="number" 
              min="0" 
              class="score-input"
              @change="updateScores"
            />
            <Button @click="adjustScore('player2', 1)" variant="outline" size="sm">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Quick Score Buttons -->
      <div class="quick-score-section">
        <h5>Quick Add Points</h5>
        <div class="quick-score-grid">
          <div class="player-quick-scores">
            <span class="player-label">{{ match.player1Name }}</span>
            <div class="point-buttons">
              <Button 
                v-for="points in [1, 2, 3, 5, 10, 15, 25]" 
                :key="`p1-${points}`"
                @click="addQuickPoints('player1', points)"
                variant="outline" 
                size="sm"
              >
                +{{ points }}
              </Button>
            </div>
          </div>
          
          <div class="player-quick-scores">
            <span class="player-label">{{ match.player2Name || 'Player 2' }}</span>
            <div class="point-buttons">
              <Button 
                v-for="points in [1, 2, 3, 5, 10, 15, 25]" 
                :key="`p2-${points}`"
                @click="addQuickPoints('player2', points)"
                variant="outline" 
                size="sm"
              >
                +{{ points }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame/Set Management -->
    <div class="control-section">
      <h4>Frame/Set Management</h4>
      
      <div class="frame-info">
        <div class="current-frame">
          <span>Current Frame: <strong>{{ currentFrame }}</strong></span>
          <span>Best of: <strong>{{ bestOf }}</strong></span>
        </div>
        
        <div class="frame-scores">
          <div class="frame-score">
            <span>{{ match.player1Name }}: {{ frameWins.player1 }} frames</span>
          </div>
          <div class="frame-score">
            <span>{{ match.player2Name || 'Player 2' }}: {{ frameWins.player2 }} frames</span>
          </div>
        </div>
      </div>

      <div class="frame-controls">
        <Button @click="completeFrame" variant="outline" size="sm" :disabled="!canCompleteFrame">
          <Flag class="h-4 w-4 mr-2" />
          Complete Frame
        </Button>
        
        <Button @click="startNewFrame" variant="outline" size="sm" :disabled="!canStartNewFrame">
          <RotateCcw class="h-4 w-4 mr-2" />
          New Frame
        </Button>
        
        <Button @click="resetCurrentFrame" variant="outline" size="sm">
          <RefreshCw class="h-4 w-4 mr-2" />
          Reset Frame
        </Button>
        
        <Button @click="submitMatchResult" variant="default" size="sm" :disabled="props.match.status !== 'in_progress'" class="bg-green-600 hover:bg-green-700">
          <Trophy class="h-4 w-4 mr-2" />
          Submit Result & End Match
        </Button>
      </div>
    </div>

    <!-- Match Notes -->
    <div class="control-section">
      <h4>Match Notes</h4>
      <textarea 
        v-model="matchNotes"
        class="match-notes-input"
        placeholder="Add notes about the match progress, incidents, or other important information..."
        rows="3"
        @blur="saveNotes"
      ></textarea>
    </div>

    <!-- Action History -->
    <div class="control-section">
      <h4>Recent Actions</h4>
      <div class="action-history">
        <div 
          v-for="(action, index) in recentActions" 
          :key="index"
          class="action-item"
        >
          <div class="action-time">{{ formatTime(action.timestamp) }}</div>
          <div class="action-description">{{ action.description }}</div>
          <Button 
            v-if="action.canUndo" 
            @click="undoAction(action)"
            variant="ghost" 
            size="sm"
            class="undo-btn"
          >
            <Undo class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Save Controls -->
    <div class="save-controls">
      <Button @click="saveMatch" :disabled="saving" class="save-btn">
        <Save class="h-4 w-4 mr-2" />
        {{ saving ? 'Saving...' : 'Save Match' }}
      </Button>
      
      <Button @click="autoSaveToggle" variant="outline" size="sm">
        <Clock class="h-4 w-4 mr-2" />
        Auto-save: {{ autoSave ? 'ON' : 'OFF' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  StopCircle,
  Plus, 
  Minus, 
  Flag, 
  RefreshCw, 
  Save, 
  Clock,
  Undo,
  Trophy
} from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import { useMatches } from '@/composables/useMatches'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { liveMatchService } from '@/services/liveMatchService'
import type { Match } from '@/types/match'

interface Props {
  match: Match
  isLive: boolean
}

interface ActionItem {
  timestamp: Date
  description: string
  canUndo: boolean
  undoData?: any
}

const props = defineProps<Props>()

const { updateMatch } = useMatches()
const { success, error: showError } = useToast()
const authStore = useAuthStore()

// State
const saving = ref(false)
const autoSave = ref(true)
const currentScores = ref({
  player1: 0,
  player2: 0
})
const frameWins = ref({
  player1: 0,
  player2: 0
})
const currentFrame = ref(1)
const bestOf = ref(9) // Default best of 9
const matchNotes = ref('')
const recentActions = ref<ActionItem[]>([])

// Computed
const canCompleteFrame = computed(() => {
  return currentScores.value.player1 !== currentScores.value.player2
})

const canStartNewFrame = computed(() => {
  const totalFrames = frameWins.value.player1 + frameWins.value.player2
  const framesToWin = Math.ceil(bestOf.value / 2)
  return frameWins.value.player1 < framesToWin && frameWins.value.player2 < framesToWin
})

// Methods
const startMatch = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  try {
    console.log('🏁 Starting match from control panel:', props.match.id)
    
    // First update match status
    await updateMatch(props.match.id, { 
      status: 'in_progress',
      actualStartTime: new Date()
    }, authStore.user.uid, props.match.tournamentId)
    
    // Automatically make the match live for real-time scoring
    console.log('📺 Making match live for real-time scoring...')
    await liveMatchService.makeMatchLive(props.match.id, authStore.user.uid, {
      shotClockDuration: 60,
      breakTimeDuration: 300,
      autoAdvanceFrames: true,
      allowSpectatorView: true,
      recordDetailedStatistics: true,
      enableShotClock: false, // Disable shot clock for manual scoring
      maxFramesToWin: 5, // Best of 9 (first to 5)
      soundEnabled: false,
      vibrationEnabled: false
    })
    
    addAction('Match started and made live', false)
    success('Match started and is now live!')
    emit('matchUpdated', { status: 'in_progress', isLive: true })
  } catch (err) {
    console.error('❌ Failed to start match:', err)
    showError('Failed to start match')
  }
}

const pauseMatch = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  try {
    console.log('⏸️ Pausing match:', props.match.id)
    await updateMatch(props.match.id, { status: 'paused' }, authStore.user.uid, props.match.tournamentId)
    addAction('Match paused', true)
    success('Match paused')
    emit('matchUpdated', { status: 'paused' })
  } catch (err) {
    console.error('❌ Failed to pause match:', err)
    showError('Failed to pause match')
  }
}

const resumeMatch = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  try {
    console.log('▶️ Resuming match:', props.match.id)
    await updateMatch(props.match.id, { status: 'in_progress' }, authStore.user.uid, props.match.tournamentId)
    addAction('Match resumed', false)
    success('Match resumed')
    emit('matchUpdated', { status: 'in_progress' })
  } catch (err) {
    console.error('❌ Failed to resume match:', err)
    showError('Failed to resume match')
  }
}

const completeMatch = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  try {
    // Determine winner based on frame wins (or current scores if no frames completed)
    let winner: 'player1' | 'player2'
    let winnerName: string
    let loserName: string
    let winnerId: string
    let loserId: string
    
    // Determine winner: Use points as primary determinant, frames only if it's a multi-frame match
    const totalFrames = frameWins.value.player1 + frameWins.value.player2
    
    // If we have actual scores (points), use those as primary determinant
    if (currentScores.value.player1 > 0 || currentScores.value.player2 > 0) {
      winner = currentScores.value.player1 > currentScores.value.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by points:', winner, `(${currentScores.value.player1}-${currentScores.value.player2})`)
    } 
    // Only use frame wins if no point scores available AND it's clearly a multi-frame match
    else if (totalFrames > 1 && (frameWins.value.player1 > 0 || frameWins.value.player2 > 0)) {
      winner = frameWins.value.player1 > frameWins.value.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by frames:', winner, `(${frameWins.value.player1}-${frameWins.value.player2})`)
    }
    // Fallback: if no scores or frames, default to player1
    else {
      winner = 'player1'
      console.log('🏆 Winner defaulted to player1 (no valid scores found)')
    }
    
    winnerId = winner === 'player1' ? props.match.player1Id : props.match.player2Id
    loserId = winner === 'player1' ? props.match.player2Id : props.match.player1Id
    winnerName = winner === 'player1' ? props.match.player1Name : (props.match.player2Name || 'Player 2')
    loserName = winner === 'player1' ? (props.match.player2Name || 'Player 2') : props.match.player1Name
    
    // Show confirmation with winner details
    const confirmMessage = `Complete match with ${winnerName} as winner?\n\nFinal Score:\n${props.match.player1Name}: ${currentScores.value.player1} points (${frameWins.value.player1} frames)\n${props.match.player2Name || 'Player 2'}: ${currentScores.value.player2} points (${frameWins.value.player2} frames)`
    
    if (!confirm(confirmMessage)) return
    
    console.log('🏆 Completing match:', props.match.id, 'Winner:', winnerId, `(${winnerName})`)
    
    // Calculate total match duration
    const matchStartTime = props.match.actualStartTime ? new Date(props.match.actualStartTime) : new Date()
    const matchEndTime = new Date()
    const matchDuration = Math.floor((matchEndTime.getTime() - matchStartTime.getTime()) / 1000 / 60) // in minutes
    
    // If match is live, complete it through live match service first
    if (props.match.status === 'in_progress') {
      console.log('📺 Completing live match...')
      await liveMatchService.completeMatch(props.match.id, winnerId, authStore.user.uid)
    }
    
    // Prepare comprehensive match completion data
    const completionData = {
      status: 'completed' as const,
      actualEndTime: matchEndTime,
      winnerId,
      winnerName,
      loserId,
      loserName,
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2,
      player1FrameWins: frameWins.value.player1,
      player2FrameWins: frameWins.value.player2,
      totalFramesPlayed: frameWins.value.player1 + frameWins.value.player2,
      matchDurationMinutes: matchDuration,
      resultSubmittedAt: matchEndTime,
      resultSubmittedBy: authStore.user.uid,
      adminNotes: matchNotes.value || `Match completed. Winner: ${winnerName} (${winner === 'player1' ? currentScores.value.player1 : currentScores.value.player2} points, ${winner === 'player1' ? frameWins.value.player1 : frameWins.value.player2} frames)`
    }
    
    // Update the main match document with all completion data
    await updateMatch(props.match.id, completionData, authStore.user.uid, props.match.tournamentId)
    
    // Update local state for immediate UI feedback
    Object.assign(props.match, completionData)
    
    addAction(`Match completed - Winner: ${winnerName}`, false)
    success(`🏆 Match completed! Winner: ${winnerName} (${winner === 'player1' ? currentScores.value.player1 : currentScores.value.player2} points, ${winner === 'player1' ? frameWins.value.player1 : frameWins.value.player2} frames)`)
    emit('matchUpdated', { 
      status: 'completed', 
      isLive: false,
      winnerId,
      winnerName,
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2
    })
  } catch (err) {
    console.error('❌ Failed to complete match:', err)
    showError('Failed to complete match')
  }
}

const stopLive = async () => {
  try {
    await liveMatchService.stopLiveMatch(props.match.id)
    addAction('Live broadcast stopped', false)
    success('Live broadcast stopped')
    emit('matchUpdated', { isLive: false })
  } catch (err) {
    showError('Failed to stop live broadcast')
  }
}

const adjustScore = (player: 'player1' | 'player2', points: number) => {
  const newScore = Math.max(0, currentScores.value[player] + points)
  currentScores.value[player] = newScore
  
  addAction(`${points > 0 ? 'Added' : 'Removed'} ${Math.abs(points)} point(s) ${points > 0 ? 'to' : 'from'} ${player === 'player1' ? props.match.player1Name : props.match.player2Name}`, true, {
    player,
    points: -points
  })
  
  // For in-progress matches, immediately update live scoring for real-time updates
  if (props.match.status === 'in_progress' && authStore.user?.uid) {
    console.log('📺 Real-time score update:', player, newScore)
    liveMatchService.updateLiveScore(props.match.id, {
      frameNumber: currentFrame.value,
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2,
      isComplete: false
    }, authStore.user.uid).catch(err => {
      console.warn('⚠️ Live score update failed:', err)
    })
  }
  
  if (autoSave.value) {
    saveMatch()
  }
}

const addQuickPoints = (player: 'player1' | 'player2', points: number) => {
  adjustScore(player, points)
}

const updateScores = () => {
  if (autoSave.value) {
    saveMatch()
  }
}

const completeFrame = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  const winner = currentScores.value.player1 > currentScores.value.player2 ? 'player1' : 'player2'
  frameWins.value[winner]++
  
  try {
    // If match is in progress, complete the frame in live match service
    if (props.match.status === 'in_progress') {
      console.log('📺 Completing frame in live match...')
      await liveMatchService.endFrame(props.match.id, currentFrame.value, winner, authStore.user.uid)
    }
    
    addAction(`Frame ${currentFrame.value} completed. Winner: ${winner === 'player1' ? props.match.player1Name : props.match.player2Name}`, true, {
      frameNumber: currentFrame.value,
      scores: { ...currentScores.value },
      winner
    })
    
    currentFrame.value++
    currentScores.value = { player1: 0, player2: 0 }
    
    if (autoSave.value) {
      saveMatch()
    }
    
    success(`Frame completed! Winner: ${winner === 'player1' ? props.match.player1Name : props.match.player2Name}`)
  } catch (err) {
    console.error('❌ Failed to complete frame:', err)
    showError('Failed to complete frame')
  }
}

const startNewFrame = () => {
  currentFrame.value++
  currentScores.value = { player1: 0, player2: 0 }
  addAction(`Started frame ${currentFrame.value}`, false)
  
  if (autoSave.value) {
    saveMatch()
  }
}

const resetCurrentFrame = () => {
  if (!confirm('Are you sure you want to reset the current frame scores?')) return
  
  addAction(`Reset frame ${currentFrame.value} scores`, true, {
    scores: { ...currentScores.value }
  })
  
  currentScores.value = { player1: 0, player2: 0 }
  
  if (autoSave.value) {
    saveMatch()
  }
}

const saveNotes = () => {
  if (autoSave.value) {
    saveMatch()
  }
}

const saveMatch = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required to save match')
    return
  }
  
  saving.value = true
  try {
    console.log('💾 Saving match scores:', props.match.id, {
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2
    })
    
    // If match is in progress, update live scoring in real-time
    if (props.match.status === 'in_progress') {
      console.log('📺 Updating live match scores...')
      
      // Update live match with current frame scores
      await liveMatchService.updateLiveScore(props.match.id, {
        frameNumber: currentFrame.value,
        player1Score: currentScores.value.player1,
        player2Score: currentScores.value.player2,
        isComplete: false
      }, authStore.user.uid)
      
      console.log('✅ Live scores updated in real-time')
    }
    
    // Also update the main match document
    await updateMatch(props.match.id, {
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2,
      adminNotes: matchNotes.value
    }, authStore.user.uid, props.match.tournamentId)
    
    if (!autoSave.value) {
      success('Match saved and updated live')
    }
    console.log('✅ Match saved successfully')
  } catch (err) {
    console.error('❌ Failed to save match:', err)
    showError('Failed to save match')
  } finally {
    saving.value = false
  }
}

const autoSaveToggle = () => {
  autoSave.value = !autoSave.value
  if (autoSave.value) {
    success('Auto-save enabled')
  }
}

const addAction = (description: string, canUndo: boolean, undoData?: any) => {
  recentActions.value.unshift({
    timestamp: new Date(),
    description,
    canUndo,
    undoData
  })
  
  // Keep only last 10 actions
  if (recentActions.value.length > 10) {
    recentActions.value = recentActions.value.slice(0, 10)
  }
}

const undoAction = (action: ActionItem) => {
  if (!action.canUndo || !action.undoData) return
  
  // Implement undo logic based on action type
  if (action.undoData.player && action.undoData.points) {
    adjustScore(action.undoData.player, action.undoData.points)
  } else if (action.undoData.scores) {
    currentScores.value = { ...action.undoData.scores }
  }
  
  // Remove the action from history
  const index = recentActions.value.indexOf(action)
  if (index > -1) {
    recentActions.value.splice(index, 1)
  }
  
  success('Action undone')
}

const submitMatchResult = async () => {
  if (!authStore.user?.uid) {
    showError('Authentication required')
    return
  }
  
  try {
    // Determine winner based on current state
    let winner: 'player1' | 'player2'
    let winnerName: string
    let loserName: string
    let winnerId: string
    let loserId: string
    
    // Determine winner: Use points as primary determinant, frames only if it's a multi-frame match
    const totalFrames = frameWins.value.player1 + frameWins.value.player2
    
    // If we have actual scores (points), use those as primary determinant
    if (currentScores.value.player1 > 0 || currentScores.value.player2 > 0) {
      winner = currentScores.value.player1 > currentScores.value.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by points:', winner, `(${currentScores.value.player1}-${currentScores.value.player2})`)
    } 
    // Only use frame wins if no point scores available AND it's clearly a multi-frame match
    else if (totalFrames > 1 && (frameWins.value.player1 > 0 || frameWins.value.player2 > 0)) {
      winner = frameWins.value.player1 > frameWins.value.player2 ? 'player1' : 'player2'
      console.log('🏆 Winner determined by frames:', winner, `(${frameWins.value.player1}-${frameWins.value.player2})`)
    }
    // Fallback: if no scores or frames, default to player1
    else {
      winner = 'player1'
      console.log('🏆 Winner defaulted to player1 (no valid scores found)')
    }
    
    winnerId = winner === 'player1' ? props.match.player1Id : props.match.player2Id
    loserId = winner === 'player1' ? props.match.player2Id : props.match.player1Id
    winnerName = winner === 'player1' ? props.match.player1Name : (props.match.player2Name || 'Player 2')
    loserName = winner === 'player1' ? (props.match.player2Name || 'Player 2') : props.match.player1Name
    
    // Show detailed confirmation
    const resultSummary = `
Submit Final Result:

🏆 WINNER: ${winnerName}
📊 FINAL SCORES:
   ${props.match.player1Name}: ${currentScores.value.player1} points (${frameWins.value.player1} frames)
   ${props.match.player2Name || 'Player 2'}: ${currentScores.value.player2} points (${frameWins.value.player2} frames)

📈 MATCH STATS:
   Total Frames: ${frameWins.value.player1 + frameWins.value.player2}
   Current Frame: ${currentFrame.value}

This will:
✅ End the live match
✅ Submit final result
✅ Complete the match
✅ Save all statistics

Continue?`
    
    if (!confirm(resultSummary)) return
    
    console.log('📝 Submitting match result:', props.match.id, 'Winner:', winnerId, `(${winnerName})`)
    
    // Calculate match duration
    const matchStartTime = props.match.actualStartTime ? new Date(props.match.actualStartTime) : new Date()
    const matchEndTime = new Date()
    const matchDuration = Math.floor((matchEndTime.getTime() - matchStartTime.getTime()) / 1000 / 60)
    
    // First: Complete frame if there's an active one with scores
    if (currentScores.value.player1 > 0 || currentScores.value.player2 > 0) {
      console.log('📝 Completing current frame before final submission...')
      const frameWinner = currentScores.value.player1 > currentScores.value.player2 ? 'player1' : 'player2'
      frameWins.value[frameWinner]++
      
      if (props.match.status === 'in_progress') {
        await liveMatchService.endFrame(props.match.id, currentFrame.value, frameWinner, authStore.user.uid)
      }
    }
    
    // Second: Complete live match with comprehensive statistics
    if (props.match.status === 'in_progress') {
      console.log('📺 Completing live match...')
      await liveMatchService.completeMatch(props.match.id, winnerId, authStore.user.uid)
    }
    
    // Third: Submit comprehensive result to main match document
    const finalResult = {
      status: 'completed' as const,
      actualEndTime: matchEndTime,
      winnerId,
      winnerName,
      loserId,
      loserName,
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2,
      player1FrameWins: frameWins.value.player1,
      player2FrameWins: frameWins.value.player2,
      totalFramesPlayed: frameWins.value.player1 + frameWins.value.player2,
      matchDurationMinutes: matchDuration,
      resultSubmittedAt: matchEndTime,
      resultSubmittedBy: authStore.user.uid,
      adminNotes: matchNotes.value || `Final Result: ${winnerName} wins ${winner === 'player1' ? currentScores.value.player1 : currentScores.value.player2}-${winner === 'player1' ? currentScores.value.player2 : currentScores.value.player1} (${winner === 'player1' ? frameWins.value.player1 : frameWins.value.player2}-${winner === 'player1' ? frameWins.value.player2 : frameWins.value.player1} frames)`
    }
    
    await updateMatch(props.match.id, finalResult, authStore.user.uid, props.match.tournamentId)
    
    // Update local state
    Object.assign(props.match, finalResult)
    
    addAction(`Final result submitted - Winner: ${winnerName}`, false)
    success(`🏆 Match completed! Final Result: ${winnerName} wins ${winner === 'player1' ? currentScores.value.player1 : currentScores.value.player2}-${winner === 'player1' ? currentScores.value.player2 : currentScores.value.player1}`)
    
    emit('matchUpdated', { 
      status: 'completed', 
      isLive: false,
      winnerId,
      winnerName,
      player1Score: currentScores.value.player1,
      player2Score: currentScores.value.player2,
      player1FrameWins: frameWins.value.player1,
      player2FrameWins: frameWins.value.player2
    })
    
  } catch (err) {
    console.error('❌ Failed to submit match result:', err)
    showError('Failed to submit match result')
  }
}

const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Emits
interface Emits {
  (e: 'matchUpdated', data: any): void
}

const emit = defineEmits<Emits>()

// Lifecycle
onMounted(() => {
  // Initialize with current match data
  if (props.match.player1Score) {
    currentScores.value.player1 = props.match.player1Score
  }
  if (props.match.player2Score) {
    currentScores.value.player2 = props.match.player2Score
  }
  if (props.match.adminNotes) {
    matchNotes.value = props.match.adminNotes
  }
})

// Auto-save functionality
let autoSaveInterval: NodeJS.Timeout | null = null

watch(() => autoSave.value, (enabled) => {
  if (enabled) {
    autoSaveInterval = setInterval(saveMatch, 30000) // Auto-save every 30 seconds
  } else if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
})
</script>

<style scoped>
.match-control-panel {
  space-y: 2rem;
}

.control-section {
  margin-bottom: 2rem;
}

.control-section h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.control-section h5 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.live-status-section {
  margin-bottom: 2rem;
}

.score-display {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.player-score {
  text-align: center;
}

.player-info h5 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.community {
  font-size: 0.875rem;
  color: #64748b;
}

.score-value {
  font-size: 3rem;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1;
  margin-top: 0.5rem;
}

.vs-divider {
  font-size: 1.5rem;
  font-weight: 700;
  color: #64748b;
  text-align: center;
}

.score-input-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.score-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.score-input {
  width: 80px;
  padding: 0.5rem;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 600;
}

.score-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.quick-score-section {
  margin-bottom: 1.5rem;
}

.quick-score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.player-quick-scores {
  text-align: center;
}

.player-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.75rem;
}

.point-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.frame-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f1f5f9;
  border-radius: 6px;
}

.current-frame {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.frame-scores {
  text-align: right;
}

.frame-score {
  font-size: 0.875rem;
  color: #64748b;
}

.frame-controls {
  display: flex;
  gap: 0.75rem;
}

.match-notes-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  resize: vertical;
}

.match-notes-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-history {
  max-height: 200px;
  overflow-y: auto;
  space-y: 0.5rem;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
  font-size: 0.875rem;
}

.action-time {
  font-weight: 500;
  color: #64748b;
  min-width: 60px;
}

.action-description {
  flex: 1;
  color: #374151;
  margin-left: 0.75rem;
}

.undo-btn {
  padding: 0.25rem;
  height: auto;
}

.save-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.save-btn {
  min-width: 120px;
}

@media (max-width: 1024px) {
  .score-display {
    grid-template-columns: 1fr;
    gap: 1rem;
    text-align: center;
  }
  
  .vs-divider {
    order: -1;
    margin: 1rem 0;
  }
  
  .score-input-section,
  .quick-score-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .frame-info {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .control-buttons,
  .frame-controls {
    justify-content: center;
  }
}
</style>