<template>
  <RouterLink
    :to="to"
    :class="cn(
      'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
    )"
  >
    <component :is="icon" class="h-4 w-4" />
    <span>{{ label }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

interface Props {
  to: string
  icon: any
  label: string
}

const props = defineProps<Props>()
const route = useRoute()

const isActive = computed(() => {
  if (props.to === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(props.to)
})
</script>