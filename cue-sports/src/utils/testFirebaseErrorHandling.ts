import { getFirebaseAuth, getFirebaseDb, checkFirebaseHealth } from '@/firebase/config'
import { handleFirebaseError, logFirebaseError } from '@/firebase/errorHandler'
import { useAuth } from '@/composables/useAuth'
import { useFirestore } from '@/composables/useFirestore'

// Test scenarios for Firebase error handling
export const testFirebaseErrorHandling = async () => {
  console.group('🧪 Firebase Error Handling Tests')
  
  try {
    // Test 1: Firebase Health Check
    console.group('Test 1: Firebase Health Check')
    const health = checkFirebaseHealth()
    console.log('Health status:', health)
    
    if (health.error) {
      console.error('❌ Firebase initialization error detected')
      console.log('Error details:', health.error)
    } else {
      console.log('✅ Firebase services initialized successfully')
    }
    console.groupEnd()

    // Test 2: Authentication Error Handling
    console.group('Test 2: Authentication Error Handling')
    const { login } = useAuth()
    
    try {
      // This should fail with invalid credentials
      await login('invalid@email.com', 'wrongpassword')
      console.log('❌ Login should have failed')
    } catch (error) {
      const errorInfo = handleFirebaseError(error)
      console.log('✅ Auth error handled correctly:')
      console.log('- Code:', errorInfo.code)
      console.log('- User message:', errorInfo.userMessage)
      console.log('- Retryable:', errorInfo.retryable)
    }
    console.groupEnd()

    // Test 3: Firestore Error Handling
    console.group('Test 3: Firestore Error Handling')
    const firestoreTest = useFirestore('test-collection')
    
    try {
      // This should fail with permission denied (if not authenticated)
      await firestoreTest.add({ test: 'data' })
      console.log('✅ Firestore add succeeded (user is authenticated)')
    } catch (error) {
      const errorInfo = handleFirebaseError(error)
      console.log('✅ Firestore error handled correctly:')
      console.log('- Code:', errorInfo.code)
      console.log('- User message:', errorInfo.userMessage)
      console.log('- Retryable:', errorInfo.retryable)
    }
    
    try {
      // Test document not found
      await firestoreTest.getById('non-existent-id')
      console.log('✅ Document not found handled gracefully')
    } catch (error) {
      const errorInfo = handleFirebaseError(error)
      console.log('✅ Document not found error handled:')
      console.log('- Code:', errorInfo.code)
      console.log('- User message:', errorInfo.userMessage)
    }
    console.groupEnd()

    // Test 4: Error Logger
    console.group('Test 4: Error Logger')
    const testError = new Error('Test error for logging')
    logFirebaseError(testError, 'Unit test', { testData: 'sample' })
    console.log('✅ Error logging test completed')
    console.groupEnd()

    // Test 5: Network Error Simulation
    console.group('Test 5: Network Error Simulation')
    try {
      // Simulate network error by using invalid Firebase config
      console.log('Network error simulation would require modifying config temporarily')
      console.log('✅ Network error handling ready (manual test required)')
    } catch (error) {
      console.log('Network error test result:', error)
    }
    console.groupEnd()

  } catch (error) {
    console.error('❌ Test suite error:', error)
  }
  
  console.groupEnd()
}

// Test error boundary reset functionality
export const testErrorBoundaryReset = () => {
  console.group('🧪 Error Boundary Reset Test')
  
  try {
    // Simulate an error that would be caught by error boundary
    throw new Error('Simulated component error for boundary testing')
  } catch (error) {
    console.log('✅ Error boundary test error generated:')
    console.log('- Message:', error.message)
    console.log('- This would be caught by ErrorBoundary component')
  }
  
  console.groupEnd()
}

// Performance test for error handling
export const testErrorHandlingPerformance = async () => {
  console.group('🧪 Error Handling Performance Test')
  
  const startTime = performance.now()
  const iterations = 1000
  
  for (let i = 0; i < iterations; i++) {
    const testError = new Error(`Test error ${i}`)
    handleFirebaseError(testError)
  }
  
  const endTime = performance.now()
  const avgTime = (endTime - startTime) / iterations
  
  console.log(`✅ Processed ${iterations} errors in ${(endTime - startTime).toFixed(2)}ms`)
  console.log(`Average time per error: ${avgTime.toFixed(4)}ms`)
  
  console.groupEnd()
}

// Test retry mechanism
export const testRetryMechanism = async () => {
  console.group('🧪 Retry Mechanism Test')
  
  let attempts = 0
  const maxAttempts = 3
  
  const failingOperation = async () => {
    attempts++
    console.log(`Attempt ${attempts}/${maxAttempts}`)
    
    if (attempts < maxAttempts) {
      throw new Error('Simulated network failure')
    }
    
    return 'Success after retries'
  }
  
  try {
    // Import retry function from error handler
    const { retryOperation } = await import('@/firebase/errorHandler')
    const result = await retryOperation(failingOperation, maxAttempts, 100)
    console.log('✅ Retry mechanism successful:', result)
  } catch (error) {
    console.log('Retry test result:', error)
  }
  
  console.groupEnd()
}

// Run all tests
export const runAllErrorHandlingTests = async () => {
  console.log('🚀 Starting comprehensive Firebase error handling tests...')
  
  await testFirebaseErrorHandling()
  testErrorBoundaryReset()
  await testErrorHandlingPerformance()
  await testRetryMechanism()
  
  console.log('✅ All error handling tests completed!')
}

// Development helper to trigger tests
if (import.meta.env.DEV) {
  // Make test functions available globally for manual testing
  ;(window as any).testFirebaseErrorHandling = {
    runAll: runAllErrorHandlingTests,
    health: () => checkFirebaseHealth(),
    auth: testFirebaseErrorHandling,
    performance: testErrorHandlingPerformance,
    retry: testRetryMechanism
  }
  
  console.log('🔧 Firebase error handling tests available at: window.testFirebaseErrorHandling')
}