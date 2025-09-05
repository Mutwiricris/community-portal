import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CSPManager, CSPViolation } from '../cspManager'

// Mock environment
const mockEnv = vi.hoisted(() => ({
  NODE_ENV: 'development',
}))

vi.mock('process', () => ({
  env: mockEnv,
}))

describe('CSPManager', () => {
  let cspManager: CSPManager
  let mockDocument: any
  let mockMeta: any
  let mockHead: any

  beforeEach(() => {
    // Reset environment
    mockEnv.NODE_ENV = 'development'

    // Mock DOM elements
    mockMeta = {
      httpEquiv: '',
      content: '',
      remove: vi.fn(),
    }

    mockHead = {
      appendChild: vi.fn(),
    }

    mockDocument = {
      createElement: vi.fn(() => mockMeta),
      querySelector: vi.fn(() => null),
      head: mockHead,
      addEventListener: vi.fn(),
    }

    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    })

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
    global.fetch = vi.fn()

    cspManager = CSPManager.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CSPManager.getInstance()
      const instance2 = CSPManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('generatePolicyString', () => {
    it('should generate valid CSP policy string for development', () => {
      const policy = cspManager.generatePolicyString()
      expect(policy).toContain("default-src 'self'")
      expect(policy).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
      expect(policy).toContain("object-src 'none'")
    })

    it('should generate strict CSP policy for production', () => {
      mockEnv.NODE_ENV = 'production'
      const prodCSPManager = new CSPManager()
      const policy = prodCSPManager.generatePolicyString()

      expect(policy).toContain("default-src 'self'")
      expect(policy).toContain("script-src 'self'")
      expect(policy).not.toContain("'unsafe-eval'")
      expect(policy).toContain('upgrade-insecure-requests')
      expect(policy).toContain('block-all-mixed-content')
    })
  })

  describe('updateConfig', () => {
    it('should update CSP configuration', () => {
      const newConfig = {
        'script-src': ["'self'", 'https://trusted-cdn.com'],
      }

      cspManager.updateConfig(newConfig)
      const policy = cspManager.generatePolicyString()

      expect(policy).toContain('https://trusted-cdn.com')
    })
  })

  describe('addAllowedSource', () => {
    it('should add new allowed source to directive', () => {
      cspManager.addAllowedSource('script-src', 'https://new-source.com')
      const config = cspManager.getConfig()

      expect(config['script-src']).toContain('https://new-source.com')
    })

    it('should not add duplicate sources', () => {
      cspManager.addAllowedSource('script-src', "'self'")
      const config = cspManager.getConfig()

      // Count occurrences of 'self'
      const selfCount = config['script-src'].filter((src) => src === "'self'").length
      expect(selfCount).toBe(1)
    })
  })

  describe('removeAllowedSource', () => {
    it('should remove allowed source from directive', () => {
      cspManager.addAllowedSource('script-src', 'https://remove-me.com')
      cspManager.removeAllowedSource('script-src', 'https://remove-me.com')
      const config = cspManager.getConfig()

      expect(config['script-src']).not.toContain('https://remove-me.com')
    })
  })

  describe('applyCSP', () => {
    it('should create and append CSP meta tag', () => {
      cspManager.applyCSP()

      expect(mockDocument.createElement).toHaveBeenCalledWith('meta')
      expect(mockMeta.httpEquiv).toBe('Content-Security-Policy')
      expect(mockMeta.content).toContain("default-src 'self'")
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockMeta)
    })

    it('should remove existing CSP meta tag before adding new one', () => {
      const existingMeta = { remove: vi.fn() }
      mockDocument.querySelector.mockReturnValue(existingMeta)

      cspManager.applyCSP()

      expect(existingMeta.remove).toHaveBeenCalled()
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockMeta)
    })
  })

  describe('violation handling', () => {
    it('should setup violation event listener', () => {
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function),
      )
    })

    it('should handle CSP violations', () => {
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

      const violation: CSPViolation = {
        blockedURI: 'https://malicious.com/script.js',
        columnNumber: 1,
        documentURI: 'https://example.com',
        effectiveDirective: 'script-src',
        lineNumber: 1,
        originalPolicy: "default-src 'self'",
        referrer: '',
        sample: '',
        sourceFile: '',
        statusCode: 200,
        violatedDirective: 'script-src',
      }

      // Get the violation handler
      const violationHandler = mockDocument.addEventListener.mock.calls.find(
        (call) => call[0] === 'securitypolicyviolation',
      )[1]

      // Simulate violation event
      violationHandler({ ...violation })

      expect(mockSetItem).toHaveBeenCalledWith(
        'csp_violations',
        expect.stringContaining('script-src'),
      )
    })

    it('should notify violation listeners', () => {
      const listener = vi.fn()
      cspManager.addViolationListener(listener)

      const violation: CSPViolation = {
        blockedURI: 'https://malicious.com/script.js',
        columnNumber: 1,
        documentURI: 'https://example.com',
        effectiveDirective: 'script-src',
        lineNumber: 1,
        originalPolicy: "default-src 'self'",
        referrer: '',
        sample: '',
        sourceFile: '',
        statusCode: 200,
        violatedDirective: 'script-src',
      }

      // Get the violation handler
      const violationHandler = mockDocument.addEventListener.mock.calls.find(
        (call) => call[0] === 'securitypolicyviolation',
      )[1]

      // Simulate violation event
      violationHandler({ ...violation })

      expect(listener).toHaveBeenCalledWith(violation)

      cspManager.removeViolationListener(listener)
    })
  })

  describe('validateConfiguration', () => {
    it('should validate development configuration as valid', () => {
      const result = cspManager.validateConfiguration()
      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should flag unsafe production configuration', () => {
      mockEnv.NODE_ENV = 'production'
      const prodCSPManager = new CSPManager()

      // Add unsafe directives
      prodCSPManager.updateConfig({
        'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        'object-src': ["'self'"],
        'base-uri': ['*'],
      })

      const result = prodCSPManager.validateConfiguration()
      expect(result.isValid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some((issue) => issue.includes("'unsafe-eval'"))).toBe(true)
    })
  })

  describe('getViolations', () => {
    it('should return violations from localStorage', () => {
      const mockViolations = [
        {
          type: 'CSP_VIOLATION',
          timestamp: new Date(),
          details: { violatedDirective: 'script-src' },
          severity: 'high',
          source: 'csp_manager',
        },
      ]

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => JSON.stringify(mockViolations)),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      })

      const violations = cspManager.getViolations()
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('CSP_VIOLATION')
    })

    it('should return empty array when no violations exist', () => {
      const violations = cspManager.getViolations()
      expect(violations).toHaveLength(0)
    })
  })

  describe('applyReportOnlyCSP', () => {
    it('should create report-only CSP meta tag', () => {
      cspManager.applyReportOnlyCSP()

      expect(mockDocument.createElement).toHaveBeenCalledWith('meta')
      expect(mockMeta.httpEquiv).toBe('Content-Security-Policy-Report-Only')
      expect(mockMeta.content).toContain("default-src 'self'")
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockMeta)
    })
  })

  describe('resetToDefault', () => {
    it('should reset configuration to default values', () => {
      // Modify configuration
      cspManager.updateConfig({
        'script-src': ['https://custom-source.com'],
      })

      // Reset to default
      cspManager.resetToDefault()

      const config = cspManager.getConfig()
      expect(config['script-src']).not.toContain('https://custom-source.com')
      expect(config['script-src']).toContain("'self'")
    })
  })
})
