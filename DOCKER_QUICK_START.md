# Radio Calico Docker - Quick Start Guide

Get Radio Calico running in Docker in minutes.

## 5-Minute Development Setup

```bash
# 1. Clone/navigate to repository
cd radiocalico

# 2. Setup environment
make env

# 3. Start development
make up

# 4. Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:5000/api/ratings
```

**Stop development:** Press `Ctrl+C` or run `make down`

## Common Development Commands

```bash
make build          # Build dev image
make up             # Start dev servers
make down           # Stop dev servers
make logs           # View logs
make shell          # Access container shell
make test           # Run tests
make migrate        # Apply DB migrations
make backup         # Backup database
```

## 5-Minute Production Deployment

```bash
# 1. Create .env for production
make env

# 2. Edit .env file (set SECRET_KEY!)
nano .env

# 3. Deploy
make up-prod

# 4. Access the app
# http://your-server:3000
```

**Stop production:** `make down-prod`

## Common Production Commands

```bash
make build-prod     # Build prod image
make up-prod        # Start prod containers
make down-prod      # Stop prod containers
make logs-prod      # View logs
make shell-prod     # Access container
make backup-prod    # Backup database
make restore-prod   # Restore from backup
```

## Verify Deployment

```bash
# Check status
make ps

# Test frontend
curl http://localhost:3000

# Test backend API
curl http://localhost:5000/api/ratings

# View container stats
make stats

# Check logs for errors
make logs | grep -i error
```

## File Structure

```
radiocalico/
├── Dockerfile                           # Multi-stage Docker image
├── docker-compose.yml                   # Dev environment
├── docker-compose.prod.yml              # Prod environment
├── docker-compose.prod-with-nginx.yml   # Prod with nginx
├── docker-entrypoint.sh                 # Container startup script
├── .dockerignore                        # Files to exclude from build
├── .env.example                         # Environment template
├── Makefile                             # Easy commands
├── DOCKER.md                            # Full documentation
├── DOCKER_QUICK_START.md                # This file
├── DEPLOYMENT_CHECKLIST.md              # Pre-deployment checks
├── nginx/                               # Nginx config
│   └── nginx.conf                       # Reverse proxy config
├── scripts/                             # Helper scripts
│   └── generate-secret-key.sh           # Generate SECRET_KEY
└── .github/workflows/
    └── docker-build.yml                 # CI/CD pipeline
```

## Docker Image Overview

### Development Image (`development` target)
- ~850MB uncompressed
- Includes development tools (debugger, test runners)
- Flask running in debug mode
- Volume mounts for live code reload
- Full npm dev dependencies

**Use when:** Developing locally, debugging issues

### Production Image (`production` target)
- ~420MB uncompressed
- Minimal runtime dependencies
- Gunicorn serving Flask
- Non-root user for security
- No development tools

**Use when:** Deploying to production

## Environment Variables

Key variables to configure in `.env`:

```bash
# Flask
FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=<secure-random-value>

# Database
DATABASE_URL=sqlite:///instance/radiocalico.db

# Node/Express
NODE_ENV=production
PORT=3000
```

Full reference: See `.env.example`

## Database Operations

```bash
# Backup
make backup          # Dev backup
make backup-prod     # Prod backup

# Restore
make restore BACKUP_FILE=./backups/backup-*.tar.gz
make restore-prod BACKUP_FILE=./backups/backup-*.tar.gz

# Access database
make db-shell        # SQLite shell

# Run migrations
make migrate
```

## Troubleshooting

**Containers won't start:**
```bash
docker-compose logs radiocalico
# Check for port conflicts or database errors
```

**Port already in use:**
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it
```

**Database issues:**
```bash
make down
make clean  # Remove volumes
make up     # Fresh start
```

**View detailed logs:**
```bash
make logs-prod | tail -50      # Last 50 lines
make logs | grep -i error      # Errors only
docker-compose ps              # Container status
```

## Advanced Topics

- **Using PostgreSQL:** See DOCKER.md
- **Nginx reverse proxy:** See docker-compose.prod-with-nginx.yml
- **SSL/HTTPS setup:** See nginx/nginx.conf comments
- **Multiple instances:** See DOCKER.md "Scaling with Multiple Instances"
- **CI/CD integration:** See .github/workflows/docker-build.yml
- **Health checks:** Built into both compose files

## Next Steps

1. **Read Full Documentation:** `DOCKER.md` for comprehensive guide
2. **Pre-deployment:** Review `DEPLOYMENT_CHECKLIST.md`
3. **Production Setup:** Use `docker-compose.prod-with-nginx.yml` with reverse proxy
4. **Backups:** Schedule regular database backups
5. **Monitoring:** Set up container and application monitoring

## Quick Reference Card

| Task | Command |
|------|---------|
| Start dev | `make up` |
| Stop dev | `make down` |
| Restart | `make down && make up` |
| View logs | `make logs` |
| Shell access | `make shell` |
| Run tests | `make test` |
| Create backup | `make backup` |
| Restore backup | `make restore BACKUP_FILE=...` |
| Production start | `make up-prod` |
| Production stop | `make down-prod` |
| Production logs | `make logs-prod` |
| Database shell | `make db-shell` |
| Container status | `make ps` |
| Resource usage | `make stats` |
| Clean everything | `make clean` |

## Getting Help

- **Docker issues:** `docker-compose logs radiocalico`
- **Detailed docs:** Read `DOCKER.md`
- **Deployment help:** Check `DEPLOYMENT_CHECKLIST.md`
- **Configuration:** Edit `.env` and reference `.env.example`

## Production Deployment Steps

1. Copy `.env.example` → `.env`
2. Set `SECRET_KEY` (run `bash scripts/generate-secret-key.sh`)
3. Set `FLASK_ENV=production`
4. Run `make up-prod`
5. Verify at `http://localhost:3000`
6. Setup reverse proxy (nginx recommended)
7. Configure backups
8. Monitor logs

---

**Version:** 1.0  
**Last Updated:** August 2026
