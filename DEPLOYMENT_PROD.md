# Production Environment Setup Guide

This guide explains how to configure the application for production deployment.

## 🔐 Environment Variables for Production

### Required Changes from Development

| Variable | Development Value | Production Value | Notes |
|----------|------------------|------------------|-------|
| `DISCORD_CALLBACK_URL` | `http://localhost:3001/auth/discord/callback` | `https://api.yourdomain.com/auth/discord/callback` | Must match Discord app settings |
| `FRONTEND_URL` | `http://localhost:5173` | `https://yourdomain.com` | Your production frontend URL |
| `SESSION_SECRET` | Any string | **Strong random string** | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | `development` | `production` | Enables secure cookies |
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | `https://api.yourdomain.com/api` | Your production API URL |
| `PORT` | `3001` | `3001` (or your server's port) | Usually set by hosting platform |

## 📋 Step-by-Step Production Setup

### 1. Discord Application Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. In **Redirects**, add your production callback URL:
   ```
   https://api.yourdomain.com/auth/discord/callback
   ```
   Replace `api.yourdomain.com` with your actual API domain

5. **Important**: You can keep both development and production URLs in the redirects list
   - `http://localhost:3001/auth/discord/callback` (for local development)
   - `https://api.yourdomain.com/auth/discord/callback` (for production)

### 2. Generate a Strong Session Secret

Generate a secure random string for `SESSION_SECRET`:

**Using OpenSSL (Recommended):**
```bash
openssl rand -base64 32
```

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Using Python:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Copy the generated string** - you'll need it for your `.env` file.

### 3. Create Production `.env` File

On your production server, create a `.env` file in the project root:

```bash
# Production .env file
DISCORD_CLIENT_ID=your_production_discord_client_id
DISCORD_CLIENT_SECRET=your_production_discord_client_secret
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback

FRONTEND_URL=https://yourdomain.com

SESSION_SECRET=PASTE_YOUR_GENERATED_SECRET_HERE

PORT=3001
NODE_ENV=production

VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### 4. Frontend Environment Variables

For the frontend (Vite), you need to set environment variables during build time.

**Option A: Build-time variables (Recommended)**

Create `.env.production` in the frontend root:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Then build:
```bash
npm run build
```

**Option B: Runtime configuration**

If you need to change the API URL without rebuilding, you can:
1. Create a `config.js` file in the `public` folder
2. Load it at runtime
3. This is more complex but allows dynamic configuration

### 5. Security Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `SESSION_SECRET` is a strong random string (32+ characters)
- [ ] HTTPS is enabled (required for secure cookies)
- [ ] `.env` file is in `.gitignore` (never commit it!)
- [ ] Discord callback URL matches your production domain
- [ ] CORS `FRONTEND_URL` matches your production frontend domain
- [ ] Database/files are backed up regularly

## 🌐 Common Deployment Scenarios

### Scenario 1: Separate Domains (API + Frontend)

**Frontend:** `https://yourdomain.com`  
**API:** `https://api.yourdomain.com`

```bash
# Backend .env
FRONTEND_URL=https://yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com/api
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback

# Frontend .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

### Scenario 2: Same Domain (Subdirectory)

**Frontend:** `https://yourdomain.com`  
**API:** `https://yourdomain.com/api`

```bash
# Backend .env
FRONTEND_URL=https://yourdomain.com
VITE_API_BASE_URL=https://yourdomain.com/api
DISCORD_CALLBACK_URL=https://yourdomain.com/auth/discord/callback

# Frontend .env.production
VITE_API_BASE_URL=https://yourdomain.com/api
```

**Note:** For this setup, you'll need a reverse proxy (nginx, Cloudflare, etc.)

### Scenario 3: Cloudflare Pages (Frontend) + Separate API

**Frontend:** `https://yourdomain.pages.dev`  
**API:** `https://api.yourdomain.com`

```bash
# Backend .env
FRONTEND_URL=https://yourdomain.pages.dev
VITE_API_BASE_URL=https://api.yourdomain.com/api
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback

# Frontend .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## 🔧 Platform-Specific Notes

### Vercel / Netlify Functions

If deploying to Vercel/Netlify:
- Set environment variables in the platform dashboard
- Use their environment variable interface
- Don't commit `.env` files

### Docker

In `docker-compose.yml` or Dockerfile:
```yaml
environment:
  - NODE_ENV=production
  - SESSION_SECRET=${SESSION_SECRET}
  - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
  # ... etc
```

Use Docker secrets or environment files for sensitive data.

### Kubernetes

Use ConfigMaps and Secrets:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  SESSION_SECRET: your-secret-here
  DISCORD_CLIENT_SECRET: your-client-secret
```

## 🚨 Important Production Notes

### HTTPS is Required

**Critical**: In production, you MUST use HTTPS because:
- Session cookies need to be secure
- Discord OAuth2 requires HTTPS for callbacks
- Modern browsers block mixed content

### Cookie Security

With `NODE_ENV=production`, cookies are automatically:
- Set to `Secure` (HTTPS only)
- Set to `HttpOnly` (not accessible to JavaScript)
- Protected from XSS attacks

### CORS Configuration

Make sure `FRONTEND_URL` exactly matches your frontend domain:
- Include protocol: `https://`
- Include port if not 443: `https://yourdomain.com:8080`
- No trailing slash: `https://yourdomain.com` ✅ not `https://yourdomain.com/` ❌

## 🧪 Testing Production Config

1. **Test Discord Login:**
   - Try logging in with Discord
   - Should redirect correctly after authentication

2. **Test CORS:**
   - Open browser console on frontend
   - Check for CORS errors
   - API calls should work

3. **Test Session:**
   - Login and refresh page
   - User should stay logged in
   - Logout should work

4. **Test Forum/Reports:**
   - Create a post (requires auth)
   - React to posts
   - All should work without errors

## 📝 Example Production .env File

```bash
# ============================================
# PRODUCTION CONFIGURATION
# ============================================
# Replace all placeholder values with your actual values

# Discord OAuth2
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback

# URLs
FRONTEND_URL=https://yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com/api

# Security
SESSION_SECRET=kX9#mP2$vL8@qR5!nT3%wY7&zA1*bC4^dF6
NODE_ENV=production

# Server
PORT=3001
```

Remember: **Never commit your production `.env` file to version control!**

