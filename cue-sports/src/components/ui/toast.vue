<template>
  <div
    :class="cn(
      'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
      variantStyles[variant],
      $attrs.class
    )"
  >
    <div class="grid gap-1">
      <div v-if="title" class="text-sm font-semibold">{{ title }}</div>
      <div v-if="description" class="text-sm opacity-90">{{ description }}</div>
      <slot />
    </div>
    <button
      v-if="closeable"
      @click="$emit('close')"
      class="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
  title?: string
  description?: string
  closeable?: boolean
}

interface Emits {
  close: []
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  closeable: true
})

defineEmits<Emits>()

const variantStyles = {
  default: 'border bg-background text-foreground',
  destructive: 'destructive border-destructive bg-destructive text-destructive-foreground',
  success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50'
}
</script>