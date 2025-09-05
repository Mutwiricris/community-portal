<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditing ? 'Edit Tournament' : (tournament ? 'Tournament Details' : 'Create Tournament') }}
        </DialogTitle>
      </DialogHeader>

      <div v-if="tournament && !isEditing" class="space-y-6">
        <!-- View Mode -->
        <div class="flex items-start space-x-6">
          <div v-if="tournament.bannerImage" class="w-32 h-20 rounded-lg overflow-hidden">
            <img :src="tournament.bannerImage" :alt="tournament.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-32 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
            {{ getInitials(tournament.name) }}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-3xl font-bold">{{ tournament.name }}</h2>
              <Badge v-if="tournament.isFeatured" variant="default" class="text-sm">Featured</Badge>
              <Badge v-if="tournament.isQualificationTournament" variant="secondary" class="text-sm">Qualification</Badge>
            </div>
            <p class="text-xl text-muted-foreground mb-2">{{ tournament.competitionLevel }}</p>
            <div class="flex gap-3 mb-3">
              <Badge :variant="getStatusVariant(tournament.status)" class="text-sm">
                {{ formatStatus(tournament.status) }}
              </Badge>
              <Badge :variant="getTypeVariant(tournament.type)" class="text-sm">
                {{ formatType(tournament.type) }}
              </Badge>
            </div>
            <p class="text-muted-foreground">{{ tournament.description }}</p>
          </div>
        </div>

        <!-- Key Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-green-600">{{ formatCurrency(tournament.prizePool, tournament.currency) }}</div>
            <div class="text-sm text-muted-foreground">Prize Pool</div>
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-blue-600">{{ tournament.currentRegistrations }}/{{ tournament.maxPlayers }}</div>
            <div class="text-sm text-muted-foreground">Registered Players</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-purple-600">{{ formatCurrency(tournament.entryFee, tournament.currency) }}</div>
            <div class="text-sm text-muted-foreground">Entry Fee</div>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-orange-600">{{ tournament.estimatedDuration }}</div>
            <div class="text-sm text-muted-foreground">Duration</div>
          </div>
        </div>

        <!-- Tournament Information Tabs -->
        <div class="border-b">
          <nav class="flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="space-y-6">
          <!-- Details Tab -->
          <div v-if="activeTab === 'details'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Tournament Information</h3>
              <div class="space-y-3">
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Tournament ID</label>
                  <p class="font-mono text-sm bg-secondary/50 p-2 rounded">{{ tournament.id }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Tournament Series</label>
                  <p class="font-medium">{{ tournament.tournamentSeries || 'N/A' }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Hierarchical Level</label>
                  <p class="font-medium">{{ formatType(tournament.hierarchicalLevel) }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">National Tournament</label>
                  <p class="font-medium">{{ tournament.isNationalTournament ? 'Yes' : 'No' }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Created By</label>
                  <p class="font-medium">{{ tournament.createdBy }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Created At</label>
                  <p class="font-medium">{{ formatDateTime(tournament.createdAt) }}</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Location & Venue</h3>
              <div class="space-y-3">
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Location</label>
                  <p class="font-medium">{{ tournament.location }}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground">Venue</label>
                  <p class="font-medium">{{ tournament.venue }}</p>
                </div>
                <div v-if="tournament.geographicalScope">
                  <label class="text-sm font-medium text-muted-foreground">Geographic Scope</label>
                  <div class="space-y-1">
                    <p v-if="tournament.geographicalScope.communityName" class="text-sm">
                      <strong>Community:</strong> {{ tournament.geographicalScope.communityName }}
                    </p>
                    <p v-if="tournament.geographicalScope.countyName" class="text-sm">
                      <strong>County:</strong> {{ tournament.geographicalScope.countyName }}
                    </p>
                    <p v-if="tournament.geographicalScope.regionName" class="text-sm">
                      <strong>Region:</strong> {{ tournament.geographicalScope.regionName }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dates Tab -->
          <div v-if="activeTab === 'dates'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Tournament Dates</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-3">
                  <Calendar class="h-5 w-5 text-green-600" />
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p class="font-medium">{{ formatDateTime(tournament.startDate) }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <Calendar class="h-5 w-5 text-red-600" />
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">End Date</label>
                    <p class="font-medium">{{ formatDateTime(tournament.endDate) }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <Clock class="h-5 w-5 text-blue-600" />
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Estimated Duration</label>
                    <p class="font-medium">{{ tournament.estimatedDuration }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Registration Dates</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-3">
                  <UserPlus class="h-5 w-5 text-green-600" />
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Registration Start</label>
                    <p class="font-medium">{{ formatDateTime(tournament.registrationStartDate) }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <UserX class="h-5 w-5 text-red-600" />
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Registration End</label>
                    <p class="font-medium">{{ formatDateTime(tournament.registrationEndDate) }}</p>
                  </div>
                </div>
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div class="flex items-center space-x-2 mb-2">
                    <Users class="h-4 w-4 text-blue-600" />
                    <span class="text-sm font-medium">Registration Status</span>
                  </div>
                  <div class="text-sm text-muted-foreground">
                    {{ getRegistrationStatus() }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Registration Tab -->
          <div v-if="activeTab === 'registration'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2">Registration Settings</h3>
                <div class="space-y-3">
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Registration Criteria</label>
                    <p class="font-medium">{{ formatRegistrationCriteria(tournament.registrationCriteria) }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Qualification Requirement</label>
                    <p class="font-medium">{{ formatQualificationRequirement(tournament.qualificationRequirement) }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Expected Participants</label>
                    <p class="font-medium">{{ tournament.expectedParticipants }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Maximum Players</label>
                    <p class="font-medium">{{ tournament.maxPlayers }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2">Financial Information</h3>
                <div class="space-y-3">
                  <div class="flex items-center space-x-3">
                    <DollarSign class="h-5 w-5 text-green-600" />
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Entry Fee</label>
                      <p class="font-medium">{{ formatCurrency(tournament.entryFee, tournament.currency) }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <Trophy class="h-5 w-5 text-yellow-600" />
                    <div>
                      <label class="text-sm font-medium text-muted-foreground">Prize Pool</label>
                      <p class="font-medium">{{ formatCurrency(tournament.prizePool, tournament.currency) }}</p>
                    </div>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Currency</label>
                    <p class="font-medium">{{ tournament.currency }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Registration Progress -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Registration Progress</h3>
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Current Registrations</span>
                  <span class="font-medium">{{ tournament.currentRegistrations }} / {{ tournament.maxPlayers }}</span>
                </div>
                <div class="w-full bg-secondary/30 rounded-full h-3">
                  <div 
                    class="bg-primary h-3 rounded-full transition-all duration-300"
                    :style="{ width: `${Math.min((tournament.currentRegistrations / tournament.maxPlayers) * 100, 100)}%` }"
                  ></div>
                </div>
                <div class="text-sm text-muted-foreground">
                  {{ Math.round((tournament.currentRegistrations / tournament.maxPlayers) * 100) }}% filled
                </div>
              </div>
            </div>
          </div>

          <!-- Qualification Tab -->
          <div v-if="activeTab === 'qualification'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2">Qualification Settings</h3>
                <div class="space-y-3">
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Is Qualification Tournament</label>
                    <p class="font-medium">{{ tournament.isQualificationTournament ? 'Yes' : 'No' }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground">Progression Enabled</label>
                    <p class="font-medium">{{ tournament.progressionEnabled ? 'Yes' : 'No' }}</p>
                  </div>
                  <div v-if="tournament.qualificationCriteria">
                    <label class="text-sm font-medium text-muted-foreground">Qualification Criteria</label>
                    <p class="font-medium">{{ tournament.qualificationCriteria }}</p>
                  </div>
                  <div v-if="tournament.qualifiesPlayerCount">
                    <label class="text-sm font-medium text-muted-foreground">Qualifies Player Count</label>
                    <p class="font-medium">{{ tournament.qualifiesPlayerCount }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-lg font-semibold border-b pb-2">Tournament Hierarchy</h3>
                <div class="space-y-3">
                  <div v-if="tournament.nextLevelTournamentId">
                    <label class="text-sm font-medium text-muted-foreground">Next Level Tournament</label>
                    <p class="font-medium">{{ tournament.nextLevelTournamentId }}</p>
                  </div>
                  <div v-if="tournament.parentTournamentIds.length > 0">
                    <label class="text-sm font-medium text-muted-foreground">Parent Tournaments</label>
                    <div class="space-y-1">
                      <p v-for="parentId in tournament.parentTournamentIds" :key="parentId" class="text-sm font-mono bg-secondary/50 p-1 rounded">
                        {{ parentId }}
                      </p>
                    </div>
                  </div>
                  <div v-if="tournament.childTournamentIds.length > 0">
                    <label class="text-sm font-medium text-muted-foreground">Child Tournaments</label>
                    <div class="space-y-1">
                      <p v-for="childId in tournament.childTournamentIds" :key="childId" class="text-sm font-mono bg-secondary/50 p-1 rounded">
                        {{ childId }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Qualified Players -->
            <div v-if="tournament.qualifiedPlayersList.length > 0" class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Qualified Players</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div v-for="playerId in tournament.qualifiedPlayersList" :key="playerId" 
                     class="text-sm font-mono bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-4 border-green-500">
                  {{ playerId }}
                </div>
              </div>
            </div>
          </div>

          <!-- Communities Tab -->
          <div v-if="activeTab === 'communities'" class="space-y-6">
            <div class="space-y-4">
              <h3 class="text-lg font-semibold border-b pb-2">Allowed Communities</h3>
              <div v-if="tournament.allowedCommunityIds.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div v-for="communityId in tournament.allowedCommunityIds" :key="communityId" 
                     class="text-sm font-mono bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-4 border-blue-500">
                  {{ communityId }}
                </div>
              </div>
              <div v-else class="text-center py-8 text-muted-foreground">
                <Users class="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No specific community restrictions</p>
                <p class="text-sm">This tournament is open to all communities</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-between items-center pt-6 border-t">
          <Button @click="$emit('close')" variant="outline">Close</Button>
          <div class="flex gap-3">
            <Button @click="copyTournamentId" variant="outline">
              <Copy class="h-4 w-4 mr-2" />
              Copy ID
            </Button>
            <Button @click="startEditing">
              <Edit class="h-4 w-4 mr-2" />
              Edit Tournament
            </Button>
          </div>
        </div>
      </div>

      <!-- Edit Mode (Simplified form for now) -->
      <div v-else-if="isEditing" class="space-y-6">
        <div class="text-center py-8 text-muted-foreground">
          <Settings class="h-16 w-16 mx-auto mb-4" />
          <h3 class="text-lg font-medium mb-2">Tournament Editor</h3>
          <p class="mb-4">Full tournament editing form will be implemented here</p>
          <div class="flex gap-3 justify-center">
            <Button @click="cancelEditing" variant="outline">Cancel</Button>
            <Button @click="saveChanges">Save Changes</Button>
          </div>
        </div>
      </div>

      <!-- Create Mode -->
      <div v-else class="space-y-6">
        <div class="text-center py-8 text-muted-foreground">
          <Plus class="h-16 w-16 mx-auto mb-4" />
          <h3 class="text-lg font-medium mb-2">Create New Tournament</h3>
          <p class="mb-4">Tournament creation form will be implemented here</p>
          <div class="flex gap-3 justify-center">
            <Button @click="$emit('close')" variant="outline">Cancel</Button>
            <Button @click="createTournament">Create Tournament</Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Calendar, 
  Clock, 
  Users, 
  UserPlus, 
  UserX, 
  DollarSign, 
  Trophy, 
  Copy, 
  Edit,
  Settings,
  Plus
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatTimestamp } from '@/utils/firestore'
import type { Tournament } from '@/types/tournament'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  tournament?: (Tournament & { id: string }) | null
  open: boolean
}

const props = defineProps<Props>()

defineEmits<{
  close: []
  updated: []
}>()

const { success } = useToast()

// State
const activeTab = ref('details')
const isEditing = ref(false)

const tabs = [
  { id: 'details', label: 'Details' },
  { id: 'dates', label: 'Dates' },
  { id: 'registration', label: 'Registration' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'communities', label: 'Communities' }
]

// Methods
const getInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const getStatusVariant = (status: string) => {
  const variants = {
    'upcoming': 'secondary',
    'registration_open': 'default',
    'registration_closed': 'outline',
    'ongoing': 'default',
    'completed': 'secondary',
    'cancelled': 'destructive'
  }
  return variants[status as keyof typeof variants] || 'secondary'
}

const getTypeVariant = (type: string) => {
  const variants = {
    'community': 'secondary',
    'county': 'default',
    'regional': 'default', 
    'national': 'default'
  }
  return variants[type as keyof typeof variants] || 'secondary'
}

const formatStatus = (status: string) => {
  const formats = {
    'upcoming': 'Upcoming',
    'registration_open': 'Registration Open',
    'registration_closed': 'Registration Closed',
    'ongoing': 'Ongoing',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  return formats[status as keyof typeof formats] || status
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

const formatRegistrationCriteria = (criteria: string) => {
  const formats = {
    'open_registration': 'Open Registration',
    'communityOnly': 'Community Members Only',
    'countyOnly': 'County Residents Only',
    'regionalOnly': 'Regional Participants Only',
    'inviteOnly': 'Invitation Only'
  }
  return formats[criteria as keyof typeof formats] || criteria
}

const formatQualificationRequirement = (requirement: string) => {
  const formats = {
    'open_registration': 'Open Registration',
    'qualification_required': 'Qualification Required',
    'invite_only': 'Invitation Only'
  }
  return formats[requirement as keyof typeof formats] || requirement
}

const getRegistrationStatus = () => {
  if (!props.tournament) return 'Unknown'
  
  const now = new Date()
  const regStart = formatTimestamp(props.tournament.registrationStartDate)
  const regEnd = formatTimestamp(props.tournament.registrationEndDate)
  
  if (now < regStart) {
    return 'Registration has not started yet'
  } else if (now > regEnd) {
    return 'Registration period has ended'
  } else if (props.tournament.currentRegistrations >= props.tournament.maxPlayers) {
    return 'Tournament is full'
  } else {
    return 'Registration is currently open'
  }
}

const copyTournamentId = async () => {
  if (!props.tournament) return
  try {
    await navigator.clipboard.writeText(props.tournament.id)
    success('Copied', 'Tournament ID copied to clipboard')
  } catch (error) {
    console.error('Failed to copy tournament ID:', error)
  }
}

const startEditing = () => {
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveChanges = () => {
  // TODO: Implement save functionality
  isEditing.value = false
  success('Success', 'Tournament updated successfully')
}

const createTournament = () => {
  // TODO: Implement create functionality
  success('Success', 'Tournament created successfully')
}
</script>