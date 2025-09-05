<template>
  <input
    type="checkbox"
    :class="cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      $attrs.class
    )"
    :checked="checked"
    @change="$emit('update:checked', ($event.target as HTMLInputElement).checked)"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  checked?: boolean
}

defineProps<Props>()
defineEmits<{
  'update:checked': [value: boolean]
}>()
</script>