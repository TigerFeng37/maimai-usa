import { useState, useEffect } from 'react'
import { getCurrentUser, loginWithDiscord, logout } from '../utils/authApi'
import { Logout } from '@carbon/icons-react'
import discordIcon from '../assets/discord.svg'

function AuthButton() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    loginWithDiscord()
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {user.avatar && (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">
            {user.username}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex flex-row items-center gap-1 px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <Logout size={16} />
          <span className="hidden md:block">Logout</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center gap-2 px-2 py-1 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] transition-colors"
    >
      <img src={discordIcon} alt="Discord" className="w-4 h-4 top-[.1rem]" />
      <span className="text-md">Login</span>
    </button>
  )
}

export default AuthButton

