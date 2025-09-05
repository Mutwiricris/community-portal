import { ref, computed } from 'vue'
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from '@/composables/useToast'
import type { UserProfile } from '@/composables/useAuth'

// Simplified user interface - just Firestore data
export interface ExtendedUserProfile extends UserProfile {
  // Keep it simple, just use the base UserProfile
}

export const useUserManagement = () => {
  const { success, error: showError } = useToast()
  
  // State
  const users = ref<ExtendedUserProfile[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const totalUsers = computed(() => users.value.length)
  const adminCount = computed(() => users.value.filter(u => u.userType === 'administrator').length)
  const userCount = computed(() => users.value.filter(u => u.userType === 'user').length)
  
  // Fetch ALL users from Firestore collection
  const fetchAllUsers = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      
      const db = getFirebaseDb()
      const usersCollection = collection(db, 'users')
      
      // Remove ordering to ensure we get ALL documents without any constraints
      const snapshot = await getDocs(usersCollection)
      
      console.log(`Fetched ${snapshot.docs.length} users from Firestore`)
      
      users.value = snapshot.docs.map(doc => {
        const data = doc.data()
        
        // Handle potential missing or malformed data gracefully
        let geographicalContext = undefined
        if (data.geographicalContext) {
          try {
            geographicalContext = {
              ...data.geographicalContext,
              assignedAt: data.geographicalContext?.assignedAt?.toDate ? 
                data.geographicalContext.assignedAt.toDate() : new Date()
            }
          } catch (error) {
            console.warn(`Error processing geographicalContext for user ${doc.id}:`, error)
          }
        }
        
        let updatedAt = new Date()
        if (data.updatedAt) {
          try {
            updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
          } catch (error) {
            console.warn(`Error processing updatedAt for user ${doc.id}:`, error)
          }
        }
        
        return {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'user',
          userType: data.userType || 'user',
          geographicalContext,
          updatedAt
        }
      })
      
      console.log(`Processed ${users.value.length} users`)
      
    } catch (err) {
      console.error('Error fetching users:', err)
      error.value = 'Failed to fetch users from Firestore'
      showError('Failed to fetch users. Please check your permissions.')
    } finally {
      loading.value = false
    }
  }
  
  // Simplified - no sync operations needed since we only use Firestore
  
  // Update user in Firestore
  const updateUser = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
    try {
      const db = getFirebaseDb()
      const userRef = doc(db, 'users', uid)
      
      const updateData = {
        ...updates,
        updatedAt: new Date()
      }
      
      await updateDoc(userRef, updateData)
      success('User updated successfully')
      await fetchAllUsers()
      
    } catch (err) {
      console.error('Error updating user:', err)
      showError('Failed to update user')
      throw err
    }
  }
  
  // Delete user from Firestore
  const deleteUser = async (uid: string): Promise<void> => {
    try {
      const db = getFirebaseDb()
      const userRef = doc(db, 'users', uid)
      
      await deleteDoc(userRef)
      success('User deleted successfully')
      await fetchAllUsers()
      
    } catch (err) {
      console.error('Error deleting user:', err)
      showError('Failed to delete user')
      throw err
    }
  }
  
  // Export user data
  const exportUsers = (): void => {
    const data = users.value.map(user => ({
      'User ID': user.uid,
      'Email': user.email,
      'Display Name': user.displayName || 'N/A',
      'Role': user.userType,
      'Community': user.geographicalContext?.community?.name || 'N/A',
      'County': user.geographicalContext?.county?.name || 'N/A',
      'Region ID': user.geographicalContext?.regionId || 'N/A',
      'Assignment Method': user.geographicalContext?.assignmentMethod || 'N/A',
      'Last Updated': user.updatedAt.toISOString()
    }))
    
    // Convert to CSV
    const headers = Object.keys(data[0] || {})
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          const escaped = String(value).replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      )
    ].join('\n')
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  
  return {
    // State
    users: computed(() => users.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // Computed stats
    totalUsers,
    adminCount,
    userCount,
    
    // Actions
    fetchAllUsers,
    updateUser,
    deleteUser,
    exportUsers
  }
}