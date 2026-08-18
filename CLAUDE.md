# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a streaming radio app with a rating system. It's a two-tier full-stack app:

- **Frontend**: Nginx serves static HTML/CSS/JS and proxies API calls to Flask
- **Backend**: Flask API with SQLAlchemy ORM and PostgreSQL database

Both tiers run concurrently in a single container during development, with PostgreSQL in a separate container.

## Project Structure

```
radiocalico/
├── app/                          # Flask backend package
│   ├── __init__.py              # Flask app factory
│   ├── models.py                # SQLAlchemy ORM models (Rating)
│   └── api/
│       └── ratings.py           # Rating API endpoints
├── static/                       # Frontend assets (Express serves)
│   ├── index.html               # Single-page app HTML
│   ├── css/
│   │   └── main.css             # Complete stylesheet
│   └── js/
│       ├── main.js              # Core app logic
│       └── debug.js             # Debug utilities
├── migrations/                   # Flask-Migrate database schema
├── instance/                     # Runtime data (SQLite database if used, ignored in git)
├── nginx/                        # Nginx configuration
│   └── nginx.conf               # Nginx reverse proxy & static file server config
├── scripts/                      # Helper scripts
│   └── generate-secret-key.sh   # Generate secure Flask SECRET_KEY
├── .github/workflows/            # CI/CD pipeline
│   └── docker-build.yml         # Automated Docker build & test
├── main.py                       # Flask app entry point
├── pyproject.toml                # Python package config
├── Dockerfile                    # Multi-stage Docker build (dev & prod)
├── docker-compose.yml            # Development Docker Compose config
├── docker-compose.prod.yml       # Production Docker Compose config
├── docker-compose.prod-with-nginx.yml  # Production with nginx
├── docker-entrypoint.sh          # Container initialization script
├── .dockerignore                 # Docker build exclusions
├── .env.example                  # Environment variables template
├── Makefile                      # Simplified command interface
├── CLAUDE.md                     # This file
├── DOCKER.md                     # Comprehensive Docker guide
├── DOCKER_QUICK_START.md         # Docker quick reference
├── DEPLOYMENT_CHECKLIST.md       # Pre-deployment checklist
├── RadioCalico_Style_Guide.txt   # Brand style guide
├── RadioCalicoLogoTM.png         # Brand logo
└── RadioCalicoStyle.zip          # Styling assets
```

## Architecture

### Frontend (Nginx, port 80/3000)
- `nginx/nginx.conf` - Configuration. Serves static files from `static/` and proxies `/api/**` requests to Flask on port 5000
- `static/index.html` - Single-page app structure. Audio player, rating controls, metadata display
- `static/js/main.js` - Frontend logic. Handles HLS audio streaming (from CloudFront), metadata fetching, rating button interactions, recently-played list
- `static/css/main.css` - Styling (Radio Calico brand theme)

### Backend (Flask, port 5000)
- `main.py` - Entry point. Creates Flask app and runs on port 5000
- `app/__init__.py` - Flask app factory. Initializes SQLAlchemy, Flask-Migrate, and registers blueprints. Supports both PostgreSQL and SQLite via DATABASE_URL environment variable
- `app/models.py` - Single ORM model: `Rating` (tracks user thumbs-up/down ratings per track)
- `app/api/ratings.py` - REST endpoints:
  - `GET /api/ratings/<track_id>` - returns up/down counts + user's rating (by IP)
  - `POST /api/ratings/<track_id>` - submit or update rating; prevents duplicate same-rating submissions
  - `GET /api/ratings` - list all ratings (paginated or full dump)

### Database
- **Production**: PostgreSQL 16 (in separate container)
- **Development**: PostgreSQL 16 (in separate container) or SQLite (if DATABASE_URL not set)
- Schema managed by Flask-Migrate (see `migrations/` directory)
- Single table: `rating` with unique constraint on (track_id, user_ip) to enforce one rating per user per track

## Development Commands

### Option 1: Docker (Recommended)

The project is fully containerized with Docker for development and production deployments.

**Quick Start:**
```bash
# Create environment file
make env

# Start development containers (Flask + Nginx + PostgreSQL)
make up

# Access at http://localhost:3000
```

**Useful Commands:**
```bash
make build              # Build development image
make down               # Stop containers
make logs               # View container logs
make shell              # Enter container shell (radiocalico app)
make test               # Run pytest tests
make security           # Run all security scans (npm + pip)
make migrate            # Apply database migrations
make backup             # Backup PostgreSQL database
make db-shell           # Access PostgreSQL shell
make up-prod            # Start production containers
```

See `DOCKER.md` and `DOCKER_QUICK_START.md` for complete Docker documentation.

### Option 2: Local Installation (Advanced)

**Install Dependencies**
```bash
# Python backend
python -m pip install -e .
pip install flask flask-migrate flask-sqlalchemy psycopg2-binary
```

**Initialize Database (first run only)**
```bash
# For PostgreSQL development:
# 1. Create a PostgreSQL database (requires local PostgreSQL server)
# 2. Set DATABASE_URL environment variable: postgresql://user:password@localhost:5432/radiocalico
# 3. Run migrations:
python -m flask --app main db upgrade

# Or for SQLite (no server needed):
# Leave DATABASE_URL unset and use SQLite
mkdir -p instance
python -m flask --app main db upgrade
```

**Run Servers (requires nginx)**
```bash
# Terminal 1: Flask backend (port 5000)
python main.py

# Terminal 2: Nginx frontend (requires nginx installation on your system)
# On macOS: brew install nginx
# On Linux: apt-get install nginx
# Then start nginx with config: nginx -c $(pwd)/nginx/nginx.conf -p $(pwd)/
```
Then visit `http://localhost` in browser. Note: Local nginx setup is complex; Docker is recommended.

### Database Migrations
```bash
# Create a new migration after modifying app/models.py
python -m flask --app main db migrate -m "description of change"

# Apply pending migrations
python -m flask --app main db upgrade

# Revert to previous version (rollback)
python -m flask --app main db downgrade
```

### Security Scanning

Automated security scanning for known vulnerabilities in dependencies:

```bash
# Run all security scans (npm + Python)
make security

# Run npm audit (JavaScript/Node.js dependencies)
make security-npm

# Run pip-audit (Python dependencies)
make security-python
```

**What it does:**
- `npm audit` — Scans package.json for known JavaScript vulnerabilities, uses `--audit-level=moderate` to flag real issues
- `pip-audit` — Scans Python dependencies in requirements/installed packages for known CVEs
- Both exit with error codes if vulnerabilities are found, suitable for CI/CD gates

**Output example:**
```
✓ npm audit passed!
✓ pip-audit passed!
✓ All security scans completed!
```

### Linting / Formatting
Currently no linter configured. Consider adding:
- Python: `ruff` or `pylint`
- JavaScript: `eslint` with prettier

## Styling

Radio Calico brand assets and guidelines:
- `RadioCalico_Style_Guide.txt` - Official brand style guide (colors, typography, usage rules)
- `RadioCalicoLogoTM.png` - Brand logo (trademark)
- `RadioCalicoStyle.zip` - Styling assets package
- `static/css/main.css` - Applied frontend styles using Radio Calico brand theme

## Static Assets Structure

Frontend files are organized under `static/`:

### HTML
- `static/index.html` - Single-page app markup. Loads all external scripts and stylesheets

### CSS
- `static/css/main.css` - Complete stylesheet for Radio Calico brand theme and layout

### JavaScript
- `static/js/main.js` - Core application logic (audio player, metadata fetching, rating handlers)
- `static/js/debug.js` - Debug utilities (element access logging)

All CSS and JavaScript are externalized into separate files (no inline `<style>` or `<script>` tags in HTML).

## Key Dependencies
- **Backend**: Flask 3.1.3, Flask-SQLAlchemy 3.1.1, Flask-Migrate 4.1.0, psycopg2-binary 2.9.0
- **Database**: PostgreSQL 16 (production), SQLite (optional for development)
- **Frontend**: Nginx (reverse proxy + static file server), HLS.js (from CDN in index.html)
- **Server**: Gunicorn (production WSGI server for Flask)

## External APIs / Resources
- Metadata: `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json` (current track info)
- HLS stream: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8` (audio stream)

## Important Notes

### User IP Tracking for Ratings
The backend extracts user IP from `X-Forwarded-For` header (if present) or `remote_addr`. This is used to prevent duplicate ratings from the same user on the same track.

### Database Constraints
- `Rating.track_id` is indexed for fast lookups
- Unique constraint on (track_id, user_ip) prevents duplicate user ratings per track
- Attempting to re-rate with the same rating returns HTTP 409 Conflict

### Frontend-Backend Communication
- All API calls use `/api/**` prefix (Express proxies to Flask at `http://localhost:5000`)
- Rating button handlers fetch current counts from backend and submit changes via POST

## Testing
Currently no test suite. `test-buttons.js` appears to be an exploratory test file (not integrated).

## Environment
- Python 3.14+
- Node.js 18+ (inferred from package.json)
- SQLite (included with Python)

## Docker Deployment

Radio Calico is fully containerized for both development and production use.

### Docker Images
- **Development**: ~850MB (includes debug tools, test runners, live reload)
- **Production**: ~420MB (optimized for size, gunicorn WSGI server, non-root user)

### Quick Docker Commands
```bash
make env                 # Create .env file
make up                  # Start dev (http://localhost:3000)
make down                # Stop dev
make up-prod             # Start production
make backup              # Backup database
make restore FILE=...    # Restore from backup
make logs                # View container logs
```

### Deployment Options
1. **Simple** (default): `make up-prod` - Direct Express/Gunicorn on ports 3000/5000
2. **With Nginx** (recommended): Use `docker-compose.prod-with-nginx.yml` for reverse proxy, SSL/TLS, rate limiting
3. **Advanced**: Add PostgreSQL, Redis caching, load balancing (see `DOCKER.md`)

### Important Docker Files
- `Dockerfile` - Multi-stage build (development and production targets)
- `docker-compose.yml` - Development configuration with volume mounts
- `docker-compose.prod.yml` - Production configuration with resource limits
- `docker-entrypoint.sh` - Database initialization and server startup
- `Makefile` - 48 useful commands for building, running, testing, backing up
- `DOCKER.md` - Complete 200+ section Docker documentation
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification guide

### Docker Best Practices Implemented
- ✅ Multi-stage builds (separate dependencies from app code)
- ✅ Health checks on all containers
- ✅ Non-root user in production
- ✅ Resource limits and restart policies
- ✅ Automatic database migrations on startup
- ✅ Structured logging with rotation
- ✅ Volume persistence for database
- ✅ CI/CD pipeline with GitHub Actions

## Production Considerations
- Change `secret_key` in `app/__init__.py` before deploying (or generate with `bash scripts/generate-secret-key.sh`)
- Consider PostgreSQL or MySQL for production instead of SQLite
- Use `docker-compose.prod-with-nginx.yml` for SSL/TLS and reverse proxy
- Set up automated backups: `make backup-prod` (via cron)
- Monitor container health and logs
- Implement rate-limiting on `/api/ratings` endpoints (nginx config included)
- See `DEPLOYMENT_CHECKLIST.md` for full pre-deployment verification
