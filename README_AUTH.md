# User Authentication & Forum Feature

This document describes the user authentication system using Discord OAuth2 and the forum feature.

## Setup

### 1. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "OAuth2" section
4. Add a redirect URI:
   - For local development: `http://localhost:3001/auth/discord/callback`
   - For production: `https://your-domain.com/auth/discord/callback`
5. Copy your **Client ID** and **Client Secret**

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Discord OAuth2 Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173

# Session Secret (generate a random string for production)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# API Configuration
PORT=3001
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Install Dependencies

```bash
npm install
# or
yarn install
```

This will install:
- `passport` - Authentication middleware
- `passport-discord` - Discord OAuth2 strategy
- `express-session` - Session management
- `dotenv` - Environment variable management

### 4. Start the Server

```bash
npm run server
# or
yarn server
```

The API server will start on `http://localhost:3001`.

## Features

### User Authentication

- **Discord OAuth2 Login**: Users can log in with their Discord accounts
- **Session Management**: Sessions are stored server-side using express-session
- **User Profiles**: User information (username, avatar) is automatically synced from Discord
- **Persistent Login**: Sessions last 24 hours by default

### Reports with User Association

- Reports now include the user who created them
- Users' Discord avatars and usernames are displayed with reports
- Reports can still be created anonymously (if not logged in)

### Forum Feature

Users can:
- **Create Posts**: Share information, ask questions, or discuss topics
- **React to Posts**: Add emoji reactions (👍 by default)
- **Reply to Posts**: Create threaded discussions
- **Edit/Delete**: Users can edit or delete their own posts and replies
- **Store-Specific Posts**: Posts can be associated with specific locations

## API Endpoints

### Authentication

- `GET /auth/discord` - Initiate Discord OAuth2 login
- `GET /auth/discord/callback` - Discord OAuth2 callback
- `POST /auth/logout` - Logout current user
- `GET /auth/status` - Check authentication status
- `GET /api/user` - Get current authenticated user

### Forum

- `GET /api/forum/posts?storeId=xxx&limit=50&offset=0` - Get posts (with optional filtering)
- `GET /api/forum/posts/:postId` - Get a single post with replies
- `POST /api/forum/posts` - Create a new post (requires auth)
- `PATCH /api/forum/posts/:postId` - Update a post (requires auth, owner only)
- `DELETE /api/forum/posts/:postId` - Delete a post (requires auth, owner only)
- `POST /api/forum/posts/:postId/reactions` - Add/toggle reaction (requires auth)
- `POST /api/forum/posts/:postId/replies` - Add a reply (requires auth)
- `PATCH /api/forum/replies/:replyId` - Update a reply (requires auth, owner only)
- `DELETE /api/forum/replies/:replyId` - Delete a reply (requires auth, owner only)

## Frontend Components

### AuthButton

A component that displays:
- Login button (if not authenticated)
- User avatar and username with logout button (if authenticated)

Located in the Navbar component.

### Forum

A forum component that displays:
- List of posts for a location
- Post creation modal
- Reactions and reply counts
- Post deletion (for own posts)

Located in the DetailView component, below the Status Feed.

## Data Storage

All data is stored in JSON files in the `server/data/` directory:
- `users.json` - User accounts (created on first Discord login)
- `forum.json` - Forum posts, replies, and reactions
- `reports_{storeId}.json` - Issue reports for each store

## Security Notes

1. **Session Secret**: Change `SESSION_SECRET` to a strong random string in production
2. **HTTPS**: Use HTTPS in production to protect session cookies
3. **CORS**: Configure `FRONTEND_URL` correctly for your deployment
4. **Discord Redirect**: Ensure Discord callback URL matches your deployment URL

## Development vs Production

### Development
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3001` (Express server)
- Callback: `http://localhost:3001/auth/discord/callback`

### Production
- Update `FRONTEND_URL` to your production frontend URL
- Update `DISCORD_CALLBACK_URL` to your production callback URL
- Use a strong `SESSION_SECRET`
- Enable HTTPS for secure session cookies
- Set `NODE_ENV=production` for secure cookie flags

