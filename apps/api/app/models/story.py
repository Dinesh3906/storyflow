import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Language & Script Configuration
    language: Mapped[str] = mapped_column(String(20), default="auto", nullable=False)
    script_mode: Mapped[str] = mapped_column(String(20), default="romanized", nullable=False)
    style: Mapped[str] = mapped_column(String(30), default="narrative", nullable=False)
    writing_mode: Mapped[str] = mapped_column(String(20), default="faithful", nullable=False)
    realtime_mode: Mapped[str] = mapped_column(String(20), default="balanced", nullable=False)

    # Separate storage for Raw vs Processed text (Critical Requirement)
    raw_transcript: Mapped[str] = mapped_column(Text, default="", nullable=False)
    processed_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # JSON Settings string
    settings_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="stories")
    user = relationship("User", back_populates="stories")
    document = relationship("Document", back_populates="story", uselist=False, cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")
    paragraphs = relationship("Paragraph", back_populates="story", cascade="all, delete-orphan")
    versions = relationship("StoryVersion", back_populates="story", cascade="all, delete-orphan")
    sessions = relationship("StorySession", back_populates="story", cascade="all, delete-orphan")
    characters = relationship("StoryCharacter", back_populates="story", cascade="all, delete-orphan")
    locations = relationship("StoryLocation", back_populates="story", cascade="all, delete-orphan")
    events = relationship("StoryEvent", back_populates="story", cascade="all, delete-orphan")
    exports = relationship("ExportJob", back_populates="story", cascade="all, delete-orphan")
