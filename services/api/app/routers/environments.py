import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import require_editor, require_viewer, require_admin
from app.models.models import Environment
from app.schemas.schemas import EnvironmentCreate, EnvironmentUpdate, EnvironmentRead

router = APIRouter()


@router.get("/", response_model=list[EnvironmentRead], dependencies=[Depends(require_viewer)])
async def list_environments(client_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Environment)
    if client_id:
        q = q.where(Environment.client_id == client_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=EnvironmentRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_editor)])
async def create_environment(payload: EnvironmentCreate, db: AsyncSession = Depends(get_db)):
    env = Environment(**payload.model_dump())
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env


@router.get("/{env_id}", response_model=EnvironmentRead, dependencies=[Depends(require_viewer)])
async def get_environment(env_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    env = await db.get(Environment, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.patch("/{env_id}", response_model=EnvironmentRead, dependencies=[Depends(require_editor)])
async def update_environment(env_id: uuid.UUID, payload: EnvironmentUpdate, db: AsyncSession = Depends(get_db)):
    env = await db.get(Environment, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(env, field, value)
    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_environment(env_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    env = await db.get(Environment, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    await db.delete(env)
    await db.commit()
