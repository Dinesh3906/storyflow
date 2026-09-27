from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.story import Story
from app.schemas.ai import AITransformRequest, AITransformResponse
from app.services.story_ai_service import StoryAIService

router = APIRouter(prefix="/stories/{story_id}/ai", tags=["Story AI Studio"])


@router.post("/transform", response_model=AITransformResponse)
async def transform_story_segment(
    story_id: str,
    payload: AITransformRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Apply targeted AI transformations (clean_up, rewrite, shorten, expand, convert to screenplay/poetry, etc.)
    Strictly preserves language identity and factual truth.
    """
    stmt = select(Story).where(Story.id == story_id, Story.user_id == current_user.id)
    story = (await db.execute(stmt)).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")

    result = await StoryAIService.transform_text(
        action=payload.action,
        selected_text=payload.selected_text,
        language=payload.language or story.language,
        script_mode=payload.script_mode or story.script_mode,
        style=payload.style or story.style,
        writing_mode=payload.writing_mode or story.writing_mode,
        full_story_context=payload.full_story_context or story.processed_text
    )

    return AITransformResponse(
        transformed_text=result["transformed_text"],
        explanation=f"Transformed using {result.get('engine', 'StoryEngine')} ({payload.action})",
        preserved_language=result["preserved_language"],
        execution_time_ms=result["execution_time_ms"]
    )
