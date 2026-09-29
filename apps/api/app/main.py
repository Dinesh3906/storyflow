from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.stories import router as stories_router
from app.api.v1.versions import router as versions_router
from app.api.v1.ai import router as ai_router
from app.api.v1.export import router as export_router
from app.api.v1.health import router as health_router
from app.api.v1.admin import router as admin_router
from app.api.v1.transcribe import router as transcribe_router
from app.api.v1.websocket_gateway import ws_router

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger("storyflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist
    logger.info("Initializing StoryFlow database tables...")
    await init_db()
    logger.info("StoryFlow API started successfully.")
    yield
    logger.info("Shutting down StoryFlow API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="StoryFlow: Realtime Voice-Driven AI Writing Studio",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production config can constrain to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(projects_router, prefix=api_v1_prefix)
app.include_router(stories_router, prefix=api_v1_prefix)
app.include_router(versions_router, prefix=api_v1_prefix)
app.include_router(ai_router, prefix=api_v1_prefix)
app.include_router(export_router, prefix=api_v1_prefix)
app.include_router(admin_router, prefix=api_v1_prefix)
app.include_router(transcribe_router, prefix=api_v1_prefix)
app.include_router(health_router)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "name": "StoryFlow API",
        "version": settings.VERSION,
        "docs": "/docs",
        "status": "operational"
    }
