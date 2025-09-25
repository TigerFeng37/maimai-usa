import { Link, useNavigate } from 'react-router-dom'
import { List, Location } from '@carbon/icons-react'

function Navbar({ currentView = 'list' }) {
  const navigate = useNavigate()

  const handleNavigation = (path) => {
    // Use View Transitions API if supported
    if ('startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate(path)
      })
    } else {
      navigate(path)
    }
  }

  return (
    <div className="p-2 border-b w-full border-gray-200 bg-white z-[1000] max-h-[3rem] flex flex-row justify-between items-center gap-2">
      <div className="flex flex-row items-center gap-2">
        <img src="/kuma.png" alt="Kuma" className="aspect-auto w-10 mt-[-.25rem] mr-[-.15rem]" />
        <h1 className="text-2xl font-regular">Maimai USA</h1>
        <span className="text-2xl font-extralight text-gray-500">Directory</span>
      </div>
      <div className="flex flex-row items-center gap-2">
        {currentView === 'map' ? (
          <button
            onClick={() => handleNavigation('/list')}
            className="min-w-[4rem] py-1 px-2 text-black rounded-md text-md bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:shadow-sm active:scale-95 flex justify-between items-center gap-1"
          >
            <List size={16} />
            <span className="block md:hidden">List</span>
            <span className="hidden md:block">List View</span>
          </button>
        ) : (
          <button
            onClick={() => handleNavigation('/map')}
            className="min-w-[4rem] py-1 px-2 text-black rounded-md text-md bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:shadow-sm active:scale-95 flex justify-between items-center gap-1"
          >
            <Location size={16} />
            <span className="block md:hidden">Map</span>
            <span className="hidden md:block">Map View</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default Navbar
