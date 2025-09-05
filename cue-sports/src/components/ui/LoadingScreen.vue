<template>
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Bot class="w-6 h-6 text-primary animate-pulse" />
        </div>
        <h2 class="text-xl font-semibold">{{ title }}</h2>
        <p class="text-sm text-muted-foreground mt-1">{{ subtitle }}</p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium">Progress</span>
          <span class="text-sm text-muted-foreground">{{ currentStep }}/{{ totalSteps }}</span>
        </div>
        <div class="w-full bg-secondary rounded-full h-2">
          <div 
            class="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Current Step -->
      <div class="mb-4">
        <div class="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
          <div class="flex-shrink-0">
            <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <div v-if="isLoading" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <CheckCircle v-else class="w-4 h-4 text-white" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{{ currentStepName }}</p>
            <p class="text-xs text-muted-foreground">{{ currentStepDescription }}</p>
          </div>
        </div>
      </div>

      <!-- Log Messages -->
      <div class="bg-secondary/50 rounded-lg p-3 max-h-32 overflow-y-auto">
        <div class="space-y-1">
          <div 
            v-for="(log, index) in displayLogs" 
            :key="index"
            class="text-xs flex items-start space-x-2"
            :class="getLogClass(log.type)"
          >
            <div class="flex-shrink-0 mt-0.5">
              <div class="w-1.5 h-1.5 rounded-full" :class="getLogDotClass(log.type)"></div>
            </div>
            <div class="flex-1 min-w-0">
              <span class="break-words">{{ log.message }}</span>
              <span class="text-muted-foreground ml-1">({{ formatTime(log.timestamp) }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          @click="$emit('cancel')"
          :disabled="!canCancel"
        >
          Cancel
        </Button>
        <Button 
          v-if="isComplete && !hasError"
          size="sm" 
          @click="$emit('continue')"
        >
          Continue
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, CheckCircle } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'

export interface LoadingStep {
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface LogMessage {
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

interface Props {
  title: string
  subtitle?: string
  steps: LoadingStep[]
  logs: LogMessage[]
  isLoading: boolean
  canCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  canCancel: true
})

defineEmits<{
  cancel: []
  continue: []
}>()

const MAX_LOGS = 50

const currentStep = computed(() => {
  const runningIndex = props.steps.findIndex(step => step.status === 'running')
  if (runningIndex !== -1) return runningIndex + 1
  
  const completedCount = props.steps.filter(step => step.status === 'completed').length
  return Math.min(completedCount + 1, props.steps.length)
})

const totalSteps = computed(() => props.steps.length)

const progressPercentage = computed(() => {
  if (totalSteps.value === 0) return 0
  const completedSteps = props.steps.filter(step => step.status === 'completed').length
  return Math.round((completedSteps / totalSteps.value) * 100)
})

const currentStepName = computed(() => {
  const runningStep = props.steps.find(step => step.status === 'running')
  if (runningStep) return runningStep.name
  
  const currentIndex = currentStep.value - 1
  if (currentIndex < props.steps.length) {
    return props.steps[currentIndex].name
  }
  
  return 'Completed'
})

const currentStepDescription = computed(() => {
  const runningStep = props.steps.find(step => step.status === 'running')
  if (runningStep) return runningStep.description
  
  const currentIndex = currentStep.value - 1
  if (currentIndex < props.steps.length) {
    return props.steps[currentIndex].description
  }
  
  return 'All steps completed successfully'
})

const isComplete = computed(() => {
  return props.steps.every(step => step.status === 'completed' || step.status === 'error')
})

const hasError = computed(() => {
  return props.steps.some(step => step.status === 'error')
})

const displayLogs = computed(() => {
  return props.logs.slice(-MAX_LOGS).reverse()
})

const getLogClass = (type: LogMessage['type']) => {
  switch (type) {
    case 'error': return 'text-destructive'
    case 'warning': return 'text-yellow-600'
    case 'success': return 'text-green-600'
    default: return 'text-muted-foreground'
  }
}

const getLogDotClass = (type: LogMessage['type']) => {
  switch (type) {
    case 'error': return 'bg-destructive'
    case 'warning': return 'bg-yellow-500'
    case 'success': return 'bg-green-500'
    default: return 'bg-muted-foreground'
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}
</script>