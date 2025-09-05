<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Basic Information -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Basic Information</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium">Tournament Name *</label>
          <Input
            id="name"
            v-model="form.name"
            placeholder="Enter tournament name"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="competitionLevel" class="text-sm font-medium">Competition Level *</label>
          <Input
            id="competitionLevel"
            v-model="form.competitionLevel"
            placeholder="e.g., Local Community Level"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="type" class="text-sm font-medium">Tournament Type *</label>
          <select
            id="type"
            v-model="form.type"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select Type</option>
            <option value="community">Community</option>
            <option value="county">County</option>
            <option value="regional">Regional</option>
            <option value="national">National</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Status</label>
          <div class="flex h-10 w-full rounded-md border border-input bg-accent/50 px-3 py-2 text-sm items-center">
            <span class="text-muted-foreground">Upcoming (Auto-set)</span>
          </div>
          <p class="text-xs text-muted-foreground">
            New tournaments are automatically set to "Upcoming" status.
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <label for="description" class="text-sm font-medium">Description *</label>
        <Textarea
          id="description"
          v-model="form.description"
          placeholder="Enter tournament description"
          rows="3"
          required
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Tournament Series</label>
          <Input
            v-model="form.tournamentSeries"
            placeholder="e.g., Q1_2025"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Estimated Duration *</label>
          <Input
            v-model="form.estimatedDuration"
            placeholder="e.g., 2 days"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="bannerImage" class="text-sm font-medium">Banner Image URL</label>
          <Input
            id="bannerImage"
            v-model="form.bannerImage"
            placeholder="https://example.com/banner.jpg"
            type="url"
          />
        </div>
      </div>

      <!-- Feature toggles -->
      <div class="flex gap-6">
        <div class="flex items-center space-x-2">
          <input
            id="isFeatured"
            v-model="form.isFeatured"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isFeatured" class="text-sm font-medium">Featured Tournament</label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="isQualificationTournament"
            v-model="form.isQualificationTournament"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isQualificationTournament" class="text-sm font-medium">Qualification Tournament</label>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="isNationalTournament"
            v-model="form.isNationalTournament"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="isNationalTournament" class="text-sm font-medium">National Tournament</label>
        </div>
      </div>
    </div>

    <!-- Dates & Schedule -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Dates & Schedule</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="startDate" class="text-sm font-medium">Start Date *</label>
          <Input
            id="startDate"
            v-model="startDateInput"
            type="datetime-local"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="endDate" class="text-sm font-medium">End Date *</label>
          <Input
            id="endDate"
            v-model="endDateInput"
            type="datetime-local"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="registrationStartDate" class="text-sm font-medium">Registration Start *</label>
          <Input
            id="registrationStartDate"
            v-model="registrationStartDateInput"
            type="datetime-local"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="registrationEndDate" class="text-sm font-medium">Registration End *</label>
          <Input
            id="registrationEndDate"
            v-model="registrationEndDateInput"
            type="datetime-local"
            required
          />
        </div>
      </div>
    </div>

    <!-- Location & Venue -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Location & Venue</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="location" class="text-sm font-medium">Location *</label>
          <Input
            id="location"
            v-model="form.location"
            placeholder="e.g., Community Center - Juja University Pool"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="venue" class="text-sm font-medium">Venue *</label>
          <Input
            id="venue"
            v-model="form.venue"
            placeholder="e.g., Juja University Pool Pool Hall"
            required
          />
        </div>
      </div>

      <!-- Geographic Scope -->
      <div class="space-y-4">
        <h4 class="font-medium">Geographic Scope</h4>
        
        <!-- Community Selection -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Primary Community *</label>
          <CommunitySelect 
            v-model="form.geographicalScope.communityId"
            :county="form.geographicalScope.countyName"
            placeholder="Search and select the primary community for this tournament..."
            @community-selected="handleCommunitySelected"
            @community-cleared="handleCommunityCleared"
          />
          <p class="text-xs text-muted-foreground">
            Select the main community organizing or hosting this tournament.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">County *</label>
            <CountySelect 
              v-model="form.geographicalScope.countyName"
              @update:modelValue="handleCountyChange"
            />
          </div>
          <div class="space-y-2" v-if="form.geographicalScope.countyName">
            <label class="text-sm font-medium">County ID (Auto-generated)</label>
            <Input v-model="form.geographicalScope.countyId" readonly class="bg-gray-50 dark:bg-gray-800" />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Region</label>
            <select
              v-model="form.geographicalScope.regionName"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @change="handleRegionChange"
            >
              <option value="">Select Region</option>
              <option v-for="region in availableRegions" :key="region" :value="region">
                {{ region }}
              </option>
            </select>
          </div>
          <div class="space-y-2" v-if="form.geographicalScope.regionName">
            <label class="text-sm font-medium">Region ID (Auto-generated)</label>
            <Input v-model="form.geographicalScope.regionId" readonly class="bg-gray-50 dark:bg-gray-800" />
          </div>
        </div>

        <!-- Auto-populated community details -->
        <div v-if="selectedCommunityData" class="p-3 bg-accent/30 rounded-md border border-accent">
          <h5 class="font-medium text-sm mb-2">Selected Community Details</h5>
          <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div><strong>Name:</strong> {{ selectedCommunityData.name }}</div>
            <div><strong>Location:</strong> {{ selectedCommunityData.location }}</div>
            <div><strong>County:</strong> {{ selectedCommunityData.county }}</div>
            <div><strong>Members:</strong> {{ selectedCommunityData.memberCount || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Participation -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Participation</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label for="maxPlayers" class="text-sm font-medium">Maximum Players *</label>
          <Input
            id="maxPlayers"
            v-model.number="form.maxPlayers"
            type="number"
            min="1"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="expectedParticipants" class="text-sm font-medium">Expected Participants *</label>
          <Input
            id="expectedParticipants"
            v-model.number="form.expectedParticipants"
            type="number"
            min="1"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="registrationCriteria" class="text-sm font-medium">Registration Criteria *</label>
          <select
            id="registrationCriteria"
            v-model="form.registrationCriteria"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select Criteria</option>
            <option value="open_registration">Open Registration</option>
            <option value="communityOnly">Community Only</option>
            <option value="countyOnly">County Only</option>
            <option value="regionalOnly">Regional Only</option>
            <option value="inviteOnly">Invite Only</option>
          </select>
        </div>

        <div class="space-y-2">
          <label for="qualificationRequirement" class="text-sm font-medium">Qualification Requirement *</label>
          <select
            id="qualificationRequirement"
            v-model="form.qualificationRequirement"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select Requirement</option>
            <option value="open_registration">Open Registration</option>
            <option value="qualification_required">Qualification Required</option>
            <option value="invite_only">Invite Only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Financial Information -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Financial Information</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label for="entryFee" class="text-sm font-medium">Entry Fee *</label>
          <Input
            id="entryFee"
            v-model.number="form.entryFee"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="prizePool" class="text-sm font-medium">Prize Pool *</label>
          <Input
            id="prizePool"
            v-model.number="form.prizePool"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div class="space-y-2">
          <label for="currency" class="text-sm font-medium">Currency *</label>
          <select
            id="currency"
            v-model="form.currency"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          >
            <option value="">Select Currency</option>
            <option value="KES">KES (Kenyan Shilling)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Qualification Settings -->
    <div v-if="form.isQualificationTournament" class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Qualification Settings</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium">Qualification Criteria</label>
          <Input
            v-model="form.qualificationCriteria"
            placeholder="e.g., top_3_players"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Players to Qualify</label>
          <Input
            v-model.number="form.qualifiesPlayerCount"
            type="number"
            min="1"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Next Level Tournament *</label>
          <TournamentSelect
            v-model="form.nextLevelTournamentId"
            :filter-type="getNextLevelType()"
            placeholder="Search and select the next level tournament..."
            @tournament-selected="handleNextLevelTournamentSelected"
            @tournament-cleared="handleNextLevelTournamentCleared"
          />
          <p class="text-xs text-muted-foreground">
            Select the tournament that qualified players will advance to.
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <input
            id="progressionEnabled"
            v-model="form.progressionEnabled"
            type="checkbox"
            class="rounded border-gray-300"
          />
          <label for="progressionEnabled" class="text-sm font-medium">Enable Progression</label>
        </div>
      </div>
    </div>

    <!-- Allowed Communities -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold border-b pb-2">Allowed Communities</h3>
      
      <!-- Community Search and Add -->
      <div class="space-y-2">
        <label class="text-sm font-medium">Add Communities</label>
        <CommunitySelect 
          v-model="newCommunityId"
          placeholder="Search and add communities allowed to participate..."
          @community-selected="addAllowedCommunity"
        />
        <p class="text-xs text-muted-foreground">
          Select communities that are allowed to participate. Leave empty to allow all communities.
        </p>
      </div>

      <!-- Selected Communities List -->
      <div v-if="allowedCommunities.length > 0" class="space-y-2">
        <label class="text-sm font-medium">Selected Communities ({{ allowedCommunities.length }})</label>
        <div class="max-h-40 overflow-y-auto space-y-2">
          <div 
            v-for="community in allowedCommunities" 
            :key="community.id"
            class="flex justify-between items-center p-2 bg-accent/30 rounded border"
          >
            <div class="flex-1">
              <div class="font-medium text-sm">{{ community.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ community.location }}, {{ community.county }}
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              @click="removeAllowedCommunity(community.id)"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Fallback textarea for manual entry -->
      <details class="mt-4">
        <summary class="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          Advanced: Manual Community ID Entry
        </summary>
        <div class="mt-2 space-y-2">
          <label class="text-sm font-medium">Community IDs (one per line)</label>
          <Textarea
            v-model="allowedCommunitiesText"
            placeholder="COMM_KIAMBU_JUJA_005&#10;COMM_KIAMBU_THIKA_003"
            rows="4"
          />
          <p class="text-xs text-muted-foreground">
            Direct entry for community IDs. This will override the selected communities above.
          </p>
        </div>
      </details>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-2 pt-6 border-t">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        Cancel
      </Button>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Saving...' : (tournament ? 'Update Tournament' : 'Create Tournament') }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { Tournament, CreateTournamentData } from '@/types/tournament'
import type { Community } from '@/types/community'
import { useCommunities } from '@/composables/useCommunities'
import { safeToDate } from '@/utils/dateUtils'
import Input from '@/components/ui/input.vue'
import Textarea from '@/components/ui/textarea.vue'
import Button from '@/components/ui/button.vue'
import CountySelect from '@/components/ui/county-select.vue'
import CommunitySelect from '@/components/ui/community-select.vue'
import TournamentSelect from '@/components/ui/tournament-select.vue'

interface Props {
  tournament?: (Tournament & { id: string }) | null
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [data: CreateTournamentData]
  cancel: []
}>()

// Form data
const form = ref<CreateTournamentData>({
  name: '',
  description: '',
  type: 'community',
  hierarchicalLevel: 'community',
  competitionLevel: '',
  
  // Dates - initialize with properly formatted date strings for datetime-local inputs
  startDate: new Date(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
  registrationStartDate: new Date(),
  registrationEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
  estimatedDuration: '',
  
  // Location
  location: '',
  venue: '',
  geographicalScope: {
    communityId: '',
    communityName: '',
    countyId: '',
    countyName: '',
    regionId: '',
    regionName: ''
  },
  
  // Participation
  maxPlayers: 16,
  expectedParticipants: 16,
  allowedCommunityIds: [],
  
  // Registration
  registrationCriteria: 'open_registration',
  qualificationRequirement: 'open_registration',
  
  // Qualification
  isQualificationTournament: false,
  progressionEnabled: false,
  
  // Financial
  entryFee: 0,
  currency: 'KES',
  prizePool: 0,
  
  // Features
  isFeatured: false,
  isNationalTournament: false
})

// Additional form helpers
const allowedCommunitiesText = ref('')
const newCommunityId = ref('')
const selectedCommunityData = ref<(Community & { id: string }) | null>(null)
const allowedCommunities = ref<(Community & { id: string })[]>([])

// Communities composable
const { communities, getUniqueRegions, subscribe: subscribeCommunities } = useCommunities()

// Available regions from communities data
const availableRegions = computed(() => {
  const regions = [
    'Central Region',
    'Coast Region', 
    'Eastern Region',
    'North Eastern Region',
    'Nyanza Region',
    'Rift Valley Region',
    'Western Region'
  ]
  return regions
})

// Computed properties for datetime-local input handling
const startDateInput = computed({
  get: () => formatDateForInput(form.value.startDate),
  set: (value: string) => {
    form.value.startDate = new Date(value)
  }
})

const endDateInput = computed({
  get: () => formatDateForInput(form.value.endDate),
  set: (value: string) => {
    form.value.endDate = new Date(value)
  }
})

const registrationStartDateInput = computed({
  get: () => formatDateForInput(form.value.registrationStartDate),
  set: (value: string) => {
    form.value.registrationStartDate = new Date(value)
  }
})

const registrationEndDateInput = computed({
  get: () => formatDateForInput(form.value.registrationEndDate),
  set: (value: string) => {
    form.value.registrationEndDate = new Date(value)
  }
})

// Watch for allowed communities text changes
watch(allowedCommunitiesText, (newValue) => {
  form.value.allowedCommunityIds = newValue
    .split('\n')
    .map(id => id.trim())
    .filter(id => id.length > 0)
})

// Initialize form with existing tournament data
onMounted(() => {
  // Subscribe to communities data
  subscribeCommunities()
  
  if (props.tournament) {
    // Populate form with existing tournament data
    Object.assign(form.value, {
      name: props.tournament.name,
      description: props.tournament.description,
      type: props.tournament.type,
      hierarchicalLevel: props.tournament.hierarchicalLevel,
      competitionLevel: props.tournament.competitionLevel,
      
      // Convert dates to Date objects first, then to input format
      startDate: safeToDate(props.tournament.startDate) || new Date(),
      endDate: safeToDate(props.tournament.endDate) || new Date(),
      registrationStartDate: safeToDate(props.tournament.registrationStartDate) || new Date(),
      registrationEndDate: safeToDate(props.tournament.registrationEndDate) || new Date(),
      estimatedDuration: props.tournament.estimatedDuration,
      
      // Location
      location: props.tournament.location,
      venue: props.tournament.venue,
      geographicalScope: { ...props.tournament.geographicalScope },
      
      // Participation
      maxPlayers: props.tournament.maxPlayers,
      expectedParticipants: props.tournament.expectedParticipants,
      allowedCommunityIds: [...props.tournament.allowedCommunityIds],
      
      // Registration
      registrationCriteria: props.tournament.registrationCriteria,
      qualificationRequirement: props.tournament.qualificationRequirement,
      
      // Qualification
      isQualificationTournament: props.tournament.isQualificationTournament,
      progressionEnabled: props.tournament.progressionEnabled,
      qualificationCriteria: props.tournament.qualificationCriteria,
      qualifiesPlayerCount: props.tournament.qualifiesPlayerCount,
      
      // Financial
      entryFee: props.tournament.entryFee,
      currency: props.tournament.currency,
      prizePool: props.tournament.prizePool,
      
      // Additional
      bannerImage: props.tournament.bannerImage,
      tournamentSeries: props.tournament.tournamentSeries
    })
    
    // Set allowed communities text
    allowedCommunitiesText.value = props.tournament.allowedCommunityIds.join('\n')
    
    // Load allowed communities from their IDs
    loadAllowedCommunities(props.tournament.allowedCommunityIds)
  }
})

// Helper function to load allowed communities from IDs
const loadAllowedCommunities = async (communityIds: string[]) => {
  if (!communityIds.length || !communities.value) return
  
  // Wait for communities to load if not already loaded
  let attempts = 0
  while (!communities.value && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  if (communities.value) {
    allowedCommunities.value = communities.value.filter(c => 
      communityIds.includes(c.id)
    )
  }
}

// Event handlers
const handleCommunitySelected = (community: Community & { id: string }) => {
  selectedCommunityData.value = community
  form.value.geographicalScope.communityName = community.name
  
  // Auto-populate county if not already set
  if (!form.value.geographicalScope.countyName) {
    form.value.geographicalScope.countyName = community.county
  }
}

const handleCommunityCleared = () => {
  selectedCommunityData.value = null
  form.value.geographicalScope.communityName = ''
}

const handleCountyChange = (county: string) => {
  // Auto-generate county ID
  if (county) {
    const countyId = `COUNTY_${county.toUpperCase().replace(/[^A-Z]/g, '_')}`
    form.value.geographicalScope.countyId = countyId
  } else {
    form.value.geographicalScope.countyId = ''
  }
}

const handleRegionChange = () => {
  // Auto-generate region ID
  if (form.value.geographicalScope.regionName) {
    const regionId = `REGION_${form.value.geographicalScope.regionName.toUpperCase().replace(/[^A-Z]/g, '_')}`
    form.value.geographicalScope.regionId = regionId
  } else {
    form.value.geographicalScope.regionId = ''
  }
}

const handleNextLevelTournamentSelected = (tournament: Tournament & { id: string }) => {
  // Auto-populate next level tournament data if needed
}

const handleNextLevelTournamentCleared = () => {
  // Clear next level tournament data if needed
}

const addAllowedCommunity = (community: Community & { id: string }) => {
  if (!allowedCommunities.value.find(c => c.id === community.id)) {
    allowedCommunities.value.push(community)
    updateAllowedCommunitiesForm()
  }
  newCommunityId.value = ''
}

const removeAllowedCommunity = (communityId: string) => {
  allowedCommunities.value = allowedCommunities.value.filter(c => c.id !== communityId)
  updateAllowedCommunitiesForm()
}

const updateAllowedCommunitiesForm = () => {
  form.value.allowedCommunityIds = allowedCommunities.value.map(c => c.id)
  // Also update text representation
  allowedCommunitiesText.value = allowedCommunities.value.map(c => c.id).join('\n')
}

const getNextLevelType = () => {
  const typeHierarchy = {
    'community': 'county',
    'county': 'regional', 
    'regional': 'national',
    'national': 'national'
  }
  return typeHierarchy[form.value.type as keyof typeof typeHierarchy] || 'county'
}

// Watch for county name changes to auto-generate county ID
watch(() => form.value.geographicalScope.countyName, handleCountyChange)

// Watch for region name changes to auto-generate region ID  
watch(() => form.value.geographicalScope.regionName, handleRegionChange)

// Utility functions
const formatDateForInput = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 16) // Default to current time in YYYY-MM-DDTHH:MM format
  }
  return date.toISOString().slice(0, 16) // Convert to YYYY-MM-DDTHH:MM format for datetime-local
}

const handleSubmit = () => {
  try {
    // Basic validation
    if (!form.value.name.trim()) {
      throw new Error('Tournament name is required')
    }
    
    if (!form.value.description.trim()) {
      throw new Error('Tournament description is required')
    }
    
    if (!form.value.location.trim()) {
      throw new Error('Tournament location is required')
    }
    
    if (!form.value.venue.trim()) {
      throw new Error('Tournament venue is required')
    }
    
    if (form.value.maxPlayers < 1) {
      throw new Error('Maximum players must be at least 1')
    }
    
    if (form.value.expectedParticipants < 1) {
      throw new Error('Expected participants must be at least 1')
    }
    
    // Date validation
    const now = new Date()
    if (form.value.startDate < now) {
      throw new Error('Start date cannot be in the past')
    }
    
    if (form.value.endDate <= form.value.startDate) {
      throw new Error('End date must be after start date')
    }
    
    if (form.value.registrationEndDate >= form.value.startDate) {
      throw new Error('Registration must end before tournament starts')
    }
    
    // Log form data for debugging
    console.log('Form submission data:', form.value)
    
    // Emit the form data
    emit('submit', form.value)
    
  } catch (error: any) {
    console.error('Form validation error:', error.message)
    // You can add a toast notification here if available
    alert(error.message)
  }
}
</script>