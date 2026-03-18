import uuid
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import require_editor, require_viewer, require_admin
from app.core.search import index_client, delete_client_from_index
from app.models.models import Client
from app.schemas.schemas import ClientCreate, ClientUpdate, ClientRead

router = APIRouter()


@router.get("/", response_model=list[ClientRead], dependencies=[Depends(require_viewer)])
async def list_clients(db: AsyncSession = Depends(get_db)) -> Sequence[Client]:
    result = await db.execute(select(Client))
    return result.scalars().all()


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_editor)])
async def create_client(payload: ClientCreate, db: AsyncSession = Depends(get_db)) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    await index_client({"id": str(client.id), "code": client.code, "name": client.name, "sla_tier": client.sla_tier})
    return client


@router.get("/{client_id}", response_model=ClientRead, dependencies=[Depends(require_viewer)])
async def get_client(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Client:
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientRead, dependencies=[Depends(require_editor)])
async def update_client(client_id: uuid.UUID, payload: ClientUpdate, db: AsyncSession = Depends(get_db)) -> Client:
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    await index_client({"id": str(client.id), "code": client.code, "name": client.name, "sla_tier": client.sla_tier})
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_client(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    await delete_client_from_index(str(client_id))
