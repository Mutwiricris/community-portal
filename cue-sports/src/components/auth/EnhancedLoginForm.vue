<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl text-center">Sign In</CardTitle>
        <p class="text-sm text-muted-foreground text-center">
          Administrator access only
        </p>
      </CardHeader>
      
      <CardContent class="space-y-4">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Field -->
          <div class="space-y-2">
            <Label for="email">Email *</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="admin@example.com"
              autocomplete="email"
              required
              :disabled="authStore.loading"
              :class="{ 'border-destructive': fieldErrors.email }"
              @blur="validateField('email')"
              @input="clearFieldError('email')"
            />
            <div v-if="fieldErrors.email" class="text-sm text-destructive">
              {{ fieldErrors.email }}
            </div>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <Label for="password">Password *</Label>
            <div class="relative">
              <Input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
                :disabled="authStore.loading"
                :class="{ 'border-destructive': fieldErrors.password }"
                @blur="validateField('password')"
                @input="clearFieldError('password')"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                @click="showPassword = !showPassword"
                :disabled="authStore.loading"
                tabindex="-1"
              >
                <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                <EyeOffIcon v-else class="h-4 w-4" />
                <span class="sr-only">
                  {{ showPassword ? 'Hide password' : 'Show password' }}
                </span>
              </Button>
            </div>
            <div v-if="fieldErrors.password" class="text-sm text-destructive">
              {{ fieldErrors.password }}
            </div>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <Checkbox
                id="remember"
                v-model:checked="form.rememberMe"
                :disabled="authStore.loading"
              />
              <Label
                for="remember"
                class="text-sm font-normal"
              >
                Remember me
              </Label>
            </div>
            <Button
              type="button"
              variant="link"
              class="px-0 font-normal"
              @click="showForgotPassword = true"
              :disabled="authStore.loading"
            >
              Forgot password?
            </Button>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full"
            :disabled="!isFormValid || authStore.loading"
          >
            <LoaderIcon v-if="authStore.loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
          </Button>

          <!-- Error Messages -->
          <div v-if="routeError" class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {{ routeError }}
          </div>

          <div v-if="authStore.error" class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {{ authStore.error }}
          </div>

          <!-- Data Reception Test (Development Only) -->
          <div v-if="isDev" class="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="showDataTest = !showDataTest"
              class="w-full"
            >
              {{ showDataTest ? 'Hide' : 'Show' }} Data Reception Test
            </Button>
            
            <div v-if="showDataTest" class="rounded-md bg-muted p-3 text-sm font-mono space-y-1">
              <div><strong>Field Data Reception Test:</strong></div>
              <div>Email: <span class="text-primary">{{ form.email || 'empty' }}</span></div>
              <div>Password: <span class="text-primary">{{ form.password ? '•'.repeat(form.password.length) : 'empty' }}</span></div>
              <div>Remember Me: <span class="text-primary">{{ form.rememberMe }}</span></div>
              <div>Form Valid: <span class="text-primary">{{ isFormValid }}</span></div>
              <div>Auth Loading: <span class="text-primary">{{ authStore.loading }}</span></div>
              <div>Field Errors: <span class="text-destructive">{{ Object.keys(fieldErrors).length > 0 ? Object.keys(fieldErrors).join(', ') : 'none' }}</span></div>
              <div>Last Input: <span class="text-primary">{{ lastInputTime }}</span></div>
            </div>
          </div>
        </form>

        <!-- Navigation to Sign Up -->
        <div class="text-center">
          <p class="text-sm text-muted-foreground">
            Don't have an admin account?{' '}
            <Button
              variant="link"
              class="px-0 font-normal"
              @click="$router.push('/auth/signup')"
            >
              Create one
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Forgot Password Dialog -->
    <Dialog v-model:open="showForgotPassword">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        
        <form @submit.prevent="handlePasswordReset" class="space-y-4">
          <div class="space-y-2">
            <Label for="reset-email">Email</Label>
            <Input
              id="reset-email"
              v-model="resetForm.email"
              type="email"
              placeholder="Enter your email address"
              required
              :disabled="resetForm.loading"
            />
          </div>

          <DialogFooter class="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button
              type="submit"
              :disabled="!resetForm.email || resetForm.loading"
              class="w-full sm:w-auto"
            >
              <LoaderIcon v-if="resetForm.loading" class="mr-2 h-4 w-4 animate-spin" />
              {{ resetForm.loading ? 'Sending...' : 'Send Reset Email' }}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              @click="showForgotPassword = false"
              :disabled="resetForm.loading"
              class="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>

          <div v-if="resetForm.success" class="rounded-md bg-green-50 p-3 text-sm text-green-600">
            Password reset email sent! Check your inbox.
          </div>

          <div v-if="resetForm.error" class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {{ resetForm.error }}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EyeIcon, EyeOffIcon, LoaderIcon } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const isDev = computed(() => import.meta.env.DEV)

// UI State
const showPassword = ref(false)
const showForgotPassword = ref(false)
const showDataTest = ref(false)
const lastInputTime = ref('')

// Form state with reactive tracking
const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// Watch for form changes to track data reception
watch(form, () => {
  lastInputTime.value = new Date().toLocaleTimeString()
}, { deep: true })

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

// Route-based error handling
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

// Field validation
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

// Form validity check
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
    // Error is handled by the store with toast notifications
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

// Development helpers
if (isDev.value) {
  // Auto-fill form for testing (only in development)
  const autoFillTestData = () => {
    form.email = 'admin@test.com'
    form.password = 'password123'
    form.rememberMe = true
  }
  
  // Expose to window for console testing
  ;(window as any).loginFormTest = {
    form,
    fieldErrors,
    isFormValid,
    autoFill: autoFillTestData,
    validateForm,
    authStore
  }
  
  // Development mode helpers removed in production
}
</script>

<style scoped>
/* Custom animations for loading states */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Focus ring styling */
.focus-visible\:ring-2:focus-visible {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px hsl(var(--ring));
}
</style>