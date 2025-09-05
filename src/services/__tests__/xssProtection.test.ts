import { describe, it, expect, beforeEach, vi } from 'vitest'
import { XSSProtection, InputType, SecurityEventType } from '../xssProtection'

describe('XSSProtection', () => {
  let xssProtection: XSSProtection

  beforeEach(() => {
    xssProtection = XSSProtection.getInstance()
    // Clear security events before each test
    xssProtection.clearSecurityEvents()
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
  })

  describe('sanitizeInput', () => {
    it('should sanitize basic HTML tags in text input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World'
      const result = xssProtection.sanitizeInput(maliciousInput, InputType.TEXT)
      expect(result).toBe('')
    })

    it('should sanitize email input by removing HTML tags', () => {
      const maliciousEmail = 'test@example.com<script>alert("xss")</script>'
      const result = xssProtection.sanitizeInput(maliciousEmail, InputType.EMAIL)
      expect(result).toBe('test@example.com')
    })

    it('should handle empty or null input', () => {
      expect(xssProtection.sanitizeInput('', InputType.TEXT)).toBe('')
      expect(xssProtection.sanitizeInput(null as any, InputType.TEXT)).toBe('')
      expect(xssProtection.sanitizeInput(undefined as any, InputType.TEXT)).toBe('')
    })

    it('should escape HTML entities in text input', () => {
      const input = 'Hello <world> & "friends"'
      const result = xssProtection.sanitizeInput(input, InputType.TEXT)
      expect(result).toBe('Hello &lt;world&gt; & "friends"')
    })

    it('should detect and block malicious password attempts', () => {
      const maliciousPassword = 'password<script>alert("xss")</script>'
      const result = xssProtection.sanitizeInput(maliciousPassword, InputType.PASSWORD)
      expect(result).toBe('')
    })

    it('should allow safe password input', () => {
      const safePassword = 'MySecurePassword123!'
      const result = xssProtection.sanitizeInput(safePassword, InputType.PASSWORD)
      expect(result).toBe('MySecurePassword123!')
    })
  })

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const safeHTML = '<p>Hello <strong>World</strong></p>'
      const result = xssProtection.sanitizeHTML(safeHTML)
      expect(result).toBe('<p>Hello <strong>World</strong></p>')
    })

    it('should remove dangerous HTML tags', () => {
      const dangerousHTML = '<p>Hello</p><script>alert("xss")</script><p>World</p>'
      const result = xssProtection.sanitizeHTML(dangerousHTML)
      expect(result).toBe('<p>Hello</p><p>World</p>')
    })

    it('should remove dangerous attributes', () => {
      const dangerousHTML = '<img src="image.jpg" onerror="alert(\'xss\')" alt="test">'
      const result = xssProtection.sanitizeHTML(dangerousHTML)
      expect(result).toBe('<img src="image.jpg" alt="test">')
    })

    it('should handle malformed HTML', () => {
      const malformedHTML = '<p>Hello <script>alert("xss")</p>'
      const result = xssProtection.sanitizeHTML(malformedHTML)
      expect(result).toBe('<p>Hello </p>')
    })
  })

  describe('validateInput', () => {
    it('should validate email format', () => {
      const validEmail = 'test@example.com'
      const result = xssProtection.validateInput(validEmail, InputType.EMAIL)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe(validEmail)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid email format', () => {
      const invalidEmail = 'invalid-email'
      const result = xssProtection.validateInput(invalidEmail, InputType.EMAIL)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should validate password length', () => {
      const shortPassword = '123'
      const result = xssProtection.validateInput(shortPassword, InputType.PASSWORD)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should validate URL format', () => {
      const validURL = 'https://example.com'
      const result = xssProtection.validateInput(validURL, InputType.URL)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe(validURL)
    })

    it('should reject malicious URLs', () => {
      const maliciousURL = 'javascript:alert("xss")'
      const result = xssProtection.validateInput(maliciousURL, InputType.URL)
      expect(result.isValid).toBe(false)
      expect(result.sanitizedValue).toBe('')
    })

    it('should warn when input is modified during sanitization', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = xssProtection.validateInput(input, InputType.TEXT)
      expect(result.warnings).toContain('Input was modified during sanitization')
    })
  })

  describe('detectMaliciousContent', () => {
    it('should detect script tags', () => {
      const maliciousContent = '<script>alert("xss")</script>'
      expect(xssProtection.detectMaliciousContent(maliciousContent)).toBe(true)
    })

    it('should detect javascript protocol', () => {
      const maliciousContent = 'javascript:alert("xss")'
      expect(xssProtection.detectMaliciousContent(maliciousContent)).toBe(true)
    })

    it('should detect event handlers', () => {
      const maliciousContent = '<img onerror="alert(\'xss\')" src="x">'
      expect(xssProtection.detectMaliciousContent(maliciousContent)).toBe(true)
    })

    it('should detect iframe tags', () => {
      const maliciousContent = '<iframe src="javascript:alert(\'xss\')"></iframe>'
      expect(xssProtection.detectMaliciousContent(maliciousContent)).toBe(true)
    })

    it('should not flag safe content', () => {
      const safeContent = 'Hello World! This is safe content.'
      expect(xssProtection.detectMaliciousContent(safeContent)).toBe(false)
    })

    it('should handle empty or null content', () => {
      expect(xssProtection.detectMaliciousContent('')).toBe(false)
      expect(xssProtection.detectMaliciousContent(null as any)).toBe(false)
      expect(xssProtection.detectMaliciousContent(undefined as any)).toBe(false)
    })
  })

  describe('logSecurityEvent', () => {
    it('should log security events to localStorage', () => {
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

      const event = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'high' as const,
        source: 'test',
      }

      xssProtection.logSecurityEvent(event)
      expect(mockSetItem).toHaveBeenCalledWith(
        'security_events',
        expect.stringContaining('XSS_ATTEMPT'),
      )
    })

    it('should notify security event listeners', () => {
      const listener = vi.fn()
      xssProtection.addSecurityEventListener(listener)

      const event = {
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: { test: 'data' },
        severity: 'high' as const,
        source: 'test',
      }

      xssProtection.logSecurityEvent(event)
      expect(listener).toHaveBeenCalledWith(event)

      xssProtection.removeSecurityEventListener(listener)
    })
  })

  describe('setupCSP', () => {
    it('should create CSP meta tag', () => {
      // Mock document
      const mockMeta = {
        httpEquiv: '',
        content: '',
        remove: vi.fn(),
      }
      const mockHead = {
        appendChild: vi.fn(),
      }
      const mockDocument = {
        createElement: vi.fn(() => mockMeta),
        querySelector: vi.fn(() => null),
        head: mockHead,
        addEventListener: vi.fn(),
      }

      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
      })

      xssProtection.setupCSP()

      expect(mockDocument.createElement).toHaveBeenCalledWith('meta')
      expect(mockMeta.httpEquiv).toBe('Content-Security-Policy')
      expect(mockMeta.content).toContain("default-src 'self'")
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockMeta)
    })
  })

  describe('getSecurityEvents', () => {
    it('should return security events from localStorage', () => {
      const mockEvents = [
        {
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: { test: 'data' },
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

      const events = xssProtection.getSecurityEvents()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.XSS_ATTEMPT)
    })

    it('should return empty array when no events exist', () => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const events = xssProtection.getSecurityEvents()
      expect(events).toHaveLength(0)
    })
  })
})
