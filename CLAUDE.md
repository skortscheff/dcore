# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Dcore is a containerized MSSP (Managed Security Service Provider) Service Delivery Platform — a knowledge and workflow system for managing clients, environments, products, change requests, exceptions, and evidence with ITIL/COBIT-aligned governance.

**Current status:** Phase 3 of 6 complete. No Alembic migrations yet — schema changes require manual SQL applied to the running DB.

## Services & Stack

8-container Docker Compose setup:

| Service | Tech | Role |
|---------|------|------|
| `frontend` | Next.js 14 / React 18 / Tailwind | App UI |
| `api` | FastAPI / Python 3.12 / SQLAlchemy 2.0 async | REST API |
| `db` | PostgreSQL 16 | Primary data store |
| `cache` | Redis 7 | Caching / queue |
| `search` | Meilisearch 1.7 | Full-text search |
| `storage` | MinIO | S3-compatible evidence file store |
| `auth` | Keycloak 24 | OIDC/OAuth2 identity provider |
| `proxy` | Traefik v3 | Reverse proxy / routing |

## Commands

### Full stack
```bash
bash setup.sh                        # First-time provisioning (auto-detects IP, generates secrets)
docker compose up --build -d         # Rebuild and start all services
docker compose down -v               # Full reset (destroys volumes)
docker compose logs -f api           # Tail service logs
```

### Schema drift (required after fresh DB start)
After `docker compose up`, manually apply any columns added after `init.sql`:
```bash
docker compose exec db psql -U dcore -d dcore
```
Then run the migration SQL documented in README.md under "Known Issues / Schema Drift".

### Seed demo data
```bash
docker compose exec api python -m app.seed
```

### Frontend (local dev without Docker)
```bash
cd services/frontend
npm run dev      # Dev server with hot reload
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (local dev without Docker)
```bash
cd services/api
uvicorn app.main:app --reload
```

## Architecture

### Request flow
```
Browser → Traefik → Next.js (SSR/pages)
                  → FastAPI (REST, /api/*)
                       → PostgreSQL (ORM: SQLAlchemy async)
                       → Meilisearch (search indexing on mutations)
                       → MinIO (evidence file uploads, presigned URLs)
                       → Keycloak (JWKS JWT verification)
```

### Backend structure (`services/api/app/`)
- `main.py` — FastAPI app factory; mounts all routers; configures CORS
- `core/config.py` — Pydantic Settings; reads env vars
- `core/database.py` — Async SQLAlchemy engine + session factory
- `core/auth.py` — JWKS JWT verification; role guards (`require_admin`, `require_editor`, `require_viewer`)
- `core/lifecycle.py` — Product lifecycle state machine (10 states, valid transitions)
- `core/audit.py` — Structured audit log helper (captures before/after entity state)
- `models/models.py` — ORM models: `Client`, `Environment`, `Product`, `Runbook`, `ChangeRequest`, `ExceptionRecord`, `EvidenceRecord`, `AuditLog`
- `schemas/schemas.py` — Pydantic v2 request/response schemas
- `routers/` — One file per resource; each router handles RBAC enforcement and audit logging
- `seed.py` — ITIL/COBIT-aligned demo data (3 clients, 6 environments, 12 products, …)

### Frontend structure (`services/frontend/src/`)
- `app/layout.tsx` — Root layout; wraps everything in `AuthProvider`
- `context/AuthContext.tsx` — Keycloak OIDC state (token, user, roles)
- `lib/api.ts` — Typed Axios client; attaches Bearer token to every request
- `components/AppLayout.tsx` — Shell: sidebar + header with global search
- `app/` — Next.js App Router pages mirroring API resources (clients, products, changes, runbooks, exceptions, evidence, audit)

### RBAC roles (enforced in API, sourced from Keycloak JWT)
- `viewer` — read-only
- `editor` — create/update
- `admin` — approve/reject/delete

### Key workflows
- **Change requests:** `draft → in_review → approved | rejected` (ITIL)
- **Product lifecycle:** 10-state machine defined in `core/lifecycle.py` (proposed → design → approved → build → deployment → operational → maintenance → at_risk → retiring → retired)
- **Evidence:** files uploaded to MinIO; API returns presigned download URLs
- **Audit log:** every mutation writes a record with actor, action, entity type, and before/after JSON state

## Service URLs (after deployment)
- Frontend: `http://<SERVER_HOST>/`
- API docs (Swagger): `http://<SERVER_HOST>/api/docs`
- Keycloak admin: `http://<SERVER_HOST>/auth`
- MinIO console: `http://<SERVER_HOST>:9001`
- Traefik dashboard: `http://<SERVER_HOST>:8080`

## Known Issues
- **No Alembic:** Schema migrations are raw SQL. Columns added post-`init.sql` must be applied manually on each fresh DB start. See README.md for the exact ALTER TABLE statements.
- **Meilisearch indexing:** Search index is populated via API mutations (not a background sync), so a freshly seeded DB requires touching records through the API to appear in search, or a manual re-index.
