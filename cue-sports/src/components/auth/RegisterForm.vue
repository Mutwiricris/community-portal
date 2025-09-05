<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
    <Card class="w-full max-w-md">
      <div class="p-6">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold">Create Admin Account</h1>
          <p class="text-gray-600">Administrator registration</p>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-2">
            <label for="displayName" class="text-sm font-medium">Display Name</label>
            <Input 
              id="displayName"
              v-model="form.displayName"
              type="text"
              placeholder="John Doe"
              autocomplete="name"
              :disabled="authStore.loading"
              :class="{ 'border-red-300': fieldErrors.displayName }"
              @blur="validateField('displayName')"
              @input="clearFieldError('displayName')"
            />
            <div v-if="fieldErrors.displayName" class="text-sm text-red-600">
              {{ fieldErrors.displayName }}
            </div>
          </div>

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
              placeholder="Enter a strong password"
              autocomplete="new-password"
              required
              :disabled="authStore.loading"
              :class="{ 'border-red-300': fieldErrors.password }"
              @blur="validateField('password')"
              @input="clearFieldError('password')"
            />
            <div v-if="fieldErrors.password" class="text-sm text-red-600">
              {{ fieldErrors.password }}
            </div>
            
            <!-- Password strength indicator -->
            <div v-if="form.password" class="space-y-1">
              <div class="text-xs text-gray-600">Password strength:</div>
              <div class="flex space-x-1">
                <div 
                  v-for="i in 4" 
                  :key="i"
                  class="h-1 flex-1 rounded"
                  :class="i <= passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'"
                ></div>
              </div>
              <div class="text-xs" :class="strengthTextColors[passwordStrength - 1]">
                {{ strengthLabels[passwordStrength - 1] }}
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label for="confirmPassword" class="text-sm font-medium">Confirm Password *</label>
            <Input 
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              placeholder="Confirm your password"
              autocomplete="new-password"
              required
              :disabled="authStore.loading"
              :class="{ 'border-red-300': fieldErrors.confirmPassword }"
              @blur="validateField('confirmPassword')"
              @input="clearFieldError('confirmPassword')"
            />
            <div v-if="fieldErrors.confirmPassword" class="text-sm text-red-600">
              {{ fieldErrors.confirmPassword }}
            </div>
          </div>

          <div class="space-y-3">
            <label class="flex items-start">
              <input 
                v-model="form.agreeToTerms"
                type="checkbox" 
                class="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                :disabled="authStore.loading"
                required
              >
              <span class="ml-2 text-sm text-gray-600">
                I agree to the 
                <a href="#" class="text-blue-600 hover:text-blue-500">Terms of Service</a> 
                and 
                <a href="#" class="text-blue-600 hover:text-blue-500">Privacy Policy</a>
              </span>
            </label>
            
            <div v-if="fieldErrors.agreeToTerms" class="text-sm text-red-600">
              {{ fieldErrors.agreeToTerms }}
            </div>
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
              Creating Account...
            </span>
            <span v-else>Create Admin Account</span>
          </Button>

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
            <div>Confirm Password: {{ form.confirmPassword ? '***filled***' : 'empty' }}</div>
            <div>Password Strength: {{ passwordStrength }}/4</div>
            <div>Agree to Terms: {{ form.agreeToTerms }}</div>
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
            Already have an admin account? 
            <router-link to="/auth/login" class="text-blue-600 hover:text-blue-500">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </Card>
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

const showDebugInfo = ref(false)

// Form state
const form = reactive({
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})

// Field validation errors
const fieldErrors = reactive<Record<string, string>>({})

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password strength calculation
const passwordStrength = computed(() => {
  const password = form.password
  if (!password) return 0
  
  let strength = 0
  
  // Length check
  if (password.length >= 8) strength++
  
  // Lowercase and uppercase
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  
  // Numbers
  if (/\d/.test(password)) strength++
  
  // Special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
  
  return strength
})

// Password strength styling
const strengthColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400']
const strengthTextColors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600']
const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']

// Validate individual field
const validateField = (field: string) => {
  switch (field) {
    case 'displayName':
      if (form.displayName.trim() && form.displayName.trim().length < 2) {
        fieldErrors.displayName = 'Display name must be at least 2 characters'
      } else {
        delete fieldErrors.displayName
      }
      break
      
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
      } else if (passwordStrength.value < 2) {
        fieldErrors.password = 'Password is too weak. Try adding uppercase, numbers, or special characters.'
      } else {
        delete fieldErrors.password
        // Revalidate confirm password if it exists
        if (form.confirmPassword) {
          validateField('confirmPassword')
        }
      }
      break
      
    case 'confirmPassword':
      if (!form.confirmPassword.trim()) {
        fieldErrors.confirmPassword = 'Please confirm your password'
      } else if (form.password !== form.confirmPassword) {
        fieldErrors.confirmPassword = 'Passwords do not match'
      } else {
        delete fieldErrors.confirmPassword
      }
      break
      
    case 'agreeToTerms':
      if (!form.agreeToTerms) {
        fieldErrors.agreeToTerms = 'You must agree to the terms and conditions'
      } else {
        delete fieldErrors.agreeToTerms
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
  validateField('displayName')
  validateField('email')
  validateField('password')
  validateField('confirmPassword')
  validateField('agreeToTerms')
  return Object.keys(fieldErrors).length === 0
}

// Check if form is valid
const isFormValid = computed(() => {
  return form.email.trim() && 
         form.password.trim() && 
         form.confirmPassword.trim() &&
         form.agreeToTerms &&
         emailRegex.test(form.email.trim()) &&
         form.password.length >= 6 &&
         form.password === form.confirmPassword &&
         passwordStrength.value >= 2 &&
         Object.keys(fieldErrors).length === 0
})

// Handle registration
const handleRegister = async () => {
  // Clear previous errors
  authStore.clearErrors()
  
  // Validate form
  if (!validateForm()) {
    return
  }

  try {
    await authStore.register(
      form.email, 
      form.password, 
      form.displayName || undefined
    )
    
    // Clear form on success
    form.displayName = ''
    form.email = ''
    form.password = ''
    form.confirmPassword = ''
    form.agreeToTerms = false
    
    // Navigate to intended destination or dashboard
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    // Error is handled by the store and displayed automatically
    console.error('Registration failed:', error)
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

/* Custom checkbox styles */
input[type="checkbox"]:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}
</style>