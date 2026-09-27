# StoryFlow Production Deployment & Scaling Guide

## 1. Production Architecture Overview
StoryFlow is architected for horizontal scalability and high concurrency:

1. **Edge Tier**: Cloudflare / AWS CloudFront terminating SSL/TLS, providing DDoS protection, WAF rules, and static asset caching.
2. **Realtime Tier (`apps/realtime`)**: Stateless Go Realtime Gateway instances handling persistent WebSocket audio streaming connections. Scaled horizontally behind a Layer 4/Layer 7 Load Balancer with IP hash or cookie affinity.
3. **Application Tier (`apps/api`)**: Stateless FastAPI services handling REST requests, version control, and AI transformations.
4. **Data Tier**:
   - **PostgreSQL**: Primary transactional persistence with connection pooling (`PgBouncer`).
   - **Redis Cluster**: Realtime session registry, pub/sub multiplexing, and rate limiting.
   - **Object Storage**: S3-compatible bucket (AWS S3 / Cloudflare R2 / MinIO) for document backups and typeset PDF artifacts.

---

## 2. Docker Compose Deployment

To launch the full production stack locally or on a single VM:

```bash
# 1. Copy and configure environment variables
cp .env.example .env

# 2. Build and launch all services
docker compose up -d --build

# 3. Check health and logs
docker compose ps
docker compose logs -f api
```

Services will be accessible at:
- **Web Studio**: `http://localhost:3000`
- **Application API**: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- **Realtime Gateway**: `ws://localhost:8080`
- **MinIO Console**: `http://localhost:9001` (user: `minioadmin`, pass: `minioadminpassword`)

---

## 3. High-Scale Engineering (1M Concurrent Architecture)

### 3.1 Connection Management Budget
- 1,000,000 concurrent WebSocket connections across horizontally scaled Go gateway instances.
- Go lightweight goroutines consume ~4KB per connection, enabling ~50,000 active WebSocket connections per 8GB instance.
- Ephemeral session states stored in Redis cluster with 15-minute TTLs.

### 3.2 Database Connection Budgets
- FastAPI backend instances use SQLAlchemy 2.0 with `asyncpg` and connection pools capped at `max_overflow=10`, `pool_size=20`.
- Standalone `PgBouncer` layer placed in front of PostgreSQL to prevent connection exhaustion.

### 3.3 Audio Backpressure & Latency Budgets
- 20–40ms chunk intervals prevent network buffering.
- Go gateway drops degraded frames if consumer queue latency exceeds 1,200ms, immediately alerting the client to network degradation via `story.error`.

---

## 4. Observability & Monitoring
Instrumented with OpenTelemetry:
- `audio_capture_latency`: Time from microphone sample to WebSocket transmit.
- `websocket_latency`: Round-trip network ping/pong time.
- `stt_first_partial_latency`: Time from speech start to first provisional token.
- `stt_final_latency`: Time to confirmed sentence boundary.
- `speech_to_visible_text_latency`: End-to-end user-perceived latency (P50, P75, P95, P99).
