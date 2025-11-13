#!/usr/bin/env node

/**
 * Script to fetch store hours, phone number, and website from Google Places API and cache them
 * 
 * This script uses Google Places API to fetch business information for all stores
 * and caches the results in r1index-geocoded.json
 * 
 * Usage: 
 *   GOOGLE_PLACES_API_KEY=your_api_key node scripts/fetchStoreHoursFromPlacesAPI.js
 *   GOOGLE_PLACES_API_KEY=your_api_key node scripts/fetchStoreHoursFromPlacesAPI.js --store-code=APM
 *   GOOGLE_PLACES_API_KEY=your_api_key node scripts/fetchStoreHoursFromPlacesAPI.js --limit=5
 * 
 * Options:
 *   --store-code=CODE  Only fetch info for a specific store code
 *   --limit=N         Limit to first N stores (useful for testing)
 *   --delay=MS        Delay between API requests in milliseconds (default: 100)
 *   --force           Force update even if data already exists
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to delay execution
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats opening hours from Google Places API response
 */
function formatOpeningHours(periods) {
  if (!periods || periods.length === 0) {
    return null;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const formattedHours = [];
  
  for (const period of periods) {
    const day = period.open.day;
    const openTime = period.open.time;
    const closeTime = period.close ? period.close.time : null;
    
    const dayName = dayNames[day];
    const dayAbbrName = dayAbbr[day];
    
    // Format time (HHMM -> HH:MM AM/PM)
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const hours = parseInt(timeStr.substring(0, 2));
      const minutes = timeStr.substring(2, 4);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      return `${displayHours}:${minutes} ${period}`;
    };
    
    if (closeTime) {
      formattedHours.push(`${dayName} ${formatTime(openTime)} - ${formatTime(closeTime)}`);
    } else {
      formattedHours.push(`${dayName} ${formatTime(openTime)} - Open 24 hours`);
    }
  }
  
  return formattedHours.join('\n');
}

/**
 * Searches for a place using Google Places API Text Search
 */
async function searchPlace(apiKey, query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0]; // Return first result
    } else if (data.status === 'ZERO_RESULTS') {
      return null;
    } else {
      throw new Error(`Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    throw new Error(`Failed to search place: ${error.message}`);
  }
}

/**
 * Gets place details including opening hours, phone, and website using Google Places API
 */
async function getPlaceDetails(apiKey, placeId) {
  const fields = 'opening_hours,formatted_address,name,formatted_phone_number,international_phone_number,website';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      return data.result;
    } else {
      throw new Error(`Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
  } catch (error) {
    throw new Error(`Failed to get place details: ${error.message}`);
  }
}

/**
 * Fetches store information (hours, phone, website) for a single store
 */
async function fetchStoreInfo(apiKey, store, delay) {
  try {
    // Build search query
    const query = `${store.name} ${store.address}`;
    console.log(`\n🔍 Searching for: ${store.name} (${store.code})`);
    console.log(`   Query: ${query}`);
    
    // Search for the place
    const place = await searchPlace(apiKey, query);
    
    if (!place) {
      console.log(`   ⚠️  No results found`);
      return null;
    }
    
    console.log(`   ✅ Found: ${place.name}`);
    console.log(`   Place ID: ${place.place_id}`);
    
    // Get place details including opening hours, phone, and website
    const details = await getPlaceDetails(apiKey, place.place_id);
    
    const result = {
      hours: null,
      phone: null,
      website: null
    };
    
    // Extract hours
    if (details.opening_hours && details.opening_hours.periods) {
      const formattedHours = formatOpeningHours(details.opening_hours.periods);
      if (formattedHours) {
        result.hours = formattedHours;
        console.log(`   ✅ Hours found:`);
        console.log(`   ${formattedHours.split('\n').map(line => `      ${line}`).join('\n')}`);
      }
    } else if (details.opening_hours && details.opening_hours.weekday_text) {
      result.hours = details.opening_hours.weekday_text.join('\n');
      console.log(`   ✅ Hours found (weekday_text):`);
      console.log(`   ${result.hours.split('\n').map(line => `      ${line}`).join('\n')}`);
    } else {
      console.log(`   ⚠️  No opening hours available`);
    }
    
    // Extract phone number (prefer formatted, fallback to international)
    if (details.formatted_phone_number) {
      result.phone = details.formatted_phone_number;
      console.log(`   ✅ Phone: ${result.phone}`);
    } else if (details.international_phone_number) {
      result.phone = details.international_phone_number;
      console.log(`   ✅ Phone: ${result.phone}`);
    } else {
      console.log(`   ⚠️  No phone number available`);
    }
    
    // Extract website
    if (details.website) {
      result.website = details.website;
      console.log(`   ✅ Website: ${result.website}`);
    } else {
      console.log(`   ⚠️  No website available`);
    }
    
    // Return result if we got at least one piece of information
    if (result.hours || result.phone || result.website) {
      return result;
    }
    
    return null;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  } finally {
    // Rate limiting delay
    if (delay > 0) {
      await wait(delay);
    }
  }
}

