#!/usr/bin/env node

/**
 * Script to scrape store hours from Google Maps and append to r1index-geocoded.json
 * 
 * Usage: node scripts/scrapeStoreHours.js [--store-code=CODE] [--limit=N] [--delay=MS]
 * 
 * Options:
 *   --store-code=CODE  Only scrape hours for a specific store code
 *   --limit=N         Limit to first N stores (useful for testing)
 *   --delay=MS        Delay between requests in milliseconds (default: 2000)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to delay execution (replacement for page.waitForTimeout)
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Dynamic import for Puppeteer
async function setupPuppeteer() {
  let puppeteer;
  
  try {
    puppeteer = await import('puppeteer');
    return puppeteer.default;
  } catch (importError) {
    console.log('📦 Installing Puppeteer...');
    
    try {
      const { execSync } = await import('child_process');
      execSync('npm install puppeteer --save-dev', { 
        stdio: 'inherit',
        cwd: path.dirname(__dirname)
      });
      
      puppeteer = await import('puppeteer');
      return puppeteer.default;
    } catch (installError) {
      console.error('❌ Failed to install Puppeteer:', installError.message);
      console.log('📋 Please run: npm install puppeteer --save-dev');
      throw new Error('Puppeteer installation required');
    }
  }
}

/**
 * Builds Google Maps search URL for a store
 */
function buildGoogleMapsUrl(store) {
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Scrapes store hours from Google Maps page
 */
async function scrapeStoreHours(page, store) {
  try {
    const url = buildGoogleMapsUrl(store);
    console.log(`\n📍 Fetching hours for: ${store.name} (${store.code})`);
    console.log(`   URL: ${url}`);
    
    // Navigate to Google Maps
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for search results or place page to load using waitForSelector
    try {
      // Wait for either search results or place page content
      await Promise.race([
        page.waitForSelector('div[role="article"]', { timeout: 5000 }).catch(() => null),
        page.waitForSelector('[data-value="Hours"]', { timeout: 5000 }).catch(() => null),
        page.waitForSelector('.section-result', { timeout: 5000 }).catch(() => null),
        wait(5000) // Fallback timeout
      ]);
    } catch (e) {
      // Continue anyway
    }
    
    // Additional wait for dynamic content
    await wait(2000);
    
    // Try to extract hours directly from current page (works for both search results and place pages)
    let hours = null;
    
    // First, try to extract from current page without navigation
    try {
      hours = await page.evaluate(() => {
        // Look for hours in various locations
        const dayNames = [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
          'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
        ];
        
        // Strategy 1: Look for hours in the main content
        const allText = document.body.innerText || document.body.textContent || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
        
        const hoursLines = [];
        for (const line of lines) {
          const hasDay = dayNames.some(day => line.includes(day));
          const hasTime = line.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)/) || 
                         line.match(/\d{1,2}\s*(AM|PM|am|pm)/) ||
                         line.match(/Closed|Open|24\s*hours/i);
          
          if (hasDay && hasTime && line.length < 100) {
            hoursLines.push(line);
          }
        }
        
        if (hoursLines.length >= 3) {
          return hoursLines.slice(0, 7).join('\n');
        }
        
        // Strategy 2: Look for hours button and try to get text near it
        const hoursButton = Array.from(document.querySelectorAll('button, [role="button"], div')).find(el => {
          const text = (el.textContent || el.innerText || '').toLowerCase();
          return text.includes('hours') || text.includes('营业时间');
        });
        
        if (hoursButton) {
          // Get parent or sibling elements that might contain hours
          let container = hoursButton.parentElement;
          for (let i = 0; i < 3 && container; i++) {
            const containerText = container.innerText || container.textContent || '';
            const containerLines = containerText.split('\n').map(l => l.trim()).filter(l => l);
            const foundHours = containerLines.filter(line => {
              const hasDay = dayNames.some(day => line.includes(day));
              const hasTime = line.match(/\d{1,2}:\d{2}/) || line.match(/Closed|Open/i);
              return hasDay && hasTime;
            });
            
            if (foundHours.length >= 3) {
              return foundHours.slice(0, 7).join('\n');
            }
            container = container.parentElement;
          }
        }
        
        return null;
      });
    } catch (evaluateError) {
      console.log(`   ⚠️  Error extracting hours: ${evaluateError.message}`);
      // Try simplified retry
      await wait(2000);
      try {
        hours = await page.evaluate(() => {
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
          const hoursLines = lines.filter(line => {
            const hasDay = dayNames.some(day => line.includes(day));
            const hasTime = line.match(/\d{1,2}:\d{2}/) || line.match(/Closed|Open/i);
            return hasDay && hasTime;
          });
          return hoursLines.length >= 3 ? hoursLines.slice(0, 7).join('\n') : null;
        });
      } catch (retryError) {
        console.log(`   ⚠️  Retry also failed: ${retryError.message}`);
      }
    }
    
    // If we still didn't find hours, try clicking on "Hours" button
    if (!hours) {
      try {
        // Find and click hours button directly in evaluate to avoid detached frame issues
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const hoursButton = buttons.find(btn => {
            const text = (btn.textContent || btn.innerText || '').toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            return text.includes('hours') || ariaLabel.includes('hours');
          });
          
          if (hoursButton) {
            try {
              hoursButton.click();
              return true;
            } catch (e) {
              return false;
            }
          }
          return false;
        });
        
        if (clicked) {
          await wait(2000);
          
          // Try extracting again after clicking
          try {
            hours = await page.evaluate(() => {
              const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l);
              const hoursLines = lines.filter(line => {
                const hasDay = dayNames.some(day => line.includes(day));
                const hasTime = line.match(/\d{1,2}:\d{2}/) || line.match(/Closed|Open/i);
                return hasDay && hasTime;
              });
              return hoursLines.length >= 3 ? hoursLines.slice(0, 7).join('\n') : null;
            });
          } catch (evalError) {
            console.log(`   ⚠️  Error extracting after clicking hours button: ${evalError.message}`);
          }
        }
      } catch (e) {
        console.log(`   ⚠️  Could not click hours button: ${e.message}`);
      }
    }
    
    if (hours && hours.trim().length > 0) {
      // Clean up the hours text
      hours = hours
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      console.log(`   ✅ Found hours: ${hours.substring(0, 150)}${hours.length > 150 ? '...' : ''}`);
      return hours;
    } else {
      console.log(`   ⚠️  Could not find hours for this store`);
      return null;
    }
    
  } catch (error) {
    console.error(`   ❌ Error scraping hours for ${store.name}: ${error.message}`);
    return null;
  }
}

