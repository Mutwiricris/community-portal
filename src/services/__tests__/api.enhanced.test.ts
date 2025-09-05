import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ApiService } from '../api'
import { tokenManager, TokenRefreshError } from '../tokenManager'

// Mock tokenManager
vi.mock('../tokenManager', () => ({
  tokenManager: {
    getAccessToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    addRefreshListener: vi.fn(),
  },
  TokenRefreshError: {
    REFRESH_TOKEN_EXPIRED: 'refresh_token_expired',
    REFRESH_TOKEN_INVALID: 'refresh_token_invalid',
    NETWORK_ERROR: 'network_error',
    SERVER_ERROR: 'server_error',
    RATE_LIMITED: 'rate_limited',
  },
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    clearAuthData: vi.fn(),
  })),
}))

describe('Enhanced ApiService', () => {
  let apiService: ApiService
  let mockFetch: any
  let mockTokenManager: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch

    mockTokenManager = tokenManager as any
    mockTokenManager.getAccessToken.mockReturnValue('valid-access-token')
    mockTokenManager.refreshAccessToken.mockResolvedValue({
      success: true,
      accessToken: 'new-access-token',
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    apiService = new ApiService('http://localhost:3000/api')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('request with token refresh', () => {
    it('should include access token in authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      await apiService.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
          }),
        }),
      )
    })

    it('should handle 401 response by refreshing token and retrying', async () => {
      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
        })
        // Second call (after refresh) succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        })

      mockTokenManager.getAccessToken
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce('new-access-token')

      const result = await apiService.get('/test')

      expect(mockTokenManager.refreshAccessToken).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('should queue requests during token refresh', async () => {
      let refreshResolve: any
      const refreshPromise = new Promise((resolve) => {
        refreshResolve = resolve
      })

      mockTokenManager.refreshAccessToken.mockReturnValue(refreshPromise)

      // First request triggers refresh
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      const request1 = apiService.get('/test1')
      const request2 = apiService.get('/test2')

      // Resolve the refresh
      refreshResolve({
        success: true,
        accessToken: 'new-access-token',
      })

      // Mock successful responses for queued requests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success2' }),
        })

      const [result1, result2] = await Promise.all([request1, request2])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(mockTokenManager.refreshAccessToken).toHaveBeenCalledTimes(1)
    })

    it('should redirect to login when refresh token is expired', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      mockTokenManager.refreshAccessToken.mockResolvedValue({
        success: false,
        error: 'Refresh token expired',
        errorType: TokenRefreshError.REFRESH_TOKEN_EXPIRED,
      })

      const result = await apiService.get('/test')

      expect(result.success).toBe(false)
      expect(window.location.href).toBe('/login')
    })

    it('should handle network errors with retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
      })

      const result = await apiService.get('/test')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('should limit retries for network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await apiService.get('/test')

      expect(mockFetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle rate limiting during token refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      mockTokenManager.refreshAccessToken.mockResolvedValue({
        success: false,
        error: 'Rate limited',
        errorType: TokenRefreshError.RATE_LIMITED,
      })

      const result = await apiService.get('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Rate limited')
    })
  })

  describe('auth endpoints', () => {
    it('should call login endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      })

      const result = await apiService.login('test@example.com', 'password')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
          }),
        }),
      )
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('accessToken')
      expect(result.data).toHaveProperty('refreshToken')
    })

    it('should call signup endpoint with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      })

      const result = await apiService.signup('test@example.com', 'password', 'Test User')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
            displayName: 'Test User',
          }),
        }),
      )
      expect(result.success).toBe(true)
    })

    it('should call refresh token endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      })

      const result = await apiService.refreshToken('refresh-token')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            refreshToken: 'refresh-token',
          }),
        }),
      )
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('accessToken')
    })
  })

  describe('error handling', () => {
    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      })

      const result = await apiService.get('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await apiService.get('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON')
    })

    it('should handle fetch failures', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const result = await apiService.get('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch')
    })
  })

  describe('request queuing', () => {
    it('should process queued requests after successful token refresh', async () => {
      let refreshResolve: any
      const refreshPromise = new Promise((resolve) => {
        refreshResolve = resolve
      })

      mockTokenManager.refreshAccessToken.mockReturnValue(refreshPromise)

      // Mock 401 response for first request
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      // Start multiple requests
      const requests = [
        apiService.get('/test1'),
        apiService.get('/test2'),
        apiService.get('/test3'),
      ]

      // Resolve token refresh
      refreshResolve({
        success: true,
        accessToken: 'new-access-token',
      })

      // Mock successful responses for all queued requests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success2' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success3' }),
        })

      const results = await Promise.all(requests)

      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })

    it('should reject queued requests when token refresh fails', async () => {
      mockTokenManager.refreshAccessToken.mockResolvedValue({
        success: false,
        error: 'Refresh failed',
        errorType: TokenRefreshError.REFRESH_TOKEN_INVALID,
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      })

      const requests = [apiService.get('/test1'), apiService.get('/test2')]

      const results = await Promise.all(requests)

      results.forEach((result) => {
        expect(result.success).toBe(false)
        expect(result.error).toContain('authentication error')
      })
    })
  })
})
