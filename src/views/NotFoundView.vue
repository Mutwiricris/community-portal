<template>
  <div class="min-h-screen  flex items-center justify-center bg-gray-200">
    <h1 class=" font-bold text-gray-500 mb-4">404</h1>
    <Separator  orientation="vertical" />
    <h2 class="text- font-bold text-gray-700 mb-6">|</h2>

     <h2 class="text- font-bold text-gray-700 mb-6">Page Not Found</h2>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home, LayoutDashboard } from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'
const router = useRouter()
const authStore = useAuthStore()

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goHome()
  }
}

const goHome = () => {
  router.push('/')
}

const goToDashboard = () => {
  router.push('/dashboard')
}
</script>