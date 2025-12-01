import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import passport from './config/auth.js'
import reportsRouter from './routes/reports.js'
import authRouter from './routes/auth.js'
import forumRouter from './routes/forum.js'
import favoritesRouter from './routes/favorites.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const DATA_DIR = join(__dirname, 'data')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: true, // Changed to true to save session even if uninitialized
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
)

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
app.use('/auth', authRouter)

// API routes
app.use('/api/reports', reportsRouter)
app.use('/api/forum', forumRouter)
app.use('/api/favorites', favoritesRouter)

// Get current user
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json(req.user)
  } else {
    res.status(401).json({ error: 'Not authenticated' })
  }
})

// Initialize data directory and start server
async function startServer() {
  await ensureDataDir()
  
  // Log configuration for debugging
  console.log('🔧 Server Configuration:')
  console.log(`   PORT: ${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log(`   DISCORD_CALLBACK_URL: ${process.env.DISCORD_CALLBACK_URL || 'http://localhost:3001/auth/discord/callback'}`)
  console.log(`   DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
  console.log(`   DISCORD_CLIENT_SECRET: ${process.env.DISCORD_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
  console.log(`   📁 Data directory: ${DATA_DIR}`)
  
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`)
  })
}

startServer().catch(console.error)

