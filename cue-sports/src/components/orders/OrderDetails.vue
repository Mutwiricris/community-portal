<template>
  <div class="space-y-6">
    <!-- Order Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
          <Receipt class="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 class="text-2xl font-bold">{{ order.orderNumber }}</h1>
          <p class="text-muted-foreground">
            Placed on {{ formatDate(order.createdAt) }}
          </p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <Badge :variant="getStatusVariant(order.status)" class="text-sm">
          {{ order.status.charAt(0).toUpperCase() + order.status.slice(1) }}
        </Badge>
        <div class="text-right">
          <p class="text-2xl font-bold">KSh {{ order.total.toFixed(2) }}</p>
          <p class="text-sm text-muted-foreground">Total Amount</p>
        </div>
      </div>
    </div>

    <!-- Order Items -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center space-x-2">
          <Package class="h-5 w-5" />
          <span>Order Items ({{ order.items.length }})</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-3">
          <div 
            v-for="item in order.items" 
            :key="item.productId"
            class="flex items-center space-x-4 p-4 bg-secondary/50 rounded-lg"
          >
            <div class="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                v-if="item.imageUrl" 
                :src="item.imageUrl" 
                :alt="item.product_name"
                class="w-full h-full object-cover"
              />
              <Package v-else class="h-8 w-8 text-muted-foreground" />
            </div>
            <div class="flex-1">
              <h3 class="font-medium">{{ item.product_name }}</h3>
              <p class="text-sm text-muted-foreground">Product ID: {{ item.productId }}</p>
            </div>
            <div class="text-right">
              <p class="font-medium">{{ item.quantity }}x KSh {{ item.price.toFixed(2) }}</p>
              <p class="text-sm text-muted-foreground">KSh {{ (item.quantity * item.price).toFixed(2) }}</p>
            </div>
          </div>
        </div>
        
        <!-- Order Summary -->
        <div class="border-t pt-4">
          <div class="flex justify-between items-center">
            <span class="text-lg font-semibold">Total</span>
            <span class="text-lg font-bold">KSh {{ order.total.toFixed(2) }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Payment Information -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center space-x-2">
          <CreditCard class="h-5 w-5" />
          <span>Payment Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Payment Method</label>
            <div class="flex items-center space-x-2">
              <CreditCard class="h-4 w-4 text-muted-foreground" />
              <span>{{ order.paymentMethod.toUpperCase() }}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Phone Number</label>
            <div class="flex items-center space-x-2">
              <Phone class="h-4 w-4 text-muted-foreground" />
              <span>{{ order.phoneNumber }}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Transaction ID</label>
            <div class="flex items-center space-x-2">
              <Hash class="h-4 w-4 text-muted-foreground" />
              <span class="font-mono text-sm">{{ order.transactionId }}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">M-Pesa Receipt Number</label>
            <div class="flex items-center space-x-2">
              <Receipt class="h-4 w-4 text-muted-foreground" />
              <span class="font-mono text-sm">{{ order.mpesaReceiptNumber || 'N/A' }}</span>
            </div>
          </div>
        </div>
        
        <!-- Payment Status Actions -->
        <div class="border-t pt-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2">
              <span class="text-sm font-medium">Payment Status:</span>
              <Badge :variant="getStatusVariant(order.status)">
                {{ order.status.charAt(0).toUpperCase() + order.status.slice(1) }}
              </Badge>
            </div>
            <div class="flex space-x-2">
              <Button 
                v-if="order.status !== 'completed'" 
                size="sm" 
                variant="outline"
                @click="$emit('updateStatus', order)"
              >
                <Edit class="h-3 w-3 mr-1" />
                Update Status
              </Button>
              <Button 
                v-if="order.status !== 'completed'" 
                size="sm"
                @click="$emit('markComplete', order)"
              >
                <Check class="h-3 w-3 mr-1" />
                Mark Complete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Customer Information -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center space-x-2">
          <User class="h-5 w-5" />
          <span>Customer Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Customer ID</label>
            <div class="flex items-center space-x-2">
              <User class="h-4 w-4 text-muted-foreground" />
              <span class="font-mono text-sm">{{ order.userId }}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium">Contact Number</label>
            <div class="flex items-center space-x-2">
              <Phone class="h-4 w-4 text-muted-foreground" />
              <span>{{ order.phoneNumber }}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Order Timeline -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center space-x-2">
          <Clock class="h-5 w-5" />
          <span>Order Timeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Plus class="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p class="font-medium">Order Placed</p>
              <p class="text-sm text-muted-foreground">{{ formatDate(order.createdAt) }}</p>
            </div>
          </div>
          
          <div v-if="order.status === 'processing'" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock class="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p class="font-medium">Processing</p>
              <p class="text-sm text-muted-foreground">Order is being processed</p>
            </div>
          </div>
          
          <div v-if="order.status === 'completed'" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check class="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p class="font-medium">Completed</p>
              <p class="text-sm text-muted-foreground">{{ formatDate(order.updatedAt) }}</p>
            </div>
          </div>
          
          <div v-if="order.status === 'cancelled'" class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <X class="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p class="font-medium">Cancelled</p>
              <p class="text-sm text-muted-foreground">{{ formatDate(order.updatedAt) }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '@/types/order'
import { 
  Receipt, 
  Package, 
  CreditCard, 
  Phone, 
  Hash, 
  User, 
  Clock,
  Edit,
  Check,
  Plus,
  X
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  order: Order & { id: string }
}

defineProps<Props>()

defineEmits<{
  updateStatus: [order: Order & { id: string }]
  markComplete: [order: Order & { id: string }]
}>()

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
</script>