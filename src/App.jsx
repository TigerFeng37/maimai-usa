import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './main.css'
import ListView from './ListView'
import MapView from './MapView'
import DetailView from './DetailView'
import Footer from './components/Footer'
import MaintenancePage from './components/MaintenancePage'

// Toggle this to enable/disable maintenance mode
const MAINTENANCE_MODE = true

// Transition wrapper component
function TransitionWrapper({ children }) {
  const location = useLocation()

  useEffect(() => {
    // Enable View Transitions API if supported
    if ('startViewTransition' in document) {
      document.documentElement.style.setProperty('view-transition-name', `route-${location.pathname.replace('/', '') || 'root'}`)
    }
  }, [location])

  return (
    <div key={location.pathname} className="transition-wrapper">
      {children}
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const isMapView = location.pathname === '/map'

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      <TransitionWrapper>
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/location/:locationCode" element={<DetailView />} />
        </Routes>
      </TransitionWrapper>
      <Footer isMapView={isMapView} />
    </div>
  )
}

function App() {
  // If maintenance mode is enabled, show maintenance page
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />
  }

  return (
    <Router basename="/">
      <AppContent />
    </Router>
  )
}

export default App
