package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port            int
	AuthSecret      string
	DeepgramAPIKey  string
	ApiBaseURL      string
	Environment     string
	MaxAudioChunkKb int
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("REALTIME_PORT", "8080"))
	maxChunk, _ := strconv.Atoi(getEnv("MAX_AUDIO_CHUNK_KB", "128"))

	return &Config{
		Port:            port,
		AuthSecret:      getEnv("AUTH_SECRET", "storyflow-super-secure-jwt-signing-secret-development-2026-key"),
		DeepgramAPIKey:  getEnv("DEEPGRAM_API_KEY", ""),
		ApiBaseURL:      getEnv("API_BASE_URL", "http://localhost:8000"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		MaxAudioChunkKb: maxChunk,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
