import { useRef, useEffect } from 'react'

function FilterBar({
  // Sort props (optional)
  showSort = false,
  sortType = null,
  sortDirection = 'asc',
  onSort = () => {},

  // Filter props
  uniqueStates = [],
  selectedStates = [],
  selectedCabCount = null,
  selectedActive = null,
  onStateFilter = () => {},
  onCabCountFilter = () => {},
  onActiveFilter = () => {},
  onClearFilters = () => {},

  // Display props
  showLocationCount = false,
  locationCount = 0,

  // Style props
  className = ""
}) {
  const filterBarRef = useRef(null)
  
  const cabCountOptions = [
    { label: '2+', value: 2 },
    { label: '3+', value: 3 },
    { label: '4+', value: 4 }
  ]

  const handleSort = (type) => {
    if (sortType === type) {
      // Toggle direction if clicking the same sort type
      onSort(type, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort type and reset to ascending
      onSort(type, 'asc')
    }
  }

  useEffect(() => {
    if (filterBarRef.current && selectedStates.length > 0) {
      setTimeout(() => {
        filterBarRef.current.scrollLeft = filterBarRef.current.scrollWidth - filterBarRef.current.clientWidth
      }, 10)
    }
  }, [selectedStates])

  return (
    <div 
      ref={filterBarRef} 
      className={`px-4 py-2 border-b w-full border-gray-200 overflow-x-auto bg-white/85 backdrop-blur-sm min-h-[3rem] transition-all duration-300 ease-in-out ${className}`}
    >
      <div className="flex flex-row items-center gap-4 min-w-max">
        {/* Sort Section */}
        {showSort && (
          <div className="flex flex-row items-center gap-2">
            <span className="block md:hidden text-sm text-gray-500">Sort</span>
            <span className="hidden md:block text-sm text-gray-500">Sort by</span>
            <button 
              onClick={() => handleSort('name')} 
              className={`py-1 px-2 text-black rounded-md text-sm transition-colors ${sortType === 'name' ? 'bg-[#41BCCC] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              A-Z {sortType === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('state')} 
              className={`py-1 px-2 text-black rounded-md text-sm transition-colors ${sortType === 'state' ? 'bg-[#41BCCC] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              State {sortType === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('index')} 
              className={`py-1 px-2 text-black rounded-md text-sm transition-colors ${sortType === 'index' ? 'bg-[#41BCCC] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Location Index {sortType === 'index' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('cab_count')} 
              className={`py-1 px-2 text-black rounded-md text-sm transition-colors ${sortType === 'cab_count' ? 'bg-[#41BCCC] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Cabinet Count {sortType === 'cab_count' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('active')} 
              className={`py-1 px-2 text-black rounded-md text-sm transition-colors ${sortType === 'active' ? 'bg-[#41BCCC] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Status {sortType === 'active' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        )}
        
        {/* Active Filter Section (Map View Only) */}
        {!showSort && (
          <div className="flex flex-row items-center gap-2">
            <button
              onClick={() => onActiveFilter(selectedActive === true ? null : true)}
              className={`py-1 px-2 ml-[-.5rem] md:ml-0 text-sm rounded-md transition-colors ${
                selectedActive === true
                  ? 'bg-[#41BCCC] text-white'
                  : 'bg-gray-100 text-black hover:bg-gray-200'
              }`}
            >
              Active Cabs
            </button>
          </div>
        )}

        
        {/* State Filter Section */}
        <div className="flex flex-row items-center gap-2">
          <span className="block md:hidden text-sm text-gray-500">Filter</span>
          <span className="hidden md:block text-sm text-gray-500">Filter by State</span>
          <select 
            value="" 
            onChange={(e) => e.target.value && onStateFilter(e.target.value)}
            className="py-1 pl-2 pr-1.5 text-black rounded-md bg-gray-100 text-sm hover:bg-gray-200 transition-colors"
          >
            <option value="">Add State</option>
            {uniqueStates.map(state => (
              <option key={state} value={state} disabled={selectedStates.includes(state)}>
                {state}
              </option>
            ))}
          </select>
          {selectedStates.length > 0 && (
            <div className="flex flex-row items-center gap-1">
              {selectedStates.map(state => (
                <button
                  key={state}
                  onClick={() => onStateFilter(state)}
                  className="inline-flex items-center py-1 px-2 rounded-md text-sm bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  {state}
                  <span className="ml-2 text-xs text-[#F35659]">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Cabinet Count Filter Section */}
        <div className="flex flex-row items-center gap-2">
          <span className="block md:hidden text-sm text-gray-500">Cabs</span>
          <span className="hidden md:block text-sm text-gray-500">Cabinet Count</span>
          <div className="flex flex-row rounded-md overflow-hidden">
            {cabCountOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onCabCountFilter(option.value)}
                className={`py-1 px-2 text-sm border-r border-gray-300 last:border-r-0 transition-colors ${
                  selectedCabCount === option.value
                    ? 'bg-[#41BCCC] text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Clear Filters Button */}
        {(selectedStates.length > 0 || selectedCabCount !== null || (!showSort && selectedActive !== null)) && (
          <button
            onClick={onClearFilters}
            className="py-1 px-2 ml-[-.5rem] md:ml-0 text-white bg-[#F35659] rounded-md text-sm hover:bg-red-600 transition-colors min-w-24"
          >
            Clear Filters
          </button>
        )}

        {/* Location Count (for map view) */}
        {showLocationCount && (
          <div className="hidden md:block text-sm text-gray-500">
            Showing {locationCount} locations
          </div>
        )}
      </div>
    </div>
  )
}

export default FilterBar
