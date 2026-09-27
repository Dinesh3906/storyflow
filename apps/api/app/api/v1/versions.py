from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.story import Story
from app.models.document import StoryVersion
from app.schemas.story import StoryVersionResponse, StoryResponse

router = APIRouter(prefix="/stories/{story_id}/versions", tags=["Story Versions"])


@router.get("", response_model=List[StoryVersionResponse])
async def list_story_versions(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all saved snapshots and version history for a story."""
    # Verify ownership
    s_stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(s_stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    stmt = select(StoryVersion).where(StoryVersion.story_id == story_id).order_by(StoryVersion.version_number.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{version_number}", response_model=StoryVersionResponse)
async def get_story_version(
    story_id: str,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Inspect and preview a specific past version."""
    s_stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(s_stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    stmt = select(StoryVersion).where(
        StoryVersion.story_id == story_id,
        StoryVersion.version_number == version_number
    )
    version = (await db.execute(stmt)).scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    return version


@router.post("/{version_number}/restore", response_model=StoryResponse)
async def restore_story_version(
    story_id: str,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Restore story content to a chosen prior version without losing history."""
    s_stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(s_stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    stmt = select(StoryVersion).where(
        StoryVersion.story_id == story_id,
        StoryVersion.version_number == version_number
    )
    target_version = (await db.execute(stmt)).scalar_one_or_none()
    if not target_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target version not found")

    # Update story
    story.processed_text = target_version.content
    story.raw_transcript = target_version.raw_transcript
    story.word_count = target_version.word_count

    # Create new version documenting the restore
    latest_stmt = select(StoryVersion).where(StoryVersion.story_id == story.id).order_by(StoryVersion.version_number.desc()).limit(1)
    latest_ver = (await db.execute(latest_stmt)).scalar_one()

    restoration_record = StoryVersion(
        story_id=story.id,
        version_number=latest_ver.version_number + 1,
        content=story.processed_text,
        raw_transcript=story.raw_transcript,
        word_count=story.word_count,
        change_summary=f"Restored from Version {version_number}"
    )
    db.add(restoration_record)

    await db.commit()
    await db.refresh(story)
    return story
