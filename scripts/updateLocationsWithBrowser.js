#!/usr/bin/env node

/**
 * Enhanced Location Updater with Browser Automation
 * Uses Puppeteer to load JavaScript-rendered content from ALL.Net website
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for Puppeteer with auto-install
async function setupPuppeteer() {
  let puppeteer;
  
  try {
    // Try to import puppeteer
    puppeteer = await import('puppeteer');
    return puppeteer.default;
  } catch (importError) {
    console.log('📦 Installing Puppeteer...');
    
    try {
      // Install puppeteer
      const { execSync } = await import('child_process');
      execSync('npm install puppeteer --save-dev', { 
        stdio: 'inherit',
        cwd: path.dirname(__dirname)
      });
      
      // Try importing again
      puppeteer = await import('puppeteer');
      return puppeteer.default;
    } catch (installError) {
      console.error('❌ Failed to install Puppeteer:', installError.message);
      console.log('📋 Falling back to manual installation instructions...');
      console.log('Run: npm install puppeteer --save-dev');
      throw new Error('Puppeteer installation required');
    }
  }
}

/**
 * Fetches location data using a real browser to execute JavaScript
 */
async function fetchAllNetLocationsWithBrowser() {
  const ALLNET_URL = 'https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009';
  
  let browser;
  try {
    console.log('🌐 Starting browser to fetch location data...');
    
    const puppeteer = await setupPuppeteer();
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Important for some servers
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📄 Loading ALL.Net page...');
    
    // Navigate to the page
    await page.goto(ALLNET_URL, {
      waitUntil: 'networkidle2', // Wait until network is idle
      timeout: 30000
    });
    
    console.log('⏳ Waiting for content to load...');
    
    // Wait for location content to appear (multiple strategies)
    try {
      // Strategy 1: Wait for specific text content
      await page.waitForFunction(
        () => document.body.textContent.includes('ROUND1'),
        { timeout: 15000 }
      );
      
      console.log('✅ ROUND1 content found, checking for all locations...');
      
      // Strategy 2: Wait for the full location list and check count
      await page.waitForTimeout(5000);
      
      // Check if we have the expected 8 locations
      const locationCount = await page.evaluate(() => {
        const text = document.body.textContent || document.body.innerText || '';
        const match = text.match(/（(\d+)\s+locations?）/);
        return match ? parseInt(match[1]) : 0;
      });
      
      console.log(`📊 Page shows: ${locationCount} locations`);
      
      if (locationCount === 8) {
        console.log('✅ Expected 8 locations found on page');
      } else if (locationCount > 0) {
        console.log(`⚠️  Expected 8 locations, but page shows ${locationCount}`);
      } else {
        console.log('⚠️  Could not detect location count from page');
      }
      
      console.log('✅ Content loaded, extracting location data...');
      
    } catch (waitError) {
      console.log('⚠️  Timeout waiting for ROUND1 content, proceeding anyway...');
    }
    
    // Extract location data using targeted parsing for the specific ALL.Net structure
    const locations = await page.evaluate(() => {
      const locations = [];
      
      // Get the full page text
      const fullText = document.body.textContent || document.body.innerText || '';
      
      // Look for the pattern: "[NAME]\n[ADDRESS]\nGoogleMap..."
      const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
      
      // Debug: Show some lines for context
      console.log(`Parsing ${lines.length} lines of text...`);
      
      for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i];
        const nextLine = lines[i + 1];
        
        // Heuristic for a location entry:
        // - The current line is the name (not an address, not "GoogleMap", not a number)
        // - The next line looks like an address (contains numbers and a ZIP code)
        const isProbablyName = !/^\d/.test(currentLine) && !currentLine.includes('GoogleMap') && !/\d{5}/.test(currentLine) && currentLine.length > 3;
        const isProbablyAddress = /\d/.test(nextLine) && /,/.test(nextLine) && /\d{5}/.test(nextLine);
        
        if (isProbablyName && isProbablyAddress) {
          console.log(`Potential Match Found:`);
          console.log(`  Name: ${currentLine}`);
          console.log(`  Address: ${nextLine}`);
          
          const addressMatch = nextLine.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
          if (addressMatch) {
            locations.push({
              name: currentLine.trim(),
              address: nextLine.trim(),
              city: addressMatch[1].trim(),
              state: addressMatch[2].trim(),
            });
            console.log(`  --> Extracted: ${currentLine.trim()} in ${addressMatch[1].trim()}, ${addressMatch[2].trim()}`);
            
            // Skip the next line since it's been processed as an address
            i++;
          }
        }
      }
      
      // If the primary strategy failed, try to find ROUND1 locations as a fallback
      if (locations.length === 0) {
        console.log('Primary strategy failed, falling back to ROUND1-specific search...');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('ROUND1')) {
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              if (/\d+.*,.*\d{5}/.test(nextLine)) {
                const addressMatch = nextLine.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
                if (addressMatch) {
                  locations.push({
                    name: line.trim(),
                    address: nextLine.trim(),
                    city: addressMatch[1].trim(),
                    state: addressMatch[2].trim()
                  });
                }
                i++; // Skip address line
              }
            }
          }
        }
      }
      
      // Remove duplicates
      const seen = new Set();
      const uniqueLocations = locations.filter(location => {
        const key = `${location.name}-${location.state}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      console.log(`Final extraction result: ${uniqueLocations.length} locations found`);
      uniqueLocations.forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.name} - ${loc.city}, ${loc.state}`);
      });
      
      // If we didn't find any locations, save the page content for debugging
      if (uniqueLocations.length === 0) {
        console.log(`⚠️  No locations found.`);
        console.log(`💾 Saving page content for manual inspection...`);
        
        // Return the full page content along with locations for debugging
        return {
          locations: uniqueLocations,
          debugInfo: {
            fullText: fullText.substring(0, 5000), // First 5000 chars
          }
        };
      }
      
      return uniqueLocations;
    });
    
    // Handle debug info response
    let actualLocations = locations;
    if (locations && locations.locations) {
      // We got debug info
      actualLocations = locations.locations;
      console.log('\n🔍 DEBUG INFO:');
      console.log(`Full text preview: ${locations.debugInfo.fullText.substring(0, 500)}...`);
      
      if (locations.debugInfo.fullText.length > 500) {
        console.log('...');
      }
      
      // Save to file for manual inspection
      const fs = await import('fs/promises');
      const debugFile = path.join(__dirname, 'debug-browser-content.txt');
      await fs.writeFile(debugFile, JSON.stringify(locations.debugInfo, null, 2));
      console.log(`💾 Debug info saved to: ${debugFile}`);
    }
    
    console.log(`🔍 Extracted ${actualLocations.length} locations from webpage`);
    
    if (actualLocations.length > 0) {
      actualLocations.forEach(loc => {
        console.log(`   • ${loc.name} in ${loc.city}, ${loc.state}`);
      });
      return actualLocations;
    } else {
      throw new Error('No locations found in page content');
    }
    
  } catch (error) {
    console.error('❌ Browser extraction failed:', error.message);
    
    // Instead of using outdated fallback data, try alternative approaches
    console.log('🔄 Trying alternative extraction methods...');
    
    try {
      // Try simple fetch as fallback
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(ALLNET_URL);
      const html = await response.text();
      
      console.log('📄 Attempting to parse raw HTML...');
      const locations = parseAllNetHTML(html);
      
      if (locations.length > 0) {
        console.log(`✅ HTML parsing recovered ${locations.length} locations`);
        return locations;
      }
    } catch (fetchError) {
      console.warn('⚠️  Alternative fetch method also failed:', fetchError.message);
    }
    
    // As a final fallback, return empty array to force manual investigation
    console.error('❌ All extraction methods failed.');
    console.log('💡 Manual action required:');
    console.log('   1. Check if the website is accessible');
    console.log('   2. Verify the website structure hasn\'t changed');
    console.log('   3. Update parsing patterns if needed');
    console.log('   4. Consider using the debug script: npm run debug-website');
    
    throw new Error('Unable to extract locations from ALL.Net website. Manual investigation required.');
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

/**
 * Alternative: Try to find API endpoints or structured data
 */
async function tryFindAPIEndpoints() {
  console.log('🔍 Checking for API endpoints...');
  
  let browser;
  try {
    const puppeteer = await setupPuppeteer();
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Listen to network requests to find API calls
    const apiCalls = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('api') || url.includes('json') || url.includes('xml')) {
        apiCalls.push({
          url: url,
          status: response.status(),
          contentType: response.headers()['content-type'] || ''
        });
      }
    });
    
    await page.goto('https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009', {
      waitUntil: 'networkidle2',
      timeout: 20000
    });
    
    // Wait for any additional requests
    await page.waitForTimeout(5000);
    
    if (apiCalls.length > 0) {
      console.log('📡 Found potential API endpoints:');
      apiCalls.forEach(call => {
        console.log(`   • ${call.url} (${call.status}) - ${call.contentType}`);
      });
    } else {
      console.log('ℹ️  No API endpoints detected');
    }
    
    return apiCalls;
  } catch (error) {
    console.log('⚠️  API detection failed:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Enhanced HTML parser for ALL.Net website structure
 * Based on the known format: "ROUND1 [NAME] [ADDRESS] GoogleMapで見る Details"
 */
function parseAllNetHTML(html) {
  const locations = [];
  
  console.log('🔍 Parsing HTML content...');
  console.log(`   HTML length: ${html.length} characters`);
  console.log(`   Contains ROUND1: ${html.includes('ROUND1')}`);
  
  // Remove HTML tags and get clean text
  const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Multiple parsing strategies
  
  // Strategy 1: Look for the exact pattern in the web search results
  // "* ROUND1 NAME ADDRESS GoogleMapで見る Details"
  for (const line of lines) {
    if (line.includes('ROUND1') && line.includes('GoogleMapで見る Details')) {
      console.log('Found potential location:', line.substring(0, 100));
      
      // Pattern: "ROUND1 NAME ADDRESS GoogleMapで見る Details"
      const match = line.match(/ROUND1\s+([A-Z\s]+)\s+(\d+[^G]+?)(?:GoogleMapで見る Details)/);
      
      if (match) {
        let name = `ROUND1 ${match[1].trim()}`;
        let address = match[2].trim();
        
        // Extract city and state using multiple patterns
        let city, state;
        
        // Pattern 1: Standard "street, city, state zip" or "street, city, statezip" (no space)
        let addressMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
        if (addressMatch) {
          city = addressMatch[1].trim();
          state = addressMatch[2].trim();
        }
        
        // Pattern 2: Handle "Dr. Hayward,CA" format (dot before city, no space between city/state)
        if (!city) {
          addressMatch = address.match(/\.\s*([A-Za-z\s]+),([A-Z]{2})\s*(\d{5})/);
          if (addressMatch) {
            city = addressMatch[1].trim();
            state = addressMatch[2].trim();
          }
        }
        
        // Pattern 3: General "street, city,state zip" (no space between city and state)
        if (!city) {
          addressMatch = address.match(/,\s*([^,]+?),([A-Z]{2})\s*(\d{5})/);
          if (addressMatch) {
            city = addressMatch[1].trim();
            state = addressMatch[2].trim();
          }
        }
        
        if (city && state) {
          locations.push({
            name: name,
            address: address,
            city: city,
            state: state
          });
          
          console.log(`✅ Parsed: ${name} in ${city}, ${state}`);
        }
      }
    }
  }
  
  // Strategy 2: Look for alternative patterns
  if (locations.length === 0) {
    console.log('Strategy 1 failed, trying alternative patterns...');
    
    for (const line of lines) {
      if (line.includes('ROUND1') && /\d{5}/.test(line)) { // Contains zip code
        console.log('Alternative pattern:', line.substring(0, 100));
        
        // Try different regex patterns, including handling addresses without spaces
        const patterns = [
          /ROUND1\s+([^0-9]+?)\s+(\d+[^,]+,\s*[^,]+,\s*[A-Z]{2}\s*,?\s*\d{5})/,
          /ROUND1\s+([^0-9]+?)\s+(\d+[^,]+,\s*[^,]+,\s*[A-Z]{2}\s*\d{5})/,
          /ROUND1\s+([^0-9]+?)\s+(\d+[^,]+,\s*[^,]+,\s*[A-Z]{2}\d{5})/,
          /ROUND1\s+(.+?)\s+(\d+.*?[A-Z]{2}\s*\d{5})/,
          // Handle "Hayward,CA" format (no space between city and state)
          /ROUND1\s+([^0-9]+?)\s+(\d+[^,]+,\s*[^,]+[A-Z]{2}\s*\d{5})/
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            let name = match[1].trim();
            let address = match[2].trim();
            
            // Clean up name
            if (!name.startsWith('ROUND1')) {
              name = `ROUND1 ${name}`;
            }
            
            // Extract city and state using multiple patterns (same as Strategy 1)
            let city, state;
            
            // Pattern 1: Standard "street, city, state zip" or "street, city, statezip" (no space)
            let addressMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
            if (addressMatch) {
              city = addressMatch[1].trim();
              state = addressMatch[2].trim();
            }
            
            // Pattern 2: Handle "Dr. Hayward,CA" format (dot before city, no space between city/state)
            if (!city) {
              addressMatch = address.match(/\.\s*([A-Za-z\s]+),([A-Z]{2})\s*(\d{5})/);
              if (addressMatch) {
                city = addressMatch[1].trim();
                state = addressMatch[2].trim();
              }
            }
            
            // Pattern 3: General "street, city,state zip" (no space between city and state)
            if (!city) {
              addressMatch = address.match(/,\s*([^,]+?),([A-Z]{2})\s*(\d{5})/);
              if (addressMatch) {
                city = addressMatch[1].trim();
                state = addressMatch[2].trim();
              }
            }
            
            if (city && state) {
              locations.push({
                name: name,
                address: address,
                city: city,
                state: state
              });
              
              console.log(`✅ Alt parsed: ${name} in ${city}, ${state}`);
            }
          }
        }
      }
    }
  }
  
  // Strategy 3: Extract from structured content (looking for the list format)
  if (locations.length === 0) {
    console.log('Both strategies failed, looking for structured content...');
    
    // Look for the section that says "（8 locations）" or similar
    const locationCountMatch = html.match(/（(\d+)\s+locations?）/);
    if (locationCountMatch) {
      const expectedCount = parseInt(locationCountMatch[1]);
      console.log(`Expected ${expectedCount} locations according to website`);
    }
    
    // Try to find the list section
    const lines = html.split('\n');
    let inLocationList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for start of location list
      if (line.includes('locations）') || (line.includes('ROUND1') && inLocationList)) {
        inLocationList = true;
      }
      
      if (inLocationList && line.includes('ROUND1')) {
        // Parse individual location lines
        const match = line.match(/ROUND1\s+([^0-9]+?)\s+(\d+.+?)(?:GoogleMap|Details|$)/);
        if (match) {
          let name = match[1].trim();
          let address = match[2].trim();
          
          if (!name.startsWith('ROUND1')) {
            name = `ROUND1 ${name}`;
          }
          
          // Clean up address
          address = address.replace(/GoogleMapで見る\s*Details?/g, '').trim();
          
          // Extract city and state using multiple patterns (same as other strategies)
          let city, state;
          
          // Pattern 1: Standard "street, city, state zip" or "street, city, statezip" (no space)
          let addressMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})/);
          if (addressMatch) {
            city = addressMatch[1].trim();
            state = addressMatch[2].trim();
          }
          
          // Pattern 2: Handle "Dr. Hayward,CA" format (dot before city, no space between city/state)
          if (!city) {
            addressMatch = address.match(/\.\s*([A-Za-z\s]+),([A-Z]{2})\s*(\d{5})/);
            if (addressMatch) {
              city = addressMatch[1].trim();
              state = addressMatch[2].trim();
            }
          }
          
          // Pattern 3: General "street, city,state zip" (no space between city and state)
          if (!city) {
            addressMatch = address.match(/,\s*([^,]+?),([A-Z]{2})\s*(\d{5})/);
            if (addressMatch) {
              city = addressMatch[1].trim();
              state = addressMatch[2].trim();
            }
          }
          
          if (city && state) {
            locations.push({
              name: name,
              address: address,
              city: city,
              state: state
            });
          }
        }
      }
      
      // Stop if we hit the end of the list
      if (inLocationList && (line.includes('▲') || line.includes('Back') || line.includes('Note:'))) {
        break;
      }
    }
  }
  
  // Remove duplicates
  const seen = new Set();
  const uniqueLocations = locations.filter(location => {
    const key = `${location.name}-${location.state}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`✅ HTML parsing result: ${uniqueLocations.length} unique locations found`);
  
  if (uniqueLocations.length === 0) {
    console.warn('⚠️  No locations found in HTML content');
    console.log('💡 This may indicate:');
    console.log('   - Website structure has changed');
    console.log('   - Content is loaded via JavaScript');
    console.log('   - Anti-bot protection is active');
  }
  
  return uniqueLocations;
}

// Re-use the matching and updating logic from the original script
function normalizeLocationName(name) {
  return name
    .replace(/^ROUND1\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

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
 * Generates a unique 3-letter code for a new location.
 * Tries to use the first letter of the first three words of the name.
 * Handles collisions by appending a number.
 * @param {string} name - The name of the location.
 * @param {string[]} existingCodes - An array of existing location codes.
 * @returns {string} A unique 3-letter (or more) code.
 */
function generateLocationCode(name, existingCodes) {
  // Sanitize name by removing common terms like "Round1" or "Arcade"
  const sanitizedName = name
    .toLowerCase()
    .replace(/round1|arcade|entertainment|center|mall|bowl/g, '')
    .trim();
  
  const words = sanitizedName.split(/\s+/).filter(Boolean);
  let baseCode = (words.map(w => w[0]).join('') || 'NLC').substring(0, 3).toUpperCase();
  
  let finalCode = baseCode;
  let counter = 1;
  
  // Ensure the generated code is unique
  while (existingCodes.includes(finalCode)) {
    // If base code is 3 letters, shorten to 2 to make space for a number
    if (baseCode.length > 2) {
      baseCode = baseCode.substring(0, 2);
    }
    finalCode = `${baseCode}${counter}`;
    counter++;
  }
  
  return finalCode;
}

function matchLocations(allNetLocations, jsonLocations) {
  const activeMatches = new Set();
  const newFoundLocations = [];
  const matchedJsonCodes = new Set(); // Track which existing locations have been matched

  for (const allNetLocation of allNetLocations) {
    let matchedLocation = null;

    const zipMatch = allNetLocation.address.match(/\b(\d{5})$/);
    const scrapedZip = zipMatch ? zipMatch[1] : null;

    // Strategy 1: Match by ZIP code if available and not already matched
    if (scrapedZip) {
      const potentialMatches = jsonLocations.filter(loc => loc.address.includes(scrapedZip) && !matchedJsonCodes.has(loc.code));
      if (potentialMatches.length === 1) {
        matchedLocation = potentialMatches[0];
        console.log(`✅ Matched by ZIP ${scrapedZip}: ${allNetLocation.name} -> ${matchedLocation.name} (${matchedLocation.code})`);
      }
    }

    // Strategy 2: Match by name if ZIP fails or is ambiguous
    if (!matchedLocation) {
      const normalizedScrapedName = normalizeLocationName(allNetLocation.name);
      const potentialMatches = jsonLocations.filter(loc => {
        if (matchedJsonCodes.has(loc.code)) return false;
        const normalizedJsonName = normalizeLocationName(loc.name);
        return normalizedJsonName.includes(normalizedScrapedName) || normalizedScrapedName.includes(normalizedJsonName);
      });
      if (potentialMatches.length === 1) {
        matchedLocation = potentialMatches[0];
        console.log(`✅ Matched by NAME: ${allNetLocation.name} -> ${matchedLocation.name} (${matchedLocation.code})`);
      }
    }
    
    if (matchedLocation) {
      activeMatches.add(matchedLocation.code);
      matchedJsonCodes.add(matchedLocation.code);
    } else {
      console.log(`✨ New location found: ${allNetLocation.name}`);
      newFoundLocations.push(allNetLocation);
    }
  }
  
  return { activeLocationCodes: activeMatches, newLocations: newFoundLocations };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🎮 maimai USA Enhanced Location Data Updater');
    console.log('=============================================\n');
    
    // Read current JSON data
    const jsonPath = path.join(__dirname, '../src/r1index-geocoded.json');
    console.log('📂 Reading current location data...');
    
    const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    console.log(`📍 Loaded ${jsonData.length} locations from JSON file\n`);
    
    // Try to find API endpoints first
    await tryFindAPIEndpoints();
    
    // Fetch latest data from ALL.Net using browser
    console.log('🌐 Fetching latest location data with browser automation...');
    const allNetLocations = await fetchAllNetLocationsWithBrowser();
    console.log(`📍 Found ${allNetLocations.length} active locations\n`);
    
    // Match locations and identify new ones
    console.log('🔍 Matching locations...');
    const { activeLocationCodes, newLocations } = matchLocations(allNetLocations, jsonData);
    console.log(`\n🎯 Successfully matched ${activeLocationCodes.size} existing locations`);
    if (newLocations.length > 0) {
      console.log(`✨ Found ${newLocations.length} new locations:\n`);
      newLocations.forEach(loc => console.log(`   • ${loc.name} - ${loc.address}`));
    }
    console.log('');

    // Add new locations to the dataset
    const existingCodes = jsonData.map(loc => loc.code);
    newLocations.forEach(newLoc => {
      const newCode = generateLocationCode(newLoc.name, existingCodes.concat(jsonData.map(l => l.code)));
      
      jsonData.push({
        code: newCode,
        name: newLoc.name,
        city: newLoc.city,
        state: newLoc.state,
        address: newLoc.address,
        cab_count: 1, // Default to 1, can be adjusted manually
        index: `new_${newCode.toLowerCase()}`,
        lat: null,
        lng: null,
        geocoded: false,
        geocoded_address: null,
        active: true
      });
      
      // Add the new code to the active list
      activeLocationCodes.add(newCode);
      console.log(`➕ Added new location: ${newLoc.name} with code ${newCode}`);
    });
    
    let totalActivated = 0;

    const updatedData = jsonData.map(location => {
      const originalActiveState = location.active;
      const shouldBeActive = activeLocationCodes.has(location.code);

      // A location, once active, should never be deactivated.
      const newActiveState = originalActiveState || shouldBeActive;

      if (!originalActiveState && newActiveState) {
        totalActivated++;
        console.log(`🟢 Activated: ${location.name} (${location.code})`);
      }

      return {
        ...location,
        active: newActiveState,
      };
    });
    
    // Count changes
    const changes = {
      activated: totalActivated,
      deactivated: 0,
      added: newLocations.length,
      unchanged: jsonData.length - totalActivated - newLocations.length
    };
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   • Added: ${changes.added} locations`);
    console.log(`   • Activated: ${changes.activated} locations`);
    console.log(`   • Deactivated: ${changes.deactivated} locations`);
    console.log(`   • Unchanged: ${changes.unchanged} locations`);
    console.log(`   • Total active: ${activeLocationCodes.size} locations\n`);
    
    // Write updated data back to file
    if (changes.activated > 0 || changes.added > 0) {
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
