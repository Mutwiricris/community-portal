<template>
  <div class="space-y-2">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, ref, watch } from 'vue'

interface Props {
  modelValue?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const currentValue = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  currentValue.value = newValue
})

const updateValue = (value: any) => {
  currentValue.value = value
  emit('update:modelValue', value)
}

provide('radioGroup', {
  value: currentValue,
  updateValue
})
</script>