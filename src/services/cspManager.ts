import { SecurityEvent, SecurityEventType } from './xssProtection'

export interface CSPViolation {
  blockedURI: string
  columnNumber: number
  documentURI: string
  effectiveDirective: string
  lineNumber: number
  originalPolicy: string
  referrer: string
  sample: string
  sourceFile: string
  statusCode: number
  violatedDirective: string
}

export interface CSPConfig {
  'default-src': string[]
  'script-src': string[]
  'style-src': string[]
  'img-src': string[]
  'font-src': string[]
  'connect-src': string[]
  'media-src': string[]
  'object-src': string[]
  'base-uri': string[]
  'form-action': string[]
  'frame-ancestors': string[]
  'upgrade-insecure-requests'?: string[]
  'block-all-mixed-content'?: string[]
  'require-sri-for'?: string[]
}

export class CSPManager {
  private static instance: CSPManager
  private config: CSPConfig
  private violationListeners: ((violation: CSPViolation) => void)[] = []
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.config = this.getDefaultConfig()
    this.setupViolationReporting()
  }

  public static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager()
    }
    return CSPManager.instance
  }

  /**
   * Get default CSP configuration based on environment
   */
  private getDefaultConfig(): CSPConfig {
    const baseConfig: CSPConfig = {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    }

    if (this.isProduction) {
      // Production: Strict CSP
      baseConfig['upgrade-insecure-requests'] = ['']
      baseConfig['block-all-mixed-content'] = ['']
      baseConfig['require-sri-for'] = ['script', 'style']
    } else {
      // Development: More permissive for hot reload and dev tools
      baseConfig['script-src'] = [
        "'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        'http://localhost:*',
        'ws://localhost:*',
      ]
      baseConfig['connect-src'] = [
        "'self'",
        'http://localhost:*',
        'ws://localhost:*',
        'wss://localhost:*',
      ]
      baseConfig['style-src'] = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
    }

    return baseConfig
  }

  /**
   * Update CSP configuration
   */
  public updateConfig(newConfig: Partial<CSPConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.applyCSP()
  }

  /**
   * Add allowed source to a directive
   */
  public addAllowedSource(directive: keyof CSPConfig, source: string): void {
    if (!this.config[directive]) {
      this.config[directive] = []
    }

    if (!this.config[directive].includes(source)) {
      this.config[directive].push(source)
      this.applyCSP()
    }
  }

  /**
   * Remove allowed source from a directive
   */
  public removeAllowedSource(directive: keyof CSPConfig, source: string): void {
    if (this.config[directive]) {
      const index = this.config[directive].indexOf(source)
      if (index > -1) {
        this.config[directive].splice(index, 1)
        this.applyCSP()
      }
    }
  }

  /**
   * Generate CSP policy string
   */
  public generatePolicyString(): string {
    return Object.entries(this.config)
      .filter(([_, values]) => values && values.length > 0)
      .map(([directive, values]) => {
        if (values.length === 1 && values[0] === '') {
          // For directives like upgrade-insecure-requests that don't need values
          return directive.replace(/-/g, '-')
        }
        return `${directive} ${values.join(' ')}`
      })
      .join('; ')
  }

  /**
   * Apply CSP to the document
   */
  public applyCSP(): void {
    if (typeof document === 'undefined') {
      return // Server-side rendering
    }

    try {
      // Remove existing CSP meta tag
      const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (existingCSP) {
        existingCSP.remove()
      }

      // Create new CSP meta tag
      const cspMeta = document.createElement('meta')
      cspMeta.httpEquiv = 'Content-Security-Policy'
      cspMeta.content = this.generatePolicyString()

      document.head.appendChild(cspMeta)

      console.log('CSP Applied:', cspMeta.content)
    } catch (error) {
      console.error('Failed to apply CSP:', error)
    }
  }

  /**
   * Setup CSP violation reporting
   */
  private setupViolationReporting(): void {
    if (typeof document === 'undefined') {
      return
    }

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation: CSPViolation = {
        blockedURI: event.blockedURI,
        columnNumber: event.columnNumber,
        documentURI: event.documentURI,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy,
        referrer: event.referrer,
        sample: event.sample,
        sourceFile: event.sourceFile,
        statusCode: event.statusCode,
        violatedDirective: event.violatedDirective,
      }

      this.handleViolation(violation)
    })
  }

  /**
   * Handle CSP violations
   */
  private handleViolation(violation: CSPViolation): void {
    // Log the violation
    const securityEvent: SecurityEvent = {
      type: SecurityEventType.CSP_VIOLATION,
      timestamp: new Date(),
      details: violation,
      severity: this.getViolationSeverity(violation),
      source: 'csp_manager',
    }

    // Store violation in localStorage for development
    if (!this.isProduction) {
      console.warn('CSP Violation:', violation)
    }

    this.logViolation(securityEvent)

    // Notify listeners
    this.violationListeners.forEach((listener) => {
      try {
        listener(violation)
      } catch (error) {
        console.error('CSP violation listener error:', error)
      }
    })
  }

  /**
   * Determine violation severity
   */
  private getViolationSeverity(violation: CSPViolation): 'low' | 'medium' | 'high' | 'critical' {
    const { violatedDirective, blockedURI } = violation

    // Critical: Script injection attempts
    if (
      violatedDirective.includes('script-src') &&
      (blockedURI.includes('javascript:') || blockedURI.includes('data:text/html'))
    ) {
      return 'critical'
    }

    // High: Inline script/style violations
    if (violatedDirective.includes('script-src') || violatedDirective.includes('style-src')) {
      return 'high'
    }

    // Medium: Resource loading violations
    if (
      violatedDirective.includes('img-src') ||
      violatedDirective.includes('font-src') ||
      violatedDirective.includes('connect-src')
    ) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Log CSP violation
   */
  private logViolation(event: SecurityEvent): void {
    try {
      // Store in localStorage for development
      const existingViolations = JSON.parse(localStorage.getItem('csp_violations') || '[]')
      existingViolations.push(event)

      // Keep only last 50 violations
      if (existingViolations.length > 50) {
        existingViolations.splice(0, existingViolations.length - 50)
      }

      localStorage.setItem('csp_violations', JSON.stringify(existingViolations))

      // In production, send to monitoring service
      if (this.isProduction) {
        this.sendViolationToMonitoring(event)
      }
    } catch (error) {
      console.error('Failed to log CSP violation:', error)
    }
  }

  /**
   * Send violation to monitoring service (production)
   */
  private async sendViolationToMonitoring(event: SecurityEvent): Promise<void> {
    try {
      // This would be your actual monitoring endpoint
      await fetch('/api/security/csp-violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    } catch (error) {
      console.error('Failed to send CSP violation to monitoring:', error)
    }
  }

  /**
   * Add CSP violation listener
   */
  public addViolationListener(listener: (violation: CSPViolation) => void): void {
    this.violationListeners.push(listener)
  }

  /**
   * Remove CSP violation listener
   */
  public removeViolationListener(listener: (violation: CSPViolation) => void): void {
    const index = this.violationListeners.indexOf(listener)
    if (index > -1) {
      this.violationListeners.splice(index, 1)
    }
  }

  /**
   * Get CSP violations from storage
   */
  public getViolations(): SecurityEvent[] {
    try {
      return JSON.parse(localStorage.getItem('csp_violations') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear CSP violations
   */
  public clearViolations(): void {
    localStorage.removeItem('csp_violations')
  }

  /**
   * Get current CSP configuration
   */
  public getConfig(): CSPConfig {
    return { ...this.config }
  }

  /**
   * Reset CSP to default configuration
   */
  public resetToDefault(): void {
    this.config = this.getDefaultConfig()
    this.applyCSP()
  }

  /**
   * Check if CSP is properly configured
   */
  public validateConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check for common misconfigurations
    if (this.config['script-src'].includes("'unsafe-eval'") && this.isProduction) {
      issues.push("'unsafe-eval' should not be used in production")
    }

    if (this.config['script-src'].includes("'unsafe-inline'") && this.isProduction) {
      issues.push("'unsafe-inline' for scripts should be avoided in production")
    }

    if (!this.config['object-src'].includes("'none'")) {
      issues.push("object-src should be set to 'none' for security")
    }

    if (!this.config['base-uri'].includes("'self'")) {
      issues.push("base-uri should be restricted to 'self'")
    }

    if (this.isProduction && !this.config['upgrade-insecure-requests']) {
      issues.push('upgrade-insecure-requests should be enabled in production')
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * Generate CSP report-only policy for testing
   */
  public generateReportOnlyPolicy(): string {
    return this.generatePolicyString()
  }

  /**
   * Apply CSP in report-only mode for testing
   */
  public applyReportOnlyCSP(): void {
    if (typeof document === 'undefined') {
      return
    }

    try {
      // Remove existing report-only CSP meta tag
      const existingCSP = document.querySelector(
        'meta[http-equiv="Content-Security-Policy-Report-Only"]',
      )
      if (existingCSP) {
        existingCSP.remove()
      }

      // Create new report-only CSP meta tag
      const cspMeta = document.createElement('meta')
      cspMeta.httpEquiv = 'Content-Security-Policy-Report-Only'
      cspMeta.content = this.generateReportOnlyPolicy()

      document.head.appendChild(cspMeta)

      console.log('CSP Report-Only Applied:', cspMeta.content)
    } catch (error) {
      console.error('Failed to apply report-only CSP:', error)
    }
  }
}

// Export singleton instance
export const cspManager = CSPManager.getInstance()
export default cspManager
