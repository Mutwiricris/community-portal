<template>
  <ErrorBoundary
    :show-details="isDev"
    :on-error="handleError"
    @retry="initializeApp"
  >
    <FirebaseErrorFallback 
      v-if="firebaseError"
      :error="firebaseError"
    />
    <div v-else-if="!initialized" class="app-loading">
      <div class="loading-spinner"></div>
      <p>Initializing application...</p>
    </div>
    <div v-else id="app">
      <router-view />
      <Toaster />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores'
import { useTheme } from '@/composables/useTheme'
import { checkFirebaseHealth, firebaseInitError } from '@/firebase/config'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import FirebaseErrorFallback from '@/components/FirebaseErrorFallback.vue'
import Toaster from '@/components/ui/toaster.vue'

const authStore = useAuthStore()
const { initTheme } = useTheme()

const initialized = ref(false)
const firebaseError = ref<any>(null)
const isDev = computed(() => import.meta.env.DEV)

const initializeApp = async () => {
  try {
    // Reset error state
    firebaseError.value = null
    
    // Check Firebase health first
    const health = checkFirebaseHealth()
    if (health.error) {
      firebaseError.value = {
        code: 'missing-config',
        message: health.error.message,
        details: health.error.details
      }
      return
    }
    
    // Initialize theme
    initTheme()
    
    // Initialize authentication
    await authStore.initAuth()
    
    initialized.value = true
  } catch (error) {
    console.error('App initialization error:', error)
    firebaseError.value = {
      code: 'initialization-failed',
      message: error instanceof Error ? error.message : 'Failed to initialize application',
      details: error
    }
  }
}

const handleError = (error: Error) => {
  console.error('Global error handler:', error)
  
  // Check if it's a Firebase-related error
  if (error.message.includes('Firebase') || error.message.includes('firebase')) {
    firebaseError.value = {
      code: 'firebase-error',
      message: error.message,
      details: error
    }
  }
}

onMounted(() => {
  // Check for Firebase initialization error on mount
  if (firebaseInitError.hasError) {
    firebaseError.value = {
      code: 'firebase-init-error',
      message: firebaseInitError.message,
      details: firebaseInitError.details
    }
  } else {
    initializeApp()
  }
})
</script>

<style>
.app-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.app-loading p {
  color: #6b7280;
  font-size: 1.125rem;
}
</style>