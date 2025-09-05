<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Community Forums</h1>
          <p class="text-gray-600 mt-1">Discuss, share, and connect with the community</p>
        </div>
        <Button @click="showCreateTopicDialog = true" class="flex items-center gap-2">
          <Plus class="h-4 w-4" />
          New Topic
        </Button>
      </div>

      <!-- Forum Categories -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          v-for="category in forumCategories" 
          :key="category.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="selectedCategory = category"
        >
          <CardContent class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div 
                  class="w-12 h-12 rounded-lg flex items-center justify-center"
                  :class="category.color"
                >
                  <component :is="category.icon" class="h-6 w-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">{{ category.name }}</h3>
                  <p class="text-sm text-gray-600">{{ category.description }}</p>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>{{ category.topics }} topics</span>
              <span>{{ category.posts }} posts</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent Topics -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>Recent Topics</CardTitle>
            <div class="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                :class="{ 'bg-blue-50': sortBy === 'recent' }"
                @click="sortBy = 'recent'"
              >
                Recent
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                :class="{ 'bg-blue-50': sortBy === 'popular' }"
                @click="sortBy = 'popular'"
              >
                Popular
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                :class="{ 'bg-blue-50': sortBy === 'unanswered' }"
                @click="sortBy = 'unanswered'"
              >
                Unanswered
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div 
              v-for="topic in sortedTopics" 
              :key="topic.id"
              class="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              @click="selectedTopic = topic"
            >
              <div class="flex items-start space-x-4 flex-1">
                <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User class="h-5 w-5 text-gray-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                    {{ topic.title }}
                  </h3>
                  <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                    {{ topic.content }}
                  </p>
                  <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>By {{ topic.author }}</span>
                    <span>{{ formatDate(topic.createdAt) }}</span>
                    <Badge :variant="getCategoryBadgeVariant(topic.category)" class="text-xs">
                      {{ topic.category }}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-6 text-sm text-gray-600 flex-shrink-0 ml-4">
                <div class="text-center">
                  <p class="font-medium text-gray-800">{{ topic.replies }}</p>
                  <p class="text-xs">replies</p>
                </div>
                <div class="text-center">
                  <p class="font-medium text-gray-800">{{ topic.views }}</p>
                  <p class="text-xs">views</p>
                </div>
                <div class="text-center">
                  <p class="font-medium text-gray-800">{{ topic.likes }}</p>
                  <p class="text-xs">likes</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-center mt-6">
            <div class="flex space-x-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" class="bg-blue-50">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">3</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Create Topic Dialog -->
    <div v-if="showCreateTopicDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 class="text-xl font-bold mb-4">Create New Topic</h2>
        <p class="text-gray-600 mb-4">Topic creation form will be implemented here</p>
        <div class="flex space-x-2">
          <Button @click="showCreateTopicDialog = false" variant="outline">Cancel</Button>
          <Button @click="showCreateTopicDialog = false">Create Topic</Button>
        </div>
      </div>
    </div>

    <!-- Topic View Dialog -->
    <div v-if="selectedTopic" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">{{ selectedTopic.title }}</h2>
            <p class="text-sm text-gray-600 mt-1">
              By {{ selectedTopic.author }} • {{ formatDateTime(selectedTopic.createdAt) }}
            </p>
          </div>
          <Button @click="selectedTopic = null" variant="ghost" size="sm">
            <X class="h-4 w-4" />
          </Button>
        </div>
        
        <div class="prose max-w-none mb-6">
          <p class="whitespace-pre-wrap">{{ selectedTopic.content }}</p>
        </div>
        
        <div class="border-t pt-4">
          <h3 class="font-semibold text-gray-800 mb-3">Replies ({{ selectedTopic.replies }})</h3>
          <p class="text-gray-500 text-center py-8">Replies will be implemented here</p>
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
  HelpCircle,
  Trophy,
  Wrench,
  Users,
  Plus,
  User,
  X
} from 'lucide-vue-next'

