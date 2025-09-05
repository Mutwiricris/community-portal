<template>
  <span>
    <slot v-if="hasSelection" :value="currentValue" />
    <span v-else class="text-muted-foreground">{{ placeholder }}</span>
  </span>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

interface Props {
  placeholder?: string
}

defineProps<Props>()

const select = inject<{
  value: { value: string }
}>('select')

const currentValue = computed(() => select?.value.value || '')
const hasSelection = computed(() => currentValue.value !== '')
</script>