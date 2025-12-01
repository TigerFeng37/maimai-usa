import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
const DATA_DIR = join(dirname(__dirname), 'data')

// Helper function to get reports file path for a store
function getReportsFilePath(storeId) {
  return join(DATA_DIR, `reports_${storeId}.json`)
}

// Helper function to read reports for a store
async function readReports(storeId) {
  try {
    const filePath = getReportsFilePath(storeId)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

// Helper function to write reports for a store
async function writeReports(storeId, reports) {
  const filePath = getReportsFilePath(storeId)
  await fs.writeFile(filePath, JSON.stringify(reports, null, 2), 'utf-8')
}

// GET /api/reports/:storeId - Get all reports for a store
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params
    const reports = await readReports(storeId)
    
    // Sort by timestamp, newest first
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    res.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// POST /api/reports/:storeId - Create a new report
router.post('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params
    const { issues, description, storeName, address, city, state } = req.body

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'At least one issue is required' })
    }

    const reports = await readReports(storeId)

    const newReport = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      storeId,
      storeName: storeName || '',
      address: address || '',
      city: city || '',
      state: state || '',
      issues,
      description: description || '',
      timestamp: new Date().toISOString(),
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      workingStatus: null, // null, 'yes', or 'no'
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : null,
      avatar: req.user ? req.user.avatar : null
    }

    reports.push(newReport)
    await writeReports(storeId, reports)

    res.status(201).json(newReport)
  } catch (error) {
    console.error('Error creating report:', error)
    res.status(500).json({ error: 'Failed to create report' })
  }
})

// PATCH /api/reports/:storeId/:reportId - Update a report
router.patch('/:storeId/:reportId', async (req, res) => {
  try {
    const { storeId, reportId } = req.params
    const updates = req.body

    const reports = await readReports(storeId)
    const reportIndex = reports.findIndex(r => r.id === reportId)

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Update report
    const updatedReport = {
      ...reports[reportIndex],
      ...updates
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
    await writeReports(storeId, reports)

    res.json(updatedReport)
  } catch (error) {
    console.error('Error updating report:', error)
    res.status(500).json({ error: 'Failed to update report' })
  }
})

// DELETE /api/reports/:storeId/:reportId - Delete a report
router.delete('/:storeId/:reportId', async (req, res) => {
  try {
    const { storeId, reportId } = req.params

    const reports = await readReports(storeId)
    const filteredReports = reports.filter(r => r.id !== reportId)

    if (reports.length === filteredReports.length) {
      return res.status(404).json({ error: 'Report not found' })
    }

    await writeReports(storeId, filteredReports)

    res.json({ message: 'Report deleted successfully' })
  } catch (error) {
    console.error('Error deleting report:', error)
    res.status(500).json({ error: 'Failed to delete report' })
  }
})

export default router

