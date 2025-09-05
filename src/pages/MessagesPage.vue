<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Messages</h1>
          <p class="text-gray-600 mt-1">Community communications and announcements</p>
        </div>
        <Button @click="showComposeDialog = true" class="flex items-center gap-2">
          <MessageSquarePlus class="h-4 w-4" />
          New Message
        </Button>
      </div>

      <!-- Message Categories -->
      <div class="flex space-x-4">
        <Button 
          v-for="category in categories"
          :key="category.id"
          :variant="activeCategory === category.id ? 'default' : 'outline'"
          @click="activeCategory = category.id"
          class="flex items-center gap-2"
        >
          <component :is="category.icon" class="h-4 w-4" />
          {{ category.name }}
          <Badge v-if="category.unread > 0" variant="destructive" class="ml-1 text-xs">
            {{ category.unread }}
          </Badge>
        </Button>
      </div>

      <!-- Messages List -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Messages Sidebar -->
        <div class="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{{ getCurrentCategoryName() }}</CardTitle>
            </CardHeader>
            <CardContent class="p-0">
              <div class="space-y-1">
                <div 
                  v-for="message in filteredMessages" 
                  :key="message.id"
                  @click="selectedMessage = message"
                  class="p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4"
                  :class="{
                    'border-blue-500 bg-blue-50': selectedMessage?.id === message.id,
                    'border-transparent': selectedMessage?.id !== message.id,
                    'font-semibold': !message.read
                  }"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">
                        {{ message.sender }}
                      </p>
                      <p class="text-sm text-gray-600 truncate">
                        {{ message.subject }}
                      </p>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ formatDate(message.date) }}
                      </p>
                    </div>
                    <div class="flex items-center space-x-1">
                      <div v-if="!message.read" class="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <Star v-if="message.starred" class="h-4 w-4 text-yellow-500 fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Message Content -->
        <div class="lg:col-span-2">
          <Card v-if="selectedMessage" class="h-full">
            <CardHeader class="border-b">
              <div class="flex items-start justify-between">
                <div>
                  <CardTitle>{{ selectedMessage.subject }}</CardTitle>
                  <p class="text-sm text-gray-600 mt-1">
                    From: {{ selectedMessage.sender }} • {{ formatDateTime(selectedMessage.date) }}
                  </p>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Star class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Reply class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent class="p-6">
              <div class="prose max-w-none">
                <p class="whitespace-pre-wrap">{{ selectedMessage.content }}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card v-else class="h-full">
            <CardContent class="flex items-center justify-center h-64">
              <div class="text-center">
                <MessageSquare class="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-600 mb-2">No message selected</h3>
                <p class="text-gray-500">Choose a message from the list to view its content</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- Compose Message Dialog -->
    <div v-if="showComposeDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Compose Message</h2>
        <p class="text-gray-600 mb-4">Message composition form will be implemented here</p>
        <div class="flex space-x-2">
          <Button @click="showComposeDialog = false" variant="outline">Cancel</Button>
          <Button @click="showComposeDialog = false">Send</Button>
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
  MessageSquare,
  MessageSquarePlus,
  Megaphone,
  Users,
  Lock,
  Star,
  Reply,
  Trash2
} from 'lucide-vue-next'

const showComposeDialog = ref(false)
const activeCategory = ref('announcements')
const selectedMessage = ref<any>(null)

const categories = [
  { id: 'announcements', name: 'Announcements', icon: Megaphone, unread: 2 },
  { id: 'community', name: 'Community', icon: Users, unread: 5 },
  { id: 'private', name: 'Private', icon: Lock, unread: 1 }
]

// Mock messages data
const messages = ref([
  {
    id: 1,
    category: 'announcements',
    sender: 'Community Admin',
    subject: 'New Tournament Registration Open',
    content: 'We are excited to announce that registration for the Spring Championship 2024 is now open! This tournament will feature multiple categories and skill levels.\n\nRegistration deadline: April 1st, 2024\nTournament dates: April 15-17, 2024\nLocation: Community Sports Center\n\nPrizes include trophies, cash awards, and equipment sponsorships. Don\'t miss this opportunity to showcase your skills!',
    date: new Date('2024-03-15T10:00:00'),
    read: false,
    starred: true
  },
  {
    id: 2,
    category: 'announcements',
    sender: 'Event Coordinator',
    subject: 'Monthly Meetup - Schedule Change',
    content: 'Please note that our monthly community meetup has been rescheduled from April 10th to April 12th due to venue availability.\n\nNew details:\nDate: April 12th, 2024\nTime: 6:00 PM\nLocation: Community Center (Main Hall)\n\nWe apologize for any inconvenience and look forward to seeing everyone there!',
    date: new Date('2024-03-12T14:30:00'),
    read: false,
    starred: false
  },
  {
    id: 3,
    category: 'community',
    sender: 'Sarah Johnson',
    subject: 'Looking for practice partner',
    content: 'Hi everyone! I\'m looking for a practice partner for 9-ball. I\'m intermediate level and available most weekday evenings.\n\nIf you\'re interested, please send me a message. I have access to tables at the downtown pool hall.',
    date: new Date('2024-03-14T16:45:00'),
    read: true,
    starred: false
  },
  {
    id: 4,
    category: 'community',
    sender: 'Mike Chen',
    subject: 'Equipment for sale',
    content: 'I\'m selling some of my cuesport equipment:\n\n- Professional cue stick (barely used) - $300\n- Tournament-grade balls set - $150\n- Portable cue case - $50\n\nAll items are in excellent condition. Contact me if interested!',
    date: new Date('2024-03-13T12:20:00'),
    read: true,
    starred: false
  },
  {
    id: 5,
    category: 'private',
    sender: 'Tournament Director',
    subject: 'Invitation to Judge Tournament',
    content: 'Dear Community Leader,\n\nWe would like to invite you to serve as a judge for the upcoming Spring Championship. Your experience and knowledge would be valuable to ensure fair play.\n\nPlease let us know if you\'re available by March 20th.',
    date: new Date('2024-03-11T09:15:00'),
    read: false,
    starred: true
  }
])

const filteredMessages = computed(() => 
  messages.value.filter(msg => msg.category === activeCategory.value)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
)

const getCurrentCategoryName = () => {
  const category = categories.find(c => c.id === activeCategory.value)
  return category?.name || 'Messages'
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const formatDateTime = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>