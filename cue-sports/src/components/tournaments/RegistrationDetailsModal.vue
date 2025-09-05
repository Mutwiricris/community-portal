<template>
  <Dialog :open="open" @update:open="$emit('close')">
    <DialogContent class="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Registration Details</DialogTitle>
        <DialogDescription v-if="registration">
          Detailed information for {{ registration.playerName }}'s registration
        </DialogDescription>
      </DialogHeader>

      <div v-if="registration" class="space-y-6">
        <!-- Player Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold border-b pb-2">Player Information</h3>
            <div class="space-y-3">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {{ getInitials(registration.playerName) }}
                </div>
                <div>
                  <p class="font-medium text-lg">{{ registration.playerName }}</p>
                  <p class="text-sm text-muted-foreground">{{ registration.playerEmail }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-muted-foreground">Player ID:</span>
                  <p class="font-mono">{{ registration.playerId }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground">Registration ID:</span>
                  <p class="font-mono text-xs">{{ registration.id }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-lg font-semibold border-b pb-2">Tournament Information</h3>
            <div class="space-y-3">
              <div>
                <span class="text-muted-foreground">Tournament:</span>
                <p class="font-medium">{{ registration.tournamentName }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-muted-foreground">Level:</span>
                  <p>{{ formatType(registration.hierarchicalLevel) }}</p>
                </div>
                <div>
                  <span class="text-muted-foreground">National:</span>
                  <p>{{ registration.isNationalTournament ? 'Yes' : 'No' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Community Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Community Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <span class="text-muted-foreground">Community:</span>
                <p class="font-medium">{{ registration.communityName }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Community ID:</span>
                <p class="font-mono text-sm">{{ registration.communityId }}</p>
              </div>
            </div>
            <div v-if="registration.metadata?.playerCommunityAtRegistration" class="space-y-3">
              <div>
                <span class="text-muted-foreground">County:</span>
                <p>{{ registration.metadata.playerCommunityAtRegistration.county || 'N/A' }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Region:</span>
                <p>{{ registration.metadata.playerCommunityAtRegistration.region || 'N/A' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Information -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Financial Information</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-muted/50 p-4 rounded-lg">
              <span class="text-muted-foreground text-sm">Entry Fee</span>
              <p class="text-2xl font-bold text-green-600">{{ formatCurrency(registration.entryFee, 'KES') }}</p>
            </div>
            <div class="bg-muted/50 p-4 rounded-lg">
              <span class="text-muted-foreground text-sm">Payment Status</span>
              <div class="mt-1">
                <Badge :variant="getPaymentStatusVariant(registration.paymentStatus) as any">
                  {{ formatPaymentStatus(registration.paymentStatus) }}
                </Badge>
              </div>
            </div>
            <div class="bg-muted/50 p-4 rounded-lg">
              <span class="text-muted-foreground text-sm">Payment Method</span>
              <p class="font-medium capitalize">{{ registration.paymentMethod || 'Cash' }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-foreground">Payment ID:</span>
              <p class="font-mono">{{ registration.paymentId }}</p>
            </div>
            <div>
              <span class="text-muted-foreground">Payment Reference:</span>
              <p class="font-mono">{{ registration.metadata?.paymentReference || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Status and Dates -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Status & Timeline</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div>
                <span class="text-muted-foreground">Registration Status:</span>
                <div class="mt-1">
                  <Badge :variant="getPlayerStatusVariant(registration.status) as any">
                    {{ formatPlayerStatus(registration.status) }}
                  </Badge>
                </div>
              </div>
              <div>
                <span class="text-muted-foreground">Registered By:</span>
                <p>{{ registration.registeredBy || 'System' }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Registration Method:</span>
                <p class="capitalize">{{ registration.metadata?.registrationMethod || 'Unknown' }}</p>
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <span class="text-muted-foreground">Registered:</span>
                <p>{{ formatDateTime(registration.registeredAt) }}</p>
              </div>
              <div v-if="registration.confirmedAt">
                <span class="text-muted-foreground">Confirmed:</span>
                <p>{{ formatDateTime(registration.confirmedAt) }}</p>
              </div>
              <div v-if="registration.paymentCompletedAt">
                <span class="text-muted-foreground">Payment Completed:</span>
                <p>{{ formatDateTime(registration.paymentCompletedAt) }}</p>
              </div>
              <div v-if="registration.cancelledAt">
                <span class="text-muted-foreground">Cancelled:</span>
                <p>{{ formatDateTime(registration.cancelledAt) }}</p>
              </div>
              <div v-if="registration.cancellationReason">
                <span class="text-muted-foreground">Cancellation Reason:</span>
                <p>{{ registration.cancellationReason }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold border-b pb-2">Actions</h3>
          <div class="flex flex-wrap gap-3">
            <Button 
              v-if="registration.paymentStatus === 'pending'" 
              @click="markAsPaid"
              :disabled="updating"
            >
              <CheckCircle class="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
            <Button 
              v-if="registration.status === 'pending'" 
              @click="confirmRegistration"
              :disabled="updating"
            >
              <UserCheck class="h-4 w-4 mr-2" />
              Confirm Registration
            </Button>
            <Button 
              v-if="registration.status !== 'cancelled'" 
              @click="cancelRegistration"
              variant="destructive"
              :disabled="updating"
            >
              <X class="h-4 w-4 mr-2" />
              Cancel Registration
            </Button>
            <Button 
              v-if="registration.paymentStatus === 'paid'" 
              @click="refundPayment"
              variant="outline"
              :disabled="updating"
            >
              <RefreshCw class="h-4 w-4 mr-2" />
              Refund Payment
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('close')">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle, UserCheck, X, RefreshCw } from 'lucide-vue-next'
import { updateDoc, doc, Timestamp } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from '@/composables/useToast'
import { formatTimestamp } from '@/utils/firestore'
import type { TournamentRegistration } from '@/types/tournament'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import DialogDescription from '@/components/ui/dialog-description.vue'
import DialogFooter from '@/components/ui/dialog-footer.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  open: boolean
  registration: TournamentRegistration | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { success, error: showError } = useToast()

// State
const updating = ref(false)

// Methods
const markAsPaid = async () => {
  if (!props.registration) return

  try {
    updating.value = true
    const db = getFirebaseDb()
    
    await updateDoc(doc(db, 'tournament_registrations', props.registration.id), {
      paymentStatus: 'paid',
      paymentCompletedAt: Timestamp.now(),
      status: 'confirmed',
      confirmedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    
    success('Success', 'Payment marked as paid and registration confirmed')
    emit('updated')
    
  } catch (err) {
    console.error('Error updating payment:', err)
    showError('Error', 'Failed to update payment status')
  } finally {
    updating.value = false
  }
}

const confirmRegistration = async () => {
  if (!props.registration) return

  try {
    updating.value = true
    const db = getFirebaseDb()
    
    await updateDoc(doc(db, 'tournament_registrations', props.registration.id), {
      status: 'confirmed',
      confirmedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    
    success('Success', 'Registration confirmed')
    emit('updated')
    
  } catch (err) {
    console.error('Error confirming registration:', err)
    showError('Error', 'Failed to confirm registration')
  } finally {
    updating.value = false
  }
}

const cancelRegistration = async () => {
  if (!props.registration) return
  
  const reason = prompt('Please enter cancellation reason:')
  if (!reason) return

  try {
    updating.value = true
    const db = getFirebaseDb()
    
    await updateDoc(doc(db, 'tournament_registrations', props.registration.id), {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: reason,
      updatedAt: Timestamp.now()
    })
    
    success('Success', 'Registration cancelled')
    emit('updated')
    
  } catch (err) {
    console.error('Error cancelling registration:', err)
    showError('Error', 'Failed to cancel registration')
  } finally {
    updating.value = false
  }
}

const refundPayment = async () => {
  if (!props.registration) return
  
  if (!confirm('Are you sure you want to refund this payment?')) return

  try {
    updating.value = true
    const db = getFirebaseDb()
    
    await updateDoc(doc(db, 'tournament_registrations', props.registration.id), {
      paymentStatus: 'refunded',
      paymentRefundedAt: Timestamp.now(),
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: 'Payment refunded',
      updatedAt: Timestamp.now()
    })
    
    success('Success', 'Payment refunded and registration cancelled')
    emit('updated')
    
  } catch (err) {
    console.error('Error refunding payment:', err)
    showError('Error', 'Failed to refund payment')
  } finally {
    updating.value = false
  }
}

// Utility functions
const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getPlayerStatusVariant = (status: string) => {
  const variants = {
    'pending': 'secondary',
    'confirmed': 'default',
    'cancelled': 'destructive'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const getPaymentStatusVariant = (status: string | undefined) => {
  const variants = {
    'pending': 'secondary',
    'paid': 'default',
    'failed': 'destructive',
    'refunded': 'outline'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const formatPlayerStatus = (status: string) => {
  const formats = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
}

const formatPaymentStatus = (status: string | undefined) => {
  const formats = {
    'pending': 'Pending',
    'paid': 'Paid',
    'failed': 'Failed',
    'refunded': 'Refunded'
  }
  return formats[status as keyof typeof formats] || 'Unknown'
}

const formatType = (type: string) => {
  const formats = {
    'community': 'Community',
    'county': 'County',
    'regional': 'Regional',
    'national': 'National'
  }
  return formats[type as keyof typeof formats] || type
}

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'KES') {
    return `KES ${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

const formatDateTime = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateValue)
}
</script>