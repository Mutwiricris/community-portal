<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Todo List</h2>
        <p class="text-gray-600 dark:text-gray-400">
          {{ pendingTodos.length }} pending, {{ completedTodos.length }} completed
        </p>
      </div>
      
      <button
        @click="showForm = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Add Todo
      </button>
    </div>

    <div v-if="showForm" class="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {{ editingTodo ? 'Edit Todo' : 'Add New Todo' }}
      </h3>
      <TodoForm
        :editing-todo="editingTodo"
        :loading="loading"
        @submit="handleSubmit"
        @cancel="cancelForm"
      />
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="filter in filters"
        :key="filter.key"
        @click="activeFilter = filter.key"
        class="px-3 py-1 rounded-full text-sm font-medium transition-colors"
        :class="activeFilter === filter.key 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
      >
        {{ filter.label }} ({{ filter.count }})
      </button>
    </div>

    <div v-if="loading && todos.length === 0" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Loading todos...</p>
    </div>

    <div v-else-if="filteredTodos.length === 0" class="text-center py-8">
      <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
      <p class="text-gray-600 dark:text-gray-400">
        {{ activeFilter === 'all' ? 'No todos yet' : `No ${activeFilter} todos` }}
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mt-1">
        Click "Add Todo" to create your first todo item
      </p>
    </div>

    <div v-else class="space-y-2">
      <TodoItem
        v-for="todo in filteredTodos"
        :key="todo.id"
        :todo="todo"
        @toggle="handleToggle"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
      <div class="flex">
        <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        <div>
          <h3 class="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTodos } from '@/composables/useTodos'
import { useToast } from '@/composables/useToast'
import TodoItem from './TodoItem.vue'
import TodoForm from './TodoForm.vue'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/types/todo'

const {
  todos,
  loading,
  error,
  completedTodos,
  pendingTodos,
  highPriorityTodos,
  overdueTodos,
  loadTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodo
} = useTodos()

const { success: showSuccess, error: showError } = useToast()

const showForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const activeFilter = ref<'all' | 'pending' | 'completed' | 'high' | 'overdue'>('all')

let unsubscribe: (() => void) | undefined

const filters = computed(() => [
  { key: 'all', label: 'All', count: todos.value.length },
  { key: 'pending', label: 'Pending', count: pendingTodos.value.length },
  { key: 'completed', label: 'Completed', count: completedTodos.value.length },
  { key: 'high', label: 'High Priority', count: highPriorityTodos.value.length },
  { key: 'overdue', label: 'Overdue', count: overdueTodos.value.length },
])

const filteredTodos = computed(() => {
  switch (activeFilter.value) {
    case 'pending':
      return pendingTodos.value
    case 'completed':
      return completedTodos.value
    case 'high':
      return highPriorityTodos.value
    case 'overdue':
      return overdueTodos.value
    default:
      return todos.value
  }
})

const handleSubmit = async (data: CreateTodoInput | UpdateTodoInput) => {
  try {
    if (editingTodo.value) {
      await updateTodo(editingTodo.value.id, data as UpdateTodoInput)
      showSuccess('Todo updated successfully')
    } else {
      await addTodo(data as CreateTodoInput)
      showSuccess('Todo added successfully')
    }
    cancelForm()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to save todo')
  }
}

const handleToggle = async (todoId: string) => {
  try {
    await toggleTodo(todoId)
    showSuccess('Todo updated')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to update todo')
  }
}

const handleEdit = (todo: Todo) => {
  editingTodo.value = todo
  showForm.value = true
}

const handleDelete = async (todoId: string) => {
  if (confirm('Are you sure you want to delete this todo?')) {
    try {
      await deleteTodo(todoId)
      showSuccess('Todo deleted successfully')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete todo')
    }
  }
}

const cancelForm = () => {
  showForm.value = false
  editingTodo.value = null
}

onMounted(() => {
  unsubscribe = loadTodos()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>