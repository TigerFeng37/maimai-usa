import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import passport from './config/auth.js'
import reportsRouter from './routes/reports.js'
import authRouter from './routes/auth.js'
import forumRouter from './routes/forum.js'
import favoritesRouter from './routes/favorites.js'
import peopleCountRouter from './routes/peopleCount.js'

const require = createRequire(import.meta.url)
const FileStore = require('session-file-store')(session)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001
const DATA_DIR = join(__dirname, 'data')
const SESSIONS_DIR = join(DATA_DIR, 'sessions')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(SESSIONS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// Trust proxy - important for Railway and other platforms with reverse proxies
// This ensures Express correctly handles X-Forwarded-* headers
app.set('trust proxy', true)

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://maimaiusa.com/',
  credentials: true
}))
app.use(express.json())

// Session configuration with file store for production
app.use(
  session({
    store: new FileStore({
      path: SESSIONS_DIR,
      ttl: 24 * 60 * 60, // 24 hours in seconds
      retries: 1,
      logFn: () => {} // Suppress file store logs
    }),
    secret: process.env.SESSION_SECRET || 'JOrSYA96DTub6PQS7TzJfH6F4r+yZxF1iPvSmX2Tdq4=',
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
app.use('/api/peopleCount', peopleCountRouter)

// Get current user
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json(req.user)
  } else {
    res.status(401).json({ error: 'Not authenticated' })
  }
})

// Initialize data directory and start server
let server = null

async function startServer() {
  try {
    await ensureDataDir()
    
    // Log configuration for debugging
    console.log('🔧 Server Configuration:')
    console.log(`   PORT: ${PORT}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'production'}`)
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'https://maimaiusa.com/'}`)
    console.log(`   DISCORD_CALLBACK_URL: ${process.env.DISCORD_CALLBACK_URL || 'https://maimai-usa.up.railway.app/auth/discord/callback'}`)
    console.log(`   DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
    console.log(`   DISCORD_CLIENT_SECRET: ${process.env.DISCORD_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
    console.log(`   📁 Data directory: ${DATA_DIR}`)
    console.log(`   📁 Sessions directory: ${SESSIONS_DIR}`)
    
    server = app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`)
    })

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error
      }
      console.error(`❌ Server error: ${error.message}`)
      process.exit(1)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed')
      process.exit(0)
    })
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  } else {
    process.exit(0)
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})

