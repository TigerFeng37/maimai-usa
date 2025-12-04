# Troubleshooting Guide

## Railway Connection Timeout Issues

### Problem: `ERR_CONNECTION_TIMED_OUT` when accessing Railway URL

**Symptoms:**
- Browser shows: "This site can't be reached"
- Error: `ERR_CONNECTION_TIMED_OUT`
- URL: `maimai-usa-production.up.railway.app` (or similar)

### Solution Steps:

#### 1. Check Railway Service Status

1. **Log into Railway Dashboard**: https://railway.app
2. **Select your project** → **Select your service**
3. **Check the "Deployments" tab**:
   - Look for the latest deployment
   - Check if it shows "Active" (green) or "Failed" (red)
   - If failed, click on it to see error logs

#### 2. Check Service Logs

1. In Railway Dashboard, go to your service
2. Click on **"Logs"** tab
3. Look for:
   - `🚀 API server running on http://localhost:PORT`
   - Any error messages (red text)
   - Startup configuration logs

**Common log issues:**
- `Error: Cannot find module` → Missing dependencies
- `Error: listen EADDRINUSE` → Port conflict
- `Error: ENOENT` → Missing files or directories

#### 3. Verify Service is Running

1. In Railway Dashboard → **Settings** → **Networking**
2. Check if a **Public Domain** is generated
3. The domain should be active (not paused)

#### 4. Check Environment Variables

In Railway Dashboard → **Variables** tab, verify:

| Variable | Required | Example |
|----------|----------|---------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No* | Railway auto-assigns |
| `DISCORD_CLIENT_ID` | Yes | Your Discord app ID |
| `DISCORD_CLIENT_SECRET` | Yes | Your Discord app secret |
| `DISCORD_CALLBACK_URL` | Yes | `https://your-service.up.railway.app/auth/discord/callback` |
| `FRONTEND_URL` | Yes | Your frontend domain |
| `SESSION_SECRET` | Yes | Generated secret |

*Note: Railway automatically sets `PORT`, but you can override it if needed.

#### 5. Check Build and Start Commands

In Railway Dashboard → **Settings** → **Build & Deploy**:

