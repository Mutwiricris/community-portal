import { computed } from 'vue'
import { useFirestore } from './useFirestore'
import { Player, defaultPlayerStats } from '@/types/player'
import { orderBy, where } from 'firebase/firestore'

export const usePlayers = () => {
  const {
    documents: players,
    loading,
    error,
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe
  } = useFirestore<Player>('players')

  const activePlayers = computed(() =>
    players.value.filter(p => p.status === 'active')
  )

  const inactivePlayers = computed(() =>
    players.value.filter(p => p.status === 'inactive')
  )

  const archivedPlayers = computed(() =>
    players.value.filter(p => p.status === 'archived')
  )

  const topPlayers = computed(() =>
    [...players.value]
      .filter(p => p.status === 'active')
      .sort((a, b) => b.stats.winRate - a.stats.winRate)
      .slice(0, 10)
  )

  const createPlayer = async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'stats' | 'tournaments' | 'registrationDate'>) => {
    const data = {
      ...playerData,
      stats: defaultPlayerStats,
      tournaments: [],
      registrationDate: new Date(),
      dateOfBirth: playerData.dateOfBirth ? new Date(playerData.dateOfBirth) : undefined
    }
    return await add(data)
  }

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    const updateData = { ...updates }
    if (updates.dateOfBirth) {
      updateData.dateOfBirth = new Date(updates.dateOfBirth)
    }
    return await update(id, updateData)
  }

  const deletePlayer = async (id: string) => {
    return await remove(id)
  }

  const archivePlayer = async (id: string) => {
    return await update(id, { status: 'archived' })
  }

  const activatePlayer = async (id: string) => {
    return await update(id, { status: 'active' })
  }

  const getPlayer = async (id: string) => {
    return await getById(id)
  }

  const loadAllPlayers = async () => {
    return await getAll([orderBy('createdAt', 'desc')])
  }

  const loadPlayersByStatus = async (status: Player['status']) => {
    return await getAll([
      where('status', '==', status),
      orderBy('lastName', 'asc')
    ])
  }

  const updatePlayerStats = async (playerId: string, statsUpdate: Partial<Player['stats']>) => {
    const player = await getById(playerId)
    if (player) {
      const newStats = { ...player.stats, ...statsUpdate }
      
      // Recalculate win rate
      if (newStats.matchesPlayed > 0) {
        newStats.winRate = Math.round((newStats.matchesWon / newStats.matchesPlayed) * 100)
      }
      
      await update(playerId, { stats: newStats })
    }
  }

  const subscribePlayers = () => {
    return subscribe([orderBy('lastName', 'asc')])
  }

  const searchPlayers = (query: string) => {
    if (!query.trim()) return players.value
    
    const searchTerm = query.toLowerCase().trim()
    return players.value.filter(player => 
      player.firstName.toLowerCase().includes(searchTerm) ||
      player.lastName.toLowerCase().includes(searchTerm) ||
      player.email.toLowerCase().includes(searchTerm)
    )
  }

  return {
    players,
    activePlayers,
    inactivePlayers,
    archivedPlayers,
    topPlayers,
    loading,
    error,
    createPlayer,
    updatePlayer,
    deletePlayer,
    archivePlayer,
    activatePlayer,
    getPlayer,
    loadAllPlayers,
    loadPlayersByStatus,
    updatePlayerStats,
    subscribePlayers,
    searchPlayers
  }
}