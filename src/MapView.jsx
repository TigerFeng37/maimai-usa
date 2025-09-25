import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import data from './r1index-geocoded.json';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';

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
  iconAnchor: [12, 25],
  popupAnchor: [0, -25]
});

const comingSoonIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" fill="#c0c0c0" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25]
});


function MapView() {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCabCount, setSelectedCabCount] = useState(null);
  const [selectedActive, setSelectedActive] = useState(null);
  const [filteredData, setFilteredData] = useState(data);
  
  const uniqueStates = [...new Set(data.map(location => location.state))].sort();

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
    <div className="w-screen h-screen flex flex-col view-map page-enter page-enter-map">
      {/* Header */}
      <Navbar currentView="map" />

      {/* Filter Bar */}
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

      {/* Map */}
      <div className="flex-1">
        <MapContainer 
          center={center} 
          zoom={4} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {locationsWithCoords.map((location) => (
            <Marker
              key={location.code}
              position={[location.lat, location.lng]}
              icon={location.active ? activeIcon : comingSoonIcon}
            >
              <Popup>
                <div className="p-0 min-w-[15rem] max-w-[20rem]">
                  <div className="flex flex-row justify-between items-center mb-2">
                    <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-medium text-black py-1 px-2 bg-gray-100 rounded-md">{location.code}</span>
                    <span className="text-sm text-gray-500 py-1 px-2 bg-gray-100 rounded-md">{location.state}</span>
                    <span className={`text-sm text-black py-1 px-2 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50'} rounded-3xl flex flex-row items-center gap-1`}>{location.active ? 'Online' : 'Coming Soon'}
                      <span className={`text-[1rem] ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                    </span>
                  </div>
                  <span className="text-sm font-mono font-light text-gray-500">
                    #{location.index}
                  </span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">{location.name}</h3>
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-col justify-center items-start">
                      <span className="text-4xl text-black">{location.cab_count}</span>
                      <span className="text-sm text-gray-500">Cabinets</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 wrap-break-anywhere">{location.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;
