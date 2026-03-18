# Phase 1 Documentation Pack: Service Delivery Platform
## Managed Security Services Architecture & Governance

This document consolidates the 26 core components of the Phase 1 Architecture and Schema Design for the MSSP Service Delivery Platform.

---

### 1. Platform Overview
The Service Delivery Platform is a GitHub-like operating system for managed security solution delivery. It is designed for an MSSP team that owns the full lifecycle of client solutions: design, deployment, maintenance, operations, and support. The platform becomes the authoritative source of truth for how each client solution is built, why it exists, how it is changed, and how it is supported.

**Core Idea:** Treat every client solution like a versioned product record composed of architecture, configuration intent, dependencies, operating procedures, controls, changes, exceptions, and evidence.

---

### 2. Problem Statement and Goals
**Problem:** MSSP knowledge is fragmented across engineers, tickets, chat, and spreadsheets. This creates operational risk, slows support, and makes client solution management inconsistent.
**Goals:**
- Centralize solution information in a structured platform.
- Model client environments as managed products with lifecycle states.
- Standardize schemas for all supported products (Firewall, SSE, EDR, etc.).
- Enable future automation for drift detection and compliance.

---

### 3. Scope and Guiding Principles
**In Scope:** Client profiles, product records, lifecycle tracking, runbooks, change/exception/evidence records, and metadata standards.
**Guiding Principles:**
- Operational usefulness over documentation for its own sake.
- Structure first: machine-readable records.
- Version everything important.
- Multi-tenancy by design.

---

### 4. User Personas and Roles
- **Solutions Architect:** Designs solutions and defines standards.
- **Implementation Engineer:** Deploys products and captures build details.
- **Operations Engineer:** Maintains health and executes routine changes.
- **Support Engineer:** Uses runbooks to resolve incidents.
- **Service Delivery Manager:** Oversees portfolio health and governance.

---

### 5. Product and Solution Lifecycle Model
Every solution moves through these states:
1. **Proposed**
2. **Design**
3. **Approved**
4. **Build**
5. **Deployment**
6. **Operational** (Production)
7. **Maintenance**
8. **At Risk**
9. **Retiring / Retired**

---

### 6. Domain Model
**Core Objects:** Client, Environment, Product/Solution, Component, Dependency, Runbook, Policy Record, Change Request, Exception Record, Evidence Record.

---

### 7. Information Architecture
**Hierarchy:**
- Client
  - Environment (e.g., Prod, Dev)
    - Product Record (e.g., Firewall)
      - Linked Artifacts (Runbooks, Changes, Exceptions)

---

### 8. Metadata Schema
All records must include structured YAML-style metadata:
```yaml
id: CLT-ACME-PROD-FW-001
name: ACME Edge Firewall
client_id: CLT-ACME
environment: production
product_type: firewall
vendor: Palo Alto Networks
lifecycle_state: operational
technical_owner: jane.doe
last_validated: 2026-03-01
```

---

### 9. Naming Standards
- **Client:** `CLT-[CODE]` (e.g., `CLT-ACME`)
- **Product:** `PRD-[CLIENT]-[ENV]-[TYPE]-[NUM]`
- **Change:** `CHG-[YEAR]-[NUM]`
- **Exception:** `EXC-[YEAR]-[NUM]`

---

### 10. Status and Lifecycle Models
- **Document Status:** Draft, In Review, Approved, Active, Archived.
- **Health Status:** Healthy, Degraded, At Risk, Unsupported.

---

### 11. Role Permission Matrix
- **Admin:** Full control over templates and standards.
- **Editor:** Create/Update client and product records.
- **Viewer:** Read-only access (Internal or Client).

---

### 12. Document Standards
- Use standard headings for each product type.
- Link related records explicitly (e.g., Link Change to Product).
- Record assumptions and technical debt.

---

### 13. Template: Client Profile
- Business context and critical services.
- Service scope and support commitments (SLA).
- Primary contacts and escalation paths.

---

