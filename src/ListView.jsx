import { useState, useEffect } from 'react'
import data from './r1index-geocoded.json'
import Navbar from './components/Navbar'
import FilterBar from './components/FilterBar'
import LocationUpdater from './components/LocationUpdater'

function ListView() {
  const [sortType, setSortType] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [sortedData, setSortedData] = useState([])
  const [selectedStates, setSelectedStates] = useState([])
  const [selectedCabCount, setSelectedCabCount] = useState(null)
  
  const uniqueStates = [...new Set(data.map(location => location.state))].sort()

  const filterAndSortData = (data, selectedStates, selectedCabCount, sortType, sortDirection) => {
    let filtered = data
    
    // Filter by state
    if (selectedStates.length > 0) {
      filtered = filtered.filter(location => selectedStates.includes(location.state))
    }
    
    // Filter by cabinet count
    if (selectedCabCount !== null) {
      filtered = filtered.filter(location => location.cab_count >= selectedCabCount)
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      
      switch (sortType) {
        case 'name':
          // Handle undefined/null name values
          const aName = a.name || ''
          const bName = b.name || ''
          comparison = aName.localeCompare(bName)
          break
        case 'state':
          // Handle undefined/null state values
          const aState = a.state || ''
          const bState = b.state || ''
          comparison = aState.localeCompare(bState)
          break
        case 'index':
          if (!a.index && !b.index) comparison = 0
          else if (!a.index) comparison = 1
          else if (!b.index) comparison = -1
          else comparison = parseInt(a.index) - parseInt(b.index)
          break
        case 'cab_count':
          // Primary sort by cabinet count
          comparison = a.cab_count - b.cab_count
          // Secondary sort by name for same cab count
          if (comparison === 0) {
            // Handle undefined/null name values in secondary sort
            const aName = a.name || ''
            const bName = b.name || ''
            comparison = aName.localeCompare(bName)
          }
          break
        case 'active':
          // Sort by active status (active first when ascending)
          comparison = b.active - a.active
          // Secondary sort by name for same active status
          if (comparison === 0) {
            const aName = a.name || ''
            const bName = b.name || ''
            comparison = aName.localeCompare(bName)
          }
          break
        default:
          comparison = 0
      }
      
      // Apply sort direction
      return sortDirection === 'desc' ? -comparison : comparison
    })
    return sorted
  }

  useEffect(() => {
    setSortedData(filterAndSortData(data, selectedStates, selectedCabCount, sortType, sortDirection))
  }, [selectedStates, selectedCabCount, sortType, sortDirection])


  const handleSort = (type, direction) => {
    setSortType(type)
    setSortDirection(direction)
  }

  const handleStateFilter = (state) => {
    setSelectedStates(prev => {
      if (prev.includes(state)) {
        return prev.filter(s => s !== state)
      } else {
        return [...prev, state]
      }
    })
  }

  const handleCabCountFilter = (cabCount) => {
    if (selectedCabCount === cabCount) {
      setSelectedCabCount(null)
    } else {
      setSelectedCabCount(cabCount)
    }
  }

  const clearFilters = () => {
    setSelectedStates([])
    setSelectedCabCount(null)
  }

  return (
    <div className="w-screen overflow-x-hidden view-list page-enter page-enter-list">
      <div className="fixed top-0 w-full z-[1000]">
        <Navbar currentView="list" />
        <FilterBar
          showSort={true}
          sortType={sortType}
          sortDirection={sortDirection}
          onSort={handleSort}
          uniqueStates={uniqueStates}
          selectedStates={selectedStates}
          selectedCabCount={selectedCabCount}
          onStateFilter={handleStateFilter}
          onCabCountFilter={handleCabCountFilter}
          onClearFilters={clearFilters}
          showLocationCount={false}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 mt-[6rem] transition-all duration-300 ease-in-out">
        {sortedData.map((location) => (
          <div className="p-4 bg-white border-b border-r border-gray-200 flex flex-col min-h-[18rem] md:min-h-0" key={location.code}>
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-row items-start gap-2">
                <span className="text-sm font-medium text-black p-1 bg-gray-100 rounded-md">{location.code}</span>
                <span className="text-sm text-gray-500 p-1 bg-gray-100 rounded-md">{location.state}</span>
                <span className={`hidden md:flex text-sm text-black py-1 px-2 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50'} rounded-xl flex-row items-center gap-1`}>{location.active ? 'Online' : 'Coming Soon'}
                  <span className={`text-[.5rem] ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
                </span>
              </div>
              <span className="text-sm font-mono font-light text-gray-500">{`#${location.index}`}</span>
            </div>
            <h2 className="text-xl font-regular min-h-16 leading-tight">{location.name}</h2>
            <div className="flex flex-col items-start">
              <span className="text-4xl text-black">{location.cab_count}</span>
              <span className="text-sm text-gray-500">Cabinets</span>
            </div>
            <span className="text-xs text-gray-500 mt-auto">{location.address}</span>
            <span className={`md:hidden w-fit text-sm text-black py-1 px-2 ${location.active ? 'bg-[#41BCCC]/20' : 'bg-gray-50'} rounded-xl flex flex-row items-center gap-1 mt-2`}>{location.active ? 'Online' : 'Coming Soon'}
              <span className={`text-[.5rem] ${location.active ? 'text-[#41BCCC]' : 'text-gray-400'}`}>●</span>
            </span>
          </div>
        ))}
      </div>
      <LocationUpdater />
    </div>
  )
}

export default ListView
