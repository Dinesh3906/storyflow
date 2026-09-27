from typing import Optional, List
from pydantic import BaseModel, Field


class AITransformRequest(BaseModel):
    action: str = Field(
        ...,
        description="clean_up, rewrite, continue, shorten, expand, make_literary, make_simple, convert_dialogue, convert_script, convert_poetry"
    )
    selected_text: str = Field(..., min_length=1)
    full_story_context: Optional[str] = None
    language: str = "auto"
    script_mode: str = "romanized"
    style: str = "narrative"
    writing_mode: str = "faithful"


class AITransformResponse(BaseModel):
    transformed_text: str
    explanation: Optional[str] = None
    preserved_language: str
    execution_time_ms: float