const showCreateTopicDialog = ref(false)
const selectedCategory = ref<any>(null)
const selectedTopic = ref<any>(null)
const sortBy = ref('recent')

const forumCategories = [
  {
    id: 1,
    name: 'General Discussion',
    description: 'General cuesport topics and conversations',
    icon: MessageSquare,
    color: 'bg-blue-100 text-blue-600',
    topics: 234,
    posts: 1847
  },
  {
    id: 2,
    name: 'Rules & Techniques',
    description: 'Rules clarification and playing techniques',
    icon: HelpCircle,
    color: 'bg-green-100 text-green-600',
    topics: 156,
    posts: 892
  },
  {
    id: 3,
    name: 'Tournaments & Events',
    description: 'Tournament discussions and event planning',
    icon: Trophy,
    color: 'bg-yellow-100 text-yellow-600',
    topics: 89,
    posts: 456
  },
  {
    id: 4,
    name: 'Equipment & Gear',
    description: 'Cues, tables, and equipment discussions',
    icon: Wrench,
    color: 'bg-purple-100 text-purple-600',
    topics: 178,
    posts: 734
  },
  {
    id: 5,
    name: 'Community Events',
    description: 'Local meetups and community activities',
    icon: Users,
    color: 'bg-pink-100 text-pink-600',
    topics: 67,
    posts: 289
  }
]

// Mock topics data
const topics = ref([
  {
    id: 1,
    title: 'Best cue tips for beginners?',
    content: 'I\'m new to pool and wondering what cue tips you\'d recommend for someone just starting out. I\'ve heard soft tips are better for beginners but wanted to get some opinions from more experienced players.',
    author: 'PoolNewbie',
    category: 'Equipment',
    createdAt: new Date('2024-03-15T14:30:00'),
    replies: 12,
    views: 156,
    likes: 8
  },
  {
    id: 2,
    title: 'Tournament results - March Championship',
    content: 'Great tournament this weekend! Congratulations to all participants. Final results are posted and photos will be uploaded soon.',
    author: 'TournamentDirector',
    category: 'Tournaments',
    createdAt: new Date('2024-03-14T18:45:00'),
    replies: 23,
    views: 298,
    likes: 15
  },
  {
    id: 3,
    title: 'Practice routine for improving 8-ball break?',
    content: 'Looking for advice on practice routines to improve my 8-ball break. What drills do you recommend?',
    author: 'BreakerMike',
    category: 'Techniques',
    createdAt: new Date('2024-03-13T09:20:00'),
    replies: 7,
    views: 89,
    likes: 4
  },
  {
    id: 4,
    title: 'Monthly meetup location change',
    content: 'Due to renovations at our usual venue, next month\'s meetup will be held at the Community Center. Same time, new location!',
    author: 'EventCoordinator',
    category: 'Events',
    createdAt: new Date('2024-03-12T16:15:00'),
    replies: 5,
    views: 67,
    likes: 3
  },
  {
    id: 5,
    title: 'Clarification on jump shot rules',
    content: 'Can someone clarify the official rules for jump shots in 9-ball? I\'ve seen different interpretations.',
    author: 'RulesGuru',
    category: 'Rules',
    createdAt: new Date('2024-03-11T11:30:00'),
    replies: 0,
    views: 34,
    likes: 1
  }
])

const sortedTopics = computed(() => {
  const sortedList = [...topics.value]
  
  switch (sortBy.value) {
    case 'recent':
      return sortedList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    case 'popular':
      return sortedList.sort((a, b) => (b.views + b.likes) - (a.views + a.likes))
    case 'unanswered':
      return sortedList.filter(t => t.replies === 0)
    default:
      return sortedList
  }
})

const formatDate = (date: Date) => {
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
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

const getCategoryBadgeVariant = (category: string) => {
  switch (category.toLowerCase()) {
    case 'equipment': return 'default'
    case 'tournaments': return 'secondary'
    case 'techniques': return 'outline'
    case 'events': return 'default'
    case 'rules': return 'secondary'
    default: return 'outline'
  }
}
</script>