import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import TokenData, require_editor, require_viewer, require_admin
from app.core.audit import audit
from app.core.record_ids import next_exception_id
from app.models.models import ExceptionRecord, AuditAction
from app.schemas.schemas import ExceptionRecordCreate, ExceptionRecordUpdate, ExceptionRecordRead

router = APIRouter()


def _enrich(exc: ExceptionRecord) -> ExceptionRecordRead:
    now = datetime.now(timezone.utc)
    is_expired = False
    days_until_expiry = None
    if exc.expiry_date:
        expiry = exc.expiry_date.replace(tzinfo=timezone.utc) if exc.expiry_date.tzinfo is None else exc.expiry_date
        delta = (expiry - now).days
        days_until_expiry = delta
        is_expired = delta < 0
    data = ExceptionRecordRead.model_validate(exc)
    data.is_expired = is_expired
    data.days_until_expiry = days_until_expiry
    return data


@router.get("/", response_model=list[ExceptionRecordRead], dependencies=[Depends(require_viewer)])
async def list_exceptions(
    product_id: uuid.UUID | None = None,
    expiring_within_days: int | None = Query(None, description="Filter exceptions expiring within N days"),
    db: AsyncSession = Depends(get_db),
):
    q = select(ExceptionRecord)
    if product_id:
        q = q.where(ExceptionRecord.product_id == product_id)
    result = await db.execute(q)
    records = result.scalars().all()
    enriched = [_enrich(r) for r in records]
    if expiring_within_days is not None:
        enriched = [
            r for r in enriched
            if r.days_until_expiry is not None and 0 <= r.days_until_expiry <= expiring_within_days
        ]
    return enriched


@router.post("/", response_model=ExceptionRecordRead, status_code=status.HTTP_201_CREATED)
async def create_exception(
    payload: ExceptionRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: TokenData = Depends(require_editor),
):
    actor = user.preferred_username or user.sub
    exc = ExceptionRecord(**payload.model_dump())
    db.add(exc)
    await db.flush()
    await audit(db, "exception", str(exc.id), AuditAction.create, actor,
                after=payload.model_dump(mode="json"), detail="Exception record created")
    await db.commit()
    await db.refresh(exc)
    return _enrich(exc)


@router.get("/next-id", dependencies=[Depends(require_viewer)])
async def get_next_exception_id(
    client_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        record_id = await next_exception_id(db, client_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"record_id": record_id}


@router.get("/{exc_id}", response_model=ExceptionRecordRead, dependencies=[Depends(require_viewer)])
async def get_exception(exc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    exc = await db.get(ExceptionRecord, exc_id)
    if not exc:
        raise HTTPException(status_code=404, detail="Exception record not found")
    return _enrich(exc)


@router.patch("/{exc_id}", response_model=ExceptionRecordRead)
async def update_exception(
    exc_id: uuid.UUID,
    payload: ExceptionRecordUpdate,
    db: AsyncSession = Depends(get_db),
    user: TokenData = Depends(require_editor),
):
    actor = user.preferred_username or user.sub
    exc = await db.get(ExceptionRecord, exc_id)
    if not exc:
        raise HTTPException(status_code=404, detail="Exception record not found")
    before = {c.name: str(getattr(exc, c.name)) for c in exc.__table__.columns}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(exc, field, value)
    await db.flush()
    after = {c.name: str(getattr(exc, c.name)) for c in exc.__table__.columns}
    await audit(db, "exception", str(exc.id), AuditAction.update, actor, before=before, after=after)
    await db.commit()
    await db.refresh(exc)
    return _enrich(exc)


@router.delete("/{exc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exception(
    exc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: TokenData = Depends(require_admin),
):
    actor = user.preferred_username or user.sub
    exc = await db.get(ExceptionRecord, exc_id)
    if not exc:
        raise HTTPException(status_code=404, detail="Exception record not found")
    before = {c.name: str(getattr(exc, c.name)) for c in exc.__table__.columns}
    await audit(db, "exception", str(exc.id), AuditAction.delete, actor, before=before, detail="Exception record deleted")
    await db.delete(exc)
    await db.commit()
