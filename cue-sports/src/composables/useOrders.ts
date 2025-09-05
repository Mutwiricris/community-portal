import { computed, ref } from 'vue'
import { useFirestore } from './useFirestore'
import type { Order, OrderFilters } from '@/types/order'
import { orderBy, where, Timestamp } from 'firebase/firestore'

export const useOrders = () => {
  const {
    documents: orders,
    loading,
    error,
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe
  } = useFirestore<Order>('orders')

  const filters = ref<OrderFilters>({})

  const filteredOrders = computed(() => {
    let filtered = orders.value

    // Apply filters
    if (filters.value.status) {
      filtered = filtered.filter(o => o.status === filters.value.status)
    }
    if (filters.value.paymentMethod) {
      filtered = filtered.filter(o => o.paymentMethod === filters.value.paymentMethod)
    }
    if (filters.value.userId) {
      filtered = filtered.filter(o => o.userId === filters.value.userId)
    }
    if (filters.value.dateRange) {
      filtered = filtered.filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
        return orderDate >= filters.value.dateRange!.start && 
               orderDate <= filters.value.dateRange!.end
      })
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
      return bDate.getTime() - aDate.getTime()
    })
  })

  const completedOrders = computed(() =>
    orders.value.filter(o => o.status === 'completed')
  )

  const pendingOrders = computed(() =>
    orders.value.filter(o => o.status === 'pending')
  )

  const processingOrders = computed(() =>
    orders.value.filter(o => o.status === 'processing')
  )

  const failedOrders = computed(() =>
    orders.value.filter(o => o.status === 'failed')
  )

  const orderStats = computed(() => ({
    totalOrders: orders.value.length,
    totalRevenue: completedOrders.value.reduce((sum, o) => sum + o.total, 0),
    completedOrders: completedOrders.value.length,
    pendingOrders: pendingOrders.value.length,
    processingOrders: processingOrders.value.length,
    failedOrders: failedOrders.value.length,
    averageOrderValue: completedOrders.value.length > 0 
      ? completedOrders.value.reduce((sum, o) => sum + o.total, 0) / completedOrders.value.length 
      : 0
  }))

  const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = {
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return await add(data)
  }

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const data = {
      ...updates,
      updatedAt: new Date()
    }
    return await update(id, data)
  }

  const deleteOrder = async (id: string) => {
    return await remove(id)
  }

  const getOrder = async (id: string) => {
    return await getById(id)
  }

  const loadAllOrders = async () => {
    return await getAll([orderBy('createdAt', 'desc')])
  }

  const loadOrdersByStatus = async (status: string) => {
    return await getAll([
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    ])
  }

  const loadOrdersByUser = async (userId: string) => {
    return await getAll([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ])
  }

  const loadOrdersByPaymentMethod = async (paymentMethod: string) => {
    return await getAll([
      where('paymentMethod', '==', paymentMethod),
      orderBy('createdAt', 'desc')
    ])
  }

  const loadOrdersByDateRange = async (startDate: Date, endDate: Date) => {
    return await getAll([
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    ])
  }

  const subscribeOrders = () => {
    return subscribe([orderBy('createdAt', 'desc')])
  }

  const subscribeOrdersByUser = (userId: string) => {
    return subscribe([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ])
  }

  const setFilters = (newFilters: OrderFilters) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    return await updateOrder(id, { status })
  }

  const updatePaymentInfo = async (id: string, mpesaReceiptNumber: string) => {
    return await updateOrder(id, { mpesaReceiptNumber })
  }

  const completeOrder = async (id: string, mpesaReceiptNumber?: string) => {
    const updateData: Partial<Order> = { status: 'completed' }
    if (mpesaReceiptNumber) {
      updateData.mpesaReceiptNumber = mpesaReceiptNumber
    }
    return await updateOrder(id, updateData)
  }

  const cancelOrder = async (id: string) => {
    return await updateOrder(id, { status: 'cancelled' })
  }

  return {
    orders,
    filteredOrders,
    completedOrders,
    pendingOrders,
    processingOrders,
    failedOrders,
    orderStats,
    filters,
    loading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrder,
    loadAllOrders,
    loadOrdersByStatus,
    loadOrdersByUser,
    loadOrdersByPaymentMethod,
    loadOrdersByDateRange,
    subscribeOrders,
    subscribeOrdersByUser,
    setFilters,
    clearFilters,
    updateOrderStatus,
    updatePaymentInfo,
    completeOrder,
    cancelOrder
  }
}