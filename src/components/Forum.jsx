import { useState, useEffect } from 'react'
import { getPosts, createPost, reactToPost, deletePost, updatePost } from '../utils/forumApi'
import { getCurrentUser, loginWithDiscord } from '../utils/authApi'

function Forum({ storeId, locationName }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [user, setUser] = useState(null)
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: [] })

  useEffect(() => {
    loadUser()
    loadPosts()
  }, [storeId])

  // Listen for custom event to refresh posts (e.g., after report submission)
  useEffect(() => {
    const handleRefresh = () => {
      loadPosts()
    }
    window.addEventListener('forum-refresh', handleRefresh)
    return () => {
      window.removeEventListener('forum-refresh', handleRefresh)
    }
  }, [])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await getPosts({ storeId, limit: 20 })
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!user) {
      loginWithDiscord()
      return
    }

    if (!newPost.title || !newPost.content) {
      alert('Please fill in both title and content')
      return
    }

    try {
      await createPost({
        title: newPost.title,
        content: newPost.content,
        storeId: storeId || null,
        tags: newPost.tags
      })
      setNewPost({ title: '', content: '', tags: [] })
      setShowCreateModal(false)
      loadPosts()
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    }
  }

  const handleReact = async (postId) => {
    if (!user) {
      loginWithDiscord()
      return
    }

    try {
      await reactToPost(postId, '👍')
      loadPosts()
    } catch (error) {
      console.error('Error reacting to post:', error)
      const errorMessage = error.message || 'Failed to react to post'
      alert(errorMessage)
    }
  }

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await deletePost(postId)
      loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  const handleMarkResolved = async (postId) => {
    try {
      await updatePost(postId, { resolved: true })
      loadPosts()
    } catch (error) {
      console.error('Error marking report as resolved:', error)
    }
  }

  const handleWorkingStatus = async (postId, status) => {
    try {
      await updatePost(postId, { workingStatus: status })
      loadPosts()
    } catch (error) {
      console.error('Error updating working status:', error)
      const errorMessage = error.message || 'Failed to update working status'
      alert(errorMessage)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just Now'
    if (diffMins < 60) return `${diffMins} Minutes Ago`
    if (diffHours < 24) return `${diffHours} Hours Ago`
    if (diffDays < 7) return `${diffDays} Days Ago`
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Loading forum...
      </div>
    )
  }

  return (
    <div className="hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-t-0 mt-0 md:mt-0">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Community Feed
          </h2>
          <button
            onClick={() => {
              if (!user) {
                loginWithDiscord()
              } else {
                setShowCreateModal(true)
              }
            }}
            className="px-3 py-1 flex flex-row items-center gap-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-md ml-[-0.25rem]"><svg aria-label="Add" width="20" height="20" focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><path d="M15 9.5H10.5V5a.5.5 0 0 0-1 0v4.5H5a.5.5 0 0 0 0 1h4.5V15a.5.5 0 0 0 1 0V10.5H15a.5.5 0 0 0 0-1z" fill="currentColor"></path></svg></span>
            <span className="text-md">New Post</span>
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No posts yet</p>
            <p className="text-sm mt-2">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className={`border rounded-lg p-4 transition-colors ${
                  post.type === 'report' && post.resolved
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : post.type === 'report'
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {post.avatar && (
                      <img
                        src={post.avatar}
                        alt={post.username}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {post.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(post.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.type === 'report' && (
                      <>
                        {post.resolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                            Unresolved
                          </span>
                        )}
                      </>
                    )}
                    {user && user.id === post.userId && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {post.type === 'report' ? (
                  <>
                    {post.issues && post.issues.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {post.issues.map((issue, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                    {post.content && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 wrap-break-anywhere">
                        {post.content}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {post.type === 'report' ? (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      {post.resolved && post.workingStatus && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`font-medium ${
                            post.workingStatus === 'yes'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {post.workingStatus === 'yes' ? 'Working Now' : 'Still Not Working'}
                          </span>
                        </div>
                      )}
                      {post.resolved && !post.workingStatus && (
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400 mb-2 block">
                            Is it Working Now?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleWorkingStatus(post.id, 'yes')}
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleWorkingStatus(post.id, 'no')}
                              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                      {!post.resolved && !post.workingStatus && (
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400 mb-2 block">
                            Is it Working Now?
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleWorkingStatus(post.id, 'yes')}
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleWorkingStatus(post.id, 'no')}
                              className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                      {!post.resolved && post.workingStatus && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Status:</span>
                          <span className={`font-medium ${
                            post.workingStatus === 'yes'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {post.workingStatus === 'yes' ? 'Working Now' : 'Still Not Working'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {user ? (
                      <button
                        onClick={() => handleReact(post.id)}
                        className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                          post.userReactions && post.userReactions.length > 0
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span>👍</span>
                        <span className="text-sm">{post.reactionCount || 0}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 text-gray-500 dark:text-gray-400">
                        <span>👍</span>
                        <span className="text-sm">{post.reactionCount || 0}</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {post.replyCount || 0} replies
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false)
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Create New Post
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Post title..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Post content..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Forum

