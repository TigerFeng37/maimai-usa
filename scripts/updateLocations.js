#!/usr/bin/env node

/**
 * Node.js Script to Update maimai Location Data
 * Fetches latest active locations from ALL.Net and updates the JSON file
 * 
 * Usage: node scripts/updateLocations.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS-free fetch for Node.js
async function fetchAllNetLocations() {
  const ALLNET_URL = 'https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009';
  
  try {
    // Use dynamic import for node-fetch to avoid requiring it in package.json initially
    let fetch;
    try {
      fetch = (await import('node-fetch')).default;
    } catch (importError) {
      console.log('📦 Installing node-fetch...');
      const { execSync } = await import('child_process');
      execSync('npm install node-fetch@3', { stdio: 'inherit' });
      fetch = (await import('node-fetch')).default;
    }
    
    const response = await fetch(ALLNET_URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; maimai-usa-updater/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    return parseAllNetHTML(html);
  } catch (error) {
    console.warn('⚠️  Failed to fetch from ALL.Net website:', error.message);
    console.log('📋 Using fallback active locations from search results...');
    
    // Fallback to known active locations from the web search
    return [
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
  }
}

/**
 * Parses HTML from ALL.Net website to extract location data
 */
function parseAllNetHTML(html) {
  const locations = [];
  
  // Split HTML into lines for parsing
  const lines = html.split('\n').map(line => line.trim()).filter(line => line);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for Round1 location entries
    if (line.includes('ROUND1') && (line.includes('GoogleMapで見る') || line.includes('Details'))) {
      // Extract location name and address
      let locationText = line;
      
      // Remove HTML tags
      locationText = locationText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for pattern: "ROUND1 [NAME] [ADDRESS] GoogleMapで見る Details"
      const match = locationText.match(/ROUND1\s+([^0-9]+?)\s+(\d+[^G]+?)(?:GoogleMapで見る|Details)/);
      
      if (match) {
        const name = `ROUND1 ${match[1].trim()}`;
        const address = match[2].trim();
        
        // Extract city and state from address
        const addressMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*\d+/);
        if (addressMatch) {
          locations.push({
            name: name,
            address: address,
            city: addressMatch[1].trim(),
            state: addressMatch[2].trim()
          });
        }
      }
    }
  }
  
  // If parsing failed, return fallback data
  if (locations.length === 0) {
    console.log('⚠️  HTML parsing failed, using fallback data');
    return [
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
  }
  
  return locations;
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
          jsonNumbers.some(jNum => Math.abs(parseInt(num) - parseInt(jNum)) < 50)
        );
        
        if (commonNumbers.length > 0) {
          score += 15;
        }
        
        // Check if addresses contain similar street names
        const allNetWords = allNetAddr.split(' ').filter(word => word.length > 3);
        const jsonWords = jsonAddr.split(' ').filter(word => word.length > 3);
        
        const commonWords = allNetWords.filter(word => 
          jsonWords.some(jWord => jWord.includes(word) || word.includes(jWord))
        );
        
        if (commonWords.length > 0) {
          score += 10;
        }
      }
      
      if (score > highestScore && score >= 70) { // Minimum confidence threshold
        highestScore = score;
        bestMatch = jsonLocation;
      }
    }
    
    if (bestMatch) {
      activeMatches.add(bestMatch.code);
      console.log(`✅ Matched: ${allNetLocation.name} -> ${bestMatch.name} (${bestMatch.code}) - Score: ${highestScore}`);
    } else {
      console.log(`⚠️  No high-confidence match for: ${allNetLocation.name} in ${allNetLocation.city}, ${allNetLocation.state}`);
      
      // FAILSAFE: Try simple name-based match as last resort
      const normalizedScrapedName = normalizeLocationName(allNetLocation.name);
      const nameMatch = jsonLocations.find(jsonLocation => {
        const normalizedJsonName = normalizeLocationName(jsonLocation.name);
        return normalizedJsonName.includes(normalizedScrapedName) || 
               normalizedScrapedName.includes(normalizedJsonName);
      });
      
      if (nameMatch) {
        activeMatches.add(nameMatch.code);
        console.log(`✅ FAILSAFE: Matched by name only: ${allNetLocation.name} -> ${nameMatch.name} (${nameMatch.code})`);
      } else {
        console.log(`❌ No match found (even by name): ${allNetLocation.name}`);
      }
    }
  }
  
  return activeMatches;
}

/**
 * Main function to update location data
 */
async function main() {
  try {
    console.log('🎮 maimai USA Location Data Updater');
    console.log('=====================================\n');
    
    // Read current JSON data
    const jsonPath = path.join(__dirname, '../src/r1index-geocoded.json');
    console.log('📂 Reading current location data...');
    
    const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    console.log(`📍 Loaded ${jsonData.length} locations from JSON file\n`);
    
    // Fetch latest data from ALL.Net
    console.log('🌐 Fetching latest location data from ALL.Net...');
    const allNetLocations = await fetchAllNetLocations();
    console.log(`📍 Found ${allNetLocations.length} active locations on ALL.Net\n`);
    
    // Match locations
    console.log('🔍 Matching locations...');
    const activeLocationCodes = matchLocations(allNetLocations, jsonData);
    console.log(`\n🎯 Successfully matched ${activeLocationCodes.size} locations\n`);
    
    // Update the data
    const updatedData = jsonData.map(location => ({
      ...location,
      active: activeLocationCodes.has(location.code)
    }));
    
    // Count changes
    const changes = {
      activated: 0,
      deactivated: 0,
      unchanged: 0
    };
    
    jsonData.forEach((location, index) => {
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
    console.log(`   • Total active: ${activeLocationCodes.size} locations\n`);
    
    // Write updated data back to file
    if (changes.activated > 0 || changes.deactivated > 0) {
      console.log('💾 Writing updated data to file...');
      await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));
      console.log('✅ Location data updated successfully!');
      
      // Also create a backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `../src/r1index-geocoded-backup-${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(jsonData, null, 2));
      console.log(`🔐 Backup created: ${path.basename(backupPath)}`);
    } else {
      console.log('ℹ️  No changes detected, file not updated');
    }
    
  } catch (error) {
    console.error('❌ Error updating location data:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
