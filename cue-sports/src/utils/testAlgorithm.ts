// Simple test utility to validate algorithm API calls
export async function testAlgorithmAPI() {
  const baseUrl = 'https://thomasngomono.pythonanywhere.com/api/algorithm'
  
  try {
    console.log('🧪 Testing Algorithm API...')
    
    // Test 1: Health check
    console.log('1. Testing health check...')
    const healthResponse = await fetch(`${baseUrl}/test-connection`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json()
      console.log('✅ Health check:', healthData)
    } else {
      console.error('❌ Health check failed:', healthResponse.status)
      return false
    }
    
    // Test 2: Initialize tournament (will fail but we can see error format)
    console.log('2. Testing initialize tournament...')
    const initResponse = await fetch(`${baseUrl}/initialize-tournament`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tournamentId: 'test-tournament-id',
        special: false,
        level: 'community',
        schedulingPreference: 'weekend'
      })
    })
    
    if (initResponse.ok) {
      const initData = await initResponse.json()
      console.log('✅ Initialize response:', initData)
    } else {
      const errorText = await initResponse.text()
      console.log('⚠️ Initialize error (expected):', errorText)
    }
    
    return true
  } catch (error) {
    console.error('❌ Algorithm API test failed:', error)
    return false
  }
}

// Test function for browser console
if (typeof window !== 'undefined') {
  (window as any).testAlgorithmAPI = testAlgorithmAPI
}