# Production .env Quick Reference

## 🔴 Critical Changes for Production

Copy your `.env` file and update these values:

```bash
# ============================================
# CHANGES REQUIRED FOR PRODUCTION
# ============================================

# 1. Update Discord Callback URL
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback
# ❌ NOT: http://localhost:3001/auth/discord/callback

# 2. Update Frontend URL
FRONTEND_URL=https://yourdomain.com
# ❌ NOT: http://localhost:5173

# 3. Generate and set a STRONG Session Secret
SESSION_SECRET=GENERATE_A_STRONG_RANDOM_STRING_HERE
# Generate with: openssl rand -base64 32
# ❌ NOT: your-super-secret-session-key-change-this-in-production

# 4. Set Node Environment to Production
NODE_ENV=production
# ❌ NOT: development

# 5. Update API Base URL
VITE_API_BASE_URL=https://api.yourdomain.com/api
# ❌ NOT: http://localhost:3001/api

# ============================================
# OPTIONAL (Usually same as dev)
# ============================================
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
PORT=3001
```

## ⚡ Quick Commands

### Generate Session Secret
```bash
openssl rand -base64 32
```

### Example Production .env
```bash
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
DISCORD_CALLBACK_URL=https://api.yourdomain.com/auth/discord/callback

FRONTEND_URL=https://yourdomain.com

SESSION_SECRET=kX9#mP2$vL8@qR5!nT3%wY7&zA1*bC4^dF6

PORT=3001
NODE_ENV=production

VITE_API_BASE_URL=https://api.yourdomain.com/api
```

## ✅ Checklist

Before deploying to production:
- [ ] Updated `DISCORD_CALLBACK_URL` to production URL
- [ ] Updated `FRONTEND_URL` to production frontend URL  
- [ ] Generated strong `SESSION_SECRET` (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Updated `VITE_API_BASE_URL` to production API URL
- [ ] Added production callback URL in Discord Developer Portal
- [ ] HTTPS is enabled (required!)

## 🔗 See Also

For detailed information, see:
- `DEPLOYMENT_PROD.md` - Complete production setup guide
- `README_AUTH.md` - Authentication and forum feature docs

