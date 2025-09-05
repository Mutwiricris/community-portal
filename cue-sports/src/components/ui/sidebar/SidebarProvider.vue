<template>
  <div class="flex min-h-screen">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, ref } from 'vue'

const isCollapsed = ref(false)
const isMobile = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

provide('sidebar', {
  isCollapsed,
  isMobile,
  toggleSidebar
})
</script>