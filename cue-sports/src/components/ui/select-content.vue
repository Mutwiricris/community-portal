<template>
  <div 
    v-if="open"
    class="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

const select = inject<{
  open: { value: boolean }
}>('select')

const open = computed(() => select?.open.value || false)
</script>