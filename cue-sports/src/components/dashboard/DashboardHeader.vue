<template>
  <div class="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
    <div class="flex flex-col space-y-1">
      <h1 class="text-2xl font-bold tracking-tight lg:text-3xl">
        {{ greeting }}
      </h1>
      <p class="text-muted-foreground">
        {{ subtitle }}
      </p>
    </div>
    <div class="flex items-center space-x-2">
      <Button variant="outline" size="sm" @click="refreshData">
        <RotateCcw class="mr-2 h-4 w-4" />
        Refresh
      </Button>
      <Button @click="$emit('new-tournament')">
        <Plus class="mr-2 h-4 w-4" />
        New Tournament
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus, RotateCcw } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'

interface Props {
  userName?: string
}

interface Emits {
  'new-tournament': []
  'refresh': []
}

const props = withDefaults(defineProps<Props>(), {
  userName: 'User'
})

const emit = defineEmits<Emits>()

const greeting = computed(() => {
  const hour = new Date().getHours()
  let timeGreeting = 'Good evening'
  
  if (hour < 12) timeGreeting = 'Good morning'
  else if (hour < 18) timeGreeting = 'Good afternoon'
  
  return `${timeGreeting}, ${props.userName}!`
})

const subtitle = computed(() => {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  return `Here's what's happening today, ${today}`
})

const refreshData = () => {
  emit('refresh')
}
</script>