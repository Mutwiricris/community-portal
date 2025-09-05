<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

import {
  Home,
  Users,
  Trophy,
  Calendar,
  MessageSquare,
  Settings2,
  BarChart3,
  UserCircle,
  Star,
  BookOpen,
  Zap,
} from 'lucide-vue-next'
import NavMain from '@/components/NavMain.vue'
import NavProjects from '@/components/NavProjects.vue'
import NavUser from '@/components/NavUser.vue'
import TeamSwitcher from '@/components/TeamSwitcher.vue'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const authStore = useAuthStore()

// Cuesport community data
const data = computed(() => ({
  user: {
    name: authStore.user?.displayName || 'Community Leader',
    email: authStore.user?.email || 'leader@cuesport.com',
    avatar: authStore.user?.photoURL || '/avatars/user.jpg',
  },
  teams: [
    {
      name: 'CueSport Community',
      logo: Zap,
      plan: 'Community Portal',
    },
  ],
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Home,
      isActive: true,
      items: [
        {
          title: 'Overview',
          url: '/dashboard',
        },
        {
          title: 'Analytics',
          url: '/dashboard/analytics',
        },
        {
          title: 'Reports',
          url: '/dashboard/reports',
        },
      ],
    },
    {
      title: 'Communities',
      url: '/communities',
      icon: Users,
      items: [
        {
          title: 'All Communities',
          url: '/communities',
        },
        {
          title: 'Create Community',
          url: '/communities/create',
        },
        {
          title: 'Join Requests',
          url: '/communities/requests',
        },
      ],
    },
    {
      title: 'Members',
      url: '/members',
      icon: UserCircle,
      items: [
        {
          title: 'All Members',
          url: '/members',
        },
        {
          title: 'Active Players',
          url: '/members/active',
        },
        {
          title: 'Invitations',
          url: '/members/invitations',
        },
      ],
    },
    {
      title: 'Tournaments',
      url: '/tournaments',
      icon: Trophy,
      items: [
        {
          title: 'Upcoming',
          url: '/tournaments/upcoming',
        },
        {
          title: 'Create Tournament',
          url: '/tournaments/create',
        },
        {
          title: 'Results',
          url: '/tournaments/results',
        },
      ],
    },
    {
      title: 'Events',
      url: '/events',
      icon: Calendar,
      items: [
        {
          title: 'Calendar',
          url: '/events',
        },
        {
          title: 'Create Event',
          url: '/events/create',
        },
        {
          title: 'Past Events',
          url: '/events/past',
        },
      ],
    },
    {
      title: 'Messages',
      url: '/messages',
      icon: MessageSquare,
      items: [
        {
          title: 'Announcements',
          url: '/messages/announcements',
        },
        {
          title: 'Community Chat',
          url: '/messages/chat',
        },
        {
          title: 'Private Messages',
          url: '/messages/private',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '/settings/general',
        },
        {
          title: 'Community',
          url: '/settings/community',
        },
        {
          title: 'Notifications',
          url: '/settings/notifications',
        },
        {
          title: 'Privacy',
          url: '/settings/privacy',
        },
      ],
    },
  ],
  projects: [
    {
      name: 'Statistics',
      url: '/stats',
      icon: BarChart3,
    },
    {
      name: 'Rankings',
      url: '/rankings',
      icon: Star,
    },
    {
      name: 'Forums',
      url: '/forums',
      icon: BookOpen,
    },
  ],
}))
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <TeamSwitcher :teams="data.teams" />
    </SidebarHeader>
    <SidebarContent>
      <NavMain :items="data.navMain" />
      <NavProjects :projects="data.projects" />
    </SidebarContent>
    <SidebarFooter>
      <NavUser :user="data.user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>