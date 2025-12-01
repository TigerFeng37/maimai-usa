import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavorites } from '../utils/favoritesApi'
import { getPosts } from '../utils/forumApi'
import { getTodayHours } from '../utils/hoursUtils'
import data from '../r1index-geocoded.json'
import FavoriteButton from './FavoriteButton'

function BookmarkPanel() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [latestPosts, setLatestPosts] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(false)

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const favoriteIds = await getFavorites()
      setFavorites(favoriteIds)

      // Get location data for favorites
      const favoriteLocations = data.filter(loc => favoriteIds.includes(loc.storeid))
      setLocations(favoriteLocations)

      // Load latest posts for each favorite
      const postsMap = {}
      for (const location of favoriteLocations) {
        try {
          const postsData = await getPosts({ storeId: location.storeid, limit: 1 })
          if (postsData.posts && postsData.posts.length > 0) {
            postsMap[location.storeid] = postsData.posts[0]
          }
        } catch (error) {
          console.error(`Error loading posts for ${location.storeid}:`, error)
        }
      }
      setLatestPosts(postsMap)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  // Listen for favorite changes
  useEffect(() => {
    const handleFavoriteChange = () => {
      loadFavorites()
    }
    
    window.addEventListener('favorite-changed', handleFavoriteChange)
    return () => {
      window.removeEventListener('favorite-changed', handleFavoriteChange)
    }
  }, [loadFavorites])

  const formatPostTime = (timestamp) => {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="fixed bottom-16 right-4 z-[1000] w-[calc(100%-2rem)] md:w-96 max-h-[calc(100vh-8rem)] flex flex-col">
      {/* Panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-full">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-2 px-4 flex items-center justify-between z-10">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-between gap-2 w-full"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Bookmarked Locations
            </h2>
            <svg 
              width="20" 
              height="20" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {!isCollapsed && (
          <div className="overflow-y-auto flex-1">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                </div>
              ) : locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No bookmarked locations</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Click on a location on the map, then click the bookmark button to add it to your bookmarks</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {locations.map((location) => {
                    const todayHours = getTodayHours(location.hours)
                    const latestPost = latestPosts[location.storeid]

                    return (
                      <div
                        key={location.storeid}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => {
                          navigate(`/location/${location.storeid}`)
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                              {location.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {location.city}, {location.state}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {location.code !== "N/A" && (
                              <span className="text-xs font-medium text-black dark:text-white px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                                {location.code}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${location.active ? 'bg-[#41BCCC]/20 text-[#41BCCC]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                              {location.active ? 'Active' : 'Coming Soon'}
                            </span>
                          </div>
                          <FavoriteButton storeId={location.storeid} />
                        </div>

                        {/* Today's Hours */}
                        {todayHours && (
                          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-500 dark:text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Today:</span>
                              <span className="text-gray-900 dark:text-white">{todayHours}</span>
                            </div>
                          </div>
                        )}

                        {/* Latest Post */}
                        {latestPost && (
                          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-2">
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-500 dark:text-gray-400 mt-0.5">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {latestPost.type === 'report' ? 'Issue Report' : 'Latest Update'}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatPostTime(latestPost.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                  {latestPost.title || latestPost.content?.substring(0, 100) || 'No content'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Access Link */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {location.cab_count} Cabinet(s)
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/location/${location.storeid}`)
                            }}
                            className="text-sm text-[#41BCCC] hover:text-[#41BCCC]/80 font-medium flex items-center gap-1"
                          >
                            View Details
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookmarkPanel

