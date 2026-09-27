import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.models.story import Story
from app.models.export import ExportJob

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
  @page {{
    size: A4;
    margin: 2.5cm 2cm 2.5cm 2cm;
    @bottom-center {{
      content: counter(page);
      font-size: 10pt;
      color: #666;
    }}
  }}
  body {{
    font-family: {font_family_css};
    font-size: {font_size}pt;
    line-height: {line_spacing};
    color: #1a1a1a;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }}
  .title-page {{
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    text-align: center;
  }}
  .story-title {{
    font-size: 28pt;
    font-weight: 700;
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
  }}
  .story-author {{
    font-size: 14pt;
    color: #555555;
    margin-bottom: 2rem;
  }}
  .story-meta {{
    font-size: 10pt;
    color: #888888;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }}
  .content {{
    white-space: pre-wrap;
    text-align: justify;
    text-justify: inter-word;
  }}
  /* Screenplay formatting */
  .screenplay {{
    font-family: 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    text-align: left;
    max-width: 6.0in;
    margin: 0 auto;
  }}
  /* Poetry formatting */
  .poetry {{
    font-style: italic;
    line-height: 1.8;
    text-align: left;
    margin-left: 2cm;
  }}
</style>
</head>
<body>
  {title_page_html}
  <main class="content {style_class}">
{body_text}
  </main>
</body>
</html>
"""


class ExportService:
    @classmethod
    def generate_html_document(
        cls,
        story: Story,
        author_name: Optional[str] = "Anonymous Writer",
        include_title_page: bool = True,
        font_size: int = 12,
        line_spacing: float = 1.5,
        font_family: str = "serif"
    ) -> str:
        """
        Renders a publication-ready HTML representation for PDF generation.
        """
        font_families = {
            "serif": "Georgia, 'Times New Roman', Cambria, serif",
            "sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            "mono": "'Courier New', Courier, monospace"
        }
        font_css = font_families.get(font_family, font_families["serif"])

        title_page_html = ""
        if include_title_page:
            created_str = story.created_at.strftime("%B %d, %Y")
            title_page_html = f"""
  <div class="title-page">
    <h1 class="story-title">{story.title}</h1>
    <p class="story-author">by {author_name}</p>
    <p class="story-meta">{story.style.upper()} &bull; {story.language.upper()} &bull; {created_str}</p>
  </div>
"""

        style_class = ""
        if story.style == "screenplay":
            style_class = "screenplay"
        elif story.style == "poetry":
            style_class = "poetry"

        content_text = story.processed_text or story.raw_transcript or "No content recorded yet."

        html = HTML_TEMPLATE.format(
            title=story.title,
            font_family_css=font_css,
            font_size=font_size,
            line_spacing=line_spacing,
            title_page_html=title_page_html,
            style_class=style_class,
            body_text=content_text
        )
        return html

    @classmethod
    async def create_export_file(
        cls,
        story: Story,
        export_job: ExportJob,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generates and saves the exported document.
        Returns the download URL or relative path.
        """
        opts = options or {}
        export_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "exports")
        os.makedirs(export_dir, exist_ok=True)

        filename = f"{story.id}_{export_job.id}.html"
        filepath = os.path.join(export_dir, filename)

        html_content = cls.generate_html_document(
            story=story,
            author_name=opts.get("author_name", "Author"),
            include_title_page=opts.get("include_title_page", True),
            font_size=opts.get("font_size", 12),
            line_spacing=opts.get("line_spacing", 1.5),
            font_family=opts.get("font_family", "serif")
        )

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)

        return f"/api/v1/stories/{story.id}/export/{export_job.id}/download"
