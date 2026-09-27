package session

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/storyflow/storyflow/apps/realtime/internal/protocol"
	"github.com/storyflow/storyflow/apps/realtime/internal/speech"
)

type Session struct {
	ID           string
	StoryID      string
	UserID       string
	Conn         *websocket.Conn
	SpeechProv   speech.SpeechProvider
	Language     string
	ScriptMode   string
	Style        string
	WritingMode  string
	RealtimeMode string
	Sequence     int64
	IsPaused     bool
	mu           sync.Mutex
	writeMu      sync.Mutex
	closed       bool
}

func NewSession(id, storyID string, conn *websocket.Conn, prov speech.SpeechProvider) *Session {
	return &Session{
		ID:         id,
		StoryID:    storyID,
		Conn:       conn,
		SpeechProv: prov,
		Language:   "auto",
		ScriptMode: "romanized",
		Style:      "narrative",
	}
}

func (s *Session) SendEvent(eventType protocol.WebSocketEventType, payload any) error {
	seq := atomic.AddInt64(&s.Sequence, 1)

	msg := map[string]any{
		"type":      eventType,
		"sessionId": s.ID,
		"sequence":  seq,
		"timestamp": protocol.FormatTimestamp(time.Now()),
		"payload":   payload,
	}

	bytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	if s.closed || s.Conn == nil {
		return fmt.Errorf("session connection is closed")
	}

	return s.Conn.WriteMessage(websocket.TextMessage, bytes)
}

func (s *Session) ProcessAudio(pcmChunk []byte) {
	s.mu.Lock()
	paused := s.IsPaused
	prov := s.SpeechProv
	s.mu.Unlock()

	if paused || prov == nil {
		return
	}

	if err := prov.SendAudio(pcmChunk); err != nil {
		log.Printf("Failed to forward audio chunk to speech provider: %v", err)
	}
}

func (s *Session) Pause() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.IsPaused = true
}

func (s *Session) Resume() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.IsPaused = false
}

func (s *Session) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.closed = true
	if s.SpeechProv != nil {
		_ = s.SpeechProv.Close()
	}
	if s.Conn != nil {
		_ = s.Conn.Close()
	}
}
