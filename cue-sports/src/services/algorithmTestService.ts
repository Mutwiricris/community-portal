import { tournamentPlayerService } from './tournamentPlayerService'
import { algorithmService } from './algorithmService'

/**
 * Test service to verify algorithm integration with real players
 */
export class AlgorithmTestService {
  
  /**
   * Test the complete flow: get players → send to algorithm → check response
   */
  async testTournamentInitialization(tournamentId: string, userId: string) {
    try {
      console.log('🧪 Testing tournament initialization flow...')
      console.log('Tournament ID:', tournamentId)
      console.log('User ID:', userId)
      
      // Step 1: Get confirmed registered players
      console.log('\n📋 Step 1: Loading registered players...')
      const players = await tournamentPlayerService.getConfirmedRegisteredPlayers(tournamentId)
      console.log(`✅ Found ${players.length} confirmed players:`)
      players.forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.name} (${player.playerId}) - ${player.communityName}`)
      })
      
      if (players.length === 0) {
        throw new Error('No confirmed players found for testing')
      }
      
      // Step 2: Validate player requirements
      console.log('\n✅ Step 2: Validating player requirements...')
      const validation = tournamentPlayerService.validatePlayerRequirements(players)
      console.log(`Validation result: ${validation.valid ? '✅' : '❌'} ${validation.message}`)
      
      if (!validation.valid) {
        throw new Error(validation.message)
      }
      
      // Step 3: Prepare players for algorithm
      console.log('\n🔄 Step 3: Preparing players for algorithm...')
      const algorithmPlayers = tournamentPlayerService.preparePlayersForAlgorithm(players)
      console.log('Algorithm players data:', algorithmPlayers)
      
      // Step 4: Test algorithm call
      console.log('\n🤖 Step 4: Calling algorithm service...')
      const algorithmResponse = await algorithmService.initializeTournament({
        tournamentId,
        level: 'community',
        schedulingPreference: 'weekend',
        players: algorithmPlayers
      })
      
      console.log('🤖 Algorithm response:', algorithmResponse)
      
      // Step 5: Analyze response
      console.log('\n📊 Step 5: Analyzing algorithm response...')
      if (algorithmResponse.success) {
        console.log('✅ Algorithm initialization successful!')
        if (algorithmResponse.matches) {
          console.log(`✅ Generated ${algorithmResponse.matches.length} matches`)
          algorithmResponse.matches.forEach((match, index) => {
            console.log(`   Match ${index + 1}: ${match.player1?.name || 'Unknown'} vs ${match.player2?.name || 'Unknown'}`)
          })
        } else {
          console.warn('⚠️ No matches in algorithm response')
        }
      } else {
        console.error('❌ Algorithm initialization failed:', algorithmResponse.error)
      }
      
      return {
        success: algorithmResponse.success,
        playersFound: players.length,
        playersValid: validation.valid,
        algorithmResponse,
        matches: algorithmResponse.matches || [],
        testComplete: true
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testComplete: false
      }
    }
  }
  
  /**
   * Quick test to check if players are loading correctly
   */
  async testPlayerLoading(tournamentId: string) {
    try {
      console.log('🧪 Testing player loading for tournament:', tournamentId)
      
      const players = await tournamentPlayerService.getConfirmedRegisteredPlayers(tournamentId)
      const stats = await tournamentPlayerService.getTournamentPlayerStats(tournamentId)
      
      console.log('Player loading results:')
      console.log('- Confirmed players:', players.length)
      console.log('- Total registrations:', stats.total)
      console.log('- Registration breakdown:', stats.byStatus)
      console.log('- Ready for tournament:', stats.readyForTournament)
      
      return {
        playersLoaded: players.length,
        registrationStats: stats,
        players
      }
    } catch (error) {
      console.error('❌ Player loading test failed:', error)
      throw error
    }
  }
  
  /**
   * Test algorithm connectivity
   */
  async testAlgorithmConnectivity() {
    try {
      console.log('🧪 Testing algorithm service connectivity...')
      
      const health = await algorithmService.checkServiceHealth()
      console.log('Algorithm health check:', health)
      
      return health
    } catch (error) {
      console.error('❌ Algorithm connectivity test failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const algorithmTestService = new AlgorithmTestService()