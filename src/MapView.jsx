import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import data from './r1index-geocoded.json';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import BookmarkPanel from './components/BookmarkPanel';
import FavoriteButton from './components/FavoriteButton';
import { getCurrentUser } from './utils/authApi';
import { getFavorites } from './utils/favoritesApi';
import { isRecentLocation } from './utils/recentLocations';
import './mapStyles.css';

const DEFAULT_MAP_CENTER = [39.8283, -98.5795];
const DEFAULT_MAP_ZOOM = typeof window !== 'undefined' && window.innerWidth >= 768 ? 5 : 3;

// Apple Maps–style ease-out for map transitions
function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function animateMapTo(map, targetCenter, targetZoom, { duration = 1100 } = {}) {
  const startCenter = map.getCenter();
  const startZoom = map.getZoom();
  const endLat = targetCenter.lat ?? targetCenter[0];
  const endLng = targetCenter.lng ?? targetCenter[1];
  const startTime = performance.now();

  // Cancel any in-flight custom animation
  if (map._easeAnimFrame) {
    cancelAnimationFrame(map._easeAnimFrame);
    map._easeAnimFrame = null;
  }

  return new Promise((resolve) => {
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const e = easeOutQuint(t);

      const lat = startCenter.lat + (endLat - startCenter.lat) * e;
      const lng = startCenter.lng + (endLng - startCenter.lng) * e;
      const zoom = startZoom + (targetZoom - startZoom) * e;

      map.setView([lat, lng], zoom, { animate: false });

      if (t < 1) {
        map._easeAnimFrame = requestAnimationFrame(step);
      } else {
        map._easeAnimFrame = null;
        resolve();
      }
    };

    map._easeAnimFrame = requestAnimationFrame(step);
  });
}

function animateMapToBounds(map, bounds, { padding = [56, 56], maxZoom = 10, duration = 1100 } = {}) {
  const targetZoom = Math.min(
    map.getBoundsZoom(bounds, false, L.point(padding[0], padding[1])),
    maxZoom
  );
  return animateMapTo(map, bounds.getCenter(), targetZoom, { duration });
}

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Function to calculate icon size based on zoom level
const calculateIconSize = (zoom) => {
  // Base size at zoom level 5, scale between 12-30 pixels
  const baseZoom = 5;
  const baseSize = 15;
  const minSize = 12;
  const maxSize = 30;
  
  // Scale factor increases with zoom
  const scale = Math.pow(1.2, zoom - baseZoom);
  const size = Math.round(baseSize * scale);
  
  // Clamp between min and max sizes
  return Math.max(minSize, Math.min(maxSize, size));
};

// Function to create dynamic icons
const createActiveIcon = (zoom) => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#41BCCC" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [calculateIconSize(zoom), calculateIconSize(zoom)],
  iconAnchor: [calculateIconSize(zoom) / 2, calculateIconSize(zoom) / 2],
  popupAnchor: [0, -calculateIconSize(zoom) / 2]
});

const createComingSoonIcon = (zoom) => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#808080" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [calculateIconSize(zoom), calculateIconSize(zoom)],
  iconAnchor: [calculateIconSize(zoom) / 2, calculateIconSize(zoom) / 2],
  popupAnchor: [0, -calculateIconSize(zoom) / 2]
});

// Update marker icon sizes after zoom settles (avoid re-render thrash mid-gesture)
function ZoomHandler({ setZoom }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });

  return null;
}

// One-shot map recenter — runs once then calls onCentered so it can unmount
function ChangeMapView({ center, zoom, onCentered }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (hasCentered.current) return;
    if (center && center[0] && center[1]) {
      hasCentered.current = true;
      map.setView(center, zoom || map.getZoom());
      onCentered?.();
    }
  }, [center, zoom, map, onCentered]);

  return null;
}

// Fit map to selected state locations when state filters change
function FitStateBounds({ selectedStates }) {
  const map = useMap();
  const prevHadStates = useRef(false);
  const selectedStatesKey = selectedStates.slice().sort().join('|');

  useEffect(() => {
    const hasStates = selectedStates.length > 0;

    if (!hasStates) {
      if (prevHadStates.current) {
        animateMapTo(map, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      }
      prevHadStates.current = false;
      return;
    }

    prevHadStates.current = true;

    const locations = data.filter(
      (loc) => selectedStates.includes(loc.state) && loc.lat != null && loc.lng != null
    );

    if (!locations.length) return;

    const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
    if (!bounds.isValid()) return;

    animateMapToBounds(map, bounds, {
      padding: [56, 56],
      maxZoom: locations.length === 1 ? 11 : 10,
    });

    return () => {
      if (map._easeAnimFrame) {
        cancelAnimationFrame(map._easeAnimFrame);
        map._easeAnimFrame = null;
      }
    };
  }, [selectedStatesKey, map, selectedStates]);

  return null;
}


function MapView() {
  const navigate = useNavigate();
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCabCount, setSelectedCabCount] = useState(null);
  const [selectedActive, setSelectedActive] = useState(null);
  const [filteredData, setFilteredData] = useState(data);
  const [currentZoom, setCurrentZoom] = useState(window.innerWidth >= 768 ? 5 : 3);
  const [user, setUser] = useState(null);
  const [firstBookmarkedLocation, setFirstBookmarkedLocation] = useState(null);
  const [hasCenteredToBookmark, setHasCenteredToBookmark] = useState(false);
  
  const uniqueStates = [...new Set(data.map(location => location.state))].sort();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    }
  };

  // Reset bookmark centering state when user logs out
  useEffect(() => {
    if (!user) {
      setFirstBookmarkedLocation(null);
      setHasCenteredToBookmark(false);
    }
  }, [user]);

  // Load first bookmarked location when user is signed in
  useEffect(() => {
    const loadFirstBookmark = async () => {
      if (!user || hasCenteredToBookmark) return;
      
      try {
        const favoriteIds = await getFavorites();
        if (favoriteIds && favoriteIds.length > 0) {
          // Find the first bookmarked location with coordinates
          const firstBookmark = data.find(loc => 
            favoriteIds.some(id => String(id) === String(loc.storeid)) &&
            loc.lat && loc.lng
          );
          
          if (firstBookmark) {
            setFirstBookmarkedLocation({
              lat: firstBookmark.lat,
              lng: firstBookmark.lng
            });
            setHasCenteredToBookmark(true);
          }
        }
      } catch (error) {
        console.error('Error loading bookmarked locations:', error);
      }
    };
    
    loadFirstBookmark();
  }, [user, hasCenteredToBookmark]);

  useEffect(() => {
    let filtered = data;
    
    // Filter by state
    if (selectedStates.length > 0) {
      filtered = filtered.filter(location => selectedStates.includes(location.state));
    }
    
    // Filter by cabinet count
    if (selectedCabCount !== null) {
      filtered = filtered.filter(location => location.cab_count >= selectedCabCount);
    }
    
    // Filter by active status
    if (selectedActive !== null) {
      filtered = filtered.filter(location => location.active === selectedActive);
    }
    
    setFilteredData(filtered);
  }, [selectedStates, selectedCabCount, selectedActive]);

  const handleStateFilter = (state) => {
    setSelectedStates(prev => {
      if (prev.includes(state)) {
        return prev.filter(s => s !== state);
      } else {
        return [...prev, state];
      }
    });
  };

  const handleCabCountFilter = (cabCount) => {
    if (selectedCabCount === cabCount) {
      setSelectedCabCount(null);
    } else {
      setSelectedCabCount(cabCount);
    }
  };

  const handleActiveFilter = (active) => {
    setSelectedActive(active);
  };

  const clearFilters = () => {
    setSelectedStates([]);
    setSelectedCabCount(null);
    setSelectedActive(null);
  };

  // Filter out any locations that don't have coordinates (shouldn't happen with our geocoded data)
  const locationsWithCoords = filteredData.filter(location => location.lat && location.lng);

  // Calculate map center from the locations or use US center
  const center = locationsWithCoords.length > 0 
    ? [
        locationsWithCoords.reduce((sum, loc) => sum + loc.lat, 0) / locationsWithCoords.length,
        locationsWithCoords.reduce((sum, loc) => sum + loc.lng, 0) / locationsWithCoords.length
      ]
    : DEFAULT_MAP_CENTER;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col view-map page-enter page-enter-map overflow-hidden">
      {/* Header */}
      <Navbar currentView="map" />
      <FilterBar
        showSort={false}
        uniqueStates={uniqueStates}
        selectedStates={selectedStates}
        selectedCabCount={selectedCabCount}
        selectedActive={selectedActive}
        onStateFilter={handleStateFilter}
        onCabCountFilter={handleCabCountFilter}
        onActiveFilter={handleActiveFilter}
        onClearFilters={clearFilters}
        showLocationCount={true}
        locationCount={filteredData.length}
        className="z-[999]"
      />
      <div className="flex-1 min-h-0">
        <MapContainer 
          center={center}
          attributionControl={false}
          zoom={DEFAULT_MAP_ZOOM}
          zoomSnap={0}
          zoomDelta={0.5}
          style={{ height: '100%', width: '100%' }}
          className="z-0 [&_.leaflet-control-zoom]:dark:invert"
        >
          <ZoomHandler setZoom={setCurrentZoom} />
          <FitStateBounds selectedStates={selectedStates} />
          {firstBookmarkedLocation && selectedStates.length === 0 && (
            <ChangeMapView 
              center={[firstBookmarkedLocation.lat, firstBookmarkedLocation.lng]} 
              zoom={window.innerWidth >= 768 ? 12 : 11}
              onCentered={() => setFirstBookmarkedLocation(null)}
            />
          )}
          <TileLayer
            className="dark:contrast-[.95] dark:saturate-0 dark:hue-rotate-15 dark:invert"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {locationsWithCoords.flatMap((location, index) => {
            const worldCopies = [-2, -1, 0, 1, 2];
            return worldCopies.map(copyIndex => (
              <Marker
                key={`${location.storeid}-${index}-${copyIndex}`}
                position={[location.lat, location.lng + (360 * copyIndex)]}
                icon={location.active ? createActiveIcon(currentZoom) : createComingSoonIcon(currentZoom)}
                clasName="dark:saturate-0"
              >
                <Popup className="dark:bg-gray-900 dark:text-white [&_.leaflet-popup-content-wrapper]:dark:bg-gray-900 [&_.leaflet-popup-content-wrapper]:dark:text-white [&_.leaflet-popup-tip]:dark:bg-gray-900 [&_.leaflet-popup-content]:dark:bg-gray-900">
                  <div className="py-2 min-w-[18rem] max-w-[25rem] dark:bg-gray-900">
                    <div className="flex flex-row justify-between items-center mb-2">
                      <div className="flex flex-row items-center gap-2 flex-wrap">
                      {location.code !== "N/A" && (
                        <span className="text-sm font-medium text-black dark:text-white py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded-md">{location.code}</span>
                      )}
                      <span className="text-sm text-black dark:text-white py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded-md">{location.state}</span>
                      <span className={`text-sm text-black dark:text-white py-1 px-2 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50 dark:bg-gray-800'} rounded-3xl flex flex-row items-center gap-1`}>{location.active ? 'Active' : 'Coming Soon'}
                        <span className={`text-[1rem] ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                      </span>
                      {isRecentLocation(location.storeid) && (
                        <span className="text-sm text-black dark:text-white py-1 px-2 bg-[#41BCCC]/20 rounded-3xl flex flex-row items-center gap-1">
                          New
                          <span className="text-[1rem] text-[#41BCCC]">●</span>
                        </span>
                      )}
                    </div>
                    {user && <FavoriteButton storeId={location.storeid} />}
                    </div>
                    <h3 className="text-lg font-medium mb-2 dark:text-white">{location.name}</h3>
                    <div className="flex flex-row items-center justify-between">
                      <div className="flex flex-col justify-center items-start">
                        <span className="text-4xl text-[#41BCCC]">{location.cab_count}</span>
                        <span className="text-sm text-black dark:text-white">Cabinet(s)</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 wrap-break-anywhere">{location.address}</p>
                    
                    {/* View Details Button */}
                    <div>
                      <button
                        onClick={() => navigate(`/location/${location.storeid}`)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#41BCCC] text-white rounded-md hover:bg-[#41BCCC]/90 transition-colors duration-200 text-sm font-medium"
                      >
                        View Details
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          })}
        </MapContainer>
      </div>
      
      {/* Bookmark Panel - Permanently displayed */}
      <BookmarkPanel />
    </div>
  );
}

export default MapView;
