<template>
  <aside class="fixed left-0 top-0 h-full w-64 bg-white shadow-lg border-r z-10 flex flex-col">
    <div class="p-6 border-b">
      <h2 class="text-xl font-bold text-gray-800">CueSports Portal</h2>
      <p class="text-sm text-gray-600 mt-1">Community Leader</p>
    </div>
    <nav class="flex-1 py-4 px-2 flex flex-col gap-1">
      <button
        v-for="item in menuItems"
        :key="item.label"
        @click="item.command()"
        class="flex items-center gap-3 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition text-base font-medium"
      >
        <component :is="item.icon" class="w-5 h-5 text-gray-400" v-if="item.icon" />
        {{ item.label }}
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// Example: import { Home, Users, UserCircle, UserCog } from 'lucide-vue-next' (or similar for icons)
import { Home, Users, UserCircle, UserCog } from 'lucide-vue-next'

const router = useRouter()

const menuItems = [
  {
    label: 'Dashboard',
    icon: Home,
    command: () => router.push('/dashboard')
  },
  {
    label: 'Communities',
    icon: Users,
    command: () => router.push('/communities')
  },
  {
    label: 'Members',
    icon: UserCircle,
    command: () => router.push('/members')
  },
  {
    label: 'Profile',
    icon: UserCog,
    command: () => router.push('/profile')
  }
]
// NOTE: You must install lucide-vue-next for icons: npm install lucide-vue-next
</script>

<style scoped>
.sidebar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.sidebar-header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.sidebar-header h2 {
  color: white;
}

.sidebar-header p {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.p-panelmenu) {
  background: transparent;
}

:deep(.p-panelmenu .p-panelmenu-content) {
  background: transparent;
  border: none;
}

:deep(.p-panelmenu .p-menuitem-link) {
  color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  margin: 4px 12px;
  transition: all 0.2s;
}

:deep(.p-panelmenu .p-menuitem-link:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

:deep(.p-panelmenu .p-menuitem-icon) {
  color: rgba(255, 255, 255, 0.7);
}
</style>