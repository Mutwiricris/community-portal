import { ref, computed } from 'vue'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  getIdToken,
  type User,
  type Unsubscribe,
  type IdTokenResult
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseDb, checkFirebaseHealth } from '@/firebase/config'
import { handleFirebaseError, logFirebaseError, retryOperation } from '@/firebase/errorHandler'
import { useToast } from '@/composables/useToast'

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  role?: 'admin' | 'user'
  userType: 'administrator' | 'user' | 'community_admin' | 'player'
  geographicalContext?: {
    assignedAt: Date
    assignmentMethod: string
    community: {
      id: string
      name: string
    }
    county: {
      id: string
      name: string | null
    }
    region: {
      id: string
    }
    regionId: string
  }
  updatedAt: Date
}

export interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  token: string | null
  tokenExpiry: Date | null
  loading: boolean
  initialized: boolean
  error: string | null
  errorDetails: any
}

// Global auth state - single source of truth
const authState = ref<AuthState>({
  user: null,
  userProfile: null,
  token: null,
  tokenExpiry: null,
  loading: true,
  initialized: false,
  error: null,
  errorDetails: null
})

// Auth listener management
let authUnsubscribe: Unsubscribe | null = null
let initializationPromise: Promise<void> | null = null

export const useAuth = () => {
  // Initialize toast notifications
  const { success, error: showError } = useToast()
  
  const isAuthenticated = computed(() => !!authState.value.user)
  const isAdmin = computed(() => (authState.value.userProfile?.role || 'user') === 'admin')

  // Clear all error states
  const clearErrors = () => {
    authState.value.error = null
    authState.value.errorDetails = null
  }

  // Set error state
  const setError = (error: unknown, context: string) => {
    logFirebaseError(error, context)
    const errorInfo = handleFirebaseError(error)
    authState.value.error = errorInfo.userMessage
    authState.value.errorDetails = errorInfo
  }

  // Get and refresh ID token
  const getAuthToken = async (): Promise<string | null> => {
    if (!authState.value.user) {
      return null
    }

    try {
      // Check if token is still valid (refresh 5 minutes before expiry)
      const now = new Date()
      const refreshThreshold = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
      
      if (authState.value.token && authState.value.tokenExpiry && authState.value.tokenExpiry > refreshThreshold) {
        return authState.value.token
      }

      // Get fresh token
      const token = await getIdToken(authState.value.user, true)
      
      // Decode token to get expiry (Firebase tokens are valid for 1 hour)
      const tokenExpiry = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
      
      authState.value.token = token
      authState.value.tokenExpiry = tokenExpiry
      
      return token
    } catch (error) {
      console.error('Failed to get auth token:', error)
      authState.value.token = null
      authState.value.tokenExpiry = null
      return null
    }
  }

  // Clear token state
  const clearToken = () => {
    authState.value.token = null
    authState.value.tokenExpiry = null
  }

  // Check if token is valid
  const isTokenValid = (): boolean => {
    if (!authState.value.token || !authState.value.tokenExpiry) {
      return false
    }
    return authState.value.tokenExpiry > new Date()
  }

  // Load user profile with proper error handling
  const loadUserProfile = async (uid: string): Promise<boolean> => {
    try {
      const db = getFirebaseDb()
      
      const userDoc = await retryOperation(
        () => getDoc(doc(db, 'users', uid)),
        3,
        1000
      )
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        authState.value.userProfile = {
          uid,
          email: data.email,
          displayName: data.displayName,
          role: data.role || 'user',
          userType: data.userType,
          geographicalContext: data.geographicalContext ? {
            ...data.geographicalContext,
            assignedAt: data.geographicalContext?.assignedAt?.toDate() || new Date()
          } : undefined,
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as UserProfile
        return true
      } else {
        logFirebaseError(
          new Error('User profile not found'),
          'loadUserProfile',
          { uid }
        )
        return false
      }
    } catch (err) {
      setError(err, 'loadUserProfile')
      return false
    }
  }

  // Initialize authentication (idempotent)
  const initAuth = (): Promise<void> => {
    // Return existing promise if already initializing
    if (initializationPromise) {
      return initializationPromise
    }

    // Return resolved promise if already initialized
    if (authState.value.initialized) {
      return Promise.resolve()
    }

    initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        // Check Firebase health before proceeding
        const health = checkFirebaseHealth()
        if (health.error) {
          const errorMsg = 'Firebase initialization failed. Please check your configuration.'
          authState.value.error = errorMsg
          authState.value.errorDetails = health.error
          authState.value.loading = false
          authState.value.initialized = true
          initializationPromise = null
          reject(new Error(errorMsg))
          return
        }

        const auth = getFirebaseAuth()
        
        // Clean up existing listener if it exists
        if (authUnsubscribe) {
          authUnsubscribe()
        }

        // Set up auth state listener
        authUnsubscribe = onAuthStateChanged(
          auth, 
          async (firebaseUser) => {
            try {
              authState.value.user = firebaseUser
              
              if (firebaseUser) {
                // Load user profile
                const profileLoaded = await loadUserProfile(firebaseUser.uid)
                if (!profileLoaded) {
                  // Profile loading failed, but don't reject - let user continue
                  console.warn('Profile loading failed for user:', firebaseUser.uid)
                }
                
                // Get initial auth token
                await getAuthToken()
              } else {
                // Clear all user data on logout
                authState.value.userProfile = null
                clearToken()
              }
              
              // Only resolve on first initialization
              if (!authState.value.initialized) {
                authState.value.loading = false
                authState.value.initialized = true
                initializationPromise = null
                resolve()
              } else {
                // Subsequent auth state changes just update loading
                authState.value.loading = false
              }
            } catch (err) {
              setError(err, 'Auth state change handler')
              authState.value.loading = false
              
              if (!authState.value.initialized) {
                authState.value.initialized = true
                initializationPromise = null
                reject(err)
              }
            }
          }, 
          (authError) => {
            setError(authError, 'Auth state listener')
            authState.value.loading = false
            
            if (!authState.value.initialized) {
              authState.value.initialized = true
              initializationPromise = null
              reject(authError)
            }
          }
        )
      } catch (err) {
        setError(err, 'Auth initialization')
        authState.value.loading = false
        authState.value.initialized = true
        initializationPromise = null
        reject(err)
      }
    })

    return initializationPromise
  }

  // Login with comprehensive validation
  const login = async (email: string, password: string) => {
    // Input validation
    if (!email?.trim()) {
      throw new Error('Email is required')
    }
    if (!password?.trim()) {
      throw new Error('Password is required')
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address')
    }

    try {
      clearErrors()
      authState.value.loading = true
      
      const auth = getFirebaseAuth()
      
      const result = await retryOperation(
        () => signInWithEmailAndPassword(auth, email.trim(), password),
        2,
        2000
      )
      
      // Show success toast
      success('Login Successful', 'Welcome back!')
      
      // Profile will be loaded automatically by auth state listener
      return result
    } catch (err: any) {
      setError(err, 'login')
      showError('Login Failed', err.message || 'Please check your credentials and try again.')
      throw err
    } finally {
      authState.value.loading = false
    }
  }

  // Register with validation
  const register = async (email: string, password: string, displayName?: string) => {
    // Input validation
    if (!email?.trim()) {
      throw new Error('Email is required')
    }
    if (!password?.trim()) {
      throw new Error('Password is required')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address')
    }

    try {
      clearErrors()
      authState.value.loading = true
      
      const auth = getFirebaseAuth()
      const db = getFirebaseDb()
      
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
      
      // Create user profile in Firestore
      const profile = {
        email: email.trim(),
        displayName: displayName?.trim() || email.split('@')[0],
        role: 'admin',
        userType: 'administrator',
        geographicalContext: {
          assignedAt: new Date(),
          assignmentMethod: 'manual_registration',
          community: {
            id: '',
            name: ''
          },
          county: {
            id: '',
            name: null
          },
          region: {
            id: ''
          },
          regionId: ''
        },
        updatedAt: new Date()
      }
      
      await retryOperation(
        () => setDoc(doc(db, 'users', result.user.uid), profile),
        3,
        1000
      )
      
      // Show success toast
      success('Registration Successful', 'Your account has been created!')
      
      // Profile will be loaded automatically by auth state listener
      return result
    } catch (err: any) {
      setError(err, 'register')
      showError('Registration Failed', err.message || 'Please try again.')
      throw err
    } finally {
      authState.value.loading = false
    }
  }

  // Password reset
  const resetPassword = async (email: string) => {
    if (!email?.trim()) {
      throw new Error('Email is required')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address')
    }

    try {
      clearErrors()
      const auth = getFirebaseAuth()
      
      await retryOperation(
        () => sendPasswordResetEmail(auth, email.trim()),
        2,
        2000
      )
      
      // Show success toast
      success('Password Reset Email Sent', 'Check your email for reset instructions.')
      
      return true
    } catch (err: any) {
      setError(err, 'resetPassword')
      showError('Password Reset Failed', err.message || 'Please try again.')
      throw err
    }
  }

  // Logout
  const logout = async () => {
    try {
      clearErrors()
      clearToken() // Clear token immediately
      const auth = getFirebaseAuth()
      await signOut(auth)
      
      // Show success toast
      success('Logged Out', 'See you next time!')
      
      // State will be cleared automatically by auth state listener
    } catch (err: any) {
      // Even if logout fails, clear token for security
      clearToken()
      setError(err, 'logout')
      showError('Logout Failed', err.message || 'Please try again.')
      throw err
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (authUnsubscribe) {
      authUnsubscribe()
      authUnsubscribe = null
    }
    initializationPromise = null
  }

  // Update profile
  const updateProfile = async (updates: Partial<Omit<UserProfile, 'uid' | 'updatedAt'>>) => {
    if (!authState.value.user) {
      throw new Error('User must be authenticated to update profile')
    }

    try {
      clearErrors()
      const db = getFirebaseDb()
      
      const updateData = {
        ...updates,
        updatedAt: new Date()
      }
      
      await retryOperation(
        () => setDoc(doc(db, 'users', authState.value.user!.uid), updateData, { merge: true }),
        3,
        1000
      )
      
      // Reload user profile
      await loadUserProfile(authState.value.user.uid)
      
      return true
    } catch (err: any) {
      setError(err, 'updateProfile')
      throw err
    }
  }

  return {
    // State (readonly computed)
    user: computed(() => authState.value.user),
    userProfile: computed(() => authState.value.userProfile),
    token: computed(() => authState.value.token),
    tokenExpiry: computed(() => authState.value.tokenExpiry),
    loading: computed(() => authState.value.loading),
    initialized: computed(() => authState.value.initialized),
    error: computed(() => authState.value.error),
    errorDetails: computed(() => authState.value.errorDetails),
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
    cleanup,
    
    // Token management
    getAuthToken,
    isTokenValid,
    clearToken
  }
}