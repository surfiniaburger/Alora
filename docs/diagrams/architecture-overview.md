# Architecture Overview

This diagram shows the high-level architecture of Alora's multi-agent system.

```mermaid
graph TB
    subgraph "User Interface"
        UI[React Frontend<br/>Voice + 3D Map]
    end
    
    subgraph "Google Cloud Run"
        subgraph "Service A: ADK Orchestrator"
            Dispatcher[Dispatcher Agent<br/>Routes Requests]
            Session[Session Summarizer<br/>Final Response]
        end
        
        subgraph "Service B: MCP Server"
            MCP[MCP Server<br/>Model Serving]
            RAG[RAG Pipeline<br/>Elasticsearch]
            Models[(Blessed Models<br/>serving_model/)]
        end
        
        subgraph "Service C: Simulation Worker"
            MC[Monte Carlo<br/>Simulation Engine]
            Strategy[Strategy<br/>Optimizer]
        end
    end
    
    subgraph "ML Pipeline (TFX)"
        Ingest[Data Ingestion]
        Train[Model Trainer]
        Eval[Evaluator<br/>MSE < 5.0?]
        Push[Push to Serving]
    end
    
    subgraph "External Services"
        Maps[Google Maps 3D API]
        Gemini[Gemini 2.5 Pro]
        Elastic[Elasticsearch]
    end
    
    UI -->|WebSocket| Dispatcher
    Dispatcher -->|Query| MCP
    Dispatcher -->|Strategy Request| MC
    MCP --> RAG
    MCP --> Models
    MC --> Models
    MC --> Strategy
    Session -->|Response| UI
    
    Ingest --> Train
    Train --> Eval
    Eval -->|Blessed| Push
    Push --> Models
    Eval -->|Rejected| Train
    
    UI <--> Maps
    Dispatcher <--> Gemini
    RAG <--> Elastic
    
    style UI fill:#61DAFB,stroke:#333,stroke-width:2px
    style Dispatcher fill:#34A853,stroke:#333,stroke-width:2px
    style MCP fill:#4285F4,stroke:#333,stroke-width:2px
    style MC fill:#FBBC04,stroke:#333,stroke-width:2px
    style Eval fill:#EA4335,stroke:#333,stroke-width:2px
```

## Key Components

- **Service A (ADK Orchestrator)**: Routes user requests to specialized agents
- **Service B (MCP Server)**: Serves ML models and handles RAG queries
- **Service C (Simulation Worker)**: Runs Monte Carlo simulations for race strategy
- **TFX Pipeline**: Continuous training and validation of ML models
