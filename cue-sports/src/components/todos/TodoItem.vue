<template>
  <div class="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
    <input 
      type="checkbox" 
      :checked="todo.completed"
      @change="toggleComplete"
      class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
    />
    
    <div class="flex-1 min-w-0">
      <h3 
        class="font-medium text-gray-900 dark:text-white truncate"
        :class="{ 'line-through text-gray-500': todo.completed }"
      >
        {{ todo.title }}
      </h3>
      
      <p 
        v-if="todo.description" 
        class="text-sm text-gray-600 dark:text-gray-400 mt-1"
        :class="{ 'line-through': todo.completed }"
      >
        {{ todo.description }}
      </p>
      
      <div class="flex items-center gap-2 mt-2">
        <span 
          class="px-2 py-1 text-xs font-medium rounded-full"
          :class="priorityClasses"
        >
          {{ todo.priority }}
        </span>
        
        <span 
          v-if="todo.dueDate" 
          class="text-xs text-gray-500 dark:text-gray-400"
          :class="{ 'text-red-600 dark:text-red-400': isOverdue && !todo.completed }"
        >
          Due: {{ formatDate(todo.dueDate) }}
        </span>
        
        <div v-if="todo.tags && todo.tags.length > 0" class="flex gap-1">
          <span 
            v-for="tag in todo.tags" 
            :key="tag"
            class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-2">
      <button 
        @click="$emit('edit', todo)"
        class="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      </button>
      
      <button 
        @click="$emit('delete', todo.id)"
        class="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Todo } from '@/types/todo'

interface Props {
  todo: Todo
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [todo: Todo]
  delete: [id: string]
}>()

const toggleComplete = () => {
  emit('toggle', props.todo.id)
}

const priorityClasses = computed(() => {
  switch (props.todo.priority) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
})

const isOverdue = computed(() => {
  return props.todo.dueDate && props.todo.dueDate < new Date()
})

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>