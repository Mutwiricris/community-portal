export interface OrderItem {
  imageUrl: string
  price: number
  productId: string
  product_name: string
  quantity: number
}

export interface Order {
  id: string
  createdAt: Date | any // Support Firebase Timestamp
  updatedAt: Date | any // Support Firebase Timestamp
  items: OrderItem[]
  mpesaReceiptNumber: string | null
  orderNumber: string
  paymentMethod: string
  phoneNumber: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed'
  total: number
  transactionId: string
  userId: string
}

export interface OrderFilters {
  status?: string
  paymentMethod?: string
  dateRange?: {
    start: Date
    end: Date
  }
  userId?: string
}