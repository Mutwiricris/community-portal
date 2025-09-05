<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex space-x-2">
        <select 
          v-model="statusFilter" 
          @change="applyFilters"
          class="px-3 py-1 border rounded-md text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
        
        <select 
          v-model="paymentMethodFilter" 
          @change="applyFilters"
          class="px-3 py-1 border rounded-md text-sm"
        >
          <option value="">All Payment Methods</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
        </select>
      </div>
      
      <Button @click="clearFilters" variant="outline" size="sm">
        Clear Filters
      </Button>
    </div>

    <!-- Orders List -->
    <div class="space-y-4">
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p class="text-muted-foreground mt-2">Loading orders...</p>
      </div>
      
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-600">{{ error }}</p>
      </div>
      
      <div v-else-if="filteredOrders.length === 0" class="text-center py-8">
        <ShoppingCart class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-2">No Orders Found</h3>
        <p class="text-muted-foreground">
          {{ Object.keys(filters).length > 0 ? 'No orders match your current filters.' : 'No orders have been placed yet.' }}
        </p>
      </div>
      
      <div v-else class="space-y-4">
        <Card 
          v-for="order in filteredOrders" 
          :key="order.id"
          class="hover:shadow-md transition-shadow cursor-pointer"
          @click="$emit('orderClick', order)"
        >
          <CardHeader>
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
                  <Receipt class="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle class="text-lg">{{ order.orderNumber }}</CardTitle>
                  <p class="text-sm text-muted-foreground">
                    {{ formatDate(order.createdAt) }}
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-end space-y-2">
                <Badge :variant="getStatusVariant(order.status)">
                  {{ order.status.charAt(0).toUpperCase() + order.status.slice(1) }}
                </Badge>
                <p class="text-lg font-semibold">KSh {{ order.total.toFixed(2) }}</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <!-- Order Items -->
            <div class="space-y-2">
              <h4 class="font-medium text-sm">Items ({{ order.items.length }})</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div 
                  v-for="item in order.items.slice(0, 2)" 
                  :key="item.productId"
                  class="flex items-center space-x-2 p-2 bg-secondary/50 rounded-md"
                >
                  <img 
                    v-if="item.imageUrl" 
                    :src="item.imageUrl" 
                    :alt="item.product_name"
                    class="w-8 h-8 object-cover rounded"
                  />
                  <Package v-else class="h-8 w-8 text-muted-foreground" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ item.product_name }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ item.quantity }}x KSh {{ item.price.toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="order.items.length > 2" class="text-xs text-muted-foreground">
                +{{ order.items.length - 2 }} more items
              </div>
            </div>

            <!-- Payment Info -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-center space-x-2">
                <CreditCard class="h-4 w-4 text-muted-foreground" />
                <span>{{ order.paymentMethod.toUpperCase() }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Phone class="h-4 w-4 text-muted-foreground" />
                <span>{{ order.phoneNumber }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Hash class="h-4 w-4 text-muted-foreground" />
                <span class="truncate">{{ order.transactionId }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Receipt class="h-4 w-4 text-muted-foreground" />
                <span>{{ order.mpesaReceiptNumber || 'N/A' }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-between items-center pt-2 border-t">
              <div class="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  @click.stop="$emit('updateStatus', order)"
                >
                  <Edit class="h-3 w-3 mr-1" />
                  Update Status
                </Button>
                <Button 
                  v-if="order.status !== 'completed'" 
                  size="sm" 
                  variant="outline"
                  @click.stop="$emit('markComplete', order)"
                >
                  <Check class="h-3 w-3 mr-1" />
                  Mark Complete
                </Button>
              </div>
              <Button size="sm" @click.stop="$emit('viewDetails', order)">
                <Eye class="h-3 w-3 mr-1" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrders } from '@/composables/useOrders'
import type { Order, OrderFilters } from '@/types/order'
import { 
  ShoppingCart, 
  Receipt, 
  Package, 
  CreditCard, 
  Phone, 
  Hash, 
  Edit, 
  Check, 
  Eye 
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

defineEmits<{
  orderClick: [order: Order & { id: string }]
  updateStatus: [order: Order & { id: string }]
  markComplete: [order: Order & { id: string }]
  viewDetails: [order: Order & { id: string }]
}>()

const { 
  filteredOrders, 
  loading, 
  error, 
  setFilters, 
  clearFilters: clearOrderFilters,
  filters,
  subscribeOrders 
} = useOrders()

const statusFilter = ref('')
const paymentMethodFilter = ref('')

const applyFilters = () => {
  const newFilters: OrderFilters = {}
  
  if (statusFilter.value) {
    newFilters.status = statusFilter.value
  }
  
  if (paymentMethodFilter.value) {
    newFilters.paymentMethod = paymentMethodFilter.value
  }
  
  setFilters(newFilters)
}

const clearFilters = () => {
  statusFilter.value = ''
  paymentMethodFilter.value = ''
  clearOrderFilters()
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'processing':
      return 'warning'
    case 'pending':
      return 'secondary'
    case 'failed':
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

const formatDate = (date: Date | any) => {
  if (!date) return 'N/A'
  
  // Handle Firebase Timestamp
  const dateObj = date.toDate ? date.toDate() : new Date(date)
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid Date'
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

onMounted(() => {
  subscribeOrders()
})
</script>

<style scoped>
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>