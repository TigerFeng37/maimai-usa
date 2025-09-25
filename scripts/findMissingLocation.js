#!/usr/bin/env node

/**
 * Diagnostic tool to find the missing 8th active location
 * Compares current active locations with expected list
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known active locations from fallback data (7 locations)
const KNOWN_ACTIVE_LOCATIONS = [
  "ROUND1 PUENTE HILLS MALL",
  "ROUND1 MORENO VALLEY MALL", 
  "ROUND1 LAKEWOOD MALL",
  "ROUND1 MAIN PLACE MALL",
  "ROUND1 PROMENADE TEMECULA",
  "ROUND1 SOUTHLAND MALL",
  "ROUND1 BURBANK TOWN CENTER"
];

async function findMissingLocation() {
  try {
    console.log('🔍 Diagnostic Tool: Find Missing 8th Location');
    console.log('==============================================\n');
    
    // Read current JSON data
    const jsonPath = path.join(__dirname, '../src/r1index-geocoded.json');
    const jsonData = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    
    // Get currently active locations
    const currentlyActive = jsonData.filter(location => location.active);
    
    console.log(`📊 Current Status:`);
    console.log(`   • Total locations in database: ${jsonData.length}`);
    console.log(`   • Currently active locations: ${currentlyActive.length}`);
    console.log(`   • Expected active locations: 8`);
    console.log(`   • Missing: ${8 - currentlyActive.length} location(s)\n`);
    
    console.log('🎯 Currently Active Locations:');
    currentlyActive.forEach((location, i) => {
      console.log(`   ${i + 1}. ${location.name} (${location.code}) - ${location.city}, ${location.state}`);
    });
    
    console.log('\n📋 Known Active Locations from Web Search:');
    KNOWN_ACTIVE_LOCATIONS.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    
    // Look for potential candidates that might be the 8th location
    console.log('\n🔍 Potential 8th Location Candidates:');
    console.log('   (Looking for locations that might have been recently activated)\n');
    
    // Check for locations with similar patterns to active ones
    const activeCities = [...new Set(currentlyActive.map(loc => loc.city))];
    const activeStates = [...new Set(currentlyActive.map(loc => loc.state))];
    
    console.log('   Active cities:', activeCities.join(', '));
    console.log('   Active states:', activeStates.join(', '));
    
    // Look for inactive locations that might be candidates
    const inactiveLocations = jsonData.filter(location => !location.active);
    
    console.log('\n🎯 Possible Candidates (inactive locations in active states):');
    const candidates = inactiveLocations.filter(location => 
      activeStates.includes(location.state)
    );
    
    candidates.slice(0, 10).forEach((location, i) => {
      console.log(`   ${i + 1}. ${location.name} (${location.code}) - ${location.city}, ${location.state}`);
    });
    
    // Check if any locations have been mentioned in recent context
    console.log('\n💡 Suggestions:');
    console.log('   1. Check the official ALL.Net website manually');
    console.log('   2. Look for recent Round1 location announcements');  
    console.log('   3. Verify if any of the candidate locations above are now active');
    console.log('   4. Update the fallback data once the 8th location is identified\n');
    
    // Show instructions for manual update
    console.log('🔧 To add the 8th location:');
    console.log('   1. Identify the location name and details');
    console.log('   2. Update scripts/updateLocationsWithBrowser.js fallback data');
    console.log('   3. Run the update script again');
    console.log('   4. The location should then be properly detected\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findMissingLocation();
}
