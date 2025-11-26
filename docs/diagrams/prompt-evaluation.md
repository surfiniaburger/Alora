# Prompt Evaluation Pipeline

This diagram shows the automated evaluation pipeline for testing agent prompts against a benchmark dataset.

```mermaid
flowchart TD
    subgraph "Configuration"
        Dataset[evaluation_dataset.json<br/>Benchmark Cases]
        Config[RunConfig<br/>Model Settings]
    end

    subgraph "Evaluation Runner"
        Init[Initialize Services<br/>Vertex AI, Mock Session]
        Runner[ADK Runner]
        Model[Sentence Transformer<br/>all-MiniLM-L6-v2]
    end

    subgraph "Execution Loop"
        Load[Load Case]
        Query[Inject User Query]
        Agent[Agent Execution]
        Response[Capture Final Answer]
    end

    subgraph "Scoring"
        EmbedGen[Generate Embeddings]
        CalcSim[Calculate Cosine Similarity]
        Threshold{Score >= 0.75?}
    end

    Dataset -->|Iterate Cases| Load
    Load --> Query
    Init --> Runner
    Runner --> Agent
    Query --> Agent
    Agent --> Response

    Response --> EmbedGen
    Dataset -->|Reference Answer| EmbedGen

    EmbedGen -->|Generated vs Reference| CalcSim
    CalcSim --> Threshold

    Threshold -->|Yes| Pass[Pass ✅]
    Threshold -->|No| Fail[Fail ❌]

    Pass --> Report[JSON Report]
    Fail --> Report

    style Runner fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style Agent fill:#34A853,stroke:#333,stroke-width:2px
    style Model fill:#FBBC04,stroke:#333,stroke-width:2px
    style Pass fill:#34A853,stroke:#333,stroke-width:2px,color:#fff
    style Fail fill:#EA4335,stroke:#333,stroke-width:2px,color:#fff
```

## Pipeline Steps

### 1. Initialization (`benchmark_prompts.py`)
- Sets up `VertexAiMemoryBankService`
- Creates `MockSessionService` (isolates tests from production DB)
- Initializes `SentenceTransformer` model for semantic comparison

### 2. Execution
- Iterates through `evaluation_dataset.json`
- **Input**: `user_query` (e.g., "How does MBUX Hyperscreen work?")
- **Process**: Runs agent with `Runner.run_async()`
- **Output**: Captures the final text response

### 3. Semantic Scoring
- **Model**: `all-MiniLM-L6-v2` (Hugging Face)
- **Method**: 
  1. Encode `generated_answer` to vector
  2. Encode `reference_answer` to vector
  3. Calculate **Cosine Similarity**
- **Threshold**: 0.75 (configurable)

### 4. Reporting
- Outputs JSON report with:
  - User Query
  - Generated Answer
  - Reference Answer
  - Similarity Score
  - Pass/Fail Status

## Dataset Structure

```json
{
  "eval_cases": [
    {
      "eval_id": "case001",
      "user_query": "...",
      "reference_answer": "..."
    }
  ]
}
```
