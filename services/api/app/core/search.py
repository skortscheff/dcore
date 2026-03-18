from meilisearch_python_sdk import AsyncClient

from app.core.config import settings

_client: AsyncClient | None = None


async def get_search_client() -> AsyncClient:
    global _client
    if _client is None:
        _client = AsyncClient(settings.meilisearch_url, settings.meilisearch_key)
    return _client


async def index_client(client_dict: dict) -> None:
    ms = await get_search_client()
    index = await ms.get_or_create_index("clients", primary_key="id")
    await index.add_documents([client_dict])


async def index_product(product_dict: dict) -> None:
    ms = await get_search_client()
    index = await ms.get_or_create_index("products", primary_key="id")
    await index.add_documents([product_dict])


async def delete_client_from_index(client_id: str) -> None:
    ms = await get_search_client()
    index = await ms.get_or_create_index("clients", primary_key="id")
    await index.delete_document(client_id)


async def delete_product_from_index(product_id: str) -> None:
    ms = await get_search_client()
    index = await ms.get_or_create_index("products", primary_key="id")
    await index.delete_document(product_id)


async def search_all(query: str) -> dict:
    ms = await get_search_client()
    clients_res = None
    products_res = None
    try:
        ci = await ms.get_or_create_index("clients", primary_key="id")
        clients_res = await ci.search(query)
    except Exception:
        pass
    try:
        pi = await ms.get_or_create_index("products", primary_key="id")
        products_res = await pi.search(query)
    except Exception:
        pass
    return {
        "clients": clients_res.hits if clients_res else [],
        "products": products_res.hits if products_res else [],
    }
