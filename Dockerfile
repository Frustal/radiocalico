# Multi-stage Dockerfile for Radio Calico
# Backend: Flask (Python) with PostgreSQL support
# Frontend: Nginx (reverse proxy + static file server)

# ============================================================================
# Stage 1: Python dependencies builder
# ============================================================================
FROM python:3.14-slim AS python-builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Python project files
COPY pyproject.toml .

# Install Python dependencies into a venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel && \
    pip install -e .

# ============================================================================
# Stage 2: Development image
# ============================================================================
FROM python:3.14-slim AS development

WORKDIR /app

# Install runtime dependencies + development tools + nginx + Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    gnupg \
    make \
    nginx \
    nodejs \
    npm \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python venv from builder
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    FLASK_ENV=development \
    FLASK_APP=main.py

# Copy application source
COPY . .

# Install additional dev dependencies for Python
RUN pip install --upgrade pip && \
    pip install pytest flask-testing watchdog[watchmedo] pip-audit

# Copy and configure nginx
COPY nginx/nginx.conf /etc/nginx/sites-available/default
RUN mkdir -p /var/log/nginx /var/cache/nginx && \
    chown -R www-data:www-data /var/log/nginx /var/cache/nginx

# Create instance directory for SQLite (if used)
RUN mkdir -p instance

# Expose ports
EXPOSE 80 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dev"]

# ============================================================================
# Stage 3: Production image
# ============================================================================
FROM python:3.14-slim AS production

WORKDIR /app

# Install runtime dependencies only (nginx + PostgreSQL client)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    nginx \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python venv from builder
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    FLASK_ENV=production

# Copy application source (production-only files)
COPY . .

# Remove development files
RUN rm -rf .git .gitignore pytest.ini test-*.js server.js package.json node_modules

# Install gunicorn for production Flask serving
RUN pip install gunicorn

# Copy and configure nginx
COPY nginx/nginx.conf /etc/nginx/sites-available/default
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/lib/nginx/body /var/lib/nginx/fastcgi /var/lib/nginx/proxy /var/lib/nginx/scgi /var/lib/nginx/uwsgi

# Create instance directory for SQLite (if used)
RUN mkdir -p instance

# Create non-root user for Flask
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Expose ports
EXPOSE 80 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Entrypoint script
COPY --chown=appuser:appuser docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["prod"]
