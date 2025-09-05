<template>
  <div 
    :class="cn(
      'px-2 text-xs font-semibold text-muted-foreground transition-opacity',
      isCollapsed ? 'opacity-0' : 'opacity-100'
    )"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { cn } from '@/lib/utils'

const sidebar = inject('sidebar') as any
const isCollapsed = computed(() => sidebar?.isCollapsed?.value || false)
</script>