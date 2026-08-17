#!/bin/bash
set -e

MODE=${1:-dev}

echo "Starting Radio Calico in $MODE mode..."

# Initialize database (works with both SQLite and PostgreSQL)
if [ -z "$DATABASE_URL" ]; then
    # Using SQLite - check if database file exists
    if [ ! -f "instance/radiocalico.db" ]; then
        echo "Initializing SQLite database..."
        python -m flask --app main db upgrade
    fi
else
    # Using PostgreSQL - wait for database and apply migrations
    echo "Waiting for database to be ready..."
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if python -c "from app import create_app, db; app = create_app(); app.app_context().push()" 2>/dev/null; then
            echo "Database is ready!"
            break
        fi
        attempt=$((attempt + 1))
        echo "Database not ready yet... (attempt $attempt/$max_attempts)"
        sleep 1
    done

    if [ $attempt -eq $max_attempts ]; then
        echo "ERROR: Database failed to become ready after $max_attempts attempts"
        exit 1
    fi

    echo "Applying database migrations..."
    python -m flask --app main db upgrade
fi

# Start nginx in the background
echo "Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

if [ "$MODE" = "dev" ]; then
    echo "Running development server..."

    # Run Flask with auto-reload in the foreground
    python main.py

elif [ "$MODE" = "prod" ]; then
    echo "Running production server..."

    # Run gunicorn for Flask in the foreground
    exec gunicorn \
        --workers 4 \
        --worker-class sync \
        --bind 0.0.0.0:5000 \
        --access-logfile - \
        --error-logfile - \
        main:app

else
    echo "Unknown mode: $MODE"
    echo "Usage: docker-entrypoint.sh [dev|prod]"
    exit 1
fi
