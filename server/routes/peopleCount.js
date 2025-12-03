import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
const DATA_DIR = join(dirname(__dirname), 'data')

// Helper function to get people count file path
function getPeopleCountFilePath() {
  return join(DATA_DIR, 'peopleCount.json')
}

// Helper function to read people count data
async function readPeopleCount() {
  try {
    const filePath = getPeopleCountFilePath()
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { counts: {} }
    }
    throw error
  }
}

// Helper function to write people count data
async function writePeopleCount(data) {
  const filePath = getPeopleCountFilePath()
  await fs.mkdir(dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// Helper function to read users data
async function readUsers() {
  try {
    const usersFilePath = join(DATA_DIR, 'users.json')
    const data = await fs.readFile(usersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.status(401).json({ error: 'Authentication required' })
  }
}

// GET /api/peopleCount/:storeId - Get current people count for a store
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params
    const data = await readPeopleCount()
    
    const storeData = data.counts[storeId] || null
    
    if (!storeData) {
      return res.json({ storeId, count: 0, lastUpdated: null, updatedBy: null })
    }
    
    // Get the most recent update
    const mostRecent = storeData.updates && storeData.updates.length > 0
      ? storeData.updates[storeData.updates.length - 1]
      : null
    
    // Get user info if available (for avatar)
    let updatedByInfo = null
    if (mostRecent && mostRecent.userId) {
      // Try to get avatar from update record first
      if (mostRecent.avatar) {
        updatedByInfo = {
          userId: mostRecent.userId,
          username: mostRecent.username || 'Unknown',
          avatar: mostRecent.avatar
        }
      } else {
        // Fallback to loading from users.json if avatar not in update record
        try {
          const users = await readUsers()
          const user = users[mostRecent.userId]
          if (user) {
            updatedByInfo = {
              userId: mostRecent.userId,
              username: mostRecent.username || user.username || 'Unknown',
              avatar: user.avatar || null
            }
          } else {
            updatedByInfo = {
              userId: mostRecent.userId,
              username: mostRecent.username || 'Unknown',
              avatar: null
            }
          }
        } catch (error) {
          updatedByInfo = {
            userId: mostRecent.userId,
            username: mostRecent.username || 'Unknown',
            avatar: null
          }
        }
      }
    }
    
    res.json({
      storeId,
      count: storeData.currentCount || 0,
      lastUpdated: mostRecent ? mostRecent.timestamp : null,
      updatedBy: updatedByInfo
    })
  } catch (error) {
    console.error('Error fetching people count:', error)
    res.status(500).json({ error: 'Failed to fetch people count' })
  }
})

// POST /api/peopleCount/:storeId - Update people count for a store
router.post('/:storeId', requireAuth, async (req, res) => {
  try {
    const { storeId } = req.params
    const { count } = req.body
    
    if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
      return res.status(400).json({ error: 'Count must be a non-negative integer' })
    }
    
    const data = await readPeopleCount()
    
    if (!data.counts[storeId]) {
      data.counts[storeId] = {
        currentCount: 0,
        updates: []
      }
    }
    
    // Add update to history (keep last 100 updates)
    const update = {
      userId: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar || null,
      count,
      timestamp: new Date().toISOString()
    }
    
    data.counts[storeId].updates.push(update)
    
    // Keep only last 100 updates per store
    if (data.counts[storeId].updates.length > 100) {
      data.counts[storeId].updates = data.counts[storeId].updates.slice(-100)
    }
    
    // Update current count
    data.counts[storeId].currentCount = count
    
    await writePeopleCount(data)
    
    res.json({
      storeId,
      count,
      lastUpdated: update.timestamp,
      updatedBy: {
        userId: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar || null
      }
    })
  } catch (error) {
    console.error('Error updating people count:', error)
    res.status(500).json({ error: 'Failed to update people count' })
  }
})

export default router

