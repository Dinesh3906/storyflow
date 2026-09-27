import pytest
import sys
import os
import uuid
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.main import app
from app.core.database import init_db


@pytest.mark.asyncio
async def test_api_full_workflow():
    # 1. Initialize tables
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Health check
        health_resp = await client.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "ok"

        # 3. User Registration
        unique_email = f"writer_{uuid.uuid4().hex[:8]}@storyflow.ai"
        reg_resp = await client.post("/api/v1/auth/register", json={
            "email": unique_email,
            "password": "Password123!",
            "full_name": "Antigravity Novelist"
        })
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()
        assert user_data["email"] == unique_email

        # 4. User Login
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        access_token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # 5. Create Project
        proj_resp = await client.post("/api/v1/projects", json={
            "title": "Hospital Chronicles",
            "description": "A thriller set in Hyderabad"
        }, headers=headers)
        assert proj_resp.status_code == 201
        project = proj_resp.json()
        project_id = project["id"]

        # 6. Create Story with Telugu & Romanized Script
        story_resp = await client.post("/api/v1/stories", json={
            "project_id": project_id,
            "title": "The Afraid Nurse",
            "language": "te",
            "script_mode": "romanized",
            "style": "narrative",
            "writing_mode": "faithful",
            "realtime_mode": "balanced"
        }, headers=headers)
        assert story_resp.status_code == 201
        story = story_resp.json()
        story_id = story["id"]
        assert story["script_mode"] == "romanized"

        # 7. Update Story (Autosave text)
        telugu_speech_raw = "A roju nenu hospital ki vellanu akkada oka nurse undi"
        telugu_speech_processed = "A roju nenu hospital ki vellanu. Akkada oka nurse undi."

        patch_resp = await client.patch(f"/api/v1/stories/{story_id}", json={
            "raw_transcript": telugu_speech_raw,
            "processed_text": telugu_speech_processed
        }, headers=headers)
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["raw_transcript"] == telugu_speech_raw
        assert updated["processed_text"] == telugu_speech_processed
        assert updated["word_count"] > 0

        # 8. Check Version History
        ver_resp = await client.get(f"/api/v1/stories/{story_id}/versions", headers=headers)
        assert ver_resp.status_code == 200
        versions = ver_resp.json()
        assert len(versions) >= 1

        # 9. AI Transformation Endpoint
        ai_resp = await client.post(f"/api/v1/stories/{story_id}/ai/transform", json={
            "action": "clean_up",
            "selected_text": "A roju nenu hospital ki vellanu",
            "language": "te",
            "script_mode": "romanized",
            "style": "narrative",
            "writing_mode": "faithful"
        }, headers=headers)
        assert ai_resp.status_code == 200
        ai_data = ai_resp.json()
        assert "hospital ki vellanu" in ai_data["transformed_text"]
        assert ai_data["preserved_language"] == "te"

        # 10. Trigger Export
        export_resp = await client.post(f"/api/v1/stories/{story_id}/export", json={
            "format": "pdf",
            "options": {
                "include_title_page": True,
                "font_family": "serif"
            }
        }, headers=headers)
        assert export_resp.status_code == 200
        export_data = export_resp.json()
        assert export_data["status"] == "completed"
        assert export_data["file_url"] is not None
