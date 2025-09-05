import { useAuthStore } from '@/stores/auth'
import { tokenManager, TokenRefreshError } from './tokenManager'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface QueuedRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  endpoint: string
  options: RequestInit
}

export class ApiService {
  private baseURL: string
  private requestQueue: QueuedRequest[] = []
  private isRefreshing = false
  private maxRetries = 3
  private retryDelay = 1000 // 1 second

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL
    this.setupInterceptors()
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Listen for token refresh events
    tokenManager.addRefreshListener((result) => {
      if (result.success) {
        this.processQueuedRequests()
      } else {
        this.rejectQueuedRequests(new Error(result.error || 'Token refresh failed'))
      }
    })
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<ApiResponse<T>> {
    // If we're currently refreshing tokens, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          resolve: (result) => resolve(result),
          reject,
          endpoint,
          options,
        })
      })
    }

    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add authorization header if token exists
    const accessToken = tokenManager.getAccessToken()
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle 401 unauthorized responses
      if (response.status === 401 && accessToken && retryCount < this.maxRetries) {
        return this.handleUnauthorized(endpoint, options, retryCount)
      }

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('API request failed:', error)

      // Retry on network errors
      if (retryCount < this.maxRetries && this.isNetworkError(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount))
        return this.request(endpoint, options, retryCount + 1)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  /**
   * Handle 401 unauthorized responses by attempting token refresh
   */
  private async handleUnauthorized<T>(
    endpoint: string,
    options: RequestInit,
    retryCount: number,
  ): Promise<ApiResponse<T>> {
    if (this.isRefreshing) {
      // If refresh is already in progress, queue this request
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          resolve: (result) => resolve(result),
          reject,
          endpoint,
          options,
        })
      })
    }

    this.isRefreshing = true

    try {
      const refreshResult = await tokenManager.refreshAccessToken()

      if (refreshResult.success) {
        // Token refreshed successfully, retry the original request
        this.isRefreshing = false
        this.processQueuedRequests()
        return this.request(endpoint, options, retryCount + 1)
      } else {
        // Token refresh failed
        this.isRefreshing = false
        this.rejectQueuedRequests(new Error(refreshResult.error || 'Token refresh failed'))

        // Handle different refresh errors
        if (
          refreshResult.errorType === TokenRefreshError.REFRESH_TOKEN_EXPIRED ||
          refreshResult.errorType === TokenRefreshError.REFRESH_TOKEN_INVALID
        ) {
          // Clear tokens and redirect to login
          const authStore = useAuthStore()
          authStore.clearAuthData()
          window.location.href = '/login'
        }

        return {
          success: false,
          error: refreshResult.error || 'Authentication failed',
        }
      }
    } catch (error) {
      this.isRefreshing = false
      this.rejectQueuedRequests(error as Error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      }
    }
  }

  /**
   * Process queued requests after successful token refresh
   */
  private processQueuedRequests(): void {
    const queue = [...this.requestQueue]
    this.requestQueue = []

    queue.forEach(({ resolve, endpoint, options }) => {
      this.request(endpoint, options)
        .then(resolve)
        .catch((error) => {
          resolve({
            success: false,
            error: error.message || 'Request failed after token refresh',
          })
        })
    })
  }

  /**
   * Reject all queued requests
   */
  private rejectQueuedRequests(error: Error): void {
    const queue = [...this.requestQueue]
    this.requestQueue = []

    queue.forEach(({ resolve }) => {
      resolve({
        success: false,
        error: error.message || 'Request failed due to authentication error',
      })
    })
  }

  /**
   * Check if error is a network error that should be retried
   */
  private isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError ||
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    )
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Add security headers to requests
   */
  private addSecurityHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    }
  }

  // Auth endpoints
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async signup(
    email: string,
    password: string,
    displayName: string,
  ): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken?: string }>> {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async verifyToken(): Promise<ApiResponse<{ user: any }>> {
    return this.request('/auth/verify')
  }

  // User endpoints
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.request('/user/profile')
  }

  async updateUserProfile(data: any): Promise<ApiResponse<any>> {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Community endpoints
  async getCommunities(): Promise<ApiResponse<any[]>> {
    return this.request('/communities')
  }

  async createCommunity(data: any): Promise<ApiResponse<any>> {
    return this.request('/communities', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCommunity(id: string): Promise<ApiResponse<any>> {
    return this.request(`/communities/${id}`)
  }

  async updateCommunity(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request(`/communities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCommunity(id: string): Promise<ApiResponse> {
    return this.request(`/communities/${id}`, {
      method: 'DELETE',
    })
  }

  // Member endpoints
  async getCommunityMembers(communityId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/communities/${communityId}/members`)
  }

  async addMember(communityId: string, memberData: any): Promise<ApiResponse<any>> {
    return this.request(`/communities/${communityId}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData),
    })
  }

  async removeMember(communityId: string, memberId: string): Promise<ApiResponse> {
    return this.request(`/communities/${communityId}/members/${memberId}`, {
      method: 'DELETE',
    })
  }

  // Tournament endpoints
  async getTournaments(): Promise<ApiResponse<any[]>> {
    return this.request('/tournaments')
  }

  async getCommunityTournaments(communityId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/communities/${communityId}/tournaments`)
  }

  async createTournament(data: any): Promise<ApiResponse<any>> {
    return this.request('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getTournament(id: string): Promise<ApiResponse<any>> {
    return this.request(`/tournaments/${id}`)
  }

  async updateTournament(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTournament(id: string): Promise<ApiResponse> {
    return this.request(`/tournaments/${id}`, {
      method: 'DELETE',
    })
  }

  // Match endpoints
  async getCommunityMatches(communityId: string, filters?: any): Promise<ApiResponse<any[]>> {
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : ''
    return this.request(`/communities/${communityId}/matches${queryParams}`)
  }

  async getTournamentMatches(tournamentId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/tournaments/${tournamentId}/matches`)
  }

  async getMatch(id: string): Promise<ApiResponse<any>> {
    return this.request(`/matches/${id}`)
  }

  async updateMatchResult(id: string, result: any): Promise<ApiResponse<any>> {
    return this.request(`/matches/${id}/result`, {
      method: 'PUT',
      body: JSON.stringify(result),
    })
  }

  // Tournament control endpoints
  async generateNextRound(tournamentId: string): Promise<ApiResponse<any>> {
    return this.request(`/tournaments/${tournamentId}/generate-round`, {
      method: 'POST',
    })
  }

  async finalizeTournament(tournamentId: string): Promise<ApiResponse<any>> {
    return this.request(`/tournaments/${tournamentId}/finalize`, {
      method: 'POST',
    })
  }

  // Community statistics endpoints
  async getCommunityStats(communityId: string, dateRange?: any): Promise<ApiResponse<any>> {
    const queryParams = dateRange ? `?${new URLSearchParams(dateRange).toString()}` : ''
    return this.request(`/communities/${communityId}/stats${queryParams}`)
  }

  async getCommunityDashboardData(communityId: string): Promise<ApiResponse<any>> {
    return this.request(`/communities/${communityId}/dashboard`)
  }

  // Player performance endpoints
  async getCommunityPlayers(communityId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/communities/${communityId}/players`)
  }

  async getPlayerPerformance(playerId: string, communityId: string): Promise<ApiResponse<any>> {
    return this.request(`/communities/${communityId}/players/${playerId}/performance`)
  }

  // Event endpoints
  async getEvents(): Promise<ApiResponse<any[]>> {
    return this.request('/events')
  }

  async createEvent(data: any): Promise<ApiResponse<any>> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Generic GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint)
  }

  // Generic POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Generic PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
