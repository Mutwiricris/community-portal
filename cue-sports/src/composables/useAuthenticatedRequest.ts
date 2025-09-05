import { useAuthStore } from '@/stores'
import { useToast } from '@/composables/useToast'

export interface RequestOptions extends RequestInit {
  url: string
  requiresAuth?: boolean
}

export function useAuthenticatedRequest() {
  const authStore = useAuthStore()
  const { error: showError } = useToast()

  const makeRequest = async <T = any>(options: RequestOptions): Promise<T> => {
    const { url, requiresAuth = true, ...fetchOptions } = options

    try {
      // Add auth token if required
      if (requiresAuth) {
        if (!authStore.isAuthenticated) {
          throw new Error('Authentication required')
        }

        const token = await authStore.getAuthToken()
        if (!token) {
          throw new Error('Failed to get authentication token')
        }

        // Add Authorization header
        fetchOptions.headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...fetchOptions.headers
        }
      }

      // Make the request
      const response = await fetch(url, fetchOptions)

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid - logout user
          showError('Session Expired', 'Please login again.')
          await authStore.logout()
          throw new Error('Authentication expired')
        }
        
        if (response.status === 403) {
          showError('Access Denied', 'You do not have permission to perform this action.')
          throw new Error('Permission denied')
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Parse response
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      return await response.text() as T
    } catch (error) {
      console.error('Authenticated request failed:', error)
      throw error
    }
  }

  // Convenience methods
  const get = <T = any>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> => {
    return makeRequest<T>({ url, method: 'GET', ...options })
  }

  const post = <T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>): Promise<T> => {
    return makeRequest<T>({
      url,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    })
  }

  const put = <T = any>(url: string, data?: any, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>): Promise<T> => {
    return makeRequest<T>({
      url,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    })
  }

  const del = <T = any>(url: string, options?: Omit<RequestOptions, 'url' | 'method'>): Promise<T> => {
    return makeRequest<T>({ url, method: 'DELETE', ...options })
  }

  return {
    makeRequest,
    get,
    post,
    put,
    delete: del
  }
}