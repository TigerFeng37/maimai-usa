// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

/**
 * Get all reports for a specific store
 * @param {string} storeId - The store ID
 * @returns {Promise<Array>} Array of reports
 */
export async function getReports(storeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${storeId}`, {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const reports = await response.json()
    // Sort by timestamp, newest first
    return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    console.error('Error fetching reports:', error)
    // Fallback to localStorage if API fails
    return getReportsFromLocalStorage(storeId)
  }
}

/**
 * Create a new report
 * @param {string} storeId - The store ID
 * @param {Object} reportData - The report data
 * @returns {Promise<Object>} The created report
 */
export async function createReport(storeId, reportData) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(reportData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const newReport = await response.json()
    // Also save to localStorage as backup
    saveReportToLocalStorage(storeId, newReport)
    return newReport
  } catch (error) {
    console.error('Error creating report:', error)
    // Fallback to localStorage if API fails
    return createReportInLocalStorage(storeId, reportData)
  }
}

/**
 * Update an existing report
 * @param {string} storeId - The store ID
 * @param {string} reportId - The report ID
 * @param {Object} updates - The updates to apply
 * @returns {Promise<Object>} The updated report
 */
export async function updateReport(storeId, reportId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${storeId}/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const updatedReport = await response.json()
    // Also update localStorage as backup
    updateReportInLocalStorage(storeId, reportId, updates)
    return updatedReport
  } catch (error) {
    console.error('Error updating report:', error)
    // Fallback to localStorage if API fails
    return updateReportInLocalStorage(storeId, reportId, updates)
  }
}

/**
 * Delete a report
 * @param {string} storeId - The store ID
 * @param {string} reportId - The report ID
 * @returns {Promise<void>}
 */
export async function deleteReport(storeId, reportId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/${storeId}/${reportId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Also delete from localStorage as backup
    deleteReportFromLocalStorage(storeId, reportId)
  } catch (error) {
    console.error('Error deleting report:', error)
    // Fallback to localStorage if API fails
    deleteReportFromLocalStorage(storeId, reportId)
  }
}

// LocalStorage fallback functions
function getReportsFromLocalStorage(storeId) {
  try {
    const storedReports = localStorage.getItem(`reports_${storeId}`)
    if (storedReports) {
      const reports = JSON.parse(storedReports)
      return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }
    return []
  } catch (error) {
    console.error('Error reading from localStorage:', error)
    return []
  }
}

function saveReportToLocalStorage(storeId, report) {
  try {
    const reports = getReportsFromLocalStorage(storeId)
    reports.push(report)
    localStorage.setItem(`reports_${storeId}`, JSON.stringify(reports))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

function createReportInLocalStorage(storeId, reportData) {
  const newReport = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    storeId,
    storeName: reportData.storeName || '',
    address: reportData.address || '',
    city: reportData.city || '',
    state: reportData.state || '',
    issues: reportData.issues,
    description: reportData.description || '',
    timestamp: new Date().toISOString(),
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    workingStatus: null,
  }

  saveReportToLocalStorage(storeId, newReport)
  return newReport
}

function updateReportInLocalStorage(storeId, reportId, updates) {
  try {
    const reports = getReportsFromLocalStorage(storeId)
    const reportIndex = reports.findIndex(r => r.id === reportId)

    if (reportIndex === -1) {
      throw new Error('Report not found')
    }

    const updatedReport = {
      ...reports[reportIndex],
      ...updates,
    }

    // Handle special cases
    if (updates.workingStatus === 'yes' && !updatedReport.resolved) {
      updatedReport.resolved = true
      updatedReport.resolvedAt = new Date().toISOString()
    }

    if (updates.workingStatus === 'no' && updatedReport.resolved) {
      updatedReport.resolved = false
      updatedReport.resolvedAt = null
    }

    if (updates.resolved === true && !updatedReport.resolvedAt) {
      updatedReport.resolvedAt = new Date().toISOString()
    }

    if (updates.resolved === false) {
      updatedReport.resolvedAt = null
    }

    reports[reportIndex] = updatedReport
    localStorage.setItem(`reports_${storeId}`, JSON.stringify(reports))
    return updatedReport
  } catch (error) {
    console.error('Error updating in localStorage:', error)
    throw error
  }
}

function deleteReportFromLocalStorage(storeId, reportId) {
  try {
    const reports = getReportsFromLocalStorage(storeId)
    const filteredReports = reports.filter(r => r.id !== reportId)
    localStorage.setItem(`reports_${storeId}`, JSON.stringify(filteredReports))
  } catch (error) {
    console.error('Error deleting from localStorage:', error)
  }
}

