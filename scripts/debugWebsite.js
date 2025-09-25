#!/usr/bin/env node

/**
 * Debug tool to inspect the ALL.Net website structure
 * Helps understand why location extraction is failing
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugWebsite() {
  let browser;
  let puppeteer;
  
  try {
    // Import puppeteer
    puppeteer = await import('puppeteer');
    
    console.log('🔍 Debug Tool: ALL.Net Website Structure');
    console.log('======================================\n');
    
    // Launch browser with visible window for debugging
    browser = await puppeteer.default.launch({
      headless: false, // Show browser window
      devtools: true,  // Open dev tools
      slowMo: 1000,   // Slow down operations
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('📄 Loading ALL.Net page...');
    
    const ALLNET_URL = 'https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009';
    
    // Navigate to page
    await page.goto(ALLNET_URL, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('⏳ Page loaded, analyzing content...\n');
    
    // Get page title
    const title = await page.title();
    console.log('📝 Page Title:', title);
    
    // Check for any text content containing "ROUND1"
    const hasRound1Text = await page.evaluate(() => {
      return document.body.textContent.includes('ROUND1') || 
             document.body.textContent.includes('Round1') ||
             document.body.innerText.includes('ROUND1') ||
             document.body.innerText.includes('Round1');
    });
    
    console.log('🎯 Contains ROUND1 text:', hasRound1Text);
    
    // Get all text content
    const allText = await page.evaluate(() => {
      return document.body.textContent || document.body.innerText || '';
    });
    
    // Look for any location-related keywords
    const locationKeywords = ['mall', 'center', 'plaza', 'CA ', 'TX ', 'NY ', 'FL ', 'location', 'store'];
    const foundKeywords = locationKeywords.filter(keyword => 
      allText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log('🗝️ Found location keywords:', foundKeywords);
    
    // Check for specific elements that might contain location data
    const locationElements = await page.evaluate(() => {
      const results = [];
      
      // Check for common selectors
      const selectors = [
        'div', 'span', 'p', 'li', 'td', 'th',
        '.location', '.store', '.mall', '.center',
        '#locations', '#stores', '#results'
      ];
      
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent || element.innerText || '';
            if (text.includes('ROUND1') || text.includes('Round1')) {
              results.push({
                selector: selector,
                text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                tagName: element.tagName,
                className: element.className || '',
                id: element.id || ''
              });
            }
          }
        } catch (e) {
          // Skip invalid selectors
        }
      }
      
      return results;
    });
    
    console.log('\n🎯 Elements containing ROUND1:');
    if (locationElements.length > 0) {
      locationElements.forEach((el, i) => {
        console.log(`\n${i + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className : ''}`);
        console.log(`   Text: ${el.text}`);
      });
    } else {
      console.log('   No elements found containing ROUND1');
    }
    
    // Check if content is loaded dynamically
    console.log('\n⏳ Waiting 5 seconds for dynamic content...');
    await page.waitForTimeout(5000);
    
    // Check again after waiting
    const newText = await page.evaluate(() => {
      return document.body.textContent || document.body.innerText || '';
    });
    
    const textChanged = newText !== allText;
    console.log('🔄 Content changed after waiting:', textChanged);
    
    if (textChanged) {
      const newHasRound1 = newText.includes('ROUND1') || newText.includes('Round1');
      console.log('🎯 Now contains ROUND1 text:', newHasRound1);
    }
    
    // Save page content for manual inspection
    const html = await page.content();
    const fs = await import('fs/promises');
    const debugFile = path.join(__dirname, 'debug-allnet-page.html');
    await fs.writeFile(debugFile, html);
    console.log(`\n💾 Page HTML saved to: ${debugFile}`);
    
    // Check network requests
    console.log('\n📡 Monitoring network requests...');
    
    const requests = [];
    page.on('response', response => {
      requests.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || ''
      });
    });
    
    // Refresh page to capture requests
    await page.reload({ waitUntil: 'networkidle0' });
    
    console.log('\n📊 Network Requests:');
    requests.forEach(req => {
      if (req.url.includes('location') || req.url.includes('api') || req.url.includes('json')) {
        console.log(`   • ${req.url} (${req.status}) - ${req.contentType}`);
      }
    });
    
    console.log('\n✅ Debug analysis complete!');
    console.log('💡 Check the saved HTML file and browser window for more details.');
    console.log('🔍 Press any key to close the browser...');
    
    // Wait for user input before closing
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugWebsite();
}
