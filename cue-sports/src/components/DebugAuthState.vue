<template>
  <div class="debug-auth-state" v-if="showDebug">
    <h3>🔍 Auth Debug Info</h3>
    <div class="debug-grid">
      <div class="debug-item">
        <label>Loading:</label>
        <span :class="{ 'text-red-500': authStore.loading }">{{ authStore.loading }}</span>
      </div>
      <div class="debug-item">
        <label>User:</label>
        <span>{{ authStore.user ? 'Logged in' : 'Not logged in' }}</span>
      </div>
      <div class="debug-item">
        <label>Error:</label>
        <span class="text-red-500">{{ authStore.error || 'None' }}</span>
      </div>
      <div class="debug-item">
        <label>IsAuthenticated:</label>
        <span>{{ authStore.isAuthenticated }}</span>
      </div>
      <div class="debug-item">
        <label>Firebase Health:</label>
        <span :class="firebaseHealthClass">{{ firebaseHealthText }}</span>
      </div>
    </div>
    
    <div class="debug-actions">
      <button @click="resetAuth" class="debug-btn">Reset Auth</button>
      <button @click="checkHealth" class="debug-btn">Check Firebase</button>
      <button @click="toggleDebug" class="debug-btn">Hide Debug</button>
    </div>
  </div>
  
  <button v-else @click="toggleDebug" class="debug-toggle">
    🔍 Show Debug
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import { checkFirebaseHealth } from '@/firebase/config'

const authStore = useAuthStore()
const showDebug = ref(false)
const firebaseHealth = ref<any>(null)

const firebaseHealthClass = computed(() => {
  if (!firebaseHealth.value) return 'text-gray-500'
  return firebaseHealth.value.error ? 'text-red-500' : 'text-green-500'
})

const firebaseHealthText = computed(() => {
  if (!firebaseHealth.value) return 'Not checked'
  if (firebaseHealth.value.error) return 'Error: ' + firebaseHealth.value.error.message
  return 'Healthy'
})

const toggleDebug = () => {
  showDebug.value = !showDebug.value
  if (showDebug.value) {
    checkHealth()
  }
}

const resetAuth = async () => {
  try {
    await authStore.initAuth()
  } catch (error) {
    // Error handled silently in production
  }
}

const checkHealth = () => {
  firebaseHealth.value = checkFirebaseHealth()
}

onMounted(() => {
  // Show debug by default in development
  if (import.meta.env.DEV) {
    showDebug.value = true
    checkHealth()
  }
})
</script>

<style scoped>
.debug-auth-state {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  max-width: 300px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  font-size: 0.875rem;
}

.debug-auth-state h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.debug-grid {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-item label {
  font-weight: 500;
  color: #374151;
}

.debug-item span {
  font-family: monospace;
  font-size: 0.75rem;
}

.debug-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.debug-btn {
  padding: 0.25rem 0.5rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.debug-btn:hover {
  background: #4f46e5;
}

.debug-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  z-index: 1000;
  font-size: 0.75rem;
}

.debug-toggle:hover {
  background: #4f46e5;
}

.text-red-500 {
  color: #ef4444;
}

.text-green-500 {
  color: #10b981;
}

.text-gray-500 {
  color: #6b7280;
}
</style>