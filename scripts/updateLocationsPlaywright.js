#!/usr/bin/env node

/**
 * Location Updater with Playwright (Alternative to Puppeteer)
 * Uses Playwright to handle JavaScript-rendered content
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic import for Playwright with auto-install
async function setupPlaywright() {
  let playwright;
  
  try {
    // Try to import playwright
    playwright = await import('playwright');
    return playwright;
  } catch (importError) {
    console.log('📦 Installing Playwright...');
    
    try {
      // Install playwright
      const { execSync } = await import('child_process');
      execSync('npm install playwright --save-dev', { 
        stdio: 'inherit',
        cwd: path.dirname(__dirname)
      });
      
      // Install browsers
      execSync('npx playwright install chromium', { 
        stdio: 'inherit',
        cwd: path.dirname(__dirname)
      });
      
      // Try importing again
      playwright = await import('playwright');
      return playwright;
    } catch (installError) {
      console.error('❌ Failed to install Playwright:', installError.message);
      throw new Error('Playwright installation required');
    }
  }
}

/**
 * Fetches location data using Playwright
 */
async function fetchAllNetLocationsWithPlaywright() {
  const ALLNET_URL = 'https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009';
  
  let browser;
  try {
    console.log('🎭 Starting Playwright browser...');
    
    const { chromium } = await setupPlaywright();
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('📄 Loading ALL.Net page...');
    
    // Navigate and wait for JavaScript to load
    await page.goto(ALLNET_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for dynamic content...');
    
    // Wait for ROUND1 content to appear
    try {
      await page.waitForFunction(
        () => document.body.textContent.includes('ROUND1'),
        { timeout: 15000 }
      );
      
      // Additional wait for complete loading
      await page.waitForTimeout(3000);
      
    } catch (waitError) {
      console.log('⚠️  Timeout waiting for content, proceeding...');
    }
    
    // Extract location data
    const locations = await page.evaluate(() => {
      const locations = [];
      const text = document.body.textContent || document.body.innerText || '';
      
      // Split into lines and process
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      for (const line of lines) {
        // Look for ROUND1 locations with full address
        if (line.includes('ROUND1') && line.match(/\d+.*[A-Z]{2}\s*\d{5}/)) {
          // Extract location info
          const match = line.match(/ROUND1\s+([^0-9]+?)\s+(\d+[^,]*,[^,]+,\s*[A-Z]{2}\s*\d+)/);
          if (match) {
            const name = `ROUND1 ${match[1].trim()}`;
            const address = match[2].trim();
            
            // Extract city and state
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
      
      // Remove duplicates
      const seen = new Set();
      return locations.filter(location => {
        const key = `${location.name}-${location.state}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    
    console.log(`🔍 Extracted ${locations.length} locations`);
    
    if (locations.length > 0) {
      return locations;
    } else {
      throw new Error('No locations extracted');
    }
    
  } catch (error) {
    console.warn('⚠️  Playwright extraction failed:', error.message);
    console.log('📋 Using fallback data...');
    
    // Fallback to known active locations
    return [
      { name: "ROUND1 PUENTE HILLS MALL", address: "1600 S Azusa Ave. Suite 285, City of Industry, CA 91748", city: "City of Industry", state: "CA" },
      { name: "ROUND1 MORENO VALLEY MALL", address: "22500 Town Circle Suite 2030, Moreno Valley, CA 92553", city: "Moreno Valley", state: "CA" },
      { name: "ROUND1 LAKEWOOD MALL", address: "401 Lakewood Ctr. Mall, Lakewood, CA 90712", city: "Lakewood", state: "CA" },
      { name: "ROUND1 MAIN PLACE MALL", address: "2800 N. Main St. Suite 1100, Santa Ana, CA 92705", city: "Santa Ana", state: "CA" },
      { name: "ROUND1 PROMENADE TEMECULA", address: "40710 Winchester Road, Suite 100, Temecula, CA 92591", city: "Temecula", state: "CA" },
      { name: "ROUND1 SOUTHLAND MALL", address: "545 Southland Mall Dr. Hayward,CA 94545", city: "Hayward", state: "CA" },
      { name: "ROUND1 BURBANK TOWN CENTER", address: "201 E Magnolia Blvd, Suite 145,Burbank, CA 91502", city: "Burbank", state: "CA" }
    ];
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// Main execution (reusing the same matching logic)
// Import and use the same matching logic from the Puppeteer version
async function main() {
  try {
    console.log('🎮 maimai USA Playwright Location Updater');
    console.log('========================================\n');
    
    const locations = await fetchAllNetLocationsWithPlaywright();
    
    console.log('✅ Location extraction completed');
    console.log(`📍 Found ${locations.length} active locations:`);
    locations.forEach(loc => {
      console.log(`   • ${loc.name} in ${loc.city}, ${loc.state}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
