<template>
   <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <a href="#" class="flex items-center gap-2 self-center font-medium">
        <div class="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd class="size-4" />
        </div>
        Acme Inc.
      </a>
    <div class="flex flex-col gap-6">
      <Card>
        <CardHeader class="text-center">
          <CardTitle class="text-xl">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to access your cuesport community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleLogin">
            <div class="grid gap-6">
              <!-- Social Login Buttons -->
              <div class="flex flex-col gap-4">
                <Button variant="outline" class="w-full" @click="handleGoogleLogin" :disabled="isLoading">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Login with Google
                </Button>
                <Button variant="outline" class="w-full" @click="handleGithubLogin" :disabled="isLoading">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="mr-2 h-4 w-4">
                    <path
                      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                      fill="currentColor"
                    />
                  </svg>
                  Login with GitHub
                </Button>
              </div>

              <!-- Divider -->
              <div class="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span class="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              <!-- Error Alert -->
              <Alert v-if="error" variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <AlertDescription>{{ error }}</AlertDescription>
              </Alert>

              <!-- Email and Password Form -->
              <div class="grid gap-6">
                <div class="grid gap-3">
                  <Label for="email">Email</Label>
                  <Input
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="you@example.com"
                    autocomplete="email"
                    required
                    :disabled="isLoading"
                  />
                </div>
                <div class="grid gap-3">
                  <div class="flex items-center">
                    <Label for="password">Password</Label>
                    <a
                      href="#"
                      class="ml-auto text-sm underline-offset-4 hover:underline"
                      @click.prevent="handleForgotPassword"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input 
                    id="password" 
                    v-model="password"
                    type="password" 
                    autocomplete="current-password"
                    required 
                    :disabled="isLoading"
                  />
                </div>

                <!-- Remember Me -->
                <div class="flex items-center space-x-2">
                  <Checkbox id="remember" v-model:checked="rememberMe" />
                  <Label for="remember" class="text-sm font-normal cursor-pointer">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button type="submit" class="w-full" :disabled="isLoading">
                  <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                  {{ isLoading ? 'Signing in...' : 'Sign in' }}
                </Button>
              </div>

              <!-- Sign up link -->
              <div class="text-center text-sm">
                Don't have an account?
                <router-link to="/signup" class="underline underline-offset-4 hover:text-primary">
                  Sign up for free
                </router-link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Terms -->
      <div class="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our 
        <a href="#" class="underline underline-offset-4 hover:text-primary">Terms of Service</a>
        and 
        <a href="#" class="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
      </div>
    </div>
    </div>
  </div>
  
  
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const result = await authStore.login(email.value, password.value)
    
    if (result.success) {
      router.push('/dashboard')
    } else {
      error.value = result.error || 'Invalid email or password'
    }
  } catch (err) {
    error.value = 'An unexpected error occurred. Please try again.'
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = () => {
  console.log('Forgot password clicked')
}

const handleGoogleLogin = () => {
  console.log('Google login clicked')
}

const handleGithubLogin = () => {
  console.log('GitHub login clicked')
}
</script>