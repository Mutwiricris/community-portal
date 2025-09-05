<template>
  <aside 
    :class="cn(
      'relative flex h-screen flex-col border-r bg-background transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      $attrs.class
    )"
  >
    <slot />
  </aside>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  collapsible?: 'icon' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  collapsible: 'icon'
})

const sidebar = inject('sidebar') as any
const isCollapsed = computed(() => sidebar?.isCollapsed?.value || false)
</script>