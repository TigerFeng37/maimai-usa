import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown } from '@carbon/icons-react'
import { getFavorites } from '../utils/favoritesApi'
import { getPosts } from '../utils/forumApi'
import { getTodayHours } from '../utils/hoursUtils'
import { getCurrentUser } from '../utils/authApi'
import { getPeopleCount } from '../utils/peopleCountApi'
import data from '../r1index-geocoded.json'
import FavoriteButton from './FavoriteButton'

function BookmarkPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const [favorites, setFavorites] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [latestPosts, setLatestPosts] = useState({})
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [newPostCount, setNewPostCount] = useState(0)
  const [newPostsByStore, setNewPostsByStore] = useState({})
  const [peopleCounts, setPeopleCounts] = useState({})
  const locationsRef = useRef([])
  const prevPathRef = useRef('')

  // Helper function to get last viewed timestamp for a store
  const getLastViewedTimestamp = (storeId) => {
    const key = `lastViewedPost_${storeId}`
    const timestamp = localStorage.getItem(key)
    return timestamp ? new Date(timestamp).getTime() : 0
  }

  // Helper function to update last viewed timestamp for a store
  const updateLastViewedTimestamp = (storeId, timestamp) => {
    const key = `lastViewedPost_${storeId}`
    if (timestamp) {
      localStorage.setItem(key, new Date(timestamp).toISOString())
    }
  }

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const favoriteIds = await getFavorites()
      setFavorites(favoriteIds)

      // Get location data for favorites
      const favoriteLocations = data.filter(loc => favoriteIds.includes(loc.storeid))
      setLocations(favoriteLocations)
      locationsRef.current = favoriteLocations

      // Auto-expand if user has bookmarked locations
      if (favoriteLocations.length > 0) {
        setIsCollapsed(false)
      }

      // Load latest posts for each favorite and check for new posts
      const postsMap = {}
      let newCount = 0
      const countsMap = {}

      for (const location of favoriteLocations) {
        try {
          // Load latest post
          const postsData = await getPosts({ storeId: location.storeid, limit: 1 })
          if (postsData.posts && postsData.posts.length > 0) {
            const latestPost = postsData.posts[0]
            postsMap[location.storeid] = latestPost

            // Check if this is a new post (created after last viewed time)
            const lastViewed = getLastViewedTimestamp(location.storeid)
            const postTime = new Date(latestPost.createdAt).getTime()
            if (postTime > lastViewed) {
              newCount++
            }
          }

          // Load people count
          try {
            const peopleData = await getPeopleCount(location.storeid)
            countsMap[location.storeid] = peopleData.count || 0
          } catch (error) {
            console.error(`Error loading people count for ${location.storeid}:`, error)
            countsMap[location.storeid] = 0
          }
        } catch (error) {
          console.error(`Error loading posts for ${location.storeid}:`, error)
        }
      }

      setLatestPosts(postsMap)
      setNewPostCount(newCount)
      setPeopleCounts(countsMap)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const checkUserAndLoadFavorites = async () => {
      setCheckingAuth(true)
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        if (currentUser) {
          loadFavorites()
        }
      } catch (error) {
        console.error('Error checking user:', error)
        setUser(null)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkUserAndLoadFavorites()
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

  // Listen for forum view events to update last viewed timestamps
  useEffect(() => {
    const handleForumView = (event) => {
      const { storeId, latestPostTime } = event.detail || {}
      if (storeId && latestPostTime) {
        updateLastViewedTimestamp(storeId, latestPostTime)
        // Reload favorites to update badge count
        loadFavorites()
      }
    }

    window.addEventListener('forum-viewed', handleForumView)
    return () => {
      window.removeEventListener('forum-viewed', handleForumView)
    }
  }, [loadFavorites])

  // Reload favorites when returning from detail view to update badge count
  useEffect(() => {
    const currentPath = location.pathname
    const wasOnDetailPage = prevPathRef.current.startsWith('/location/')
    const isOnDetailPage = currentPath.startsWith('/location/')
    
    // If user navigated from detail page to map/list view, reload favorites
    if (user && wasOnDetailPage && !isOnDetailPage) {
      loadFavorites()
    }
    
    prevPathRef.current = currentPath
  }, [location.pathname, user, loadFavorites])

  // Periodically refresh people counts for active locations
  useEffect(() => {
    if (!user || locations.length === 0) return

    const refreshPeopleCounts = async () => {
      const currentLocations = locationsRef.current
      const countsMap = {}
      
      await Promise.all(
        currentLocations.map(async (location) => {
          try {
            const peopleData = await getPeopleCount(location.storeid)
            countsMap[location.storeid] = peopleData.count || 0
          } catch (error) {
            console.error(`Error refreshing people count for ${location.storeid}:`, error)
            // On error, keep existing count (will be merged below)
          }
        })
      )
      
      // Merge new counts with existing ones (preserve counts on error)
      setPeopleCounts(prevCounts => ({ ...prevCounts, ...countsMap }))
    }

    // Refresh every 30 seconds
    const interval = setInterval(refreshPeopleCounts, 30000)
    return () => clearInterval(interval)
  }, [user, locations])

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

  // Hide component if user is not logged in
  if (checkingAuth) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <div className="fixed bottom-22 md:bottom-16 md:right-4 z-[1000] w-full md:w-96 max-h-[60vh] md:max-h-[calc(100vh-8rem)] flex flex-col">
      {/* Panel */}
      <div className="bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-700 rounded-none shadow-none md:shadow-xl overflow-hidden flex flex-col max-h-full">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-y md:border-b border-gray-200 dark:border-gray-700 py-2 px-2 flex items-center justify-between z-10 group">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2 py-1 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 rounded-md transition-colors flex items-center justify-between gap-2 w-full"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                Bookmarked Locations
              </span>
              {newPostCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 bg-[#41BCCC] text-white text-xs font-semibold rounded-full">
                  {newPostCount}
                </span>
              )}
            </div>
            <ChevronDown 
              size={20}
              className={`transition-transform ${isCollapsed ? 'rotate-180' : ''} text-gray-500 dark:text-gray-200`}
            />
          </button>
        </div>

        {!isCollapsed && (
          <div className="overflow-y-auto flex-1">
            <div className="p-0">
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
                <div className="space-y-4 grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                  {locations.map((location) => {
                    const todayHours = getTodayHours(location.hours)
                    const latestPost = latestPosts[location.storeid]

                    return (
                      <div
                        key={location.storeid}
                        className="border-b border-r border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer mb-0"
                        onClick={() => {
                          // Update last viewed timestamp when navigating to location
                          if (latestPosts[location.storeid]) {
                            updateLastViewedTimestamp(location.storeid, latestPosts[location.storeid].createdAt)
                            // Immediately update the badge state for this store
                            setNewPostsByStore(prev => ({ ...prev, [location.storeid]: false }))
                            setNewPostCount(prev => Math.max(0, prev - 1))
                          }
                          navigate(`/location/${location.storeid}`)
                        }}
                      >
                        {/* Header */}
                        <div className="flex flex-row items-start justify-between mb-2">
                          <div className="flex flex-col items-start flex-1">
                            <div className="flex flex-row items-center gap-1">
                              {location.code !== "N/A" && (
                                <span className="text-xs font-medium text-black dark:text-white px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                                  {location.code}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${location.active ? 'bg-[#41BCCC]/20 text-[#41BCCC]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                                {location.active ? 'Active' : 'Coming Soon'}
                              </span>
                              {newPostsByStore[location.storeid] && (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-[#41BCCC] text-white text-xs font-semibold rounded-full">
                                  1
                                </span>
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <h3 className="text-md font-medium text-gray-900 dark:text-white mt-2 leading-snug">
                                {location.name}
                              </h3>
                              {newPostsByStore[location.storeid] && (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-[#41BCCC] text-white text-xs font-semibold rounded-full mt-2">
                                  1
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {location.city}, {location.state}
                              </p>
                            </div>
                          </div>
                          <FavoriteButton storeId={location.storeid} small={true} />
                        </div>

                        {/* Today's Hours */}
                        {todayHours && (
                          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col items-start gap-0 text-sm">
                              <div className="flex flex-row items-center gap-1">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-500 dark:text-gray-400">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Today</span>
                              </div>
                              <span className="text-gray-900 dark:text-white">{todayHours}</span>
                            </div>
                          </div>
                          )}

                        {/* Quick Access Link */}
                        <div className="flex items-center justify-between bottom-0">
                          <span className="text-sm">
                            <span className="font-medium text-black dark:text-white">{peopleCounts[location.storeid] !== undefined ? peopleCounts[location.storeid] : '...'}</span>
                            <span className="text-gray-600 dark:text-gray-400"> Current Player(s)</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {newPostsByStore[location.storeid] && (
                              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-[#41BCCC] text-white text-xs font-semibold rounded-full">
                                1
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // Update last viewed timestamp when navigating to location
                                if (latestPosts[location.storeid]) {
                                  updateLastViewedTimestamp(location.storeid, latestPosts[location.storeid].createdAt)
                                  // Immediately update the badge state for this store
                                  setNewPostsByStore(prev => ({ ...prev, [location.storeid]: false }))
                                  setNewPostCount(prev => Math.max(0, prev - 1))
                                }
                                navigate(`/location/${location.storeid}`)
                              }}
                              className="text-sm text-[#41BCCC] hover:text-[#41BCCC]/80 font-medium flex items-center gap-1"
                            >
                              {/* <span className="hidden md:block">View Details</span> */}
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
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

