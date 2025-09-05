<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card 
      v-for="action in actions" 
      :key="action.title"
      class="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]" 
      @click="handleAction(action)"
    >
      <CardContent class="flex items-center p-6">
        <div :class="['p-2 rounded-lg mr-4', action.bgColor]">
          <component :is="action.icon" :class="['h-6 w-6', action.iconColor]" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-sm lg:text-base">{{ action.title }}</h3>
          <p class="text-xs lg:text-sm text-muted-foreground mt-1">
            {{ action.description }}
          </p>
        </div>
        <ChevronRight class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { 
  Trophy, 
  Users, 
  Package, 
  DollarSign, 
  Calendar,
  BarChart3,
  Settings,
  FileText,
  ChevronRight
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardContent from '@/components/ui/card-content.vue'
import { useRouter } from 'vue-router'

interface QuickAction {
  title: string
  description: string
  icon: any
  route: string
  bgColor: string
  iconColor: string
}

const router = useRouter()

const actions: QuickAction[] = [
  {
    title: 'Tournaments',
    description: 'Create and manage tournaments',
    icon: Trophy,
    route: '/tournaments',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    title: 'Players',
    description: 'Manage player profiles',
    icon: Users,
    route: '/players',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    title: 'Products',
    description: 'Inventory and sales',
    icon: Package,
    route: '/products',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    title: 'Finance',
    description: 'Revenue and reports',
    icon: DollarSign,
    route: '/finance',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    title: 'Schedule',
    description: 'Upcoming events',
    icon: Calendar,
    route: '/schedule',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  {
    title: 'Analytics',
    description: 'Performance insights',
    icon: BarChart3,
    route: '/analytics',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    title: 'Reports',
    description: 'Generate reports',
    icon: FileText,
    route: '/reports',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  {
    title: 'Settings',
    description: 'System configuration',
    icon: Settings,
    route: '/settings',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    iconColor: 'text-gray-600 dark:text-gray-400'
  }
]

const handleAction = (action: QuickAction) => {
  router.push(action.route)
}
</script>