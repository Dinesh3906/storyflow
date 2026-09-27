package websocket

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/storyflow/storyflow/apps/realtime/internal/config"
	"github.com/storyflow/storyflow/apps/realtime/internal/protocol"
	"github.com/storyflow/storyflow/apps/realtime/internal/session"
	"github.com/storyflow/storyflow/apps/realtime/internal/speech"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 64,
	WriteBufferSize: 1024 * 64,
	CheckOrigin: func(r *http.Request) bool {
		// Allow local development and configured origins
		return true
	},
}

type Handler struct {
	cfg *config.Config
}

func NewHandler(cfg *config.Config) *Handler {
	return &Handler{cfg: cfg}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Path format: /ws/story/{storyId}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 || pathParts[0] != "ws" || pathParts[1] != "story" {
		http.Error(w, "Invalid path. Expected /ws/story/{storyId}", http.StatusBadRequest)
		return
	}
	storyID := pathParts[2]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	sessionID := "sess_" + uuid.New().String()[:8]
	prov := speech.NewDeepgramSpeechProvider(h.cfg.DeepgramAPIKey)
	sess := session.NewSession(sessionID, storyID, conn, prov)
	defer sess.Close()

	// 1. Send connection.ready
	_ = sess.SendEvent(protocol.EventConnectionReady, protocol.ConnectionReadyPayload{
		ConnectionID:        sessionID,
		ServerTimestamp:     protocol.FormatTimestamp(time.Now()),
		HeartbeatIntervalMs: 15000,
		DeepgramConfigured:  h.cfg.DeepgramAPIKey != "",
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Session %s connection closed: %v", sessionID, err)
			}
			break
		}

		if messageType == websocket.BinaryMessage {
			// Direct 16kHz 16-bit PCM audio chunk
			sess.ProcessAudio(data)
			continue
		}

		if messageType == websocket.TextMessage {
			var baseMsg struct {
				Type    protocol.WebSocketEventType `json:"type"`
				Payload json.RawMessage             `json:"payload"`
			}

			if err := json.Unmarshal(data, &baseMsg); err != nil {
				continue
			}

			switch baseMsg.Type {
			case protocol.EventSessionStart:
				var p protocol.SessionStartPayload
				_ = json.Unmarshal(baseMsg.Payload, &p)
				sess.Language = p.Language
				sess.ScriptMode = p.ScriptMode
				sess.Style = p.Style
				sess.WritingMode = p.WritingMode
				sess.RealtimeMode = p.RealtimeMode
				sess.IsPaused = false

				// Connect speech provider if configured
				if h.cfg.DeepgramAPIKey != "" {
					sttChan, err := prov.Connect(ctx, p.Language)
					if err == nil {
						go func() {
							for res := range sttChan {
								if !res.IsFinal {
									_ = sess.SendEvent(protocol.EventTranscriptPartial, protocol.TranscriptPartialPayload{
										SegmentID:  fmt.Sprintf("seg_%d", time.Now().UnixNano()),
										Text:       res.Text,
										Language:   res.Language,
										Confidence: res.Confidence,
										IsFinal:    false,
										StartMs:    res.StartMs,
										EndMs:      res.EndMs,
									})
								} else {
									_ = sess.SendEvent(protocol.EventTranscriptFinal, protocol.TranscriptFinalPayload{
										SegmentID:  fmt.Sprintf("seg_%d", time.Now().UnixNano()),
										RawText:    res.Text,
										Language:   res.Language,
										Confidence: res.Confidence,
										IsFinal:    true,
										StartMs:    res.StartMs,
										EndMs:      res.EndMs,
									})
								}
							}
						}()
					}
				}

				_ = sess.SendEvent(protocol.EventSessionStarted, map[string]any{
					"storyId": storyID,
					"status":  "listening",
				})

			case protocol.EventSessionPause:
				sess.Pause()
				_ = sess.SendEvent(protocol.EventSessionPaused, map[string]any{"storyId": storyID})

			case protocol.EventSessionResume:
				sess.Resume()
				_ = sess.SendEvent(protocol.EventSessionResumed, map[string]any{"storyId": storyID})

			case protocol.EventAudioStart:
				_ = sess.SendEvent(protocol.EventAudioStarted, map[string]any{"sampleRate": 16000, "channels": 1})

			case protocol.EventAudioStop:
				_ = sess.SendEvent(protocol.EventAudioStopped, map[string]any{"storyId": storyID})

			case protocol.EventAudioChunk:
				var chunk struct {
					Data string `json:"data"`
				}
				if err := json.Unmarshal(baseMsg.Payload, &chunk); err == nil && chunk.Data != "" {
					if decoded, err := base64.StdEncoding.DecodeString(chunk.Data); err == nil {
						sess.ProcessAudio(decoded)
					}
				}

			case protocol.EventClientHeartbeat:
				_ = sess.SendEvent(protocol.EventServerHeartbeat, map[string]any{"ack": time.Now().UnixMilli()})
			}
		}
	}
}
