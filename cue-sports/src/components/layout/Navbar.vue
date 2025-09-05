<template>
  <header class="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="flex items-center justify-between h-full px-4">
      <!-- Mobile menu button -->
      <Button 
        variant="ghost" 
        size="icon" 
        @click="$emit('toggle-sidebar')"
        class="lg:hidden"
      >
        <Menu class="h-4 w-4" />
      </Button>

      <!-- Page title -->
      <div class="flex-1 lg:ml-0 ml-4">
        <h1 class="text-lg font-semibold">{{ pageTitle }}</h1>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-2">
        <!-- Theme toggle -->
        <Button 
          variant="ghost" 
          size="icon" 
          @click="toggleTheme"
        >
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </Button>

        <!-- Notifications -->
        <Button variant="ghost" size="icon">
          <Bell class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, Sun, Moon, Bell } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import Button from '@/components/ui/button.vue'

defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const { isDark, toggleTheme } = useTheme()

const pageTitle = computed(() => {
  const routeNames: Record<string, string> = {
    Dashboard: 'Dashboard',
    Tournaments: 'Tournaments',
    TournamentDetail: 'Tournament Details',
    Players: 'Players',
    PlayerDetail: 'Player Profile',
    Products: 'Products',
    Orders: 'Orders',
    Finance: 'Finance'
  }
  
  return routeNames[route.name as string] || 'PoolPal'
})
</script>