export interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
  userId: string
  dueDate?: Date
  tags?: string[]
}

export interface CreateTodoInput {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: Date
  tags?: string[]
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  completed?: boolean
  priority?: 'low' | 'medium' | 'high'
  dueDate?: Date
  tags?: string[]
}