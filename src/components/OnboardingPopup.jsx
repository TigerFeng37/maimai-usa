import { useState, useEffect } from 'react'
import { List, Location, Time, WarningAlt, UserMultiple } from '@carbon/icons-react'
import { getCurrentUser } from '../utils/authApi'

const STORAGE_KEY = 'onboarding-seen'

const STEPS = [
  {
    icon: Location,
    title: 'Map & List Views',
    description:
      'Browse arcades on an interactive map, or switch to the list view to scan locations by state, cabinet count, and status.',
  },
  {
    icon: Time,
    title: 'Arcade Details',
    description:
      'Open any location for hours, address, phone, website, and cabinet info — plus a mini map to help you get there.',
  },
  {
    icon: UserMultiple,
    title: 'Current Players',
    description:
      'See how busy an active arcade is with the live player count. Sign in with Discord to update the count for others.',
  },
  {
    icon: WarningAlt,
    title: 'Report Issues',
    description:
      'Found a broken machine or incorrect info? Use Report Issue on any arcade page — no account required.',
  },
]

function OnboardingPopup() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (localStorage.getItem(STORAGE_KEY)) return

      try {
        const user = await getCurrentUser()
        if (cancelled || user) return
      } catch {
        if (cancelled) return
      }

      // Let the map paint before showing the overlay
      setTimeout(() => {
        if (!cancelled) setVisible(true)
      }, 600)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="relative px-6 pt-6 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/kuma.png" alt="" className="w-9 h-9 object-contain" />
              <div>
                <p className="text-xs uppercase tracking-wide text-[#41BCCC] font-medium">
                  Welcome
                </p>
                <h2
                  id="onboarding-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white leading-tight"
                >
                  Maimai NA Directory
                </h2>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 -mr-1"
              aria-label="Close onboarding"
            >
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div
            key={step}
            className="flex flex-col items-start gap-3 min-h-[140px]"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-[#41BCCC]/15 text-[#41BCCC]">
              <Icon size={28} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1.5">
                {current.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step
                    ? 'w-6 bg-[#41BCCC]'
                    : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) dismiss()
                else setStep((s) => s + 1)
              }}
              className="flex-1 px-4 py-2 bg-[#41BCCC] text-white rounded-md hover:bg-[#41BCCC]/80 transition-colors"
            >
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>

        {step === 0 && (
          <div className="px-6 pb-4 -mt-1 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <List size={14} />
            <span>Tip: use the toggle in the top bar to switch views anytime</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default OnboardingPopup
