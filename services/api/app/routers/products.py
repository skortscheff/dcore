import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import TokenData, require_editor, require_viewer, require_admin, get_current_user
from app.core.record_ids import next_product_id
from app.core.search import index_product, delete_product_from_index
from app.core.lifecycle import is_valid_transition, allowed_next_states
from app.core.audit import audit
from app.models.models import Product, AuditAction
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductRead, ProductTransition

router = APIRouter()


def _product_dict(p: Product) -> dict:
    return {
        "id": str(p.id), "record_id": p.record_id, "name": p.name,
        "product_type": p.product_type, "vendor": p.vendor,
        "lifecycle_state": p.lifecycle_state, "health_status": p.health_status,
    }


@router.get("/", response_model=list[ProductRead], dependencies=[Depends(require_viewer)])
async def list_products(environment_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    q = select(Product)
    if environment_id:
        q = q.where(Product.environment_id == environment_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    product = Product(**payload.model_dump())
    db.add(product)
    await audit(db, "product", payload.record_id, AuditAction.create, user.preferred_username or user.sub, after=_product_dict(product))
    await db.commit()
    await db.refresh(product)
    try:
        await index_product(_product_dict(product))
    except Exception:
        pass
    return product


@router.get("/next-id", dependencies=[Depends(require_viewer)])
async def get_next_product_id(
    environment_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        record_id = await next_product_id(db, environment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"record_id": record_id}


@router.get("/{product_id}", response_model=ProductRead, dependencies=[Depends(require_viewer)])
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: uuid.UUID, payload: ProductUpdate, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    before = _product_dict(product)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await audit(db, "product", str(product_id), AuditAction.update, user.preferred_username or user.sub, before=before, after=_product_dict(product))
    await db.commit()
    await db.refresh(product)
    try:
        await index_product(_product_dict(product))
    except Exception:
        pass
    return product


@router.post("/{product_id}/transition", response_model=ProductRead)
async def transition_product(product_id: uuid.UUID, payload: ProductTransition, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_editor)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not is_valid_transition(product.lifecycle_state, payload.target_state):
        allowed = [s.value for s in allowed_next_states(product.lifecycle_state)]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid transition '{product.lifecycle_state}' → '{payload.target_state}'. Allowed: {allowed}",
        )
    before_state = product.lifecycle_state.value
    product.lifecycle_state = payload.target_state
    detail = f"{before_state} → {payload.target_state.value}"
    if payload.reason:
        detail += f" | {payload.reason}"
    await audit(db, "product", str(product_id), AuditAction.transition, user.preferred_username or user.sub, detail=detail)
    await db.commit()
    await db.refresh(product)
    try:
        await index_product(_product_dict(product))
    except Exception:
        pass
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: TokenData = Depends(require_admin)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await audit(db, "product", str(product_id), AuditAction.delete, user.preferred_username or user.sub, before=_product_dict(product))
    await db.delete(product)
    await db.commit()
    try:
        await delete_product_from_index(str(product_id))
    except Exception:
        pass
