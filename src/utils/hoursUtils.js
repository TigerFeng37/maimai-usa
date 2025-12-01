/**
 * Get today's hours from a location's hours string
 * @param {string} hoursString - Hours string in format "Sunday 10:00 AM - 2:00 AM\nMonday ..."
 * @returns {string|null} Today's hours or null if not found
 */
export function getTodayHours(hoursString) {
  if (!hoursString) return null

  const today = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[today.getDay()]

  const lines = hoursString.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    if (line.startsWith(todayName)) {
      // Extract the time part (everything after the day name)
      const timePart = line.substring(todayName.length).trim()
      return timePart || null
    }
  }

  return null
}

/**
 * Format hours for display
 * @param {string} hoursString - Hours string
 * @returns {string} Formatted hours
 */
export function formatHours(hoursString) {
  if (!hoursString) return 'Hours not available'
  return hoursString
}

