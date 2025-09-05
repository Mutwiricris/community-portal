import { computed, ref } from 'vue'
import { useFirestore } from './useFirestore'
import type { Product, ProductFilter, ProductSort, ProductStats } from '@/types/product'
import { orderBy, where } from 'firebase/firestore'

export const useProducts = () => {
  const {
    documents: products,
    loading,
    error,
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe
  } = useFirestore<Product>('products')

  const filters = ref<ProductFilter>({})
  const sort = ref<ProductSort>({ field: 'name', direction: 'asc' })

  const filteredProducts = computed(() => {
    let filtered = products.value

    // Apply filters
    if (filters.value.category) {
      filtered = filtered.filter(p => p.category === filters.value.category)
    }
    if (filters.value.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.value.minPrice!)
    }
    if (filters.value.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.value.maxPrice!)
    }
    if (filters.value.isAvailable !== undefined) {
      filtered = filtered.filter(p => p.isAvailable === filters.value.isAvailable)
    }
    if (filters.value.isFeatured !== undefined) {
      filtered = filtered.filter(p => p.isFeatured === filters.value.isFeatured)
    }
    if (filters.value.isNewArrival !== undefined) {
      filtered = filtered.filter(p => p.isNewArrival === filters.value.isNewArrival)
    }
    if (filters.value.isPopular !== undefined) {
      filtered = filtered.filter(p => p.isPopular === filters.value.isPopular)
    }
    if (filters.value.searchTerm) {
      const term = filters.value.searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      )
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      const aValue = a[sort.value.field]
      const bValue = b[sort.value.field]
      
      if (sort.value.direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  })

  const featuredProducts = computed(() =>
    products.value.filter(p => p.isFeatured && p.isAvailable)
  )

  const newArrivals = computed(() =>
    products.value.filter(p => p.isNewArrival && p.isAvailable)
  )

  const popularProducts = computed(() =>
    products.value.filter(p => p.isPopular && p.isAvailable)
  )

  const outOfStockProducts = computed(() =>
    products.value.filter(p => (Number(p.stockQuantity) || 0) === 0)
  )

  const lowStockProducts = computed(() =>
    products.value.filter(p => {
      const stock = Number(p.stockQuantity) || 0
      return stock > 0 && stock <= 10
    })
  )

  const productStats = computed<ProductStats>(() => ({
    totalProducts: products.value.length,
    totalValue: products.value.reduce((sum, p) => {
      const price = Number(p.price) || 0
      const stock = Number(p.stockQuantity) || 0
      return sum + (price * stock)
    }, 0),
    outOfStock: outOfStockProducts.value.length,
    lowStock: lowStockProducts.value.length,
    featuredProducts: featuredProducts.value.length,
    newArrivals: newArrivals.value.length,
    popularProducts: popularProducts.value.length
  }))

  const createProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = {
      ...productData,
      rating: productData.rating || 0,
      totalPurchases: productData.totalPurchases || 0
    }
    return await add(data)
  }

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    return await update(id, updates)
  }

  const deleteProduct = async (id: string) => {
    return await remove(id)
  }

  const getProduct = async (id: string) => {
    return await getById(id)
  }

  const loadAllProducts = async () => {
    return await getAll([orderBy('createdAt', 'desc')])
  }

  const loadProductsByCategory = async (category: string) => {
    return await getAll([
      where('category', '==', category),
      orderBy('name', 'asc')
    ])
  }

  const loadFeaturedProducts = async () => {
    return await getAll([
      where('isFeatured', '==', true),
      where('isAvailable', '==', true),
      orderBy('totalPurchases', 'desc')
    ])
  }

  const loadNewArrivals = async () => {
    return await getAll([
      where('isNewArrival', '==', true),
      where('isAvailable', '==', true),
      orderBy('createdAt', 'desc')
    ])
  }

  const loadPopularProducts = async () => {
    return await getAll([
      where('isPopular', '==', true),
      where('isAvailable', '==', true),
      orderBy('totalPurchases', 'desc')
    ])
  }

  const subscribeProducts = () => {
    return subscribe([orderBy('createdAt', 'desc')])
  }

  const setFilters = (newFilters: ProductFilter) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const setSort = (newSort: ProductSort) => {
    sort.value = newSort
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const updateStock = async (id: string, quantity: number) => {
    return await update(id, { stockQuantity: quantity })
  }

  const toggleAvailability = async (id: string) => {
    const product = await getById(id)
    if (product) {
      return await update(id, { isAvailable: !product.isAvailable })
    }
  }

  const toggleFeatured = async (id: string) => {
    const product = await getById(id)
    if (product) {
      return await update(id, { isFeatured: !product.isFeatured })
    }
  }

  return {
    products,
    filteredProducts,
    featuredProducts,
    newArrivals,
    popularProducts,
    outOfStockProducts,
    lowStockProducts,
    productStats,
    filters,
    sort,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    loadAllProducts,
    loadProductsByCategory,
    loadFeaturedProducts,
    loadNewArrivals,
    loadPopularProducts,
    subscribeProducts,
    setFilters,
    setSort,
    clearFilters,
    updateStock,
    toggleAvailability,
    toggleFeatured
  }
}