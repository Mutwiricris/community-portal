import { ref, computed } from 'vue'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useAuth } from '@/composables/useAuth'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/types/todo'

export const useTodos = () => {
  const db = getFirebaseDb()
  const { user } = useAuth()
  
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const COLLECTION_NAME = 'todos'

  const convertFirestoreTimestamp = (timestamp: any): Date => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate()
    }
    return new Date(timestamp)
  }

  const mapFirestoreDoc = (doc: any): Todo => {
    const data = doc.data()
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      completed: data.completed,
      priority: data.priority,
      createdAt: convertFirestoreTimestamp(data.createdAt),
      updatedAt: convertFirestoreTimestamp(data.updatedAt),
      userId: data.userId,
      dueDate: data.dueDate ? convertFirestoreTimestamp(data.dueDate) : undefined,
      tags: data.tags || []
    }
  }

  const loadTodos = () => {
    if (!user.value) {
      console.warn('User not authenticated')
      return
    }

    loading.value = true
    error.value = null

    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', user.value.uid),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        todos.value = querySnapshot.docs.map(mapFirestoreDoc)
        loading.value = false
      }, (err) => {
        console.error('Error loading todos:', err)
        error.value = 'Failed to load todos'
        loading.value = false
      })

      return unsubscribe
    } catch (err) {
      console.error('Error setting up todos listener:', err)
      error.value = 'Failed to load todos'
      loading.value = false
    }
  }

  const addTodo = async (todoData: CreateTodoInput): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    try {
      const newTodo = {
        title: todoData.title,
        description: todoData.description || '',
        completed: false,
        priority: todoData.priority || 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.value.uid,
        dueDate: todoData.dueDate ? Timestamp.fromDate(todoData.dueDate) : null,
        tags: todoData.tags || []
      }

      await addDoc(collection(db, COLLECTION_NAME), newTodo)
    } catch (err) {
      console.error('Error adding todo:', err)
      throw new Error('Failed to add todo')
    }
  }

  const updateTodo = async (todoId: string, updates: UpdateTodoInput): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    try {
      const todoRef = doc(db, COLLECTION_NAME, todoId)
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      if (updates.dueDate) {
        updateData.dueDate = Timestamp.fromDate(updates.dueDate)
      }

      await updateDoc(todoRef, updateData)
    } catch (err) {
      console.error('Error updating todo:', err)
      throw new Error('Failed to update todo')
    }
  }

  const deleteTodo = async (todoId: string): Promise<void> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, todoId))
    } catch (err) {
      console.error('Error deleting todo:', err)
      throw new Error('Failed to delete todo')
    }
  }

  const toggleTodo = async (todoId: string): Promise<void> => {
    const todo = todos.value.find(t => t.id === todoId)
    if (!todo) {
      throw new Error('Todo not found')
    }

    await updateTodo(todoId, { completed: !todo.completed })
  }

  const completedTodos = computed(() => todos.value.filter(todo => todo.completed))
  const pendingTodos = computed(() => todos.value.filter(todo => !todo.completed))
  const highPriorityTodos = computed(() => todos.value.filter(todo => todo.priority === 'high'))
  const overdueTodos = computed(() => 
    todos.value.filter(todo => 
      !todo.completed && 
      todo.dueDate && 
      todo.dueDate < new Date()
    )
  )

  return {
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
  }
}