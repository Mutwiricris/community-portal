export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: 'Cues' | 'Accessories' | 'Tables' | 'Clothing' | 'Training'
  imageUrl: string
  stockQuantity: number
  isAvailable: boolean
  isFeatured: boolean
  isNewArrival: boolean
  isPopular: boolean
  rating: number
  totalPurchases: number
  createdAt: Date
  updatedAt: Date
}

export interface ProductStats {
  totalProducts: number
  totalValue: number
  outOfStock: number
  lowStock: number
  featuredProducts: number
  newArrivals: number
  popularProducts: number
}

export interface ProductFilter {
  category?: string
  minPrice?: number
  maxPrice?: number
  isAvailable?: boolean
  isFeatured?: boolean
  isNewArrival?: boolean
  isPopular?: boolean
  searchTerm?: string
}

export interface ProductSort {
  field: 'name' | 'price' | 'rating' | 'totalPurchases' | 'createdAt'
  direction: 'asc' | 'desc'
}

export const defaultProductStats: ProductStats = {
  totalProducts: 0,
  totalValue: 0,
  outOfStock: 0,
  lowStock: 0,
  featuredProducts: 0,
  newArrivals: 0,
  popularProducts: 0
}

export const productCategories = [
  'Cues',
  'Accessories', 
  'Tables',
  'Clothing',
  'Training'
] as const

export type ProductCategory = typeof productCategories[number]