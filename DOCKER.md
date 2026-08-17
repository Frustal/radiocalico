# Radio Calico Docker Deployment Guide

This guide covers building and running Radio Calico using Docker for both development and production environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Docker Images](#docker-images)
5. [Environment Configuration](#environment-configuration)
6. [Database Management](#database-management)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## Quick Start

### Development Mode
```bash
# Clone and navigate to repository
cd radiocalico

# Copy environment template
cp .env.example .env

# Build and start development containers
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
```

### Production Mode
```bash
# Copy and configure environment for production
cp .env.example .env
# Edit .env with production values (especially SECRET_KEY!)

# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f radiocalico
```

---

## Development Setup

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Starting Development Environment

```bash
# Build the development image
docker-compose build

# Start services with live code reloading
docker-compose up

# In another terminal, run migrations if needed
docker-compose exec radiocalico flask --app main db upgrade
```

### Features
- **Live Code Reloading**: Changes to Python and JavaScript files automatically reload
- **Debug Mode**: Flask debug mode enabled for interactive debugging
- **Volume Mounts**: Source code mounted as a volume for rapid development
- **Interactive Terminal**: Access container shell for debugging

### Running Commands in Development

```bash
# Run Python migrations
docker-compose exec radiocalico python -m flask --app main db migrate -m "message"
docker-compose exec radiocalico python -m flask --app main db upgrade

# Run tests
docker-compose exec radiocalico npm test
docker-compose exec radiocalico pytest

# Access Python shell
docker-compose exec radiocalico python

# Access container bash shell
docker-compose exec radiocalico bash

# View logs
docker-compose logs -f radiocalico
docker-compose logs -f radiocalico | grep Flask
```

### Stopping Development Environment

```bash
# Stop containers but keep volumes
docker-compose stop

# Stop and remove containers and volumes
docker-compose down

# Stop and remove everything (clean slate)
docker-compose down -v
```

---

## Production Setup

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Production-grade SECRET_KEY (generate with: `python -c "import secrets; print(secrets.token_hex(32))"`)

### Building Production Image

```bash
# Build the production image
docker-compose -f docker-compose.prod.yml build

# Tag for registry (if deploying to Docker Hub, ECR, etc.)
docker tag radiocalico:latest myregistry/radiocalico:1.0.0
docker push myregistry/radiocalico:1.0.0
```

### Deploying to Production

```bash
# Copy environment template and configure for production
cp .env.example .env
nano .env  # Edit: Set SECRET_KEY, FLASK_ENV=production, etc.

# Pull latest image (if using remote registry)
docker pull myregistry/radiocalico:1.0.0

# Start production containers in background
docker-compose -f docker-compose.prod.yml up -d

# View status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f radiocalico
```

### Production Configuration

```bash
# Edit .env for production
FLASK_ENV=production
SECRET_KEY=<generate-secure-key>
NODE_ENV=production
DATABASE_URL=sqlite:////app/instance/radiocalico.db  # or PostgreSQL
```

### Production Best Practices

1. **Reverse Proxy**: Run nginx or similar in front of Express.js
   - Handles SSL/TLS termination
   - Distributes requests across multiple app instances
   - Serves static files efficiently

2. **Database**: Consider PostgreSQL for production instead of SQLite
   - Better concurrency handling
   - Production-grade reliability
   - Easier backups

3. **Backup Strategy**: Regularly backup the database volume
   ```bash
   docker-compose -f docker-compose.prod.yml exec -T radiocalico \
     tar czf - instance/ | gzip > backup-$(date +%Y%m%d-%H%M%S).tar.gz
   ```

4. **Monitoring**: Set up container health checks (already configured)
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   # Check STATUS column for health indicator
   ```

5. **Updates**: Safely update production containers
   ```bash
   # Pull new image
   docker pull myregistry/radiocalico:1.0.1
   
   # Stop old container
   docker-compose -f docker-compose.prod.yml stop
   
   # Update docker-compose.prod.yml image tag
   
   # Start with new image
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## Docker Images

### Multi-Stage Build Strategy

The Dockerfile uses multi-stage builds to minimize production image size:

1. **python-builder**: Installs Python dependencies in a virtual environment
2. **node-builder**: Installs Node.js dependencies
3. **development**: Full development image with debugging tools
4. **production**: Lean production image with only runtime dependencies

### Image Details

```bash
# View image sizes
docker images radiocalico

# Example output:
# REPOSITORY   TAG      IMAGE ID    CREATED      SIZE
# radiocalico  latest   abc123...   2 min ago    850MB (dev), 420MB (prod)
```

### Building Specific Targets

```bash
# Build only production image (faster)
docker build --target production -t radiocalico:prod .

# Build only development image
docker build --target development -t radiocalico:dev .

# Build with specific build args
docker build --build-arg PYTHON_VERSION=3.14 -t radiocalico:latest .
```

---

## Environment Configuration

### Creating Environment File

```bash
# Copy template
cp .env.example .env

# Edit for your environment
cat > .env << 'EOF'
FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
NODE_ENV=production
PORT=3000
PYTHONUNBUFFERED=1
EOF
```

### Environment Variables Reference

| Variable | Dev Default | Prod Default | Description |
|----------|------------|-------------|-------------|
| `FLASK_ENV` | development | production | Flask environment mode |
| `FLASK_DEBUG` | 1 | 0 | Enable Flask debugger |
| `FLASK_APP` | main.py | main.py | Flask app entry point |
| `SECRET_KEY` | dev-secret-... | <required> | Session encryption key |
| `DATABASE_URL` | sqlite:///... | sqlite:///... | Database connection string |
| `NODE_ENV` | development | production | Node.js environment |
| `PORT` | 3000 | 3000 | Express.js port |
| `PYTHONUNBUFFERED` | 1 | 1 | Python output buffering |

### Changing Environment After Container Start

```bash
# Update .env file
vim .env

# Restart containers to apply changes
docker-compose restart radiocalico

# Or with production:
docker-compose -f docker-compose.prod.yml restart radiocalico
```

---

## Database Management

### Initialize Database

```bash
# Automatically done on container start, but can be manual:
docker-compose exec radiocalico python -m flask --app main db upgrade
```

### Create New Migration

```bash
# After modifying app/models.py:
docker-compose exec radiocalico python -m flask --app main db migrate -m "Add new field"
docker-compose exec radiocalico python -m flask --app main db upgrade
```

### Backup Database

```bash
# Development
docker-compose exec radiocalico cp instance/radiocalico.db /tmp/backup.db
docker cp radiocalico-dev:/tmp/backup.db ./radiocalico-backup.db

# Production
docker-compose -f docker-compose.prod.yml exec -T radiocalico \
  tar czf - instance/radiocalico.db | gzip > backup.tar.gz
```

### Restore Database

```bash
# From backup file
docker cp radiocalico-backup.db radiocalico-dev:/app/instance/radiocalico.db
docker-compose restart radiocalico
```

### Access Database Directly

```bash
# SQLite CLI in container
docker-compose exec radiocalico sqlite3 instance/radiocalico.db

# Examples in sqlite3:
# .tables          -- List all tables
# .schema rating   -- Show schema
# SELECT * FROM rating;  -- Query ratings
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs radiocalico

# Common issues:
# 1. Port already in use (3000 or 5000)
#    Solution: Change ports in docker-compose.yml or stop conflicting service

# 2. Database initialization failed
#    Solution: docker-compose down -v && docker-compose up

# 3. Out of disk space
#    Solution: docker system prune -a
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :5000

# Kill process or change port in docker-compose.yml
# Option 1: Kill process
kill -9 <PID>

# Option 2: Change port in docker-compose.yml
# ports:
#   - "8000:3000"  # Map host:container
```

### Connection Refused

```bash
# Ensure services are running
docker-compose ps

# If backend isn't responding from frontend:
# 1. Check proxy settings in server.js
# 2. Verify Express can reach Flask at http://localhost:5000
# 3. In container: curl http://localhost:5000/api/ratings

# Test connectivity between containers
docker-compose exec radiocalico curl http://localhost:5000/api/ratings
```

### Database Locked Error

```bash
# SQLite can have locking issues with concurrent access
# Solution 1: Restart containers
docker-compose restart radiocalico

# Solution 2: Remove instance directory and reinitialize
docker-compose down -v
docker-compose up

# Solution 3: For production, migrate to PostgreSQL
```

### Memory/Disk Issues

```bash
# Check container resource usage
docker stats radiocalico

# Clean up unused containers, images, volumes
docker system prune --volumes

# Check disk usage
du -sh /var/lib/docker

# Limit container memory in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

---

## Advanced Configuration

### Using PostgreSQL in Production

Update the Dockerfile and add a PostgreSQL service:

```yaml
# Add to docker-compose.prod.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: radiocalico
      POSTGRES_PASSWORD: secure-password
      POSTGRES_DB: radiocalico
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always

  radiocalico:
    # ... existing config ...
    environment:
      DATABASE_URL: postgresql://radiocalico:secure-password@postgres:5432/radiocalico
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres-data:
```

### Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
upstream app {
    server radiocalico:3000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Add to docker-compose.prod.yml:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - radiocalico
    restart: always
```

### Scaling with Multiple Instances

For production with multiple app instances behind a load balancer:

```bash
# Start multiple instances
docker-compose -f docker-compose.prod.yml up -d --scale radiocalico=3

# Note: Requires custom docker-compose config without container_name
# and load balancer (nginx) to distribute traffic
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [master]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```

### Running Tests in Docker

```bash
# Unit tests
docker-compose exec radiocalico npm test
docker-compose exec radiocalico pytest

# With coverage
docker-compose exec radiocalico npm test -- --coverage
docker-compose exec radiocalico pytest --cov=app

# Integration tests (requires running services)
docker-compose exec radiocalico npm run test:integration
```

---

## Common Docker Commands

```bash
# Development
docker-compose up                 # Start services
docker-compose up -d              # Start in background
docker-compose down               # Stop services
docker-compose logs -f            # View logs
docker-compose exec radiocalico bash  # Enter container
docker-compose build --no-cache   # Rebuild without cache

# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml down

# Image management
docker build -t radiocalico:latest .
docker images
docker rmi radiocalico:latest
docker tag radiocalico:latest myregistry/radiocalico:1.0.0
docker push myregistry/radiocalico:1.0.0

# Container management
docker ps -a
docker inspect radiocalico-dev
docker stats radiocalico-dev
docker exec radiocalico-dev ps aux
```

---

## Security Considerations

1. **Secret Key**: Never commit `.env` or hardcoded secrets
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Non-Root User**: Production image runs as non-root (`appuser:1000`)

3. **Network Isolation**: Use Docker networks to isolate services

4. **Volume Permissions**: Database volume has restricted permissions

5. **Health Checks**: Containers include health checks for monitoring

6. **Resource Limits**: Production config includes CPU and memory limits

7. **Logging**: Structured logging with rotation in production

---

## Next Steps

- Set up automated backups for the database volume
- Configure reverse proxy (nginx) for production
- Implement monitoring and alerting
- Set up CI/CD pipeline for automated deployments
- Consider managed container services (ECS, GKE, etc.) for scaling

For more information, see the main [CLAUDE.md](CLAUDE.md) project documentation.
