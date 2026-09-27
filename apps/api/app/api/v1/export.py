import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.story import Story
from app.models.export import ExportJob
from app.schemas.export import ExportRequest, ExportJobResponse
from app.services.export_service import ExportService

router = APIRouter(prefix="/stories/{story_id}/export", tags=["Story Exports"])


@router.post("", response_model=ExportJobResponse)
async def trigger_export(
    story_id: str,
    payload: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger document typesetting and export job."""
    stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    job = ExportJob(
        story_id=story.id,
        user_id=current_user.id,
        format=payload.format,
        status="completed"
    )
    db.add(job)
    await db.flush()

    options = payload.options.model_dump() if payload.options else {}
    if not options.get("author_name"):
        options["author_name"] = current_user.full_name

    file_url = await ExportService.create_export_file(story, job, options)
    job.file_url = file_url
    job.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(job)
    return job


@router.get("/{export_id}", response_model=ExportJobResponse)
async def get_export_status(
    story_id: str,
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check the status of an export job."""
    stmt = select(ExportJob).where(
        ExportJob.id == export_id,
        ExportJob.story_id == story_id,
        ExportJob.user_id == current_user.id
    )
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")
    return job


@router.get("/{export_id}/download")
async def download_export(
    story_id: str,
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download the generated export document."""
    stmt = select(ExportJob).where(
        ExportJob.id == export_id,
        ExportJob.story_id == story_id,
        ExportJob.user_id == current_user.id
    )
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")

    export_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "exports")
    filename = f"{story_id}_{export_id}.html"
    filepath = os.path.join(export_dir, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export file does not exist on disk")

    return FileResponse(
        path=filepath,
        filename=f"story_{story_id}.html",
        media_type="text/html"
    )
