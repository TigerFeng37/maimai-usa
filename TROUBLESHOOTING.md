# Troubleshooting Guide

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

