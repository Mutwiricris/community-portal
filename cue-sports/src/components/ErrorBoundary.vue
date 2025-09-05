<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      
      <h2 class="error-title">{{ errorTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div class="error-details" v-if="showDetails && errorDetails">
        <details>
          <summary>Technical Details</summary>
          <pre>{{ errorDetails }}</pre>
        </details>
      </div>
      
      <div class="error-actions">
        <button @click="retry" class="btn-retry" v-if="retryable">
          Try Again
        </button>
        <button @click="reload" class="btn-reload">
          Reload Page
        </button>
        <button @click="goHome" class="btn-home" v-if="showHomeButton">
          Go to Home
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, computed } from 'vue'
import { useRouter } from 'vue-router'
import { handleFirebaseError } from '@/firebase/errorHandler'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showDetails?: boolean
  showHomeButton?: boolean
  onError?: (error: Error) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: 'Something went wrong',
  fallbackMessage: 'An unexpected error occurred. Please try again.',
  showDetails: import.meta.env.DEV,
  showHomeButton: true
})

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<any>(null)

const errorTitle = computed(() => {
  if (errorInfo.value?.code === 'permission-denied') {
    return 'Access Denied'
  }
  if (errorInfo.value?.code?.startsWith('auth/')) {
    return 'Authentication Error'
  }
  if (errorInfo.value?.code === 'unavailable') {
    return 'Service Unavailable'
  }
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  return errorInfo.value?.userMessage || error.value?.message || props.fallbackMessage
})

const errorDetails = computed(() => {
  if (!props.showDetails) return null
  
  return JSON.stringify({
    message: error.value?.message,
    stack: error.value?.stack,
    code: errorInfo.value?.code,
    severity: errorInfo.value?.severity,
    timestamp: new Date().toISOString()
  }, null, 2)
})

const retryable = computed(() => {
  return errorInfo.value?.retryable !== false
})

onErrorCaptured((err: Error) => {
  console.error('Error caught by boundary:', err)
  error.value = err
  errorInfo.value = handleFirebaseError(err)
  hasError.value = true
  
  if (props.onError) {
    props.onError(err)
  }
  
  // Prevent the error from propagating
  return false
})

const retry = () => {
  hasError.value = false
  error.value = null
  errorInfo.value = null
  emit('retry')
}

const reload = () => {
  window.location.reload()
}

const goHome = () => {
  router.push('/')
}

// Expose reset method for programmatic use
defineExpose({
  reset: retry
})
</script>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: var(--color-background);
}

.error-container {
  max-width: 500px;
  width: 100%;
  text-align: center;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 3rem 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.error-icon {
  margin: 0 auto 1.5rem;
  color: var(--color-error, #ef4444);
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.error-message {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.error-details {
  margin: 1.5rem 0;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.error-details pre {
  margin-top: 0.5rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: 4px;
  font-size: 0.75rem;
  overflow-x: auto;
  text-align: left;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.error-actions button {
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}

.btn-retry {
  background: var(--color-primary);
  color: white;
}

.btn-retry:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-reload {
  background: var(--color-secondary);
  color: white;
}

.btn-reload:hover {
  background: var(--color-secondary-dark);
  transform: translateY(-1px);
}

.btn-home {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn-home:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .error-container {
    padding: 2rem 1.5rem;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .error-actions button {
    width: 100%;
  }
}
</style>