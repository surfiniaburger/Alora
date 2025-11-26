# Cloud Infrastructure

This diagram shows the Google Cloud Run deployment architecture with auto-scaling and service communication.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser<br/>React App]
        Mobile[Mobile App<br/>Android]
    end
    
    subgraph "Firebase"
        Hosting[Firebase Hosting<br/>Static Assets]
        CDN[Global CDN<br/>Edge Caching]
    end
    
    subgraph "Google Cloud Run"
        subgraph "Service A: ADK Orchestrator"
            ADK1[Instance 1<br/>Dispatcher]
            ADK2[Instance 2<br/>Dispatcher]
            ADKn[Instance N<br/>Auto-Scale]
            LB1[Load Balancer]
        end
        
        subgraph "Service B: MCP Server"
            MCP1[Instance 1<br/>Model Serving]
            MCP2[Instance 2<br/>Model Serving]
            MCPn[Instance N<br/>Auto-Scale]
            LB2[Load Balancer]
        end
        
        subgraph "Service C: Simulation Worker"
            SIM1[Instance 1<br/>Monte Carlo]
            SIM2[Instance 2<br/>Monte Carlo]
            SIMn[Instance N<br/>Auto-Scale]
            LB3[Load Balancer]
        end
    end
    
    subgraph "Google Cloud Storage"
        Models[(Model Artifacts<br/>Blessed Models)]
        Telemetry[(Telemetry Data<br/>Training CSVs)]
        Logs[(Application Logs)]
    end
    
    subgraph "Elasticsearch Cloud"
        ES[(Elasticsearch<br/>Vector Search)]
    end
    
    subgraph "External APIs"
        Maps[Google Maps 3D API]
        Gemini[Gemini 2.5 Pro API]
    end
    
    Browser --> Hosting
    Mobile --> Hosting
    Hosting --> CDN
    
    CDN -->|WebSocket| LB1
    
    LB1 --> ADK1
    LB1 --> ADK2
    LB1 --> ADKn
    
    ADK1 -->|gRPC| LB2
    ADK2 -->|gRPC| LB2
    
    LB2 --> MCP1
    LB2 --> MCP2
    LB2 --> MCPn
    
    MCP1 -->|HTTP| LB3
    MCP2 -->|HTTP| LB3
    
    LB3 --> SIM1
    LB3 --> SIM2
    LB3 --> SIMn
    
    MCP1 --> Models
    MCP2 --> Models
    MCPn --> Models
    
    SIM1 --> Models
    SIM2 --> Models
    SIMn --> Models
    
    MCP1 --> ES
    MCP2 --> ES
    
    ADK1 --> Gemini
    ADK2 --> Gemini
    
    Browser --> Maps
    Mobile --> Maps
    
    ADK1 -.->|Logs| Logs
    MCP1 -.->|Logs| Logs
    SIM1 -.->|Logs| Logs
    
    Telemetry -.->|Training Data| MCP1
    
    style LB1 fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style LB2 fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style LB3 fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style Models fill:#34A853,stroke:#333,stroke-width:2px,color:#fff
    style ES fill:#FBBC04,stroke:#333,stroke-width:2px
```

## Service Specifications

### Service A: ADK Orchestrator

**Purpose**: Routes user requests to specialized agents

**Configuration**:
```yaml
service: adk-orchestrator
runtime: python311
instance_class: F2  # 512MB RAM, 1 vCPU
scaling:
  min_instances: 1
  max_instances: 100
  target_cpu_utilization: 0.7
timeout: 60s
```

**Environment Variables**:
- `GEMINI_API_KEY`: Gemini 2.5 Pro authentication
- `MCP_SERVER_URL`: Internal URL to MCP Server
- `LOG_LEVEL`: INFO

**Auto-Scaling Triggers**:
- CPU > 70% → Scale up
- Request queue > 10 → Scale up
- No requests for 5 min → Scale down to min

---

### Service B: MCP Server

**Purpose**: Model serving + RAG pipeline

**Configuration**:
```yaml
service: mcp-server
runtime: python311
instance_class: F4  # 2GB RAM, 2 vCPU
scaling:
  min_instances: 2  # Always-on for low latency
  max_instances: 50
  target_cpu_utilization: 0.6
