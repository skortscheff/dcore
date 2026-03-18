import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import TokenData, require_editor, require_viewer, require_admin
from app.core.audit import audit
from app.core.record_ids import next_change_id
from app.models.models import ChangeRequest, AuditAction, DocumentStatus
from app.schemas.schemas import ChangeRequestCreate, ChangeRequestUpdate, ChangeRequestRead, ChangeApproval

router = APIRouter()


@router.get("/", response_model=list[ChangeRequestRead], dependencies=[Depends(require_viewer)])
async def list_changes(product_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    q = select(ChangeRequest)
    if product_id:
        q = q.where(ChangeRequest.product_id == product_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ChangeRequestRead, status_code=status.HTTP_201_CREATED)
async def create_change(payload: ChangeRequestCreate, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    change = ChangeRequest(**payload.model_dump())
    db.add(change)
    await audit(db, "change_request", payload.record_id, AuditAction.create, user.preferred_username or user.sub, after={"title": payload.title, "status": payload.status})
    await db.commit()
    await db.refresh(change)
    return change


@router.get("/next-id", dependencies=[Depends(require_viewer)])
async def get_next_change_id(
    client_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        record_id = await next_change_id(db, client_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"record_id": record_id}


@router.get("/{change_id}", response_model=ChangeRequestRead, dependencies=[Depends(require_viewer)])
async def get_change(change_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    return change


@router.patch("/{change_id}", response_model=ChangeRequestRead)
async def update_change(change_id: uuid.UUID, payload: ChangeRequestUpdate, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change.status in (DocumentStatus.approved, DocumentStatus.active):
        raise HTTPException(status_code=409, detail="Approved or active change requests cannot be edited directly")
    before = {"status": change.status, "title": change.title}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(change, field, value)
    await audit(db, "change_request", str(change_id), AuditAction.update, user.preferred_username or user.sub, before=before, after={"status": change.status, "title": change.title})
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/submit", response_model=ChangeRequestRead)
async def submit_change(change_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change.status != DocumentStatus.draft:
        raise HTTPException(status_code=409, detail="Only draft change requests can be submitted for review")
    change.status = DocumentStatus.in_review
    await audit(db, "change_request", str(change_id), AuditAction.update, user.preferred_username or user.sub, detail="Submitted for review")
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/approve", response_model=ChangeRequestRead)
async def approve_change(change_id: uuid.UUID, payload: ChangeApproval, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_admin)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change.status != DocumentStatus.in_review:
        raise HTTPException(status_code=409, detail="Only changes under review can be approved")
    change.status = DocumentStatus.approved
    change.approved_by = user.preferred_username or user.sub
    change.approved_at = datetime.now(timezone.utc)
    detail = f"Approved by {change.approved_by}"
    if payload.comment:
        detail += f" | {payload.comment}"
    await audit(db, "change_request", str(change_id), AuditAction.approve, user.preferred_username or user.sub, detail=detail)
    await db.commit()
    await db.refresh(change)
    return change


@router.post("/{change_id}/reject", response_model=ChangeRequestRead)
async def reject_change(change_id: uuid.UUID, payload: ChangeApproval, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_admin)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change.status != DocumentStatus.in_review:
        raise HTTPException(status_code=409, detail="Only changes under review can be rejected")
    change.status = DocumentStatus.draft
    detail = f"Rejected by {user.preferred_username or user.sub}"
    if payload.comment:
        detail += f" | {payload.comment}"
    await audit(db, "change_request", str(change_id), AuditAction.reject, user.preferred_username or user.sub, detail=detail)
    await db.commit()
    await db.refresh(change)
    return change


@router.delete("/{change_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_change(change_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_admin)):
    change = await db.get(ChangeRequest, change_id)
    if not change:
        raise HTTPException(status_code=404, detail="Change request not found")
    await audit(db, "change_request", str(change_id), AuditAction.delete, user.preferred_username or user.sub)
    await db.delete(change)
    await db.commit()
