import { computed } from 'vue'
import { useFirestore } from './useFirestore'
import type { Tournament } from '@/types/tournament'
import { orderBy, where } from 'firebase/firestore'

export const useTournaments = () => {
  const {
    documents: tournaments,
    loading,
    error,
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe
  } = useFirestore<Tournament>('tournaments')

  const upcomingTournaments = computed(() =>
    tournaments.value.filter(t => t.status === 'upcoming')
  )

  const ongoingTournaments = computed(() =>
    tournaments.value.filter(t => t.status === 'ongoing')
  )

  const completedTournaments = computed(() =>
    tournaments.value.filter(t => t.status === 'completed')
  )

  const createTournament = async (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants'>) => {
    const data = {
      ...tournamentData,
      currentParticipants: 0,
      startDate: new Date(tournamentData.startDate),
      endDate: new Date(tournamentData.endDate)
    }
    return await add(data)
  }

  const updateTournament = async (id: string, updates: Partial<Tournament>) => {
    const updateData = { ...updates }
    if (updates.startDate) {
      updateData.startDate = new Date(updates.startDate)
    }
    if (updates.endDate) {
      updateData.endDate = new Date(updates.endDate)
    }
    return await update(id, updateData)
  }

  const deleteTournament = async (id: string) => {
    return await remove(id)
  }

  const getTournament = async (id: string) => {
    return await getById(id)
  }

  const loadAllTournaments = async () => {
    return await getAll([orderBy('createdAt', 'desc')])
  }

  const loadTournamentsByStatus = async (status: Tournament['status']) => {
    return await getAll([
      where('status', '==', status),
      orderBy('startDate', 'asc')
    ])
  }

  const subscribeTournaments = () => {
    return subscribe([orderBy('createdAt', 'desc')])
  }

  return {
    tournaments,
    upcomingTournaments,
    ongoingTournaments,
    completedTournaments,
    loading,
    error,
    createTournament,
    updateTournament,
    deleteTournament,
    getTournament,
    loadAllTournaments,
    loadTournamentsByStatus,
    subscribeTournaments
  }
}