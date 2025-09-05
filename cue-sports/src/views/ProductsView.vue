<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Products</h1>
        <p class="text-muted-foreground">
          Manage your pool accessories and equipment inventory
        </p>
      </div>
      <Button @click="openCreateModal">
        <Plus class="mr-2 h-4 w-4" />
        Add Product
      </Button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Products</CardTitle>
          <Package class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ productStats.totalProducts }}</div>
          <p class="text-xs text-muted-foreground">
            +{{ newArrivals.length }} new arrivals
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Total Value</CardTitle>
          <DollarSign class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">${{ productStats.totalValue.toFixed(2) }}</div>
          <p class="text-xs text-muted-foreground">
            Inventory value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Out of Stock</CardTitle>
          <AlertTriangle class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-red-600">{{ productStats.outOfStock }}</div>
          <p class="text-xs text-muted-foreground">
            +{{ productStats.lowStock }} low stock
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Featured</CardTitle>
          <Star class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ productStats.featuredProducts }}</div>
          <p class="text-xs text-muted-foreground">
            Featured products
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Filters and Search -->
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="flex-1">
        <SearchInput
          v-model="searchTerm"
          placeholder="Search products..."
          @update:model-value="handleSearch"
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="selectedCategory"
          class="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          @change="handleCategoryFilter"
        >
          <option value="">All Categories</option>
          <option v-for="category in productCategories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        
        <select
          v-model="selectedStatus"
          class="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          @change="handleStatusFilter"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="low_stock">Low Stock</option>
        </select>

        <Button variant="outline" @click="clearFilters">
          <X class="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="text-center py-8 text-red-600">
      Error loading products: {{ error }}
    </div>

    <div v-else-if="filteredProducts.length === 0" class="text-center py-12">
      <EmptyState
        icon="Package"
        title="No products found"
        message="Try adjusting your search or filters, or add a new product to get started."
      />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        @click="viewProduct(product)"
        @edit="editProduct(product)"
        @toggle-availability="toggleAvailability(product)"
        @toggle-featured="toggleFeatured(product)"
        @view="viewProduct(product)"
      />
    </div>

    <!-- Create/Edit Product Modal -->
    <Dialog v-model:open="isCreateModalOpen">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ editingProduct ? 'Edit Product' : 'Create New Product' }}
          </DialogTitle>
          <DialogDescription>
            {{ editingProduct ? 'Update product information' : 'Add a new product to your inventory' }}
          </DialogDescription>
        </DialogHeader>
        
        <ProductForm
          :product="editingProduct"
          :loading="formLoading"
          @submit="handleProductSubmit"
          @cancel="closeCreateModal"
        />
      </DialogContent>
    </Dialog>

    <!-- View Product Modal -->
    <Dialog v-model:open="isViewModalOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ viewingProduct?.name }}</DialogTitle>
          <DialogDescription>Product Details</DialogDescription>
        </DialogHeader>
        
        <div v-if="viewingProduct" class="space-y-4">
          <div class="flex items-center space-x-4">
            <img 
              v-if="viewingProduct.imageUrl" 
              :src="viewingProduct.imageUrl" 
              :alt="viewingProduct.name"
              class="w-20 h-20 object-cover rounded-lg"
            />
            <div class="flex-1">
              <h3 class="font-semibold">{{ viewingProduct.name }}</h3>
              <p class="text-sm text-muted-foreground">{{ viewingProduct.category }}</p>
              <p class="text-lg font-bold">${{ (viewingProduct.price || 0).toFixed(2) }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="font-medium">Description</h4>
            <p class="text-sm text-muted-foreground">{{ viewingProduct.description }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">Stock:</span>
              <span :class="getStockClass(viewingProduct.stockQuantity)">
                {{ formatStock(viewingProduct.stockQuantity) }}
              </span>
            </div>
            <div>
              <span class="font-medium">Rating:</span>
              <span>{{ (viewingProduct.rating || 0).toFixed(1) }}/5</span>
            </div>
            <div>
              <span class="font-medium">Sales:</span>
              <span>{{ viewingProduct.totalPurchases || 0 }} sold</span>
            </div>
            <div>
              <span class="font-medium">Status:</span>
              <span :class="viewingProduct.isAvailable ? 'text-green-600' : 'text-red-600'">
                {{ viewingProduct.isAvailable ? 'Available' : 'Unavailable' }}
              </span>
            </div>
          </div>

          <div class="flex space-x-2">
            <Badge v-if="viewingProduct.isFeatured" variant="secondary">Featured</Badge>
            <Badge v-if="viewingProduct.isNewArrival" variant="outline">New</Badge>
            <Badge v-if="viewingProduct.isPopular" variant="default">Popular</Badge>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-4">
          <Button variant="outline" @click="closeViewModal">Close</Button>
          <Button @click="editProductFromView">Edit Product</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Package, DollarSign, AlertTriangle, Star, X } from 'lucide-vue-next'
import { useProducts } from '@/composables/useProducts'
import { productCategories, type Product } from '@/types/product'
import ProductCard from '@/components/products/ProductCard.vue'
import ProductForm from '@/components/products/ProductForm.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Button from '@/components/ui/button.vue'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogDescription from '@/components/ui/dialog-description.vue'
import Badge from '@/components/ui/badge.vue'

const {
  products,
  filteredProducts,
  featuredProducts,
  newArrivals,
  productStats,
  loading,
  error,
  createProduct,
  updateProduct,
  setFilters,
  clearFilters: clearProductFilters,
  subscribeProducts,
  toggleAvailability: toggleProductAvailability,
  toggleFeatured: toggleProductFeatured
} = useProducts()

// Local state
const searchTerm = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const isCreateModalOpen = ref(false)
const isViewModalOpen = ref(false)
const formLoading = ref(false)
const editingProduct = ref<(Product & { id: string }) | null>(null)
const viewingProduct = ref<(Product & { id: string }) | null>(null)

// Initialize data
onMounted(() => {
  subscribeProducts()
})

// Event handlers
const handleSearch = (term: string) => {
  setFilters({ searchTerm: term })
}

const handleCategoryFilter = () => {
  setFilters({ category: selectedCategory.value || undefined })
}

const handleStatusFilter = () => {
  const statusFilters: Record<string, any> = {
    available: { isAvailable: true },
    out_of_stock: { isAvailable: true }, // Will be filtered by stock in composable
    low_stock: { isAvailable: true }
  }
  
  if (selectedStatus.value) {
    setFilters(statusFilters[selectedStatus.value] || {})
  } else {
    setFilters({})
  }
}

const clearFilters = () => {
  searchTerm.value = ''
  selectedCategory.value = ''
  selectedStatus.value = ''
  clearProductFilters()
}

const openCreateModal = () => {
  editingProduct.value = null
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
  editingProduct.value = null
}

const openViewModal = (product: Product & { id: string }) => {
  viewingProduct.value = product
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  isViewModalOpen.value = false
  viewingProduct.value = null
}

const editProduct = (product: Product & { id: string }) => {
  editingProduct.value = product
  isCreateModalOpen.value = true
}

const editProductFromView = () => {
  if (viewingProduct.value) {
    editingProduct.value = viewingProduct.value
    closeViewModal()
    isCreateModalOpen.value = true
  }
}

const viewProduct = (product: Product & { id: string }) => {
  openViewModal(product)
}

const handleProductSubmit = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  formLoading.value = true
  
  try {
    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, productData)
    } else {
      await createProduct(productData)
    }
    
    closeCreateModal()
  } catch (error) {
    console.error('Error saving product:', error)
    // Handle error - could show a toast notification
  } finally {
    formLoading.value = false
  }
}

const toggleAvailability = async (product: Product & { id: string }) => {
  try {
    await toggleProductAvailability(product.id)
  } catch (error) {
    console.error('Error toggling availability:', error)
  }
}

const toggleFeatured = async (product: Product & { id: string }) => {
  try {
    await toggleProductFeatured(product.id)
  } catch (error) {
    console.error('Error toggling featured status:', error)
  }
}

// Helper functions
const formatStock = (stock: number) => {
  const stockValue = stock || 0
  if (stockValue === 0) return 'Out of stock'
  if (stockValue <= 10) return `Low stock (${stockValue})`
  return `In stock (${stockValue})`
}

const getStockClass = (stock: number) => {
  const stockValue = stock || 0
  if (stockValue === 0) return 'text-red-600'
  if (stockValue <= 10) return 'text-yellow-600'
  return 'text-green-600'
}
</script>