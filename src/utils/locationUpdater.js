/**
 * Location Data Updater Utility
 * Updates the maimai location data based on the ALL.Net website
 */

// Active locations from ALL.Net website as of the search results
const ALLNET_ACTIVE_LOCATIONS = [
  {
    name: "ROUND1 PUENTE HILLS MALL",
    address: "1600 S Azusa Ave. Suite 285, City of Industry, CA 91748",
    city: "City of Industry",
    state: "CA"
  },
  {
    name: "ROUND1 MORENO VALLEY MALL", 
    address: "22500 Town Circle Suite 2030, Moreno Valley, CA 92553",
    city: "Moreno Valley",
    state: "CA"
  },
  {
    name: "ROUND1 LAKEWOOD MALL",
    address: "401 Lakewood Ctr. Mall, Lakewood, CA 90712", 
    city: "Lakewood",
    state: "CA"
  },
  {
    name: "ROUND1 MAIN PLACE MALL",
    address: "2800 N. Main St. Suite 1100, Santa Ana, CA 92705",
    city: "Santa Ana", 
    state: "CA"
  },
  {
    name: "ROUND1 PROMENADE TEMECULA",
    address: "40710 Winchester Road, Suite 100, Temecula, CA 92591",
    city: "Temecula",
    state: "CA"
  },
  {
    name: "ROUND1 SOUTHLAND MALL", 
    address: "545 Southland Mall Dr. Hayward,CA 94545",
    city: "Hayward",
    state: "CA"
  },
  {
    name: "ROUND1 BURBANK TOWN CENTER",
    address: "201 E Magnolia Blvd, Suite 145,Burbank, CA 91502",
    city: "Burbank",
    state: "CA"
  }
];

/**
 * Fetches location data from ALL.Net website
 * Note: Due to CORS restrictions, this may not work in browser
 */
export async function fetchAllNetLocations() {
  const ALLNET_URL = 'https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009';
  
  try {
    const response = await fetch(ALLNET_URL, {
      mode: 'cors',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; maimai-usa-updater/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    return parseAllNetHTML(html);
  } catch (error) {
    console.warn('Failed to fetch from ALL.Net website, using cached data:', error);
    return ALLNET_ACTIVE_LOCATIONS;
  }
}

/**
 * Parses HTML from ALL.Net website to extract location data
 */
function parseAllNetHTML(html) {
  // Create a temporary DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const locations = [];
  
  // Look for location entries in the HTML
  // The website structure shows locations in a list format
  const locationElements = doc.querySelectorAll('.location-item, li, .result-item');
  
  locationElements.forEach(element => {
    const text = element.textContent;
    
    // Look for Round1 locations
    if (text && text.includes('ROUND1')) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      for (let line of lines) {
        if (line.includes('ROUND1') && line.includes('GoogleMapで見る')) {
          // Extract location info
          const parts = line.split(/\s+/);
          const nameEnd = parts.findIndex(part => part.match(/\d+/));
          
          if (nameEnd > 0) {
            const name = parts.slice(0, nameEnd).join(' ');
            const addressParts = parts.slice(nameEnd);
            const address = addressParts.join(' ').replace('GoogleMapで見る Details', '').trim();
            
            // Extract city and state from address
            const match = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*\d+/);
            if (match) {
              locations.push({
                name: name.trim(),
                address: address.trim(),
                city: match[1].trim(),
                state: match[2].trim()
              });
            }
          }
        }
      }
    }
  });
  
  return locations.length > 0 ? locations : ALLNET_ACTIVE_LOCATIONS;
}

/**
 * Normalizes location name for comparison
 */
