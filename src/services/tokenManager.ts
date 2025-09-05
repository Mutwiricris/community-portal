export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number // Access token expiration in seconds
  refreshExpiresIn: number // Refresh token expiration in seconds
}

export interface DecodedToken {
  sub: string // User ID
  email: string
  userType: string
  iat: number // Issued at
  exp: number // Expires at
  jti: string // JWT ID for tracking
}

export interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
  errorType?: TokenRefreshError
}

export enum TokenRefreshError {
  REFRESH_TOKEN_EXPIRED = 'refresh_token_expired',
  REFRESH_TOKEN_INVALID = 'refresh_token_invalid',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  RATE_LIMITED = 'rate_limited',
}

export class TokenManager {
  private static instance: TokenManager
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private refreshPromise: Promise<TokenRefreshResult> | null = null
  private refreshListeners: ((result: TokenRefreshResult) => void)[] = []
  private storageKey = 'auth_tokens'
  private crossTabSync: any = null

  constructor() {
    this.loadTokensFromStorage()
    this.setupStorageListener()
    this.initializeCrossTabSync()
  }

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  /**
   * Set token pair and schedule refresh
   */
  public setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken
    this.refreshToken = refreshToken

    this.saveTokensToStorage()
    this.scheduleRefresh()
    this.notifyOtherTabs('tokens_updated')
  }

  /**
   * Get current access token
   */
  public getAccessToken(): string | null {
    if (!this.accessToken) {
      return null
    }

    // Check if token is expired
    if (this.isTokenExpired(this.accessToken)) {
      console.warn('Access token is expired')
      return null
    }

    return this.accessToken
  }

  /**
   * Get current refresh token
   */
  public getRefreshToken(): string | null {
    return this.refreshToken
  }

  /**
   * Check if a token is expired
   */
  public isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token)
      if (!decoded || !decoded.exp) {
        return true
      }

      // Add 30 second buffer to account for clock skew
      const now = Math.floor(Date.now() / 1000) + 30
      return decoded.exp < now
    } catch (error) {
      console.error('Error checking token expiration:', error)
      return true
    }
  }

  /**
   * Validate token structure and signature
   */
  public validateTokenStructure(token: string): boolean {
    try {
      // Basic JWT structure validation
      const parts = token.split('.')
      if (parts.length !== 3) {
        return false
      }

      // Decode and validate payload
      const decoded = this.decodeToken(token)
      if (!decoded) {
        return false
      }

      // Check required fields
      const requiredFields = ['sub', 'exp', 'iat']
      for (const field of requiredFields) {
        if (!decoded[field as keyof DecodedToken]) {
          return false
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = parts[1]
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
      return decoded as DecodedToken
    } catch (error) {
      console.error('Error decoding token:', error)
      return null
    }
  }

  /**
   * Schedule automatic token refresh
   */
  public scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (!this.accessToken) {
      return
    }

    try {
      const decoded = this.decodeToken(this.accessToken)
      if (!decoded || !decoded.exp) {
        return
      }

      // Schedule refresh 5 minutes before expiration
      const now = Math.floor(Date.now() / 1000)
      const expiresIn = decoded.exp - now
      const refreshIn = Math.max(expiresIn - 300, 60) // At least 1 minute, preferably 5 minutes before expiry

      console.log(`Scheduling token refresh in ${refreshIn} seconds`)

      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken()
      }, refreshIn * 1000)
    } catch (error) {
      console.error('Error scheduling token refresh:', error)
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(): Promise<TokenRefreshResult> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.refreshToken) {
      const result: TokenRefreshResult = {
        success: false,
        error: 'No refresh token available',
        errorType: TokenRefreshError.REFRESH_TOKEN_INVALID,
      }
      this.notifyRefreshListeners(result)
      return result
    }

    // Check if refresh token is expired
    if (this.isTokenExpired(this.refreshToken)) {
      const result: TokenRefreshResult = {
        success: false,
        error: 'Refresh token is expired',
        errorType: TokenRefreshError.REFRESH_TOKEN_EXPIRED,
      }
      this.clearTokens()
      this.notifyRefreshListeners(result)
      return result
    }

    this.refreshPromise = this.performTokenRefresh()
    const result = await this.refreshPromise
    this.refreshPromise = null

    this.notifyRefreshListeners(result)
    return result
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(): Promise<TokenRefreshResult> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.clearTokens()
          return {
            success: false,
            error: 'Refresh token is invalid or expired',
            errorType: TokenRefreshError.REFRESH_TOKEN_INVALID,
          }
        }

        if (response.status === 429) {
          return {
            success: false,
            error: 'Too many refresh requests',
            errorType: TokenRefreshError.RATE_LIMITED,
          }
        }

        return {
          success: false,
          error: `Server error: ${response.status}`,
          errorType: TokenRefreshError.SERVER_ERROR,
        }
      }

      const data = await response.json()

      if (data.accessToken) {
        this.accessToken = data.accessToken

        // Update refresh token if provided (token rotation)
        if (data.refreshToken) {
          this.refreshToken = data.refreshToken
        }

        this.saveTokensToStorage()
        this.scheduleRefresh()
        this.notifyOtherTabs('tokens_refreshed')

        return {
          success: true,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || this.refreshToken,
        }
      }

      return {
        success: false,
        error: 'Invalid response from server',
        errorType: TokenRefreshError.SERVER_ERROR,
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorType: TokenRefreshError.NETWORK_ERROR,
      }
    }
  }

  /**
   * Clear all tokens
   */
  public clearTokens(): void {
    this.accessToken = null
    this.refreshToken = null

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    this.removeTokensFromStorage()
    this.notifyOtherTabs('tokens_cleared')
  }

  /**
   * Save tokens to storage
   */
  private saveTokensToStorage(): void {
    try {
      const tokenData = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        timestamp: Date.now(),
      }
      localStorage.setItem(this.storageKey, JSON.stringify(tokenData))
    } catch (error) {
      console.error('Failed to save tokens to storage:', error)
    }
  }

  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) {
        return
      }

      const tokenData = JSON.parse(stored)

      // Validate stored tokens
      if (tokenData.accessToken && this.validateTokenStructure(tokenData.accessToken)) {
        this.accessToken = tokenData.accessToken
      }

      if (tokenData.refreshToken && this.validateTokenStructure(tokenData.refreshToken)) {
        this.refreshToken = tokenData.refreshToken
      }

      // Schedule refresh if we have valid tokens
      if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
        this.scheduleRefresh()
      } else if (this.refreshToken && !this.isTokenExpired(this.refreshToken)) {
        // Access token expired but refresh token is valid, refresh immediately
        this.refreshAccessToken()
      } else {
        // Both tokens expired, clear them
        this.clearTokens()
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error)
      this.clearTokens()
    }
  }

  /**
   * Remove tokens from storage
   */
  private removeTokensFromStorage(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Failed to remove tokens from storage:', error)
    }
  }

  /**
   * Setup storage event listener for cross-tab synchronization
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        if (event.newValue) {
          // Tokens updated in another tab
          this.loadTokensFromStorage()
        } else {
          // Tokens cleared in another tab
          this.clearTokens()
        }
      }
    })

    // Also listen for custom events for immediate synchronization
    window.addEventListener('token_sync', ((event: CustomEvent) => {
      switch (event.detail.type) {
        case 'tokens_updated':
        case 'tokens_refreshed':
          this.loadTokensFromStorage()
          break
        case 'tokens_cleared':
          this.clearTokens()
          break
      }
    }) as EventListener)
  }

  /**
   * Notify other tabs about token changes
   */
  private notifyOtherTabs(type: string): void {
    // Use custom event for immediate notification
    window.dispatchEvent(
      new CustomEvent('token_sync', {
        detail: { type },
      }),
    )
  }

  /**
   * Add refresh listener
   */
  public addRefreshListener(listener: (result: TokenRefreshResult) => void): void {
    this.refreshListeners.push(listener)
  }

  /**
   * Remove refresh listener
   */
  public removeRefreshListener(listener: (result: TokenRefreshResult) => void): void {
    const index = this.refreshListeners.indexOf(listener)
    if (index > -1) {
      this.refreshListeners.splice(index, 1)
    }
  }

  /**
   * Notify refresh listeners
   */
  private notifyRefreshListeners(result: TokenRefreshResult): void {
    this.refreshListeners.forEach((listener) => {
      try {
        listener(result)
      } catch (error) {
        console.error('Token refresh listener error:', error)
      }
    })
  }

  /**
   * Get token expiration info
   */
  public getTokenInfo(): {
    accessTokenExp?: number
    refreshTokenExp?: number
    isAccessTokenExpired: boolean
    isRefreshTokenExpired: boolean
  } {
    const info = {
      isAccessTokenExpired: true,
      isRefreshTokenExpired: true,
      accessTokenExp: undefined as number | undefined,
      refreshTokenExp: undefined as number | undefined,
    }

    if (this.accessToken) {
      const decoded = this.decodeToken(this.accessToken)
      if (decoded?.exp) {
        info.accessTokenExp = decoded.exp
        info.isAccessTokenExpired = this.isTokenExpired(this.accessToken)
      }
    }

    if (this.refreshToken) {
      const decoded = this.decodeToken(this.refreshToken)
      if (decoded?.exp) {
        info.refreshTokenExp = decoded.exp
        info.isRefreshTokenExpired = this.isTokenExpired(this.refreshToken)
      }
    }

    return info
  }

  /**
   * Force token refresh (for testing or manual refresh)
   */
  public async forceRefresh(): Promise<TokenRefreshResult> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    return this.refreshAccessToken()
  }

  /**
   * Check if tokens are available and valid
   */
  public hasValidTokens(): boolean {
    return !!(this.accessToken && !this.isTokenExpired(this.accessToken))
  }

  /**
   * Get time until access token expires (in seconds)
   */
  public getTimeUntilExpiry(): number {
    if (!this.accessToken) {
      return 0
    }

    const decoded = this.decodeToken(this.accessToken)
    if (!decoded?.exp) {
      return 0
    }

    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, decoded.exp - now)
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.refreshListeners = []
    this.refreshPromise = null
  }

  /**
   * Initialize cross-tab synchronization
   */
  private initializeCrossTabSync(): void {
    // For now, we'll use a simple approach without the CrossTabSync service
    // This can be enhanced later if needed
    try {
      // Listen for storage events to sync tokens across tabs
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey && event.newValue) {
          try {
            const tokens = JSON.parse(event.newValue)
            if (tokens.accessToken && tokens.refreshToken) {
              this.accessToken = tokens.accessToken
              this.refreshToken = tokens.refreshToken
              this.scheduleRefresh()
            }
          } catch (error) {
            console.error('Error parsing tokens from storage event:', error)
          }
        }
      })
    } catch (error) {
      console.error('Error setting up cross-tab sync:', error)
    }
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance()
export default tokenManager
