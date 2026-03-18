from fastapi import APIRouter, Depends

from app.core.auth import require_viewer
from app.core.search import search_all

router = APIRouter()


@router.get("/search", dependencies=[Depends(require_viewer)])
async def global_search(q: str = ""):
    if not q.strip():
        return {"clients": [], "products": []}
    return await search_all(q)
