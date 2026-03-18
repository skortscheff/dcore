import uuid
import io
import os
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from minio import Minio
from minio.error import S3Error
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import TokenData, require_editor, require_viewer, require_admin
from app.core.audit import audit
from app.models.models import EvidenceRecord, AuditAction
from app.schemas.schemas import EvidenceRecordRead

router = APIRouter()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
MINIO_BUCKET = "evidence"


def _get_minio() -> Minio:
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)


def _ensure_bucket(client: Minio) -> None:
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)


@router.get("/", response_model=list[EvidenceRecordRead], dependencies=[Depends(require_viewer)])
async def list_evidence(product_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    q = select(EvidenceRecord)
    if product_id:
        q = q.where(EvidenceRecord.product_id == product_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/upload", response_model=EvidenceRecordRead, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    product_id: uuid.UUID = Form(...),
    title: str = Form(...),
    artifact_type: str = Form(...),
    cobit_control: str | None = Form(None),
    itil_process: str | None = Form(None),
    related_change_id: uuid.UUID | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: TokenData = Depends(require_editor),
):
    actor = user.preferred_username or user.sub
    object_name = f"{product_id}/{uuid.uuid4()}_{file.filename}"
    try:
        minio_client = _get_minio()
        _ensure_bucket(minio_client)
        file_data = await file.read()
        minio_client.put_object(
            MINIO_BUCKET,
            object_name,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=file.content_type or "application/octet-stream",
        )
    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")

    ev = EvidenceRecord(
        product_id=product_id,
        title=title,
        artifact_type=artifact_type,
        storage_path=object_name,
        file_name=file.filename,
        mime_type=file.content_type,
        cobit_control=cobit_control,
        itil_process=itil_process,
        related_change_id=related_change_id,
    )
    db.add(ev)
    await db.flush()
    await audit(db, "evidence", str(ev.id), AuditAction.upload, actor,
                after={"file_name": file.filename, "artifact_type": artifact_type, "cobit_control": cobit_control},
                detail=f"File uploaded: {file.filename}")
    await db.commit()
    await db.refresh(ev)
    return ev


@router.get("/{evidence_id}", response_model=EvidenceRecordRead, dependencies=[Depends(require_viewer)])
async def get_evidence(evidence_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ev = await db.get(EvidenceRecord, evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return ev


@router.get("/{evidence_id}/download-url", dependencies=[Depends(require_viewer)])
async def get_download_url(evidence_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ev = await db.get(EvidenceRecord, evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    if not ev.storage_path:
        raise HTTPException(status_code=404, detail="No file attached to this evidence record")
    try:
        minio_client = _get_minio()
        url = minio_client.presigned_get_object(MINIO_BUCKET, ev.storage_path, expires=timedelta(hours=1))
    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Storage error: {e}")
    return {"url": url, "file_name": ev.file_name, "expires_in_seconds": 3600}


@router.delete("/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evidence(
    evidence_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: TokenData = Depends(require_admin),
):
    actor = user.preferred_username or user.sub
    ev = await db.get(EvidenceRecord, evidence_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    if ev.storage_path:
        try:
            minio_client = _get_minio()
            minio_client.remove_object(MINIO_BUCKET, ev.storage_path)
        except S3Error:
            pass
    await audit(db, "evidence", str(ev.id), AuditAction.delete, actor,
                before={"file_name": ev.file_name, "storage_path": ev.storage_path},
                detail="Evidence record deleted")
    await db.delete(ev)
    await db.commit()
