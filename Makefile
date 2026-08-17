.PHONY: help build up down logs shell test migrate backup restore

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)Radio Calico Docker Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make build              - Build development image"
	@echo "  make up                 - Start development containers"
	@echo "  make down               - Stop development containers"
	@echo "  make logs               - View development logs"
	@echo "  make shell              - Access container shell"
	@echo "  make test               - Run all tests"
	@echo "  make migrate            - Run database migrations"
	@echo ""
	@echo "$(GREEN)Production Commands:$(NC)"
	@echo "  make build-prod         - Build production image"
	@echo "  make up-prod            - Start production containers"
	@echo "  make down-prod          - Stop production containers"
	@echo "  make logs-prod          - View production logs"
	@echo "  make shell-prod         - Access production container shell"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make backup             - Backup development database"
	@echo "  make restore            - Restore development database"
	@echo "  make backup-prod        - Backup production database"
	@echo "  make restore-prod       - Restore production database"
	@echo "  make db-shell           - Access database shell"
	@echo ""
	@echo "$(GREEN)Utility Commands:$(NC)"
	@echo "  make clean              - Remove containers and volumes"
	@echo "  make prune              - Clean up unused Docker resources"
	@echo "  make env                - Create .env file from template"

# Development targets
env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file. Edit it for your configuration.$(NC)"; \
	else \
		echo "$(RED).env already exists$(NC)"; \
	fi

build:
	@echo "$(BLUE)Building development image...$(NC)"
	docker-compose build

up: build
	@echo "$(BLUE)Starting development containers...$(NC)"
	docker-compose up

down:
	@echo "$(BLUE)Stopping development containers...$(NC)"
	docker-compose down

logs:
	docker-compose logs -f radiocalico

shell:
	docker-compose exec radiocalico bash

test:
	@echo "$(BLUE)Running tests...$(NC)"
	docker-compose exec radiocalico npm test
	docker-compose exec radiocalico pytest

migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	docker-compose exec radiocalico python -m flask --app main db upgrade

# Production targets
build-prod:
	@echo "$(BLUE)Building production image...$(NC)"
	docker-compose -f docker-compose.prod.yml build

up-prod: build-prod
	@echo "$(BLUE)Starting production containers...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Production containers started!$(NC)"
	@echo "$(BLUE)View logs with: make logs-prod$(NC)"

down-prod:
	@echo "$(BLUE)Stopping production containers...$(NC)"
	docker-compose -f docker-compose.prod.yml down

logs-prod:
	docker-compose -f docker-compose.prod.yml logs -f radiocalico

shell-prod:
	docker-compose -f docker-compose.prod.yml exec radiocalico bash

# Database backup/restore
backup:
	@echo "$(BLUE)Backing up development database...$(NC)"
	@mkdir -p ./backups
	docker-compose exec -T radiocalico tar czf - instance/radiocalico.db | gzip > ./backups/backup-dev-$(shell date +%Y%m%d-%H%M%S).tar.gz
	@echo "$(GREEN)Backup created in ./backups/$(NC)"

restore:
	@echo "$(RED)Restore will overwrite existing database!$(NC)"
	@read -p "Continue? [y/N] " confirm && [ "$${confirm}" = "y" ] || exit 1
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Usage: make restore BACKUP_FILE=./backups/backup-*.tar.gz$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring from $(BACKUP_FILE)...$(NC)"
	tar xzf $(BACKUP_FILE) -C /tmp/
	docker cp /tmp/instance/radiocalico.db radiocalico-dev:/app/instance/
	docker-compose restart radiocalico
	@echo "$(GREEN)Database restored!$(NC)"

backup-prod:
	@echo "$(BLUE)Backing up production database...$(NC)"
	@mkdir -p ./backups
	docker-compose -f docker-compose.prod.yml exec -T radiocalico tar czf - instance/radiocalico.db | gzip > ./backups/backup-prod-$(shell date +%Y%m%d-%H%M%S).tar.gz
	@echo "$(GREEN)Backup created in ./backups/$(NC)"

restore-prod:
	@echo "$(RED)This will overwrite production database!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$${confirm}" = "yes" ] || exit 1
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Usage: make restore-prod BACKUP_FILE=./backups/backup-*.tar.gz$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring production from $(BACKUP_FILE)...$(NC)"
	tar xzf $(BACKUP_FILE) -C /tmp/
	docker cp /tmp/instance/radiocalico.db radiocalico-prod:/app/instance/
	docker-compose -f docker-compose.prod.yml restart radiocalico
	@echo "$(GREEN)Production database restored!$(NC)"

db-shell:
	docker-compose exec radiocalico sqlite3 instance/radiocalico.db

# Utility targets
clean:
	@echo "$(RED)Removing containers and volumes...$(NC)"
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	@echo "$(GREEN)Cleanup complete$(NC)"

prune:
	@echo "$(RED)Pruning Docker system...$(NC)"
	docker system prune -a --volumes -f
	@echo "$(GREEN)Prune complete$(NC)"

ps:
	@echo "$(BLUE)Development containers:$(NC)"
	docker-compose ps
	@echo ""
	@echo "$(BLUE)Production containers:$(NC)"
	docker-compose -f docker-compose.prod.yml ps

stats:
	docker stats radiocalico

version:
	@echo "Docker version:"
	docker --version
	@echo "Docker Compose version:"
	docker-compose --version
