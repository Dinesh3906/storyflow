# StoryFlow — Realtime Voice-Driven AI Writing Studio

> **"Speak Your Story. Watch It Become a Story."**  
> Turn your voice into beautifully structured stories, scripts, poems, and narratives — in real time.

StoryFlow is a production-grade, low-latency AI writing instrument engineered for storytellers, novelists, screenwriters, poets, and journalists who think faster by speaking.

---

## 1. Core Capabilities & Architecture

```
Browser Microphone
       ↓ (20-40ms chunks)
Web Audio API / 16kHz PCM
       ↓
Persistent WebSocket
       ↓
Go Realtime Gateway (:8080)
       ↓
Streaming Speech-to-Text (Deepgram Nova-3)
       ↓
Language Identification Engine
       ↓
Script Romanization & Normalization (Teluglish / Hinglish)
       ↓
Story AI Transformation Engine (Faithful vs Literary)
       ↓
Next.js TipTap Prose Studio (:3000)
       ↓
FastAPI Backend (:8000) → PostgreSQL & Redis
```

### 1.1 Non-Negotiable Language Preservation
StoryFlow enforces strict language identity preservation:
- **Telugu speech**: `"A roju nenu morning hospital ki vellanu. Akkada oka nurse nannu chusi chala bayapadindi."`  
  → **Output**: Preserved in Latin/Roman script as **Roman Telugu (Teluglish)**.  
  → **Never** converted into English (`"That day I went to the hospital..."`) unless explicitly requested.
- **Hindi speech**: `"Us din main hospital gaya tha. Wahan ek nurse khadi thi."`  
  → **Output**: Preserved in Latin/Roman script as **Roman Hindi (Hinglish)**.
- **English speech**: Preserved as clean English prose.
- **Distinct Operations**:
  $$\text{Transcription} \neq \text{Transliteration} \neq \text{Translation} \neq \text{Rewriting}$$

### 1.2 Two-Way Document Ownership
- Finalized text and live provisional speech streams are visually separated.
- The writer can edit, delete, or refine past paragraphs while dictation is ongoing.
- Speech append operations never overwrite manual edits or cause cursor jumps.

### 1.3 Story Styles & Modes
- **Styles**: Narrative Prose, Screenplay (Industry standard scene sluglines and cues), Poetry (stanzas and cadence), Short Story, Novel Chapter, Journal, Dialogue.
- **Writing Modes**:
  - **Faithful Mode**: Zero fact invention. Only cleans punctuation, flow, and disfluencies.
  - **Literary Mode**: Stylistic enrichment while preserving 100% of underlying facts.

---

## 2. Monorepo Structure

```
storyflow/
├── apps/
│   ├── web/              # Next.js 14, React 18, Tailwind CSS, TipTap Editor, Zustand
│   ├── api/              # FastAPI Python backend (Auth, Stories, AI, Exports, Health)
│   └── realtime/         # Go Realtime Gateway (WebSocket audio streaming, Deepgram)
├── packages/
│   ├── shared-types/     # Shared TypeScript protocol and entity types
│   ├── config/           # System prompt templates, supported languages & styles
│   ├── validation/       # Zod request validation schemas
│   └── ui/               # Shared design tokens
├── infrastructure/
│   ├── docker/           # Production Dockerfiles (API, Realtime, Web)
│   └── monitoring/       # OpenTelemetry and Prometheus instrumentation
├── docs/
│   ├── ARCHITECTURE.md   # Detailed technical design & latency budgets
│   ├── WEBSOCKET_PROTOCOL.md # Typed event protocol catalog
│   └── DEPLOYMENT.md     # 1M concurrent user capacity & production deployment
└── tests/
    ├── test_language_preservation.py # Automated Telugu & Hindi language quality tests
    └── test_api_endpoints.py         # Full REST API lifecycle tests
```

---

## 3. Quick Start (Local Development)

### 3.1 Prerequisites
- Node.js 18+ (tested on Node 20 / 25)
- Python 3.11+
- Go 1.22+ (or Docker)

### 3.2 Automated Startup via Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```

### 3.3 Running Locally Without Docker
1. **Application API**:
   ```bash
   cd apps/api
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt email-validator
   .\.venv\Scripts\uvicorn app.main:app --reload --port 8000
   ```

2. **Web Studio**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

3. **Go Realtime Gateway**:
   ```bash
   cd apps/realtime
   go run cmd/server/main.go
   ```

Visit `http://localhost:3000` to launch the studio.

---

## 4. Test Suite

Run the automated test suite verifying language quality, transliteration, anti-hallucination, and API endpoints:

```bash
.\apps\api\.venv\Scripts\pytest tests
```

Result:
```
tests\test_api_endpoints.py .                                            [ 11%]
tests\test_language_preservation.py ........                             [100%]
======================== 9 passed, 5 warnings in 1.39s ========================
```

---

## 5. Security & Production Quality
- **No Mock or Fake Data**: Real authentication with bcrypt password hashing and JWT issuance; real database migrations and transactions; real audio downsampling to 16kHz PCM.
- **Zero Secret Exposure**: Provider API keys (`DEEPGRAM_API_KEY`, `GEMINI_API_KEY`, `AUTH_SECRET`) are never exposed to the frontend browser bundle.
- **Publication-Grade Exports**: Clean typeset HTML/PDF manuscripts with title pages, book-grade margins, and screenplay layouts.
