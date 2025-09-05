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
        v-if="showDropdown && filteredCommunities.length > 0"
        class="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto"
      >
        <div
          v-for="community in filteredCommunities"
          :key="community.id"
          @click="selectCommunity(community)"
          class="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
        >
          <div class="font-medium">{{ community.name }}</div>
          <div class="text-muted-foreground text-xs">
            {{ community.location }}, {{ community.county }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selected Community Display -->
    <div v-if="selectedCommunity" class="p-3 bg-accent/50 rounded-md border">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-medium">{{ selectedCommunity.name }}</div>
          <div class="text-sm text-muted-foreground">
            ID: {{ selectedCommunity.id }}
          </div>
          <div class="text-sm text-muted-foreground">
            {{ selectedCommunity.location }}, {{ selectedCommunity.county }}
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
import type { Community } from '@/types/community'
import { useCommunities } from '@/composables/useCommunities'
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'

interface Props {
  modelValue: string
  placeholder?: string
  county?: string
}

interface Emits {
  'update:modelValue': [value: string]
  'community-selected': [community: Community & { id: string }]
  'community-cleared': []
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search and select a community...'
})

const emit = defineEmits<Emits>()

const { communities, loading, subscribe, searchCommunities } = useCommunities()

const searchQuery = ref('')
const showDropdown = ref(false)
const selectedCommunity = ref<(Community & { id: string }) | null>(null)

// Subscribe to communities on mount
onMounted(() => {
  subscribe()
})

// Filter communities based on search and county
const filteredCommunities = computed(() => {
  if (!searchQuery.value) return []
  
  let filtered = searchCommunities(searchQuery.value)
  
  // Filter by county if provided
  if (props.county) {
    filtered = filtered.filter(community => 
      community.county.toLowerCase() === props.county?.toLowerCase()
    )
  }
  
  return filtered.slice(0, 10) // Limit to 10 results
})

// Watch for changes in modelValue to find and set selected community
watch(() => props.modelValue, (newValue) => {
  if (newValue && communities.value) {
    const community = communities.value.find(c => c.id === newValue)
    if (community) {
      selectedCommunity.value = community
      searchQuery.value = community.name
      showDropdown.value = false
    }
  } else {
    selectedCommunity.value = null
    searchQuery.value = ''
  }
}, { immediate: true })

// Hide dropdown when clicking outside
const handleSearch = () => {
  showDropdown.value = true
}

const selectCommunity = (community: Community & { id: string }) => {
  selectedCommunity.value = community
  searchQuery.value = community.name
  showDropdown.value = false
  
  emit('update:modelValue', community.id)
  emit('community-selected', community)
}

const clearSelection = () => {
  selectedCommunity.value = null
  searchQuery.value = ''
  showDropdown.value = false
  
  emit('update:modelValue', '')
  emit('community-cleared')
}

// Hide dropdown when input loses focus
const handleBlur = () => {
  // Use setTimeout to allow click events to fire first
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}
</script>