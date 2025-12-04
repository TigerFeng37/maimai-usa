// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://maimai-usa-production.up.railway.app:3001/api'

/**
 * Get user's favorite stores
 * @returns {Promise<Array<string>>} Array of store IDs
 */
export async function getFavorites() {
  try {
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      credentials: 'include'
    })

    if (response.status === 401) {
      return []
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.favoriteStores || []
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return []
  }
}

/**
 * Add a store to favorites
 * @param {string} storeId - Store ID to add
 * @returns {Promise<Array<string>>} Updated array of favorite store IDs
 */
export async function addFavorite(storeId) {
  try {
    if (!storeId) {
      throw new Error('storeId is required')
    }

    console.log(`[favoritesApi] Adding favorite for storeId: ${storeId}`)
    
    const response = await fetch(`${API_BASE_URL}/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ storeId: String(storeId) })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      console.error(`[favoritesApi] Error response:`, errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[favoritesApi] Successfully added favorite. Total favorites: ${data.favoriteStores?.length || 0}`)
    return data.favoriteStores || []
  } catch (error) {
    console.error('[favoritesApi] Error adding favorite:', error)
    throw error
  }
}

/**
 * Remove a store from favorites
 * @param {string} storeId - Store ID to remove
 * @returns {Promise<Array<string>>} Updated array of favorite store IDs
 */
export async function removeFavorite(storeId) {
  try {
    if (!storeId) {
      throw new Error('storeId is required')
    }

    // URL encode the storeId to handle any special characters
    const encodedStoreId = encodeURIComponent(String(storeId))
    console.log(`[favoritesApi] Removing favorite for storeId: ${storeId} (encoded: ${encodedStoreId})`)
    
    const response = await fetch(`${API_BASE_URL}/favorites/${encodedStoreId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      console.error(`[favoritesApi] Error response:`, errorData)
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[favoritesApi] Successfully removed favorite. Total favorites: ${data.favoriteStores?.length || 0}`)
    return data.favoriteStores || []
  } catch (error) {
    console.error('[favoritesApi] Error removing favorite:', error)
    throw error
  }
}

/**
 * Check if a store is favorited
 * @param {string} storeId - Store ID to check
 * @returns {Promise<boolean>} True if store is favorited
 */
export async function isFavorited(storeId) {
  try {
    if (!storeId) {
      return false
    }
    const favorites = await getFavorites()
    // Use string comparison to handle type mismatches
    return favorites.some(id => String(id) === String(storeId))
  } catch (error) {
    console.error('Error checking favorite status:', error)
    return false
  }
}

