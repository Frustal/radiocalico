# Multi-stage Dockerfile for Radio Calico
# Supports both development and production builds

# ============================================================================
# Stage 1: Python dependencies builder
# ============================================================================
FROM python:3.14-slim AS python-builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Python project files
COPY pyproject.toml .

# Install Python dependencies into a venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel && \
    pip install -e .

# ============================================================================
# Stage 2: Node.js dependencies builder
# ============================================================================
FROM node:22-alpine AS node-builder

WORKDIR /build

COPY package*.json ./

RUN npm install --omit=dev

# ============================================================================
# Stage 3: Development image
# ============================================================================
FROM python:3.14-slim AS development

WORKDIR /app

# Install runtime dependencies + development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (NodeSource, Debian's apt package is too old for current jsdom/undici)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy Python venv from builder
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    FLASK_ENV=development \
    FLASK_APP=main.py

# Copy Node.js dependencies from builder
COPY --from=node-builder /build/node_modules /app/node_modules
COPY package*.json ./

# Copy application source
COPY . .

# Install additional dev dependencies for Python
RUN pip install --upgrade pip && \
    pip install pytest flask-testing watchdog[watchmedo]

# Install dev dependencies for Node.js
RUN npm install

# Expose ports
EXPOSE 3000 5000

# Create instance directory for database
RUN mkdir -p instance

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["dev"]

# ============================================================================
# Stage 4: Production image
# ============================================================================
FROM python:3.14-slim AS production

WORKDIR /app

# Install runtime dependencies only (no dev tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (NodeSource, Debian's apt package is too old for current jsdom/undici)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy Python venv from builder
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    FLASK_ENV=production

# Copy Node.js dependencies from builder
COPY --from=node-builder /build/node_modules /app/node_modules
COPY package*.json ./

# Copy application source (production-only files)
COPY . .

# Remove development files
RUN rm -rf .git .gitignore pytest.ini test-*.js

# Install gunicorn for production Flask serving
RUN pip install gunicorn

# Create instance directory for database
RUN mkdir -p instance

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Entrypoint script
COPY --chown=appuser:appuser docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["prod"]
