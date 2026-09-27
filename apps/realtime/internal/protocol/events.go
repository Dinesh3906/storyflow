package protocol

import "time"

type WebSocketEventType string

const (
	EventConnectionReady    WebSocketEventType = "connection.ready"
	EventSessionStart       WebSocketEventType = "session.start"
	EventSessionStarted     WebSocketEventType = "session.started"
	EventSessionPause       WebSocketEventType = "session.pause"
	EventSessionPaused      WebSocketEventType = "session.paused"
	EventSessionResume      WebSocketEventType = "session.resume"
	EventSessionResumed     WebSocketEventType = "session.resumed"
	EventAudioStart         WebSocketEventType = "audio.start"
	EventAudioStarted       WebSocketEventType = "audio.started"
	EventAudioChunk         WebSocketEventType = "audio.chunk"
	EventAudioStop          WebSocketEventType = "audio.stop"
	EventAudioStopped       WebSocketEventType = "audio.stopped"
	EventTranscriptPartial  WebSocketEventType = "transcript.partial"
	EventTranscriptFinal    WebSocketEventType = "transcript.final"
	EventLanguageDetected   WebSocketEventType = "language.detected"
	EventStoryDelta         WebSocketEventType = "story.delta"
	EventStoryParagraphFinal WebSocketEventType = "story.paragraph.final"
	EventStorySaved         WebSocketEventType = "story.saved"
	EventStoryError         WebSocketEventType = "story.error"
	EventClientHeartbeat    WebSocketEventType = "client.heartbeat"
	EventServerHeartbeat    WebSocketEventType = "server.heartbeat"
)

type BaseMessage[T any] struct {
	Type      WebSocketEventType `json:"type"`
	SessionID string             `json:"sessionId"`
	Sequence  int64              `json:"sequence"`
	Timestamp string             `json:"timestamp"`
	Payload   T                  `json:"payload"`
}

type SessionStartPayload struct {
	StoryID      string `json:"storyId"`
	UserID       string `json:"userId"`
	Language     string `json:"language"`
	ScriptMode   string `json:"scriptMode"`
	Style        string `json:"style"`
	WritingMode  string `json:"writingMode"`
	RealtimeMode string `json:"realtimeMode"`
	SampleRate   int    `json:"sampleRate,omitempty"`
}

type ConnectionReadyPayload struct {
	ConnectionID        string `json:"connectionId"`
	ServerTimestamp     string `json:"serverTimestamp"`
	HeartbeatIntervalMs int    `json:"heartbeatIntervalMs"`
	DeepgramConfigured  bool   `json:"deepgramConfigured"`
}

type TranscriptPartialPayload struct {
	SegmentID  string  `json:"segmentId"`
	Text       string  `json:"text"`
	Language   string  `json:"language"`
	Confidence float64 `json:"confidence"`
	IsFinal    bool    `json:"isFinal"`
	StartMs    int64   `json:"startMs"`
	EndMs      int64   `json:"endMs"`
}

type TranscriptFinalPayload struct {
	SegmentID  string  `json:"segmentId"`
	RawText    string  `json:"rawText"`
	Language   string  `json:"language"`
	Confidence float64 `json:"confidence"`
	IsFinal    bool    `json:"isFinal"`
	StartMs    int64   `json:"startMs"`
	EndMs      int64   `json:"endMs"`
}

type LanguageDetectedPayload struct {
	DetectedLanguage string  `json:"detectedLanguage"`
	Confidence       float64 `json:"confidence"`
	IsFallback       bool    `json:"isFallback"`
}

type StoryParagraphFinalPayload struct {
	ParagraphID    string `json:"paragraphId"`
	RawTranscript  string `json:"rawTranscript"`
	ProcessedText  string `json:"processedText"`
	Language       string `json:"language"`
	ScriptMode     string `json:"scriptMode"`
	Style          string `json:"style"`
	OrderIndex     int64  `json:"orderIndex"`
	WordCount      int    `json:"wordCount"`
}

type StoryErrorPayload struct {
	Code        string `json:"code"`
	Message     string `json:"message"`
	Recoverable bool   `json:"recoverable"`
}

func FormatTimestamp(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}
