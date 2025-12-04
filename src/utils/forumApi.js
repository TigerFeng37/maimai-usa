// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://maimai-usa-production.up.railway.app/api'

/**
 * Get all posts
 * @param {Object} options - Query options
 * @param {string} options.storeId - Filter by store ID
 * @param {number} options.limit - Number of posts to return
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Object>} Posts with pagination info
 */
export async function getPosts({ storeId, limit = 50, offset = 0 } = {}) {
  try {
    const params = new URLSearchParams()
    if (storeId) params.append('storeId', storeId)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())

    const response = await fetch(`${API_BASE_URL}/forum/posts?${params}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching posts:', error)
    throw error
  }
}

/**
 * Get a single post with replies
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} Post with replies
 */
export async function getPost(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching post:', error)
    throw error
  }
}

/**
 * Create a new post
 * @param {Object} postData - Post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content
 * @param {string} postData.storeId - Optional store ID
 * @param {Array<string>} postData.tags - Optional tags
 * @returns {Promise<Object>} Created post
 */
export async function createPost(postData) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(postData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating post:', error)
    throw error
  }
}

/**
 * Update a post
 * @param {string} postId - Post ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated post
 */
export async function updatePost(postId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating post:', error)
    throw error
  }
}

/**
 * Delete a post
 * @param {string} postId - Post ID
 * @returns {Promise<void>}
 */
export async function deletePost(postId) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error deleting post:', error)
    throw error
  }
}

/**
 * Add or toggle a reaction to a post
 * @param {string} postId - Post ID
 * @param {string} emoji - Emoji to react with (default: 👍)
 * @returns {Promise<Array>} Array of reactions
 */
export async function reactToPost(postId, emoji = '👍') {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ emoji })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.reactions
  } catch (error) {
    console.error('Error reacting to post:', error)
    throw error
  }
}

/**
 * Add a reply to a post
 * @param {string} postId - Post ID
 * @param {Object} replyData - Reply data
 * @param {string} replyData.content - Reply content
 * @param {string} replyData.parentReplyId - Optional parent reply ID for nested replies
 * @returns {Promise<Object>} Created reply
 */
export async function createReply(postId, replyData) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(replyData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating reply:', error)
    throw error
  }
}

/**
 * Update a reply
 * @param {string} replyId - Reply ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated reply
 */
export async function updateReply(replyId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/replies/${replyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating reply:', error)
    throw error
  }
}

/**
 * Delete a reply
 * @param {string} replyId - Reply ID
 * @returns {Promise<void>}
 */
export async function deleteReply(replyId) {
  try {
    const response = await fetch(`${API_BASE_URL}/forum/replies/${replyId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error deleting reply:', error)
    throw error
  }
}

