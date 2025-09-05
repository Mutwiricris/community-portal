<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center justify-between">
        <div class="flex items-center">
          <Play class="mr-2 h-5 w-5" />
          Live Matches
        </div>
        <Badge variant="secondary" class="animate-pulse">
          {{ liveMatches.length }} Live
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <div 
          v-for="match in liveMatches" 
          :key="match.id"
          class="border rounded-lg p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">{{ match.tournament }}</div>
            <Badge variant="outline" class="text-xs">
              Table {{ match.table }}
            </Badge>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="font-medium">{{ match.player1.name }}</div>
              <div class="text-lg font-bold">{{ match.player1.score }}</div>
            </div>
            <div class="text-xs text-muted-foreground">VS</div>
            <div class="flex items-center space-x-2">
              <div class="text-lg font-bold">{{ match.player2.score }}</div>
              <div class="font-medium">{{ match.player2.name }}</div>
            </div>
          </div>
          
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>Frame {{ match.currentFrame }} of {{ match.totalFrames }}</span>
            <span class="flex items-center">
              <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
              {{ match.duration }}
            </span>
          </div>
        </div>
        
        <div v-if="liveMatches.length === 0" class="text-center py-8">
          <Play class="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p class="text-sm text-muted-foreground">No live matches</p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          class="w-full"
          @click="$router.push('/matches')"
        >
          View All Matches
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Play } from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import { useRouter } from 'vue-router'

interface Match {
  id: string
  tournament: string
  table: number
  player1: {
    name: string
    score: number
  }
  player2: {
    name: string
    score: number
  }
  currentFrame: number
  totalFrames: number
  duration: string
}

const router = useRouter()

const liveMatches = ref<Match[]>([
  {
    id: '1',
    tournament: 'Spring Championship',
    table: 1,
    player1: { name: 'John Smith', score: 3 },
    player2: { name: 'Mike Johnson', score: 2 },
    currentFrame: 6,
    totalFrames: 9,
    duration: '45m'
  },
  {
    id: '2', 
    tournament: 'Amateur League',
    table: 3,
    player1: { name: 'Sarah Wilson', score: 1 },
    player2: { name: 'Tom Brown', score: 4 },
    currentFrame: 5,
    totalFrames: 7,
    duration: '32m'
  }
])

onMounted(() => {
  // In a real app, fetch live matches from Firestore
  loadLiveMatches()
})

const loadLiveMatches = async () => {
  // Mock data for now
}
</script>