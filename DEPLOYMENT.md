# 🚀 Deployment Guide: Scheduled Location Updates

This guide covers multiple approaches to run the maimai USA location updater on a schedule on various web servers and cloud platforms.

## 📋 Quick Reference

| Method | Best For | Complexity | Reliability |
|--------|----------|------------|-------------|
| [GitHub Actions](#github-actions) | GitHub-hosted projects | Low | High |
| [Linux Cron](#linux-cron) | Traditional servers | Low | High |
| [Docker Compose](#docker-compose) | Containerized apps | Medium | High |
| [Kubernetes](#kubernetes) | Cloud/enterprise | High | Very High |
| [Serverless](#serverless) | Cost optimization | Medium | Medium |

---

## 🔧 GitHub Actions (Recommended)

**Best for**: Projects hosted on GitHub with automatic deployment.

### Setup Steps:

1. **Enable GitHub Actions** in your repository settings

2. **Add the workflow file** (already created):
   ```
   .github/workflows/update-locations.yml
   ```

3. **Configure secrets** (if needed):
   - Go to Repository Settings → Secrets and variables → Actions
   - Add `GITHUB_TOKEN` (usually automatic)
   - Add deployment secrets if auto-deploying to your server

4. **Customize the schedule**:
   ```yaml
   on:
     schedule:
       - cron: '0 6 * * *'  # Daily at 6 AM UTC
   ```

5. **Test the workflow**:
   - Go to Actions tab → Select "Update Location Data"
   - Click "Run workflow" to test manually

### ✅ Pros:
- Free for public repositories
- Automatic commits and deployment
- Built-in logging and monitoring
- No server maintenance required

### ❌ Cons:
- Requires GitHub hosting
- Limited to 2000 minutes/month for private repos

---

## 🐧 Linux Cron (Traditional Servers)

**Best for**: VPS, dedicated servers, shared hosting with shell access.

### Quick Setup:

1. **Upload your project** to the server:
   ```bash
   scp -r maimai-usa/ user@yourserver.com:/var/www/
   ```

2. **Run the deployment script**:
   ```bash
   sudo bash /var/www/maimai-usa/scripts/deploy-scheduler.sh
   ```

3. **Verify the setup**:
   ```bash
   crontab -l  # Check cron jobs
   /var/www/maimai-usa/scripts/check-updates.sh  # Check status
   ```

### Manual Setup:

1. **Install Node.js** on your server:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install nodejs npm
   ```

2. **Set up the project**:
   ```bash
   cd /var/www/maimai-usa
   npm install
   chmod +x scripts/*.sh
   ```

3. **Add cron job**:
   ```bash
   crontab -e
   ```
   
   Add this line:
   ```bash
   0 6 * * * cd /var/www/maimai-usa && /var/www/maimai-usa/scripts/update-wrapper.sh
   ```

4. **Test the update**:
   ```bash
   cd /var/www/maimai-usa && npm run update-locations
   ```

### ✅ Pros:
- Full control over timing and execution
- Works on any Linux server
- No external dependencies

### ❌ Cons:
- Requires server administration
- Manual setup and maintenance

---

## 🐳 Docker Compose

**Best for**: Containerized applications, microservices architecture.

### Setup Steps:

1. **Build and run the scheduler**:
   ```bash
   cd maimai-usa
   docker-compose -f docker/docker-compose.scheduler.yml up -d
   ```

2. **Check logs**:
   ```bash
   docker-compose -f docker/docker-compose.scheduler.yml logs -f maimai-scheduler
   ```

3. **View updated files**:
   ```bash
   docker-compose -f docker/docker-compose.scheduler.yml exec maimai-scheduler ls -la /app/src/
   ```

### Configuration Options:

Edit `docker/docker-compose.scheduler.yml`:

```yaml
environment:
  - RUN_ON_START=true        # Run update on container start
  - FAIL_ON_INIT_ERROR=false # Don't fail if first update fails
  - TZ=America/Los_Angeles   # Set timezone
```

### ✅ Pros:
- Isolated environment
- Easy to scale and manage
- Consistent across environments
- Built-in web server option

### ❌ Cons:
- Requires Docker knowledge
- Additional resource overhead

---

## ☸️ Kubernetes

**Best for**: Cloud platforms, enterprise deployments, high availability.

### Setup Steps:

1. **Deploy the CronJob**:
   ```bash
   kubectl apply -f k8s/location-updater-cronjob.yaml
   ```

2. **Check the CronJob**:
   ```bash
   kubectl get cronjobs
   kubectl describe cronjob maimai-location-updater
   ```

3. **View job history**:
   ```bash
   kubectl get jobs
   kubectl logs job/maimai-location-updater-<timestamp>
   ```

4. **Trigger manual run**:
   ```bash
   kubectl create job --from=cronjob/maimai-location-updater manual-update-$(date +%s)
   ```

### Customization:

Edit `k8s/location-updater-cronjob.yaml`:

```yaml
spec:
  schedule: "0 6 * * *"  # Modify schedule
  timeZone: "America/Los_Angeles"  # Set timezone (K8s 1.24+)
```

### ✅ Pros:
- Highly scalable and reliable
- Built-in monitoring and alerting
- Automatic retry and failure handling
- Cloud-native architecture

### ❌ Cons:
- Complex setup and management
- Requires Kubernetes knowledge
- Higher resource requirements

---

## ⚡ Serverless Functions

**Best for**: Cost optimization, infrequent updates, cloud-first architecture.

### AWS Lambda Example:

1. **Create a Lambda function**:
   ```javascript
   // lambda/index.js
   import { updateLocationData } from './locationUpdater.js';
   
   export const handler = async (event, context) => {
     try {
       const result = await updateLocationData();
       
       // Upload to S3 or update database
       await uploadToS3(result.data);
       
       return {
         statusCode: 200,
         body: JSON.stringify({ success: true, changes: result.changes })
       };
     } catch (error) {
       console.error('Update failed:', error);
       return {
         statusCode: 500,
         body: JSON.stringify({ success: false, error: error.message })
       };
     }
   };
   ```

2. **Set up CloudWatch Events**:
   ```bash
   aws events put-rule --name maimai-location-update \
     --schedule-expression "cron(0 6 * * ? *)" \
     --description "Daily location update"
   
   aws events put-targets --rule maimai-location-update \
     --targets Id=1,Arn=arn:aws:lambda:region:account:function:maimai-updater
   ```

### Vercel Functions Example:

```javascript
// api/update-locations.js
import { updateLocationData } from '../utils/locationUpdater.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const result = await updateLocationData();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### ✅ Pros:
- Pay per execution
- Automatic scaling
- No server management
- Built-in monitoring

### ❌ Cons:
- Platform-specific setup
- Cold start delays
- Time limits on execution

---

## 🔍 Monitoring & Alerting

### Log Monitoring:

```bash
# View recent logs
tail -f /var/www/maimai-usa/logs/location-update-$(date +%Y-%m-%d).log

# Check for errors
grep -i error /var/www/maimai-usa/logs/location-update-*.log

# Monitor file age
find /var/www/maimai-usa/src -name "r1index-geocoded.json" -mtime +2
```

### Health Checks:

```bash
# Run the monitoring script
/var/www/maimai-usa/scripts/check-updates.sh

# Check data freshness
curl -s https://yoursite.com/data/r1index-geocoded.json | jq '.[] | select(.active==true) | length'
```

### Email Notifications:

Add to your cron job or wrapper script:

```bash
# Send email on failure
if ! npm run update-locations; then
  echo "Location update failed at $(date)" | mail -s "maimai Update Failed" admin@yoursite.com
fi
```

---

## 🚨 Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Use command line script instead of browser
   - Check firewall settings
   - Verify ALL.Net website accessibility

2. **Permission Denied**:
   ```bash
   chmod +x scripts/*.sh
   chown -R www-data:www-data /var/www/maimai-usa
   ```

3. **Node.js Not Found**:
   ```bash
   which node
   export PATH=$PATH:/usr/local/bin
   ```

4. **Git Commit Failures**:
   ```bash
   git config --global user.email "updater@yoursite.com"
   git config --global user.name "Location Updater"
   ```

5. **Network Issues**:
   ```bash
   curl -I https://location.am-all.net/alm/location?gm=98&lang=en&ct=1009
   ```

### Debug Mode:

Run with verbose logging:

```bash
DEBUG=true npm run update-locations
```

---

## 🔒 Security Considerations

1. **File Permissions**:
   ```bash
   chmod 644 src/r1index-geocoded.json
   chmod 755 scripts/
   chmod 600 logs/
   ```

2. **User Isolation**:
   - Run updates as dedicated user (not root)
   - Use systemd user services where possible

3. **Git Authentication**:
   - Use SSH keys or personal access tokens
   - Avoid storing credentials in scripts

4. **Network Security**:
   - Whitelist ALL.Net domains in firewall
   - Use HTTPS for all communications

---

## 📊 Performance Optimization

1. **Caching**:
   ```javascript
   // Cache ALL.Net responses for 1 hour
   const CACHE_DURATION = 3600000;
   ```

2. **Rate Limiting**:
   ```bash
   # Add delay between requests
   sleep 5
   npm run update-locations
   ```

3. **Resource Limits**:
   ```bash
   # Limit memory usage
   NODE_OPTIONS="--max-old-space-size=256" npm run update-locations
   ```

---

## 🤝 Contributing

To improve the deployment setup:

1. Test with different server configurations
2. Add support for new hosting platforms  
3. Improve error handling and recovery
4. Add more monitoring and alerting options
5. Optimize performance for large datasets

---

## 📞 Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review logs for error messages
3. Test manual updates first
4. Verify server requirements
5. Open an issue with detailed error information
