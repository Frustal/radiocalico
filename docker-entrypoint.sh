#!/bin/bash
set -e

MODE=${1:-dev}

echo "Starting Radio Calico in $MODE mode..."

# Initialize database if needed
if [ ! -f "instance/radiocalico.db" ]; then
    echo "Initializing database..."
    python -m flask --app main db upgrade
fi

if [ "$MODE" = "dev" ]; then
    echo "Running development servers..."

    # Run Flask in the background with auto-reload
    python main.py &
    FLASK_PID=$!

    # Run Express.js in the foreground
    npm start

    # Keep Flask process alive
    wait $FLASK_PID

elif [ "$MODE" = "prod" ]; then
    echo "Running production servers..."

    # Run gunicorn for Flask in the background
    gunicorn \
        --workers 4 \
        --worker-class sync \
        --bind 0.0.0.0:5000 \
        --access-logfile - \
        --error-logfile - \
        main:app &
    GUNICORN_PID=$!

    # Run Express.js in the foreground with increased concurrency
    NODE_ENV=production npm start

    # Keep Gunicorn process alive
    wait $GUNICORN_PID

else
    echo "Unknown mode: $MODE"
    echo "Usage: docker-entrypoint.sh [dev|prod]"
    exit 1
fi
