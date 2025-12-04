// API configuration
// Note: Auth routes are at /auth, not /api/auth
// So we need the base server URL, not the API base URL
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_BASE_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://maimai-usa-production.up.railway.app'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://maimai-usa-production.up.railway.app/api'

/**
 * Create a fetch request with timeout
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    // /api/user endpoint uses API_BASE_URL which already includes /api
    const response = await fetchWithTimeout(`${API_BASE_URL}/user`, {
      credentials: 'include'
    }, 10000) // 10 second timeout

    // 401 is expected when user is not authenticated, return null silently
    if (response.status === 401) {
      return null
    }

    if (!response.ok) {
      // Only log non-401 errors
      console.error(`Error fetching current user: HTTP ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    // Only log actual network/timeout errors, not 401 responses
    if (error.message !== 'Request timeout' && !error.message.includes('401')) {
      console.error('Error fetching current user:', error)
    }
    return null
  }
}

/**
 * Check authentication status
 * @returns {Promise<Object>} Authentication status
 */
export async function checkAuthStatus() {
  try {
    const response = await fetchWithTimeout(`${SERVER_BASE_URL}/auth/status`, {
      credentials: 'include'
    }, 10000) // 10 second timeout

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error checking auth status:', error)
    return { authenticated: false }
  }
}

/**
 * Initiate Discord OAuth2 login
 * Redirects user to Discord for authentication
 * Saves the current URL to return to after authentication
 */
export function loginWithDiscord() {
  // Save current URL to return to after authentication
  const returnTo = window.location.pathname + window.location.search
  window.location.href = `${SERVER_BASE_URL}/auth/discord?returnTo=${encodeURIComponent(returnTo)}`
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const response = await fetchWithTimeout(`${SERVER_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }, 10000) // 10 second timeout

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Reload page to clear any cached user data
    window.location.reload()
  } catch (error) {
    console.error('Error logging out:', error)
    // Still reload page even if logout fails
    window.location.reload()
  }
}

