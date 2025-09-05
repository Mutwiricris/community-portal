export interface SyncMessage {
  type: string
  data?: any
  timestamp: number
  tabId: string
}

export interface TabInfo {
  id: string
  lastSeen: number
  isActive: boolean
}

export class CrossTabSync {
  private static instance: CrossTabSync
  private tabId: string
  private channel: BroadcastChannel | null = null
  private storageListeners: Map<string, (event: StorageEvent) => void> = new Map()
  private messageListeners: Map<string, (message: SyncMessage) => void> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private isLeaderTab = false

  constructor() {
    this.tabId = this.generateTabId()
    this.initializeBroadcastChannel()
    this.setupStorageListener()
    this.startHeartbeat()
    this.startCleanup()
    this.electLeader()
  }

  public static getInstance(): CrossTabSync {
    if (!CrossTabSync.instance) {
      CrossTabSync.instance = new CrossTabSync()
    }
    return CrossTabSync.instance
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Initialize BroadcastChannel for modern browsers
   */
  private initializeBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('auth_sync')
        this.channel.addEventListener('message', (event) => {
          this.handleBroadcastMessage(event.data)
        })
      } catch (error) {
        console.warn('BroadcastChannel not available, falling back to localStorage events')
      }
    }
  }

  /**
   * Setup localStorage event listener for cross-tab communication
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('sync_')) {
        const messageType = event.key.replace('sync_', '')
        const listener = this.storageListeners.get(messageType)

        if (listener) {
          listener(event)
        }
      }
    })
  }

  /**
   * Start heartbeat to track active tabs
   */
  private startHeartbeat(): void {
    this.updateTabInfo()

    this.heartbeatInterval = setInterval(() => {
      this.updateTabInfo()
    }, 5000) // Update every 5 seconds
  }

  /**
   * Start cleanup process for inactive tabs
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTabs()
      this.electLeader()
    }, 10000) // Cleanup every 10 seconds
  }

  /**
   * Update tab information in storage
   */
  private updateTabInfo(): void {
    try {
      const tabInfo: TabInfo = {
        id: this.tabId,
        lastSeen: Date.now(),
        isActive: !document.hidden,
      }

      const existingTabs = this.getActiveTabs()
      existingTabs[this.tabId] = tabInfo

      localStorage.setItem('active_tabs', JSON.stringify(existingTabs))
    } catch (error) {
      console.error('Failed to update tab info:', error)
    }
  }

  /**
   * Get all active tabs
   */
  private getActiveTabs(): Record<string, TabInfo> {
    try {
      const stored = localStorage.getItem('active_tabs')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  /**
   * Cleanup inactive tabs
   */
  private cleanupInactiveTabs(): void {
    try {
      const tabs = this.getActiveTabs()
      const now = Date.now()
      const timeout = 30000 // 30 seconds

      Object.keys(tabs).forEach((tabId) => {
        if (now - tabs[tabId].lastSeen > timeout) {
          delete tabs[tabId]
        }
      })

      localStorage.setItem('active_tabs', JSON.stringify(tabs))
    } catch (error) {
      console.error('Failed to cleanup inactive tabs:', error)
    }
  }

  /**
   * Elect leader tab (oldest active tab)
   */
  private electLeader(): void {
    try {
      const tabs = this.getActiveTabs()
      const tabIds = Object.keys(tabs).sort()

      const wasLeader = this.isLeaderTab
      this.isLeaderTab = tabIds.length > 0 && tabIds[0] === this.tabId

      // Notify if leadership changed
      if (!wasLeader && this.isLeaderTab) {
        this.broadcast('leader_elected', { leaderId: this.tabId })
      }
    } catch (error) {
      console.error('Failed to elect leader:', error)
    }
  }

  /**
   * Handle broadcast messages
   */
  private handleBroadcastMessage(message: SyncMessage): void {
    // Don't process messages from this tab
    if (message.tabId === this.tabId) {
      return
    }

    const listener = this.messageListeners.get(message.type)
    if (listener) {
      listener(message)
    }
  }

  /**
   * Broadcast message to all tabs
   */
  public broadcast(type: string, data?: any): void {
    const message: SyncMessage = {
      type,
      data,
      timestamp: Date.now(),
      tabId: this.tabId,
    }

    // Use BroadcastChannel if available
    if (this.channel) {
      try {
        this.channel.postMessage(message)
        return
      } catch (error) {
        console.warn('BroadcastChannel failed, falling back to localStorage')
      }
    }

    // Fallback to localStorage
    try {
      const key = `sync_${type}`
      localStorage.setItem(key, JSON.stringify(message))

      // Remove the item immediately to trigger storage event
      setTimeout(() => {
        localStorage.removeItem(key)
      }, 100)
    } catch (error) {
      console.error('Failed to broadcast message:', error)
    }
  }

  /**
   * Listen for specific message types
   */
  public addListener(type: string, callback: (message: SyncMessage) => void): void {
    this.messageListeners.set(type, callback)

    // Also add storage listener for fallback
    const storageListener = (event: StorageEvent) => {
      if (event.newValue) {
        try {
          const message: SyncMessage = JSON.parse(event.newValue)
          if (message.tabId !== this.tabId) {
            callback(message)
          }
        } catch (error) {
          console.error('Failed to parse sync message:', error)
        }
      }
    }

    this.storageListeners.set(type, storageListener)
  }

  /**
   * Remove listener for specific message type
   */
  public removeListener(type: string): void {
    this.messageListeners.delete(type)
    this.storageListeners.delete(type)
  }

  /**
   * Get current tab ID
   */
  public getTabId(): string {
    return this.tabId
  }

  /**
   * Check if this tab is the leader
   */
  public isLeader(): boolean {
    return this.isLeaderTab
  }

  /**
   * Get count of active tabs
   */
  public getActiveTabCount(): number {
    return Object.keys(this.getActiveTabs()).length
  }

  /**
   * Get all active tab IDs
   */
  public getActiveTabIds(): string[] {
    return Object.keys(this.getActiveTabs())
  }

  /**
   * Synchronize data across tabs
   */
  public syncData(key: string, data: any): void {
    this.broadcast('data_sync', { key, data })
  }

  /**
   * Request data from other tabs
   */
  public requestData(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener(`data_response_${key}`)
        reject(new Error('Data request timeout'))
      }, 5000)

      this.addListener(`data_response_${key}`, (message) => {
        clearTimeout(timeout)
        this.removeListener(`data_response_${key}`)
        resolve(message.data)
      })

      this.broadcast('data_request', { key, requestId: this.tabId })
    })
  }

  /**
   * Respond to data requests
   */
  public onDataRequest(callback: (key: string, requestId: string) => any): void {
    this.addListener('data_request', (message) => {
      const { key, requestId } = message.data
      const responseData = callback(key, requestId)

      if (responseData !== undefined) {
        this.broadcast(`data_response_${key}`, responseData)
      }
    })
  }

  /**
   * Lock mechanism for coordinating actions across tabs
   */
  public async acquireLock(lockName: string, timeout = 10000): Promise<boolean> {
    const lockKey = `lock_${lockName}`
    const lockValue = `${this.tabId}_${Date.now()}`

    try {
      // Try to acquire lock
      const existingLock = localStorage.getItem(lockKey)
      if (existingLock) {
        const [tabId, timestamp] = existingLock.split('_')
        const lockAge = Date.now() - parseInt(timestamp)

        // Check if lock is expired
        if (lockAge < timeout) {
          return false // Lock is held by another tab
        }
      }

      // Acquire lock
      localStorage.setItem(lockKey, lockValue)

      // Verify we got the lock (handle race conditions)
      await new Promise((resolve) => setTimeout(resolve, 10))
      const currentLock = localStorage.getItem(lockKey)

      return currentLock === lockValue
    } catch (error) {
      console.error('Failed to acquire lock:', error)
      return false
    }
  }

  /**
   * Release lock
   */
  public releaseLock(lockName: string): void {
    const lockKey = `lock_${lockName}`
    const lockValue = `${this.tabId}_${Date.now()}`

    try {
      const currentLock = localStorage.getItem(lockKey)
      if (currentLock?.startsWith(this.tabId)) {
        localStorage.removeItem(lockKey)
      }
    } catch (error) {
      console.error('Failed to release lock:', error)
    }
  }

  /**
   * Execute function with lock
   */
  public async withLock<T>(lockName: string, fn: () => Promise<T>, timeout = 10000): Promise<T> {
    const acquired = await this.acquireLock(lockName, timeout)
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${lockName}`)
    }

    try {
      return await fn()
    } finally {
      this.releaseLock(lockName)
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    // Remove this tab from active tabs
    try {
      const tabs = this.getActiveTabs()
      delete tabs[this.tabId]
      localStorage.setItem('active_tabs', JSON.stringify(tabs))
    } catch (error) {
      console.error('Failed to cleanup tab info:', error)
    }

    this.messageListeners.clear()
    this.storageListeners.clear()
  }
}

// Export singleton instance
export const crossTabSync = CrossTabSync.getInstance()
export default crossTabSync
