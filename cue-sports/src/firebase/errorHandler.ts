import { FirebaseError } from 'firebase/app'

export interface FirebaseErrorInfo {
  code: string
  message: string
  userMessage: string
  severity: 'error' | 'warning' | 'info'
  retryable: boolean
}

// Map Firebase error codes to user-friendly messages
const errorMap: Record<string, FirebaseErrorInfo> = {
  // Auth errors
  'auth/invalid-email': {
    code: 'auth/invalid-email',
    message: 'Invalid email address',
    userMessage: 'Please enter a valid email address.',
    severity: 'error',
    retryable: false
  },
  'auth/user-disabled': {
    code: 'auth/user-disabled',
    message: 'User account disabled',
    userMessage: 'This account has been disabled. Please contact support.',
    severity: 'error',
    retryable: false
  },
  'auth/user-not-found': {
    code: 'auth/user-not-found',
    message: 'User not found',
    userMessage: 'No account found with this email address.',
    severity: 'error',
    retryable: false
  },
  'auth/wrong-password': {
    code: 'auth/wrong-password',
    message: 'Incorrect password',
    userMessage: 'Incorrect password. Please try again.',
    severity: 'error',
    retryable: true
  },
  'auth/email-already-in-use': {
    code: 'auth/email-already-in-use',
    message: 'Email already in use',
    userMessage: 'An account already exists with this email address.',
    severity: 'error',
    retryable: false
  },
  'auth/weak-password': {
    code: 'auth/weak-password',
    message: 'Weak password',
    userMessage: 'Password should be at least 6 characters long.',
    severity: 'error',
    retryable: false
  },
  'auth/network-request-failed': {
    code: 'auth/network-request-failed',
    message: 'Network error',
    userMessage: 'Network error. Please check your connection and try again.',
    severity: 'error',
    retryable: true
  },
  'auth/too-many-requests': {
    code: 'auth/too-many-requests',
    message: 'Too many requests',
    userMessage: 'Too many failed attempts. Please try again later.',
    severity: 'warning',
    retryable: true
  },
  'auth/popup-blocked': {
    code: 'auth/popup-blocked',
    message: 'Popup blocked',
    userMessage: 'Please allow popups for this site to sign in.',
    severity: 'warning',
    retryable: true
  },
  'auth/operation-not-allowed': {
    code: 'auth/operation-not-allowed',
    message: 'Operation not allowed',
    userMessage: 'This sign-in method is not enabled. Please contact support.',
    severity: 'error',
    retryable: false
  },
  'auth/invalid-credential': {
    code: 'auth/invalid-credential',
    message: 'Invalid credentials',
    userMessage: 'Invalid login credentials. Please try again.',
    severity: 'error',
    retryable: true
  },

  // Firestore errors
  'permission-denied': {
    code: 'permission-denied',
    message: 'Permission denied',
    userMessage: 'You don\'t have permission to perform this action.',
    severity: 'error',
    retryable: false
  },
  'not-found': {
    code: 'not-found',
    message: 'Document not found',
    userMessage: 'The requested data could not be found.',
    severity: 'error',
    retryable: false
  },
  'already-exists': {
    code: 'already-exists',
    message: 'Document already exists',
    userMessage: 'This item already exists.',
    severity: 'error',
    retryable: false
  },
  'resource-exhausted': {
    code: 'resource-exhausted',
    message: 'Quota exceeded',
    userMessage: 'Service quota exceeded. Please try again later.',
    severity: 'warning',
    retryable: true
  },
  'failed-precondition': {
    code: 'failed-precondition',
    message: 'Failed precondition',
    userMessage: 'The operation could not be completed. Please try again.',
    severity: 'error',
    retryable: true
  },
  'aborted': {
    code: 'aborted',
    message: 'Operation aborted',
    userMessage: 'The operation was cancelled. Please try again.',
    severity: 'warning',
    retryable: true
  },
  'out-of-range': {
    code: 'out-of-range',
    message: 'Out of range',
    userMessage: 'The requested data is out of range.',
    severity: 'error',
    retryable: false
  },
  'unimplemented': {
    code: 'unimplemented',
    message: 'Not implemented',
    userMessage: 'This feature is not yet available.',
    severity: 'info',
    retryable: false
  },
  'internal': {
    code: 'internal',
    message: 'Internal error',
    userMessage: 'An internal error occurred. Please try again later.',
    severity: 'error',
    retryable: true
  },
  'unavailable': {
    code: 'unavailable',
    message: 'Service unavailable',
    userMessage: 'The service is temporarily unavailable. Please try again later.',
    severity: 'warning',
    retryable: true
  },
  'data-loss': {
    code: 'data-loss',
    message: 'Data loss',
    userMessage: 'Data loss detected. Please contact support.',
    severity: 'error',
    retryable: false
  },
  'unauthenticated': {
    code: 'unauthenticated',
    message: 'Not authenticated',
    userMessage: 'Please sign in to continue.',
    severity: 'warning',
    retryable: false
  },

  // Storage errors
  'storage/unauthorized': {
    code: 'storage/unauthorized',
    message: 'Unauthorized',
    userMessage: 'You don\'t have permission to access this file.',
    severity: 'error',
    retryable: false
  },
  'storage/canceled': {
    code: 'storage/canceled',
    message: 'Upload cancelled',
    userMessage: 'File upload was cancelled.',
    severity: 'info',
    retryable: true
  },
  'storage/unknown': {
    code: 'storage/unknown',
    message: 'Unknown error',
    userMessage: 'An unknown error occurred during file upload.',
    severity: 'error',
    retryable: true
  },
  'storage/object-not-found': {
    code: 'storage/object-not-found',
    message: 'File not found',
    userMessage: 'The requested file could not be found.',
    severity: 'error',
    retryable: false
  },
  'storage/quota-exceeded': {
    code: 'storage/quota-exceeded',
    message: 'Storage quota exceeded',
    userMessage: 'Storage quota exceeded. Please free up space or upgrade your plan.',
    severity: 'error',
    retryable: false
  },
  'storage/invalid-checksum': {
    code: 'storage/invalid-checksum',
    message: 'Invalid file',
    userMessage: 'File upload failed. The file may be corrupted.',
    severity: 'error',
    retryable: true
  },
  'storage/retry-limit-exceeded': {
    code: 'storage/retry-limit-exceeded',
    message: 'Retry limit exceeded',
    userMessage: 'File upload failed after multiple attempts. Please try again later.',
    severity: 'error',
    retryable: true
  }
}

