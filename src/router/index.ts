import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/pages/LandingPage.vue'),
      meta: { public: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/Dashboard.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/communities',
      name: 'communities',
      component: () => import('@/pages/CommunityManager.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/communities/:id',
      name: 'community-details',
      component: () => import('@/pages/CommunityDetails.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/communities/:id/select-members',
      name: 'select-members',
      component: () => import('@/pages/MemberSelection.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/members',
      name: 'members',
      component: () => import('@/pages/MemberManager.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/UserProfile.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/tournaments',
      name: 'tournaments',
      component: () => import('@/pages/TournamentsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('@/pages/EventsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('@/pages/MessagesPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/pages/StatsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/rankings',
      name: 'rankings',
      component: () => import('@/pages/RankingsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    {
      path: '/forums',
      name: 'forums',
      component: () => import('@/pages/ForumsPage.vue'),
      meta: { requiresAuth: true, requiresCommunityLeader: true }
    },
    // 404 catch-all route - must be last
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Initialize auth if not already done
  if (authStore.isLoading) {
    await authStore.initializeAuth()
  }
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresCommunityLeader = to.matched.some(record => record.meta.requiresCommunityLeader)
  const isPublic = to.matched.some(record => record.meta.public)
  
  // Handle authenticated users trying to access auth page
  if (requiresGuest && authStore.isAuthenticated) {
    next('/dashboard')
    return
  }
  
  // Handle unauthenticated users trying to access protected routes
  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // Handle non-community leaders trying to access leader-only routes
  if (requiresCommunityLeader && !authStore.isCommunityLeader) {
    next('/login')
    return
  }
  
  // Redirect authenticated users from root to dashboard
  if (to.path === '/' && authStore.isAuthenticated) {
    next('/dashboard')
    return
  }
  
  next()
})

export default router