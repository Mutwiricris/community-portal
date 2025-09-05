<template>
  <div class="topbar fixed top-0 left-64 right-0 h-16 bg-white shadow-sm border-b z-20">
    <div class="flex items-center justify-between px-6 h-full">
      <div class="flex items-center">
        <h1 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h1>
      </div>
      
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">{{ userDisplayName }}</span>
        <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center cursor-pointer">
          {{ userInitials }}
        </div>
        <button 
          @click="handleLogout"
          class="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded border hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    communities: 'Community Manager',
    members: 'Member Manager',
    profile: 'User Profile'
  }
  return titles[route.name as string] || 'CueSports Portal'
})

const userDisplayName = computed(() => 
  authStore.user?.displayName || authStore.user?.email || 'User'
)

const userInitials = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>


<style scoped>
@media (max-width: 768px) {
  .topbar {
    left: 0;
  }
}
</style>