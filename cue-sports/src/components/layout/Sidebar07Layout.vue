<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarContent>
        <!-- Header with Logo -->
        <div :class="cn('flex items-center gap-2 px-2 py-4', isCollapsed ? 'justify-center' : 'justify-start')">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap class="h-4 w-4" />
          </div>
          <span v-if="!isCollapsed" class="font-semibold">Cue Sports</span>
        </div>

        <!-- Navigation Groups -->
        <SidebarGroup>
          <SidebarGroupLabel v-if="!isCollapsed">Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in mainNavItems" :key="item.title">
              <SidebarMenuButton :href="item.url">
                <component :is="item.icon" class="h-4 w-4" />
                <span v-if="!isCollapsed">{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel v-if="!isCollapsed">Management</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in managementItems" :key="item.title">
              <SidebarMenuButton :href="item.url">
                <component :is="item.icon" class="h-4 w-4" />
                <span v-if="!isCollapsed">{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel v-if="!isCollapsed">Analytics</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in analyticsItems" :key="item.title">
              <SidebarMenuButton :href="item.url">
                <component :is="item.icon" class="h-4 w-4" />
                <span v-if="!isCollapsed">{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel v-if="!isCollapsed">Automation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in automationItems" :key="item.title">
              <SidebarMenuButton :href="item.url">
                <component :is="item.icon" class="h-4 w-4" />
                <span v-if="!isCollapsed">{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <!-- User Section at Bottom -->
        <div class="mt-auto">
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton href="/profile">
                  <User class="h-4 w-4" />
                  <span v-if="!isCollapsed">Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/settings">
                  <Settings class="h-4 w-4" />
                  <span v-if="!isCollapsed">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <button 
                  @click="handleLogout"
                  :class="cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isCollapsed ? 'justify-center px-2' : 'justify-start px-3'
                  )"
                >
                  <LogOut class="h-4 w-4" />
                  <span v-if="!isCollapsed">Logout</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col">
      <!-- Top Header -->
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <div class="flex flex-1 items-center justify-between">
          <div class="flex items-center gap-2">
            <h1 class="text-lg font-semibold">{{ pageTitle }}</h1>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell class="h-4 w-4" />
            </Button>
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User class="h-4 w-4" />
              </div>
              <span class="text-sm font-medium">{{ userName }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </div>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Home, 
  Trophy, 
  Users, 
  Calendar,
  Package,
  DollarSign,
  BarChart3,
  FileText,
  User,
  Settings,
  LogOut,
  Bell,
  Zap,
  Building,
  Radio,
  Bot,
  Activity,
  Plus
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import Button from '@/components/ui/button.vue'
import { cn } from '@/lib/utils'
import SidebarProvider from '@/components/ui/sidebar/SidebarProvider.vue'
import Sidebar from '@/components/ui/sidebar/Sidebar.vue'
import SidebarContent from '@/components/ui/sidebar/SidebarContent.vue'
import SidebarGroup from '@/components/ui/sidebar/SidebarGroup.vue'
import SidebarGroupLabel from '@/components/ui/sidebar/SidebarGroupLabel.vue'
import SidebarMenu from '@/components/ui/sidebar/SidebarMenu.vue'
import SidebarMenuItem from '@/components/ui/sidebar/SidebarMenuItem.vue'
import SidebarMenuButton from '@/components/ui/sidebar/SidebarMenuButton.vue'
import SidebarTrigger from '@/components/ui/sidebar/SidebarTrigger.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebar = inject('sidebar', null) as any
const isCollapsed = computed(() => sidebar?.isCollapsed?.value || false)

const userName = computed(() => {
  return authStore.user?.displayName || authStore.user?.email?.split('@')[0] || 'User'
})

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/tournaments': 'Tournaments',
    '/tournament-registrations': 'Tournament Registrations',
    '/players': 'Players',
    '/matches': 'Matches',
    '/matches/create': 'Create Match',
    '/live-matches': 'Live Matches',
    '/products': 'Products',
    '/orders': 'Orders',
    '/finance': 'Finance',
    '/analytics': 'Analytics',
    '/reports': 'Reports',
    '/automation': 'Automation',
    '/automation/monitor': 'Automation Monitor',
    '/communities': 'Communities',
    '/users': 'Users',
    '/profile': 'Profile',
    '/settings': 'Settings'
  }
  
  // Handle dynamic routes
  if (route.path.startsWith('/tournaments/') && route.path !== '/tournaments') {
    return 'Tournament Details'
  }
  if (route.path.startsWith('/communities/') && route.path !== '/communities') {
    return 'Community Details'
  }
  if (route.path.startsWith('/players/') && route.path !== '/players') {
    return 'Player Details'
  }
  if (route.path.startsWith('/matches/') && route.path.includes('/live')) {
    return 'Live Match'
  }
  if (route.path.startsWith('/matches/') && route.path !== '/matches' && route.path !== '/matches/create') {
    return 'Match Details'
  }
  
  return titles[route.path] || 'Dashboard'
})

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Tournaments', url: '/tournaments', icon: Trophy },
  { title: 'Registrations', url: '/tournament-registrations', icon: Users },
  { title: 'Matches', url: '/matches', icon: Calendar },
  { title: 'Create Match', url: '/matches/create', icon: Plus },
  { title: 'Live Matches', url: '/live-matches', icon: Radio }
]

const managementItems = [
  { title: 'Players', url: '/players', icon: Users },
  { title: 'Communities', url: '/communities', icon: Building },
  { title: 'Users', url: '/users', icon: Users },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Orders', url: '/orders', icon: Package }
]

const analyticsItems = [
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Reports', url: '/reports', icon: FileText },
  { title: 'Finance', url: '/finance', icon: DollarSign }
]

const automationItems = [
  { title: 'Automation', url: '/automation', icon: Bot },
  { title: 'Monitor', url: '/automation/monitor', icon: Activity }
]

const handleLogout = async () => {
  try {
    await authStore.logout()
    // Use router.replace to avoid back button issues
    router.replace('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
    // Even if logout fails, redirect to login for security
    router.replace('/auth/login')
  }
}
</script>