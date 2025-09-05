<template>
  <div class="match-info-sidebar">
    <!-- Match Status Card -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle>Match Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="status-info">
          <div class="status-item">
            <span class="label">Current Status</span>
            <Badge :variant="getStatusVariant(match.status)">{{ match.status }}</Badge>
          </div>
          
          <div v-if="match.actualStartTime" class="status-item">
            <span class="label">Started</span>
            <span class="value">{{ formatDateTime(match.actualStartTime) }}</span>
          </div>
          
          <div v-if="match.scheduledDateTime" class="status-item">
            <span class="label">Scheduled</span>
            <span class="value">{{ formatDateTime(match.scheduledDateTime) }}</span>
          </div>
          
          <div class="status-item">
            <span class="label">Duration</span>
            <span class="value">{{ getMatchDuration() }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Venue Information -->
    <Card class="mb-4">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>Venue Details</CardTitle>
          <Button @click="editVenue" variant="ghost" size="sm">
            <Edit class="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="!editingVenue" class="venue-display">
          <div class="venue-item">
            <MapPin class="h-4 w-4 text-muted-foreground" />
            <div>
              <div class="venue-name">{{ currentVenue.name || 'No venue assigned' }}</div>
              <div v-if="currentVenue.address" class="venue-address">{{ currentVenue.address }}</div>
            </div>
          </div>
          
          <div v-if="currentVenue.table" class="venue-item">
            <Hash class="h-4 w-4 text-muted-foreground" />
            <div>
              <div class="venue-detail">Table: {{ currentVenue.table }}</div>
            </div>
          </div>
          
          <div v-if="currentVenue.contact" class="venue-item">
            <Phone class="h-4 w-4 text-muted-foreground" />
            <div>
              <div class="venue-detail">{{ currentVenue.contact }}</div>
            </div>
          </div>
        </div>

        <!-- Venue Edit Form -->
        <div v-else class="venue-edit-form">
          <div class="form-group">
            <label>Venue</label>
            <select v-model="venueForm.venueId" class="form-control">
              <option value="">Select venue</option>
              <option value="default">Use Tournament Default</option>
              <option v-for="venue in availableVenues" :key="venue.id" :value="venue.id">
                {{ venue.name }}
              </option>
              <option value="custom">Custom Venue</option>
            </select>
          </div>
          
          <!-- Custom Venue Fields -->
          <div v-if="venueForm.venueId === 'custom'" class="custom-venue-fields">
            <div class="form-group">
              <label>Venue Name</label>
              <input 
                v-model="venueForm.customName" 
                type="text" 
                class="form-control"
                placeholder="Enter venue name"
              />
            </div>
            
            <div class="form-group">
              <label>Address</label>
              <input 
                v-model="venueForm.customAddress" 
                type="text" 
                class="form-control"
                placeholder="Enter venue address"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Table/Court</label>
            <input 
              v-model="venueForm.table" 
              type="text" 
              class="form-control"
              placeholder="e.g., Table 1, Court A"
            />
          </div>
          
          <div class="form-group">
            <label>Contact Info</label>
            <input 
              v-model="venueForm.contact" 
              type="text" 
              class="form-control"
              placeholder="Phone or email"
            />
          </div>
          
          <div class="form-actions">
            <Button @click="saveVenue" size="sm" :disabled="savingVenue">
              <Save class="h-3 w-3 mr-1" />
              {{ savingVenue ? 'Saving...' : 'Save' }}
            </Button>
            <Button @click="cancelEditVenue" variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Tournament Information -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle>Tournament Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="tournament-info">
          <div class="info-item">
            <span class="label">Level</span>
            <Badge variant="outline">{{ match.tournamentLevel }}</Badge>
          </div>
          
          <div class="info-item">
            <span class="label">Round</span>
            <span class="value">{{ match.roundNumber }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Match Type</span>
            <span class="value">{{ match.matchType }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Match #</span>
            <span class="value">{{ match.matchNumber }}</span>
          </div>
          
          <div v-if="match.tournamentId" class="info-item">
            <span class="label">Tournament ID</span>
            <span class="value">{{ match.tournamentId }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Players Information -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="players-info">
          <div class="player-card">
            <div class="player-header">
              <User class="h-4 w-4 text-muted-foreground" />
              <span class="player-name">{{ match.player1Name }}</span>
            </div>
            <div class="player-details">
              <div v-if="match.player1CommunityId" class="detail">
                <span class="label">Community:</span>
                <span class="value">{{ match.player1CommunityId }}</span>
              </div>
              <div v-if="match.player1Points" class="detail">
                <span class="label">Points:</span>
                <span class="value">{{ match.player1Points }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="match.player2Name" class="player-card">
            <div class="player-header">
              <User class="h-4 w-4 text-muted-foreground" />
              <span class="player-name">{{ match.player2Name }}</span>
            </div>
            <div class="player-details">
              <div v-if="match.player2CommunityId" class="detail">
                <span class="label">Community:</span>
                <span class="value">{{ match.player2CommunityId }}</span>
              </div>
              <div v-if="match.player2Points" class="detail">
                <span class="label">Points:</span>
                <span class="value">{{ match.player2Points }}</span>
              </div>
            </div>
          </div>
          
          <div v-else class="bye-notice">
            <span class="bye-text">BYE - Automatic advancement</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Quick Actions -->
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="quick-actions">
          <Button @click="rescheduleMatch" variant="outline" size="sm" class="action-btn">
            <Clock class="h-3 w-3 mr-1" />
            Reschedule
          </Button>
          
          <Button @click="duplicateMatch" variant="outline" size="sm" class="action-btn">
            <Copy class="h-3 w-3 mr-1" />
            Duplicate
          </Button>
          
          <Button @click="exportMatch" variant="outline" size="sm" class="action-btn">
            <Download class="h-3 w-3 mr-1" />
            Export
          </Button>
          
          <Button @click="shareMatch" variant="outline" size="sm" class="action-btn">
            <Share class="h-3 w-3 mr-1" />
            Share
          </Button>
          
          <Button @click="printMatch" variant="outline" size="sm" class="action-btn">
            <Printer class="h-3 w-3 mr-1" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Edit, 
  MapPin, 
  Hash, 
  Phone, 
  Save, 
  User, 
  Clock, 
  Copy, 
  Download, 
  Share, 
  Printer 
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { useMatches } from '@/composables/useMatches'
import { useToast } from '@/composables/useToast'
import type { Match } from '@/types/match'

interface Props {
  match: Match
}

interface Venue {
  id: string
  name: string
  address?: string
  contact?: string
}

const props = defineProps<Props>()

const { updateMatch } = useMatches()
const { success, error: showError } = useToast()

// State
const editingVenue = ref(false)
const savingVenue = ref(false)
const venueForm = ref({
  venueId: '',
  table: '',
  contact: '',
  customName: '',
  customAddress: ''
})

// Mock tournament venues - in real app, this would come from tournament data
const tournamentDefaultVenue = ref({
  name: 'Main Tournament Hall',
  address: '123 Tournament Street, Sports City',
  contact: '+1 (555) 123-4567'
})

// Mock available venues - in real app, this would come from venues API
const availableVenues = ref<Venue[]>([
  { id: 'venue1', name: 'Sports Complex A', address: '456 Sports Ave', contact: '+1 (555) 234-5678' },
  { id: 'venue2', name: 'Community Center', address: '789 Community Rd', contact: '+1 (555) 345-6789' },
  { id: 'venue3', name: 'Recreation Hall', address: '321 Recreation Blvd', contact: '+1 (555) 456-7890' }
])

// Computed
const currentVenue = computed(() => {
  if (props.match.venueId === 'default' || !props.match.venueId) {
    return {
      name: tournamentDefaultVenue.value.name,
      address: tournamentDefaultVenue.value.address,
      contact: tournamentDefaultVenue.value.contact,
      table: props.match.tableNumber || ''
    }
  }
  
  const venue = availableVenues.value.find(v => v.id === props.match.venueId)
  if (venue) {
    return {
      name: venue.name,
      address: venue.address,
      contact: venue.contact,
      table: props.match.tableNumber || ''
    }
  }
  
  // Custom venue
  return {
    name: props.match.venueId || 'Custom Venue',
    address: props.match.venueAddress || '',
    contact: props.match.venueContact || '',
    table: props.match.tableNumber || ''
  }
})

// Methods
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'in_progress': return 'destructive'
    case 'completed': return 'default'
    case 'scheduled': return 'secondary'
    case 'pending': return 'outline'
    case 'cancelled': return 'destructive'
    case 'paused': return 'secondary'
    default: return 'outline'
  }
}

const formatDateTime = (dateTime: string | Date): string => {
  return new Date(dateTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMatchDuration = (): string => {
  if (!props.match.actualStartTime) return 'Not started'
  
  const start = new Date(props.match.actualStartTime)
  const end = props.match.actualEndTime ? new Date(props.match.actualEndTime) : new Date()
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60) // minutes
  
  if (duration < 60) {
    return `${duration}m`
  } else {
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return `${hours}h ${minutes}m`
  }
}

const editVenue = () => {
  // Initialize form with current values
  venueForm.value = {
    venueId: props.match.venueId || 'default',
    table: props.match.tableNumber || '',
    contact: props.match.venueContact || '',
    customName: props.match.venueId && !availableVenues.value.find(v => v.id === props.match.venueId) ? props.match.venueId : '',
    customAddress: props.match.venueAddress || ''
  }
  editingVenue.value = true
}

const saveVenue = async () => {
  savingVenue.value = true
  
  try {
    let updateData: any = {
      tableNumber: venueForm.value.table,
      venueContact: venueForm.value.contact
    }
    
    if (venueForm.value.venueId === 'default') {
      updateData.venueId = 'default'
      updateData.venueAddress = tournamentDefaultVenue.value.address
    } else if (venueForm.value.venueId === 'custom') {
      updateData.venueId = venueForm.value.customName
      updateData.venueAddress = venueForm.value.customAddress
    } else {
      updateData.venueId = venueForm.value.venueId
      const venue = availableVenues.value.find(v => v.id === venueForm.value.venueId)
      if (venue) {
        updateData.venueAddress = venue.address
      }
    }
    
    await updateMatch(props.match.id, updateData, 'current_user')
    
    editingVenue.value = false
    success('Venue updated successfully')
    emit('venueUpdated', updateData)
  } catch (err) {
    showError('Failed to update venue')
  } finally {
    savingVenue.value = false
  }
}

const cancelEditVenue = () => {
  editingVenue.value = false
}

const rescheduleMatch = () => {
  // This would open the reschedule modal or navigate to reschedule page
  success('Reschedule functionality coming soon')
}

const duplicateMatch = () => {
  success('Duplicate functionality coming soon')
}

const exportMatch = () => {
  // Export match details to PDF or other format
  const matchData = {
    match: props.match,
    venue: currentVenue.value,
    exportedAt: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(matchData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `match-${props.match.id}-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  success('Match data exported')
}

const shareMatch = () => {
  // Copy match URL to clipboard
  const matchUrl = `${window.location.origin}/matches/${props.match.id}`
  navigator.clipboard.writeText(matchUrl).then(() => {
    success('Match URL copied to clipboard')
  }).catch(() => {
    showError('Failed to copy match URL')
  })
}

const printMatch = () => {
  // Open print dialog for match details
  window.print()
}

// Emits
interface Emits {
  (e: 'venueUpdated', data: any): void
}

const emit = defineEmits<Emits>()
</script>

<style scoped>
.match-info-sidebar {
  space-y: 1rem;
}

.status-info, 
.tournament-info {
  space-y: 1rem;
}

.status-item,
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
}

.venue-display {
  space-y: 1rem;
}

.venue-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.venue-name {
  font-weight: 600;
  color: #1e293b;
}

.venue-address,
.venue-detail {
  font-size: 0.875rem;
  color: #64748b;
}

.venue-edit-form {
  space-y: 1rem;
}

.form-group {
  space-y: 0.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.custom-venue-fields {
  space-y: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.players-info {
  space-y: 1rem;
}

.player-card {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.player-name {
  font-weight: 600;
  color: #1e293b;
}

.player-details {
  space-y: 0.25rem;
}

.detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.detail .label {
  color: #64748b;
}

.detail .value {
  color: #1e293b;
  font-weight: 500;
}

.bye-notice {
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  text-align: center;
}

.bye-text {
  font-size: 0.875rem;
  color: #92400e;
  font-weight: 500;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.action-btn {
  justify-content: flex-start;
}

@media (max-width: 768px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>