<template>
  <div class="space-y-2">
    <div class="relative">
      <Input
        v-model="searchQuery"
        :placeholder="placeholder"
        @input="handleSearch"
        @focus="showDropdown = true"
        @blur="handleBlur"
        class="w-full"
      />
      <div 
        v-if="showDropdown && filteredTournaments.length > 0"
        class="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto"
      >
        <div
          v-for="tournament in filteredTournaments"
          :key="tournament.id"
          @click="selectTournament(tournament)"
          class="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-medium">{{ tournament.name }}</div>
              <div class="text-muted-foreground text-xs">
                {{ tournament.location }} • {{ formatType(tournament.type) }} • {{ formatStatus(tournament.status) }}
              </div>
            </div>
            <Badge :variant="getStatusVariant(tournament.status)" class="text-xs">
              {{ formatStatus(tournament.status) }}
            </Badge>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selected Tournament Display -->
    <div v-if="selectedTournament" class="p-3 bg-accent/50 rounded-md border">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">{{ selectedTournament.name }}</div>
          <div class="text-sm text-muted-foreground">
            ID: {{ selectedTournament.id }}
          </div>
          <div class="text-sm text-muted-foreground">
            {{ selectedTournament.location }} • {{ formatType(selectedTournament.type) }}
          </div>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          @click="clearSelection"
        >
          <X class="h-3 w-3" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { Tournament } from '@/types/tournament'
import { useTournaments } from '@/composables/useTournaments'
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'

interface Props {
  modelValue: string
  placeholder?: string
  filterType?: 'community' | 'county' | 'regional' | 'national'
  excludeStatuses?: string[]
}

interface Emits {
  'update:modelValue': [value: string]
  'tournament-selected': [tournament: Tournament & { id: string }]
  'tournament-cleared': []
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select a tournament...',
  excludeStatuses: () => ['cancelled', 'completed']
})

const emit = defineEmits<Emits>()

const { tournaments, loading, subscribe } = useTournaments()

const searchQuery = ref('')
const showDropdown = ref(false)
const selectedTournament = ref<(Tournament & { id: string }) | null>(null)

// Subscribe to tournaments on mount
onMounted(() => {
  subscribe()
})

// Filter tournaments based on search and criteria
const filteredTournaments = computed(() => {
  if (!searchQuery.value || !tournaments.value) return []
  
  const searchTerm = searchQuery.value.toLowerCase()
  let filtered = tournaments.value.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm) ||
    tournament.location.toLowerCase().includes(searchTerm) ||
    tournament.description.toLowerCase().includes(searchTerm)
  )
  
  // Filter by type if provided
  if (props.filterType) {
    filtered = filtered.filter(tournament => tournament.type === props.filterType)
  }
  
  // Exclude certain statuses
  if (props.excludeStatuses.length > 0) {
    filtered = filtered.filter(tournament => 
      !props.excludeStatuses.includes(tournament.status)
    )
  }
  
  return filtered.slice(0, 10) // Limit to 10 results
})

// Watch for changes in modelValue to find and set selected tournament
watch(() => props.modelValue, (newValue) => {
  if (newValue && tournaments.value) {
    const tournament = tournaments.value.find(t => t.id === newValue)
    if (tournament) {
      selectedTournament.value = tournament
      searchQuery.value = tournament.name
      showDropdown.value = false
    }
  } else {
    selectedTournament.value = null
    searchQuery.value = ''
  }
}, { immediate: true })

const handleSearch = () => {
  showDropdown.value = true
}

const selectTournament = (tournament: Tournament & { id: string }) => {
  selectedTournament.value = tournament
  searchQuery.value = tournament.name
  showDropdown.value = false
  
  emit('update:modelValue', tournament.id)
  emit('tournament-selected', tournament)
}

const clearSelection = () => {
  selectedTournament.value = null
  searchQuery.value = ''
  showDropdown.value = false
  
  emit('update:modelValue', '')
  emit('tournament-cleared')
}

// Utility functions
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

const getStatusVariant = (status: string) => {
  const variants = {
    'upcoming': 'secondary' as const,
    'registration_open': 'default' as const,
    'registration_closed': 'outline' as const,
    'ongoing': 'default' as const,
    'completed': 'secondary' as const,
    'cancelled': 'destructive' as const
  }
  return variants[status as keyof typeof variants] || 'secondary' as const
}

// Hide dropdown when input loses focus
const handleBlur = () => {
  // Use setTimeout to allow click events to fire first
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}
</script>