import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Client, ChangeRequest, Environment, ExceptionRecord, Product


def _env_type(env_name: str) -> str:
    n = env_name.upper()
    if n in ("PROD", "PRODUCTION"):
        return "PRD"
    if n == "DR":
        return "DR"
    if n in ("STAGING", "STG"):
        return "STG"
    if n in ("TEST", "TST"):
        return "TST"
    return "ENV"


def _parse_max_seq(rows: list[str]) -> int:
    max_seq = 0
    for rid in rows:
        try:
            seq = int(rid.rsplit("-", 1)[-1])
            if seq > max_seq:
                max_seq = seq
        except (ValueError, IndexError):
            pass
    return max_seq


async def next_product_id(db: AsyncSession, environment_id: uuid.UUID) -> str:
    env = await db.get(Environment, environment_id)
    if not env:
        raise ValueError(f"Environment {environment_id} not found")
    client = await db.get(Client, env.client_id)
    if not client:
        raise ValueError(f"Client not found for environment {environment_id}")
    env_type = _env_type(env.name)
    prefix = f"{client.code}-{env_type}-"
    result = await db.execute(
        select(Product.record_id).where(Product.record_id.like(f"{prefix}%"))
    )
    rows = result.scalars().all()
    seq = _parse_max_seq(rows)
    return f"{prefix}{seq + 1:03d}"


async def next_change_id(db: AsyncSession, client_id: uuid.UUID) -> str:
    client = await db.get(Client, client_id)
    if not client:
        raise ValueError(f"Client {client_id} not found")
    prefix = f"CHG-{client.code}-"
    result = await db.execute(
        select(ChangeRequest.record_id).where(ChangeRequest.record_id.like(f"{prefix}%"))
    )
    rows = result.scalars().all()
    seq = _parse_max_seq(rows)
    return f"{prefix}{seq + 1:04d}"


async def next_exception_id(db: AsyncSession, client_id: uuid.UUID) -> str:
    client = await db.get(Client, client_id)
    if not client:
        raise ValueError(f"Client {client_id} not found")
    prefix = f"EXC-{client.code}-"
    result = await db.execute(
        select(ExceptionRecord.record_id).where(ExceptionRecord.record_id.like(f"{prefix}%"))
    )
    rows = result.scalars().all()
    seq = _parse_max_seq(rows)
    return f"{prefix}{seq + 1:04d}"
