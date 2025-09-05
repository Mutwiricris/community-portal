<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="space-y-1">
        <CardTitle class="text-2xl text-center">Create Admin Account</CardTitle>
        <p class="text-sm text-muted-foreground text-center">
          Administrator registration
        </p>
      </CardHeader>
      
      <CardContent class="space-y-4">
        <form @submit.prevent="handleRegister" class="space-y-4">
          <!-- Display Name Field -->
          <div class="space-y-2">
            <Label for="displayName">Display Name</Label>
            <Input
              id="displayName"
              v-model="form.displayName"
              type="text"
              placeholder="John Doe"
              autocomplete="name"
              :disabled="authStore.loading"
              :class="{ 'border-destructive': fieldErrors.displayName }"
              @blur="validateField('displayName')"
              @input="clearFieldError('displayName')"
            />
            <div v-if="fieldErrors.displayName" class="text-sm text-destructive">
              {{ fieldErrors.displayName }}
            </div>
          </div>

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
                placeholder="Enter a strong password"
                autocomplete="new-password"
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
              </Button>
            </div>
            <div v-if="fieldErrors.password" class="text-sm text-destructive">
              {{ fieldErrors.password }}
            </div>
            
            <!-- Password strength indicator -->
            <div v-if="form.password" class="space-y-2">
              <div class="text-xs text-muted-foreground">Password strength:</div>
              <div class="flex space-x-1">
                <div 
                  v-for="i in 4" 
                  :key="i"
                  class="h-2 flex-1 rounded-full transition-colors"
                  :class="i <= passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-muted'"
                ></div>
              </div>
              <div class="text-xs" :class="strengthTextColors[passwordStrength - 1]">
                {{ strengthLabels[passwordStrength - 1] }}
              </div>
            </div>
          </div>

          <!-- Confirm Password Field -->
          <div class="space-y-2">
            <Label for="confirmPassword">Confirm Password *</Label>
            <div class="relative">
              <Input
                id="confirmPassword"
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm your password"
                autocomplete="new-password"
                required
                :disabled="authStore.loading"
                :class="{ 'border-destructive': fieldErrors.confirmPassword }"
                @blur="validateField('confirmPassword')"
                @input="clearFieldError('confirmPassword')"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                @click="showConfirmPassword = !showConfirmPassword"
                :disabled="authStore.loading"
                tabindex="-1"
              >
                <EyeIcon v-if="!showConfirmPassword" class="h-4 w-4" />
                <EyeOffIcon v-else class="h-4 w-4" />
              </Button>
            </div>
            <div v-if="fieldErrors.confirmPassword" class="text-sm text-destructive">
              {{ fieldErrors.confirmPassword }}
            </div>
          </div>

          <!-- Terms Agreement -->
          <div class="space-y-3">
            <div class="flex items-start space-x-2">
              <Checkbox
                id="terms"
                v-model:checked="form.agreeToTerms"
                :disabled="authStore.loading"
                required
              />
              <Label
                for="terms"
                class="text-sm font-normal leading-5"
              >
                I agree to the{' '}
                <Button
                  variant="link"
                  class="h-auto p-0 text-sm font-normal"
                  @click="showTerms = true"
                >
                  Terms of Service
                </Button>
                {' '}and{' '}
                <Button
                  variant="link"
                  class="h-auto p-0 text-sm font-normal"
                  @click="showPrivacy = true"
                >
                  Privacy Policy
                </Button>
              </Label>
            </div>
            
            <div v-if="fieldErrors.agreeToTerms" class="text-sm text-destructive">
              {{ fieldErrors.agreeToTerms }}
            </div>
          </div>

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full"
            :disabled="!isFormValid || authStore.loading"
          >
            <LoaderIcon v-if="authStore.loading" class="mr-2 h-4 w-4 animate-spin" />
            {{ authStore.loading ? 'Creating Account...' : 'Create Admin Account' }}
          </Button>

          <!-- Error Messages -->
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
              <div>Display Name: <span class="text-primary">{{ form.displayName || 'empty' }}</span></div>
              <div>Email: <span class="text-primary">{{ form.email || 'empty' }}</span></div>
              <div>Password: <span class="text-primary">{{ form.password ? '•'.repeat(form.password.length) : 'empty' }}</span></div>
              <div>Confirm Password: <span class="text-primary">{{ form.confirmPassword ? '•'.repeat(form.confirmPassword.length) : 'empty' }}</span></div>
              <div>Password Strength: <span class="text-primary">{{ passwordStrength }}/4</span></div>
              <div>Agree to Terms: <span class="text-primary">{{ form.agreeToTerms }}</span></div>
              <div>Form Valid: <span class="text-primary">{{ isFormValid }}</span></div>
              <div>Auth Loading: <span class="text-primary">{{ authStore.loading }}</span></div>
              <div>Field Errors: <span class="text-destructive">{{ Object.keys(fieldErrors).length > 0 ? Object.keys(fieldErrors).join(', ') : 'none' }}</span></div>
              <div>Last Input: <span class="text-primary">{{ lastInputTime }}</span></div>
            </div>
          </div>
        </form>

        <!-- Navigation to Sign In -->
        <div class="text-center">
          <p class="text-sm text-muted-foreground">
            Already have an admin account?{' '}
            <Button
              variant="link"
              class="px-0 font-normal"
              @click="$router.push('/auth/login')"
            >
              Sign in
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
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
import { EyeIcon, EyeOffIcon, LoaderIcon } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const isDev = computed(() => import.meta.env.DEV)

// UI State
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showDataTest = ref(false)
const showTerms = ref(false)
const showPrivacy = ref(false)
const lastInputTime = ref('')

// Form state with reactive tracking
const form = reactive({
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})

// Watch for form changes to track data reception
watch(form, () => {
  lastInputTime.value = new Date().toLocaleTimeString()
}, { deep: true })

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
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']
const strengthTextColors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600']
const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']

// Field validation
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

// Form validity check
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
    // Error is handled by the store with toast notifications
    console.error('Registration failed:', error)
  }
}

// Development helpers
if (isDev.value) {
  // Auto-fill form for testing (only in development)
  const autoFillTestData = () => {
    form.displayName = 'Test Admin'
    form.email = 'admin@test.com'
    form.password = 'Password123!'
    form.confirmPassword = 'Password123!'
    form.agreeToTerms = true
  }
  
  // Expose to window for console testing
  ;(window as any).registerFormTest = {
    form,
    fieldErrors,
    isFormValid,
    passwordStrength,
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
</style>