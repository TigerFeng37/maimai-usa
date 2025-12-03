import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
const DATA_DIR = join(dirname(__dirname), 'data')

// Helper function to get forum file path
function getForumFilePath() {
  return join(DATA_DIR, 'forum.json')
}

// Helper function to read forum data
async function readForum() {
  try {
    const filePath = getForumFilePath()
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { posts: [], reactions: [], replies: [] }
    }
    throw error
  }
}

// Helper function to write forum data
async function writeForum(forum) {
  const filePath = getForumFilePath()
  await fs.mkdir(dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(forum, null, 2), 'utf-8')
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.status(401).json({ error: 'Authentication required' })
  }
}

// GET /api/forum - Health check endpoint
router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'forum', timestamp: new Date().toISOString() })
})

// GET /api/forum/posts - Get all posts (with optional filtering)
router.get('/posts', async (req, res) => {
  try {
    const { storeId, limit = 50, offset = 0 } = req.query
    const forum = await readForum()
    
    let posts = forum.posts || []

    // Filter by storeId if provided
    if (storeId) {
      posts = posts.filter(post => post.storeId === storeId)
    }

    // Sort by timestamp, newest first
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Apply pagination
    const paginatedPosts = posts.slice(parseInt(offset), parseInt(offset) + parseInt(limit))

    // Attach reactions and reply counts
    const postsWithStats = paginatedPosts.map(post => {
      const reactions = (forum.reactions || []).filter(r => r.postId === post.id)
      const replies = (forum.replies || []).filter(r => r.postId === post.id)
      
      return {
        ...post,
        reactionCount: reactions.length,
        replyCount: replies.length,
        userReactions: req.user 
          ? reactions.filter(r => r.userId === req.user.id)
          : []
      }
    })

    res.json({
      posts: postsWithStats,
      total: posts.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

// GET /api/forum/posts/:postId - Get a single post with replies
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const forum = await readForum()
    
    const post = (forum.posts || []).find(p => p.id === postId)
    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const reactions = (forum.reactions || []).filter(r => r.postId === postId)
    const replies = (forum.replies || []).filter(r => r.postId === postId)
    
    // Sort replies by timestamp
    replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    res.json({
      ...post,
      reactions,
      replies,
      reactionCount: reactions.length,
      replyCount: replies.length
    })
  } catch (error) {
    console.error('Error fetching post:', error)
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

// POST /api/forum/posts - Create a new post
router.post('/posts', async (req, res) => {
  try {
    const { title, content, storeId, tags, type, issues, description, storeName, address, city, state } = req.body

    // For regular posts, require authentication and title/content
    if (!type || type !== 'report') {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for forum posts' })
      }
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
      }
    }

    // For report posts, issues are required
    if (type === 'report') {
      if (!issues || !Array.isArray(issues) || issues.length === 0) {
        return res.status(400).json({ error: 'At least one issue is required for reports' })
      }
    }

    const forum = await readForum()
    const posts = forum.posts || []

    const newPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : 'Anonymous',
      avatar: req.user ? req.user.avatar : null,
      type: type || 'post', // 'post' or 'report'
      title: title || (type === 'report' ? 'Issue Report' : title),
      content: content || description || '',
      storeId: storeId || null,
      tags: tags || [],
      // Report-specific fields
      issues: issues || [],
      storeName: storeName || null,
      address: address || null,
      city: city || null,
      state: state || null,
      resolved: type === 'report' ? false : undefined,
      resolvedBy: null,
      resolvedAt: null,
      workingStatus: type === 'report' ? null : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    posts.push(newPost)
    forum.posts = posts
    await writeForum(forum)

    res.status(201).json(newPost)
  } catch (error) {
    console.error('Error creating post:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

// PATCH /api/forum/posts/:postId - Update a post
router.patch('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const { title, content, tags, resolved, workingStatus } = req.body

    const forum = await readForum()
    const postIndex = (forum.posts || []).findIndex(p => p.id === postId)

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const post = forum.posts[postIndex]

    // For regular posts, require authentication for content edits
    // For report status updates (resolved, workingStatus), allow anyone (including anonymous)
    if (title !== undefined || content !== undefined || tags !== undefined) {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for editing post content' })
      }
      if (post.userId !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own posts' })
      }
    }

    // Update post
    if (title !== undefined) post.title = title
    if (content !== undefined) post.content = content
    if (tags !== undefined) post.tags = tags
    
    // Report-specific updates (allowed for anyone, including anonymous users)
    if (resolved !== undefined) {
      post.resolved = resolved
      if (resolved && !post.resolvedAt) {
        post.resolvedAt = new Date().toISOString()
      } else if (!resolved) {
        post.resolvedAt = null
      }
    }
    
    if (workingStatus !== undefined) {
      post.workingStatus = workingStatus
      // Auto-update resolved status based on workingStatus
      if (workingStatus === 'yes' && !post.resolved) {
        post.resolved = true
        post.resolvedAt = new Date().toISOString()
      } else if (workingStatus === 'no' && post.resolved) {
        post.resolved = false
        post.resolvedAt = null
      }
    }
    
    post.updatedAt = new Date().toISOString()

    forum.posts[postIndex] = post
    await writeForum(forum)

    res.json(post)
  } catch (error) {
    console.error('Error updating post:', error)
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// DELETE /api/forum/posts/:postId - Delete a post
router.delete('/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params

    const forum = await readForum()
    const postIndex = (forum.posts || []).findIndex(p => p.id === postId)

    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const post = forum.posts[postIndex]

    // Check if user owns the post
    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' })
    }

    // Delete post and associated data
    forum.posts = forum.posts.filter(p => p.id !== postId)
    forum.reactions = (forum.reactions || []).filter(r => r.postId !== postId)
    forum.replies = (forum.replies || []).filter(r => r.postId !== postId)

    await writeForum(forum)

    res.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// POST /api/forum/posts/:postId/reactions - Add a reaction to a post
router.post('/posts/:postId/reactions', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params
    const { emoji = '👍' } = req.body

    const forum = await readForum()
    const posts = forum.posts || []
    const post = posts.find(p => p.id === postId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const reactions = forum.reactions || []

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      r => r.postId === postId && r.userId === req.user.id && r.emoji === emoji
    )

    if (existingReaction) {
      // Remove reaction
      forum.reactions = reactions.filter(r => r.id !== existingReaction.id)
    } else {
      // Remove any existing reaction from this user
      forum.reactions = reactions.filter(
        r => !(r.postId === postId && r.userId === req.user.id)
      )

      // Add new reaction
      const newReaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        postId,
        userId: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        emoji,
        createdAt: new Date().toISOString()
      }
      forum.reactions.push(newReaction)
    }

    await writeForum(forum)

    const postReactions = forum.reactions.filter(r => r.postId === postId)
    res.json({ reactions: postReactions })
  } catch (error) {
    console.error('Error updating reaction:', error)
    res.status(500).json({ error: 'Failed to update reaction' })
  }
})

// POST /api/forum/posts/:postId/replies - Add a reply to a post
router.post('/posts/:postId/replies', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params
    const { content, parentReplyId } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const forum = await readForum()
    const posts = forum.posts || []
    const post = posts.find(p => p.id === postId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    const replies = forum.replies || []

    const newReply = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      postId,
      parentReplyId: parentReplyId || null,
      userId: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    replies.push(newReply)
    forum.replies = replies
    await writeForum(forum)

    res.status(201).json(newReply)
  } catch (error) {
    console.error('Error creating reply:', error)
    res.status(500).json({ error: 'Failed to create reply' })
  }
})

// PATCH /api/forum/replies/:replyId - Update a reply
router.patch('/replies/:replyId', requireAuth, async (req, res) => {
  try {
    const { replyId } = req.params
    const { content } = req.body

    const forum = await readForum()
    const replyIndex = (forum.replies || []).findIndex(r => r.id === replyId)

    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' })
    }

    const reply = forum.replies[replyIndex]

    // Check if user owns the reply
    if (reply.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own replies' })
    }

    if (content !== undefined) reply.content = content
    reply.updatedAt = new Date().toISOString()

    forum.replies[replyIndex] = reply
    await writeForum(forum)

    res.json(reply)
  } catch (error) {
    console.error('Error updating reply:', error)
    res.status(500).json({ error: 'Failed to update reply' })
  }
})

// DELETE /api/forum/replies/:replyId - Delete a reply
router.delete('/replies/:replyId', requireAuth, async (req, res) => {
  try {
    const { replyId } = req.params

    const forum = await readForum()
    const replyIndex = (forum.replies || []).findIndex(r => r.id === replyId)

    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' })
    }

    const reply = forum.replies[replyIndex]

    // Check if user owns the reply
    if (reply.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own replies' })
    }

    // Delete reply and child replies
    const deleteReplyAndChildren = (id) => {
      forum.replies = forum.replies.filter(r => r.id !== id)
      const children = forum.replies.filter(r => r.parentReplyId === id)
      children.forEach(child => deleteReplyAndChildren(child.id))
    }

    deleteReplyAndChildren(replyId)
    await writeForum(forum)

    res.json({ message: 'Reply deleted successfully' })
  } catch (error) {
    console.error('Error deleting reply:', error)
    res.status(500).json({ error: 'Failed to delete reply' })
  }
})

export default router

