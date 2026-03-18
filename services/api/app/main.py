from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.routers import clients, environments, products, runbooks, changes, exceptions, evidence, health, search, audit, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Dcore API",
    description="Service Delivery Platform — MSSP",
    version="0.1.0",
    root_path="/api",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(search.router, tags=["search"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(environments.router, prefix="/environments", tags=["environments"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(runbooks.router, prefix="/runbooks", tags=["runbooks"])
app.include_router(changes.router, prefix="/changes", tags=["changes"])
app.include_router(exceptions.router, prefix="/exceptions", tags=["exceptions"])
app.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
app.include_router(audit.router, prefix="/audit", tags=["audit"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
