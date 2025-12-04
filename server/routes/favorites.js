import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Use persistent volume path if provided (for Railway), otherwise use local data directory
const DATA_DIR = process.env.DATA_DIR || join(dirname(__dirname), 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

// Helper function to read users
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

// Helper function to save users
async function saveUsers(users) {
  await fs.mkdir(dirname(USERS_FILE), { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.status(401).json({ error: 'Authentication required' })
  }
}

const router = express.Router()

// GET /api/favorites - Get user's favorite stores
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await loadUsers()
    const user = users[req.user.id]
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      favoriteStores: user.favoriteStores || []
    })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    res.status(500).json({ error: 'Failed to fetch favorites' })
  }
})

// POST /api/favorites - Add a store to favorites
router.post('/', requireAuth, async (req, res) => {
  try {
    let { storeId } = req.body
    
    // Ensure storeId is a string
    storeId = String(storeId || '').trim()
    
    console.log(`[favorites] POST request for storeId: ${storeId}, user: ${req.user?.id}`)

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' })
    }

    const users = await loadUsers()
    const user = users[req.user.id]

    if (!user) {
      console.error(`[favorites] User not found: ${req.user.id}`)
      return res.status(404).json({ error: 'User not found' })
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favoriteStores) {
      user.favoriteStores = []
    }

    // Check if store is already favorited (use string comparison)
    const isAlreadyFavorited = user.favoriteStores.some(id => String(id) === String(storeId))
    if (isAlreadyFavorited) {
      console.log(`[favorites] StoreId ${storeId} is already in favorites`)
      return res.status(400).json({ error: 'Store already in favorites' })
    }

    // Add store to favorites
    user.favoriteStores.push(storeId)
    users[req.user.id] = user
    await saveUsers(users)

    console.log(`[favorites] Successfully added storeId ${storeId} to favorites. Total: ${user.favoriteStores.length}`)

    res.json({
      message: 'Store added to favorites',
      favoriteStores: user.favoriteStores
    })
  } catch (error) {
    console.error('[favorites] Error adding favorite:', error)
    res.status(500).json({ error: 'Failed to add favorite' })
  }
})

// DELETE /api/favorites/:storeId - Remove a store from favorites
router.delete('/:storeId', requireAuth, async (req, res) => {
  try {
    // Decode the storeId in case it was URL encoded
    let { storeId } = req.params
    storeId = decodeURIComponent(storeId)
    
    console.log(`[favorites] DELETE request for storeId: ${storeId}, user: ${req.user?.id}`)

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' })
    }

    const users = await loadUsers()
    const user = users[req.user.id]

    if (!user) {
      console.error(`[favorites] User not found: ${req.user.id}`)
      return res.status(404).json({ error: 'User not found' })
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favoriteStores) {
      user.favoriteStores = []
    }

    const beforeCount = user.favoriteStores.length
    // Remove store from favorites (use string comparison to handle type mismatches)
    user.favoriteStores = user.favoriteStores.filter(id => String(id) !== String(storeId))
    const afterCount = user.favoriteStores.length

    if (beforeCount === afterCount) {
      console.log(`[favorites] StoreId ${storeId} was not in favorites list`)
    } else {
      console.log(`[favorites] Successfully removed storeId ${storeId} from favorites`)
    }

    users[req.user.id] = user
    await saveUsers(users)

    res.json({
      message: 'Store removed from favorites',
      favoriteStores: user.favoriteStores
    })
  } catch (error) {
    console.error('[favorites] Error removing favorite:', error)
    res.status(500).json({ error: 'Failed to remove favorite' })
  }
})

// GET /api/favorites/users/:discordUserId - Get favorites by Discord user ID (for bot)
router.get('/users/:discordUserId', async (req, res) => {
  try {
    const { discordUserId } = req.params

    const users = await loadUsers()
    
    // Find user by Discord user ID
    const user = Object.values(users).find(u => u.discordUserId === discordUserId || u.id === discordUserId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      favoriteStores: user.favoriteStores || []
    })
  } catch (error) {
    console.error('Error fetching favorites by Discord ID:', error)
    res.status(500).json({ error: 'Failed to fetch favorites' })
  }
})

// POST /api/favorites/users/:discordUserId - Add favorite by Discord user ID (for bot)
router.post('/users/:discordUserId', async (req, res) => {
  try {
    const { discordUserId } = req.params
    const { storeId } = req.body

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' })
    }

    const users = await loadUsers()
    
    // Find user by Discord user ID
    const user = Object.values(users).find(u => u.discordUserId === discordUserId || u.id === discordUserId)

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please login to the website first.' })
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favoriteStores) {
      user.favoriteStores = []
    }

    // Check if store is already favorited
    if (user.favoriteStores.includes(storeId)) {
      return res.status(400).json({ error: 'Store already in favorites' })
    }

    // Add store to favorites
    user.favoriteStores.push(storeId)
    
    // Update user in users object
    const userId = user.id
    users[userId] = user
    await saveUsers(users)

    res.json({
      message: 'Store added to favorites',
      favoriteStores: user.favoriteStores
    })
  } catch (error) {
    console.error('Error adding favorite:', error)
    res.status(500).json({ error: 'Failed to add favorite' })
  }
})

// DELETE /api/favorites/users/:discordUserId/:storeId - Remove favorite by Discord user ID (for bot)
router.delete('/users/:discordUserId/:storeId', async (req, res) => {
  try {
    const { discordUserId, storeId } = req.params

    const users = await loadUsers()
    
    // Find user by Discord user ID
    const user = Object.values(users).find(u => u.discordUserId === discordUserId || u.id === discordUserId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Initialize favorites array if it doesn't exist
    if (!user.favoriteStores) {
      user.favoriteStores = []
    }

    // Remove store from favorites
    user.favoriteStores = user.favoriteStores.filter(id => id !== storeId)
    
    // Update user in users object
    const userId = user.id
    users[userId] = user
    await saveUsers(users)

    res.json({
      message: 'Store removed from favorites',
      favoriteStores: user.favoriteStores
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    res.status(500).json({ error: 'Failed to remove favorite' })
  }
})

export default router