// Default error for unknown codes
const defaultError: FirebaseErrorInfo = {
  code: 'unknown',
  message: 'Unknown error',
  userMessage: 'An unexpected error occurred. Please try again.',
  severity: 'error',
  retryable: true
}

// Handle Firebase errors
export const handleFirebaseError = (error: unknown): FirebaseErrorInfo => {
  if (error instanceof FirebaseError) {
    return errorMap[error.code] || {
      ...defaultError,
      code: error.code,
      message: error.message,
      userMessage: `Error: ${error.message}`
    }
  }

  if (error instanceof Error) {
    // Check for Firestore-specific error patterns
    const firestoreMatch = error.message.match(/\[(.*?)\]/)
    if (firestoreMatch) {
      const code = firestoreMatch[1]
      return errorMap[code] || {
        ...defaultError,
        code,
        message: error.message
      }
    }

    return {
      ...defaultError,
      message: error.message,
      userMessage: error.message
    }
  }

  return defaultError
}

// Log error with context
export const logFirebaseError = (
  error: unknown,
  context: string,
  additionalData?: Record<string, any>
) => {
  // Handle success case (when error is null or undefined)
  if (error === null || error === undefined) {
    const logData = {
      context,
      code: 'success',
      message: 'Operation completed successfully',
      userMessage: 'Operation completed successfully',
      severity: 'info',
      retryable: false,
      timestamp: new Date().toISOString(),
      ...additionalData
    }
    
    // Only log success in development or when explicitly requested
    if (import.meta.env.DEV && context.includes('success')) {
      console.info('Firebase Success:', logData)
    }
    return
  }

  const errorInfo = handleFirebaseError(error)
  const logData = {
    context,
    ...errorInfo,
    timestamp: new Date().toISOString(),
    ...additionalData
  }

  if (errorInfo.severity === 'error') {
    console.error('Firebase Error:', logData)
  } else if (errorInfo.severity === 'warning') {
    console.warn('Firebase Warning:', logData)
  } else {
    console.info('Firebase Info:', logData)
  }

  // In production, you might want to send this to a logging service
  if (import.meta.env.PROD) {
    // Send to logging service
    // Example: sendToLoggingService(logData)
  }
}

// Retry logic for retryable errors
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  backoffMs = 1000
): Promise<T> => {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorInfo = handleFirebaseError(error)

      if (!errorInfo.retryable || i === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      const delay = backoffMs * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}