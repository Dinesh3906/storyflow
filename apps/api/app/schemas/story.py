from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StorySettingsSchema(BaseModel):
    auto_punctuate: bool = True
    preserve_repetitions: bool = False
    colloquial_vocabulary: List[str] = Field(default_factory=list)
    custom_names: List[str] = Field(default_factory=list)
    theme: str = "dark"


class StoryCreate(BaseModel):
    project_id: str
    title: str = Field(..., min_length=1, max_length=255)
    language: str = "auto"
    script_mode: str = "romanized"  # romanized (Teluglish/Hinglish), original, english
    style: str = "narrative"        # narrative, screenplay, poetry, etc.
    writing_mode: str = "faithful"  # faithful, literary
    realtime_mode: str = "balanced" # fast, balanced, writing
    settings: Optional[StorySettingsSchema] = None


class StoryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    language: Optional[str] = None
    script_mode: Optional[str] = None
    style: Optional[str] = None
    writing_mode: Optional[str] = None
    realtime_mode: Optional[str] = None
    processed_text: Optional[str] = None
    raw_transcript: Optional[str] = None
    word_count: Optional[int] = None
    settings_json: Optional[str] = None


class StoryVersionResponse(BaseModel):
    id: str
    story_id: str
    version_number: int
    content: str
    raw_transcript: str
    word_count: int
    change_summary: str
    created_at: datetime

    class Config:
        from_attributes = True


class StoryResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    language: str
    script_mode: str
    style: str
    writing_mode: str
    realtime_mode: str
    raw_transcript: str
    processed_text: str
    word_count: int
    settings_json: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
