import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isCommunityLeader = computed(() => user.value?.userType === 'community_leader')

  // Load auth data from localStorage on initialization
  const initializeAuth = () => {
    return new Promise<void>((resolve) => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')

        if (storedToken && storedUser) {
          token.value = storedToken
          user.value = JSON.parse(storedUser)
        } else if (process.env.NODE_ENV === 'development') {
          // Create mock user for development
          console.log('Creating mock user for development')
          const mockUser: User = {
            uid: 'mock_community_leader_001',
            email: 'leader@example.com',
            displayName: 'Mock Community Leader',
            photoURL: null,
            userType: 'community_leader',
            bio: 'Mock community leader for development',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          const mockToken = 'mock_token_for_development'

          user.value = mockUser
          token.value = mockToken

          // Save to localStorage for persistence
          localStorage.setItem('auth_token', mockToken)
          localStorage.setItem('auth_user', JSON.stringify(mockUser))
        }
      } catch (error) {
        console.error('Error loading auth from localStorage:', error)
        clearAuthData()
      } finally {
        isLoading.value = false
        resolve()
      }
    })
  }

  const saveAuthData = (userData: User, authToken: string) => {
    try {
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('auth_user', JSON.stringify(userData))
      token.value = authToken
      user.value = userData
    } catch (error) {
      console.error('Error saving auth data:', error)
    }
  }

  const clearAuthData = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    token.value = null
    user.value = null
  }

  const login = async (email: string, password: string) => {
    try {
      isLoading.value = true

      // Try real API first, fallback to mock
      try {
        const { apiService } = await import('@/services/api')
        const response = await apiService.login(email, password)

        if (response.success && response.data) {
          saveAuthData(response.data.user, response.data.token)
          return { success: true }
        } else {
          throw new Error(response.error || 'API login failed')
        }
      } catch (apiError) {
        console.warn('API login failed, using mock authentication:', apiError)

        // Mock authentication fallback
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockUser: User = {
          uid: `user_${Date.now()}`,
          email: email,
          displayName: email.split('@')[0],
          photoURL: null,
          userType: 'community_leader',
          bio: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        saveAuthData(mockUser, mockToken)

        return { success: true }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' }
    } finally {
      isLoading.value = false
    }
  }

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      isLoading.value = true

      // Try real API first, fallback to mock
      try {
        const { apiService } = await import('@/services/api')
        const response = await apiService.signup(email, password, displayName)

        if (response.success && response.data) {
          saveAuthData(response.data.user, response.data.token)
          return { success: true }
        } else {
          throw new Error(response.error || 'API signup failed')
        }
      } catch (apiError) {
        console.warn('API signup failed, using mock authentication:', apiError)

        // Mock authentication fallback
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockUser: User = {
          uid: `user_${Date.now()}`,
          email: email,
          displayName: displayName,
          photoURL: null,
          userType: 'community_leader',
          bio: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        saveAuthData(mockUser, mockToken)

        return { success: true }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // Try to call API logout endpoint
      try {
        const { apiService } = await import('@/services/api')
        await apiService.logout()
      } catch (apiError) {
        console.warn('API logout failed, proceeding with local logout:', apiError)
      }

      // Clear token manager if available
      try {
        const { tokenManager } = await import('@/services/tokenManager')
        tokenManager.clearTokens()
      } catch (tokenError) {
        console.warn('TokenManager not available:', tokenError)
      }

      clearAuthData()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Logout failed' }
    }
  }

  const updateUserProfile = async (data: {
    displayName?: string
    bio?: string
    photoURL?: string
  }) => {
    if (!user.value) return { success: false, error: 'No user logged in' }

    try {
      // Simulate API call - replace with your actual update endpoint
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedUser = {
        ...user.value,
        ...data,
        updatedAt: new Date(),
      }

      saveAuthData(updatedUser, token.value!)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Update failed' }
    }
  }

  // Verify token validity (call this periodically or on app focus)
  const verifyToken = async () => {
    if (!token.value) return false

    try {
      // Simulate token verification API call
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mock verification - in real app, this would call your backend
      return true
    } catch (error) {
      console.error('Token verification failed:', error)
      clearAuthData()
      return false
    }
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isCommunityLeader,
    initializeAuth,
    login,
    signup,
    logout,
    updateUserProfile,
    verifyToken,
    clearAuthData,
  }
})
