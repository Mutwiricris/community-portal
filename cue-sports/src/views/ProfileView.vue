<template>
  <div class="max-w-4xl mx-auto">
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h1 class="text-2xl font-semibold text-gray-900">Profile Settings</h1>
        </div>
        
        <div class="p-6">
          <form @submit.prevent="handleUpdateProfile" class="space-y-6">
            <div>
              <label for="displayName" class="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <Input
                id="displayName"
                v-model="form.displayName"
                type="text"
                class="mt-1"
                :disabled="loading"
              />
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                v-model="form.email"
                type="email"
                class="mt-1"
                disabled
                title="Email cannot be changed"
              />
              <p class="mt-2 text-sm text-gray-500">
                Email address cannot be changed
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">
                Role
              </label>
              <p class="mt-1 text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded">
                {{ authStore.userProfile?.role === 'admin' ? 'Administrator' : 'User' }}
              </p>
            </div>

            <div class="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                @click="resetForm"
                :disabled="loading"
              >
                Reset
              </Button>
              
              <Button
                type="submit"
                :disabled="loading || !hasChanges"
              >
                {{ loading ? 'Saving...' : 'Save Changes' }}
              </Button>
            </div>

            <div v-if="message" class="p-3 text-sm rounded-md" :class="messageClass">
              {{ message }}
            </div>
          </form>

          <div class="mt-8 pt-8 border-t border-gray-200">
            <Button
              variant="outline"
              @click="handleLogout"
              :disabled="loading"
              class="text-red-600 border-red-300 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const form = reactive({
  displayName: '',
  email: ''
})

const messageClass = computed(() => ({
  'text-green-600 bg-green-50 border border-green-200': messageType.value === 'success',
  'text-red-600 bg-red-50 border border-red-200': messageType.value === 'error'
}))

const hasChanges = computed(() => {
  if (!authStore.userProfile) return false
  return form.displayName !== authStore.userProfile.displayName
})

const resetForm = () => {
  if (authStore.userProfile) {
    form.displayName = authStore.userProfile.displayName
    form.email = authStore.userProfile.email
  }
  message.value = ''
}

const handleUpdateProfile = async () => {
  if (!hasChanges.value) return

  loading.value = true
  message.value = ''

  try {
    await authStore.updateProfile({
      displayName: form.displayName
    })
    
    message.value = 'Profile updated successfully'
    messageType.value = 'success'
    
    // Clear message after 3 seconds
    setTimeout(() => {
      message.value = ''
    }, 3000)
    
  } catch (error: any) {
    message.value = error.message || 'Failed to update profile'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  loading.value = true
  
  try {
    await authStore.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  resetForm()
})
</script>