- **Build Command**: Leave empty (server doesn't need build)
- **Start Command**: `npm run server`
- **Root Directory**: `/` (or leave empty)

#### 6. Verify Package.json Scripts

Make sure `package.json` has:
```json
{
  "scripts": {
    "server": "node server/index.js"
  }
}
```

#### 7. Check Health Check Endpoint

The service should respond to health checks:
```bash
curl https://your-service.up.railway.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

#### 8. Common Issues and Fixes

**Issue: Service shows "Failed" deployment**
- Check logs for error messages
- Verify all dependencies are in `package.json`
- Ensure `node` version matches `.nvmrc` or `engines.node` in `package.json`

**Issue: Service is "Paused"**
- Railway pauses services after inactivity (free tier)
- Click "Settings" → "Unpause" or redeploy

**Issue: Domain not accessible**
- Check if domain is generated in **Settings** → **Networking**
- Verify the domain matches your `DISCORD_CALLBACK_URL`
- Railway domains are HTTPS by default (no port needed)

**Issue: Port configuration**
- Railway automatically assigns a port via `process.env.PORT`
- Don't hardcode port numbers in URLs
- Remove `:3001` or any port from callback URLs

**Issue: Service starts but times out**
- Check if server is listening on `0.0.0.0` (Railway requirement)
- Verify `app.listen(PORT)` uses the PORT from environment
- Check firewall/network settings (usually not needed on Railway)

#### 9. Redeploy the Service

If all else fails:

1. **Manual Redeploy**:
   - Railway Dashboard → **Deployments** → **Redeploy**
   - Or push a new commit to trigger auto-deploy

2. **Check Deployment Logs**:
   - Watch the deployment process
   - Look for build/start errors

#### 10. Verify Railway Configuration

Check `railway.json` (if present):
```json
{
  "deploy": {
    "startCommand": "npm run server",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

### Quick Checklist

- [ ] Service is "Active" (not paused or failed)
- [ ] Latest deployment succeeded
- [ ] Logs show server started successfully
- [ ] Public domain is generated and active
- [ ] Environment variables are set correctly
- [ ] `DISCORD_CALLBACK_URL` matches Railway domain (no port)
- [ ] Health check endpoint responds
- [ ] Start command is `npm run server`

### Still Having Issues?

1. **Check Railway Status**: https://status.railway.app
2. **View Full Logs**: Railway Dashboard → Logs tab
3. **Test Locally**: Run `npm run server` locally to verify it works
4. **Contact Railway Support**: If service should be running but isn't

---

## Discord OAuth2 Callback Issues

### Problem: Callback URL doesn't redirect after Discord login

**Symptoms:**
- URL shows: `https://yourdomain.com/auth/discord/callback?code=...`
- Page doesn't redirect or shows blank page
- Console shows errors

### Solution Steps:

#### 1. Check Environment Variables

Make sure your `.env` file has the correct values:

```bash
# Production .env
FRONTEND_URL=https://maimaiusa.com
DISCORD_CALLBACK_URL=https://maimaiusa.com/auth/discord/callback
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
NODE_ENV=production
SESSION_SECRET=your_strong_secret
```

**Important:**
- `FRONTEND_URL` should be your actual frontend domain
- If frontend and API are on same domain, use the same URL
- Make sure there's no trailing slash

#### 2. Check Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to **OAuth2** → **General**
4. Check **Redirects** section
5. Ensure your callback URL is listed:
   ```
   https://maimaiusa.com/auth/discord/callback
   ```
   (or your actual domain)

#### 3. Check Server Logs

After the fixes, the server will log:
- Configuration on startup
- Discord authentication attempts
- Errors during authentication

Look for these messages:
- `🔧 Server Configuration:` - Shows all config values
- `Discord OAuth2 callback received:` - Shows when callback is processed
- `Authentication successful, redirecting to:` - Shows redirect URL
- Any error messages

#### 4. Common Issues

**Issue: `FRONTEND_URL` not set correctly**
- Check server logs for the actual `FRONTEND_URL` value
- It should match your frontend domain exactly

**Issue: Callback URL mismatch**
- The callback URL in Discord Developer Portal must match exactly
- Check protocol (https vs http)
- Check domain (with or without www)
- Check path (`/auth/discord/callback`)

**Issue: CORS errors**
- Make sure `FRONTEND_URL` in backend matches your frontend domain
- Check browser console for CORS errors

**Issue: Session cookies not working**
- In production, HTTPS is required
- Check that `NODE_ENV=production` is set
- Session cookies won't work over HTTP in production

**Issue: Same domain setup**
- If frontend and API are on the same domain, you might need a reverse proxy
- Make sure `/auth/*` routes go to the API server
- Make sure `/api/*` routes go to the API server

#### 5. Testing the Flow

1. **Start the server** and check startup logs:
   ```bash
   npm run server
   ```
   You should see:
   ```
   🔧 Server Configuration:
      FRONTEND_URL: https://maimaiusa.com
      DISCORD_CALLBACK_URL: https://maimaiusa.com/auth/discord/callback
      ...
   ```

2. **Click "Login with Discord"**
   - Should redirect to Discord
   - Authorize the application
   - Should redirect back to your callback URL

3. **Check server logs** during the callback:
   - Should see: `Discord OAuth2 callback received:`
   - Should see: `Authentication successful, redirecting to:`
   - Should redirect to frontend

#### 6. Debug Mode

If still having issues, you can check the actual redirect URL:

Look at the server logs after clicking login:
```
Authentication successful, redirecting to: https://maimaiusa.com
```

If this URL is wrong, check your `FRONTEND_URL` environment variable.

#### 7. Error Parameters

If authentication fails, the URL will include an error parameter:
```
https://maimaiusa.com?auth_error=Authentication failed
```

Check the browser URL bar after callback to see if there are any error messages.

## Quick Checklist

- [ ] `.env` file has correct `FRONTEND_URL`
- [ ] `.env` file has correct `DISCORD_CALLBACK_URL`
- [ ] Discord Developer Portal has matching callback URL
- [ ] Server logs show correct configuration
- [ ] HTTPS is enabled (production)
- [ ] `NODE_ENV=production` is set (production)
- [ ] Server is running and accessible
- [ ] No CORS errors in browser console

## Still Having Issues?

1. Check server logs for error messages
2. Check browser console for errors
3. Verify all environment variables are set
4. Test with curl to see if callback endpoint works:
   ```bash
   curl -v "https://maimaiusa.com/auth/discord/callback?code=test"
   ```

