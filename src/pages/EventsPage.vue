<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Events</h1>
          <p class="text-gray-600 mt-1">Community events and gatherings</p>
        </div>
        <Button @click="showCreateDialog = true" class="flex items-center gap-2">
          <Plus class="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <!-- Event Calendar View Toggle -->
      <div class="flex items-center space-x-4">
        <Button 
          :variant="viewMode === 'calendar' ? 'default' : 'outline'"
          @click="viewMode = 'calendar'"
          class="flex items-center gap-2"
        >
          <Calendar class="h-4 w-4" />
          Calendar
        </Button>
        <Button 
          :variant="viewMode === 'list' ? 'default' : 'outline'"
          @click="viewMode = 'list'"
          class="flex items-center gap-2"
        >
          <List class="h-4 w-4" />
          List
        </Button>
      </div>

      <!-- Events List View -->
      <div v-if="viewMode === 'list'">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="events.length === 0" class="text-center py-12">
              <Calendar class="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">No events scheduled</h3>
              <p class="text-gray-500 mb-6">Create your first event to get started</p>
              <Button @click="showCreateDialog = true">
                <Plus class="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </div>
            
            <div v-else class="space-y-4">
              <div 
                v-for="event in sortedEvents" 
                :key="event.id"
                class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-center space-x-4">
                  <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar class="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-800">{{ event.title }}</h3>
                    <p class="text-sm text-gray-600">{{ event.description }}</p>
                    <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <Clock class="h-3 w-3" />
                        {{ formatDateTime(event.date) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <MapPin class="h-3 w-3" />
                        {{ event.location }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Users class="h-3 w-3" />
                        {{ event.attendees }} attending
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  <Badge :variant="getEventBadgeVariant(event.type)">
                    {{ event.type }}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Calendar View -->
      <div v-if="viewMode === 'calendar'">
        <Card>
          <CardHeader>
            <CardTitle>Event Calendar</CardTitle>
          </CardHeader>
          <CardContent class="text-center py-12">
            <Calendar class="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">Calendar View</h3>
            <p class="text-gray-500">Interactive calendar component will be implemented here</p>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Create Event Dialog (placeholder) -->
    <div v-if="showCreateDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Create Event</h2>
        <p class="text-gray-600 mb-4">Event creation form will be implemented here</p>
        <div class="flex space-x-2">
          <Button @click="showCreateDialog = false" variant="outline">Cancel</Button>
          <Button @click="showCreateDialog = false">Create</Button>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Plus, 
  List,
  Clock, 
  MapPin, 
  Users, 
  Eye, 
  Edit
} from 'lucide-vue-next'

const showCreateDialog = ref(false)
const viewMode = ref<'calendar' | 'list'>('list')

// Mock events data
const events = ref([
  {
    id: 1,
    title: 'Monthly Community Meetup',
    description: 'Regular gathering for all community members',
    date: new Date('2024-04-10T18:00:00'),
    location: 'Community Center',
    attendees: 45,
    type: 'Social'
  },
  {
    id: 2,
    title: 'Beginner Training Session',
    description: 'Learn the basics of cuesports',
    date: new Date('2024-04-15T14:00:00'),
    location: 'Training Hall',
    attendees: 12,
    type: 'Training'
  },
  {
    id: 3,
    title: 'Equipment Showcase',
    description: 'Latest cuesport equipment demonstration',
    date: new Date('2024-04-20T16:00:00'),
    location: 'Sports Store',
    attendees: 28,
    type: 'Educational'
  },
  {
    id: 4,
    title: 'Charity Tournament Fundraiser',
    description: 'Special tournament to raise funds for local charity',
    date: new Date('2024-04-25T10:00:00'),
    location: 'Main Arena',
    attendees: 67,
    type: 'Charity'
  }
])

const sortedEvents = computed(() => 
  events.value.sort((a, b) => a.date.getTime() - b.date.getTime())
)

const formatDateTime = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getEventBadgeVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'social': return 'default'
    case 'training': return 'secondary'
    case 'educational': return 'outline'
    case 'charity': return 'default'
    default: return 'outline'
  }
}
</script>