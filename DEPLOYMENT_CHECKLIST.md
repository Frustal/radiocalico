# Radio Calico Deployment Checklist

Use this checklist when deploying Radio Calico to production.

## Pre-Deployment

### Security Review
- [ ] Change Flask `SECRET_KEY` to a secure value
  ```bash
  bash scripts/generate-secret-key.sh
  ```
- [ ] Review environment variables in `.env`
- [ ] Verify all secrets are in `.env` and NOT in code
- [ ] Check that `.env` is in `.gitignore`
- [ ] Review database connection string (consider PostgreSQL for production)
- [ ] Verify CORS/proxy settings are appropriate

### Code Review
- [ ] All features completed and tested
- [ ] Code review completed
- [ ] Tests passing locally
- [ ] No console errors or warnings
- [ ] Database migrations tested locally

### Infrastructure Preparation
- [ ] Docker installed and updated
- [ ] Docker Compose installed (v2.0+)
- [ ] Sufficient disk space (check with `df -h`)
- [ ] Sufficient memory (minimum 1GB recommended)
- [ ] Firewall rules configured (ports 80, 443 if applicable)
- [ ] DNS records pointing to server (if using domain)

## Deployment Steps

### 1. Prepare Server
```bash
# Clone repository
git clone <repo-url> radiocalico
cd radiocalico

# Copy and configure environment
cp .env.example .env
# Edit .env with production values
nano .env  

# Generate secure SECRET_KEY if needed
bash scripts/generate-secret-key.sh
```

### 2. Build Docker Image
```bash
# Option A: Build locally
make build-prod

# Option B: Pull from registry (if pre-built)
docker pull myregistry/radiocalico:1.0.0
docker tag myregistry/radiocalico:1.0.0 radiocalico:latest
```

### 3. Test Locally Before Deploy
```bash
# Start containers in background
make up-prod

# Wait for services to start
sleep 5

# Test endpoints
curl http://localhost:3000  # Frontend
curl http://localhost:5000/api/ratings  # Backend API

# View logs
make logs-prod

# Stop containers
make down-prod
```

### 4. Deploy to Production
```bash
# Start production containers
make up-prod

# Verify containers are running
make ps

# Check health
curl http://localhost:3000/health

# Monitor logs
make logs-prod
```

### 5. Post-Deployment Verification

#### Frontend
- [ ] Visit http://your-server:3000 in browser
- [ ] Page loads without errors
- [ ] Audio player is visible
- [ ] Rating buttons are functional
- [ ] Metadata displays correctly

#### Backend API
- [ ] `curl http://your-server:5000/api/ratings` returns data
- [ ] GET endpoints work
- [ ] POST endpoints work (submit a rating)
- [ ] Database is being updated

#### Database
- [ ] Database file exists: `docker exec radiocalico-prod ls -la instance/`
- [ ] Database has data: `make db-shell` then `SELECT COUNT(*) FROM rating;`
- [ ] No locked database errors in logs

#### Monitoring
- [ ] `make stats` shows reasonable resource usage
- [ ] `make ps` shows all containers running
- [ ] Check logs for errors: `make logs-prod`
- [ ] No memory leaks (monitor over 5-10 minutes)

## Post-Deployment

### Setup Backups
```bash
# Create backups directory
mkdir -p /backup/radiocalico

# Setup automated backup (daily at 2am)
# Add to crontab with: crontab -e
0 2 * * * cd /path/to/radiocalico && make backup-prod

# Test backup works
make backup-prod
```

### Setup Monitoring
- [ ] Monitor disk usage (`df -h`)
- [ ] Monitor container status (`docker-compose -f docker-compose.prod.yml ps`)
- [ ] Setup alerts for container restarts
- [ ] Monitor application logs for errors

### Setup Reverse Proxy (Recommended)
```bash
# Use Nginx for better performance and SSL
docker-compose -f docker-compose.prod-with-nginx.yml up -d

# Or manually with nginx configuration
# See nginx/nginx.conf for configuration
```

### Setup SSL/HTTPS (If Using Domain)
```bash
# Install Let's Encrypt Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf with certificate paths
# See comments in nginx/nginx.conf for HTTPS setup

# Auto-renew certificates
sudo systemctl enable certbot.timer
```

## Rollback Procedure

If something goes wrong:

### Option 1: Restart Containers
```bash
# Quick restart
docker-compose -f docker-compose.prod.yml restart radiocalico

# Full restart (rebuild)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Restore From Backup
```bash
# Stop running container
make down-prod

# Restore database from backup
make restore-prod BACKUP_FILE=./backups/backup-prod-*.tar.gz

# Restart
make up-prod
```

### Option 3: Revert to Previous Image Version
```bash
# Stop current container
docker-compose -f docker-compose.prod.yml down

# Use previous image tag
docker image ls | grep radiocalico

# Update docker-compose.prod.yml to use previous tag
# Start with previous version
docker-compose -f docker-compose.prod.yml up -d
```

## Ongoing Operations

### Daily Tasks
- [ ] Monitor logs: `make logs-prod | grep -i error`
- [ ] Check container status: `make ps`
- [ ] Verify application is responsive

### Weekly Tasks
- [ ] Create database backup: `make backup-prod`
- [ ] Review error logs
- [ ] Check disk usage

### Monthly Tasks
- [ ] Review and update dependencies
- [ ] Test backup restore procedure
- [ ] Performance analysis and optimization
- [ ] Security updates

### Quarterly Tasks
- [ ] Major version updates
- [ ] Infrastructure review
- [ ] Disaster recovery drill

## Troubleshooting

### Containers Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs radiocalico

# Possible issues:
# - Port already in use
# - Database corruption
# - Out of disk space
# - Permission issues
```

### Application Errors
```bash
# Check Flask errors
make logs-prod | grep -A 5 "ERROR"

# Access container for debugging
docker-compose -f docker-compose.prod.yml exec radiocalico bash

# Check database
make db-shell
> SELECT * FROM rating LIMIT 5;
```

### Performance Issues
```bash
# Check resource usage
make stats

# Check for slow queries
docker-compose -f docker-compose.prod.yml exec radiocalico \
  sqlite3 instance/radiocalico.db "PRAGMA query_only = ON; SELECT * FROM sqlite_master WHERE type='index';"

# Consider switching to PostgreSQL for better performance
```

### Database Issues
```bash
# Backup corrupted database
cp instance/radiocalico.db instance/radiocalico.db.corrupt

# Reinitialize fresh database
rm instance/radiocalico.db
docker-compose -f docker-compose.prod.yml restart radiocalico

# Restore from backup if needed
make restore-prod BACKUP_FILE=./backups/backup-prod-*.tar.gz
```

## Emergency Contacts / Escalation

- On-call Engineer: [Contact Info]
- Infrastructure Team: [Contact Info]
- Database Administrator: [Contact Info]

---

**Last Updated:** [Date]  
**Deployed Version:** [Version]  
**Deployed By:** [Name]
