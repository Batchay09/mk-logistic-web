from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import auth, calculator, client, stickers, manager, admin, payments

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(calculator.router)
app.include_router(client.router)
app.include_router(stickers.router)
app.include_router(manager.router)
app.include_router(admin.router)
app.include_router(payments.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.PROJECT_VERSION}
