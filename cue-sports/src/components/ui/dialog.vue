<template>
  <!-- Dialog Root -->
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-background/80 backdrop-blur-sm"
      @click="$emit('update:open', false)"
    />
    
    <!-- Dialog Content Container -->
    <div class="relative">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  open?: boolean
}

defineProps<Props>()
defineEmits<{
  'update:open': [value: boolean]
}>()
</script>