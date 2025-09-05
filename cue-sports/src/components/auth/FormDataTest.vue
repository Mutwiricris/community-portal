<template>
  <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-lg font-semibold mb-4">Form Data Reception Test</h2>
    
    <!-- Simple Input Test -->
    <div class="space-y-4">
      <div>
        <label for="test-input" class="block text-sm font-medium text-gray-700">
          Test Input
        </label>
        <Input
          id="test-input"
          v-model="testData.input"
          placeholder="Type something..."
          class="mt-1"
        />
        <p class="mt-1 text-sm text-gray-600">
          Value: <span class="font-mono">{{ testData.input || 'empty' }}</span>
        </p>
      </div>

      <div>
        <label for="test-email" class="block text-sm font-medium text-gray-700">
          Test Email
        </label>
        <Input
          id="test-email"
          v-model="testData.email"
          type="email"
          placeholder="test@example.com"
          class="mt-1"
        />
        <p class="mt-1 text-sm text-gray-600">
          Value: <span class="font-mono">{{ testData.email || 'empty' }}</span>
        </p>
      </div>

      <div>
        <label for="test-password" class="block text-sm font-medium text-gray-700">
          Test Password
        </label>
        <Input
          id="test-password"
          v-model="testData.password"
          type="password"
          placeholder="password"
          class="mt-1"
        />
        <p class="mt-1 text-sm text-gray-600">
          Value: <span class="font-mono">{{ testData.password ? '•'.repeat(testData.password.length) : 'empty' }}</span>
        </p>
      </div>

      <div>
        <div class="flex items-center space-x-2">
          <Checkbox
            id="test-checkbox"
            v-model:checked="testData.checkbox"
          />
          <label for="test-checkbox" class="text-sm text-gray-700">
            Test Checkbox
          </label>
        </div>
        <p class="mt-1 text-sm text-gray-600">
          Value: <span class="font-mono">{{ testData.checkbox }}</span>
        </p>
      </div>

      <Button @click="logData" class="w-full">
        Log Data to Console
      </Button>

      <div v-if="lastUpdate" class="text-xs text-gray-500">
        Last update: {{ lastUpdate }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const testData = reactive({
  input: '',
  email: '',
  password: '',
  checkbox: false
})

const lastUpdate = ref('')

watch(testData, () => {
  lastUpdate.value = new Date().toLocaleTimeString()
}, { deep: true })

const logData = () => {
  // Data logged for testing purposes - remove in production
}
</script>