<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
    <Card class="w-full max-w-md">
      <div class="p-6">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold">Sign In</h1>
          <p class="text-gray-600">Administrator access only</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label for="email" class="text-sm font-medium">Email *</label>
            <Input 
              id="email"
              v-model="form.email"
              type="email"
              placeholder="admin@example.com"
              autocomplete="email"
              required
              :disabled="authStore.loading"
              :class="{ 'border-red-300': fieldErrors.email }"
              @blur="validateField('email')"
              @input="clearFieldError('email')"
            />
            <div v-if="fieldErrors.email" class="text-sm text-red-600">
              {{ fieldErrors.email }}
            </div>
          </div>

          <div class="space-y-2">
            <label for="password" class="text-sm font-medium">Password *</label>
            <Input 
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
              :disabled="authStore.loading"
              :class="{ 'border-red-300': fieldErrors.password }"
              @blur="validateField('password')"
              @input="clearFieldError('password')"
            />
            <div v-if="fieldErrors.password" class="text-sm text-red-600">
              {{ fieldErrors.password }}
            </div>
          </div>

          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input 
                v-model="form.rememberMe"
                type="checkbox" 
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                :disabled="authStore.loading"
              >
              <span class="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            
            <button 
              type="button"
              @click="showForgotPassword = true"
              class="text-sm text-blue-600 hover:text-blue-500"
              :disabled="authStore.loading"
            >
              Forgot password?
            </button>
          </div>

          <Button 
            type="submit" 
            class="w-full" 
            :disabled="!isFormValid || authStore.loading"
          >
            <span v-if="authStore.loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
            <span v-else>Sign In</span>
          </Button>

          <!-- Route-based error messages -->
          <div v-if="routeError" class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {{ routeError }}
          </div>

          <!-- Auth store errors -->
          <div v-if="authStore.error" class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {{ authStore.error }}
          </div>

          <!-- Debug info for development -->
          <div v-if="isDev && showDebugInfo" class="text-xs text-gray-500 mt-4 p-3 bg-gray-100 rounded-md space-y-1">
            <div><strong>Debug Info:</strong></div>
            <div>Form Valid: {{ isFormValid }}</div>
            <div>Loading: {{ authStore.loading }}</div>
            <div>Email: {{ form.email || 'empty' }}</div>
            <div>Password: {{ form.password ? '***filled***' : 'empty' }}</div>
            <div>Field Errors: {{ Object.keys(fieldErrors).length > 0 ? JSON.stringify(fieldErrors) : 'none' }}</div>
            <button type="button" @click="showDebugInfo = false" class="text-blue-600 underline">Hide Debug</button>
          </div>
          
          <button 
            v-if="isDev && !showDebugInfo" 
            type="button" 
            @click="showDebugInfo = true"
            class="text-xs text-gray-400 underline w-full text-center"
          >
            Show Debug Info
          </button>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an admin account? 
            <router-link to="/auth/signup" class="text-blue-600 hover:text-blue-500">
              Create one
            </router-link>
          </p>
        </div>
      </div>
    </Card>

    <!-- Forgot Password Modal -->
    <div v-if="showForgotPassword" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card class="w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-4">Reset Password</h2>
          
          <form @submit.prevent="handlePasswordReset" class="space-y-4">
            <div class="space-y-2">
              <label for="reset-email" class="text-sm font-medium">Email</label>
              <Input 
                id="reset-email"
                v-model="resetForm.email"
                type="email"
                placeholder="Enter your email address"
                required
                :disabled="resetForm.loading"
              />
            </div>

            <div class="flex space-x-3">
              <Button 
                type="submit" 
                class="flex-1"
                :disabled="!resetForm.email || resetForm.loading"
              >
                {{ resetForm.loading ? 'Sending...' : 'Send Reset Email' }}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                @click="showForgotPassword = false"
                :disabled="resetForm.loading"
              >
                Cancel
              </Button>
            </div>

            <div v-if="resetForm.success" class="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
              Password reset email sent! Check your inbox.
            </div>

            <div v-if="resetForm.error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {{ resetForm.error }}
            </div>
          </form>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Card from '@/components/ui/card.vue'

const router = useRouter()
const authStore = useAuthStore()
const isDev = computed(() => import.meta.env.DEV)

// Handle route-based error messages
const routeError = computed(() => {
  const errorCode = router.currentRoute.value.query.error as string
  if (!errorCode) return null
  
  switch (errorCode) {
    case 'admin_required':
      return 'Administrator privileges required. Please sign in with an admin account.'
    case 'session_expired':
      return 'Your session has expired. Please sign in again.'
    default:
      return 'Authentication required. Please sign in to continue.'
  }
})

const showForgotPassword = ref(false)
const showDebugInfo = ref(false)

// Form state
const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// Field validation errors
const fieldErrors = reactive<Record<string, string>>({})

// Password reset form
const resetForm = reactive({
  email: '',
  loading: false,
  success: false,
  error: null as string | null
})

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validate individual field
const validateField = (field: string) => {
  switch (field) {
    case 'email':
      if (!form.email.trim()) {
        fieldErrors.email = 'Email is required'
      } else if (!emailRegex.test(form.email.trim())) {
        fieldErrors.email = 'Please enter a valid email address'
      } else {
        delete fieldErrors.email
      }
      break
      
    case 'password':
      if (!form.password.trim()) {
        fieldErrors.password = 'Password is required'
      } else if (form.password.length < 6) {
        fieldErrors.password = 'Password must be at least 6 characters'
      } else {
        delete fieldErrors.password
      }
      break
  }
}

// Clear field error
const clearFieldError = (field: string) => {
  delete fieldErrors[field]
}

// Validate all fields
const validateForm = () => {
  validateField('email')
  validateField('password')
  return Object.keys(fieldErrors).length === 0
}

// Check if form is valid
const isFormValid = computed(() => {
  return form.email.trim() && 
         form.password.trim() && 
         emailRegex.test(form.email.trim()) &&
         form.password.length >= 6 &&
         Object.keys(fieldErrors).length === 0
})

// Handle login
const handleLogin = async () => {
  // Clear previous errors
  authStore.clearErrors()
  
  // Validate form
  if (!validateForm()) {
    return
  }

  try {
    await authStore.login(form.email, form.password)
    
    // Clear form on success
    form.email = ''
    form.password = ''
    form.rememberMe = false
    
    // Navigate to intended destination or dashboard
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    // Error is handled by the store and displayed automatically
    console.error('Login failed:', error)
  }
}

// Handle password reset
const handlePasswordReset = async () => {
  if (!resetForm.email.trim()) {
    resetForm.error = 'Email is required'
    return
  }

  if (!emailRegex.test(resetForm.email.trim())) {
    resetForm.error = 'Please enter a valid email address'
    return
  }

  try {
    resetForm.loading = true
    resetForm.error = null
    resetForm.success = false
    
    await authStore.resetPassword(resetForm.email)
    
    resetForm.success = true
    resetForm.email = ''
    
    // Auto-close modal after 3 seconds
    setTimeout(() => {
      showForgotPassword.value = false
      resetForm.success = false
    }, 3000)
    
  } catch (error: any) {
    resetForm.error = error.message || 'Failed to send reset email'
  } finally {
    resetForm.loading = false
  }
}

</script>

<style scoped>
/* Loading spinner animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Focus styles */
input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Disabled state */
input:disabled,
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal backdrop */
.fixed.inset-0 {
  backdrop-filter: blur(4px);
}
</style>