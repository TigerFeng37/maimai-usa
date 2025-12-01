import express from 'express'
import passport from '../config/auth.js'

const router = express.Router()

// Discord OAuth2 login
router.get('/discord', (req, res, next) => {
  // Save returnTo URL in session if provided
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo
    console.log('Saved returnTo to session:', req.query.returnTo)
    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err)
      }
      // Use state parameter to pass returnTo through OAuth flow
      const state = req.query.returnTo ? Buffer.from(req.query.returnTo).toString('base64') : undefined
      passport.authenticate('discord', { state })(req, res, next)
    })
  } else {
    passport.authenticate('discord')(req, res, next)
  }
})

// Discord OAuth2 callback
router.get(
  '/discord/callback',
  (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
      if (err) {
        console.error('Discord authentication error:', err)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(err.message || 'Authentication failed')}`)
      }
      
      if (!user) {
        console.error('Discord authentication failed: No user returned', info)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        return res.redirect(`${frontendUrl}?auth_error=Authentication failed`)
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr)
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
          return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(loginErr.message || 'Login failed')}`)
        }

        // Get returnTo from state parameter or session
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
        let returnTo = '/'
        
        // Try to get from state parameter first (more reliable)
        if (req.query.state) {
          try {
            returnTo = Buffer.from(req.query.state, 'base64').toString('utf-8')
            console.log('Got returnTo from state parameter:', returnTo)
          } catch (e) {
            console.error('Error decoding state:', e)
          }
        }
        
        // Fallback to session if state is not available
        if (returnTo === '/' && req.session && req.session.returnTo) {
          returnTo = req.session.returnTo
          console.log('Got returnTo from session:', returnTo)
          delete req.session.returnTo // Clean up session
        } else {
          console.log('Session returnTo:', req.session?.returnTo)
          console.log('No returnTo found, using default "/"')
        }
        
        // Ensure returnTo starts with / and construct full URL
        const path = returnTo.startsWith('/') ? returnTo : `/${returnTo}`
        const redirectUrl = `${frontendUrl}${path}`
        
        console.log('Authentication successful, redirecting to:', redirectUrl)
        res.redirect(redirectUrl)
      })
    })(req, res, next)
  }
)

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' })
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error destroying session' })
      }
      res.clearCookie('connect.sid')
      res.json({ message: 'Logged out successfully' })
    })
  })
})

// Check authentication status
router.get('/status', (req, res) => {
  if (req.user) {
    res.json({ authenticated: true, user: req.user })
  } else {
    res.json({ authenticated: false })
  }
})

export default router