### 14. Template: Firewall Solution
- Topology (Logical/Physical).
- Interface/Zone/Routing design.
- Policy model and HA configuration.
- Identity and Logging integrations.

---

### 15. Template: Router / Switch Solution
- L2/L3 design and VLAN/VRF segmentation.
- Routing protocols (OSPF/BGP) and adjacencies.
- Management plane protection.

---

### 16. Template: IDS/IPS Solution
- Inspection placement and traffic coverage.
- Signature/Policy management.
- Performance constraints and bypass behavior.

---

### 17. Template: SSE Solution
- SWG, CASB, and ZTNA modules.
- Traffic steering methods (Agent, GRE, IPsec).
- Identity/MFA dependencies.

---

### 18. Template: EDR / XDR Solution
- Agent deployment scope and policy groups.
- Exclusions and tamper protection.
- Integration with SIEM/SOAR.

---

### 19. Template: PAM Solution
- Privileged account categories and vault architecture.
- Credential rotation and session recording.
- Break-glass procedures.

---

### 20. Template: Policy Record
- Control objectives and affected products.
- Validation methods and review cadence.

---

### 21. Template: Runbook
- Trigger and Pre-checks.
- Step-by-step execution and validation.
- Rollback and Escalation paths.

---

### 22. Template: Change Request
- Rationale and Impact assessment.
- Implementation, Validation, and Rollback plans.

---

### 23. Template: Exception Record
- Reason for deviation and risk introduced.
- Compensating controls and expiry date.

---

### 24. Template: Evidence Record
- Artifact type (Screenshot, Log, Report).
- Date captured and related control/change.

---

### 25. MVP Definition
- **Scope:** 3 Pilot Clients (ACME Financial, GlobalExchange, CivicHealth), 12 products spanning Firewall, SSE, EDR, PAM, SIEM, IAM, and Integration platform types.
- **Features:** Full CRUD UI, metadata search, lifecycle visibility, ITIL change workflow, COBIT exception tracking, evidence upload, linked governance records, tamper-evident audit trail.

---

### 26. Roadmap

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Architecture & Schema Design | Complete |
| Phase 2 | Core API + data models + Docker stack (FastAPI, PostgreSQL, Keycloak, MinIO, Meilisearch, Redis, Traefik) | Complete |
| Phase 3 | Frontend UI — App Router layout, sidebar, global search, create/edit forms for all entities, ITIL change workflow (draft → in_review → approved/rejected), COBIT exception tracking with expiry alerts, evidence file upload, COBIT/ITIL-aligned demo data seed | Complete |
| Phase 4 | Integration & Drift Engine — config drift detection, scheduled health checks, automated alerts | Planned |
| Phase 5 | Visualization & Insights — portfolio dashboards, SLA compliance reporting, exception aging charts | Planned |
| Phase 6 | Automation & Orchestration — webhook triggers, runbook execution engine, change automation | Planned |

---

### 27. Current Platform State (Phase 3 Complete)

**Running stack:** 8 containers (Next.js 14, FastAPI, PostgreSQL 16, Keycloak 24, Redis 7, Meilisearch 1.7, MinIO, Traefik v3)

**Implemented UI pages:**
- Client list, client detail, create client form
- Product detail with lifecycle transition controls
- Change request list and create form (ITIL Normal/Standard/Emergency categories)
- Runbook list and create form
- Exception list with expiry alerts and create form (COBIT control reference)
- Evidence list and file upload form
- Audit log viewer with entity/actor/action filters
- Global debounced search bar (Meilisearch, header-mounted)

**Demo data scenarios loaded:**
- 3 clients: ACME Financial Services, GlobalExchange Trading, CivicHealth Network
- 12 products across full lifecycle states including DEGRADED and AT_RISK health statuses
- 4 change requests: 1 approved emergency, 2 in review, 1 draft
- 5 exception records with COBIT references (DSS06.03, APO13.01, DSS05.04, BAI03.10, DSS05.03); 1 expired, 1 expiring in 15 days
- 6 evidence records
- 3 runbooks

---
*End of Document*
