#!/usr/bin/env node

/**
 * One-time script to parse and update storeid (sid) values from maid.dating
 * Fetches all active locations and updates the storeid field in r1index-geocoded.json
 * 
 * Usage: node scripts/updateStoreIds.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetch and parse locations from maid.dating
async function fetchAllNetLocationsWithSid() {
  const MAID_DATING_URL = 'https://maid.dating/allnet-venue.php';
  
  try {
    // Load node-fetch
    let fetch;
    try {
      fetch = (await import('node-fetch')).default;
    } catch (importError) {
      console.log('📦 Installing node-fetch...');
      const { execSync } = await import('child_process');
      execSync('npm install node-fetch@3', { stdio: 'inherit' });
      fetch = (await import('node-fetch')).default;
    }
    
    // Load cheerio for DOM parsing
    let cheerio;
    try {
      const cheerioModule = await import('cheerio');
      cheerio = cheerioModule.default || cheerioModule;
    } catch (importError) {
      console.log('📦 Installing cheerio...');
      const { execSync } = await import('child_process');
      execSync('npm install cheerio', { stdio: 'inherit' });
      const cheerioModule = await import('cheerio');
      cheerio = cheerioModule.default || cheerioModule;
    }
    
    const response = await fetch(MAID_DATING_URL, {
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
    return parseMaidDatingHTMLForSid(html, cheerio);
  } catch (error) {
    console.error('❌ Failed to fetch from maid.dating:', error.message);
    throw error;
  }
}

/**
 * Parses HTML table from maid.dating to extract location data with sid values
 */
function parseMaidDatingHTMLForSid(html, cheerio) {
  const locations = [];
  const $ = cheerio.load(html);
  
  // Find all table rows in tbody
  const rows = $('tbody tr');
  
  if (rows.length === 0) {
    console.error('❌ No table rows found');
    throw new Error('Failed to parse locations from maid.dating HTML');
  }
  
  console.log(`🔍 Found ${rows.length} table rows in HTML`);
  
  // Process each row
  rows.each((i, row) => {
    const $row = $(row);
    const cells = $row.find('td');
    
    if (cells.length < 3) {
      return; // Skip rows without enough columns
    }
    
    // First column contains the store ID (sid)
    const sid = $(cells[0]).text().trim();
    
    if (!sid || !/^\d+$/.test(sid)) {
      return; // Skip if no valid sid
    }
    
    // Second column contains shop name (in a link)
    const $nameCell = $(cells[1]);
    const $nameLink = $nameCell.find('a');
    let locationName = '';
    
    if ($nameLink.length > 0) {
      locationName = $nameLink.text().trim();
      // Also try to extract sid from link href as backup
      const href = $nameLink.attr('href') || '';
      const sidFromHref = href.match(/[?&]sid=(\d+)/i);
      if (sidFromHref && sidFromHref[1] !== sid) {
        console.warn(`⚠️  SID mismatch: cell=${sid}, href=${sidFromHref[1]} for ${locationName}`);
      }
    } else {
      locationName = $nameCell.text().trim();
    }
    
    // Third column contains address
    const address = $(cells[2]).text().trim();
    
    // Extract city and state from address
    let city = '';
    let state = '';
    if (address) {
      // Try various address patterns
      const addressMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})(?:\s+\d+)?/);
      if (addressMatch) {
        city = addressMatch[1].trim();
        state = addressMatch[2].trim();
      } else {
        // Try pattern without comma before state
        const addressMatch2 = address.match(/([^,]+),\s*([A-Z]{2})(?:\s+\d+)/);
        if (addressMatch2) {
          city = addressMatch2[1].trim();
          state = addressMatch2[2].trim();
        }
      }
    }
    
    // Only add ROUND1 locations
    if (sid && locationName && locationName.toUpperCase()) {
      locations.push({
        name: locationName,
        address: address,
        city: city,
        state: state,
        sid: sid
      });
    }
  });
  
  console.log(`✅ Successfully parsed ${locations.length} ROUND1 locations with sid values`);
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
 * Matches maid.dating locations with JSON data and updates storeid
 */
