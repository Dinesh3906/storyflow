# StoryFlow Realtime WebSocket Event Protocol Specification

## 1. Overview
The StoryFlow Realtime Gateway coordinates streaming audio transport, speech-to-text decoding, language detection, script romanization, and live document editor updates.

- **Transport**: WebSocket (`ws://` / `wss://`)
- **Format**: JSON events (Text frames) & raw 16kHz 16-bit Mono PCM (Binary frames)
- **Framing target**: 20–40 ms chunks (default 30 ms)

---

## 2. Standard Envelope
Every event sent or received adheres to the following base structure:

```json
{
  "type": "transcript.partial",
  "sessionId": "sess_1727415200000",
  "sequence": 183,
  "timestamp": "2026-09-27T10:30:00.123Z",
  "payload": { ... }
}
```

- `type`: String event identifier (see catalog below).
- `sessionId`: Unique identifier for the active dictation session.
- `sequence`: Monotonically increasing sequence number per session used for ordering and duplicate prevention.
- `timestamp`: ISO-8601 UTC timestamp.
- `payload`: Typed event payload.

---

## 3. Event Catalog

### 3.1 Connection & Lifecycle
| Event Type | Origin | Description |
|------------|--------|-------------|
| `connection.ready` | Server | Handshake acknowledgment containing session ID, heartbeat interval, and provider status. |
| `session.start` | Client | Initiates dictation session with story configuration (language, scriptMode, style, writingMode). |
| `session.started` | Server | Confirms session initialization and engine readiness. |
| `session.pause` | Client | Suspends audio ingestion without dropping story context. |
| `session.paused` | Server | Confirms session suspension. |
| `session.resume` | Client | Resumes audio stream. |
| `session.resumed` | Server | Confirms session resumption. |
| `client.heartbeat` | Client | Ping message sent every 15s to maintain active connection. |
| `server.heartbeat` | Server | Heartbeat acknowledgment. |

### 3.2 Audio Streaming
| Event Type | Origin | Description |
|------------|--------|-------------|
| `audio.start` | Client | Signals microphone stream initiation. |
| `audio.started` | Server | Confirms audio pipeline parameters (16kHz, 1-channel, 16-bit PCM). |
| `audio.chunk` | Client | Base64-encoded PCM chunk or binary WebSocket frame with RMS meter level. |
| `audio.stop` | Client | Concludes current audio recording session. |
| `audio.stopped` | Server | Confirms audio stream termination. |

### 3.3 Transcription & Language Events
| Event Type | Origin | Description |
|------------|--------|-------------|
| `language.detected` | Server | Emitted when spoken language is identified (e.g. `te`, `hi`, `en`). |
| `transcript.partial` | Server | High-frequency provisional transcription stream for low-latency live feedback. |
| `transcript.final` | Server | Confirmed final sentence segment with timestamps and confidence. |

### 3.4 Story Processing & Editor Synchronization
| Event Type | Origin | Description |
|------------|--------|-------------|
| `story.delta` | Server | Incremental transformed prose token stream. |
| `story.paragraph.final` | Server | Fully transformed and formatted prose paragraph appended to document. |
| `story.saved` | Server | Confirmation of autosave or manual version snapshot. |
| `story.error` | Server | Structured error details with recoverable flag. |

---

## 4. Reconnection & Resilience Contract
1. **Exponential Backoff**: Clients retry disconnections starting at 1.0s up to a ceiling of 10.0s with randomized jitter.
2. **Session Resumption**: Clients reconnect with their prior `sessionId` and last acknowledged `sequence` number.
3. **Zero Loss Guarantee**: The browser buffers unsaved edits in `localStorage` until the gateway acknowledges receipt.
