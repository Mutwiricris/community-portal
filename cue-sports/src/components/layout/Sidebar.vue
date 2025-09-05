<template>
  <aside 
    :class="cn(
      'fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between h-16 px-4 border-b">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span class="text-primary-foreground font-bold text-sm">PP</span>
          </div>
          <span class="font-semibold text-lg">PoolPal</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          @click="$emit('toggle')"
          class="lg:hidden"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <!-- Main Dashboard -->
        <NavItem 
          to="/dashboard" 
          :icon="LayoutDashboard"
          label="Dashboard"
        />
        
        <!-- Tournament Management Section -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Tournament Management
          </div>
          <NavItem 
            to="/tournaments" 
            :icon="Trophy"
            label="Tournaments"
          />
          <NavItem 
            to="/matches" 
            :icon="Gamepad2"
            label="Matches"
          />
          <NavItem 
            to="/automation" 
            :icon="Bot"
            label="Automation"
          />
          <NavItem 
            to="/tournament-registrations" 
            :icon="Users2"
            label="Registrations"
          />
        </div>
        
        <!-- Participants Section -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Participants
          </div>
          <NavItem 
            to="/players" 
            :icon="Users"
            label="Players"
          />
          <NavItem 
            to="/communities" 
            :icon="Building"
            label="Communities"
          />
        </div>
        
        <!-- Analytics & Reports -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Analytics
          </div>
          <NavItem 
            to="/analytics" 
            :icon="BarChart3"
            label="Analytics"
          />
          <NavItem 
            to="/reports" 
            :icon="FileText"
            label="Reports"
          />
        </div>
        
        <!-- Business Section -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Business
          </div>
          <NavItem 
            to="/products" 
            :icon="Package"
            label="Products"
          />
          <NavItem 
            to="/orders" 
            :icon="ShoppingCart"
            label="Orders"
          />
          <NavItem 
            to="/finance" 
            :icon="DollarSign"
            label="Finance"
          />
        </div>
        
        <!-- Personal -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Personal
          </div>
          <NavItem 
            to="/todos" 
            :icon="CheckSquare"
            label="Todos"
          />
        </div>
        
        <!-- Administration -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
            Administration
          </div>
          <NavItem 
            to="/users" 
            :icon="UserCog"
            label="Users"
          />
          <NavItem 
            to="/settings" 
            :icon="Settings"
            label="Settings"
          />
        </div>
      </nav>

      <!-- User Section -->
      <div class="p-4 border-t">
        <div class="flex items-center space-x-3 mb-3">
          <div class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <User class="h-4 w-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ authStore.userProfile?.displayName || authStore.user?.email }}
            </p>
            <p class="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          @click="handleLogout"
          class="w-full"
        >
          <LogOut class="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  </aside>

  <!-- Overlay for mobile -->
  <div 
    v-if="isOpen" 
    @click="$emit('toggle')"
    class="fixed inset-0 z-40 bg-black/50 lg:hidden"
  />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  User, 
  LogOut,
  X,
  UserCog,
  Gamepad2,
  Bot,
  Building,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  Target,
  Users2,
  CheckSquare
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/button.vue'
import NavItem from './NavItem.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

defineEmits<{
  toggle: []
}>()

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>