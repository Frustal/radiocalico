# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a streaming radio app with a rating system. It's a two-tier full-stack app:

- **Frontend**: Express.js (Node.js) serves static HTML/CSS/JS and proxies API calls
- **Backend**: Flask API with SQLAlchemy ORM and SQLite database

Both tiers run concurrently during development (see "Development Commands" below).

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
├── instance/                     # Runtime data (database, ignored in git)
│   └── radiocalico.db           # SQLite database
├── main.py                       # Flask app entry point
├── server.js                     # Express.js entry point
├── package.json                  # Node.js dependencies
├── pyproject.toml                # Python package config
├── CLAUDE.md                     # This file
├── RadioCalico_Style_Guide.txt   # Brand style guide
├── RadioCalicoLogoTM.png         # Brand logo
└── RadioCalicoStyle.zip          # Styling assets
```

## Architecture

### Frontend (Express.js, port 3000)
- `server.js` - Entry point. Serves static files from `static/` and proxies `/api/**` requests to Flask
- `static/index.html` - Single-page app structure. Audio player, rating controls, metadata display
- `static/js/main.js` - Frontend logic. Handles HLS audio streaming (from CloudFront), metadata fetching, rating button interactions, recently-played list
- `static/css/main.css` - Styling (Radio Calico brand theme)

### Backend (Flask, port 5000)
- `main.py` - Entry point. Creates Flask app and runs on port 5000
- `app/__init__.py` - Flask app factory. Initializes SQLAlchemy, Flask-Migrate, and registers blueprints
- `app/models.py` - Single ORM model: `Rating` (tracks user thumbs-up/down ratings per track)
- `app/api/ratings.py` - REST endpoints:
  - `GET /api/ratings/<track_id>` - returns up/down counts + user's rating (by IP)
  - `POST /api/ratings/<track_id>` - submit or update rating; prevents duplicate same-rating submissions
  - `GET /api/ratings` - list all ratings (paginated or full dump)

### Database
- SQLite file: `instance/radiocalico.db` (created at runtime if missing)
- Schema managed by Flask-Migrate (see `migrations/` directory)
- Single table: `rating` with unique constraint on (track_id, user_ip) to enforce one rating per user per track

## Development Commands

### Install Dependencies
```bash
# Python backend
python -m pip install -e .
python -m pip install flask flask-migrate flask-sqlalchemy

# Node.js frontend
npm install
```

### Initialize Database (first run only)
```bash
# Create instance/ dir and init database schema
python -m flask --app main db upgrade
```

### Run Both Servers (concurrent)
```bash
# Terminal 1: Flask backend (port 5000)
python main.py

# Terminal 2: Express.js frontend (port 3000)
npm start& - to run in the background
```
Then visit `http://localhost:3000` in browser.

### Database Migrations
```bash
# Create a new migration after modifying app/models.py
python -m flask --app main db migrate -m "description of change"

# Apply pending migrations
python -m flask --app main db upgrade

# Revert to previous version (rollback)
python -m flask --app main db downgrade
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
- **Backend**: Flask 3.1.3, Flask-SQLAlchemy 3.1.1, Flask-Migrate 4.1.0
- **Frontend**: Express 5.2.1, http-proxy-middleware 4.1.1
- **Audio**: HLS.js (from CDN in index.html)

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

## Production Considerations
- Change `secret_key` in `app/__init__.py` before deploying
- Migrate to PostgreSQL or MySQL for production
- Add request logging / monitoring
- Implement rate-limiting on `/api/ratings` endpoints to prevent abuse