/**
 * Main function
 */
async function main() {
  // Check for API key
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY environment variable is required');
    console.log('\n📋 Usage:');
    console.log('   GOOGLE_PLACES_API_KEY=your_api_key node scripts/fetchStoreHoursFromPlacesAPI.js');
    console.log('\n💡 To get an API key:');
    console.log('   1. Go to https://console.cloud.google.com/');
    console.log('   2. Create a new project or select existing one');
    console.log('   3. Enable "Places API"');
    console.log('   4. Create credentials (API Key)');
    console.log('   5. Restrict the API key to "Places API" for security');
    process.exit(1);
  }
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const storeCode = args.find(arg => arg.startsWith('--store-code='))?.split('=')[1];
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const delay = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '100');
  const force = args.includes('--force');
  
  console.log('🚀 Starting Google Places API data fetcher...');
  console.log(`   Fetching: hours, phone number, website`);
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`   Delay between requests: ${delay}ms`);
  if (storeCode) console.log(`   Filtering to store code: ${storeCode}`);
  if (limit) console.log(`   Limiting to first ${limit} stores`);
  if (force) console.log(`   Force update: enabled`);
  
  // Load the JSON file
  const jsonPath = path.join(__dirname, '../src/r1index-geocoded.json');
  console.log(`\n📂 Loading stores from: ${jsonPath}`);
  
  let stores;
  try {
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    stores = JSON.parse(jsonContent);
    console.log(`   ✅ Loaded ${stores.length} stores`);
  } catch (error) {
    console.error(`❌ Error reading JSON file: ${error.message}`);
    process.exit(1);
  }
  
  // Filter stores if needed
  let storesToProcess = stores;
  if (storeCode) {
    storesToProcess = stores.filter(s => s.code === storeCode);
    console.log(`   Filtered to ${storesToProcess.length} store(s) with code "${storeCode}"`);
  }
  if (limit) {
    storesToProcess = storesToProcess.slice(0, parseInt(limit));
    console.log(`   Limited to ${storesToProcess.length} store(s)`);
  }
  
  // Filter out stores that already have all data (unless force is enabled)
  if (!force) {
    storesToProcess = storesToProcess.filter(s => 
      !s.hours || s.hours.trim() === '' || 
      !s.phone || s.phone.trim() === '' || 
      !s.website || s.website.trim() === ''
    );
    console.log(`   Processing ${storesToProcess.length} store(s) missing data\n`);
  } else {
    console.log(`   Processing ${storesToProcess.length} store(s) (force update)\n`);
  }
  
  if (storesToProcess.length === 0) {
    console.log('✅ All stores already have complete data, nothing to do!');
    console.log('   Use --force to update existing data');
    return;
  }
  
  // Process each store
  let successCount = 0;
  let failCount = 0;
  let hoursCount = 0;
  let phoneCount = 0;
  let websiteCount = 0;
  
  for (let i = 0; i < storesToProcess.length; i++) {
    const store = storesToProcess[i];
    console.log(`\n[${i + 1}/${storesToProcess.length}] Processing: ${store.name}`);
    
    const storeInfo = await fetchStoreInfo(apiKey, store, delay);
    
    if (storeInfo) {
      // Update the store in the original array
      const storeIndex = stores.findIndex(s => s.code === store.code && s.name === store.name);
      if (storeIndex !== -1) {
        let updated = false;
        
        // Update hours if available and (force or not already set)
        if (storeInfo.hours && (force || !stores[storeIndex].hours || stores[storeIndex].hours.trim() === '')) {
          stores[storeIndex].hours = storeInfo.hours;
          hoursCount++;
          updated = true;
        }
        
        // Update phone if available and (force or not already set)
        if (storeInfo.phone && (force || !stores[storeIndex].phone || stores[storeIndex].phone.trim() === '')) {
          stores[storeIndex].phone = storeInfo.phone;
          phoneCount++;
          updated = true;
        }
        
        // Update website if available and (force or not already set)
        if (storeInfo.website && (force || !stores[storeIndex].website || stores[storeIndex].website.trim() === '')) {
          stores[storeIndex].website = storeInfo.website;
          websiteCount++;
          updated = true;
        }
        
        if (updated) {
          successCount++;
        }
      }
    } else {
      failCount++;
    }
    
    // Save progress after each store
    try {
      await fs.writeFile(jsonPath, JSON.stringify(stores, null, 2) + '\n', 'utf-8');
      console.log(`   💾 Progress saved`);
    } catch (error) {
      console.error(`   ⚠️  Error saving file: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Fetching complete!`);
  console.log(`   Stores updated: ${successCount}`);
  console.log(`   Hours added/updated: ${hoursCount}`);
  console.log(`   Phone numbers added/updated: ${phoneCount}`);
  console.log(`   Websites added/updated: ${websiteCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total processed: ${storesToProcess.length}`);
  console.log(`\n💡 Note: Make sure to set up billing in Google Cloud Console for Places API`);
  console.log(`   Free tier: $200 credit per month (covers ~40,000 requests)`);
}

// Run the script
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

