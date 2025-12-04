import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import data from './r1index-geocoded.json'
import Navbar from './components/Navbar'
import Forum from './components/Forum'
import FavoriteButton from './components/FavoriteButton'
import { createPost } from './utils/forumApi'
import { getCurrentUser, loginWithDiscord } from './utils/authApi'
import { getPeopleCount, updatePeopleCount } from './utils/peopleCountApi'

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for maimai locations
const activeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#41BCCC" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [25, 25],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const comingSoonIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="#c0c0c0" stroke="#ffffff" stroke-width="2"/>
      </svg>
    `),
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

function DetailView() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [location, setLocation] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedIssues, setSelectedIssues] = useState([])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [user, setUser] = useState(null)
  const [peopleCount, setPeopleCount] = useState(0)
  const [tempPeopleCount, setTempPeopleCount] = useState(0)
  const [isUpdatingPeopleCount, setIsUpdatingPeopleCount] = useState(false)
  const [isLoadingPeopleCount, setIsLoadingPeopleCount] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [updatedBy, setUpdatedBy] = useState(null)
  
  // Refs for polling to avoid dependency issues
  const peopleCountRef = useRef(peopleCount)
  const tempPeopleCountRef = useRef(tempPeopleCount)
  const isUpdatingRef = useRef(isUpdatingPeopleCount)
  const userRef = useRef(user)

  // Keep refs in sync with state
  useEffect(() => {
    peopleCountRef.current = peopleCount
  }, [peopleCount])

  useEffect(() => {
    tempPeopleCountRef.current = tempPeopleCount
  }, [tempPeopleCount])

  useEffect(() => {
    isUpdatingRef.current = isUpdatingPeopleCount
  }, [isUpdatingPeopleCount])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const foundLocation = data.find(loc => loc.storeid === storeId)
    setLocation(foundLocation)
    
    // If location not found, redirect back to list
    if (!foundLocation) {
      navigate('/list')
    }
  }, [storeId, navigate])

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (location && location.storeid) {
      loadPeopleCount()
    }
  }, [location])

  // Real-time polling for people count updates
  useEffect(() => {
    if (!location || !location.storeid) return

    // Polling interval: 5 seconds
    const POLL_INTERVAL = 5000
    let pollInterval = null

    const pollPeopleCount = async () => {
      try {
        // Skip polling if currently updating to avoid race conditions
        if (isUpdatingRef.current) return

        const data = await getPeopleCount(location.storeid)
        const newCount = data.count || 0
        const currentCount = peopleCountRef.current
        const currentTempCount = tempPeopleCountRef.current
        const currentUser = userRef.current
        
        // Only update if count has changed
        if (newCount !== currentCount) {
          setPeopleCount(newCount)
          // Update tempPeopleCount only if user is not logged in or not currently editing
          if (!currentUser || currentTempCount === currentCount) {
            setTempPeopleCount(newCount)
          }
        }
        
        // Always update lastUpdated and updatedBy from API response
        if (data.lastUpdated !== undefined) {
          setLastUpdated(data.lastUpdated)
        }
        if (data.updatedBy !== undefined) {
          setUpdatedBy(data.updatedBy)
        }
      } catch (error) {
        // Silently fail on polling errors to avoid console spam
        console.debug('Polling error (non-critical):', error)
      }
    }

    // Start polling
    pollInterval = setInterval(pollPeopleCount, POLL_INTERVAL)

    // Cleanup on unmount or when location changes
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [location?.storeid])

  const loadPeopleCount = async () => {
    if (!location || !location.storeid) return
    
    try {
      setIsLoadingPeopleCount(true)
      const data = await getPeopleCount(location.storeid)
      setPeopleCount(data.count || 0)
      setTempPeopleCount(data.count || 0)
      setLastUpdated(data.lastUpdated || null)
      setUpdatedBy(data.updatedBy || null)
    } catch (error) {
      console.error('Error loading people count:', error)
      setPeopleCount(0)
      setTempPeopleCount(0)
      setLastUpdated(null)
      setUpdatedBy(null)
    } finally {
      setIsLoadingPeopleCount(false)
    }
  }

  const handleUpdatePeopleCount = async () => {
    if (!user || !location || !location.storeid) return
    
    try {
      setIsUpdatingPeopleCount(true)
      const data = await updatePeopleCount(location.storeid, tempPeopleCount)
      setPeopleCount(data.count)
      setTempPeopleCount(data.count)
      setLastUpdated(data.lastUpdated || null)
      setUpdatedBy(data.updatedBy || null)
    } catch (error) {
      console.error('Error updating people count:', error)
      alert(error.message || 'Failed to update people count')
      // Reset to current count on error
      setTempPeopleCount(peopleCount)
    } finally {
      setIsUpdatingPeopleCount(false)
    }
  }

  const incrementPeopleCount = () => {
    setTempPeopleCount(prev => prev + 1)
  }

  const decrementPeopleCount = () => {
    setTempPeopleCount(prev => Math.max(0, prev - 1))
  }

  // Format timestamp to readable format (e.g., "10:35 PM Today")
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return null
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const updateDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      // Format time
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      const displayMinutes = minutes.toString().padStart(2, '0')
      const timeString = `${displayHours}:${displayMinutes} ${ampm}`
      
      // Check if today
      if (updateDate.getTime() === today.getTime()) {
        return `${timeString} Today`
      }
      
      // Check if yesterday
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (updateDate.getTime() === yesterday.getTime()) {
        return `${timeString} Yesterday`
      }
      
      // Otherwise show date
      const month = date.toLocaleString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${timeString} ${month} ${day}`
    } catch (error) {
      console.error('Error formatting timestamp:', error)
      return null
    }
  }

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!showReportModal) {
      setSelectedIssues([])
      setDescription('')
      setSubmitSuccess(false)
    }
  }, [showReportModal])

  const handleBack = () => {
    // Use View Transitions API if supported
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate(-1)
      })
    } else {
      navigate(-1)
    }
  }

  const generateRound1URL = (location) => {
    if (!location) return ''
    // Convert name to URL-friendly format based on Round1's URL pattern
    const urlName = location.name
      .replace('Round1 ', '')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
    return `https://www.round1usa.com/locations/${urlName}`
  }

  const generateMapsURL = (location) => {
    if (!location) return ''
    const query = encodeURIComponent(location.address)
    return `https://www.google.com/maps/search/?api=1&query=${query}`
  }

  const getStandardHours = (location) => {
    if (!location || !location.hours) return ''
    
    // Return hours from JSON data
    return location.hours
  }

  const formatHours = (hoursString) => {
    if (!hoursString) return null
    
    // Split by newline and format each line
    const lines = hoursString.split('\n').filter(line => line.trim())
    
    return lines.map((line, index) => {
      // Extract day and time range
      const match = line.match(/^(\w+day)\s+(.+)$/i)
      if (match) {
        const day = match[1]
        const time = match[2]
        return (
          <div key={index} className="flex justify-between items-start py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="font-medium text-gray-900 dark:text-white">{day}</span>
            <span className="text-gray-700 dark:text-gray-300 ml-4 text-right">{time}</span>
          </div>
        )
      }
      // Fallback if format doesn't match
      return (
        <div key={index} className="py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <span className="text-gray-900 dark:text-white">{line}</span>
        </div>
      )
    })
  }

  // Issue types for reporting
  const issueTypes = [
    'Broken Parts',
    'Offline',
    'Screen Issues',
    'Sound Problems',
    'Card Reader Issues',
    'Button Problems',
    'Arcade Closed',
    'Other'
  ]

  const toggleIssue = (issue) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    )
  }

  const handleSubmitReport = async () => {
    if (selectedIssues.length === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      // Create new report as a forum post (reports can be submitted anonymously)
      await createPost({
        type: 'report',
        issues: [...selectedIssues],
        description: description.trim(),
        storeId: storeId,
        storeName: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
      })

      setIsSubmitting(false)
      setSubmitSuccess(true)
      // Trigger forum refresh
      window.dispatchEvent(new Event('forum-refresh'))
      setTimeout(() => {
        setShowReportModal(false)
      }, 1500)
    } catch (error) {
      console.error('Error submitting report:', error)
      setIsSubmitting(false)
      const errorMessage = error.message || 'Failed to submit report'
      alert(errorMessage)
    }
  }

  if (!location) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="text-xl text-gray-600">Location not found</div>
          <button 
            onClick={() => navigate('/list')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Back to List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen min-h-screen bg-white dark:bg-gray-900">
      {/* Header with integrated navbar and back button */}
      <div className="fixed top-0 w-full z-[1000]">
        <Navbar 
          showBackButton={true}
          onBackClick={handleBack}
        />
      </div>

      {/* Main content */}
      <div className="p-0 md:px-4 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 mt-[3rem] overflow-hidden">
            <div className="h-64 md:h-80 block md:hidden">
            {location.lat && location.lng && (
                <MapContainer 
                    center={[39.8283, -98.5795]} 
                    zoom={3} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    dragging={false}
                    touchZoom={false}
                    boxZoom={false}
                    keyboard={false}
                    attributionControl={false}
                >
                    <TileLayer
                        className="dark:invert dark:contrast-[.95] dark:saturate-0 dark:hue-rotate-15"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <Marker
                        position={[location.lat, location.lng]}
                        icon={location.active ? activeIcon : comingSoonIcon}
                    />
                </MapContainer>
                
            )}
            </div>
            <div className="h-64 md:h-95 hidden md:block">
            {location.lat && location.lng && (
                <MapContainer 
                center={[39.8283, -98.5795]} 
                zoom={4} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                dragging={false}
                touchZoom={false}
                boxZoom={false}
                keyboard={false}
                attributionControl={false}
                >
                    <TileLayer
                        className="dark:invert dark:contrast-[.95] dark:saturate-0 dark:hue-rotate-15"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <Marker
                        position={[location.lat, location.lng]}
                        icon={location.active ? activeIcon : comingSoonIcon}
                    />
                </MapContainer>
                
            )}
            </div>
        </div>
        {/* Location header */}
        <div className="bg-white dark:bg-gray-900 border p-6 border-t-0 border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:justify-between gap-4">
            <div>
                <div className="flex flex-row justify-between items-center gap-2 mb-2 w-full">
                    <div className="flex flex-row items-center gap-2">
                        {location.code !== "N/A" && (
                          <span className="text-sm font-medium text-black dark:text-white px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{location.code}</span>
                        )}
                        <span className="text-sm text-black dark:text-white px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{location.state}</span>
                        <span className={`text-sm text-black dark:text-white py-1 px-3 ${location.active ? 'bg-[#41BCCC]/20' : ' bg-gray-50 dark:bg-gray-800'} rounded-3xl flex flex-row items-center gap-2`}>
                            {location.active ? 'Active' : 'Coming Soon'}
                            <span className={`text-xs ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {location.index !== "-" && (
                        <span className="text-sm font-mono font-light text-gray-500">#{location.index}</span>
                      )}
                      {user && <FavoriteButton storeId={location.storeid} />}
                    </div>
                </div>
              <h1 className="text-3xl font-regular text-black dark:text-white">{location.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-md   ">{location.city}, {location.state}</p>
            </div>
          </div>
          
          <div className={`flex flex-row items-start gap-2 md:gap-1.5 mt-8 ${!location.active ? 'flex-col' : ''}`}>
            {/* Cabinet count */}
            <div className={`flex flex-col items-start ${location.active ? 'w-1/3 md:w-full' : 'w-full'}`}>
              <span className="text-4xl font-light text-[#41BCCC]">{location.cab_count}</span>
              <span className="text-sm text-black dark:text-white">Cabinet(s)</span>
            </div>

            {/* People Count Section - Visible to all, editable only for logged-in users - Only show for active locations */}
            {location.active && (
            <div className="pl-4 border-l border-gray-200 dark:border-gray-700 w-full">
              <div className="flex flex-col gap-0">
                {user ? (
                  <div className="flex flex-row items-center gap-2 mb-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={decrementPeopleCount}
                        disabled={isUpdatingPeopleCount || tempPeopleCount === 0}
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Decrease count"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13H5v-2h14v2z"/>
                        </svg>
                      </button>
                      <div className="flex-1 text-center">
                        {isLoadingPeopleCount ? (
                          <span className="text-4xl font-light text-[#41BCCC]">...</span>
                        ) : (
                          <span className="text-4xl font-light text-[#41BCCC]">{tempPeopleCount}</span>
                        )}
                      </div>
                      <button
                        onClick={incrementPeopleCount}
                        disabled={isUpdatingPeopleCount}
                        className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase count"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={handleUpdatePeopleCount}
                      disabled={isUpdatingPeopleCount || isLoadingPeopleCount || tempPeopleCount === peopleCount}
                      className="max-w-32 px-4 py-2 bg-[#41BCCC] text-white rounded-md hover:bg-[#3598a8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {isUpdatingPeopleCount ? 'Updating...' : 'Submit'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-start">
                    {isLoadingPeopleCount ? (
                      <span className="text-4xl font-light text-[#41BCCC]">...</span>
                    ) : (
                      <span className="text-4xl font-light text-[#41BCCC]">{peopleCount}</span>
                    )}
                  </div>
                )}
                <span className="text-sm text-black dark:text-white">
                  Current Players
                </span>
                
                {/* Last updated info */}
                {lastUpdated && updatedBy && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 flex-1">
                      {updatedBy.avatar ? (
                        <img
                          src={updatedBy.avatar}
                          alt={updatedBy.username}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const fallback = e.target.nextSibling
                            if (fallback && fallback.classList) {
                              fallback.classList.remove('hidden')
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ${updatedBy.avatar ? 'hidden' : ''}`}>
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                          {updatedBy.username ? updatedBy.username.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Updated by {updatedBy.username || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatLastUpdated(lastUpdated)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
        {/* Top Map Banner */}
        

        {/* Content grid */}
        <div className="grid md:grid-cols-2">
          {/* Hours and Contact Info */}
          <div className="bg-white dark:bg-gray-900 border p-6 border-gray-200 dark:border-gray-700 border-t-0 flex flex-col justify-between">
            {/* <h2 className="text-xl font-medium text-gray-900 mb-4">Information</h2> */}
            
            <div>
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">Hours of Operation</h3>
                <div className="text-base">
                  {formatHours(getStandardHours(location))}
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact Information</h3>
                <div>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Phone:</span> 
                    <a href={`tel:${location.phone}`} className="ml-2 text-blue-500 hover:text-blue-800">
                      {location.phone}
                    </a>
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Official Website:</span> 
                    <a 
                      href={location.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-500 hover:text-blue-800 inline-block max-w-xs truncate align-middle"
                      title={location.website}
                      style={{ maxWidth: '200px', verticalAlign: 'middle' }}
                    >
                      {location.website} ↗
                    </a>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Address</h3>
                <p className="text-gray-900 dark:text-white text-lg">{location.address}</p>
              </div>
            </div>
            
            {/* Report Issue Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Report Issue
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-t-0 border-l-0">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white p-6">Location</h2>
            <div className="aspect-square overflow-hidden border border-x-0 border-gray-200 dark:border-gray-700">
              {location.lat && location.lng && (
                <MapContainer 
                  center={[location.lat, location.lng]} 
                  zoom={16} 
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                  className="z-0 [&_.leaflet-control-zoom]:dark:invert"
                >
                  <TileLayer
                    className="dark:invert dark:contrast-[.95] dark:saturate-0 dark:hue-rotate-15"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  <Marker
                    position={[location.lat, location.lng]}
                    icon={location.active ? activeIcon : comingSoonIcon}
                  />
                </MapContainer>
              )}
            </div>
            <div className="p-6">
              <a
                href={generateMapsURL(location)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Maps
              </a>
            </div>
          </div>
        </div>

        {/* Unified Forum & Status Feed */}
        {location && (
          <Forum storeId={location.storeid} locationName={location.name} />
        )}
      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <div 
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportModal(false)
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Report Issue
                </h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Please select the issue(s) you encountered with the cabinets at this location.
              </p>

              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <svg className="mx-auto w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Report Submitted!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your email client should open with the report details. Thank you for reporting!
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Issue Type(s) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {issueTypes.map((issue) => (
                        <label
                          key={issue}
                          className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIssues.includes(issue)}
                            onChange={() => toggleIssue(issue)}
                            className="w-4 h-4 min-w-[1rem] min-h-[1rem] flex-shrink-0 accent-[#41BCCC] border-gray-300 rounded focus:ring-[#41BCCC]"
                          />
                          <span className="ml-3 text-sm text-gray-900 dark:text-white">
                            {issue}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide any additional information about the issue..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#41BCCC] focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={selectedIssues.length === 0 || isSubmitting}
                      className="flex-1 px-4 py-2 bg-[#41BCCC] text-white rounded-md hover:bg-[#41BCCC]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailView
