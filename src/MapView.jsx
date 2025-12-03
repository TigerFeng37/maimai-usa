import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import data from './r1index-geocoded.json';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import RecentsBanner from './components/RecentsBanner';
import BookmarkPanel from './components/BookmarkPanel';
import FavoriteButton from './components/FavoriteButton';
import { getCurrentUser } from './utils/authApi';
import './mapStyles.css';

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

// Component to track zoom changes
function ZoomHandler({ setZoom }) {
  const map = useMapEvents({
    zoom: () => {
      setZoom(map.getZoom());
    },
  });
  
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
    : [39.8283, -98.5795]; // Fallback to center of US

  return (
    <div className="w-screen safe-area-screen flex flex-col view-map page-enter page-enter-map mb-[-6rem] md:mb-[-3rem] overflow-hidden">
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
      <RecentsBanner />
      <div className="flex-1 mb-[6rem] md:mb-[3rem]">
        <MapContainer 
          center={center}
          attributionControl={false}
          zoom={window.innerWidth >= 768 ? 5 : 3}
          style={{ height: '100%', width: '100%' }}
          className="z-0 [&_.leaflet-control-zoom]:dark:invert"
        >
          <ZoomHandler setZoom={setCurrentZoom} />
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
                      <div className="flex flex-row items-center gap-2">
                      {location.code !== "N/A" && (
                        <span className="text-sm font-medium text-black dark:text-white py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded-md">{location.code}</span>
                      )}
                      <span className="text-sm text-black dark:text-white py-1 px-2 bg-gray-100 dark:bg-gray-800 rounded-md">{location.state}</span>
                      <span className={`text-sm text-black dark:text-white py-1 px-2 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50 dark:bg-gray-800'} rounded-3xl flex flex-row items-center gap-1`}>{location.active ? 'Active' : 'Coming Soon'}
                        <span className={`text-[1rem] ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                      </span>
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
