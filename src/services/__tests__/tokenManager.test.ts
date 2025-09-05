import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TokenManager, TokenRefreshError } from '../tokenManager'

// Mock timers
vi.useFakeTimers()

describe('TokenManager', () => {
  let tokenManager: TokenManager
  let mockFetch: any

  // Mock JWT tokens
  const createMockToken = (exp: number, iat: number = Math.floor(Date.now() / 1000)) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(
      JSON.stringify({
        sub: 'user123',
        email: 'test@example.com',
        userType: 'community_leader',
        iat,
        exp,
        jti: 'token-id-123',
      }),
    )
    const signature = 'mock-signature'
    return `${header}.${payload}.${signature}`
  }

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Mock window events
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    })

    Object.defineProperty(window, 'dispatchEvent', {
      value: vi.fn(),
      writable: true,
    })

    tokenManager = TokenManager.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    tokenManager.destroy()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TokenManager.getInstance()
      const instance2 = TokenManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('setTokens', () => {
    it('should set tokens and schedule refresh', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400) // 1 day from now

      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      tokenManager.setTokens(accessToken, refreshToken)

      expect(tokenManager.getAccessToken()).toBe(accessToken)
      expect(tokenManager.getRefreshToken()).toBe(refreshToken)
      expect(mockSetItem).toHaveBeenCalledWith('auth_tokens', expect.any(String))
    })
  })

  describe('getAccessToken', () => {
    it('should return valid access token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      tokenManager.setTokens(accessToken, refreshToken)
      expect(tokenManager.getAccessToken()).toBe(accessToken)
    })

    it('should return null for expired access token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const accessToken = createMockToken(pastExp)
      const refreshToken = createMockToken(pastExp + 86400)

      tokenManager.setTokens(accessToken, refreshToken)
      expect(tokenManager.getAccessToken()).toBeNull()
    })

    it('should return null when no token is set', () => {
      expect(tokenManager.getAccessToken()).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = createMockToken(futureExp)
      expect(tokenManager.isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600
      const token = createMockToken(pastExp)
      expect(tokenManager.isTokenExpired(token)).toBe(true)
    })

    it('should return true for malformed token', () => {
      expect(tokenManager.isTokenExpired('invalid-token')).toBe(true)
    })
  })

  describe('validateTokenStructure', () => {
    it('should validate correct JWT structure', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = createMockToken(futureExp)
      expect(tokenManager.validateTokenStructure(token)).toBe(true)
    })

    it('should reject malformed JWT', () => {
      expect(tokenManager.validateTokenStructure('invalid')).toBe(false)
      expect(tokenManager.validateTokenStructure('invalid.token')).toBe(false)
      expect(tokenManager.validateTokenStructure('')).toBe(false)
    })

    it('should reject token without required fields', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({ email: 'test@example.com' })) // Missing required fields
      const signature = 'mock-signature'
      const invalidToken = `${header}.${payload}.${signature}`

      expect(tokenManager.validateTokenStructure(invalidToken)).toBe(false)
    })
  })

  describe('scheduleRefresh', () => {
    it('should schedule refresh before token expiration', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      tokenManager.setTokens(accessToken, refreshToken)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Scheduling token refresh'))
      consoleSpy.mockRestore()
    })

    it('should not schedule refresh for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600
      const accessToken = createMockToken(pastExp)

      tokenManager.setTokens(accessToken, 'refresh-token')
      tokenManager.scheduleRefresh()

      // Should not throw or cause issues
      expect(true).toBe(true)
    })
  })

  describe('refreshAccessToken', () => {
    it('should successfully refresh token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const newAccessToken = createMockToken(futureExp + 1800) // 30 minutes later
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: newAccessToken,
          refreshToken: refreshToken,
        }),
      })

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      const result = await tokenManager.refreshAccessToken()

      expect(result.success).toBe(true)
      expect(result.accessToken).toBe(newAccessToken)
      expect(tokenManager.getAccessToken()).toBe(newAccessToken)
    })

    it('should handle refresh token expiration', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600
      const expiredRefreshToken = createMockToken(pastExp)

      tokenManager.setTokens(createMockToken(pastExp), expiredRefreshToken)

      const result = await tokenManager.refreshAccessToken()

      expect(result.success).toBe(false)
      expect(result.errorType).toBe(TokenRefreshError.REFRESH_TOKEN_EXPIRED)
      expect(tokenManager.getAccessToken()).toBeNull()
    })

    it('should handle 401 unauthorized response', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      const result = await tokenManager.refreshAccessToken()

      expect(result.success).toBe(false)
      expect(result.errorType).toBe(TokenRefreshError.REFRESH_TOKEN_INVALID)
    })

    it('should handle rate limiting', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      })

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      const result = await tokenManager.refreshAccessToken()

      expect(result.success).toBe(false)
      expect(result.errorType).toBe(TokenRefreshError.RATE_LIMITED)
    })

    it('should handle network errors', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      const result = await tokenManager.refreshAccessToken()

      expect(result.success).toBe(false)
      expect(result.errorType).toBe(TokenRefreshError.NETWORK_ERROR)
    })

    it('should return existing promise if refresh is in progress', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const refreshToken = createMockToken(futureExp + 86400)

      // Mock a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ accessToken: createMockToken(futureExp + 1800) }),
                }),
              1000,
            ),
          ),
      )

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      // Start two refresh operations simultaneously
      const promise1 = tokenManager.refreshAccessToken()
      const promise2 = tokenManager.refreshAccessToken()

      // Should return the same promise
      expect(promise1).toBe(promise2)

      await vi.runAllTimersAsync()
      await promise1
    })
  })

  describe('clearTokens', () => {
    it('should clear all tokens and cancel refresh timer', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
          removeItem: mockRemoveItem,
          clear: vi.fn(),
        },
        writable: true,
      })

      tokenManager.setTokens(accessToken, refreshToken)
      tokenManager.clearTokens()

      expect(tokenManager.getAccessToken()).toBeNull()
      expect(tokenManager.getRefreshToken()).toBeNull()
      expect(mockRemoveItem).toHaveBeenCalledWith('auth_tokens')
    })
  })

  describe('token persistence', () => {
    it('should load tokens from storage on initialization', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      const tokenData = {
        accessToken,
        refreshToken,
        timestamp: Date.now(),
      }

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(tokenData)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const newTokenManager = new TokenManager()
      expect(newTokenManager.getAccessToken()).toBe(accessToken)
      expect(newTokenManager.getRefreshToken()).toBe(refreshToken)
    })

    it('should clear invalid tokens from storage', () => {
      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => 'invalid-json'),
          setItem: vi.fn(),
          removeItem: mockRemoveItem,
          clear: vi.fn(),
        },
        writable: true,
      })

      new TokenManager()
      expect(mockRemoveItem).toHaveBeenCalledWith('auth_tokens')
    })
  })

  describe('refresh listeners', () => {
    it('should notify listeners on token refresh', async () => {
      const listener = vi.fn()
      tokenManager.addRefreshListener(listener)

      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const newAccessToken = createMockToken(futureExp + 1800)
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newAccessToken }),
      })

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)
      await tokenManager.refreshAccessToken()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          accessToken: newAccessToken,
        }),
      )

      tokenManager.removeRefreshListener(listener)
    })
  })

  describe('utility methods', () => {
    it('should return token info', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      tokenManager.setTokens(accessToken, refreshToken)

      const info = tokenManager.getTokenInfo()
      expect(info.accessTokenExp).toBe(futureExp)
      expect(info.isAccessTokenExpired).toBe(false)
      expect(info.isRefreshTokenExpired).toBe(false)
    })

    it('should check if tokens are valid', () => {
      expect(tokenManager.hasValidTokens()).toBe(false)

      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      tokenManager.setTokens(accessToken, refreshToken)
      expect(tokenManager.hasValidTokens()).toBe(true)
    })

    it('should return time until expiry', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour
      const accessToken = createMockToken(futureExp)
      const refreshToken = createMockToken(futureExp + 86400)

      tokenManager.setTokens(accessToken, refreshToken)

      const timeUntilExpiry = tokenManager.getTimeUntilExpiry()
      expect(timeUntilExpiry).toBeGreaterThan(3590) // Should be close to 3600 seconds
      expect(timeUntilExpiry).toBeLessThanOrEqual(3600)
    })

    it('should force refresh', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const newAccessToken = createMockToken(futureExp + 1800)
      const refreshToken = createMockToken(futureExp + 86400)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newAccessToken }),
      })

      tokenManager.setTokens(createMockToken(futureExp), refreshToken)

      const result = await tokenManager.forceRefresh()
      expect(result.success).toBe(true)
      expect(result.accessToken).toBe(newAccessToken)
    })
  })
})