/**
 * Main function to scrape hours for all stores
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const storeCode = args.find(arg => arg.startsWith('--store-code='))?.split('=')[1];
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const delay = parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '2000');
  
  console.log('🚀 Starting store hours scraper...');
  console.log(`   Delay between requests: ${delay}ms`);
  if (storeCode) console.log(`   Filtering to store code: ${storeCode}`);
  if (limit) console.log(`   Limiting to first ${limit} stores`);
  
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
  
  // Filter out stores that already have hours
  storesToProcess = storesToProcess.filter(s => !s.hours || s.hours.trim() === '');
  console.log(`   Processing ${storesToProcess.length} store(s) without hours\n`);
  
  if (storesToProcess.length === 0) {
    console.log('✅ All stores already have hours, nothing to do!');
    return;
  }
  
  // Setup Puppeteer
  const puppeteer = await setupPuppeteer();
  
  let browser;
  try {
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    // Process each store
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < storesToProcess.length; i++) {
      const store = storesToProcess[i];
      console.log(`\n[${i + 1}/${storesToProcess.length}] Processing: ${store.name}`);
      
      const hours = await scrapeStoreHours(page, store);
      
      if (hours) {
        // Update the store in the original array
        const storeIndex = stores.findIndex(s => s.code === store.code && s.name === store.name);
        if (storeIndex !== -1) {
          stores[storeIndex].hours = hours;
          successCount++;
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
      
      // Delay between requests to avoid being blocked
      if (i < storesToProcess.length - 1) {
        console.log(`   ⏳ Waiting ${delay}ms before next request...`);
        await wait(delay);
      }
    }
    
    console.log(`\n✅ Scraping complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Total: ${storesToProcess.length}`);
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed');
    }
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

