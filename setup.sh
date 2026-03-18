#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
CYAN="\033[36m"
RESET="\033[0m"

info()    { echo -e "${CYAN}${BOLD}[dcore]${RESET} $*"; }
success() { echo -e "${GREEN}${BOLD}[dcore]${RESET} $*"; }
warn()    { echo -e "${YELLOW}${BOLD}[dcore]${RESET} $*"; }
error()   { echo -e "${RED}${BOLD}[dcore]${RESET} $*"; exit 1; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       Dcore — Setup Script           ║${RESET}"
echo -e "${BOLD}║  MSSP Service Delivery Platform      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Prerequisite checks ─────────────────────────────────────────────────────

info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  error "Docker is not installed. Install it from https://docs.docker.com/get-docker/ and re-run this script."
fi

info "Docker found: $(docker --version)"

if ! docker compose version &>/dev/null; then
  error "Docker Compose plugin not found. Install it: https://docs.docker.com/compose/install/"
fi

info "Docker Compose found: $(docker compose version)"

if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Please start Docker and re-run this script."
fi

success "All prerequisites met."
echo ""

# ── 2. Detect server host ──────────────────────────────────────────────────────

SERVER_HOST=$(hostname -I | awk '{print $1}')
info "Detected server host: ${SERVER_HOST}"
echo ""

# ── 3. Environment file ────────────────────────────────────────────────────────

gen_secret() {
  python3 -c "import secrets; print(secrets.token_urlsafe($1))" 2>/dev/null \
    || openssl rand -base64 "$1" | tr -d '\n/+=' | head -c "$1"
}

if [ -f ".env" ]; then
  warn ".env already exists — skipping generation. Delete it and re-run to regenerate secrets."
  # Always update SERVER_HOST in case the server IP changed
  if grep -q "^SERVER_HOST=" .env; then
    sed -i "s|^SERVER_HOST=.*|SERVER_HOST=${SERVER_HOST}|" .env
  else
    echo "SERVER_HOST=${SERVER_HOST}" >> .env
  fi
  info "SERVER_HOST updated to ${SERVER_HOST} in .env"
else
  info "Generating .env with secure random secrets..."
  cat > .env <<EOF
# Server
SERVER_HOST=${SERVER_HOST}

# Postgres
POSTGRES_USER=dcore
POSTGRES_PASSWORD=$(gen_secret 32)
POSTGRES_DB=dcore

# Redis
REDIS_PASSWORD=$(gen_secret 32)

# Meilisearch
MEILI_MASTER_KEY=$(gen_secret 40)

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=$(gen_secret 24)
KEYCLOAK_REALM=dcore
KEYCLOAK_CLIENT_ID=dcore-api

# MinIO
MINIO_ROOT_USER=dcore_minio
MINIO_ROOT_PASSWORD=$(gen_secret 32)

# API
SECRET_KEY=$(gen_secret 48)
EOF
  success ".env created with secure secrets."
fi
echo ""

# ── 4. Build and start containers ─────────────────────────────────────────────

info "Building images and starting services (this may take a few minutes on first run)..."
docker compose up --build -d
echo ""

# ── 5. Wait for all services to be healthy ────────────────────────────────────

SERVICES=("dcore_db" "dcore_cache" "dcore_search" "dcore_storage")
TIMEOUT=120
info "Waiting for core services to become healthy (timeout: ${TIMEOUT}s)..."

for SERVICE in "${SERVICES[@]}"; do
  ELAPSED=0
  printf "  %-20s" "$SERVICE"
  while true; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$SERVICE" 2>/dev/null || echo "missing")
    if [ "$STATUS" = "healthy" ]; then
      echo -e " ${GREEN}healthy${RESET}"
      break
    elif [ "$ELAPSED" -ge "$TIMEOUT" ]; then
      echo -e " ${RED}timed out${RESET}"
      warn "Service $SERVICE did not become healthy in time. Check logs: docker compose logs $SERVICE"
      break
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    printf "."
  done
done

echo ""
info "Waiting for API and frontend to be ready..."
sleep 8

# ── 6. Summary ────────────────────────────────────────────────────────────────

KEYCLOAK_PASS=$(grep KEYCLOAK_ADMIN_PASSWORD .env | cut -d= -f2)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║           Dcore is ready!                            ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Platform          ${GREEN}http://${SERVER_HOST}${RESET}"
echo -e "${BOLD}║${RESET}  API (Swagger)      ${GREEN}http://${SERVER_HOST}/api/docs${RESET}"
echo -e "${BOLD}║${RESET}  Keycloak Admin     ${GREEN}http://${SERVER_HOST}/auth${RESET}"
echo -e "${BOLD}║${RESET}  MinIO Console      ${GREEN}http://${SERVER_HOST}:9001${RESET}"
echo -e "${BOLD}║${RESET}  Traefik Dashboard  ${GREEN}http://${SERVER_HOST}:8080${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Seed users (Keycloak realm: dcore)"
echo -e "${BOLD}║${RESET}  ${CYAN}admin-user${RESET}   /  admin123   (Admin)"
echo -e "${BOLD}║${RESET}  ${CYAN}editor-user${RESET}  /  editor123  (Editor)"
echo -e "${BOLD}║${RESET}  ${CYAN}viewer-user${RESET}  /  viewer123  (Viewer)"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Keycloak admin:    admin / ${YELLOW}${KEYCLOAK_PASS}${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Stop:    ${BOLD}docker compose down${RESET}"
echo -e "  Logs:    ${BOLD}docker compose logs -f${RESET}"
echo -e "  Restart: ${BOLD}docker compose restart${RESET}"
echo ""
