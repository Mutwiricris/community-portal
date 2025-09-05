import { ref, computed, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'

export function useTournamentRegistrations(tournamentId: string) {
  const registrations = ref<any[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  const currentRegistrations = computed(() => registrations.value.length)

  const loadRegistrations = () => {
    try {
      const db = getFirebaseDb()
      const registrationsRef = collection(db, 'tournament_registrations')
      const q = query(
        registrationsRef,
        where('tournamentId', '==', tournamentId)
      )

      unsubscribe = onSnapshot(q, (snapshot) => {
        registrations.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        loading.value = false
        error.value = null
      }, (err) => {
        console.error('Error loading tournament registrations:', err)
        error.value = 'Failed to load registrations'
        loading.value = false
      })

    } catch (err) {
      console.error('Error setting up registrations listener:', err)
      error.value = 'Failed to initialize registrations listener'
      loading.value = false
    }
  }

  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // Auto-cleanup on unmount
  onUnmounted(cleanup)

  // Start loading when composable is used
  loadRegistrations()

  return {
    registrations,
    currentRegistrations,
    loading,
    error,
    cleanup
  }
}