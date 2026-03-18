import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import require_editor, require_viewer, require_admin
from app.models.models import Runbook
from app.schemas.schemas import RunbookCreate, RunbookUpdate, RunbookRead

router = APIRouter()


@router.get("/", response_model=list[RunbookRead], dependencies=[Depends(require_viewer)])
async def list_runbooks(product_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Runbook)
    if product_id:
        q = q.where(Runbook.product_id == product_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=RunbookRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_editor)])
async def create_runbook(payload: RunbookCreate, db: AsyncSession = Depends(get_db)):
    runbook = Runbook(**payload.model_dump())
    db.add(runbook)
    await db.commit()
    await db.refresh(runbook)
    return runbook


@router.get("/{runbook_id}", response_model=RunbookRead, dependencies=[Depends(require_viewer)])
async def get_runbook(runbook_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    runbook = await db.get(Runbook, runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    return runbook


@router.patch("/{runbook_id}", response_model=RunbookRead, dependencies=[Depends(require_editor)])
async def update_runbook(runbook_id: uuid.UUID, payload: RunbookUpdate, db: AsyncSession = Depends(get_db)):
    runbook = await db.get(Runbook, runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(runbook, field, value)
    await db.commit()
    await db.refresh(runbook)
    return runbook


@router.delete("/{runbook_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_runbook(runbook_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    runbook = await db.get(Runbook, runbook_id)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    await db.delete(runbook)
    await db.commit()
