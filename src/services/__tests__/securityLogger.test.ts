import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SecurityLogger, SecurityEventFilter } from '../securityLogger'
import { SecurityEvent, SecurityEventType } from '../xssProtection'

// Mock timers
vi.useFakeTimers()

describe('SecurityLogger', () => {
  let securityLogger: SecurityLogger
  let mockFetch: any

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
    mockFetch = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'test-agent',
      },
      writable: true,
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://test.com',
      },
      writable: true,
    })

    // Mock console methods
    console.error = vi.fn()
    console.warn = vi.fn()
    console.info = vi.fn()

    securityLogger = SecurityLogger.getInstance({
      maxStoredEvents: 100,
      enableConsoleLogging: true,
      enableRemoteLogging: true,
      batchSize: 5,
      flushInterval: 1000,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    securityLogger.destroy()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SecurityLogger.getInstance()
      const instance2 = SecurityLogger.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('logEvent', () => {
    it('should log event with timestamp', () => {
      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'high',
        source: 'test',
      }

      securityLogger.logEvent(event)
      expect(event.timestamp).toBeDefined()
    })

    it('should add timestamp if not provided', () => {
      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        details: { test: 'data' },
        severity: 'high',
        source: 'test',
      } as any

      securityLogger.logEvent(event)
      expect(event.timestamp).toBeDefined()
    })

    it('should log to console in development', () => {
      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'critical',
        source: 'test',
      }

      securityLogger.logEvent(event)
      expect(console.error).toHaveBeenCalled()
    })

    it('should store event locally', () => {
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => '[]'),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'high',
        source: 'test',
      }

      securityLogger.logEvent(event)
      expect(mockSetItem).toHaveBeenCalledWith('security_events', expect.any(String))
    })

    it('should notify listeners', () => {
      const listener = vi.fn()
      securityLogger.addEventListener(listener)

      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'high',
        source: 'test',
      }

      securityLogger.logEvent(event)
      expect(listener).toHaveBeenCalledWith(event)

      securityLogger.removeEventListener(listener)
    })

    it('should flush immediately for critical events', async () => {
      const event: SecurityEvent = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'critical',
        source: 'test',
      }

      securityLogger.logEvent(event)

      // Wait for async flush
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/security/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('critical'),
        }),
      )
    })

    it('should flush when batch size is reached', async () => {
      // Log multiple events to reach batch size
      for (let i = 0; i < 5; i++) {
        const event: SecurityEvent = {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: { test: `data${i}` },
          severity: 'medium',
          source: 'test',
        }
        securityLogger.logEvent(event)
      }

      await vi.runAllTimersAsync()
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('getEvents', () => {
    beforeEach(() => {
      const mockEvents = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date('2023-01-01'),
          details: {},
          severity: 'high',
          source: 'test1',
          userId: 'user1',
        },
        {
          type: SecurityEventType.CSP_VIOLATION,
          timestamp: new Date('2023-01-02'),
          details: {},
          severity: 'medium',
          source: 'test2',
          userId: 'user2',
        },
      ]

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(mockEvents)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
    })

    it('should return all events without filter', () => {
      const events = securityLogger.getEvents()
      expect(events).toHaveLength(2)
    })

    it('should filter events by type', () => {
      const filter: SecurityEventFilter = {
        types: [SecurityEventType.XSS_ATTEMPT],
      }
      const events = securityLogger.getEvents(filter)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.XSS_ATTEMPT)
    })

    it('should filter events by severity', () => {
      const filter: SecurityEventFilter = {
        severities: ['high'],
      }
      const events = securityLogger.getEvents(filter)
      expect(events).toHaveLength(1)
      expect(events[0].severity).toBe('high')
    })

    it('should filter events by source', () => {
      const filter: SecurityEventFilter = {
        sources: ['test1'],
      }
      const events = securityLogger.getEvents(filter)
      expect(events).toHaveLength(1)
      expect(events[0].source).toBe('test1')
    })

    it('should filter events by date range', () => {
      const filter: SecurityEventFilter = {
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-01-01T23:59:59'),
        },
      }
      const events = securityLogger.getEvents(filter)
      expect(events).toHaveLength(1)
    })

    it('should filter events by user ID', () => {
      const filter: SecurityEventFilter = {
        userId: 'user1',
      }
      const events = securityLogger.getEvents(filter)
      expect(events).toHaveLength(1)
      expect(events[0].userId).toBe('user1')
    })
  })

  describe('getEventStats', () => {
    beforeEach(() => {
      const mockEvents = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: {},
          severity: 'high',
          source: 'test1',
        },
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: {},
          severity: 'critical',
          source: 'test1',
        },
        {
          type: SecurityEventType.CSP_VIOLATION,
          timestamp: new Date(),
          details: {},
          severity: 'medium',
          source: 'test2',
        },
      ]

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(mockEvents)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
    })

    it('should return correct event statistics', () => {
      const stats = securityLogger.getEventStats()

      expect(stats.totalEvents).toBe(3)
      expect(stats.eventsByType[SecurityEventType.XSS_ATTEMPT]).toBe(2)
      expect(stats.eventsByType[SecurityEventType.CSP_VIOLATION]).toBe(1)
      expect(stats.eventsBySeverity.high).toBe(1)
      expect(stats.eventsBySeverity.critical).toBe(1)
      expect(stats.eventsBySeverity.medium).toBe(1)
      expect(stats.eventsBySource.test1).toBe(2)
      expect(stats.eventsBySource.test2).toBe(1)
      expect(stats.criticalEvents).toHaveLength(1)
    })
  })

  describe('clearEvents', () => {
    it('should clear stored events and queue', () => {
      const mockRemoveItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: mockRemoveItem,
          clear: vi.fn(),
        },
        writable: true,
      })

      securityLogger.clearEvents()
      expect(mockRemoveItem).toHaveBeenCalledWith('security_events')
    })
  })

  describe('exportEvents', () => {
    it('should export events as JSON string', () => {
      const mockEvents = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: {},
          severity: 'high',
          source: 'test',
        },
      ]

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(mockEvents)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const exported = securityLogger.exportEvents()
      expect(typeof exported).toBe('string')
      expect(JSON.parse(exported)).toHaveLength(1)
    })
  })

  describe('importEvents', () => {
    it('should import events from JSON string', () => {
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => '[]'),
          setItem: mockSetItem,
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const eventsToImport = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: {},
          severity: 'high',
          source: 'imported',
        },
      ]

      securityLogger.importEvents(JSON.stringify(eventsToImport))
      expect(mockSetItem).toHaveBeenCalledWith('security_events', expect.any(String))
    })

    it('should throw error for invalid JSON', () => {
      expect(() => {
        securityLogger.importEvents('invalid json')
      }).toThrow('Failed to import events')
    })
  })

  describe('utility methods', () => {
    beforeEach(() => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const mockEvents = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: now,
          details: {},
          severity: 'critical',
          source: 'test',
        },
        {
          type: SecurityEventType.CSP_VIOLATION,
          timestamp: oneHourAgo,
          details: {},
          severity: 'medium',
          source: 'test',
        },
      ]

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(mockEvents)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })
    })

    it('should get events by severity', () => {
      const criticalEvents = securityLogger.getEventsBySeverity('critical')
      expect(criticalEvents).toHaveLength(1)
      expect(criticalEvents[0].severity).toBe('critical')
    })

    it('should get events by type', () => {
      const xssEvents = securityLogger.getEventsByType(SecurityEventType.XSS_ATTEMPT)
      expect(xssEvents).toHaveLength(1)
      expect(xssEvents[0].type).toBe(SecurityEventType.XSS_ATTEMPT)
    })

    it('should check for critical events', () => {
      expect(securityLogger.hasCriticalEvents(2)).toBe(true)
      expect(securityLogger.hasCriticalEvents(0.5)).toBe(false)
    })
  })

  describe('configuration', () => {
    it('should get current configuration', () => {
      const config = securityLogger.getConfig()
      expect(config.maxStoredEvents).toBe(100)
      expect(config.batchSize).toBe(5)
    })

    it('should update configuration', () => {
      securityLogger.updateConfig({
        maxStoredEvents: 200,
        batchSize: 10,
      })

      const config = securityLogger.getConfig()
      expect(config.maxStoredEvents).toBe(200)
      expect(config.batchSize).toBe(10)
    })
  })
})