function normalizeLocationName(name) {
  return name
    .replace(/^ROUND1\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes address for comparison
 */
function normalizeAddress(address) {
  return address
    .replace(/\bSte\.\s*/g, 'Suite ')
    .replace(/\bSuite\s*/g, 'Suite ')
    .replace(/\s+/g, ' ')
    .replace(/[,\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Matches ALL.Net locations with JSON data locations
 */
function matchLocations(allNetLocations, jsonLocations) {
  const activeMatches = new Set();
  
  for (const allNetLocation of allNetLocations) {
    let bestMatch = null;
    let highestScore = 0;
    
    for (const jsonLocation of jsonLocations) {
      let score = 0;
      
      // Check state match (highest priority)
      if (allNetLocation.state === jsonLocation.state) {
        score += 50;
        
        // Check city match
        if (allNetLocation.city.toLowerCase() === jsonLocation.city.toLowerCase()) {
          score += 30;
        }
        
        // Check name similarity
        const allNetName = normalizeLocationName(allNetLocation.name);
        const jsonName = normalizeLocationName(jsonLocation.name);
        
        if (jsonName.includes(allNetName) || allNetName.includes(jsonName)) {
          score += 25;
        }
        
        // Check address similarity
        const allNetAddr = normalizeAddress(allNetLocation.address);
        const jsonAddr = normalizeAddress(jsonLocation.address);
        
        // Extract key address components for comparison
        const allNetNumbers = allNetAddr.match(/\d+/g) || [];
        const jsonNumbers = jsonAddr.match(/\d+/g) || [];
        
        // Check if key numbers match
        const commonNumbers = allNetNumbers.filter(num => 
          jsonNumbers.some(jNum => Math.abs(parseInt(num) - parseInt(jNum)) < 10)
        );
        
        if (commonNumbers.length > 0) {
          score += 15;
        }
        
        // Check if addresses contain similar street names
        if (allNetAddr.split(' ').some(word => 
          word.length > 4 && jsonAddr.includes(word)
        )) {
          score += 10;
        }
      }
      
      if (score > highestScore && score >= 75) { // Minimum confidence threshold
        highestScore = score;
        bestMatch = jsonLocation;
      }
    }
    
    if (bestMatch) {
      activeMatches.add(bestMatch.code);
      console.log(`✅ Matched: ${allNetLocation.name} -> ${bestMatch.name} (${bestMatch.code}) - Score: ${highestScore}`);
    } else {
      console.log(`❌ No match found for: ${allNetLocation.name} in ${allNetLocation.city}, ${allNetLocation.state}`);
    }
  }
  
  return activeMatches;
}

/**
 * Updates location data with active status
 */
export async function updateLocationData(currentData) {
  try {
    console.log('🔄 Fetching latest location data from ALL.Net...');
    const allNetLocations = await fetchAllNetLocations();
    
    console.log(`📍 Found ${allNetLocations.length} active locations on ALL.Net`);
    
    // Match locations
    const activeLocationCodes = matchLocations(allNetLocations, currentData);
    
    // Update the data
    const updatedData = currentData.map(location => ({
      ...location,
      active: activeLocationCodes.has(location.code)
    }));
    
    // Count changes
    const changes = {
      activated: 0,
      deactivated: 0,
      unchanged: 0
    };
    
    currentData.forEach((location, index) => {
      const wasActive = location.active;
      const isActive = updatedData[index].active;
      
      if (wasActive && !isActive) {
        changes.deactivated++;
        console.log(`🔴 Deactivated: ${location.name} (${location.code})`);
      } else if (!wasActive && isActive) {
        changes.activated++;
        console.log(`🟢 Activated: ${location.name} (${location.code})`);
      } else {
        changes.unchanged++;
      }
    });
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Activated: ${changes.activated} locations`);
    console.log(`   • Deactivated: ${changes.deactivated} locations`);
    console.log(`   • Unchanged: ${changes.unchanged} locations`);
    console.log(`   • Total active: ${activeLocationCodes.size} locations`);
    
    return {
      success: true,
      data: updatedData,
      changes
    };
    
  } catch (error) {
    console.error('❌ Error updating location data:', error);
    return {
      success: false,
      error: error.message,
      data: currentData
    };
  }
}

/**
 * Downloads the updated JSON data as a file
 */
export function downloadUpdatedData(data, filename = 'r1index-geocoded.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Example usage function for manual testing
export async function runLocationUpdate() {
  // Import current data (this would need to be passed in a real implementation)
  try {
    const currentData = await import('../r1index-geocoded.json').then(module => module.default);
    const result = await updateLocationData(currentData);
    
    if (result.success) {
      console.log('✅ Location data updated successfully');
      console.log('📥 Downloading updated data...');
      downloadUpdatedData(result.data);
      return result.data;
    } else {
      console.error('❌ Failed to update location data:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error importing current data:', error);
    return null;
  }
}