timeout: 30s
```

**Environment Variables**:
- `GCS_BUCKET`: `gs://alora-models`
- `ELASTICSEARCH_URL`: Elasticsearch Cloud endpoint
- `MODEL_CACHE_SIZE`: 3 (number of model versions to cache)

**Volume Mounts**:
- `/models` → Google Cloud Storage (read-only)

**Health Checks**:
- `/health` endpoint
- Checks: Model loaded, Elasticsearch reachable
- Interval: 10 seconds

---

### Service C: Simulation Worker

**Purpose**: CPU-intensive Monte Carlo simulations

**Configuration**:
```yaml
service: simulation-worker
runtime: python311
instance_class: C2  # CPU-optimized, 4 vCPU
scaling:
  min_instances: 0  # Scale to zero when idle
  max_instances: 20
  target_cpu_utilization: 0.8
timeout: 10s
```

**Environment Variables**:
- `MONTE_CARLO_ITERATIONS`: 1000
- `PARALLEL_WORKERS`: 4 (CPU cores)

**Optimization**:
- NumPy compiled with AVX2 instructions
- Parallel execution across cores
- Result caching for identical requests

---

## Communication Patterns

### WebSocket (Client ↔ ADK)
- **Protocol**: WSS (WebSocket Secure)
- **Purpose**: Real-time bidirectional streaming
- **Use Cases**:
  - Voice audio streaming (Gemini Live API)
  - Live telemetry updates
  - Tool call responses

### gRPC (ADK ↔ MCP)
- **Protocol**: gRPC over HTTP/2
- **Purpose**: Low-latency internal communication
- **Benefits**:
  - Binary protocol (faster than JSON)
  - Streaming support
  - Built-in load balancing

### HTTP/REST (MCP ↔ Simulation)
- **Protocol**: HTTPS
- **Purpose**: Request-response for simulations
- **Format**: JSON payloads

---

## Data Flow Example

**User Query**: "When should I pit?"

1. **Browser** → WebSocket → **Load Balancer 1**
2. **LB1** → Routes to **ADK Instance 2**
3. **ADK2** → Analyzes intent → Calls tool
4. **ADK2** → gRPC → **Load Balancer 2**
5. **LB2** → Routes to **MCP Instance 1**
6. **MCP1** → Loads models from **Cloud Storage**
7. **MCP1** → HTTP → **Load Balancer 3**
8. **LB3** → Routes to **Simulation Instance 1**
9. **SIM1** → Runs Monte Carlo (3000 iterations)
10. **SIM1** → Returns result → **MCP1**
11. **MCP1** → Returns to **ADK2**
12. **ADK2** → Session Summarizer → Natural language
13. **ADK2** → WebSocket → **Browser**

**Total Latency**: ~2.5 seconds

---

## Cost Optimization

### Auto-Scaling Strategy
- **ADK**: Always-on (1 min instance) for low latency
- **MCP**: 2 min instances (model loading is expensive)
- **Simulation**: Scale to zero (only needed for strategy queries)

### Cold Start Mitigation
- **ADK**: Keep-alive requests every 4 minutes
- **MCP**: Pre-warmed instances with models loaded
- **Simulation**: Acceptable cold start (~3s) for infrequent use

### Resource Allocation
- **ADK**: F2 (lightweight, mostly I/O)
- **MCP**: F4 (memory for model cache)
- **Simulation**: C2 (CPU-optimized for NumPy)

---

## Monitoring & Observability

**Cloud Logging**:
- All services send structured logs
- Searchable by request ID
- Retention: 30 days

**Cloud Monitoring**:
- Metrics tracked:
  - Request latency (p50, p95, p99)
  - Error rate
  - CPU/Memory utilization
  - Auto-scaling events

**Alerts**:
- Error rate > 5% → Slack notification
- Latency p95 > 5s → PagerDuty alert
- Model loading failure → Email to team

---

## Disaster Recovery

**Model Rollback**:
- Previous 3 blessed models archived in GCS
- Rollback script: `./scripts/rollback_model.sh v1.2.3`
- Automatic rollback if error rate spikes

**Database Backup**:
- Elasticsearch snapshots every 6 hours
- Retention: 7 days
- Restore time: ~15 minutes

**Service Redundancy**:
- Multi-region deployment (us-central1, us-east1)
- Automatic failover via Cloud Load Balancer
- RTO (Recovery Time Objective): < 5 minutes
