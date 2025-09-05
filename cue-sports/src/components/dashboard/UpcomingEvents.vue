<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center">
        <Calendar class="mr-2 h-5 w-5" />
        Upcoming Events
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div 
          v-for="event in upcomingEvents" 
          :key="event.id"
          class="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div :class="['w-2 h-2 rounded-full', event.color]"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ event.title }}</p>
            <p class="text-xs text-muted-foreground">{{ event.location }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-medium">{{ event.date }}</p>
            <p class="text-xs text-muted-foreground">{{ event.time }}</p>
          </div>
        </div>
        
        <div v-if="upcomingEvents.length === 0" class="text-center py-8">
          <Calendar class="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p class="text-sm text-muted-foreground">No upcoming events</p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full"
          @click="$router.push('/schedule')"
        >
          View All Events
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Calendar } from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import { useRouter } from 'vue-router'

interface Event {
  id: string
  title: string
  location: string
  date: string
  time: string
  color: string
}

const router = useRouter()

const upcomingEvents = ref<Event[]>([
  {
    id: '1',
    title: 'Spring Championship',
    location: 'Main Hall',
    date: 'Mar 15',
    time: '10:00 AM',
    color: 'bg-blue-500'
  },
  {
    id: '2',
    title: 'Amateur League',
    location: 'Table 1-4',
    date: 'Mar 18',
    time: '2:00 PM',
    color: 'bg-green-500'
  },
  {
    id: '3',
    title: 'Pro Tournament',
    location: 'Championship Arena',
    date: 'Mar 22',
    time: '6:00 PM',
    color: 'bg-purple-500'
  }
])

onMounted(() => {
  // In a real app, fetch events from Firestore
  loadEvents()
})

const loadEvents = async () => {
  // Mock data for now
}
</script>