"""
Demo data seeder — COBIT/ITIL-aligned realistic MSSP data.
Run inside the API container: docker compose exec api python -m app.seed
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, Base
from app.models.models import (
    Client, Environment, Product, Runbook, ChangeRequest, ExceptionRecord, EvidenceRecord,
    LifecycleState, HealthStatus, DocumentStatus,
)

NOW = datetime.now(timezone.utc)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as db:
        # ── Truncate existing demo data ──────────────────────────────────────
        await db.execute(text("TRUNCATE evidence_records, exception_records, change_requests, runbooks, products, environments, clients RESTART IDENTITY CASCADE"))
        await db.commit()

        # ── Clients ──────────────────────────────────────────────────────────
        clients = [
            Client(
                code="ACME",
                name="Acme Financial Services",
                business_context="Regulated financial institution with PCI-DSS and SOX obligations. Core banking on hybrid cloud.",
                critical_services="Core Banking Platform, Payment Gateway, Customer Portal",
                sla_tier="Platinum",
                primary_contact="john.smith@acme.com",
                escalation_path="john.smith@acme.com → cto@acme.com → 24/7 NOC bridge +1-800-555-0100",
            ),
            Client(
                code="GLOBX",
                name="GlobalExchange Logistics",
                business_context="International freight broker. ISO 27001 certified. High availability requirement for shipment tracking.",
                critical_services="Shipment Tracking API, EDI Gateway, Partner Portal",
                sla_tier="Gold",
                primary_contact="ops@globalexchange.com",
                escalation_path="ops@globalexchange.com → it-director@globalexchange.com",
            ),
            Client(
                code="CIVIC",
                name="CivicHealth Network",
                business_context="Healthcare network covering 12 hospitals. HIPAA-covered entity. HL7/FHIR integration with EHR systems.",
                critical_services="EHR Integration Bus, Patient Portal, Clinical Analytics",
                sla_tier="Platinum",
                primary_contact="security@civichealth.org",
                escalation_path="security@civichealth.org → CISO → DPO → 24/7 incident bridge",
            ),
        ]
        db.add_all(clients)
        await db.flush()

        # ── Environments ─────────────────────────────────────────────────────
        envs = [
            Environment(client_id=clients[0].id, name="ACME-PROD", description="Production — AWS eu-west-1, HA active-active"),
            Environment(client_id=clients[0].id, name="ACME-DR", description="Disaster Recovery — AWS eu-central-1, warm standby"),
            Environment(client_id=clients[1].id, name="GLOBX-PROD", description="Production — Azure West Europe"),
            Environment(client_id=clients[1].id, name="GLOBX-STAGING", description="Pre-production staging"),
            Environment(client_id=clients[2].id, name="CIVIC-PROD", description="Production — on-prem VMware + Azure Government"),
            Environment(client_id=clients[2].id, name="CIVIC-TEST", description="Test & QA environment"),
        ]
        db.add_all(envs)
        await db.flush()

        # ── Products ─────────────────────────────────────────────────────────
        products = [
            # ACME PROD
            Product(
                record_id="ACME-PRD-001",
                name="Core Banking Platform",
                environment_id=envs[0].id,
                product_type="Application",
                vendor="Temenos",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.healthy,
                technical_owner="alice.morgan@acme.com",
                last_validated=NOW - timedelta(days=7),
                notes="Temenos T24 R20. Quarterly patching window last Sunday of month.",
            ),
            Product(
                record_id="ACME-PRD-002",
                name="Payment Gateway",
                environment_id=envs[0].id,
                product_type="Integration",
                vendor="Stripe",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.degraded,
                technical_owner="alice.morgan@acme.com",
                last_validated=NOW - timedelta(days=2),
                notes="Intermittent latency spikes observed since 2024-11-01. Stripe support ticket #98231 open.",
            ),
            Product(
                record_id="ACME-PRD-003",
                name="Customer Identity Platform",
                environment_id=envs[0].id,
                product_type="Security",
                vendor="Okta",
                lifecycle_state=LifecycleState.maintenance,
                health_status=HealthStatus.healthy,
                technical_owner="security-team@acme.com",
                last_validated=NOW - timedelta(days=14),
                notes="Migrating from legacy LDAP. Phase 2 of 3 complete.",
            ),
            Product(
                record_id="ACME-PRD-004",
                name="SIEM — Splunk Enterprise",
                environment_id=envs[0].id,
                product_type="Security",
                vendor="Splunk",
                lifecycle_state=LifecycleState.at_risk,
                health_status=HealthStatus.at_risk,
                technical_owner="soc@acme.com",
                last_validated=NOW - timedelta(days=30),
                notes="License expiry in 45 days. Renewal blocked pending procurement approval.",
            ),
            # ACME DR
            Product(
                record_id="ACME-DR-001",
                name="Core Banking DR Replica",
                environment_id=envs[1].id,
                product_type="Application",
                vendor="Temenos",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.healthy,
                technical_owner="alice.morgan@acme.com",
                last_validated=NOW - timedelta(days=90),
                notes="Last DR test: successful failover in 8min. RTO target 15min.",
            ),
            # GLOBX PROD
            Product(
                record_id="GLOBX-PRD-001",
                name="Shipment Tracking API",
                environment_id=envs[2].id,
                product_type="API",
                vendor="In-house",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.healthy,
                technical_owner="api-team@globalexchange.com",
                last_validated=NOW - timedelta(days=5),
                notes="REST/JSON. 99.95% uptime SLA. OpenAPI 3.0 documented.",
            ),
            Product(
                record_id="GLOBX-PRD-002",
                name="EDI Gateway",
                environment_id=envs[2].id,
                product_type="Integration",
                vendor="IBM Sterling",
                lifecycle_state=LifecycleState.retiring,
                health_status=HealthStatus.healthy,
                technical_owner="integration@globalexchange.com",
                last_validated=NOW - timedelta(days=60),
                notes="EOL Jan 2025. Migration to MuleSoft in progress (GLOBX-PRD-003).",
            ),
            Product(
                record_id="GLOBX-PRD-003",
                name="MuleSoft Integration Platform",
                environment_id=envs[2].id,
                product_type="Integration",
                vendor="MuleSoft",
                lifecycle_state=LifecycleState.build,
                health_status=HealthStatus.healthy,
                technical_owner="integration@globalexchange.com",
                last_validated=NOW - timedelta(days=3),
                notes="Replacement for IBM Sterling EDI Gateway. Go-live target Q1 2025.",
            ),
            # GLOBX STAGING
            Product(
                record_id="GLOBX-STG-001",
                name="MuleSoft Integration — Staging",
                environment_id=envs[3].id,
                product_type="Integration",
                vendor="MuleSoft",
                lifecycle_state=LifecycleState.deployment,
                health_status=HealthStatus.healthy,
                technical_owner="integration@globalexchange.com",
                last_validated=NOW - timedelta(days=1),
                notes="UAT in progress. Regression test suite 94% pass rate.",
            ),
            # CIVIC PROD
            Product(
                record_id="CIVIC-PRD-001",
                name="EHR Integration Bus",
                environment_id=envs[4].id,
                product_type="Integration",
                vendor="Rhapsody",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.healthy,
                technical_owner="ehr-team@civichealth.org",
                last_validated=NOW - timedelta(days=10),
                notes="HL7 v2.5 / FHIR R4 bridge. Processing 50k messages/day.",
            ),
            Product(
                record_id="CIVIC-PRD-002",
                name="Clinical Analytics Platform",
                environment_id=envs[4].id,
                product_type="Analytics",
                vendor="Microsoft PowerBI Embedded",
                lifecycle_state=LifecycleState.proposed,
                health_status=HealthStatus.healthy,
                technical_owner="data-team@civichealth.org",
                last_validated=None,
                notes="New project. Business case approved. Architecture review pending.",
            ),
            Product(
                record_id="CIVIC-PRD-003",
                name="Patient Portal",
                environment_id=envs[4].id,
                product_type="Application",
                vendor="In-house",
                lifecycle_state=LifecycleState.operational,
                health_status=HealthStatus.healthy,
                technical_owner="portal-team@civichealth.org",
                last_validated=NOW - timedelta(days=20),
                notes="React SPA + Node.js API. Auth via Azure AD B2C. HIPAA BAA in place.",
            ),
        ]
        db.add_all(products)
        await db.flush()

        # ── Runbooks ─────────────────────────────────────────────────────────
        runbooks = [
            Runbook(
                product_id=products[0].id,
                title="Core Banking — Emergency Restart Procedure",
                trigger="Service unresponsive or health check failure > 3 consecutive polls",
                pre_checks="1. Verify no active batch jobs in progress\n2. Confirm with DBA that DB connections are stable\n3. Alert on-call banker if >09:00 local time",
                steps="1. SSH to primary app node: ssh deploy@cbp-app-01\n2. Check service status: sudo systemctl status t24-app\n3. Review last 100 log lines: journalctl -u t24-app -n 100\n4. If hung: sudo systemctl stop t24-app && sleep 30 && sudo systemctl start t24-app\n5. Validate health endpoint: curl -s http://cbp-app-01:8080/health | jq\n6. Run smoke test: ./scripts/smoke-test.sh",
                validation="Health endpoint returns HTTP 200 with status:ok. Login smoke test passes. No ERROR lines in logs for 5 minutes.",
                rollback="If restart fails after 2 attempts: invoke DR failover runbook ACME-DR-001. Notify alice.morgan@acme.com immediately.",
                escalation="L1 → L2 (alice.morgan@acme.com) → Vendor (Temenos support +44-20-7002-1000, Priority P1)",
                status=DocumentStatus.approved,
            ),
            Runbook(
                product_id=products[1].id,
                title="Payment Gateway — Latency Investigation",
                trigger="P95 response time > 2000ms for 5 consecutive minutes",
                pre_checks="1. Check Stripe status page: https://status.stripe.com\n2. Verify no deployments in last 2h\n3. Pull Grafana dashboard: https://grafana.acme.internal/d/payment-gw",
                steps="1. Identify slow transactions: SELECT * FROM payment_log WHERE latency_ms > 2000 AND created_at > NOW()-INTERVAL '30m'\n2. Check network path to Stripe: mtr api.stripe.com --report\n3. Review API error rate in Stripe dashboard\n4. If network issue: escalate to NetOps\n5. If Stripe-side: open P1 ticket via Stripe dashboard",
                validation="P95 latency returns below 500ms for 10 consecutive minutes.",
                rollback="Enable payment queue mode (deferred processing) via feature flag: feature_flags set payment.queue_mode=true",
                escalation="alice.morgan@acme.com → Stripe Enterprise Support (ticket in dashboard)",
                status=DocumentStatus.approved,
            ),
            Runbook(
                product_id=products[9].id,
                title="EHR Integration Bus — Message Processing Failure",
                trigger="Dead letter queue depth > 50 messages or HL7 ACK failure rate > 1%",
                pre_checks="1. Identify failed message types in Rhapsody IDE\n2. Check downstream EHR system availability\n3. Confirm no maintenance window is active",
                steps="1. Log into Rhapsody IDE: https://rhapsody-prod:8444\n2. Navigate to Communication Points → Dead Letter Queue\n3. Inspect failed messages for error pattern\n4. For schema errors: reprocess after applying transform fix\n5. For connectivity errors: restart affected communication point\n6. Monitor queue drain for 10 minutes",
                validation="Dead letter queue depth returns to 0. ACK failure rate < 0.1% for 15 minutes.",
                rollback="Pause integration routes and buffer to file system. Engage EHR vendor support for downstream triage.",
                escalation="ehr-team@civichealth.org → Rhapsody Support → Hospital IT Director",
                status=DocumentStatus.approved,
            ),
        ]
        db.add_all(runbooks)
        await db.flush()

        # ── Change Requests ───────────────────────────────────────────────────
        changes = [
            ChangeRequest(
                record_id="CHG-ACME-0041",
                product_id=products[0].id,
                title="Apply Temenos T24 Security Patch R20.09-HF3",
                description="Critical security hotfix addressing CVE-2024-38901 (CVSS 9.1 — remote code execution via malformed SWIFT message). Mandatory per PCI-DSS requirement 6.3.3.",
                rationale="CVE-2024-38901 allows unauthenticated RCE. Vendor patch available. Risk of non-patching rated Critical by internal security team.",
                impact="30-minute maintenance window required. Core banking offline during patch application. Batch jobs must be quiesced.",
                implementation_plan="1. Schedule maintenance window 02:00-04:00 Saturday\n2. Snapshot VM state\n3. Apply hotfix via Temenos patch utility\n4. Run vendor-supplied regression suite\n5. Perform smoke test\n6. Release maintenance window",
                validation_plan="All unit tests pass. Smoke test covers: login, account inquiry, funds transfer, SWIFT message processing.",
                rollback_plan="Restore from VM snapshot. Estimated restore time: 12 minutes. Communicate outage extension to stakeholders.",
                itil_category="Emergency",
                status=DocumentStatus.approved,
                approved_by="alice.morgan@acme.com",
                approved_at=NOW - timedelta(days=2),
            ),
            ChangeRequest(
                record_id="CHG-ACME-0042",
                product_id=products[2].id,
                title="Okta — LDAP Directory Migration Phase 3",
                description="Final phase of LDAP to Okta Universal Directory migration. Migrates remaining 2,400 contractor accounts.",
                rationale="Legacy LDAP infrastructure end-of-support December 2024. ITIL-aligned change as part of approved migration programme.",
                impact="Contractor accounts will require re-authentication post-migration. Password reset comms to be issued 24h prior.",
                implementation_plan="1. Export contractor accounts from LDAP\n2. Import into Okta via CSV provisioning\n3. Test SSO flows for contractor apps\n4. Cut over DNS/auth pointer\n5. Disable legacy LDAP endpoint",
                validation_plan="100% of contractor accounts able to authenticate. All SSO-connected apps verified via Okta health dashboard.",
                rollback_plan="Re-enable LDAP endpoint. Estimated rollback time: 5 minutes.",
                itil_category="Normal",
                status=DocumentStatus.in_review,
            ),
            ChangeRequest(
                record_id="CHG-GLOBX-0018",
                product_id=products[6].id,
                title="IBM Sterling EDI Gateway — Final Decommission",
                description="Retire IBM Sterling EDI Gateway following successful MuleSoft migration. Remove from network, archive config, notify trading partners.",
                rationale="MuleSoft platform now handling 100% of EDI traffic for 30 days with no issues. Sterling license cost $240k/yr savings.",
                impact="Trading partners using legacy AS2 endpoint must switch to new MuleSoft AS2 endpoint. 14 partners notified. 12 confirmed migrated.",
                implementation_plan="1. Final traffic drain — confirm 0 messages in last 72h\n2. Notify remaining 2 trading partners\n3. Disable Sterling services\n4. Archive configuration to MinIO\n5. Decommission VM",
                validation_plan="Zero EDI traffic on Sterling for 7 days post-cutover. All partner EDI flowing through MuleSoft dashboard.",
                rollback_plan="Restart Sterling services from archived config. Estimated time: 45 minutes.",
                itil_category="Normal",
                status=DocumentStatus.draft,
            ),
            ChangeRequest(
                record_id="CHG-CIVIC-0009",
                product_id=products[9].id,
                title="EHR Integration Bus — FHIR R4 Upgrade",
                description="Upgrade Rhapsody integration routes from HL7 v2.5 to FHIR R4 for Epic EHR connectivity. Required for CMS interoperability rule compliance.",
                rationale="CMS Final Rule requires FHIR R4 API support by Q2 2025. Epic 2024 version drops HL7 v2 support.",
                impact="All 12 hospital EHR integrations affected. Phased rollout: 3 hospitals per week.",
                implementation_plan="1. Deploy FHIR R4 routes in parallel on Rhapsody\n2. Test with Epic sandbox\n3. Hospital-by-hospital cutover\n4. Decommission HL7 v2 routes after all hospitals migrated",
                validation_plan="FHIR R4 message round-trip test for each hospital. Clinical workflow validation with nursing informaticist.",
                rollback_plan="Switch back to HL7 v2 routes. Zero-downtime switchover via Rhapsody route enable/disable.",
                itil_category="Normal",
                status=DocumentStatus.in_review,
            ),
        ]
        db.add_all(changes)
        await db.flush()

        # ── Exception Records ─────────────────────────────────────────────────
        exceptions = [
            ExceptionRecord(
                record_id="EXC-ACME-0011",
                product_id=products[3].id,
                title="Splunk License Renewal Delay",
                reason="Enterprise procurement process requires CFO approval for contracts >$500k. Approval cycle estimated 60 days. License expires in 45 days creating a 15-day gap.",
                risk_introduced="SIEM coverage gap of up to 15 days. Reduced log retention. Potential compliance gap against PCI-DSS Requirement 10.5.",
                compensating_controls="1. Increased log collection at OS/firewall level to flat files (30-day local retention)\n2. Manual daily log review by SOC tier-2\n3. AWS CloudTrail enabled as secondary audit trail\n4. Alert thresholds lowered on remaining tooling",
                cobit_control="DSS06.03",
                expiry_date=NOW + timedelta(days=45),
                status=DocumentStatus.approved,
            ),
            ExceptionRecord(
                record_id="EXC-ACME-0009",
                product_id=products[0].id,
                title="TLS 1.1 Legacy API Endpoint",
                reason="Core banking vendor Temenos requires TLS 1.1 support for legacy batch integration with three subsidiary systems pending upgrade. Upgrade scheduled for R21 migration in Q3 2025.",
                risk_introduced="TLS 1.1 is deprecated (RFC 8996). Susceptible to BEAST/POODLE attacks. Endpoint is internal-only, not internet-facing.",
                compensating_controls="1. Endpoint isolated to dedicated internal VLAN\n2. Access restricted by firewall ACL to 3 specific source IPs\n3. Traffic volume monitored for anomalies\n4. Quarterly penetration test scoped to include this endpoint",
                cobit_control="APO13.01",
                expiry_date=NOW - timedelta(days=10),
                status=DocumentStatus.approved,
            ),
            ExceptionRecord(
                record_id="EXC-GLOBX-0005",
                product_id=products[6].id,
                title="IBM Sterling — Unpatched CVE During Decommission",
                reason="CVE-2024-22901 patch for IBM Sterling not applied. Platform is in final decommission phase (CHG-GLOBX-0018). Patch application and decommission would overlap, increasing risk.",
                risk_introduced="Vulnerability exists for estimated 30 days until decommission. Sterling is internal-only post EDI cutover.",
                compensating_controls="1. Sterling isolated to management VLAN — no external access\n2. All EDI traffic migrated to MuleSoft\n3. No active trading partner connections\n4. Firewall blocks all inbound except management subnet",
                cobit_control="DSS05.04",
                expiry_date=NOW + timedelta(days=30),
                status=DocumentStatus.approved,
            ),
            ExceptionRecord(
                record_id="EXC-CIVIC-0003",
                product_id=products[11].id,
                title="Patient Portal — Dependency on Deprecated Node.js 16",
                reason="Patient portal frontend build pipeline depends on a third-party HIPAA-compliant audit logging library not yet compatible with Node.js 18+. Vendor upgrade ETA Q1 2025.",
                risk_introduced="Node.js 16 is end-of-life (September 2023). Security patches no longer provided by Node.js foundation.",
                compensating_controls="1. OS-level security patches applied monthly\n2. WAF in front of portal blocks known exploit patterns\n3. DAST scan run weekly — no critical findings to date\n4. Internal pentest scoped to portal completed Nov 2024 — medium findings only",
                cobit_control="BAI03.10",
                expiry_date=NOW + timedelta(days=90),
                status=DocumentStatus.approved,
            ),
            ExceptionRecord(
                record_id="EXC-CIVIC-0002",
                product_id=products[9].id,
                title="EHR Bus — Self-Signed Certificates on Internal Routes",
                reason="Rhapsody internal communication points use self-signed certificates. CA-signed certs require clinical informatics team sign-off currently blocked by EHR upgrade project.",
                risk_introduced="Self-signed certificates cannot be validated against a trust chain. MITM risk on internal hospital network.",
                compensating_controls="1. Certificate pinning configured on all Rhapsody routes\n2. Internal network segment access controls restrict traffic to known hosts\n3. Mutual TLS (mTLS) enforced on all routes",
                cobit_control="DSS05.03",
                expiry_date=NOW + timedelta(days=15),
                status=DocumentStatus.approved,
            ),
        ]
        db.add_all(exceptions)
        await db.flush()

        # ── Evidence Records ──────────────────────────────────────────────────
        evidence_records = [
            EvidenceRecord(
                product_id=products[0].id,
                title="Core Banking — Vulnerability Scan November 2024",
                artifact_type="report",
                file_name="acme-cbp-vuln-scan-nov24.pdf",
                cobit_control="DSS05.07",
                itil_process="Information Security Management",
                captured_at=NOW - timedelta(days=20),
            ),
            EvidenceRecord(
                product_id=products[0].id,
                title="Core Banking — PCI-DSS Quarterly Access Review",
                artifact_type="report",
                file_name="acme-cbp-access-review-q4-2024.xlsx",
                cobit_control="DSS05.04",
                itil_process="Access Management",
                captured_at=NOW - timedelta(days=35),
            ),
            EvidenceRecord(
                product_id=products[3].id,
                title="SIEM — Log Retention Compliance Screenshot",
                artifact_type="screenshot",
                file_name="splunk-retention-policy-nov24.png",
                cobit_control="DSS06.03",
                itil_process="Compliance Management",
                captured_at=NOW - timedelta(days=5),
            ),
            EvidenceRecord(
                product_id=products[9].id,
                title="EHR Bus — HL7 Message Flow Config Snapshot",
                artifact_type="config_snapshot",
                file_name="rhapsody-routes-export-2024-11.xml",
                cobit_control="DSS05.03",
                itil_process="Configuration Management",
                captured_at=NOW - timedelta(days=14),
            ),
            EvidenceRecord(
                product_id=products[5].id,
                title="Shipment API — Uptime Report October 2024",
                artifact_type="report",
                file_name="globx-api-uptime-oct24.pdf",
                cobit_control="DSS04.02",
                itil_process="Availability Management",
                captured_at=NOW - timedelta(days=45),
            ),
            EvidenceRecord(
                product_id=products[11].id,
                title="Patient Portal — DAST Scan Results November 2024",
                artifact_type="report",
                file_name="civic-portal-dast-nov24.html",
                cobit_control="APO13.01",
                itil_process="Information Security Management",
                captured_at=NOW - timedelta(days=7),
            ),
        ]
        db.add_all(evidence_records)
        await db.commit()

        print("\n✓ Demo data seeded successfully")
        print(f"  Clients:    {len(clients)}")
        print(f"  Envs:       {len(envs)}")
        print(f"  Products:   {len(products)}")
        print(f"  Runbooks:   {len(runbooks)}")
        print(f"  Changes:    {len(changes)}")
        print(f"  Exceptions: {len(exceptions)}")
        print(f"  Evidence:   {len(evidence_records)}")
        print("\nNotable demo scenarios:")
        print("  - Payment Gateway is DEGRADED (active incident simulation)")
        print("  - SIEM is AT_RISK (license expiry in 45 days)")
        print("  - IBM Sterling EDI Gateway is RETIRING (decommission in progress)")
        print("  - MuleSoft is in BUILD/DEPLOYMENT lifecycle states")
        print("  - EXC-ACME-0009 is EXPIRED (TLS 1.1 exception, 10 days past expiry)")
        print("  - EXC-CIVIC-0002 expires in 15 days (warning threshold)")
        print("  - CHG-ACME-0041 is APPROVED with approver stamp")
        print("  - CHG-ACME-0042 / CHG-CIVIC-0009 are IN_REVIEW (pending approval)")


if __name__ == "__main__":
    asyncio.run(seed())
