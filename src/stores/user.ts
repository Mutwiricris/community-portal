import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const isLoading = ref(false)

  const updateProfile = async (data: {
    displayName?: string
    bio?: string
    emailNotifications?: boolean
    communityUpdates?: boolean
  }) => {
    if (!user.value) return { success: false, error: 'No user logged in' }
    
    try {
      isLoading.value = true
      // TODO: Implement API call to update user profile
      await authStore.updateUserProfile(data)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user.value) return { success: false, error: 'No user logged in' }
    
    try {
      isLoading.value = true
      // TODO: Implement API call to change password
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const deleteAccount = async () => {
    if (!user.value) {
      return { success: false, error: 'No user logged in' }
    }
    
    try {
      isLoading.value = true
      // TODO: Implement API call to delete account
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const exportUserData = async () => {
    if (!user.value) return { success: false, error: 'No user logged in' }
    
    try {
      // TODO: Implement API call to get user data
      const userData = {
        id: user.value.id,
        email: user.value.email,
        displayName: user.value.displayName,
        exportedAt: new Date().toISOString()
      }
      
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `user-data-${user.value.id}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return {
    user,
    isLoading,
    updateProfile,
    changePassword,
    deleteAccount,
    exportUserData
  }
})