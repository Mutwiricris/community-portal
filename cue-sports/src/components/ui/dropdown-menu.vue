<template>
  <div class="relative">
    <slot name="trigger" :toggle="toggle" />
    <div 
      v-if="open"
      class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
      @click="handleMenuClick"
    >
      <div class="py-1" role="menu">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const open = ref(false)

const toggle = () => {
  open.value = !open.value
}

const handleMenuClick = (event: Event) => {
  // Close menu when clicking on menu items
  const target = event.target as HTMLElement
  if (target.closest('[role="menuitem"]')) {
    open.value = false
  }
}

const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>