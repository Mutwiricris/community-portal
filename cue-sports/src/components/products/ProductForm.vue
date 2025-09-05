<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Basic Information -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Basic Information</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium">Product Name *</label>
          <Input
            id="name"
            v-model="form.name"
            placeholder="Enter product name"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="category" class="text-sm font-medium">Category *</label>
          <select
            id="category"
            v-model="form.category"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select Category</option>
            <option v-for="category in productCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="price" class="text-sm font-medium">Price *</label>
          <div class="relative">
            <DollarSign class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="price"
              v-model.number="form.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="pl-10"
              required
            />
          </div>
        </div>

        <div class="space-y-2">
          <label for="stockQuantity" class="text-sm font-medium">Stock Quantity *</label>
          <Input
            id="stockQuantity"
            v-model.number="form.stockQuantity"
            type="number"
            min="0"
            placeholder="0"
            required
          />
        </div>
      </div>

      <div class="space-y-2">
        <label for="description" class="text-sm font-medium">Description *</label>
        <Textarea
          id="description"
          v-model="form.description"
          placeholder="Enter product description"
          rows="3"
          required
        />
      </div>

      <div class="space-y-2">
        <label for="imageUrl" class="text-sm font-medium">Image URL</label>
        <Input
          id="imageUrl"
          v-model="form.imageUrl"
          placeholder="https://example.com/image.jpg"
          type="url"
        />
        <div v-if="form.imageUrl" class="mt-2">
          <img 
            :src="form.imageUrl" 
            :alt="form.name"
            class="w-24 h-24 object-cover rounded-md border"
            @error="handleImageError"
          />
        </div>
      </div>
    </div>

    <!-- Product Features -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Product Features</h3>
      
      <div class="flex flex-wrap gap-6">
        <div class="flex items-center space-x-2">
          <input
            id="isAvailable"
            v-model="form.isAvailable"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isAvailable" class="text-sm font-medium">Available for Sale</label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="isFeatured"
            v-model="form.isFeatured"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isFeatured" class="text-sm font-medium">Featured Product</label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="isNewArrival"
            v-model="form.isNewArrival"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isNewArrival" class="text-sm font-medium">New Arrival</label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="isPopular"
            v-model="form.isPopular"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isPopular" class="text-sm font-medium">Popular Product</label>
        </div>
      </div>
    </div>

    <!-- Product Metrics -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Product Metrics</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="rating" class="text-sm font-medium">Rating</label>
          <div class="relative">
            <Star class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="rating"
              v-model.number="form.rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="0.0"
              class="pl-10"
            />
          </div>
          <p class="text-xs text-muted-foreground">Rating out of 5.0</p>
        </div>

        <div class="space-y-2">
          <label for="totalPurchases" class="text-sm font-medium">Total Purchases</label>
          <div class="relative">
            <ShoppingCart class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="totalPurchases"
              v-model.number="form.totalPurchases"
              type="number"
              min="0"
              placeholder="0"
              class="pl-10"
            />
          </div>
          <p class="text-xs text-muted-foreground">Number of times sold</p>
        </div>
      </div>
    </div>

    <!-- Stock Management -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Stock Management</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Current Stock</label>
          <div class="flex h-10 w-full rounded-md border border-input bg-accent/50 px-3 py-2 text-sm items-center">
            <Package class="h-4 w-4 mr-2 text-muted-foreground" />
            <span :class="getStockStatusClass(form.stockQuantity)">
              {{ formatStockStatus(form.stockQuantity) }}
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Stock Value</label>
          <div class="flex h-10 w-full rounded-md border border-input bg-accent/50 px-3 py-2 text-sm items-center">
            <DollarSign class="h-4 w-4 mr-2 text-muted-foreground" />
            <span class="font-semibold">{{ calculateStockValue() }}</span>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Availability</label>
          <div class="flex h-10 w-full rounded-md border border-input bg-accent/50 px-3 py-2 text-sm items-center">
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-2"
                :class="form.isAvailable ? 'bg-green-500' : 'bg-red-500'"
              />
              <span>{{ form.isAvailable ? 'Available' : 'Unavailable' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Level Indicator -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Stock Level</label>
        <div class="w-full bg-secondary/50 rounded-full h-3">
          <div 
            class="h-3 rounded-full transition-all duration-300"
            :class="getStockBarClass(form.stockQuantity)"
            :style="{ width: `${Math.min(form.stockQuantity / 50 * 100, 100)}%` }"
          />
        </div>
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{{ form.stockQuantity }}</span>
          <span>50+</span>
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-2 pt-6 border-t">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        Cancel
      </Button>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product') }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DollarSign, Star, ShoppingCart, Package } from 'lucide-vue-next'
import type { Product } from '@/types/product'
import { productCategories } from '@/types/product'
import Input from '@/components/ui/input.vue'
import Textarea from '@/components/ui/textarea.vue'
import Button from '@/components/ui/button.vue'

interface Props {
  product?: (Product & { id: string }) | null
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>]
  cancel: []
}>()

// Form data
const form = ref<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  description: '',
  price: 0,
  category: 'Accessories',
  imageUrl: '',
  stockQuantity: 0,
  isAvailable: true,
  isFeatured: false,
  isNewArrival: false,
  isPopular: false,
  rating: 0,
  totalPurchases: 0
})

