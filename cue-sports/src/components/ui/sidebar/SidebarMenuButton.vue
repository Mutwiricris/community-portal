<template>
  <component
    :is="asChild ? 'div' : 'button'"
    :class="cn(
      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors',
      'hover:bg-accent hover:text-accent-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      isActive && 'bg-accent text-accent-foreground',
      isCollapsed ? 'justify-center px-2' : 'justify-start px-3',
      $attrs.class
    )"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { cn } from '@/lib/utils'

interface Props {
  href?: string
  asChild?: boolean
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()

const sidebar = inject('sidebar') as any
const isCollapsed = computed(() => sidebar?.isCollapsed?.value || false)

const isActive = computed(() => {
  if (!props.href) return false
  return route.path === props.href || route.path.startsWith(props.href + '/')
})

const handleClick = () => {
  if (props.href) {
    router.push(props.href)
  }
}
</script>