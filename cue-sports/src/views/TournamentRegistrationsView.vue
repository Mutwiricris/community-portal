<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Tournament Registrations</h1>
        <p class="text-muted-foreground mt-2">
          Manage all tournament registrations across all tournaments
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="refreshData" variant="outline" :disabled="refreshing">
          <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshing }" />
          Refresh
        </Button>
        <Button @click="exportRegistrations" variant="outline">
          <Download class="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Total Registrations</p>
            <p class="text-2xl font-bold">{{ stats.totalRegistrations }}</p>
          </div>
          <Users class="h-8 w-8 text-blue-600" />
        </div>
      </div>
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Confirmed</p>
            <p class="text-2xl font-bold text-green-600">{{ stats.confirmedRegistrations }}</p>
          </div>
          <CheckCircle class="h-8 w-8 text-green-600" />
        </div>
      </div>
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Pending Payment</p>
            <p class="text-2xl font-bold text-yellow-600">{{ stats.pendingPayments }}</p>
          </div>
          <Clock class="h-8 w-8 text-yellow-600" />
        </div>
      </div>
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p class="text-2xl font-bold text-green-600">{{ formatCurrency(stats.totalRevenue, 'KES') }}</p>
          </div>
          <DollarSign class="h-8 w-8 text-green-600" />
        </div>
      </div>
      <!-- //not paid -->
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Not Paid</p>
            <p class="text-2xl font-bold text-red-600">{{ registrations.filter(r => r.paymentStatus !== 'paid').length }}</p>
          </div>
          <X class="h-8 w-8 text-red-600" />
        </div>
      </div>
      <!-- /// REGISTRATION TREND  -->
      <div class="bg-card rounded-lg border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Registration Trend</p>
            <div class="flex items-center gap-2">
              <p class="text-2xl font-bold text-blue-600">{{ registrationTrend.thisWeek }}</p>
              <div class="flex items-center gap-1">
                <ArrowUp v-if="registrationTrend.isUp" class="h-4 w-4 text-green-600" />
                <ArrowDown v-else-if="registrationTrend.isDown" class="h-4 w-4 text-red-600" />
                <Minus v-else class="h-4 w-4 text-gray-400" />
                <span :class="registrationTrend.isUp ? 'text-green-600' : registrationTrend.isDown ? 'text-red-600' : 'text-gray-400'" class="text-sm font-medium">
                  {{ registrationTrend.percentageChange }}%
                </span>
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-1">vs last week</p>
          </div>
          <Clock class="h-8 w-8 text-blue-600" />
        </div>
      </div>


    </div>

    <!-- Filters and Search -->
    <div class="bg-card rounded-lg border p-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Search</label>
          <div class="relative">
            <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by player name, tournament..."
              class="pl-10"
            />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Tournament</label>
          <select v-model="filters.tournamentId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All Tournaments</option>
            <option v-for="tournament in tournaments" :key="tournament.id" :value="tournament.id">
              {{ tournament.name }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Status</label>
          <select v-model="filters.status" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium">Payment Status</label>
          <select v-model="filters.paymentStatus" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner />
    </div>

    <!-- Registrations Table -->
    <div v-else class="bg-card rounded-lg border">
      <div class="p-6 border-b">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Registrations 
            <span class="text-sm text-muted-foreground ml-2">({{ filteredRegistrations.length }} of {{ registrations.length }})</span>
          </h3>
          <!-- Bulk Actions Bar -->
          <div v-if="selectedRegistrationIds.length > 0" class="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span class="text-sm text-blue-700 font-medium">
              {{ selectedRegistrationIds.length }} selected
            </span>
            <div class="flex gap-1">
              <Button size="sm" variant="outline" @click="bulkUpdatePaymentStatus('paid')" class="text-green-600 hover:text-green-700">
                <CheckCircle class="h-3 w-3 mr-1" />
                Mark Paid
              </Button>
              <Button size="sm" variant="outline" @click="bulkUpdatePaymentStatus('pending')" class="text-yellow-600 hover:text-yellow-700">
                <Clock class="h-3 w-3 mr-1" />
                Mark Pending
              </Button>
              <Button size="sm" variant="outline" @click="bulkUpdateRegistrationStatus('confirmed')" class="text-blue-600 hover:text-blue-700">
                <CheckCircle class="h-3 w-3 mr-1" />
                Confirm
              </Button>
              <Button size="sm" variant="outline" @click="bulkCancelRegistrations" class="text-red-600 hover:text-red-700">
                <X class="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button size="sm" variant="outline" @click="bulkExportRegistrations">
                <Download class="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-12">
                <Checkbox 
                  :checked="allSelectedOnPage"
                  @update:checked="toggleAllSelectionOnPage"
                />
              </TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead>Community</TableHead>
              <TableHead>Entry Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="registration in paginatedRegistrations" :key="registration.id" class="hover:bg-muted/50">
              <TableCell>
                <Checkbox 
                  :checked="selectedRegistrationIds.includes(registration.id)"
                  @update:checked="toggleRegistrationSelection(registration.id)"
                />
              </TableCell>
              <TableCell>
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {{ getInitials(registration.playerName) }}
                  </div>
                  <div>
                    <p class="font-medium">{{ registration.playerName }}</p>
                    <p class="text-sm text-muted-foreground">{{ registration.playerEmail }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p class="font-medium">{{ registration.tournamentName }}</p>
                  <p class="text-sm text-muted-foreground">{{ formatType(registration.hierarchicalLevel) }}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p class="font-medium">{{ registration.communityName }}</p>
                  <p class="text-sm text-muted-foreground">{{ registration.metadata?.playerCommunityAtRegistration?.county || 'N/A' }}</p>
                </div>
              </TableCell>
              <TableCell>
                <p class="font-medium">{{ formatCurrency(registration.entryFee, 'KES') }}</p>
                <p class="text-sm text-muted-foreground">{{ registration.paymentMethod || 'Cash' }}</p>
              </TableCell>
              <TableCell>
                <Badge :variant="getPlayerStatusVariant(registration.status) as any">
                  {{ formatPlayerStatus(registration.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="getPaymentStatusVariant(registration.paymentStatus) as any">
                  {{ formatPaymentStatus(registration.paymentStatus) }}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p class="text-sm">{{ formatDate(registration.registeredAt) }}</p>
                  <p class="text-xs text-muted-foreground">by {{ registration.registeredBy || 'System' }}</p>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="viewRegistration(registration)">
                    <Eye class="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    @click="updatePaymentStatus(registration)"
                    :disabled="registration.paymentStatus === 'paid'"
                  >
                    <CreditCard class="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" @click="cancelRegistration(registration)" class="text-red-600 hover:text-red-700">
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Showing {{ Math.min((currentPage - 1) * pageSize + 1, filteredRegistrations.length) }} to 
          {{ Math.min(currentPage * pageSize, filteredRegistrations.length) }} of 
          {{ filteredRegistrations.length }} registrations
        </p>
        <div class="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            @click="currentPage--" 
            :disabled="currentPage === 1"
          >
            Previous
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            @click="currentPage++" 
            :disabled="currentPage >= totalPages"
          >
            Next
          </Button>
        </div>
      </div>
    </div>

    <!-- Registration Details Modal -->
    <RegistrationDetailsModal
      :open="showDetailsModal"
      :registration="selectedRegistration"
      @close="closeDetailsModal"
      @updated="handleRegistrationUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  RefreshCw, 
  Download, 
  Users, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Search,
  Eye,
  CreditCard,
  X,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-vue-next'
import { collection, query, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'
import { useToast } from '@/composables/useToast'
import { formatTimestamp } from '@/utils/firestore'
import type { TournamentRegistration, Tournament } from '@/types/tournament'

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import RegistrationDetailsModal from '@/components/tournaments/RegistrationDetailsModal.vue'

// UI Components
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'
import Table from '@/components/ui/table.vue'
import TableHeader from '@/components/ui/table-header.vue'
import TableBody from '@/components/ui/table-body.vue'
import TableRow from '@/components/ui/table-row.vue'
import TableHead from '@/components/ui/table-head.vue'
import TableCell from '@/components/ui/table-cell.vue'
import Checkbox from '@/components/ui/checkbox.vue'

const { success, error: showError } = useToast()

// State
const loading = ref(true)
const refreshing = ref(false)
const registrations = ref<TournamentRegistration[]>([])
const tournaments = ref<(Tournament & { id: string })[]>([])
const registrationsUnsubscribe = ref<(() => void) | null>(null)
const tournamentsUnsubscribe = ref<(() => void) | null>(null)

// Search and filters
const searchQuery = ref('')
const filters = ref({
  tournamentId: '',
  status: '',
  paymentStatus: ''
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(20)

// Modal state
const showDetailsModal = ref(false)
const selectedRegistration = ref<TournamentRegistration | null>(null)

// Bulk actions state
const selectedRegistrationIds = ref<string[]>([])
const bulkActionInProgress = ref(false)

// Computed
const stats = computed(() => {
  const total = registrations.value.length
  const confirmed = registrations.value.filter(r => r.status === 'confirmed').length
  const pendingPayments = registrations.value.filter(r => r.paymentStatus === 'pending').length
  const totalRevenue = registrations.value
    .filter(r => r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + (r.entryFee || 0), 0)
  
  return {
    totalRegistrations: total,
    confirmedRegistrations: confirmed,
    pendingPayments,
    totalRevenue
  }
})

const registrationTrend = computed(() => {
  const today = new Date()
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
  const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6))
  
  // This week's registrations
  const registrationsThisWeek = registrations.value.filter(reg => {
    const registeredAt = formatTimestamp(reg.registeredAt)
    return registeredAt >= startOfWeek && registeredAt <= endOfWeek
  })
  
  // Last week's registrations
  const lastWeekStart = new Date(startOfWeek)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(endOfWeek)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7)
  
  const registrationsLastWeek = registrations.value.filter(reg => {
    const registeredAt = formatTimestamp(reg.registeredAt)
    return registeredAt >= lastWeekStart && registeredAt <= lastWeekEnd
  })
  
  const thisWeekCount = registrationsThisWeek.length
  const lastWeekCount = registrationsLastWeek.length
  
  // Calculate percentage change
  let percentageChange = 0
  if (lastWeekCount > 0) {
    percentageChange = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
  } else if (thisWeekCount > 0) {
    percentageChange = 100
  }
  
  return {
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    percentageChange: Math.abs(percentageChange),
    isUp: percentageChange > 0,
    isDown: percentageChange < 0
  }
})

const filteredRegistrations = computed(() => {
  let filtered = registrations.value

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(reg => 
      reg.playerName.toLowerCase().includes(query) ||
      reg.tournamentName.toLowerCase().includes(query) ||
      reg.communityName.toLowerCase().includes(query) ||
      (reg.playerEmail && reg.playerEmail.toLowerCase().includes(query))
    )
  }

  // Tournament filter
  if (filters.value.tournamentId) {
    filtered = filtered.filter(reg => reg.tournamentId === filters.value.tournamentId)
  }

  // Status filter
  if (filters.value.status) {
    filtered = filtered.filter(reg => reg.status === filters.value.status)
  }

  // Payment status filter
  if (filters.value.paymentStatus) {
    filtered = filtered.filter(reg => reg.paymentStatus === filters.value.paymentStatus)
  }
  //not paid filter
  if (filters.value.paymentStatus === 'not_paid') {
    filtered = filtered.filter(reg => reg.paymentStatus !== 'paid')
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredRegistrations.value.length / pageSize.value))

const paginatedRegistrations = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRegistrations.value.slice(start, end)
})

const allSelectedOnPage = computed(() => {
  return paginatedRegistrations.value.length > 0 && 
         paginatedRegistrations.value.every(reg => selectedRegistrationIds.value.includes(reg.id))
})

// Methods
const loadRegistrations = () => {
  try {
    const db = getFirebaseDb()
    
    // Load registrations
    const registrationsRef = collection(db, 'tournament_registrations')
    const registrationsQuery = query(registrationsRef, orderBy('registeredAt', 'desc'))
    
    registrationsUnsubscribe.value = onSnapshot(registrationsQuery, (snapshot) => {
      registrations.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TournamentRegistration[]
      
      loading.value = false
    }, (err) => {
      console.error('Error loading registrations:', err)
      showError('Error', 'Failed to load tournament registrations')
      loading.value = false
    })

    // Load tournaments for filter dropdown
    const tournamentsRef = collection(db, 'tournaments')
    const tournamentsQuery = query(tournamentsRef, orderBy('name'))
    
    tournamentsUnsubscribe.value = onSnapshot(tournamentsQuery, (snapshot) => {
      tournaments.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Tournament & { id: string })[]
    })

  } catch (err) {
    console.error('Error setting up listeners:', err)
    showError('Error', 'Failed to load data')
    loading.value = false
  }
}

const refreshData = async () => {
  refreshing.value = true
  // Data refreshes automatically via real-time listeners
  setTimeout(() => {
    refreshing.value = false
    success('Success', 'Data refreshed')
  }, 1000)
}

const exportRegistrations = () => {
  if (filteredRegistrations.value.length === 0) {
    showError('Error', 'No registrations to export')
    return
  }

  const headers = [
    'Player Name', 'Player Email', 'Tournament', 'Community', 'Entry Fee', 
    'Status', 'Payment Status', 'Payment Method', 'Registered Date', 'Registered By'
  ]
  
  const rows = filteredRegistrations.value.map(reg => [
    reg.playerName,
    reg.playerEmail || 'N/A',
    reg.tournamentName,
    reg.communityName,
    formatCurrency(reg.entryFee, 'KES'),
    formatPlayerStatus(reg.status),
    formatPaymentStatus(reg.paymentStatus),
    reg.paymentMethod || 'Cash',
    formatDate(reg.registeredAt),
    reg.registeredBy || 'System'
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `tournament-registrations-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  success('Success', 'Registrations exported successfully')
}

const viewRegistration = (registration: TournamentRegistration) => {
  selectedRegistration.value = registration
  showDetailsModal.value = true
}

const updatePaymentStatus = async (registration: TournamentRegistration) => {
  if (registration.paymentStatus === 'paid') return

  try {
    const db = getFirebaseDb()
    const newStatus = registration.paymentStatus === 'pending' ? 'paid' : 'pending'
    
    const updateData: any = {
      paymentStatus: newStatus,
      updatedAt: Timestamp.now()
    }

    if (newStatus === 'paid') {
      updateData.paymentCompletedAt = Timestamp.now()
      updateData.status = 'confirmed'
      updateData.confirmedAt = Timestamp.now()
    }

    await updateDoc(doc(db, 'tournament_registrations', registration.id), updateData)
    success('Success', `Payment status updated to ${newStatus}`)
    
  } catch (err) {
    console.error('Error updating payment status:', err)
    showError('Error', 'Failed to update payment status')
  }
}

const cancelRegistration = async (registration: TournamentRegistration) => {
  if (!confirm(`Are you sure you want to cancel ${registration.playerName}'s registration?`)) {
    return
  }

  try {
    const db = getFirebaseDb()
    await updateDoc(doc(db, 'tournament_registrations', registration.id), {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancellationReason: 'Cancelled by admin',
      updatedAt: Timestamp.now()
    })
    
    success('Success', `Registration cancelled for ${registration.playerName}`)
    
  } catch (err) {
    console.error('Error cancelling registration:', err)
    showError('Error', 'Failed to cancel registration')
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedRegistration.value = null
}

const handleRegistrationUpdated = () => {
  // Data updates automatically via real-time listeners
  success('Success', 'Registration updated successfully')
}

// Bulk action methods
const toggleRegistrationSelection = (registrationId: string) => {
  const index = selectedRegistrationIds.value.indexOf(registrationId)
  if (index > -1) {
    selectedRegistrationIds.value.splice(index, 1)
  } else {
    selectedRegistrationIds.value.push(registrationId)
  }
}

const toggleAllSelectionOnPage = () => {
  if (allSelectedOnPage.value) {
    // Deselect all on current page
    const currentPageIds = paginatedRegistrations.value.map(reg => reg.id)
    selectedRegistrationIds.value = selectedRegistrationIds.value.filter(id => !currentPageIds.includes(id))
  } else {
    // Select all on current page
    const currentPageIds = paginatedRegistrations.value.map(reg => reg.id)
    const newSelections = currentPageIds.filter(id => !selectedRegistrationIds.value.includes(id))
    selectedRegistrationIds.value.push(...newSelections)
  }
}

const bulkUpdatePaymentStatus = async (newStatus: 'paid' | 'pending') => {
  if (selectedRegistrationIds.value.length === 0) return
  
  const confirmMessage = `Are you sure you want to mark ${selectedRegistrationIds.value.length} registration(s) as ${newStatus}?`
  if (!confirm(confirmMessage)) return

  bulkActionInProgress.value = true
  try {
    const db = getFirebaseDb()
    const updatePromises = selectedRegistrationIds.value.map(async (registrationId) => {
      const updateData: any = {
        paymentStatus: newStatus,
        updatedAt: Timestamp.now()
      }

      if (newStatus === 'paid') {
        updateData.paymentCompletedAt = Timestamp.now()
        updateData.status = 'confirmed'
        updateData.confirmedAt = Timestamp.now()
      }

      await updateDoc(doc(db, 'tournament_registrations', registrationId), updateData)
    })

    await Promise.all(updatePromises)
    success('Success', `Payment status updated to ${newStatus} for ${selectedRegistrationIds.value.length} registration(s)`)
    selectedRegistrationIds.value = []
    
  } catch (err) {
    console.error('Error updating payment status in bulk:', err)
    showError('Error', 'Failed to update payment status for some registrations')
  } finally {
    bulkActionInProgress.value = false
  }
}

const bulkUpdateRegistrationStatus = async (newStatus: 'confirmed' | 'pending') => {
  if (selectedRegistrationIds.value.length === 0) return
  
  const confirmMessage = `Are you sure you want to mark ${selectedRegistrationIds.value.length} registration(s) as ${newStatus}?`
  if (!confirm(confirmMessage)) return

  bulkActionInProgress.value = true
  try {
    const db = getFirebaseDb()
    const updatePromises = selectedRegistrationIds.value.map(async (registrationId) => {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now()
      }

      if (newStatus === 'confirmed') {
        updateData.confirmedAt = Timestamp.now()
      }

      await updateDoc(doc(db, 'tournament_registrations', registrationId), updateData)
    })

    await Promise.all(updatePromises)
    success('Success', `Registration status updated to ${newStatus} for ${selectedRegistrationIds.value.length} registration(s)`)
    selectedRegistrationIds.value = []
    
  } catch (err) {
    console.error('Error updating registration status in bulk:', err)
    showError('Error', 'Failed to update registration status for some registrations')
  } finally {
    bulkActionInProgress.value = false
  }
}

const bulkCancelRegistrations = async () => {
  if (selectedRegistrationIds.value.length === 0) return
  
  const confirmMessage = `Are you sure you want to cancel ${selectedRegistrationIds.value.length} registration(s)? This action cannot be undone.`
  if (!confirm(confirmMessage)) return

  bulkActionInProgress.value = true
  try {
    const db = getFirebaseDb()
    const updatePromises = selectedRegistrationIds.value.map(async (registrationId) => {
      await updateDoc(doc(db, 'tournament_registrations', registrationId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancellationReason: 'Cancelled by admin (bulk action)',
        updatedAt: Timestamp.now()
      })
    })

    await Promise.all(updatePromises)
    success('Success', `${selectedRegistrationIds.value.length} registration(s) cancelled successfully`)
    selectedRegistrationIds.value = []
    
  } catch (err) {
    console.error('Error cancelling registrations in bulk:', err)
    showError('Error', 'Failed to cancel some registrations')
  } finally {
    bulkActionInProgress.value = false
  }
}

const bulkExportRegistrations = () => {
  if (selectedRegistrationIds.value.length === 0) return

  const selectedRegistrations = registrations.value.filter(reg => selectedRegistrationIds.value.includes(reg.id))
  
  const headers = [
    'Player Name', 'Player Email', 'Tournament', 'Community', 'Entry Fee', 
    'Status', 'Payment Status', 'Payment Method', 'Registered Date', 'Registered By'
  ]
  
  const rows = selectedRegistrations.map(reg => [
    reg.playerName,
    reg.playerEmail || 'N/A',
    reg.tournamentName,
    reg.communityName,
    formatCurrency(reg.entryFee, 'KES'),
    formatPlayerStatus(reg.status),
    formatPaymentStatus(reg.paymentStatus),
    reg.paymentMethod || 'Cash',
    formatDate(reg.registeredAt),
    reg.registeredBy || 'System'
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `selected-registrations-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  success('Success', `${selectedRegistrations.length} selected registration(s) exported successfully`)
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

const formatDate = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(dateValue)
}

// Lifecycle
onMounted(() => {
  loadRegistrations()
})

onUnmounted(() => {
  if (registrationsUnsubscribe.value) {
    registrationsUnsubscribe.value()
  }
  if (tournamentsUnsubscribe.value) {
    tournamentsUnsubscribe.value()
  }
})

// Reset pagination when filters change
watch([searchQuery, filters], () => {
  currentPage.value = 1
  selectedRegistrationIds.value = [] // Clear selection when filters change
}, { deep: true })
</script>