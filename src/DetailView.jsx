import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import data from './r1index-geocoded.json'
import Navbar from './components/Navbar'

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
  const { locationCode } = useParams()
  const navigate = useNavigate()
  const [location, setLocation] = useState(null)
  useEffect(() => {
    const foundLocation = data.find(loc => loc.code === locationCode)
    setLocation(foundLocation)
    
    // If location not found, redirect back to list
    if (!foundLocation) {
      navigate('/list')
    }
  }, [locationCode, navigate])

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
    if (!location) return ''
    
    // Return standard Round1 hours since CORS proxy services are unreliable
    // Most Round1 locations follow similar hours, with some variations
    return "Daily 10:00 AM - 2:00 AM"
  }

  const getContactInfo = () => {
    // Standard Round1 customer support
    return {
      phone: "855-772-6636",
      website: "round1usa.com"
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
                        <span className="text-sm font-medium text-black dark:text-white px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{location.code}</span>
                        <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">{location.state}</span>
                        <span className={`text-sm text-black dark:text-white py-1 px-3 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50'} rounded-3xl flex flex-row items-center gap-2`}>
                            {location.active ? 'Active' : 'Coming Soon'}
                            <span className={`text-xs ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                        </span>
                    </div>
                    <span className="text-sm font-mono font-light text-gray-500">#{location.index}</span>
                </div>
              <h1 className="text-3xl font-regular text-black dark:text-white">{location.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-md   ">{location.city}, {location.state}</p>
            </div>
          </div>
          
          {/* Cabinet count */}
          <div className="flex flex-col items-start mt-8">
            <span className="text-4xl font-light text-[#41BCCC]">{location.cab_count}</span>
            <span className="text-sm text-black dark:text-white">Cabinets</span>
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
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Hours of Operation</h3>
                <p className="text-gray-900 dark:text-white text-lg">{getStandardHours(location)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Standard hours - Check{' '}
                  <a 
                    href={generateRound1URL(location)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-800 underline"
                  >
                    official website
                  </a>
                  {' '}for current hours
                </p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Contact Information</h3>
                <div>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Phone:</span> 
                    <a href={`tel:${getContactInfo().phone}`} className="ml-2 text-blue-500 hover:text-blue-800">
                      {getContactInfo().phone}
                    </a>
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Website:</span> 
                    <a 
                      href={generateRound1URL(location)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-500 hover:text-blue-800"
                    >
                      View Official Website ↗
                    </a>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Address</h3>
                <p className="text-gray-900 dark:text-white text-lg">{location.address}</p>
              </div>
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-800 transition-colors duration-200"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailView
