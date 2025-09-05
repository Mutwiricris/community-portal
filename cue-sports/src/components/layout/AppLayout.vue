<template>
  <div class="min-h-screen bg-background">
    <Sidebar :is-open="sidebarOpen" @toggle="toggleSidebar" />
    
    <div class="lg:ml-64">
      <Navbar @toggle-sidebar="toggleSidebar" />
      
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}
</script>