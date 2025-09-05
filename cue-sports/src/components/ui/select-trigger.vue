<template>
  <button
    type="button"
    @click="toggle"
    :class="cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      $attrs.class
    )"
    v-bind="$attrs"
  >
    <slot />
    <ChevronDown class="h-4 w-4 opacity-50" />
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const select = inject<{
  open: { value: boolean }
}>('select')

const toggle = () => {
  if (select) {
    select.open.value = !select.open.value
  }
}
</script>