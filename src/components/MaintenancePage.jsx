import { useEffect } from 'react'

function MaintenancePage() {
  useEffect(() => {
    // Set page title
    document.title = '维护中 - Maimai USA Directory'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-gray-800 dark:via-purple-900 dark:to-blue-900 px-4">
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
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
          正在维护中
        </h1>

        {/* Subtitle */}
        <div className="mb-8">
          <p className="text-2xl md:text-3xl text-purple-600 dark:text-purple-300 font-semibold mb-4">
            Site Under Maintenance
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            我们正在对网站进行升级和维护，以提供更好的服务体验。
          </p>
        </div>

        {/* Description card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-purple-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-left text-gray-700 dark:text-gray-300">
                <strong className="text-gray-900 dark:text-white">预计恢复时间：</strong>我们会尽快完成维护工作
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-left text-gray-700 dark:text-gray-300">
                <strong className="text-gray-900 dark:text-white">维护内容：</strong>系统升级与性能优化
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-pink-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="text-left text-gray-700 dark:text-gray-300">
                <strong className="text-gray-900 dark:text-white">感谢您的耐心：</strong>我们将为您带来更好的体验
              </p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="text-gray-600 dark:text-gray-400">
          <p className="mb-2">如有紧急问题，请稍后再试或通过其他渠道联系我们。</p>
          <p className="text-sm">We appreciate your patience and understanding! 🎵</p>
        </div>

        {/* Loading animation */}
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}

export default MaintenancePage

