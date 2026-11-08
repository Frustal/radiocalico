# Radio Calico Copy

Project based on Udemy course https://www.udemy.com/course/anthropic-claude-code/?couponCode=25BBPMXINACTIVE

A streaming radio application with an integrated rating system. Users can listen to live HLS audio streams, view track metadata, and rate songs with thumbs-up/down voting.

## Architecture

Two-tier full-stack app:

- **Frontend** (Node.js): Express.js serves static HTML/CSS/JS and proxies API calls to Flask
- **Backend** (Python): Flask REST API with SQLAlchemy ORM and SQLite database

## Stack

- **Frontend**: Express.js 5, HLS.js (audio), Vanilla JavaScript
- **Backend**: Flask 3.1, Flask-SQLAlchemy, Flask-Migrate
- **Database**: SQLite
- **Styling**: Radio Calico brand theme

## Project Structure

```
radiocalico/
├── app/                              # Flask backend package
│   ├── __init__.py                  # Flask app factory
│   ├── models.py                    # SQLAlchemy ORM models (Rating)
│   └── api/
│       └── ratings.py               # Rating API endpoints
├── static/                           # Frontend assets (Express serves)
│   ├── index.html                   # Single-page app HTML
│   ├── css/main.css                 # Stylesheet
│   └── js/
│       ├── main.js                  # Core app logic
│       └── debug.js                 # Debug utilities
├── migrations/                       # Flask-Migrate database schema
├── instance/                         # Runtime data (database, gitignored)
├── nginx/                            # Nginx reverse proxy (production)
├── scripts/                          # Helper scripts
├── .github/workflows/                # CI/CD pipeline
├── main.py                           # Flask entry point
├── server.js                         # Express entry point
├── Dockerfile                        # Multi-stage Docker build
├── docker-compose.yml                # Development Docker setup
├── docker-compose.prod.yml           # Production Docker setup
├── docker-compose.prod-with-nginx.yml # Production with nginx
├── docker-entrypoint.sh              # Container startup script
├── .dockerignore                     # Docker build exclusions
├── .env.example                      # Environment variables template
├── Makefile                          # Simplified command interface
├── CLAUDE.md                         # Development guide
├── DOCKER.md                         # Comprehensive Docker guide
├── DOCKER_QUICK_START.md             # Docker quick reference
└── DEPLOYMENT_CHECKLIST.md           # Pre-deployment verification
```

## Setup

### Option 1: Docker (Recommended)

Fully containerized with development and production support.

```bash
# Create environment configuration
cp .env.example .env

# Start development environment
make env
make up

# Access at http://localhost:3000
```

**Useful Docker Commands:**
```bash
make down               # Stop containers
make logs               # View logs
make shell              # Access container shell
make test               # Run tests
make backup             # Backup database
make up-prod            # Production deployment
make restore FILE=...   # Restore from backup
```

See `DOCKER.md` and `DOCKER_QUICK_START.md` for comprehensive documentation.

### Option 2: Local Installation

**Install Dependencies**
```bash
# Python backend
python -m pip install -e .
python -m pip install flask flask-migrate flask-sqlalchemy

# Node.js frontend
npm install
```

**Initialize Database**
```bash
# First run only
python -m flask --app main db upgrade
```

**Run Development Servers**
```bash
# Terminal 1: Flask backend (port 5000)
python main.py

# Terminal 2: Express frontend (port 3000)
npm start
```

Visit `http://localhost:3000` in your browser.

## API Endpoints

### Get Rating Counts

```
GET /api/ratings/<track_id>
```

Returns rating counts and current user's rating (tracked by IP).

### Submit Rating

```
POST /api/ratings/<track_id>
Content-Type: application/json

{"rating": "up"}  // or "down"
```

### List All Ratings

```
GET /api/ratings
```

## External Resources

- **Metadata**: `https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json`
- **HLS Stream**: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`

## Docker

Radio Calico is fully containerized for development and production deployments.

### Images
- **Development**: ~850MB (includes test runners, debug tools, live reload)
- **Production**: ~420MB (optimized, Gunicorn WSGI server, non-root user)

### Deployment Options
1. **Simple** (default): `make up-prod` - Direct Express/Gunicorn
2. **With Nginx** (recommended): Production-grade with SSL/TLS, rate limiting, static optimization
3. **Advanced**: PostgreSQL, Redis, multi-instance load balancing (see `DOCKER.md`)

### Key Files
- `Dockerfile` - Multi-stage build (dev & prod targets)
- `docker-compose.yml` - Development with volume mounts
- `docker-compose.prod.yml` - Production with resource limits
- `Makefile` - 48 commands for building, running, testing, backing up
- `DOCKER.md` - Comprehensive Docker documentation (200+ sections)
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment verification guide

See `DOCKER_QUICK_START.md` for 5-minute quick start guide.

## Development

See `CLAUDE.md` for detailed development notes, database migrations, and production considerations.

## Requirements

### For Docker
- Docker 20.10+
- Docker Compose 2.0+

### For Local Installation
- Python 3.14+
- Node.js 18+
- SQLite (included with Python)
