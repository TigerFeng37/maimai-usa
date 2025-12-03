#!/usr/bin/env node

/**
 * Node.js Script to Update maimai Location Data
 * Extracts all active store IDs (sid) from the main ALL.Net location page
 * Stores with buttons on the main page are considered active (have maimai DX International Version)
 * Stores without buttons are considered inactive
 * 
 * Usage: node scripts/updateLocations.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetches all store IDs (sid) from the main ALL.Net location list page
 * Matches all buttons using the selector: #contents_wrapper > div.content_box.mb_20 > div > div > ul > li > span.store_buttons > span.store_bt > button
 * Extracts sid from onClick attribute (e.g., onClick="location.href='shop?gm=98&astep=1009&sid=18518&lang=en'")
 */
async function fetchAllStoreIds(fetch, cheerio) {
  // Add timestamp to URL to prevent caching
  const timestamp = Date.now();
  const ALLNET_BASE_URL = `https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009&_t=${timestamp}`;
  
  try {
    const response = await fetch(ALLNET_BASE_URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; maimai-usa-updater/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Match all buttons using the specific selector path
    // Selector: #contents_wrapper > div.content_box.mb_20 > div > div > ul > li > span.store_buttons > span.store_bt > button
    const buttonSelector = '#contents_wrapper > div.content_box.mb_20 > div > div > ul > li > span.store_buttons > span.store_bt > button';
    const $buttons = $(buttonSelector);
    
    if ($buttons.length === 0) {
      throw new Error('No buttons found on main page');
    }
    
    console.log(`🔍 Found ${$buttons.length} buttons on main page`);
    
    const storeIds = [];
    const seenStoreIds = new Set(); // Track duplicates
    let skippedButtons = 0;
    let duplicateButtons = 0;
    
    // Extract all store IDs (sid) from button onClick attributes
    // Only process buttons that have onClick with 'shop?' in the URL (store detail buttons)
    for (let i = 0; i < $buttons.length; i++) {
      const $button = $($buttons[i]);
      
      // Extract sid from button's onClick attribute
      // Format: onClick="location.href='shop?gm=98&astep=1009&sid=18518&lang=en'"
      const onclick = $button.attr('onclick') || $button.attr('onClick') || '';
      
      if (!onclick) {
        skippedButtons++;
        continue; // Skip buttons without onClick
      }
      
      // Only process buttons that point to shop pages (not GoogleMap or other links)
      // The onClick should contain 'shop?' to indicate it's a store detail button
      if (!onclick.includes('shop?')) {
        skippedButtons++;
        continue; // Skip buttons that don't point to shop pages
      }
      
      // Extract sid from onClick using regex
      // Match pattern: location.href='shop?...&sid=XXXXX&...' or location.href="shop?...&sid=XXXXX&..."
      // Also handle variations like location.href='shop?gm=98&astep=1009&sid=18518&lang=en'
      let sid = null;
      
      // Try to match sid parameter in the onClick string
      // Pattern: sid= followed by digits
      const sidMatch = onclick.match(/[?&]sid=(\d+)/i);
      if (sidMatch && sidMatch[1]) {
        sid = sidMatch[1];
      } else {
        // Fallback: try to find any numeric value after sid
        const fallbackMatch = onclick.match(/sid[=:]?\s*['"]?(\d+)['"]?/i);
        if (fallbackMatch && fallbackMatch[1]) {
          sid = fallbackMatch[1];
        }
      }
      
      if (sid) {
        const sidStr = String(sid);
        // Check for duplicates
        if (seenStoreIds.has(sidStr)) {
          duplicateButtons++;
          console.warn(`⚠️  Button ${i + 1}: Duplicate store ID ${sidStr} (already extracted)`);
        } else {
          storeIds.push(sidStr); // Ensure sid is always a string for consistent comparison
          seenStoreIds.add(sidStr);
        }
      } else {
        skippedButtons++;
        console.warn(`⚠️  Button ${i + 1}: Could not extract sid from onClick: ${onclick.substring(0, 100)}...`);
      }
    }
    
    console.log(`\n📊 Button Processing Summary:`);
    console.log(`   • Total buttons found: ${$buttons.length}`);
    console.log(`   • Buttons with shop? links: ${storeIds.length + duplicateButtons}`);
    console.log(`   • Unique store IDs extracted: ${storeIds.length}`);
    if (duplicateButtons > 0) {
      console.log(`   • Duplicate store IDs skipped: ${duplicateButtons}`);
    }
    if (skippedButtons > 0) {
      console.log(`   • Buttons skipped (no shop? link): ${skippedButtons}`);
    }
    console.log('');
    
    if (storeIds.length === 0) {
      throw new Error('No store IDs found on main page');
    }
    
    console.log(`✅ Extracted ${storeIds.length} unique store IDs from ${$buttons.length} buttons\n`);
    return storeIds;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to fetch store IDs from ALL.Net:', error.message);
    throw new Error('ALL.Net fetch failed - aborting update to prevent data corruption');
  }
}


/**
 * Main function to fetch all active stores from the main page
 * Stores with buttons on the main page are considered active (have maimai DX International Version)
 * @param {Set<string>} alreadyActiveStoreIds - Set of store IDs already marked as active in JSON (unused, kept for compatibility)
 */
async function fetchAllNetLocations(alreadyActiveStoreIds) {
  try {
    // Use dynamic import for node-fetch
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
    
    // Get all active store IDs from main page
    // If a store has a button on the main page, it means it has maimai DX International Version
    console.log('🌐 Fetching active store IDs from ALL.Net main page...');
    console.log('   Stores with buttons on this page are considered active\n');
    
    const activeStoreIds = await fetchAllStoreIds(fetch, cheerio);
    
    if (activeStoreIds.length === 0) {
      throw new Error('No active stores found on ALL.Net main page');
    }
    
    console.log(`\n✅ Found ${activeStoreIds.length} active stores with maimai DX International Version`);
    console.log(`   (Stores without buttons on the main page are considered inactive)\n`);
    
    return activeStoreIds;
  } catch (error) {
    console.error('❌ CRITICAL: Failed to fetch from ALL.Net website:', error.message);
    throw new Error('ALL.Net fetch failed - aborting update to prevent data corruption');
  }
}

/**
 * Fetches location details from ALL.Net shop page for a given store ID
 * @param {Function} fetch - Fetch function
 * @param {Function} cheerio - Cheerio function
 * @param {string} storeId - Store ID to fetch details for
 * @returns {Promise<Object|null>} Location details or null if not found
 */
async function fetchLocationDetails(fetch, cheerio, storeId) {
  const SHOP_URL = `https://location.am-all.net/alm/shop?gm=98&astep=1009&sid=${storeId}&lang=en`;
  
  try {
    const response = await fetch(SHOP_URL, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; maimai-usa-updater/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract location name
    const name = $('.shop_name, h1, .store_name').first().text().trim() || 
                 $('title').text().replace(/ - ALL.Net.*/, '').trim();
    
    // Extract address
    const addressText = $('.shop_address, .address, .store_address').first().text().trim() ||
                       $('body').text().match(/\d+[^,]+,\s*[^,]+,\s*[A-Z]{2}\s*\d{5}/)?.[0] || '';
    
    if (!name || !addressText) {
      return null;
    }
    
    // Parse address to extract city and state
    const addressMatch = addressText.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
    if (!addressMatch) {
      return null;
    }
    
    const [, streetAddress, city, state, zip] = addressMatch;
    
    return {
      name: name,
      address: addressText,
      city: city.trim(),
      state: state.trim(),
      storeid: storeId
    };
  } catch (error) {
    console.warn(`⚠️  Failed to fetch details for store ID ${storeId}: ${error.message}`);
    return null;
  }
}

/**
 * Updates recent-locations.json with newly activated locations
 * @param {Array} newlyActivatedLocations - Array of location objects that were just activated
 */
async function updateRecentLocations(newlyActivatedLocations) {
  if (newlyActivatedLocations.length === 0) {
    return;
  }
  
  try {
    const recentLocationsPath = path.join(__dirname, '../src/recent-locations.json');
    
    // Read existing recent locations
    let recentLocations = [];
    try {
      const existingData = await fs.readFile(recentLocationsPath, 'utf8');
      recentLocations = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      recentLocations = [];
    }
    
    // Create a set of existing storeids to avoid duplicates
    const existingStoreIds = new Set(
      recentLocations.map(loc => String(loc.storeid || ''))
    );
    
    // Add newly activated locations (only if not already in the list)
    let addedCount = 0;
    for (const location of newlyActivatedLocations) {
      const storeIdStr = String(location.storeid || '');
      if (storeIdStr && !existingStoreIds.has(storeIdStr)) {
        // Prepare location data for recent-locations.json
        const recentLocation = {
          code: location.code || 'N/A',
          name: location.name,
          city: location.city,
          state: location.state,
          address: location.address || location.geocoded_address || '',
          cab_count: location.cab_count || 'TBD',
          index: location.index || '-',
          lat: location.lat || null,
          lng: location.lng || null,
          geocoded: location.geocoded || false,
          geocoded_address: location.geocoded_address || location.address || '',
          active: true,
          storeid: location.storeid,
          hours: location.hours || null,
          phone: location.phone || null,
          website: location.website || null
        };
        
        recentLocations.push(recentLocation);
        existingStoreIds.add(storeIdStr);
        addedCount++;
      }
    }
    
    // Keep only the most recent 10 locations (or adjust as needed)
    if (recentLocations.length > 10) {
      recentLocations = recentLocations.slice(-10);
    }
    
    // Write updated recent locations
    await fs.writeFile(recentLocationsPath, JSON.stringify(recentLocations, null, 2));
    console.log(`📝 Updated recent-locations.json: Added ${addedCount} newly activated location(s)`);
  } catch (error) {
    console.warn(`⚠️  Failed to update recent-locations.json: ${error.message}`);
  }
}

/**
 * Cross-references existing storeids with remote source and finds missing locations
 * @param {Function} fetch - Fetch function
 * @param {Function} cheerio - Cheerio function
 * @param {Array} activeStoreIds - Array of active store IDs from remote source
 * @param {Array} jsonLocations - Current locations in JSON file
 * @returns {Promise<Array>} Array of new locations found on remote but not in JSON
 */
async function findMissingLocations(fetch, cheerio, activeStoreIds, jsonLocations) {
  console.log('\n🔍 Cross-referencing storeids with remote source to find missing locations...');
  
  // Create a set of existing storeids in JSON
  const existingStoreIds = new Set(
    jsonLocations
      .filter(loc => loc.storeid)
      .map(loc => String(loc.storeid))
  );
  
  // Find store IDs that are active on remote but not in JSON
  const missingStoreIds = activeStoreIds.filter(sid => {
    const sidStr = String(sid);
    return !existingStoreIds.has(sidStr);
  });
  
  if (missingStoreIds.length === 0) {
    console.log('✅ All active store IDs from remote source are already in JSON file');
    return [];
  }
  
  console.log(`📋 Found ${missingStoreIds.length} store ID(s) on remote source not in JSON:`);
  missingStoreIds.forEach(sid => console.log(`   • Store ID: ${sid}`));
  
  // Fetch details for missing locations
  const newLocations = [];
  for (const storeId of missingStoreIds) {
    console.log(`\n🔍 Fetching details for missing store ID: ${storeId}...`);
    const details = await fetchLocationDetails(fetch, cheerio, storeId);
    
    if (details) {
      // Create a new location entry
      const newLocation = {
        code: 'N/A',
        name: details.name,
        city: details.city,
        state: details.state,
        address: details.address,
        cab_count: 'TBD',
        index: '-',
        lat: null,
        lng: null,
        geocoded: false,
        geocoded_address: null,
        active: true,
        storeid: storeId
      };
      
      newLocations.push(newLocation);
      console.log(`✅ Found new location: ${details.name} (${details.city}, ${details.state})`);
    } else {
      console.warn(`⚠️  Could not fetch details for store ID ${storeId}`);
    }
    
    // Add a small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return newLocations;
}

/**
 * Matches store IDs with JSON data locations
 * Uses sid (storeid) for exact matching
 * Ensures strict string comparison to avoid type mismatches
 */
function matchLocations(activeStoreIds, jsonLocations) {
  // Use Map to track storeid -> location mapping (storeid is unique, code may not be)
  const activeMatches = new Map(); // Map<storeid, location>
  const matchedStoreIds = new Set();
  
  console.log(`\n🔍 Matching ${activeStoreIds.length} active store IDs against ${jsonLocations.length} locations in JSON...`);
  
  for (const sid of activeStoreIds) {
    // Ensure sid is a string for consistent comparison
    const sidStr = String(sid);
    
    // Find matching location in JSON data by storeid
    // Use strict string comparison to avoid type mismatches
    // IMPORTANT: Use find to get the FIRST match only (in case of duplicate storeids)
    const matchedLocation = jsonLocations.find(location => {
      if (!location.storeid) return false;
      // Convert both to strings for comparison
      return String(location.storeid) === sidStr;
    });
    
    if (matchedLocation) {
      // Check if this storeid was already matched (duplicate in activeStoreIds)
      if (activeMatches.has(sidStr)) {
        console.warn(`⚠️  Duplicate store ID ${sidStr} in activeStoreIds - skipping duplicate`);
        continue;
      }
      
      // Store the mapping using storeid as key (unique identifier)
      activeMatches.set(sidStr, matchedLocation);
      matchedStoreIds.add(sidStr);
      console.log(`✅ Matched: Store ${sidStr} -> ${matchedLocation.name} (${matchedLocation.code})`);
    } else {
      console.warn(`⚠️  No match found in JSON data for store ID: ${sidStr}`);
    }
  }
  
  // Return Set of location codes (for backward compatibility with existing code)
  // But note: if multiple locations have the same code, this Set will only contain it once
  const activeLocationCodes = new Set();
  for (const location of activeMatches.values()) {
    activeLocationCodes.add(location.code);
  }
  
    console.log(`\n📊 Matching Summary:`);
    console.log(`   • Active store IDs from ALL.Net main page: ${activeStoreIds.length}`);
    console.log(`   • Successfully matched to JSON locations: ${matchedStoreIds.size}`);
    console.log(`   • Unmatched store IDs (not in JSON): ${activeStoreIds.length - matchedStoreIds.size}`);
    console.log(`   • Unique location codes (will be activated): ${activeLocationCodes.size}`);
    console.log(`   • Note: Using storeid as unique identifier (codes may be duplicated)`);
    
    // Debug: Show all extracted store IDs
    console.log(`\n📋 Extracted Store IDs from main page buttons:`);
    activeStoreIds.forEach((sid, index) => {
      const matched = activeMatches.get(String(sid));
      if (matched) {
        console.log(`   ${index + 1}. Store ID: ${sid} -> ${matched.name} (${matched.code})`);
      } else {
        console.log(`   ${index + 1}. Store ID: ${sid} -> (not in JSON)`);
      }
    });
    console.log('');
    
    return activeLocationCodes;
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
    
    // Extract store IDs that are already marked as active (for reference only)
    const alreadyActiveStoreIds = new Set();
    for (const location of jsonData) {
      if (location.active === true && location.storeid) {
        alreadyActiveStoreIds.add(String(location.storeid));
      }
    }
    
    if (alreadyActiveStoreIds.size > 0) {
      console.log(`📋 Found ${alreadyActiveStoreIds.size} locations currently marked as active in JSON\n`);
    }
    
    // Fetch latest active stores from ALL.Net main page
    // Stores with buttons on the main page are considered active
    console.log('🌐 Fetching active stores from ALL.Net main page...');
    const activeStoreIds = await fetchAllNetLocations(alreadyActiveStoreIds);
    console.log(`📍 Found ${activeStoreIds.length} active stores on ALL.Net main page\n`);
    
    // Load fetch and cheerio for cross-referencing
    let fetch, cheerio;
    try {
      fetch = (await import('node-fetch')).default;
    } catch (importError) {
      const { execSync } = await import('child_process');
      execSync('npm install node-fetch@3', { stdio: 'inherit' });
      fetch = (await import('node-fetch')).default;
    }
    
    try {
      const cheerioModule = await import('cheerio');
      cheerio = cheerioModule.default || cheerioModule;
    } catch (importError) {
      const { execSync } = await import('child_process');
      execSync('npm install cheerio', { stdio: 'inherit' });
      const cheerioModule = await import('cheerio');
      cheerio = cheerioModule.default || cheerioModule;
    }
    
    // Cross-reference existing storeids with remote source to find missing locations
    const newLocations = await findMissingLocations(fetch, cheerio, activeStoreIds, jsonData);
    
    // Add new locations to jsonData
    if (newLocations.length > 0) {
      console.log(`\n➕ Adding ${newLocations.length} new location(s) to JSON data...`);
      jsonData.push(...newLocations);
      console.log(`✅ Total locations in JSON: ${jsonData.length}\n`);
    }
    
    // Match locations
    console.log('🔍 Matching active store IDs with JSON data...');
    const activeLocationCodes = matchLocations(activeStoreIds, jsonData);
    console.log(`\n🎯 Successfully matched ${activeLocationCodes.size} locations from ${activeStoreIds.length} active store IDs\n`);
    
    // CRITICAL VERIFICATION: Verify that all activeLocationCodes correspond to store IDs found on the webpage
    console.log('🔍 VERIFICATION: Checking that all matched locations have buttons on the main page...');
    const activeStoreIdsSet = new Set(activeStoreIds.map(sid => String(sid)));
    let verificationPassed = true;
    const mismatchedLocations = [];
    
    // Build a reverse map: storeid -> location that was matched (using storeid as unique identifier)
    // CRITICAL: Multiple locations may have the same code (e.g., "N/A"), so we must use storeid to uniquely identify
    const storeIdToLocation = new Map();
    for (const sid of activeStoreIds) {
      const sidStr = String(sid);
      const location = jsonData.find(loc => loc.storeid && String(loc.storeid) === sidStr);
      if (location) {
        storeIdToLocation.set(sidStr, location);
      }
    }
    
    // Build a map of location codes to their actual locations (handle duplicates by using storeid)
    // Since multiple locations can have the same code, we need to track which specific location was matched
    const matchedLocationsByStoreId = new Map();
    for (const sid of activeStoreIds) {
      const sidStr = String(sid);
      const location = jsonData.find(loc => loc.storeid && String(loc.storeid) === sidStr);
      if (location) {
        matchedLocationsByStoreId.set(sidStr, location);
      }
    }
    
    // Verify each location code in activeLocationCodes
    // IMPORTANT: Since codes can be duplicated, we verify by checking if ANY location with this code
    // has a storeid that is in activeStoreIds
    for (const locationCode of activeLocationCodes) {
      // Find ALL locations with this code (there may be duplicates)
      const locationsWithThisCode = jsonData.filter(loc => loc.code === locationCode);
      
      if (locationsWithThisCode.length === 0) {
        console.error(`❌ VERIFICATION FAILED: Location code ${locationCode} is in activeLocationCodes but not found in JSON!`);
        verificationPassed = false;
        mismatchedLocations.push({ code: locationCode, reason: 'Not found in JSON' });
        continue;
      }
      
      // Check if ANY location with this code has a storeid that matches an active store ID
      let foundValidMatch = false;
      for (const location of locationsWithThisCode) {
        if (!location.storeid) continue;
        
        const storeIdStr = String(location.storeid);
        if (activeStoreIdsSet.has(storeIdStr)) {
          // Verify this location was actually matched by this storeid
          const matchedLocation = matchedLocationsByStoreId.get(storeIdStr);
          if (matchedLocation && matchedLocation.code === locationCode) {
            foundValidMatch = true;
            break;
          }
        }
      }
      
      if (!foundValidMatch) {
        // None of the locations with this code have a valid storeid match
        const location = locationsWithThisCode[0]; // Use first one for error message
        const storeIdStr = location.storeid ? String(location.storeid) : 'N/A';
        console.error(`❌ VERIFICATION FAILED: Location code ${locationCode} (${location.name}, Store ID: ${storeIdStr}) is in activeLocationCodes but has NO matching button on the main page!`);
        console.error(`   This location should NOT be activated because its storeid ${storeIdStr} was NOT found in the extracted store IDs.`);
        console.error(`   Current active status in JSON: ${location.active}`);
        console.error(`   Note: There are ${locationsWithThisCode.length} location(s) with code "${locationCode}"`);
        verificationPassed = false;
        mismatchedLocations.push({ code: locationCode, storeid: storeIdStr, name: location.name, reason: 'No button on main page' });
      }
    }
    
    if (!verificationPassed) {
      console.error(`\n❌ CRITICAL VERIFICATION FAILED!`);
      console.error(`   Found ${mismatchedLocations.length} locations that should NOT be active:`);
      mismatchedLocations.forEach(m => {
        console.error(`   • ${m.code} (${m.name || 'Unknown'}, Store ID: ${m.storeid || 'N/A'}) - ${m.reason}`);
      });
      console.error(`\n   Aborting update to prevent data corruption.`);
      console.error(`   This indicates a bug in the matching logic.\n`);
      process.exit(1);
    }
    
    console.log(`✅ Verification passed: All ${activeLocationCodes.size} matched locations have corresponding buttons on the main page\n`);
    
    // SAFETY CHECK: Ensure we have a reasonable number of matches
    // If we matched too few locations, abort as this may indicate a scraping failure
    const MIN_EXPECTED_ACTIVE = 40; // Round1 has ~40+ active maimai locations in the US
    const MAX_EXPECTED_ACTIVE = 100; // Safety upper bound - if we match too many, something is wrong
    
    if (activeLocationCodes.size < MIN_EXPECTED_ACTIVE) {
      console.error(`\n⚠️  SAFETY CHECK FAILED (TOO FEW)!`);
      console.error(`   Only matched ${activeLocationCodes.size} locations, expected at least ${MIN_EXPECTED_ACTIVE}`);
      console.error(`   This could indicate a scraping failure or website change.`);
      console.error(`   Aborting update to prevent data corruption.\n`);
      process.exit(1);
    }
    
    if (activeLocationCodes.size > MAX_EXPECTED_ACTIVE) {
      console.error(`\n⚠️  SAFETY CHECK FAILED (TOO MANY)!`);
      console.error(`   Matched ${activeLocationCodes.size} locations, expected at most ${MAX_EXPECTED_ACTIVE}`);
      console.error(`   This could indicate a matching logic error or data corruption.`);
      console.error(`   Aborting update to prevent data corruption.\n`);
      process.exit(1);
    }
    
    // Update the data
    // CRITICAL: Activation is ONLY based on buttons found on the main page URL
    // - activeLocationCodes contains ONLY locations that were matched from main page buttons
    // - A location is activated ONLY if its code is in activeLocationCodes (meaning it has a button on the main page)
    // - Having a storeid in JSON does NOT activate a location - it must have a button on the main page
    // - Locations without storeid cannot be matched and will remain inactive
    console.log(`\n🔄 Updating location active status...`);
    console.log(`   Active location codes from main page buttons: ${activeLocationCodes.size}`);
    console.log(`   Total locations in JSON: ${jsonData.length}`);
    console.log(`   ⚠️  Only locations with buttons on the main page will be activated\n`);
    
    let locationsWithStoreId = 0;
    let locationsWithoutStoreId = 0;
    
    // CRITICAL: Use storeid (not code) to determine activation, since codes can be duplicated
    // activeStoreIdsSet is already defined in verification section above
    
    const updatedData = jsonData.map(location => {
      // Locations without storeid cannot be matched to main page buttons
      // They will always remain inactive
      if (!location.storeid) {
        locationsWithoutStoreId++;
        return {
          ...location,
          active: false // Locations without storeid cannot be matched, so they remain inactive
        };
      }
      
      locationsWithStoreId++;
      
      // CRITICAL: Check if this location's storeid is in activeStoreIds (from main page buttons)
      // This is the ONLY way to determine if a location should be active
      // We use storeid (not code) because multiple locations can have the same code
      const storeIdStr = String(location.storeid);
      const isInActiveList = activeStoreIdsSet.has(storeIdStr);
      
      // IMPORTANT: Having a storeid in JSON does NOT mean it's active
      // It must have a corresponding button on the main page to be activated
      return {
        ...location,
        active: isInActiveList
      };
    });
    
    // Debug: Show how many locations will be active vs inactive
    const willBeActive = updatedData.filter(l => l.active).length;
    const willBeInactive = updatedData.filter(l => !l.active).length;
    console.log(`📊 Update Preview:`);
    console.log(`   • Locations with storeid: ${locationsWithStoreId}`);
    console.log(`   • Locations without storeid (cannot match): ${locationsWithoutStoreId}`);
    console.log(`   • Will be active: ${willBeActive} locations (ONLY those with buttons on main page)`);
    console.log(`   • Will be inactive: ${willBeInactive} locations`);
    console.log(`   • ⚠️  Note: Having storeid in JSON does NOT activate a location`);
    console.log(`   • ⚠️  Only locations with buttons on the main page are activated\n`);
    
    // Count changes and track newly activated locations
    const changes = {
      activated: 0,
      deactivated: 0,
      unchanged: 0,
      added: newLocations.length
    };
    
    const newlyActivatedLocations = [];
    
    jsonData.forEach((location, index) => {
      const wasActive = location.active;
      const isActive = updatedData[index].active;
      
      // Skip logging for locations without storeid (they're always set to inactive)
      if (!location.storeid) {
        changes.unchanged++;
        return;
      }
      
      if (!wasActive && isActive) {
        changes.activated++;
        // Verify this location's storeid is in the activeStoreIds list
        const storeIdStr = String(location.storeid);
        if (!activeStoreIds.includes(storeIdStr)) {
          console.error(`❌ ERROR: Activating ${location.name} (${location.code}) with Store ID ${storeIdStr}, but this Store ID was NOT found on the main page!`);
          console.error(`   This should never happen - aborting!`);
          process.exit(1);
        }
        console.log(`🟢 Activated: ${location.name} (${location.code}) - Store ID: ${location.storeid} ✓`);
        // Track newly activated location for recent-locations.json
        newlyActivatedLocations.push(updatedData[index]);
      } else if (wasActive && !isActive) {
        changes.deactivated++;
        console.log(`🔴 Deactivated: ${location.name} (${location.code}) - Store ID: ${location.storeid}`);
      } else {
        changes.unchanged++;
      }
    });
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Added: ${changes.added} new locations (from remote source)`);
    console.log(`   • Activated: ${changes.activated} locations (matched store IDs)`);
    console.log(`   • Deactivated: ${changes.deactivated} locations (not found on main page)`);
    console.log(`   • Unchanged: ${changes.unchanged} locations`);
    console.log(`   • Total active: ${updatedData.filter(l => l.active).length} locations`);
    console.log(`   • Note: Only locations with storeid can be activated\n`);
    
    // Write updated data back to file
    if (changes.activated > 0 || changes.deactivated > 0 || changes.added > 0) {
      console.log('💾 Writing updated data to file...');
      await fs.writeFile(jsonPath, JSON.stringify(updatedData, null, 2));
      console.log('✅ Location data updated successfully!');
      
      // Also create a backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `../src/r1index-geocoded-backup-${timestamp}.json`);
      await fs.writeFile(backupPath, JSON.stringify(jsonData, null, 2));
      console.log(`🔐 Backup created: ${path.basename(backupPath)}`);
      
      // Update recent-locations.json with newly activated locations
      if (newlyActivatedLocations.length > 0) {
        await updateRecentLocations(newlyActivatedLocations);
      }
    } else {
      console.log('ℹ️  No changes detected, file not updated');
    }
    
    // Final summary
    console.log(`\n✅ Update process completed successfully!`);
    console.log(`   New activations: ${changes.activated}`);
    console.log(`   Total locations tracked: ${jsonData.length}`);
    console.log(`   Currently active: ${updatedData.filter(l => l.active).length}\n`);
    
  } catch (error) {
    console.error('❌ Error updating location data:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
