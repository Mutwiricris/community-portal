<template>
  <button
    role="menuitem"
    :class="cn(
      'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors',
      disabled && 'opacity-50 cursor-not-allowed',
      destructive && 'text-red-600 hover:bg-red-50 hover:text-red-700',
      $attrs.class
    )"
    :disabled="disabled"
    @click="$emit('click')"
    v-bind="$attrs"
  >
    <div class="flex items-center">
      <slot name="icon" />
      <span :class="$slots.icon ? 'ml-2' : ''">
        <slot />
      </span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  disabled?: boolean
  destructive?: boolean
}

defineProps<Props>()
defineEmits<{
  click: []
}>()
</script>