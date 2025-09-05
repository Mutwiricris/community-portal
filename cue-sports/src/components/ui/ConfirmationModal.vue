<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Overlay -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="onCancel"></div>
    
    <!-- Modal -->
    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
      <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
        <!-- Icon -->
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full" :class="iconClass">
          <component :is="icon" class="h-6 w-6" :class="iconColor" />
        </div>
        
        <!-- Content -->
        <div class="mt-3 text-center sm:mt-5">
          <h3 class="text-base font-semibold leading-6 text-gray-900">{{ title }}</h3>
          <div class="mt-2">
            <p class="text-sm text-gray-500">{{ message }}</p>
            
            <!-- Details Section -->
            <div v-if="details && details.length > 0" class="mt-4 space-y-2">
              <div class="bg-gray-50 rounded-lg p-3 text-left">
                <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Details</h4>
                <div class="space-y-1">
                  <div v-for="detail in details" :key="detail.label" class="flex justify-between text-sm">
                    <span class="text-gray-600">{{ detail.label }}:</span>
                    <span class="font-medium text-gray-900">{{ detail.value }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Warning Text -->
            <div v-if="warningText" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p class="text-sm text-yellow-800">{{ warningText }}</p>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button
            type="button"
            :class="confirmButtonClass"
            @click="onConfirm"
            :disabled="loading"
          >
            <span v-if="loading" class="animate-spin mr-2">⟳</span>
            {{ loading ? 'Processing...' : confirmText }}
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
            @click="onCancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-vue-next'

interface Detail {
  label: string
  value: string
}

interface Props {
  isOpen: boolean
  title: string
  message: string
  details?: Detail[]
  warningText?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'success' | 'info'
  loading?: boolean
}

interface Emits {
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  loading: false
})

const emit = defineEmits<Emits>()

const icon = computed(() => {
  switch (props.variant) {
    case 'danger': return XCircle
    case 'warning': return AlertTriangle
    case 'success': return CheckCircle
    default: return Info
  }
})

const iconClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'bg-red-100'
    case 'warning': return 'bg-yellow-100'
    case 'success': return 'bg-green-100'
    default: return 'bg-blue-100'
  }
})

const iconColor = computed(() => {
  switch (props.variant) {
    case 'danger': return 'text-red-600'
    case 'warning': return 'text-yellow-600'
    case 'success': return 'text-green-600'
    default: return 'text-blue-600'
  }
})

const confirmButtonClass = computed(() => {
  const base = 'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:col-start-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  switch (props.variant) {
    case 'danger': 
      return `${base} bg-red-600 hover:bg-red-500 focus-visible:outline-red-600`
    case 'warning': 
      return `${base} bg-yellow-600 hover:bg-yellow-500 focus-visible:outline-yellow-600`
    case 'success': 
      return `${base} bg-green-600 hover:bg-green-500 focus-visible:outline-green-600`
    default: 
      return `${base} bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600`
  }
})

const onConfirm = () => {
  if (!props.loading) {
    emit('confirm')
  }
}

const onCancel = () => {
  if (!props.loading) {
    emit('cancel')
  }
}
</script>