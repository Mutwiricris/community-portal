import { initializeApp, FirebaseError } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'
import type { Analytics } from 'firebase/analytics'

// Global gtag declaration for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

// Firebase configuration validation
const validateConfig = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ]

  const missingVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  )

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missingVars.join(', ')}`
    )
  }
}

// Firebase configuration object
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Error state management
export const firebaseInitError = {
  hasError: false,
  message: '',
  code: '',
  details: null as any
}

// Firebase service instances
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let analytics: Analytics | null = null

// Initialize Firebase with comprehensive error handling
const initializeFirebase = () => {
  try {
    // Validate configuration first
    validateConfig()

    // Initialize Firebase app
    app = initializeApp(firebaseConfig)
    console.log('Firebase app initialized successfully')

    // Initialize Auth service
    try {
      auth = getAuth(app)
      console.log('Firebase Auth initialized successfully')
    } catch (authError) {
      console.error('Failed to initialize Firebase Auth:', authError)
      throw new Error(`Auth initialization failed: ${authError}`)
    }

    // Initialize Firestore service
    try {
      db = getFirestore(app)
      console.log('Firebase Firestore initialized successfully')
    } catch (firestoreError) {
      console.error('Failed to initialize Firestore:', firestoreError)
      throw new Error(`Firestore initialization failed: ${firestoreError}`)
    }

    // Initialize Analytics (optional, may not be supported in all environments)
    isSupported()
      .then(supported => {
        if (supported && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) {
          try {
            // Initialize Analytics with app and proper cookie settings
            analytics = getAnalytics(app!)
            
            // Set proper cookie configuration for Analytics
            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('config', import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, {
                cookie_flags: 'max-age=7200;secure;samesite=none',
                cookie_expires: 7200 // 2 hours
              })
            }
            
            console.log('Firebase Analytics initialized successfully')
          } catch (analyticsError) {
            console.warn('Firebase Analytics initialization failed:', analyticsError)
          }
        }
      })
      .catch(analyticsError => {
        console.warn('Firebase Analytics not available:', analyticsError)
      })

    return { app, auth, db }
  } catch (error) {
    // Capture error details for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof FirebaseError ? error.code : 'UNKNOWN',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }

    firebaseInitError.hasError = true
    firebaseInitError.message = errorDetails.message
    firebaseInitError.code = errorDetails.code
    firebaseInitError.details = errorDetails

    console.error('Firebase initialization failed:', errorDetails)

    // Re-throw to allow app to handle critical failure
    throw error
  }
}

// Initialize Firebase services
try {
  const services = initializeFirebase()
  app = services.app
  auth = services.auth
  db = services.db
} catch (error) {
  console.error('Critical Firebase initialization error:', error)
}

// Export Firebase services with null checks
export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebase app not initialized. Check your configuration.')
  }
  return app
}

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Check your configuration.')
  }
  return auth
}

export const getFirebaseDb = (): Firestore => {
  if (!db) {
    throw new Error('Firestore not initialized. Check your configuration.')
  }
  return db
}

export const getFirebaseAnalytics = (): Analytics | null => analytics

// Export for backward compatibility (with deprecation notice)
export { app, auth, db }

// Health check function
export const checkFirebaseHealth = () => {
  return {
    app: !!app,
    auth: !!auth,
    firestore: !!db,
    analytics: !!analytics,
    error: firebaseInitError.hasError ? firebaseInitError : null
  }
}

export default app