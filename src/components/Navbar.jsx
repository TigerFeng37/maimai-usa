import { Link, useNavigate } from 'react-router-dom'

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
        <img src="/kuma.png" alt="Derakkuma" className="w-10 h-10" />
        <h1 className="text-2xl font-regular">Maimai USA</h1>
        <span className="text-2xl font-extralight text-gray-500">Directory</span>
      </div>
      <div className="flex flex-row items-center gap-2">
        {currentView === 'list' ? (
          <button
            onClick={() => handleNavigation('/map')}
            className="py-1 px-2 text-black rounded-md text-md bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:shadow-sm active:scale-95"
          >
            Map
          </button>
        ) : (
          <button
            onClick={() => handleNavigation('/')}
            className="py-1 px-2 text-black rounded-md text-md bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:shadow-sm active:scale-95"
          >
            List
          </button>
        )}
      </div>
    </div>
  )
}

export default Navbar
