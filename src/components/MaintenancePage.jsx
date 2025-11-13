import { useEffect } from 'react'

function MaintenancePage() {
  useEffect(() => {
    // Set page title
    document.title = 'Under Maintenance - Maimai USA Directory'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 dark:bg-gray-900 px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <img 
            src="/kuma.png" 
            alt="Maimai USA" 
            className="w-32 h-32 object-contain animate-bounce"
            style={{
              animation: 'bounce 2s ease-in-out infinite'
            }}
          />
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-6xl font-light mb-6 text-gray-900 dark:text-white">
          Under Maintenance
        </h1>

        {/* Subtitle */}
        <div className="mb-8">
          <p className="text-2xl md:text-3xl text-black/70 dark:text-white/70 font-regular mb-4">
            We'll Be Right Back
          </p>
        </div>

        {/* Description card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
        <div className="flex flex-col text-lg text-gray-700 dark:text-gray-300">
            <span className="font-regular">What's Happening?</span>
            <span className="font-light">We're Fixing Some Things...</span>
          </div>
        </div>

        {/* Contact info */}
        <div className="text-gray-600 dark:text-gray-400">
          <p className="text-sm">We appreciate your patience and understanding!</p>
        </div>

        {/* Loading animation */}
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-3 h-3 bg-[#41BCCC] rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-[#a0dde5] rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePage

