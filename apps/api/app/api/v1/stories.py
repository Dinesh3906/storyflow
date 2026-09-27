import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.story import Story
from app.models.document import Document, StoryVersion
from app.schemas.story import StoryCreate, StoryUpdate, StoryResponse

router = APIRouter(prefix="/stories", tags=["Stories"])


@router.get("", response_model=List[StoryResponse])
async def list_stories(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all stories belonging to authenticated user, optionally filtered by project."""
    stmt = select(Story).where(Story.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Story.project_id == project_id)
    stmt = stmt.order_by(Story.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    payload: StoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new story canvas within a project."""
    # Verify project exists and user owns it
    stmt = select(Project).where(Project.id == payload.project_id, Project.user_id == current_user.id)
    project = (await db.execute(stmt)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    settings_json = json.dumps(payload.settings.model_dump()) if payload.settings else "{}"

    story = Story(
        project_id=payload.project_id,
        user_id=current_user.id,
        title=payload.title,
        language=payload.language,
        script_mode=payload.script_mode,
        style=payload.style,
        writing_mode=payload.writing_mode,
        realtime_mode=payload.realtime_mode,
        raw_transcript="",
        processed_text="",
        word_count=0,
        settings_json=settings_json
    )
    db.add(story)
    await db.flush()

    # Create associated document
    doc = Document(
        story_id=story.id,
        content_json="{}",
        plain_text="",
        version=1
    )
    db.add(doc)

    # Create initial version
    initial_version = StoryVersion(
        story_id=story.id,
        version_number=1,
        content="",
        raw_transcript="",
        word_count=0,
        change_summary="Initial blank draft"
    )
    db.add(initial_version)

    await db.commit()
    await db.refresh(story)
    return story


@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve story by ID with user ownership check."""
    stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


@router.patch("/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: str,
    payload: StoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update story content, configuration, or trigger autosave.
    Preserves raw transcript and processed text cleanly.
    """
    stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    content_changed = False

    if payload.title is not None:
        story.title = payload.title
    if payload.language is not None:
        story.language = payload.language
    if payload.script_mode is not None:
        story.script_mode = payload.script_mode
    if payload.style is not None:
        story.style = payload.style
    if payload.writing_mode is not None:
        story.writing_mode = payload.writing_mode
    if payload.realtime_mode is not None:
        story.realtime_mode = payload.realtime_mode
    if payload.settings_json is not None:
        story.settings_json = payload.settings_json

    if payload.processed_text is not None and payload.processed_text != story.processed_text:
        story.processed_text = payload.processed_text
        words = payload.processed_text.split()
        story.word_count = len(words)
        content_changed = True

    if payload.raw_transcript is not None:
        story.raw_transcript = payload.raw_transcript
        content_changed = True

    # If significant content changed, create an automatic version record
    if content_changed:
        # Get latest version number
        v_stmt = select(StoryVersion).where(StoryVersion.story_id == story.id).order_by(StoryVersion.version_number.desc()).limit(1)
        latest_version = (await db.execute(v_stmt)).scalar_one_or_none()
        next_ver = (latest_version.version_number + 1) if latest_version else 1

        new_version = StoryVersion(
            story_id=story.id,
            version_number=next_ver,
            content=story.processed_text,
            raw_transcript=story.raw_transcript,
            word_count=story.word_count,
            change_summary=f"Autosave (Version {next_ver})"
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(story)
    return story


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a story and all related versions and transcripts."""
    stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    await db.delete(story)
    await db.commit()
    return None
