import { SecurityEvent, SecurityEventType } from './xssProtection'

export interface SecurityEventFilter {
  types?: SecurityEventType[]
  severities?: ('low' | 'medium' | 'high' | 'critical')[]
  sources?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  userId?: string
}

export interface SecurityEventStats {
  totalEvents: number
  eventsByType: Record<SecurityEventType, number>
  eventsBySeverity: Record<string, number>
  eventsBySource: Record<string, number>
  recentEvents: SecurityEvent[]
  criticalEvents: SecurityEvent[]
}

export interface SecurityLoggerConfig {
  maxStoredEvents: number
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  remoteEndpoint?: string
  batchSize: number
  flushInterval: number
}

export class SecurityLogger {
  private static instance: SecurityLogger
  private config: SecurityLoggerConfig
  private eventQueue: SecurityEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private listeners: ((event: SecurityEvent) => void)[] = []

  constructor(config?: Partial<SecurityLoggerConfig>) {
    this.config = {
      maxStoredEvents: 1000,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      remoteEndpoint: '/api/security/events',
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      ...config,
    }

    this.startFlushTimer()
  }

  public static getInstance(config?: Partial<SecurityLoggerConfig>): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger(config)
    }
    return SecurityLogger.instance
  }

  /**
   * Log a security event
   */
  public logEvent(event: SecurityEvent): void {
    // Ensure timestamp is set
    if (!event.timestamp) {
      event.timestamp = new Date()
    }

    // Add to queue for batch processing
    this.eventQueue.push(event)

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      this.logToConsole(event)
    }

    // Store locally
    this.storeEventLocally(event)

    // Notify listeners
    this.notifyListeners(event)

    // Immediate flush for critical events
    if (event.severity === 'critical') {
      this.flushEvents()
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents()
    }
  }

  /**
   * Log to console with appropriate styling
   */
  private logToConsole(event: SecurityEvent): void {
    const timestamp = event.timestamp.toISOString()
    const prefix = `[SECURITY ${event.severity.toUpperCase()}]`

    switch (event.severity) {
      case 'critical':
        console.error(`🚨 ${prefix} ${timestamp}`, event)
        break
      case 'high':
        console.warn(`⚠️ ${prefix} ${timestamp}`, event)
        break
      case 'medium':
        console.warn(`⚡ ${prefix} ${timestamp}`, event)
        break
      case 'low':
        console.info(`ℹ️ ${prefix} ${timestamp}`, event)
        break
    }
  }

  /**
   * Store event in localStorage
   */
  private storeEventLocally(event: SecurityEvent): void {
    try {
      const existingEvents = this.getStoredEvents()
      existingEvents.push(event)

      // Maintain max stored events limit
      if (existingEvents.length > this.config.maxStoredEvents) {
        existingEvents.splice(0, existingEvents.length - this.config.maxStoredEvents)
      }

      localStorage.setItem('security_events', JSON.stringify(existingEvents))
    } catch (error) {
      console.error('Failed to store security event locally:', error)
    }
  }

  /**
   * Get stored events from localStorage
   */
  private getStoredEvents(): SecurityEvent[] {
    try {
      const stored = localStorage.getItem('security_events')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(event: SecurityEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Security event listener error:', error)
      }
    })
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents()
      }
    }, this.config.flushInterval)
  }

  /**
   * Flush queued events to remote endpoint
   */
  private async flushEvents(): Promise<void> {
    if (!this.config.enableRemoteLogging || this.eventQueue.length === 0) {
      return
    }

    const eventsToFlush = [...this.eventQueue]
    this.eventQueue = []

    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToFlush,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      })
    } catch (error) {
      console.error('Failed to flush security events to remote endpoint:', error)

      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToFlush)

      // Limit queue size to prevent memory issues
      if (this.eventQueue.length > this.config.maxStoredEvents) {
        this.eventQueue.splice(this.config.maxStoredEvents)
      }
    }
  }

  /**
   * Get all security events with optional filtering
   */
  public getEvents(filter?: SecurityEventFilter): SecurityEvent[] {
    const allEvents = this.getStoredEvents()

    if (!filter) {
      return allEvents
    }

    return allEvents.filter((event) => {
      // Filter by types
      if (filter.types && !filter.types.includes(event.type)) {
        return false
      }

      // Filter by severities
      if (filter.severities && !filter.severities.includes(event.severity)) {
        return false
      }

      // Filter by sources
      if (filter.sources && !filter.sources.includes(event.source)) {
        return false
      }

      // Filter by date range
      if (filter.dateRange) {
        const eventDate = new Date(event.timestamp)
        if (eventDate < filter.dateRange.start || eventDate > filter.dateRange.end) {
          return false
        }
      }

      // Filter by user ID
      if (filter.userId && event.userId !== filter.userId) {
        return false
      }

      return true
    })
  }

  /**
   * Get security event statistics
   */
  public getEventStats(filter?: SecurityEventFilter): SecurityEventStats {
    const events = this.getEvents(filter)

    const eventsByType: Record<SecurityEventType, number> = {
      [SecurityEventType.XSS_ATTEMPT]: 0,
      [SecurityEventType.TOKEN_TAMPERING]: 0,
      [SecurityEventType.SUSPICIOUS_LOGIN]: 0,
      [SecurityEventType.MULTIPLE_FAILED_ATTEMPTS]: 0,
      [SecurityEventType.TOKEN_REFRESH_FAILED]: 0,
      [SecurityEventType.CSP_VIOLATION]: 0,
      [SecurityEventType.MALICIOUS_CONTENT_DETECTED]: 0,
    }

    const eventsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    const eventsBySource: Record<string, number> = {}

    events.forEach((event) => {
      eventsByType[event.type]++
      eventsBySeverity[event.severity]++
      eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1
    })

    // Get recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentEvents = events.filter((event) => new Date(event.timestamp) > oneDayAgo).slice(-10) // Last 10 recent events

    // Get critical events
    const criticalEvents = events.filter((event) => event.severity === 'critical').slice(-5) // Last 5 critical events

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      eventsBySource,
      recentEvents,
      criticalEvents,
    }
  }

  /**
   * Clear all stored events
   */
  public clearEvents(): void {
    localStorage.removeItem('security_events')
    this.eventQueue = []
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: (event: SecurityEvent) => void): void {
    this.listeners.push(listener)
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: SecurityEvent) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Export events as JSON
   */
  public exportEvents(filter?: SecurityEventFilter): string {
    const events = this.getEvents(filter)
    return JSON.stringify(events, null, 2)
  }

  /**
   * Import events from JSON
   */
  public importEvents(jsonData: string): void {
    try {
      const events: SecurityEvent[] = JSON.parse(jsonData)

      // Validate events structure
      const validEvents = events.filter(
        (event) => event.type && event.timestamp && event.severity && event.source,
      )

      // Store imported events
      const existingEvents = this.getStoredEvents()
      const allEvents = [...existingEvents, ...validEvents]

      // Maintain max stored events limit
      if (allEvents.length > this.config.maxStoredEvents) {
        allEvents.splice(0, allEvents.length - this.config.maxStoredEvents)
      }

      localStorage.setItem('security_events', JSON.stringify(allEvents))
    } catch (error) {
      throw new Error(
        `Failed to import events: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get events by severity level
   */
  public getEventsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SecurityEvent[] {
    return this.getEvents({ severities: [severity] })
  }

  /**
   * Get events by type
   */
  public getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.getEvents({ types: [type] })
  }

  /**
   * Get recent events (last N hours)
   */
  public getRecentEvents(hours: number = 24): SecurityEvent[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.getEvents({
      dateRange: {
        start: cutoffTime,
        end: new Date(),
      },
    })
  }

  /**
   * Check if there are any critical events in the last N hours
   */
  public hasCriticalEvents(hours: number = 1): boolean {
    const recentCritical = this.getRecentEvents(hours).filter(
      (event) => event.severity === 'critical',
    )
    return recentCritical.length > 0
  }

  /**
   * Get configuration
   */
  public getConfig(): SecurityLoggerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SecurityLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart flush timer if interval changed
    if (newConfig.flushInterval) {
      this.startFlushTimer()
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Flush any remaining events
    this.flushEvents()

    this.listeners = []
    this.eventQueue = []
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance()
export default securityLogger
