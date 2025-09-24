#!/bin/bash

# Deploy Scheduler Script for maimai USA Location Updater
# This script sets up automated location updates on a web server

set -e  # Exit on any error

echo "🚀 Setting up automated location updates..."

# Configuration
PROJECT_DIR="/var/www/maimai-usa"  # Adjust this path for your server
LOG_DIR="$PROJECT_DIR/logs"
CRON_SCHEDULE="0 6 * * *"  # Daily at 6 AM (adjust as needed)
USER="www-data"  # Adjust for your web server user

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# 1. Create logs directory
print_status "Creating logs directory..."
mkdir -p "$LOG_DIR"
chown "$USER:$USER" "$LOG_DIR"
print_success "Logs directory created: $LOG_DIR"

# 2. Create update script wrapper
print_status "Creating update script wrapper..."
cat > "$PROJECT_DIR/scripts/update-wrapper.sh" << 'EOF'
#!/bin/bash

# Wrapper script for location updates with proper logging
# This ensures the update runs in the correct environment

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/location-update-$(date +%Y-%m-%d).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Change to project directory
cd "$PROJECT_DIR" || {
    log "ERROR: Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

log "Starting location data update..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    log "ERROR: Node.js not found. Please install Node.js."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    log "ERROR: npm not found. Please install npm."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install >> "$LOG_FILE" 2>&1 || {
        log "ERROR: Failed to install dependencies"
        exit 1
    }
fi

# Run the update script
log "Running location update script..."
if npm run update-locations >> "$LOG_FILE" 2>&1; then
    log "SUCCESS: Location data updated successfully"
    
    # Optional: Commit changes to git if this is a git repository
    if [ -d ".git" ]; then
        git add src/r1index-geocoded.json
        if git commit -m "Automated location data update $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE" 2>&1; then
            log "SUCCESS: Changes committed to git"
            
            # Optional: Push changes (uncomment if you want auto-push)
            # git push >> "$LOG_FILE" 2>&1 && log "SUCCESS: Changes pushed to remote"
        else
            log "INFO: No changes to commit"
        fi
    fi
    
    # Clean up old log files (keep last 30 days)
    find "$LOG_DIR" -name "location-update-*.log" -mtime +30 -delete 2>/dev/null || true
    
    log "Update completed successfully"
    exit 0
else
    log "ERROR: Location update failed"
    exit 1
fi
EOF

# Make the wrapper script executable
chmod +x "$PROJECT_DIR/scripts/update-wrapper.sh"
chown "$USER:$USER" "$PROJECT_DIR/scripts/update-wrapper.sh"
print_success "Update wrapper script created"

# 3. Set up cron job
print_status "Setting up cron job..."

# Create cron job entry
CRON_COMMAND="$CRON_SCHEDULE cd $PROJECT_DIR && $PROJECT_DIR/scripts/update-wrapper.sh"

# Add to crontab for the specified user
(crontab -u "$USER" -l 2>/dev/null || echo "") | grep -v "maimai-usa location update" | {
    cat
    echo "# maimai-usa location update - runs daily at 6 AM"
    echo "$CRON_COMMAND"
} | crontab -u "$USER" -

print_success "Cron job scheduled: $CRON_SCHEDULE"

# 4. Set up logrotate
print_status "Setting up log rotation..."
cat > "/etc/logrotate.d/maimai-usa" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        # Optional: restart any services that might need it
    endscript
}
EOF
print_success "Log rotation configured"

# 5. Create monitoring script
print_status "Creating monitoring script..."
cat > "$PROJECT_DIR/scripts/check-updates.sh" << 'EOF'
#!/bin/bash

# Monitoring script to check if location updates are working
# Run this manually or add to monitoring system

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
DATA_FILE="$PROJECT_DIR/src/r1index-geocoded.json"

# Check if data file was updated in the last 2 days
if [ -f "$DATA_FILE" ]; then
    LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$DATA_FILE" 2>/dev/null || stat -c "%y" "$DATA_FILE" 2>/dev/null)
    LAST_MODIFIED_EPOCH=$(stat -f "%m" "$DATA_FILE" 2>/dev/null || stat -c "%Y" "$DATA_FILE" 2>/dev/null)
    CURRENT_EPOCH=$(date +%s)
    AGE_HOURS=$(( (CURRENT_EPOCH - LAST_MODIFIED_EPOCH) / 3600 ))
    
    echo "📊 Location Data Status"
    echo "======================"
    echo "Last updated: $LAST_MODIFIED"
    echo "Age: ${AGE_HOURS} hours ago"
    
    if [ $AGE_HOURS -gt 48 ]; then
        echo "⚠️  WARNING: Data is older than 48 hours"
    else
        echo "✅ Data is up to date"
    fi
else
    echo "❌ ERROR: Data file not found"
fi

# Check recent logs
echo ""
echo "📋 Recent Logs"
echo "=============="
if ls "$LOG_DIR"/location-update-*.log 1> /dev/null 2>&1; then
    LATEST_LOG=$(ls -t "$LOG_DIR"/location-update-*.log | head -1)
    echo "Latest log: $(basename "$LATEST_LOG")"
    echo ""
    echo "Last 10 lines:"
    tail -10 "$LATEST_LOG"
else
    echo "No log files found"
fi
EOF

chmod +x "$PROJECT_DIR/scripts/check-updates.sh"
chown "$USER:$USER" "$PROJECT_DIR/scripts/check-updates.sh"
print_success "Monitoring script created"

# 6. Test the setup
print_status "Testing the update script..."
if sudo -u "$USER" "$PROJECT_DIR/scripts/update-wrapper.sh"; then
    print_success "Test update completed successfully!"
else
    print_warning "Test update had issues. Check the logs in $LOG_DIR"
fi

# 7. Final instructions
echo ""
print_success "🎉 Automated location updates are now configured!"
echo ""
echo "📋 Summary:"
echo "  • Schedule: $CRON_SCHEDULE (daily at 6 AM)"
echo "  • User: $USER"
echo "  • Logs: $LOG_DIR"
echo "  • Wrapper script: $PROJECT_DIR/scripts/update-wrapper.sh"
echo ""
echo "🔧 Management commands:"
echo "  • View cron jobs: sudo crontab -u $USER -l"
echo "  • Check status: $PROJECT_DIR/scripts/check-updates.sh"
echo "  • View logs: tail -f $LOG_DIR/location-update-\$(date +%Y-%m-%d).log"
echo "  • Manual update: sudo -u $USER $PROJECT_DIR/scripts/update-wrapper.sh"
echo ""
echo "⚠️  Next steps:"
echo "  1. Verify the PROJECT_DIR path is correct for your setup"
echo "  2. Adjust the cron schedule if needed"
echo "  3. Test the monitoring script"
echo "  4. Consider setting up email notifications for failures"
EOF
