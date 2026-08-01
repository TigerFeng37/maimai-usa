import recentLocations from '../recent-locations.json'
import data from '../r1index-geocoded.json'

export function getRecentLocations() {
  return recentLocations
    .map(recentLoc => {
      const matchedLocation = data.find(loc => loc.name === recentLoc.name)
      return {
        ...recentLoc,
        storeid: matchedLocation?.storeid || recentLoc.storeid || null
      }
    })
    .filter(loc => loc.storeid)
}

const recentStoreIds = new Set(
  getRecentLocations().map(loc => String(loc.storeid))
)

export function isRecentLocation(storeId) {
  if (storeId == null) return false
  return recentStoreIds.has(String(storeId))
}
