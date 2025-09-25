#!/usr/bin/env node

/**
 * Location Data Validator
 * 
 * Validates the integrity and quality of location data in r1index-geocoded.json
 * Can be run standalone or integrated into update workflows
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  dataFile: path.join(__dirname, '..', 'src', 'r1index-geocoded.json'),
  requiredFields: ['code', 'name', 'city', 'state', 'address', 'lat', 'lng', 'active', 'geocoded'],
  optionalFields: ['cab_count', 'index', 'geocoded_address'],
  validStates: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ],
  coordinateBounds: {
    lat: { min: 19.0, max: 72.0 },  // Continental US + Alaska + Hawaii
    lng: { min: -180.0, max: -65.0 } // Continental US + Alaska + Hawaii
  }
};

class LocationDataValidator {
  constructor(dataFile = CONFIG.dataFile) {
    this.dataFile = dataFile;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      total: 0,
      active: 0,
      inactive: 0,
      withCoordinates: 0,
      duplicateCodes: 0,
      duplicateNames: 0
    };
  }

  /**
   * Load and parse the location data
   */
  loadData() {
    try {
      if (!fs.existsSync(this.dataFile)) {
        throw new Error(`Data file not found: ${this.dataFile}`);
      }

      const rawData = fs.readFileSync(this.dataFile, 'utf8');
      this.data = JSON.parse(rawData);

      if (!Array.isArray(this.data)) {
        throw new Error('Data must be an array of locations');
      }

      console.log(`✅ Loaded ${this.data.length} locations from ${path.basename(this.dataFile)}`);
      return true;
    } catch (error) {
      this.addError('LOAD_ERROR', `Failed to load data: ${error.message}`);
      return false;
    }
  }

  /**
   * Add an error to the error list
   */
  addError(type, message, locationIndex = null) {
    this.errors.push({
      type,
      message,
      locationIndex,
      location: locationIndex !== null ? this.data[locationIndex]?.code : null
    });
  }

  /**
   * Add a warning to the warning list
   */
  addWarning(type, message, locationIndex = null) {
    this.warnings.push({
      type,
      message,
      locationIndex,
      location: locationIndex !== null ? this.data[locationIndex]?.code : null
    });
  }

  /**
   * Validate JSON structure and required fields
   */
  validateStructure() {
    console.log('🔍 Validating JSON structure and required fields...');

    this.data.forEach((location, index) => {
      if (typeof location !== 'object' || location === null) {
        this.addError('INVALID_STRUCTURE', `Location ${index} is not a valid object`, index);
        return;
      }

      // Check required fields
      CONFIG.requiredFields.forEach(field => {
        if (!(field in location)) {
          this.addError('MISSING_FIELD', `Missing required field: ${field}`, index);
        } else if (location[field] === null || location[field] === undefined) {
          this.addError('NULL_FIELD', `Required field is null/undefined: ${field}`, index);
        } else if (typeof location[field] === 'string' && location[field].trim() === '') {
          this.addError('EMPTY_FIELD', `Required field is empty: ${field}`, index);
        }
      });

      // Check field types
      const typeChecks = {
        code: 'string',
        name: 'string',
        city: 'string',
        state: 'string',
        address: 'string',
        lat: 'number',
        lng: 'number',
        active: 'boolean',
        geocoded: 'boolean'
      };

      Object.entries(typeChecks).forEach(([field, expectedType]) => {
        if (field in location && typeof location[field] !== expectedType) {
          this.addError('WRONG_TYPE', `Field ${field} should be ${expectedType}, got ${typeof location[field]}`, index);
        }
      });
    });
  }

  /**
   * Validate coordinates
   */
  validateCoordinates() {
    console.log('🗺️  Validating coordinates...');

    this.data.forEach((location, index) => {
      if (typeof location.lat === 'number' && typeof location.lng === 'number') {
        this.stats.withCoordinates++;

        // Check if coordinates are within reasonable bounds
        const { lat, lng } = location;
        
        if (lat < CONFIG.coordinateBounds.lat.min || lat > CONFIG.coordinateBounds.lat.max) {
          this.addWarning('COORD_OUT_OF_BOUNDS', `Latitude ${lat} seems outside US bounds`, index);
        }
        
        if (lng < CONFIG.coordinateBounds.lng.min || lng > CONFIG.coordinateBounds.lng.max) {
          this.addWarning('COORD_OUT_OF_BOUNDS', `Longitude ${lng} seems outside US bounds`, index);
        }

        // Check for obviously invalid coordinates
        if (lat === 0 && lng === 0) {
          this.addWarning('NULL_ISLAND', 'Coordinates are (0,0) - likely invalid', index);
        }

        // Check coordinate precision (should have some decimal places for accuracy)
        if (lat % 1 === 0 || lng % 1 === 0) {
          this.addWarning('LOW_PRECISION', 'Coordinates have no decimal precision - may be inaccurate', index);
        }
      } else {
        this.addError('INVALID_COORDS', 'Missing or invalid coordinates', index);
      }
    });
  }

  /**
   * Validate location codes and check for duplicates
   */
  validateCodes() {
    console.log('🏷️  Validating location codes...');
    
    const codes = new Set();
    const duplicates = new Set();

    this.data.forEach((location, index) => {
      if (!location.code) return;

      const code = location.code.toUpperCase();
      
      // Check code format (should be 3 uppercase letters)
      if (!/^[A-Z]{3}$/.test(code)) {
        this.addWarning('INVALID_CODE_FORMAT', `Code "${code}" doesn't match expected format (3 uppercase letters)`, index);
      }

      // Check for duplicates
      if (codes.has(code)) {
        duplicates.add(code);
        this.addError('DUPLICATE_CODE', `Duplicate location code: ${code}`, index);
      } else {
        codes.add(code);
      }
    });

    this.stats.duplicateCodes = duplicates.size;
  }

  /**
   * Validate states
   */
  validateStates() {
    console.log('🗺️  Validating states...');

    this.data.forEach((location, index) => {
      if (location.state && !CONFIG.validStates.includes(location.state.toUpperCase())) {
        this.addWarning('INVALID_STATE', `Invalid state code: ${location.state}`, index);
      }
    });
  }

  /**
   * Check for potential duplicates based on name and address
   */
  validateDuplicateLocations() {
    console.log('🔍 Checking for potential duplicate locations...');

    const namesSeen = new Set();
    const duplicateNames = new Set();

    this.data.forEach((location, index) => {
      if (!location.name) return;

      const normalizedName = location.name.toLowerCase().trim();
      if (namesSeen.has(normalizedName)) {
        duplicateNames.add(normalizedName);
        this.addWarning('DUPLICATE_NAME', `Potential duplicate location name: ${location.name}`, index);
      } else {
        namesSeen.add(normalizedName);
      }
    });

    this.stats.duplicateNames = duplicateNames.size;
  }

  /**
   * Validate business logic
   */
  validateBusinessLogic() {
    console.log('💼 Validating business logic...');

    this.data.forEach((location, index) => {
      // All Round1 locations should have 'Round1' in the name
      if (location.name && !location.name.toLowerCase().includes('round1')) {
        this.addWarning('MISSING_BRAND', 'Location name does not contain "Round1"', index);
      }

      // Cabinet count should be reasonable
      if (location.cab_count && (location.cab_count < 1 || location.cab_count > 10)) {
        this.addWarning('UNUSUAL_CAB_COUNT', `Unusual cabinet count: ${location.cab_count}`, index);
      }

      // Geocoded locations should have geocoded_address
      if (location.geocoded && !location.geocoded_address) {
        this.addWarning('MISSING_GEOCODED_ADDRESS', 'Location is marked as geocoded but missing geocoded_address', index);
      }
    });
  }

  /**
   * Calculate statistics
   */
  calculateStats() {
    console.log('📊 Calculating statistics...');

    this.stats.total = this.data.length;
    this.stats.active = this.data.filter(loc => loc.active === true).length;
    this.stats.inactive = this.data.filter(loc => loc.active === false).length;

    const stateDistribution = {};
    this.data.forEach(location => {
      if (location.state) {
        stateDistribution[location.state] = (stateDistribution[location.state] || 0) + 1;
      }
    });

    this.stats.stateDistribution = stateDistribution;
    this.stats.statesWithLocations = Object.keys(stateDistribution).length;
  }

  /**
   * Run all validations
   */
  validate() {
    console.log('🚀 Starting location data validation...\n');

    if (!this.loadData()) {
      return this.getResults();
    }

    this.validateStructure();
    this.validateCoordinates();
    this.validateCodes();
    this.validateStates();
    this.validateDuplicateLocations();
    this.validateBusinessLogic();
    this.calculateStats();

    return this.getResults();
  }

  /**
   * Get validation results
   */
  getResults() {
    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats
    };
  }

  /**
   * Print results to console
   */
  printResults() {
    const results = this.getResults();

    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(60));

    // Overall status
    if (results.success) {
      console.log('✅ VALIDATION PASSED');
    } else {
      console.log('❌ VALIDATION FAILED');
    }

    // Statistics
    console.log('\n📊 Statistics:');
    console.log(`   Total locations: ${results.stats.total}`);
    console.log(`   Active locations: ${results.stats.active}`);
    console.log(`   Inactive locations: ${results.stats.inactive}`);
    console.log(`   With coordinates: ${results.stats.withCoordinates}`);
    console.log(`   States covered: ${results.stats.statesWithLocations}`);

    // Errors
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach((error, index) => {
        const location = error.location ? ` (${error.location})` : '';
        console.log(`   ${index + 1}. ${error.message}${location}`);
      });
    }

    // Warnings
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach((warning, index) => {
        const location = warning.location ? ` (${warning.location})` : '';
        console.log(`   ${index + 1}. ${warning.message}${location}`);
      });
    }

    // State distribution (top 5)
    if (results.stats.stateDistribution) {
      console.log('\n🗺️  Top 5 States by Location Count:');
      const topStates = Object.entries(results.stats.stateDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      topStates.forEach(([state, count]) => {
        console.log(`   ${state}: ${count} locations`);
      });
    }

    console.log('\n' + '='.repeat(60));

    return results;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new LocationDataValidator();
  const results = validator.validate();
  validator.printResults();
  
  process.exit(results.success ? 0 : 1);
}

export { LocationDataValidator };
