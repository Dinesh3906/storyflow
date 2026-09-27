from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ExportOptions(BaseModel):
    include_title_page: bool = True
    author_name: Optional[str] = None
    font_size: int = Field(default=12, ge=8, le=18)
    line_spacing: float = Field(default=1.5, ge=1.0, le=2.5)
    font_family: str = "serif"  # serif, sans, mono


class ExportRequest(BaseModel):
    format: str = Field(default="pdf", description="pdf, docx, markdown, txt")
    options: Optional[ExportOptions] = None


class ExportJobResponse(BaseModel):
    id: str
    story_id: str
    user_id: str
    format: str
    status: str
    file_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
