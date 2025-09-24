#!/bin/bash

# Docker container startup script for maimai location updater

set -e

echo "🐳 Starting maimai USA Location Updater Scheduler"
echo "================================================="

# Initialize log file
LOG_FILE="/app/logs/scheduler-$(date +%Y-%m-%d).log"
touch "$LOG_FILE"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Container started"

# Validate environment
log "Validating environment..."

if [ ! -f "/app/package.json" ]; then
    log "ERROR: package.json not found"
    exit 1
fi

if [ ! -f "/app/scripts/updateLocations.js" ]; then
    log "ERROR: updateLocations.js script not found"
    exit 1
fi

if [ ! -f "/app/src/r1index-geocoded.json" ]; then
    log "WARNING: r1index-geocoded.json not found, container may need volume mount"
fi

log "Environment validation complete"

# Run initial update if requested
if [ "$RUN_ON_START" = "true" ]; then
    log "Running initial update..."
    cd /app
    if node scripts/updateLocations.js >> "$LOG_FILE" 2>&1; then
        log "Initial update completed successfully"
    else
        log "Initial update failed"
        if [ "$FAIL_ON_INIT_ERROR" = "true" ]; then
            exit 1
        fi
    fi
fi

# Start cron daemon
log "Starting cron daemon..."
crond -f -d 8 &
CRON_PID=$!

log "Cron daemon started (PID: $CRON_PID)"
log "Scheduler is now running..."

# Function to handle shutdown
shutdown() {
    log "Received shutdown signal"
    kill $CRON_PID 2>/dev/null || true
    wait $CRON_PID 2>/dev/null || true
    log "Scheduler stopped"
    exit 0
}

# Handle shutdown signals
trap shutdown SIGTERM SIGINT

# Keep container running and monitor cron
while kill -0 $CRON_PID 2>/dev/null; do
    sleep 60
    
    # Optional: Check if logs are getting too large and rotate them
    if [ -f "$LOG_FILE" ]; then
        LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
        if [ "$LOG_SIZE" -gt 10485760 ]; then  # 10MB
            log "Rotating large log file"
            mv "$LOG_FILE" "${LOG_FILE}.old"
            touch "$LOG_FILE"
        fi
    fi
done

log "Cron daemon stopped unexpectedly"
exit 1
