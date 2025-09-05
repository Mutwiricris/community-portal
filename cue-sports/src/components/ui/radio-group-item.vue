<template>
  <div class="flex items-center">
    <input
      :id="id"
      type="radio"
      :value="value"
      :checked="isChecked"
      @change="handleChange"
      class="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'

interface Props {
  value: any
  id?: string
}

const props = defineProps<Props>()

const radioGroup = inject<{
  value: { value: any }
  updateValue: (value: any) => void
}>('radioGroup')

const isChecked = computed(() => radioGroup?.value.value === props.value)

const handleChange = () => {
  radioGroup?.updateValue(props.value)
}
</script>