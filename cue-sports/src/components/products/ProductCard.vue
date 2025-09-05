<template>
  <Card class="hover:shadow-md transition-shadow cursor-pointer" @click="$emit('click')">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              v-if="product.imageUrl" 
              :src="product.imageUrl" 
              :alt="product.name"
              class="w-full h-full object-cover"
            />
            <Package v-else class="h-8 w-8 text-slate-400" />
          </div>
          <div class="flex-1">
            <CardTitle class="text-lg line-clamp-1">{{ product.name }}</CardTitle>
            <p class="text-sm text-muted-foreground">{{ product.category }}</p>
          </div>
        </div>
        <div class="flex flex-col items-end space-y-1">
          <Badge :variant="getAvailabilityVariant(product.isAvailable)">
            {{ product.isAvailable ? 'Available' : 'Out of Stock' }}
          </Badge>
          <div class="flex space-x-1">
            <Badge v-if="product.isFeatured" variant="secondary" class="text-xs">
              Featured
            </Badge>
            <Badge v-if="product.isNewArrival" variant="outline" class="text-xs">
              New
            </Badge>
            <Badge v-if="product.isPopular" variant="default" class="text-xs">
              Popular
            </Badge>
          </div>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Product Info -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center space-x-2">
          <DollarSign class="h-4 w-4 text-muted-foreground" />
          <span class="font-semibold">${{ (product.price || 0).toFixed(2) }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <Star class="h-4 w-4 text-muted-foreground" />
          <span>{{ (product.rating || 0).toFixed(1) }} ({{ product.totalPurchases || 0 }})</span>
        </div>
        <div class="flex items-center space-x-2">
          <Package class="h-4 w-4 text-muted-foreground" />
          <span :class="getStockClass(product.stockQuantity)">
            {{ formatStock(product.stockQuantity) }}
          </span>
        </div>
        <div class="flex items-center space-x-2">
          <ShoppingCart class="h-4 w-4 text-muted-foreground" />
          <span>{{ product.totalPurchases || 0 }} sold</span>
        </div>
      </div>

      <!-- Description -->
      <div class="text-sm text-muted-foreground">
        <p class="line-clamp-2">{{ product.description }}</p>
      </div>

      <!-- Stock Status -->
      <div class="w-full bg-secondary/50 rounded-full h-2">
        <div 
          class="h-2 rounded-full transition-all duration-300"
          :class="getStockBarClass(product.stockQuantity)"
          :style="{ width: `${Math.min((product.stockQuantity || 0) / 50 * 100, 100)}%` }"
        />
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-2">
        <div class="flex space-x-2">
          <Button size="sm" @click.stop="$emit('edit')" variant="outline">
            <Edit class="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('toggleAvailability')" 
            variant="outline"
            :class="product.isAvailable ? 'text-red-600' : 'text-green-600'"
          >
            <EyeOff v-if="product.isAvailable" class="h-3 w-3 mr-1" />
            <Eye v-else class="h-3 w-3 mr-1" />
            {{ product.isAvailable ? 'Disable' : 'Enable' }}
          </Button>
          <Button 
            size="sm" 
            @click.stop="$emit('toggleFeatured')" 
            variant="outline"
            :class="product.isFeatured ? 'text-yellow-600' : ''"
          >
            <Star v-if="product.isFeatured" class="h-3 w-3 mr-1 fill-current" />
            <Star v-else class="h-3 w-3 mr-1" />
            {{ product.isFeatured ? 'Unfeature' : 'Feature' }}
          </Button>
        </div>
        <Button size="sm" @click.stop="$emit('view')">
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Package, DollarSign, Star, ShoppingCart, Edit, Eye, EyeOff } from 'lucide-vue-next'
import { Product } from '@/types/product'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  product: Product & { id: string }
}

defineProps<Props>()

defineEmits<{
  click: []
  edit: []
  toggleAvailability: []
  toggleFeatured: []
  view: []
}>()

const getAvailabilityVariant = (isAvailable: boolean) => {
  return isAvailable ? 'success' : 'destructive'
}

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

const getStockBarClass = (stock: number) => {
  const stockValue = stock || 0
  if (stockValue === 0) return 'bg-red-500'
  if (stockValue <= 10) return 'bg-yellow-500'
  return 'bg-green-500'
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>