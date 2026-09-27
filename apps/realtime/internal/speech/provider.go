package speech

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"

	"github.com/gorilla/websocket"
)

type STTResult struct {
	Text       string
	Language   string
	Confidence float64
	IsFinal    bool
	StartMs    int64
	EndMs      int64
}

type SpeechProvider interface {
	Connect(ctx context.Context, language string) (<-chan STTResult, error)
	SendAudio(pcmChunk []byte) error
	Close() error
}

// DeepgramSpeechProvider implements SpeechProvider for Deepgram Nova-3
type DeepgramSpeechProvider struct {
	apiKey string
	conn   *websocket.Conn
	mu     sync.Mutex
	closed bool
}

func NewDeepgramSpeechProvider(apiKey string) *DeepgramSpeechProvider {
	return &DeepgramSpeechProvider{
		apiKey: apiKey,
	}
}

func (p *DeepgramSpeechProvider) Connect(ctx context.Context, language string) (<-chan STTResult, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("DEEPGRAM_API_KEY is not configured")
	}

	u := url.URL{
		Scheme: "wss",
		Host:   "api.deepgram.com",
		Path:   "/v1/listen",
	}

	q := u.Query()
	q.Set("encoding", "linear16")
	q.Set("sample_rate", "16000")
	q.Set("channels", "1")
	q.Set("model", "nova-3")
	q.Set("interim_results", "true")
	q.Set("smart_format", "true")
	q.Set("punctuate", "true")

	if language != "auto" && language != "" {
		q.Set("language", language)
	}

	u.RawQuery = q.Encode()

	headers := http.Header{
		"Authorization": []string{"Token " + p.apiKey},
	}

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, u.String(), headers)
	if err != nil {
		return nil, fmt.Errorf("failed to dial Deepgram Nova-3: %w", err)
	}

	p.conn = conn
	out := make(chan STTResult, 64)

	go func() {
		defer close(out)
		defer p.conn.Close()

		for {
			_, message, err := p.conn.ReadMessage()
			if err != nil {
				if !p.closed {
					log.Printf("Deepgram read error: %v", err)
				}
				return
			}

			var dgResp struct {
				Channel struct {
					Alternatives []struct {
						Transcript string  `json:"transcript"`
						Confidence float64 `json:"confidence"`
					} `json:"alternatives"`
				} `json:"channel"`
				IsFinal bool    `json:"is_final"`
				Start   float64 `json:"start"`
				Duration float64 `json:"duration"`
			}

			if err := json.Unmarshal(message, &dgResp); err == nil {
				if len(dgResp.Channel.Alternatives) > 0 {
					alt := dgResp.Channel.Alternatives[0]
					if alt.Transcript != "" {
						out <- STTResult{
							Text:       alt.Transcript,
							Language:   language,
							Confidence: alt.Confidence,
							IsFinal:    dgResp.IsFinal,
							StartMs:    int64(dgResp.Start * 1000),
							EndMs:      int64((dgResp.Start + dgResp.Duration) * 1000),
						}
					}
				}
			}
		}
	}()

	return out, nil
}

func (p *DeepgramSpeechProvider) SendAudio(pcmChunk []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.conn == nil || p.closed {
		return fmt.Errorf("connection is closed")
	}

	return p.conn.WriteMessage(websocket.BinaryMessage, pcmChunk)
}

func (p *DeepgramSpeechProvider) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.closed = true
	if p.conn != nil {
		// Send Deepgram close stream message
		_ = p.conn.WriteMessage(websocket.BinaryMessage, []byte{})
		return p.conn.Close()
	}
	return nil
}
