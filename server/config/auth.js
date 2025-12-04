import passport from 'passport'
import { Strategy as DiscordStrategy } from 'passport-discord'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const USERS_FILE = join(__dirname, '../data/users.json')

// Load or create users file
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

async function saveUsers(users) {
  await fs.mkdir(dirname(USERS_FILE), { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
}

// Normalize callback URL to remove port number for HTTPS in production
// Discord requires the redirect_uri to exactly match the registered URL (no port for HTTPS)
function getCallbackURL() {
  let callbackURL = process.env.DISCORD_CALLBACK_URL || 'https://maimai-usa-production.up.railway.app:3001/auth/discord/callback'
  
  // Remove port number from HTTPS URLs (production environments don't need it)
  if (callbackURL.startsWith('https://')) {
    try {
      const url = new URL(callbackURL)
      // Remove port for HTTPS URLs (standard HTTPS port is 443, which is implicit)
      if (url.port) {
        url.port = ''
        callbackURL = url.toString()
        // Remove trailing slash if present after removing port
        callbackURL = callbackURL.replace(/\/$/, '')
      }
    } catch (e) {
      console.warn('Error parsing callback URL:', e)
    }
  }
  
  return callbackURL
}

// Configure Discord OAuth2 Strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: getCallbackURL(),
      scope: ['identify', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Discord OAuth2 callback received:', {
          userId: profile.id,
          username: profile.username
        })

        const users = await loadUsers()
        const userId = profile.id

        // Check if user exists
        if (users[userId]) {
          // Update user info
          users[userId] = {
            ...users[userId],
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
              : null,
            email: profile.email || null,
            lastLogin: new Date().toISOString(),
            // Preserve favorites if they exist
            favoriteStores: users[userId].favoriteStores || [],
            discordUserId: users[userId].discordUserId || userId
          }
          console.log('Updated existing user:', users[userId].username)
        } else {
          // Create new user
          users[userId] = {
            id: userId,
            username: profile.username,
            discriminator: profile.discriminator,
            avatar: profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
              : null,
            email: profile.email || null,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            favoriteStores: [],
            discordUserId: userId
          }
          console.log('Created new user:', users[userId].username)
        }

        await saveUsers(users)
        return done(null, users[userId])
      } catch (error) {
        console.error('Error in Discord OAuth2 callback:', error)
        return done(error, null)
      }
    }
  )
)

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const users = await loadUsers()
    const user = users[id] || null
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport

