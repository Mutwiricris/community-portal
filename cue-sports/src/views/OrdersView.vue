<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Orders</h1>
        <p class="text-muted-foreground">
          Track product sales and manage customer orders
        </p>
      </div>
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium">Total Orders:</span>
          <Badge variant="secondary">{{ orderStats.totalOrders }}</Badge>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium">Revenue:</span>
          <Badge variant="success">KSh {{ orderStats.totalRevenue.toFixed(2) }}</Badge>
        </div>
      </div>
    </div>

    <!-- Order Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart class="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Total Orders</p>
              <p class="text-2xl font-bold">{{ orderStats.totalOrders }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check class="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Completed</p>
              <p class="text-2xl font-bold">{{ orderStats.completedOrders }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock class="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Pending</p>
              <p class="text-2xl font-bold">{{ orderStats.pendingOrders }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent class="p-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <DollarSign class="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Revenue</p>
              <p class="text-xl font-bold">KSh {{ orderStats.totalRevenue.toFixed(2) }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold">Order Details</h2>
            <Button variant="ghost" size="sm" @click="selectedOrder = null">
              <X class="h-4 w-4" />
            </Button>
          </div>
          <OrderDetails 
            :order="selectedOrder" 
            @update-status="handleUpdateStatus"
            @mark-complete="handleMarkComplete"
          />
        </div>
      </div>
    </div>

    <!-- Status Update Modal -->
    <div v-if="statusUpdateOrder" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-md w-full m-4">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold">Update Order Status</h2>
            <Button variant="ghost" size="sm" @click="statusUpdateOrder = null">
              <X class="h-4 w-4" />
            </Button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Order Status</label>
              <select 
                v-model="newStatus" 
                class="w-full px-3 py-2 border rounded-md"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div v-if="newStatus === 'completed'">
              <label class="block text-sm font-medium mb-2">M-Pesa Receipt Number (Optional)</label>
              <input 
                v-model="mpesaReceiptNumber" 
                type="text" 
                class="w-full px-3 py-2 border rounded-md"
                placeholder="Enter M-Pesa receipt number"
              />
            </div>
            <div class="flex justify-end space-x-2">
              <Button variant="outline" @click="statusUpdateOrder = null">Cancel</Button>
              <Button @click="saveStatusUpdate">Update Status</Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Orders List -->
    <OrdersList 
      @order-click="handleOrderClick"
      @update-status="handleUpdateStatus"
      @mark-complete="handleMarkComplete"
      @view-details="handleViewDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrders } from '@/composables/useOrders'
import { useToast } from '@/composables/useToast'
import type { Order } from '@/types/order'
import { 
  ShoppingCart, 
  Check, 
  Clock, 
  DollarSign,
  X
} from 'lucide-vue-next'
import OrdersList from '@/components/orders/OrdersList.vue'
import OrderDetails from '@/components/orders/OrderDetails.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'

const { 
  orderStats, 
  updateOrderStatus,
  updatePaymentInfo,
  completeOrder,
  subscribeOrders 
} = useOrders()

const { success, error } = useToast()

const selectedOrder = ref<(Order & { id: string }) | null>(null)
const statusUpdateOrder = ref<(Order & { id: string }) | null>(null)
const newStatus = ref<Order['status']>('pending')
const mpesaReceiptNumber = ref('')

const handleOrderClick = (order: Order & { id: string }) => {
  selectedOrder.value = order
}

const handleViewDetails = (order: Order & { id: string }) => {
  selectedOrder.value = order
}

const handleUpdateStatus = (order: Order & { id: string }) => {
  statusUpdateOrder.value = order
  newStatus.value = order.status
  mpesaReceiptNumber.value = order.mpesaReceiptNumber || ''
}

const handleMarkComplete = async (order: Order & { id: string }) => {
  try {
    await completeOrder(order.id, order.mpesaReceiptNumber || undefined)
    success('Order marked as completed successfully')
  } catch (err) {
    error('Failed to mark order as completed')
    console.error('Error completing order:', err)
  }
}

const saveStatusUpdate = async () => {
  if (!statusUpdateOrder.value) return

  try {
    if (newStatus.value === 'completed') {
      await completeOrder(statusUpdateOrder.value.id, mpesaReceiptNumber.value || undefined)
    } else {
      await updateOrderStatus(statusUpdateOrder.value.id, newStatus.value)
      if (mpesaReceiptNumber.value && newStatus.value === 'completed') {
        await updatePaymentInfo(statusUpdateOrder.value.id, mpesaReceiptNumber.value)
      }
    }
    
    success('Order status updated successfully')
    statusUpdateOrder.value = null
    mpesaReceiptNumber.value = ''
  } catch (err) {
    error('Failed to update order status')
    console.error('Error updating order status:', err)
  }
}

onMounted(() => {
  subscribeOrders()
})
</script>