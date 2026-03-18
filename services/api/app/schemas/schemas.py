import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.models import LifecycleState, HealthStatus, DocumentStatus, AuditAction


class ClientCreate(BaseModel):
    code: str
    name: str
    business_context: str | None = None
    critical_services: str | None = None
    sla_tier: str | None = None
    primary_contact: str | None = None
    escalation_path: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    business_context: str | None = None
    critical_services: str | None = None
    sla_tier: str | None = None
    primary_contact: str | None = None
    escalation_path: str | None = None


class ClientRead(ClientCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class EnvironmentCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    description: str | None = None


class EnvironmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class EnvironmentRead(EnvironmentCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    record_id: str
    name: str
    environment_id: uuid.UUID
    product_type: str
    vendor: str | None = None
    lifecycle_state: LifecycleState = LifecycleState.proposed
    health_status: HealthStatus = HealthStatus.healthy
    technical_owner: str | None = None
    last_validated: datetime | None = None
    notes: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    product_type: str | None = None
    vendor: str | None = None
    health_status: HealthStatus | None = None
    technical_owner: str | None = None
    last_validated: datetime | None = None
    notes: str | None = None


class ProductTransition(BaseModel):
    target_state: LifecycleState
    reason: str | None = None


class ProductRead(ProductCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class RunbookCreate(BaseModel):
    product_id: uuid.UUID
    title: str
    trigger: str | None = None
    pre_checks: str | None = None
    steps: str | None = None
    validation: str | None = None
    rollback: str | None = None
    escalation: str | None = None
    status: DocumentStatus = DocumentStatus.draft


class RunbookUpdate(BaseModel):
    title: str | None = None
    trigger: str | None = None
    pre_checks: str | None = None
    steps: str | None = None
    validation: str | None = None
    rollback: str | None = None
    escalation: str | None = None
    status: DocumentStatus | None = None


class RunbookRead(RunbookCreate):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ChangeRequestCreate(BaseModel):
    record_id: str
    product_id: uuid.UUID
    title: str
    description: str | None = None
    rationale: str | None = None
    impact: str | None = None
    implementation_plan: str | None = None
    validation_plan: str | None = None
    rollback_plan: str | None = None
    itil_category: str | None = None
    status: DocumentStatus = DocumentStatus.draft


class ChangeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    rationale: str | None = None
    impact: str | None = None
    implementation_plan: str | None = None
    validation_plan: str | None = None
    rollback_plan: str | None = None
    itil_category: str | None = None
    status: DocumentStatus | None = None


class ChangeRequestRead(ChangeRequestCreate):
    id: uuid.UUID
    approved_by: str | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ChangeApproval(BaseModel):
    comment: str | None = None


class ExceptionRecordCreate(BaseModel):
    record_id: str
    product_id: uuid.UUID
    title: str
    reason: str | None = None
    risk_introduced: str | None = None
    compensating_controls: str | None = None
    cobit_control: str | None = None
    expiry_date: datetime | None = None
    status: DocumentStatus = DocumentStatus.draft


class ExceptionRecordUpdate(BaseModel):
    title: str | None = None
    reason: str | None = None
    risk_introduced: str | None = None
    compensating_controls: str | None = None
    cobit_control: str | None = None
    expiry_date: datetime | None = None
    status: DocumentStatus | None = None


class ExceptionRecordRead(ExceptionRecordCreate):
    id: uuid.UUID
    is_expired: bool = False
    days_until_expiry: int | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class EvidenceRecordCreate(BaseModel):
    product_id: uuid.UUID
    title: str
    artifact_type: str
    storage_path: str | None = None
    file_name: str | None = None
    mime_type: str | None = None
    cobit_control: str | None = None
    itil_process: str | None = None
    related_change_id: uuid.UUID | None = None
    captured_at: datetime | None = None


class EvidenceRecordRead(EvidenceRecordCreate):
    id: uuid.UUID
    created_at: datetime
    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: str
    action: AuditAction
    actor: str
    before_state: dict | None = None
    after_state: dict | None = None
    detail: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}
