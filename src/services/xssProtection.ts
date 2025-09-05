import DOMPurify from 'dompurify'

export enum InputType {
  TEXT = 'text',
  EMAIL = 'email',
  HTML = 'html',
  URL = 'url',
  PASSWORD = 'password',
}

export interface ValidationResult {
  isValid: boolean
  sanitizedValue: string
  errors: string[]
  warnings: string[]
}

export interface SecurityEvent {
  type: SecurityEventType
  timestamp: Date
  userId?: string
  sessionId?: string
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
}

export enum SecurityEventType {
  XSS_ATTEMPT = 'xss_attempt',
  TOKEN_TAMPERING = 'token_tampering',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  CSP_VIOLATION = 'csp_violation',
  MALICIOUS_CONTENT_DETECTED = 'malicious_content_detected',
}

export class XSSProtection {
  private static instance: XSSProtection
  private maliciousPatterns: RegExp[]
  private securityEventListeners: ((event: SecurityEvent) => void)[] = []

  constructor() {
    // Common XSS attack patterns
    this.maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<svg\b[^>]*onload/gi,
      /<img\b[^>]*onerror/gi,
    ]
  }

  public static getInstance(): XSSProtection {
    if (!XSSProtection.instance) {
      XSSProtection.instance = new XSSProtection()
    }
    return XSSProtection.instance
  }

  /**
   * Sanitize user input based on input type
   */
  public sanitizeInput(input: string, type: InputType = InputType.TEXT): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    let sanitized = input.trim()

    switch (type) {
      case InputType.EMAIL:
        // Remove any HTML tags and dangerous characters
        sanitized = sanitized.replace(/<[^>]*>/g, '')
        sanitized = sanitized.replace(/[<>'"]/g, '')
        break

      case InputType.PASSWORD:
        // For passwords, we don't sanitize content but check for suspicious patterns
        if (this.detectMaliciousContent(sanitized)) {
          this.logSecurityEvent({
            type: SecurityEventType.XSS_ATTEMPT,
            timestamp: new Date(),
            details: { input: sanitized.substring(0, 100), type },
            severity: 'high',
            source: 'password_input',
          })
          return ''
        }
        return sanitized

      case InputType.URL:
        // Validate and sanitize URLs
        sanitized = this.sanitizeURL(sanitized)
        break

      case InputType.HTML:
        // Use DOMPurify for HTML content
        sanitized = this.sanitizeHTML(sanitized)
        break

      case InputType.TEXT:
      default:
        // Basic text sanitization
        sanitized = sanitized.replace(/[<>]/g, (match) => {
          return match === '<' ? '&lt;' : '&gt;'
        })
        break
    }

    // Check for malicious patterns
    if (this.detectMaliciousContent(sanitized)) {
      this.logSecurityEvent({
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: {
          originalInput: input.substring(0, 100),
          sanitizedInput: sanitized.substring(0, 100),
          type,
        },
        severity: 'high',
        source: 'input_sanitization',
      })

      // Return empty string for highly suspicious content
      return ''
    }

    return sanitized
  }

  /**
   * Sanitize HTML content using DOMPurify
   */
  public sanitizeHTML(html: string): string {
    if (!html || typeof html !== 'string') {
      return ''
    }

    try {
      // Configure DOMPurify
      const cleanHTML = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a', 'img'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
        ALLOW_DATA_ATTR: false,
        FORBID_SCRIPT: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'iframe'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      })

      return cleanHTML
    } catch (error) {
      console.error('HTML sanitization failed:', error)
      this.logSecurityEvent({
        type: SecurityEventType.XSS_ATTEMPT,
        timestamp: new Date(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          html: html.substring(0, 100),
        },
        severity: 'medium',
        source: 'html_sanitization',
      })
      return ''
    }
  }

  /**
   * Validate and sanitize URLs
   */
  private sanitizeURL(url: string): string {
    try {
      // Remove dangerous protocols
      if (url.match(/^(javascript|data|vbscript):/i)) {
        this.logSecurityEvent({
          type: SecurityEventType.XSS_ATTEMPT,
          timestamp: new Date(),
          details: { url: url.substring(0, 100) },
          severity: 'high',
          source: 'url_sanitization',
        })
        return ''
      }

      // Validate URL structure
      const urlObj = new URL(url)

      // Only allow http, https, and mailto protocols
      if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
        return ''
      }

      return urlObj.toString()
    } catch (error) {
      // Invalid URL
      return ''
    }
  }

  /**
   * Validate input and return detailed validation result
   */
  public validateInput(input: string, type: InputType): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      sanitizedValue: '',
      errors: [],
      warnings: [],
    }

    if (!input || typeof input !== 'string') {
      result.isValid = false
      result.errors.push('Input is required and must be a string')
      return result
    }

    // Sanitize the input
    result.sanitizedValue = this.sanitizeInput(input, type)

    // Check if sanitization changed the input significantly
    if (result.sanitizedValue !== input) {
      result.warnings.push('Input was modified during sanitization')
    }

    // Type-specific validation
    switch (type) {
      case InputType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(result.sanitizedValue)) {
          result.isValid = false
          result.errors.push('Invalid email format')
        }
        break

      case InputType.URL:
        if (result.sanitizedValue && !this.isValidURL(result.sanitizedValue)) {
          result.isValid = false
          result.errors.push('Invalid URL format')
        }
        break

      case InputType.PASSWORD:
        if (result.sanitizedValue.length < 8) {
          result.isValid = false
          result.errors.push('Password must be at least 8 characters long')
        }
        break
    }

    // Check for malicious content
    if (this.detectMaliciousContent(result.sanitizedValue)) {
      result.isValid = false
      result.errors.push('Input contains potentially malicious content')
      result.sanitizedValue = ''
    }

    return result
  }

  /**
   * Detect malicious content in input
   */
  public detectMaliciousContent(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false
    }

    // Check against known malicious patterns
    for (const pattern of this.maliciousPatterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    // Check for suspicious character combinations
    const suspiciousPatterns = [/&lt;script/gi, /&gt;.*&lt;/gi, /&#x/gi, /\\u00/gi]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    return false
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Set up Content Security Policy
   */
  public setupCSP(): void {
    if (typeof document === 'undefined') {
      return // Server-side rendering
    }

    const cspMeta = document.createElement('meta')
    cspMeta.httpEquiv = 'Content-Security-Policy'

    const cspPolicy = this.generateCSPPolicy()
    cspMeta.content = cspPolicy

    // Remove existing CSP meta tag if present
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (existingCSP) {
      existingCSP.remove()
    }

    document.head.appendChild(cspMeta)

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      this.logSecurityEvent({
        type: SecurityEventType.CSP_VIOLATION,
        timestamp: new Date(),
        details: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          documentURI: event.documentURI,
          originalPolicy: event.originalPolicy,
        },
        severity: 'medium',
        source: 'csp_violation',
      })
    })
  }

  /**
   * Generate CSP policy based on environment
   */
  private generateCSPPolicy(): string {
    const isDevelopment = process.env.NODE_ENV === 'development'

    const policy = {
      'default-src': ["'self'"],
      'script-src': isDevelopment ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"] : ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://api.yourdomain.com', 'wss:', 'ws:'],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': isDevelopment ? [] : [''],
    }

    return Object.entries(policy)
      .filter(([_, values]) => values.length > 0)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ')
  }

  /**
   * Log security events
   */
  public logSecurityEvent(event: SecurityEvent): void {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security Event:', event)
    }

    // Store in localStorage for development, send to API in production
    try {
      const existingEvents = JSON.parse(localStorage.getItem('security_events') || '[]')
      existingEvents.push(event)

      // Keep only last 100 events
      if (existingEvents.length > 100) {
        existingEvents.splice(0, existingEvents.length - 100)
      }

      localStorage.setItem('security_events', JSON.stringify(existingEvents))
    } catch (error) {
      console.error('Failed to log security event:', error)
    }

    // Notify listeners
    this.securityEventListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Security event listener error:', error)
      }
    })
  }

  /**
   * Add security event listener
   */
  public addSecurityEventListener(listener: (event: SecurityEvent) => void): void {
    this.securityEventListeners.push(listener)
  }

  /**
   * Remove security event listener
   */
  public removeSecurityEventListener(listener: (event: SecurityEvent) => void): void {
    const index = this.securityEventListeners.indexOf(listener)
    if (index > -1) {
      this.securityEventListeners.splice(index, 1)
    }
  }

  /**
   * Get security events from storage
   */
  public getSecurityEvents(): SecurityEvent[] {
    try {
      return JSON.parse(localStorage.getItem('security_events') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear security events
   */
  public clearSecurityEvents(): void {
    localStorage.removeItem('security_events')
  }
}

// Export singleton instance
export const xssProtection = XSSProtection.getInstance()
export default xssProtection
