# Alora Architecture Diagrams

This directory contains comprehensive Mermaid diagrams documenting Alora's architecture and implementation.

## 📊 Available Diagrams

### 1. [Architecture Overview](./architecture-overview.md)
**High-level system architecture** showing all services and their interactions.

**Key Components**:
- Service A: ADK Orchestrator
- Service B: MCP Server
- Service C: Simulation Worker
- TFX ML Pipeline
- External services (Google Maps, Gemini, Elasticsearch)

**Use Case**: Understanding the complete system at a glance

---

### 2. [Decision Engine Flow](./decision-engine.md)
**"Trust but Verify" validation pipeline** that ensures AI responses meet safety criteria.

**Key Components**:
- Researcher Agent
- Parallel Validator (Safety + k-NN)
- Deterministic Decision Agent
- Reviser Agent
- Session Summarizer

**Use Case**: Understanding how Alora validates AI responses

---

### 3. [TFX Pipeline](./tfx-pipeline.md)
**Continuous ML training pipeline** using TensorFlow Extended.

**Key Components**:
- Data Ingestion (ExampleGen)
- Data Validation (StatisticsGen)
- Feature Engineering (Transform)
- Model Trainer (3 models)
- Evaluator (MSE threshold gate)
- Pusher (deployment)

**Use Case**: Understanding how ML models are trained and deployed

---

### 4. [Monte Carlo Simulation](./monte-carlo.md)
**Race strategy optimization** using statistical simulations.

**Key Functions**:
- `simulate_lap()` - Predicts single lap time
- `run_strategy_simulation()` - Simulates entire race
- `find_optimal_pit_window()` - Finds best pit strategy
- `analyze_undercut_overcut()` - Tactical decisions

**Use Case**: Understanding how race strategies are calculated

---

### 5. [MCP Server Architecture](./mcp-server.md)
**Model Context Protocol server** bridging AI and computation.

**Key Components**:
- Model Management (loading, caching, hot reload)
- Tool Exposure (4 exposed tools)
- Computation Layer (Monte Carlo + ML models)
- RAG Pipeline (Elasticsearch + Docling)

**Use Case**: Understanding how tools are exposed to the AI

---

### 6. [Cloud Infrastructure](./cloud-infrastructure.md)
**Google Cloud Run deployment** with auto-scaling.

**Key Components**:
- Service A: ADK Orchestrator (F2 instances)
- Service B: MCP Server (F4 instances)
- Service C: Simulation Worker (C2 CPU-optimized)
- Firebase Hosting (frontend)
- Google Cloud Storage (models, data)

**Use Case**: Understanding production deployment architecture

---

### 7. [Frontend Architecture](./frontend-architecture.md)
**React application** with voice interface and 3D map.

**Key Components**:
- React components (Map3D, AudioControls, Telemetry)
- State management (Zustand stores)
- Libraries (MapController, AudioStreamer, GenAILiveClient)
- External services (Google Maps 3D, Gemini Live)

**Use Case**: Understanding frontend implementation

---

### 8. [Memory Service](./memory-service.md)
**Hybrid memory architecture** with Vertex AI and MongoDB.

**Key Components**:
- Vertex AI Memory Bank (Semantic)
- Mongo Session Service (Metadata)
- Callback integration

**Use Case**: Understanding how context is persisted

---

### 9. [Prompt Evaluation](./prompt-evaluation.md)
**Automated benchmarking pipeline**.

**Key Components**:
- SentenceTransformer scoring
- Benchmark dataset execution
- Similarity thresholding

**Use Case**: Validating agent performance against ground truth

---

## 🎨 Viewing the Diagrams

### Option 1: GitHub (Recommended)
GitHub automatically renders Mermaid diagrams in markdown files. Just click on any diagram file above.

### Option 2: VS Code
Install the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.

### Option 3: Mermaid Live Editor
Copy the Mermaid code and paste it into [Mermaid Live Editor](https://mermaid.live/).

### Option 4: Export as Images
Use the Mermaid CLI to export diagrams as PNG/SVG:

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export a diagram
mmdc -i architecture-overview.md -o architecture-overview.png

# Export all diagrams
for file in *.md; do
  mmdc -i "$file" -o "${file%.md}.png"
done
```

---

## 🔄 Diagram Update Process

When updating architecture:

1. **Update the diagram markdown file** with new Mermaid code
2. **Update the corresponding section in README.md** if needed
3. **Export new PNG** (if using images in presentations)
4. **Commit changes** with descriptive message

Example:
```bash
git add docs/diagrams/architecture-overview.md
git commit -m "docs: update architecture diagram with new MCP tools"
```

---

## 📐 Mermaid Syntax Reference

### Graph Types
- `graph TB` - Top to Bottom
- `graph LR` - Left to Right
- `flowchart TD` - Flowchart Top Down
- `sequenceDiagram` - Sequence diagram

### Node Shapes
- `[Rectangle]` - Rectangle
- `(Rounded)` - Rounded rectangle
- `{Diamond}` - Diamond (decision)
- `[(Database)]` - Cylinder (database)
- `([Stadium])` - Stadium shape

### Arrows
- `-->` - Solid arrow
- `-.->` - Dotted arrow
- `==>` - Thick arrow
- `--text-->` - Arrow with label

### Styling
```mermaid
style NodeName fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
```

---

## 🎯 Diagram Conventions

### Color Coding
- **Blue (#4285F4)**: Google Cloud services
- **Green (#34A853)**: Success states, approved models
- **Red (#EA4335)**: Error states, rejected models, critical gates
- **Yellow (#FBBC04)**: Processing states, simulations

### Naming
- **Services**: Use descriptive names (e.g., "ADK Orchestrator")
- **Functions**: Use code names (e.g., `simulate_lap()`)
- **Data**: Use database cylinder shapes

### Subgraphs
- Group related components in subgraphs
- Use clear labels (e.g., "Service A: ADK Orchestrator")

---

## 📚 Additional Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Cheat Sheet](https://jojozhuang.github.io/tutorial/mermaid-cheat-sheet/)
- [GitHub Mermaid Support](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/)

---

**Last Updated**: 2025-11-26  
**Maintainer**: Alora Development Team
