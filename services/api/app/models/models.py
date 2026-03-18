import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Enum, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LifecycleState(str, enum.Enum):
    proposed    = "proposed"
    design      = "design"
    approved    = "approved"
    build       = "build"
    deployment  = "deployment"
    operational = "operational"
    maintenance = "maintenance"
    at_risk     = "at_risk"
    retiring    = "retiring"
    retired     = "retired"


class HealthStatus(str, enum.Enum):
    healthy     = "healthy"
    degraded    = "degraded"
    at_risk     = "at_risk"
    unsupported = "unsupported"


class DocumentStatus(str, enum.Enum):
    draft     = "draft"
    in_review = "in_review"
    approved  = "approved"
    active    = "active"
    archived  = "archived"


class AuditAction(str, enum.Enum):
    create     = "create"
    update     = "update"
    delete     = "delete"
    transition = "transition"
    approve    = "approve"
    reject     = "reject"
    upload     = "upload"


def utcnow():
    return datetime.now(timezone.utc)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_context: Mapped[str | None] = mapped_column(Text)
    critical_services: Mapped[str | None] = mapped_column(Text)
    sla_tier: Mapped[str | None] = mapped_column(String(64))
    primary_contact: Mapped[str | None] = mapped_column(String(255))
    escalation_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    environments: Mapped[list["Environment"]] = relationship(back_populates="client", cascade="all, delete-orphan")


class Environment(Base):
    __tablename__ = "environments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    client: Mapped["Client"] = relationship(back_populates="environments")
    products: Mapped[list["Product"]] = relationship(back_populates="environment", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    environment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("environments.id", ondelete="CASCADE"))
    product_type: Mapped[str] = mapped_column(String(64), nullable=False)
    vendor: Mapped[str | None] = mapped_column(String(128))
    serial_number: Mapped[str | None] = mapped_column(String(255))
    lifecycle_state: Mapped[LifecycleState] = mapped_column(Enum(LifecycleState), default=LifecycleState.proposed)
    health_status: Mapped[HealthStatus] = mapped_column(Enum(HealthStatus), default=HealthStatus.healthy)
    technical_owner: Mapped[str | None] = mapped_column(String(255))
    last_validated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    environment: Mapped["Environment"] = relationship(back_populates="products")
    runbooks: Mapped[list["Runbook"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    changes: Mapped[list["ChangeRequest"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    exceptions: Mapped[list["ExceptionRecord"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    evidence: Mapped[list["EvidenceRecord"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class Runbook(Base):
    __tablename__ = "runbooks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    trigger: Mapped[str | None] = mapped_column(Text)
    pre_checks: Mapped[str | None] = mapped_column(Text)
    steps: Mapped[str | None] = mapped_column(Text)
    validation: Mapped[str | None] = mapped_column(Text)
    rollback: Mapped[str | None] = mapped_column(Text)
    escalation: Mapped[str | None] = mapped_column(Text)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product: Mapped["Product"] = relationship(back_populates="runbooks")


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    rationale: Mapped[str | None] = mapped_column(Text)
    impact: Mapped[str | None] = mapped_column(Text)
    implementation_plan: Mapped[str | None] = mapped_column(Text)
    validation_plan: Mapped[str | None] = mapped_column(Text)
    rollback_plan: Mapped[str | None] = mapped_column(Text)
    itil_category: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.draft)
    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product: Mapped["Product"] = relationship(back_populates="changes")


class ExceptionRecord(Base):
    __tablename__ = "exception_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    risk_introduced: Mapped[str | None] = mapped_column(Text)
    compensating_controls: Mapped[str | None] = mapped_column(Text)
    cobit_control: Mapped[str | None] = mapped_column(String(64))
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product: Mapped["Product"] = relationship(back_populates="exceptions")


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(512))
    file_name: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(128))
    cobit_control: Mapped[str | None] = mapped_column(String(64))
    itil_process: Mapped[str | None] = mapped_column(String(128))
    related_change_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("change_requests.id", ondelete="SET NULL"))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    product: Mapped["Product"] = relationship(back_populates="evidence")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    before_state: Mapped[dict | None] = mapped_column(JSON)
    after_state: Mapped[dict | None] = mapped_column(JSON)
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
