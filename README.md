# Dcore — MSSP Service Delivery Platform

A containerised service delivery platform for Managed Security Service Provider (MSSP) teams. Tracks clients, environments, products, runbooks, change requests, exceptions, and evidence across the full service lifecycle with ITIL/COBIT-aligned workflows, role-based access control, and a tamper-evident audit trail.

**Current status:** Phase 3 complete — full UI with create/edit forms, inline client/product editing, auto-generated record IDs, quick-action shortcuts, ITIL change workflow, COBIT exception tracking, evidence upload, global search, and COBIT/ITIL-aligned demo data.

---

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- [Docker Engine](https://docs.docker.com/engine/install/) with the Docker Compose plugin
- Docker daemon must be running before executing the setup script
- No other dependencies required — everything runs inside containers

---

## Quick Start

```bash
bash setup.sh
```

The script will:
1. Check that Docker and Docker Compose are available and the daemon is running
2. Generate secure random secrets for all services (Postgres password, Keycloak admin password, MinIO credentials, Redis password)
3. Write a `.env` file with all generated values
4. Build and start all 8 containers in detached mode
5. Poll each core service until it is healthy (up to ~3 minutes)
6. Print a summary of all service URLs and the seed login credentials

---

## Service URLs

Once setup completes all services are available on the server IP / hostname:

| Service | URL |
|---|---|
| Frontend (Next.js) | http://\<SERVER_HOST\> |
| API (Swagger docs) | http://\<SERVER_HOST\>/api/docs |
| Keycloak Admin Console | http://\<SERVER_HOST\>/auth |
| MinIO Console | http://\<SERVER_HOST\>:9001 |
| Traefik Dashboard | http://\<SERVER_HOST\>:8080 |

---

## Seed Credentials

Three users are pre-created in the `dcore` Keycloak realm:

| Username | Password | Role |
|---|---|---|
| `admin-user` | `admin123` | Admin (full access) |
| `editor-user` | `editor123` | Editor (create / update) |
| `viewer-user` | `viewer123` | Viewer (read-only) |

Keycloak admin console credentials are printed by the setup script at the end (randomly generated per install).

---

## Loading Demo Data

After all services are healthy, apply the schema migrations and seed the database with COBIT/ITIL-aligned demo data:

```bash
docker compose exec db psql -U dcore -d dcore -c "
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS itil_category varchar(64);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS approved_by varchar(255);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE exception_records ADD COLUMN IF NOT EXISTS cobit_control varchar(64);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS file_name varchar(255);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS mime_type varchar(128);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS cobit_control varchar(64);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS itil_process varchar(128);
"
docker compose exec api python -m app.seed
```

Expected output:

```
✓ Demo data seeded successfully
  Clients:    3
  Envs:       6
  Products:   12
  Runbooks:   3
  Changes:    4
  Exceptions: 5
  Evidence:   6

Notable demo scenarios:
  - Payment Gateway is DEGRADED (active incident simulation)
  - SIEM is AT_RISK (license expiry in 45 days)
  - IBM Sterling EDI Gateway is RETIRING (decommission in progress)
  - MuleSoft is in BUILD/DEPLOYMENT lifecycle states
  - EXC-ACME-0009 is EXPIRED (TLS 1.1 exception, 10 days past expiry)
  - EXC-CIVIC-0002 expires in 15 days (warning threshold)
  - CHG-ACME-0041 is APPROVED with approver stamp
  - CHG-ACME-0042 / CHG-CIVIC-0009 are IN_REVIEW (pending approval)
```

The seeder is safe to run repeatedly — it truncates and re-inserts all demo records on each run.

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Traefik v3 (proxy)         │
                        │        Port 80 / 443 + :8080         │
                        └───────┬───────────────┬─────────────┘
                                │               │
               ┌────────────────┘               └────────────────┐
               ▼                                                  ▼
   ┌───────────────────────┐                      ┌──────────────────────────┐
   │  Next.js 14 Frontend  │                      │  FastAPI Backend (API)   │
   │  TypeScript / Tailwind│                      │  Python 3.12 / Pydantic  │
   │  App Router           │◄────── REST ─────────│  AsyncSQLAlchemy         │
   │  Keycloak OIDC client │                      │  JWKS JWT verification   │
   └───────────────────────┘                      └────────┬─────────────────┘
                                                           │
               ┌───────────────────────────────────────────┼──────────────────┐
               │                         │                 │                  │
               ▼                         ▼                 ▼                  ▼
   ┌────────────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
   │  PostgreSQL 16     │  │  Keycloak 24     │  │  Redis 7     │  │  Meilisearch 1.7│
   │  Primary data store│  │  Identity / OIDC │  │  Cache/queue │  │  Full-text search│
   └────────────────────┘  └──────────────────┘  └──────────────┘  └─────────────────┘
                                                                    ┌─────────────────┐
                                                                    │  MinIO          │
                                                                    │  S3-compatible  │
                                                                    │  Evidence store │
                                                                    └─────────────────┘
```

### Domain Model

```
Client
  └── Environment  (e.g. ACME-PROD, ACME-DR)
        └── Product  (lifecycle state + health status)
              ├── Runbooks       (trigger / steps / rollback / escalation)
              ├── Change Requests  (ITIL workflow: draft → in_review → approved/rejected)
              ├── Exceptions     (COBIT control ref + expiry tracking)
              └── Evidence       (files stored in MinIO, presigned download)
```

All mutating operations write a structured entry to the `audit_logs` table, capturing the actor, action, and before/after state.

### Role Hierarchy

| Role | Permissions |
|---|---|
| `viewer` | Read all resources, download evidence, view audit log |
| `editor` | All viewer permissions + create, update, submit changes |
| `admin` | All editor permissions + approve/reject changes, delete records |

---

## Frontend Pages

| Route | Description |
|---|---|
| `/clients` | Client list |
| `/clients/new` | Create client form |
| `/clients/[id]` | Client detail + environment/product tree + inline client edit |
| `/products/[id]` | Product detail with lifecycle transitions, inline edit form, and quick-action shortcuts |
| `/changes` | Change request list |
| `/changes/new` | Create change request form (supports `?product_id=` pre-fill) |
| `/runbooks` | Runbook list |
| `/runbooks/new` | Create runbook form (supports `?product_id=` pre-fill) |
| `/exceptions` | Exception list with expiry alerts |
| `/exceptions/new` | Create exception record form (supports `?product_id=` pre-fill) |
| `/evidence` | Evidence record list |
| `/evidence/upload` | Upload evidence file form (supports `?product_id=` pre-fill) |
| `/audit` | Audit log viewer with filters |

The sidebar provides navigation across all sections. A debounced global search bar in the header queries Meilisearch and returns matching clients and products with instant navigation.

---

## API Endpoints

All endpoints are prefixed `/api` and documented interactively at `/api/docs`.

### Clients — `/api/clients`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List all clients |
| POST | `/` | editor | Create a client |
| GET | `/{id}` | viewer | Get client by ID |
| PATCH | `/{id}` | editor | Update client fields |
| DELETE | `/{id}` | admin | Delete client (cascades) |

### Environments — `/api/environments`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List environments (filter by `client_id`) |
| POST | `/` | editor | Create an environment |
| GET | `/{id}` | viewer | Get environment by ID |
| PATCH | `/{id}` | editor | Update environment |
| DELETE | `/{id}` | admin | Delete environment (cascades) |

### Products — `/api/products`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List products (filter by `environment_id`) |
| GET | `/next-id?environment_id=` | viewer | Generate next record ID for an environment |
| POST | `/` | editor | Create a product |
| GET | `/{id}` | viewer | Get product by ID |
| PATCH | `/{id}` | editor | Update product fields |
| POST | `/{id}/transition` | editor | Transition lifecycle state |
| DELETE | `/{id}` | admin | Delete product (cascades) |

**Lifecycle states:** `proposed` → `design` → `approved` → `build` → `deployment` → `operational` → `maintenance` → `at_risk` → `retiring` → `retired`

**Health statuses:** `healthy` / `degraded` / `at_risk` / `unsupported`

### Runbooks — `/api/runbooks`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List runbooks (filter by `product_id`) |
| POST | `/` | editor | Create a runbook |
| GET | `/{id}` | viewer | Get runbook by ID |
| PATCH | `/{id}` | editor | Update runbook |
| DELETE | `/{id}` | admin | Delete runbook |

### Change Requests — `/api/changes`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List change requests (filter by `product_id`) |
| GET | `/next-id?client_id=` | viewer | Generate next record ID for a client |
| POST | `/` | editor | Create a change request |
| GET | `/{id}` | viewer | Get change request by ID |
| PATCH | `/{id}` | editor | Update a draft change request |
| POST | `/{id}/submit` | editor | Submit draft for review (`draft` → `in_review`) |
| POST | `/{id}/approve` | admin | Approve a change under review (`in_review` → `approved`) |
| POST | `/{id}/reject` | admin | Reject a change back to draft (`in_review` → `draft`) |
| DELETE | `/{id}` | admin | Delete change request |

**ITIL categories:** `Normal`, `Standard`, `Emergency`

Approve and reject actions record `approved_by` (username) and `approved_at` (timestamp). An optional `comment` field is accepted in the request body for both actions.

### Exceptions — `/api/exceptions`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List exceptions (`product_id`, `expiring_within_days` filters) |
| GET | `/next-id?client_id=` | viewer | Generate next record ID for a client |
| POST | `/` | editor | Create an exception record |
| GET | `/{id}` | viewer | Get exception by ID |
| PATCH | `/{id}` | editor | Update exception |
| DELETE | `/{id}` | admin | Delete exception |

All exception responses include computed fields:

| Field | Type | Description |
|---|---|---|
| `is_expired` | boolean | `true` if `expiry_date` is in the past |
| `days_until_expiry` | integer \| null | Days remaining (negative if expired) |

Use `?expiring_within_days=30` to retrieve all exceptions expiring within a given window.

### Evidence — `/api/evidence`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | List evidence records (filter by `product_id`) |
| POST | `/upload` | editor | Upload evidence file (multipart/form-data) |
| GET | `/{id}` | viewer | Get evidence record metadata |
| GET | `/{id}/download-url` | viewer | Get presigned MinIO download URL (1 hour TTL) |
| DELETE | `/{id}` | admin | Delete record and remove file from MinIO |

Upload form fields: `product_id`, `title`, `artifact_type`, `file`, and optionally `cobit_control`, `itil_process`, `related_change_id`.

### Audit Log — `/api/audit`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | Paginated audit log with filters |

Query parameters: `entity_type`, `entity_id`, `actor`, `action`, `limit` (max 500), `offset`.

**Audit actions:** `create`, `update`, `delete`, `transition`, `approve`, `reject`, `upload`

### Search — `/api/search`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | viewer | Full-text search across all entities (Meilisearch) |

### Health — `/api/health`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | none | Liveness check |

---

## Record ID Conventions

Record IDs are auto-generated by the API and pre-filled in the UI. They can be overridden before submission.

| Entity | Format | Example |
|---|---|---|
| Product | `{CLIENT_CODE}-{ENV_TYPE}-{SEQ:03d}` | `ACME-PRD-005` |
| Change Request | `CHG-{CLIENT_CODE}-{SEQ:04d}` | `CHG-ACME-0042` |
| Exception | `EXC-{CLIENT_CODE}-{SEQ:04d}` | `EXC-CIVIC-0012` |

Environment type mapping used for product IDs:

| Environment name | ENV_TYPE |
|---|---|
| `PROD` / `PRODUCTION` | `PRD` |
| `DR` | `DR` |
| `STAGING` / `STG` | `STG` |
| `TEST` / `TST` | `TST` |
| anything else | `ENV` |

The sequence number is derived from the highest existing numeric suffix for that prefix — lexical sort is not used, so there are no ordering bugs with sequences above 9.

---

## Common Commands

### Stop all services

```bash
docker compose down
```

### Full reset (wipe all data and rebuild)

```bash
docker compose down -v
docker compose up --build -d
# Wait ~30 seconds for Keycloak and PostgreSQL to initialise, then:
docker compose exec db psql -U dcore -d dcore -c "
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS itil_category varchar(64);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS approved_by varchar(255);
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE exception_records ADD COLUMN IF NOT EXISTS cobit_control varchar(64);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS file_name varchar(255);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS mime_type varchar(128);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS cobit_control varchar(64);
ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS itil_process varchar(128);
"
docker compose exec api python -m app.seed
```

### View logs for a specific service

```bash
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f auth
```

### Restart a single service

```bash
docker compose restart api
```

### Rebuild after code changes

```bash
docker compose up --build -d
```

### Open a shell inside a running container

```bash
docker compose exec api bash
docker compose exec db psql -U dcore
```

### Re-seed without wiping volumes

```bash
docker compose exec api python -m app.seed
```

The seeder truncates existing demo rows and re-inserts fresh data. The schema is left intact.

---

## Known Schema Drift

The PostgreSQL schema is initialised from `postgres/init.sql`. Several columns added to the ORM models after initial setup are not yet reflected in `init.sql` and must be applied manually after a fresh database start (see the migration commands above). A future task is to replace this with Alembic migrations so the schema is always in sync.

Affected columns:

| Table | Columns |
|---|---|
| `change_requests` | `description`, `itil_category`, `approved_by`, `approved_at` |
| `exception_records` | `cobit_control` |
| `evidence_records` | `file_name`, `mime_type`, `cobit_control`, `itil_process` |

---

## Environment Variables

All secrets and connection strings live in `.env` (auto-generated by the setup script, never committed to git). See `.env.example` for the full list of supported variables and their descriptions.

---

## Project Structure

```
.
├── setup.sh                    # One-command installer
├── docker-compose.yml          # All 8 services
├── .env.example                # Variable reference (no secrets)
├── traefik/
│   └── traefik.yml             # Traefik static config
├── postgres/
│   └── init.sql                # DB extensions (uuid-ossp, pg_trgm) + schema
└── services/
    ├── api/                    # FastAPI backend
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py         # App factory, router registration
    │       ├── seed.py         # COBIT/ITIL-aligned demo data seeder
    │       ├── core/
    │       │   ├── config.py      # Settings (pydantic-settings)
    │       │   ├── database.py    # Async engine + session factory
    │       │   ├── auth.py        # JWKS JWT verification, role guards
    │       │   ├── audit.py       # audit() helper — writes to audit_logs
    │       │   ├── record_ids.py  # Auto-generate record IDs (products/changes/exceptions)
    │       │   └── search.py      # Meilisearch client helpers
    │       ├── models/
    │       │   └── models.py   # SQLAlchemy ORM models (all entities)
    │       ├── schemas/
    │       │   └── schemas.py  # Pydantic v2 request/response schemas
    │       └── routers/
    │           ├── clients.py
    │           ├── environments.py
    │           ├── products.py      # includes /next-id, /transition
    │           ├── runbooks.py
    │           ├── changes.py       # includes /next-id, /submit, /approve, /reject
    │           ├── exceptions.py    # includes /next-id, expiry enrichment
    │           ├── evidence.py      # MinIO upload + presigned URLs
    │           ├── audit.py         # Audit log query endpoint
    │           ├── search.py
    │           └── health.py
    ├── frontend/               # Next.js 14 App Router frontend
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/
    │       ├── app/            # App Router pages
    │       │   ├── clients/
    │       │   │   ├── page.tsx        # Client list
    │       │   │   ├── new/page.tsx    # Create client form
    │       │   │   └── [id]/page.tsx   # Client detail
    │       │   ├── products/
    │       │   │   └── [id]/page.tsx   # Product detail + lifecycle transitions
    │       │   ├── changes/
    │       │   │   ├── page.tsx        # Change request list
    │       │   │   └── new/page.tsx    # Create change request form
    │       │   ├── runbooks/
    │       │   │   ├── page.tsx        # Runbook list
    │       │   │   └── new/page.tsx    # Create runbook form
    │       │   ├── exceptions/
    │       │   │   ├── page.tsx        # Exception list with expiry alerts
    │       │   │   └── new/page.tsx    # Create exception record form
    │       │   ├── evidence/
    │       │   │   ├── page.tsx        # Evidence list
    │       │   │   └── upload/page.tsx # Upload evidence file form
    │       │   └── audit/
    │       │       └── page.tsx        # Audit log viewer with filters
    │       ├── components/
    │       │   ├── AppLayout.tsx   # Shell: sidebar + header with SearchBar
    │       │   ├── Sidebar.tsx     # Nav with active link highlighting + sign-out
    │       │   └── SearchBar.tsx   # Debounced global search (Meilisearch)
    │       ├── context/
    │       │   └── AuthContext.tsx # Keycloak OIDC state, login/logout, role helpers
    │       └── lib/
    │           ├── api.ts      # Axios client (attaches Bearer token), typed API helpers
    │           └── auth.ts     # OIDC helpers, role extraction
    └── keycloak/
        └── realm-export.json   # dcore realm — roles, clients, seed users
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Reverse proxy | Traefik v3 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, App Router |
| Backend | FastAPI, Python 3.12, AsyncSQLAlchemy, asyncpg, Pydantic v2 |
| Database | PostgreSQL 16 |
| Identity | Keycloak 24 (OIDC / OAuth2 / RBAC) |
| Cache | Redis 7 |
| Search | Meilisearch 1.7 |
| File storage | MinIO (S3-compatible, presigned URL download) |
| Containers | Docker / Docker Compose |

---

## Roadmap

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Architecture & Schema Design | Complete |
| Phase 2 | Core API + data models + Docker stack | Complete |
| Phase 3 | Frontend UI — layout, forms, inline client/product editing, auto-generated record IDs, quick-action shortcuts, ITIL change workflow, COBIT exception tracking, evidence upload, global search, demo data | Complete |
| Phase 4 | Integration & Drift Engine — config drift detection, alerts | Planned |
| Phase 5 | Visualization & Insights — dashboards, SLA reporting | Planned |
| Phase 6 | Automation & Orchestration — webhook triggers, runbook execution | Planned |
