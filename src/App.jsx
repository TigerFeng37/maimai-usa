import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './main.css'
import ListView from './ListView'
import MapView from './MapView'

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

  return (
    <TransitionWrapper>
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/list" element={<ListView />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
    </TransitionWrapper>
  )
}

function App() {
  return (
    <Router basename="/">
      <AppContent />
    </Router>
  )
}

export default App
