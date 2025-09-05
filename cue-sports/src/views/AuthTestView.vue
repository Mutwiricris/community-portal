<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Authentication System Test</h1>
        <p class="mt-2 text-gray-600">Test form data reception and authentication flow</p>
      </div>

      <!-- Auth Status -->
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User:</strong> {{ authStore.user?.email || 'Not logged in' }}
            </div>
            <div>
              <strong>Loading:</strong> {{ authStore.loading }}
            </div>
            <div>
              <strong>Authenticated:</strong> {{ authStore.isAuthenticated }}
            </div>
            <div>
              <strong>Admin:</strong> {{ authStore.isAdmin }}
            </div>
            <div>
              <strong>Initialized:</strong> {{ authStore.initialized }}
            </div>
            <div>
              <strong>Error:</strong> {{ authStore.error || 'None' }}
            </div>
          </div>
          
          <div class="mt-4 flex space-x-2">
            <Button @click="refreshAuth" size="sm">Refresh Auth</Button>
            <Button @click="logout" variant="outline" size="sm" v-if="authStore.isAuthenticated">Logout</Button>
          </div>
        </CardContent>
      </Card>

      <!-- Form Data Test -->
      <Card>
        <CardHeader>
          <CardTitle>Form Data Reception Test</CardTitle>
        </CardHeader>
        <CardContent>
          <FormDataTest />
        </CardContent>
      </Card>

      <!-- Quick Login Test -->
      <Card>
        <CardHeader>
          <CardTitle>Quick Login Test</CardTitle>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="quickLogin" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label for="quick-email">Email</Label>
                <Input
                  id="quick-email"
                  v-model="quickForm.email"
                  type="email"
                  placeholder="admin@test.com"
                />
              </div>
              <div>
                <Label for="quick-password">Password</Label>
                <Input
                  id="quick-password"
                  v-model="quickForm.password"
                  type="password"
                  placeholder="password"
                />
              </div>
            </div>
            
            <div class="flex space-x-2">
              <Button type="submit" :disabled="!quickForm.email || !quickForm.password || authStore.loading">
                {{ authStore.loading ? 'Logging in...' : 'Quick Login' }}
              </Button>
              <Button type="button" @click="fillTestData" variant="outline">
                Fill Test Data
              </Button>
            </div>

            <div v-if="quickLoginResult" class="p-3 rounded-md text-sm" :class="quickLoginResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
              {{ quickLoginResult.message }}
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Firebase Connection Test -->
      <Card>
        <CardHeader>
          <CardTitle>Firebase Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <Button @click="testFirebaseHealth" :disabled="healthChecking">
              {{ healthChecking ? 'Checking...' : 'Check Firebase Health' }}
            </Button>
            
            <div v-if="healthResult" class="p-3 rounded-md text-sm font-mono bg-gray-100">
              <pre>{{ JSON.stringify(healthResult, null, 2) }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Navigation Links -->
      <Card>
        <CardHeader>
          <CardTitle>Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-2">
            <Button @click="$router.push('/auth/login')" variant="outline">Login Page</Button>
            <Button @click="$router.push('/auth/signup')" variant="outline">Signup Page</Button>
            <Button @click="$router.push('/dashboard')" variant="outline">Dashboard</Button>
            <Button @click="$router.push('/profile')" variant="outline">Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores'
import { checkFirebaseHealth } from '@/firebase/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FormDataTest from '@/components/auth/FormDataTest.vue'

const authStore = useAuthStore()

// Quick login form
const quickForm = reactive({
  email: '',
  password: ''
})

const quickLoginResult = ref<{ success: boolean; message: string } | null>(null)
const healthChecking = ref(false)
const healthResult = ref<any>(null)

// Fill test data
const fillTestData = () => {
  quickForm.email = 'admin@test.com'
  quickForm.password = 'password123'
}

// Quick login test
const quickLogin = async () => {
  quickLoginResult.value = null
  
  try {
    await authStore.login(quickForm.email, quickForm.password)
    quickLoginResult.value = {
      success: true,
      message: 'Login successful!'
    }
  } catch (error: any) {
    quickLoginResult.value = {
      success: false,
      message: error.message || 'Login failed'
    }
  }
}

// Test Firebase health
const testFirebaseHealth = async () => {
  healthChecking.value = true
  
  try {
    healthResult.value = checkFirebaseHealth()
  } catch (error) {
    healthResult.value = { error: error }
  } finally {
    healthChecking.value = false
  }
}

// Refresh auth
const refreshAuth = async () => {
  try {
    await authStore.initAuth()
  } catch (error) {
    console.error('Auth refresh failed:', error)
  }
}

// Logout
const logout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Auto-run health check on mount
testFirebaseHealth()
</script>