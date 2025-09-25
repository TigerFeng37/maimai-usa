import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import App from './App.jsx'

// iOS Safari fullscreen detection and prompt
function initializeIOSOptimizations() {
  // Detect iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches

  if (isIOS && isSafari && !isStandalone) {
    // Add a subtle prompt for adding to home screen after a delay
    setTimeout(() => {
      const shouldPrompt = !localStorage.getItem('ios-install-prompted')
      if (shouldPrompt && window.location.pathname === '/map') {
        console.log('💡 Tip: Add this app to your home screen for the best fullscreen map experience!')
        localStorage.setItem('ios-install-prompted', 'true')
        
        // You could add a toast notification here if desired
        // For now, just log to console to avoid being intrusive
      }
    }, 3000)
  }

  // Enable smooth scrolling that helps with Safari toolbar hiding
  if (isIOS) {
    document.documentElement.style.scrollBehavior = 'smooth'
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Initialize iOS optimizations after app loads
initializeIOSOptimizations()
