from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AuditLog, AuditAction


async def audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: AuditAction,
    actor: str,
    before: dict | None = None,
    after: dict | None = None,
    detail: str | None = None,
) -> None:
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        before_state=before,
        after_state=after,
        detail=detail,
    )
    db.add(entry)
