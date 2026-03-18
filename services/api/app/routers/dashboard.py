import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from minio import Minio
from minio.error import S3Error
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_viewer
from app.core.database import get_db
from app.models.models import (
    Client, Environment, Product, Runbook, ChangeRequest,
    ExceptionRecord, EvidenceRecord,
)

router = APIRouter()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "storage:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
MINIO_BUCKET = "evidence"


def _get_minio() -> Minio:
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)


@router.get("/", dependencies=[Depends(require_viewer)])
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    counts = {}
    for label, model in [
        ("clients", Client),
        ("environments", Environment),
        ("products", Product),
        ("runbooks", Runbook),
        ("changes", ChangeRequest),
        ("exceptions", ExceptionRecord),
        ("evidence", EvidenceRecord),
    ]:
        counts[label] = (await db.execute(select(func.count()).select_from(model))).scalar() or 0

    health_rows = (await db.execute(
        select(Product.health_status, func.count()).group_by(Product.health_status)
    )).all()
    health_breakdown = {str(row[0].value if hasattr(row[0], "value") else row[0]): row[1] for row in health_rows}

    lifecycle_rows = (await db.execute(
        select(Product.lifecycle_state, func.count()).group_by(Product.lifecycle_state)
    )).all()
    lifecycle_breakdown = {str(row[0].value if hasattr(row[0], "value") else row[0]): row[1] for row in lifecycle_rows}

    now = datetime.now(timezone.utc)
    exceptions_expiring_soon = (await db.execute(
        select(func.count()).select_from(ExceptionRecord).where(
            ExceptionRecord.expiry_date > now,
            ExceptionRecord.expiry_date <= now + timedelta(days=30),
        )
    )).scalar() or 0
    exceptions_expired = (await db.execute(
        select(func.count()).select_from(ExceptionRecord).where(
            ExceptionRecord.expiry_date <= now,
        )
    )).scalar() or 0

    storage_objects = 0
    storage_bytes = 0
    try:
        mc = _get_minio()
        if mc.bucket_exists(MINIO_BUCKET):
            for obj in mc.list_objects(MINIO_BUCKET, recursive=True):
                storage_objects += 1
                storage_bytes += obj.size or 0
    except S3Error:
        pass

    return {
        "counts": counts,
        "health_breakdown": health_breakdown,
        "lifecycle_breakdown": lifecycle_breakdown,
        "exceptions_expiring_soon": exceptions_expiring_soon,
        "exceptions_expired": exceptions_expired,
        "storage": {
            "objects": storage_objects,
            "bytes": storage_bytes,
        },
    }
