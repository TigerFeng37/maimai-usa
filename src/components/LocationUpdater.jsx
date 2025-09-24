import { useState } from 'react'
import { updateLocationData, downloadUpdatedData } from '../utils/locationUpdater'
import data from '../r1index-geocoded.json'

function LocationUpdater() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState(null)
  const [showUpdater, setShowUpdater] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    setUpdateResult(null)
    
    try {
      const result = await updateLocationData(data)
      setUpdateResult(result)
      
      if (result.success && (result.changes.activated > 0 || result.changes.deactivated > 0)) {
        // Automatically download the updated data
        downloadUpdatedData(result.data)
      }
    } catch (error) {
      setUpdateResult({
        success: false,
        error: error.message
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDownload = () => {
    if (updateResult && updateResult.data) {
      downloadUpdatedData(updateResult.data)
    }
  }

  if (!showUpdater) {
    return (
      <button
        onClick={() => setShowUpdater(true)}
        className="fixed bottom-4 right-4 bg-[#41BCCC] hover:bg-[#369AAA] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors duration-200 z-[1000]"
        title="Update location data from ALL.Net"
      >
        🔄 Update Locations
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1001]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Location Data Updater</h2>
          <button
            onClick={() => setShowUpdater(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            disabled={isUpdating}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Fetches the latest active locations from ALL.Net website</li>
                <li>• Matches them against the current location database</li>
                <li>• Updates the active status accordingly</li>
                <li>• Downloads the updated JSON file</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">⚠️ Browser Limitations</h3>
              <p className="text-sm text-yellow-800">
                Due to CORS restrictions, this may not work in all browsers. 
                For best results, use the command line: <code className="bg-yellow-200 px-1 rounded">npm run update-locations</code>
              </p>
            </div>

            {/* Current Status */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Locations:</span>
                  <span className="font-medium ml-2">{data.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Active Locations:</span>
                  <span className="font-medium ml-2">{data.filter(loc => loc.active).length}</span>
                </div>
              </div>
            </div>

            {/* Update Button */}
            <div className="flex justify-center">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  isUpdating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#41BCCC] hover:bg-[#369AAA] text-white'
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span>
                    Updating...
                  </span>
                ) : (
                  'Update Location Data'
                )}
              </button>
            </div>

            {/* Results */}
            {updateResult && (
              <div className={`border rounded-lg p-4 ${
                updateResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <h3 className={`font-medium mb-2 ${
                  updateResult.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {updateResult.success ? '✅ Update Results' : '❌ Update Failed'}
                </h3>
                
                {updateResult.success ? (
                  <div className="space-y-2">
                    <div className={`text-sm ${updateResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      <div>• Activated: <strong>{updateResult.changes.activated}</strong> locations</div>
                      <div>• Deactivated: <strong>{updateResult.changes.deactivated}</strong> locations</div>
                      <div>• Unchanged: <strong>{updateResult.changes.unchanged}</strong> locations</div>
                    </div>
                    
                    {(updateResult.changes.activated > 0 || updateResult.changes.deactivated > 0) && (
                      <div className="flex justify-between items-center pt-2 border-t border-green-200">
                        <span className="text-sm text-green-700">Updated file downloaded automatically</span>
                        <button
                          onClick={handleDownload}
                          className="text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded transition-colors duration-200"
                        >
                          Download Again
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-800">
                    {updateResult.error || 'An unknown error occurred'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>For reliable updates, use: <code className="bg-gray-200 px-1 rounded">npm run update-locations</code></span>
            <button
              onClick={() => setShowUpdater(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
              disabled={isUpdating}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationUpdater
