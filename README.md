# Radio Calico

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
├── app/                    # Flask backend package
│   ├── __init__.py        # Flask app factory
│   ├── models.py          # SQLAlchemy ORM models (Rating)
│   └── api/
│       └── ratings.py     # Rating API endpoints
├── static/                # Frontend assets (Express serves)
│   ├── index.html         # Single-page app HTML
│   ├── css/main.css       # Stylesheet
│   └── js/
│       ├── main.js        # Core app logic
│       └── debug.js       # Debug utilities
├── migrations/            # Flask-Migrate database schema
├── instance/              # Runtime data (database, gitignored)
├── main.py                # Flask entry point
├── server.js              # Express entry point
└── CLAUDE.md              # Development guide
```

## Setup

### Install Dependencies

```bash
# Python backend
python -m pip install -e .
python -m pip install flask flask-migrate flask-sqlalchemy

# Node.js frontend
npm install
```

### Initialize Database

```bash
# First run only
python -m flask --app main db upgrade
```

### Run Development Servers

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

## Development

See `CLAUDE.md` for detailed development notes, database migrations, and production considerations.

## Requirements

- Python 3.14+
- Node.js 18+
- SQLite (included with Python)
