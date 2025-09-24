# Location Data Updater

This directory contains scripts to update the maimai location data by fetching the latest information from the ALL.Net website.

## 🚀 Quick Start

### Command Line (Recommended)

The most reliable way to update location data is using the Node.js script:

```bash
npm run update-locations
```

This will:
1. Fetch the latest active locations from https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009
2. Match them against the current location database
3. Update the active status for all locations
4. Save the updated data to `src/r1index-geocoded.json`
5. Create a backup of the original data with timestamp

### Browser Interface

You can also use the built-in updater in the web interface:

1. Visit the List View or Map View
2. Click the "🔄 Update Locations" button in the bottom-right corner
3. Click "Update Location Data" in the dialog
4. Download the updated JSON file when prompted

> ⚠️ **Note**: The browser method may not work due to CORS restrictions. Use the command line method for reliable updates.

## 📋 How It Works

### Data Sources

- **Source**: ALL.Net Games Locator (https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009)
- **Target**: Local JSON file (`src/r1index-geocoded.json`)

### Matching Logic

The updater uses a scoring system to match locations from the ALL.Net website with the local database:

- **State Match** (50 points): Exact state code match (e.g., "CA", "TX")
- **City Match** (30 points): Exact city name match
- **Name Similarity** (25 points): Similar location names after normalization
- **Address Similarity** (15 points): Common street numbers or address components
- **Street Name Match** (10 points): Common street or mall names

Locations with a confidence score of 70+ are considered matches.

### Status Updates

- **Active** (`active: true`): Location appears on the ALL.Net website
- **Inactive** (`active: false`): Location does not appear on the ALL.Net website

## 🔧 Files

- `updateLocations.js` - Main Node.js script for updating location data
- `../src/utils/locationUpdater.js` - Browser-compatible utility functions
- `../src/components/LocationUpdater.jsx` - React component for browser interface

## 📊 Output

The script provides detailed feedback:

```
🎮 maimai USA Location Data Updater
=====================================

📂 Reading current location data...
📍 Loaded 53 locations from JSON file

🌐 Fetching latest location data from ALL.Net...
📍 Found 7 active locations on ALL.Net

🔍 Matching locations...
✅ Matched: ROUND1 PUENTE HILLS MALL -> Round1 Puente Hills Mall (PHM) - Score: 95
✅ Matched: ROUND1 BURBANK TOWN CENTER -> Round1 Burbank Town Center (BTC) - Score: 95
...

📊 Update Summary:
   • Activated: 0 locations
   • Deactivated: 2 locations  
   • Unchanged: 51 locations
   • Total active: 7 locations

💾 Writing updated data to file...
✅ Location data updated successfully!
🔐 Backup created: r1index-geocoded-backup-2025-01-15T10-30-45-123Z.json
```

## 🔄 Automation

You can set up automated updates using cron jobs or GitHub Actions:

### Cron Job Example
```bash
# Update locations daily at 6 AM
0 6 * * * cd /path/to/maimai-usa && npm run update-locations
```

### GitHub Actions Example
```yaml
name: Update Locations
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run update-locations
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add src/r1index-geocoded.json
          git commit -m "Update location data" || exit 0
          git push
```

## 🛠️ Troubleshooting

### Common Issues

1. **Network Errors**: The ALL.Net website may be temporarily unavailable
2. **CORS Errors**: Browser requests are blocked by CORS policy
3. **Parsing Errors**: Website HTML structure may have changed

### Solutions

- Use the command line script instead of browser interface
- Check network connectivity
- Verify the ALL.Net website is accessible
- Update parsing logic if website structure changes

## 📝 Manual Updates

If automatic updates fail, you can manually update locations:

1. Visit https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009
2. Note which locations are listed as active
3. Update the `active` field in `src/r1index-geocoded.json` accordingly
4. Create a backup of your changes

## 🤝 Contributing

To improve the location updater:

1. Update matching logic in `locationUpdater.js`
2. Improve HTML parsing for website changes
3. Add error handling for edge cases
4. Enhance logging and feedback
