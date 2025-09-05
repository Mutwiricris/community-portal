<template>
  <div class="firebase-error-fallback">
    <div class="error-content">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      
      <h1 class="error-heading">Firebase Connection Error</h1>
      
      <div class="error-description">
        <p v-if="error?.code === 'missing-config'">
          Firebase configuration is missing. Please ensure all required environment variables are set.
        </p>
        <p v-else-if="error?.code === 'network-error'">
          Unable to connect to Firebase services. Please check your internet connection.
        </p>
        <p v-else-if="error?.code === 'permission-denied'">
          You don't have permission to access this resource. Please contact your administrator.
        </p>
        <p v-else>
          {{ error?.message || 'Unable to initialize Firebase services. Please try again later.' }}
        </p>
      </div>

      <div class="health-status" v-if="showHealthStatus">
        <h3>Service Status</h3>
        <div class="status-list">
          <div class="status-item" :class="{ active: healthStatus.app }">
            <span class="status-indicator"></span>
            <span>Firebase App</span>
          </div>
          <div class="status-item" :class="{ active: healthStatus.auth }">
            <span class="status-indicator"></span>
            <span>Authentication</span>
          </div>
          <div class="status-item" :class="{ active: healthStatus.firestore }">
            <span class="status-indicator"></span>
            <span>Firestore Database</span>
          </div>
          <div class="status-item" :class="{ active: healthStatus.analytics }">
            <span class="status-indicator"></span>
            <span>Analytics (Optional)</span>
          </div>
        </div>
      </div>

      <div class="error-actions">
        <button @click="checkConnection" class="btn-check" :disabled="checking">
          <span v-if="checking" class="spinner"></span>
          {{ checking ? 'Checking...' : 'Check Connection' }}
        </button>
        <button @click="reload" class="btn-reload">
          Reload Application
        </button>
      </div>

      <div class="error-help">
        <p>If the problem persists, please:</p>
        <ul>
          <li>Check your internet connection</li>
          <li>Verify Firebase configuration in your environment</li>
          <li>Contact your system administrator</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { checkFirebaseHealth } from '@/firebase/config'

interface Props {
  error?: any
  showHealthStatus?: boolean
}

withDefaults(defineProps<Props>(), {
  showHealthStatus: true
})

const checking = ref(false)
const healthStatus = ref({
  app: false,
  auth: false,
  firestore: false,
  analytics: false
})

const checkConnection = async () => {
  checking.value = true
  
  try {
    // Wait a bit to show loading state
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check Firebase health
    const health = checkFirebaseHealth()
    healthStatus.value = {
      app: health.app,
      auth: health.auth,
      firestore: health.firestore,
      analytics: health.analytics
    }
    
    // If all critical services are healthy, reload
    if (health.app && health.auth && health.firestore) {
      reload()
    }
  } catch (error) {
    console.error('Health check failed:', error)
  } finally {
    checking.value = false
  }
}

const reload = () => {
  window.location.reload()
}

onMounted(() => {
  // Check initial health status
  const health = checkFirebaseHealth()
  healthStatus.value = {
    app: health.app,
    auth: health.auth,
    firestore: health.firestore,
    analytics: health.analytics
  }
})
</script>

<style scoped>
.firebase-error-fallback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.error-content {
  max-width: 600px;
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.error-icon {
  text-align: center;
  margin-bottom: 2rem;
  color: #f59e0b;
}

.error-heading {
  text-align: center;
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.error-description {
  text-align: center;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.health-status {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.health-status h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.status-list {
  display: grid;
  gap: 0.75rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #6b7280;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  position: relative;
}

.status-item.active .status-indicator {
  background: #10b981;
}

.status-item.active .status-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.error-actions button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-check {
  background: #6366f1;
  color: white;
}

.btn-check:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
}

.btn-check:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-reload {
  background: transparent;
  color: #6366f1;
  border: 2px solid #6366f1;
}

.btn-reload:hover {
  background: #6366f1;
  color: white;
  transform: translateY(-1px);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-help {
  background: #fef3c7;
  border-radius: 8px;
  padding: 1.5rem;
  color: #92400e;
}

.error-help p {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-help ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-help li {
  margin: 0.25rem 0;
}

@media (max-width: 640px) {
  .error-content {
    padding: 2rem;
  }
  
  .error-heading {
    font-size: 1.5rem;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .error-actions button {
    width: 100%;
  }
}
</style>