function matchAndUpdateStoreIds(allNetLocations, jsonLocations) {
  let updatedCount = 0;
  let matchedCount = 0;
  
  for (const allNetLocation of allNetLocations) {
    let bestMatch = null;
    let highestScore = 0;
    
    // First try to match by existing storeid
    for (const jsonLocation of jsonLocations) {
      if (jsonLocation.storeid && jsonLocation.storeid === allNetLocation.sid) {
        bestMatch = jsonLocation;
        highestScore = 100;
        break;
      }
    }
    
    // If no storeid match, try fuzzy matching
    if (!bestMatch) {
      for (const jsonLocation of jsonLocations) {
        let score = 0;
        
        // Check state match
        if (allNetLocation.state && jsonLocation.state === allNetLocation.state) {
          score += 50;
          
          // Check city match
          if (allNetLocation.city && allNetLocation.city.toLowerCase() === jsonLocation.city.toLowerCase()) {
            score += 30;
          }
          
          // Check name similarity
          const allNetName = normalizeLocationName(allNetLocation.name);
          const jsonName = normalizeLocationName(jsonLocation.name);
          
          if (jsonName.includes(allNetName) || allNetName.includes(jsonName)) {
            score += 25;
          }
        }
        
        if (score > highestScore && score >= 75) {
          highestScore = score;
          bestMatch = jsonLocation;
        }
      }
    }
    
    if (bestMatch) {
      matchedCount++;
      const hadStoreId = !!bestMatch.storeid;
      const isUpdate = bestMatch.storeid !== allNetLocation.sid;
      
      if (isUpdate) {
        bestMatch.storeid = allNetLocation.sid;
        updatedCount++;
        console.log(`✅ ${hadStoreId ? 'Updated' : 'Added'} storeid for: ${bestMatch.name} (${bestMatch.code}) -> ${allNetLocation.sid} [Score: ${highestScore}]`);
      } else {
        console.log(`ℹ️  Already has correct storeid: ${bestMatch.name} (${bestMatch.code}) -> ${allNetLocation.sid}`);
      }
    } else {
      console.log(`⚠️  No match found for: ${allNetLocation.name} in ${allNetLocation.city}, ${allNetLocation.state} [sid: ${allNetLocation.sid}]`);
    }
  }
  
  return { updatedCount, matchedCount };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔄 Store ID Updater - One-time job');
    console.log('==================================\n');
    
    // Read current JSON data
    const jsonPath = path.join(__dirname, '../src/r1index-geocoded.json');
    console.log('📂 Reading current location data...');
    
    const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    console.log(`📍 Loaded ${jsonData.length} locations from JSON file\n`);
    
    // Fetch latest data from maid.dating
    console.log('🌐 Fetching location data with sid from maid.dating...');
    const allNetLocations = await fetchAllNetLocationsWithSid();
    console.log(`📍 Found ${allNetLocations.length} locations with sid values\n`);
    
    // Match and update storeids
    console.log('🔍 Matching locations and updating storeids...\n');
    const { updatedCount, matchedCount } = matchAndUpdateStoreIds(allNetLocations, jsonData);
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Matched: ${matchedCount} locations`);
    console.log(`   • Updated/Added storeid: ${updatedCount} locations`);
    console.log(`   • Total locations in JSON: ${jsonData.length}\n`);
    
    // Write updated data back to file
    if (updatedCount > 0) {
      console.log('💾 Writing updated data to file...');
      await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
      console.log('✅ Store IDs updated successfully!');
      
      // Create backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `../src/r1index-geocoded-backup-${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(jsonData, null, 2));
      console.log(`🔐 Backup created: ${path.basename(backupPath)}`);
    } else {
      console.log('ℹ️  No updates needed - all storeids are already up to date');
    }
    
    console.log(`\n✅ Update process completed!\n`);
    
  } catch (error) {
    console.error('❌ Error updating store IDs:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