// Initialize form with existing product data
onMounted(() => {
  if (props.product) {
    Object.assign(form.value, {
      name: props.product.name || '',
      description: props.product.description || '',
      price: Number(props.product.price) || 0,
      category: props.product.category || 'Accessories',
      imageUrl: props.product.imageUrl || '',
      stockQuantity: Number(props.product.stockQuantity) || 0,
      isAvailable: props.product.isAvailable ?? true,
      isFeatured: props.product.isFeatured ?? false,
      isNewArrival: props.product.isNewArrival ?? false,
      isPopular: props.product.isPopular ?? false,
      rating: Number(props.product.rating) || 0,
      totalPurchases: Number(props.product.totalPurchases) || 0
    })
  }
})

// Helper functions
const formatStockStatus = (stock: number) => {
  if (stock === 0) return 'Out of Stock'
  if (stock <= 10) return `Low Stock (${stock})`
  return `In Stock (${stock})`
}

const getStockStatusClass = (stock: number) => {
  if (stock === 0) return 'text-red-600 font-semibold'
  if (stock <= 10) return 'text-yellow-600 font-semibold'
  return 'text-green-600 font-semibold'
}

const getStockBarClass = (stock: number) => {
  if (stock === 0) return 'bg-red-500'
  if (stock <= 10) return 'bg-yellow-500'
  return 'bg-green-500'
}

const calculateStockValue = () => {
  const value = form.value.price * form.value.stockQuantity
  return `$${value.toFixed(2)}`
}

const handleImageError = (event: Event) => {
  console.warn('Failed to load image:', form.value.imageUrl)
  // Clear the broken image URL to prevent repeated errors
  if (form.value.imageUrl && form.value.imageUrl.includes('via.placeholder.com')) {
    form.value.imageUrl = ''
  }
}

const handleSubmit = () => {
  try {
    // Basic validation
    if (!form.value.name.trim()) {
      throw new Error('Product name is required')
    }
    
    if (!form.value.description.trim()) {
      throw new Error('Product description is required')
    }
    
    if (!form.value.category) {
      throw new Error('Product category is required')
    }
    
    if (form.value.price < 0) {
      throw new Error('Price cannot be negative')
    }
    
    if (form.value.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }
    
    if (form.value.rating < 0 || form.value.rating > 5) {
      throw new Error('Rating must be between 0 and 5')
    }
    
    if (form.value.totalPurchases < 0) {
      throw new Error('Total purchases cannot be negative')
    }
    
    // Log form data for debugging
    console.log('Product form submission data:', form.value)
    
    // Emit the form data
    emit('submit', form.value)
    
  } catch (error: any) {
    console.error('Product form validation error:', error.message)
    alert(error.message)
  }
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>