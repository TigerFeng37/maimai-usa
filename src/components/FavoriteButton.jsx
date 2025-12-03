import { useState, useEffect } from 'react'
import { addFavorite, removeFavorite, isFavorited } from '../utils/favoritesApi'
import { getCurrentUser } from '../utils/authApi'

function FavoriteButton({ storeId, className = '', small = false }) {
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    loadUserAndFavoriteStatus()
  }, [storeId])

  const loadUserAndFavoriteStatus = async () => {
    setLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      
      if (currentUser) {
        const isFav = await isFavorited(storeId)
        setFavorited(isFav)
      } else {
        setFavorited(false)
      }
    } catch (error) {
      console.error('Error loading favorite status:', error)
      setFavorited(false)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (e) => {
    e.stopPropagation()
    
    if (!user) {
      // Redirect to login or show message
      alert('Please login to use the favorite feature')
      return
    }

    if (!storeId) {
      console.error('No storeId provided to FavoriteButton')
      alert('Invalid location ID')
      return
    }

    try {
      if (favorited) {
        console.log(`Removing favorite for storeId: ${storeId}`)
        await removeFavorite(storeId)
        setFavorited(false)
      } else {
        console.log(`Adding favorite for storeId: ${storeId}`)
        await addFavorite(storeId)
        setFavorited(true)
      }
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('favorite-changed'))
    } catch (error) {
      console.error('Error toggling favorite:', error)
      console.error('StoreId:', storeId)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
      alert(`Failed to toggle favorite: ${error.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <button
        className={`${small ? "p-0.5" : "p-2"} ${className}`}
        disabled
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={`${small ? "p-0.5" : "p-2"} hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors ${className}`}
      title={favorited ? 'Remove from Favorites' : 'Add to Favorites'}
    >
      <svg 
        width="20" 
        height="20" 
        fill={favorited ? "currentColor" : "none"} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        className={favorited ? "text-[#41BCCC]" : "text-gray-500 dark:text-gray-400"}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
        />
      </svg>
    </button>
  )
}

export default FavoriteButton

