<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Title *
      </label>
      <input
        id="title"
        v-model="formData.title"
        type="text"
        required
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        placeholder="Enter todo title"
      />
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Description
      </label>
      <textarea
        id="description"
        v-model="formData.description"
        rows="3"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        placeholder="Enter description (optional)"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Priority
        </label>
        <select
          id="priority"
          v-model="formData.priority"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label for="dueDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Due Date
        </label>
        <input
          id="dueDate"
          v-model="formData.dueDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>

    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Tags
      </label>
      <input
        id="tags"
        v-model="tagsInput"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        placeholder="Enter tags separated by commas"
      />
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Separate tags with commas (e.g., work, urgent, meeting)
      </p>
    </div>

    <div class="flex gap-3 pt-4">
      <button
        type="submit"
        :disabled="!formData.title.trim() || loading"
        class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ loading ? 'Saving...' : (editingTodo ? 'Update Todo' : 'Add Todo') }}
      </button>
      
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
      >
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/types/todo'

interface Props {
  editingTodo?: Todo | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editingTodo: null,
  loading: false
})

const emit = defineEmits<{
  submit: [data: CreateTodoInput | UpdateTodoInput]
  cancel: []
}>()

const formData = ref({
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  dueDate: '',
})

const tagsInput = ref('')

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  }
  tagsInput.value = ''
}

const populateForm = (todo: Todo) => {
  formData.value = {
    title: todo.title,
    description: todo.description || '',
    priority: todo.priority,
    dueDate: todo.dueDate ? todo.dueDate.toISOString().split('T')[0] : '',
  }
  tagsInput.value = todo.tags?.join(', ') || ''
}

watch(() => props.editingTodo, (newTodo) => {
  if (newTodo) {
    populateForm(newTodo)
  } else {
    resetForm()
  }
}, { immediate: true })

const handleSubmit = () => {
  const tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  const submitData: CreateTodoInput | UpdateTodoInput = {
    title: formData.value.title.trim(),
    description: formData.value.description.trim() || undefined,
    priority: formData.value.priority,
    dueDate: formData.value.dueDate ? new Date(formData.value.dueDate) : undefined,
    tags: tags.length > 0 ? tags : undefined,
  }

  if (props.editingTodo) {
    emit('submit', submitData as UpdateTodoInput)
  } else {
    emit('submit', submitData as CreateTodoInput)
  }
}
</script>