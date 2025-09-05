import { defineStore } from 'pinia'
import { useAuth } from '@/composables/useAuth'

export const useAuthStore = defineStore('auth', () => {
  const {
    user,
    userProfile,
    loading,
    initialized,
    error,
    errorDetails,
    isAuthenticated,
    isAdmin,
    initAuth,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    clearErrors,
    cleanup
  } = useAuth()

  return {
    // State
    user,
    userProfile,
    loading,
    initialized,
    error,
    errorDetails,
    isAuthenticated,
    isAdmin,
    
    // Actions
    initAuth,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    clearErrors,
    cleanup
  }
})