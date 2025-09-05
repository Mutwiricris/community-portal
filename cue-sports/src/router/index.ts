import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores'
import { useToast } from '@/composables/useToast'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        // Redirect based on auth state when available
        const authStore = useAuthStore()
        return authStore.isAuthenticated ? '/dashboard' : '/auth/login'
      }
    },
    {
      path: '/auth',
      redirect: '/auth/login'
    },
    {
      path: '/auth/login',
      name: 'Login',
      component: () => import(/* webpackChunkName: "auth" */ '@/views/auth/LoginView.vue'),
      meta: { requiresGuest: true, layout: 'auth' }
    },
    {
      path: '/auth/signup',
      name: 'Signup', 
      component: () => import(/* webpackChunkName: "auth" */ '@/views/auth/SignupView.vue'),
      meta: { requiresGuest: true, layout: 'auth' }
    },
    // Backwards compatibility redirects
    {
      path: '/login',
      redirect: '/auth/login'
    },
    {
      path: '/signup',
      redirect: '/auth/signup'
    },
    // Main app routes with Sidebar07Layout
    {
      path: '/',
      component: () => import(/* webpackChunkName: "layout" */ '@/components/layout/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import(/* webpackChunkName: "dashboard" */ '@/views/DashboardView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'tournaments',
          name: 'Tournaments',
          component: () => import(/* webpackChunkName: "tournaments" */ '@/views/TournamentsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'tournaments/:id',
          name: 'TournamentDetail',
          component: () => import(/* webpackChunkName: "tournaments" */ '@/views/TournamentDetailView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          props: true
        },
        {
          path: 'tournament-registrations',
          name: 'TournamentRegistrations',
          component: () => import(/* webpackChunkName: "tournaments" */ '@/views/TournamentRegistrationsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'players',
          name: 'Players',
          component: () => import(/* webpackChunkName: "players" */ '@/views/PlayersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'players/:id',
          name: 'PlayerDetail',
          component: () => import(/* webpackChunkName: "players" */ '@/views/PlayerDetailView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          props: true
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import(/* webpackChunkName: "products" */ '@/views/ProductsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import(/* webpackChunkName: "orders" */ '@/views/OrdersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'finance',
          name: 'Finance',
          component: () => import(/* webpackChunkName: "finance" */ '@/views/FinanceView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import(/* webpackChunkName: "users" */ '@/views/UsersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'communities',
          name: 'Communities',
          component: () => import(/* webpackChunkName: "communities" */ '@/views/CommunitiesView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'communities/:id',
          name: 'CommunityDetail',
          component: () => import(/* webpackChunkName: "communities" */ '@/views/CommunityDetailView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          props: true
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import(/* webpackChunkName: "profile" */ '@/views/ProfileView.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import(/* webpackChunkName: "settings" */ '@/views/SettingsView.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'matches',
          name: 'Matches',
          component: () => import(/* webpackChunkName: "matches" */ '@/views/MatchesView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'matches/:id',
          name: 'MatchDetail',
          component: () => import(/* webpackChunkName: "matches" */ '@/views/MatchDetailView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          props: true
        },
        {
          path: 'matches/create',
          name: 'CreateMatch',
          component: () => import(/* webpackChunkName: "matches" */ '@/views/CreateMatchView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'matches/:id/live',
          name: 'LiveMatch',
          component: () => import(/* webpackChunkName: "matches" */ '@/views/LiveMatchView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
          props: true
        },
        {
          path: 'live-matches',
          name: 'LiveMatches',
          component: () => import(/* webpackChunkName: "matches" */ '@/views/LiveMatchesView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'automation',
          name: 'Automation',
          component: () => import(/* webpackChunkName: "automation" */ '@/views/AutomationView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'automation/monitor',
          name: 'AutomationMonitor',
          component: () => import(/* webpackChunkName: "automation" */ '@/views/AutomationMonitorView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'automation/algorithm',
          name: 'AlgorithmAutomation',
          component: () => import(/* webpackChunkName: "automation" */ '@/views/AlgorithmAutomationView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'analytics',
          name: 'Analytics',
          component: () => import(/* webpackChunkName: "analytics" */ '@/views/AnalyticsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'reports',
          name: 'Reports',
          component: () => import(/* webpackChunkName: "reports" */ '@/views/ReportsView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }
        },
        {
          path: 'todos',
          name: 'Todos',
          component: () => import(/* webpackChunkName: "todos" */ '@/views/TodosView.vue'),
          meta: { requiresAuth: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import(/* webpackChunkName: "error" */ '@/views/NotFoundView.vue')
    }
  ]
})

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const { warning, error: showError } = useToast()
  
  // Initialize auth if not already done
  if (!authStore.initialized) {
    try {
      await authStore.initAuth()
    } catch (error) {
      console.error('Auth initialization failed in router guard:', error)
      // If auth init fails and trying to access protected route, redirect to login
      if (to.matched.some(record => record.meta.requiresAuth)) {
        next('/auth/login')
        return
      }
    }
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)

  // Handle authentication-required routes
  if (requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Store the intended destination for post-login redirect
      let redirectPath = '/dashboard'
      if (to.fullPath !== '/auth/login' && to.fullPath !== '/') {
        redirectPath = to.fullPath
      }
      next({
        path: '/auth/login',
        query: { redirect: redirectPath }
      })
      return
    }
    
    if (requiresAdmin && !authStore.isAdmin) {
      // User is authenticated but not an admin - show warning
      warning(
        'Access Denied', 
        'Administrator privileges required for this page. Please contact your system administrator.'
      )
      
      // Clear any invalid auth state
      try {
        await authStore.logout()
      } catch (error) {
        console.error('Logout failed:', error)
      }
      
      next({
        path: '/auth/login',
        query: { error: 'admin_required', redirect: to.fullPath }
      })
      return
    }
  }

  // Handle guest-only routes (login/signup pages)
  if (requiresGuest) {
    if (authStore.isAuthenticated && authStore.isAdmin) {
      // Redirect to intended destination or dashboard
      const redirectPath = (to.query.redirect as string) || '/dashboard'
      next(redirectPath)
      return
    }
  }

  // Allow navigation
  next()
})

// Global after navigation guard
router.afterEach((to) => {
  // Clear any URL-based error parameters after navigation
  if (to.query.error) {
    // Clear error from URL without triggering navigation
    const query = { ...to.query }
    delete query.error
    router.replace({ ...to, query })
  }
})

export default router