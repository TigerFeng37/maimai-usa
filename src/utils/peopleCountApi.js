// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

/**
 * Get current people count for a store
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} People count data
 */
export async function getPeopleCount(storeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/peopleCount/${storeId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching people count:', error)
    throw error
  }
}

/**
 * Update people count for a store
 * @param {string} storeId - Store ID
 * @param {number} count - People count (non-negative integer)
 * @returns {Promise<Object>} Updated people count data
 */
export async function updatePeopleCount(storeId, count) {
  try {
    const response = await fetch(`${API_BASE_URL}/peopleCount/${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ count })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating people count:', error)
    throw error
  }
}

