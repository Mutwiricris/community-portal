<template>
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg
        class="h-4 w-4 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
    <Input
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :placeholder="placeholder"
      class="pl-10"
      :class="$attrs.class"
      v-bind="$attrs"
    />
    <Button
      v-if="modelValue && clearable"
      variant="ghost"
      size="sm"
      class="absolute inset-y-0 right-0 px-3 h-full"
      @click="$emit('update:modelValue', '')"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </Button>
  </div>
</template>

<script setup lang="ts">
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'

interface Props {
  modelValue: string
  placeholder?: string
  clearable?: boolean
}

interface Emits {
  'update:modelValue': [value: string]
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  clearable: true
})

defineEmits<Emits>()
</script>