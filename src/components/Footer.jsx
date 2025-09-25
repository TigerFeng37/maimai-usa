import React from 'react'

function Footer({ isMapView = false }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-white border-t border-gray-200 mt-[-1px]">
      {/* Top section - only show when not in map view */}
      {!isMapView && (
        <div className="w-full mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            {/* Logo and branding */}
            <div className="flex flex-row items-center gap-2">
              <img src="/kuma.png" alt="Kuma" className="aspect-auto w-8 mt-[-.25rem] mr-[-.15rem]" />
              <span className="text-lg font-regular">Maimai USA</span>
              <span className="text-lg font-extralight text-gray-500">Directory</span>
            </div>
            
            {/* Links and info */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm text-gray-600">
              <div className="flex flex-row items-center gap-4">
                <a 
                  href="https://maimai.sega.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors duration-200"
                >
                  maimai Official Site ↗
                </a>
                <a 
                  href="https://discord.gg/pVh2MjXR" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 transition-colors duration-200"
                >
                  GekiChuMai Discord ↗
                </a>
              </div>
              {/* <div className="text-gray-500">
                © {currentYear} Maimai USA Directory
              </div> */}
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom section - always show */}
      <div className="w-full p-4 border-t border-gray-100 text-xs text-gray-500 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <span className="font-medium">This is an unofficial directory. All location data is provided as-is. Please verify hours and availability with individual locations.</span>
          <span className="font-light">Created by FENGUY &nbsp;&nbsp;|&nbsp;&nbsp; Last updated: {new Date().toLocaleDateString()}</span>
        </div>
    </footer>
  )
}

export default Footer
