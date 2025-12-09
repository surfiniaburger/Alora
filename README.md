# 🏎️ Alora: The Multi-Agent Automotive Co-Pilot

**Deployed on Google Cloud Run | Built with Google Agent Development Kit (ADK)**

[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![ADK](https://img.shields.io/badge/Google-ADK-34A853)](https://developers.google.com/adk)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)


> **Mobile Development**: Android app development is ongoing at [mooncake](https://github.com/surfiniaburger/mooncake)

---

## 📥 Installation & Releases

### 🥽 Meta Quest (XR Experience)
**[Click here to try Alora on Meta Quest](https://www.meta.com/s/6OFmDJCVP)**
> *Includes full Multimodal Live API integration and 3D Map Grounding.*

### 🤖 Android
**[Download Latest APK](https://github.com/surfiniaburger/Alora/releases)**
> *Automated Release Pipeline*: Every push to `main` triggers a GitHub Action that builds, signs, and releases a production-ready APK.
> - **Build**: Capacitor 7.4 + Vite
> - **CI/CD**: GitHub Actions -> Gradle -> Signed APK

### 🍎 iOS
**[View iOS Builds](https://github.com/surfiniaburger/Alora/releases)**
> *Cross-Platform Proof of Concept*: Successfully built for iOS 18.2 via Capacitor.

---

## 📖 Table of Contents

- [Vision](#-the-vision)
- [Architecture Overview](#-architecture-overview)
- [Services & Components](#-services--components-what-we-built)
- [Technical Deep Dive](#-technical-deep-dive)
- [Lessons Learned](#-lessons-learned)
- [Use Cases](#-use-case-toyota-gr-cup)
- [Tech Stack](#-tech-stack)
- [What's Next](#-whats-next)

---

## 💡 The Vision: Why we built Alora
> *"Nissan has just announced a massive recall of the Sentra 2025... a manufacturing defect in the windshields could affect the driver’s visibility... The result was particles trapped between the layers of glass creating bubbles... something 'normal' but that should not have happened."* — **Unión Rayo, Dec 5, 2025**

We live in an era where cars are marvels of engineering, yet basic failures—like bubbles in a windshield or a silent software bug—can compromise everything. We trust these machines with our lives, but who watches the machine?

**The User Frustration is Real:**
- **The Fear of the Unknown**: Is that new vibration normal? What does that amber light actually *mean*? We feel helpless when our car speaks a language we don't understand.
- **The Cognitive Overload**: In high-stakes environments like racing, a Strategist has **split-second** windows to make a decision that wins or loses a championship. A human simply cannot process gigabytes of telemetry, tire degradation models, and weather patterns in that time window.
- **The "Range Anxiety" Paralysis**: For EV owners, the freedom of the road is replaced by the constant, nagging math of battery percentages and charger availability.

**Our Mission:**
To build a partner we can trust. Not just a chatbot, but a **Multi-Agent Guardian** that sees what we miss, calculates what we can't, and guides us with the instinct of a professional pilot.

### The Solution: Alora

Alora is the world's first **Bi-Modal Automotive Co-Pilot**, powered by the **Gemini Multimodal Live API**. It doesn't just "talk"; it **sees, thinks, and acts**.

#### 👁️ Inspector Mode: The AI Mechanic
*Stop guessing. Start knowing.*

Imagine pointing your phone at a strange crack in your windshield or a confusing dashboard icon, and having an expert instantly tell you: *"That's a lamination defect. It exceeds the 13mm safety threshold. You need to pull over."*

Alora's Inspector Mode uses Gemini's vision capabilities to ingest live video frames, diagnosing mechanical issues that even factory quality controls might miss. It is protection against the "normal" defects that slip through the cracks.

#### 🔋 EV Mode: Freedom from Math
*Drive. We'll handle the rest.*

We realized that "Range Anxiety" isn't about the car's range—it's about the **cognitive load** of planning. Alora takes that burden away.
- **"I have 50 miles left."** → Alora instantly scans the route, filters for *functioning* CCS chargers, verifies they are open, and calculates the detour.
- **"Am I driving too fast?"** → Alora analyzes your real-time consumption vs. the destination's elevation profile and gently suggests a safer speed.
It replaces anxiety with the confidence of a perfectly planned itinerary.

#### 🏎️ Race Mode: The Digital Strategist
*The unfair advantage.*

On the track, the difference between 1st and 2nd is a rounding error. Alora ingests raw telemetry at 60Hz. It runs **Monte Carlo simulations** on tire degradation and fuel consumption in real-time.
- **The Pain**: A human engineer scans 10 screens, trying to guess if a "Safety Car" window is open.
- **The Alora Fix**: "Box now. You have an 87% chance of undercutting the rival on Turn 4."
It is calm, mathematical certainty in the chaos of the race.

---

---

## 🏗️ Architecture Overview

Alora implements a high-integrity, multi-agent workflow where **precision is mathematically enforced** through a "Trust but Verify" loop.

![Architecture Diagram](./docs/diagrams/architecture-overview.png)

> See [Architecture Diagram](./docs/diagrams/architecture-overview.md) for interactive Mermaid version

### Core Principles

1. **Multi-Agent Collaboration**: Specialized agents handle distinct responsibilities
2. **Deterministic Validation**: Code-based gatekeeping ensures safety
3. **Continuous Learning**: TFX pipeline retrains models as new data arrives
4. **Serverless Scalability**: Cloud Run enables elastic compute

---

## 🛠️ Services & Components (What We Built)

### 1. **The Decision Engine** (Google ADK Multi-Agent System)

A sophisticated validation pipeline that ensures every AI response meets strict safety and accuracy criteria.

![Decision Engine Flow](./docs/diagrams/decision-engine.png)

#### Components:

**a. ResearcherAgent**
- **Purpose**: Synthesizes external data from web searches and RAG contexts
- **Output**: Initial `draft_answer` based on retrieved knowledge
- **Tech**: Gemini 2.5 Pro, Elasticsearch, Docling

**b. ParallelValidator**
- **Purpose**: Simultaneous multi-dimensional validation
- **Components**:
  - **SafetyAndComplianceAgent**: Reviews for accuracy and safety (outputs "APPROVED" or critique)
  - **KnnValidatorAgent**: Vector-based confidence scoring using k-NN model trained on Mercedes/Automotive corpus
- **Threshold**: Technical confidence must meet **≥0.25** threshold

**c. DeterministicDecisionAgent**
- **Purpose**: Code-based gatekeeping (no LLM ambiguity)
- **Logic**: Sets `validation_passed = True` **only if**:
  - Safety check == "APPROVED" **AND**
  - Technical confidence ≥ 0.25
- **Why It Matters**: Removes probabilistic uncertainty from safety-critical decisions

**d. ReviserAgent**
- **Purpose**: Iteratively improves drafts that fail validation
- **Loop**: CritiqueAndRefineLoop continues until validation passes
- **Max Iterations**: 3 (prevents infinite loops)

**e. SessionSummarizerAgent**
- **Purpose**: Delivers final answer only after passing validation gauntlet
- **Output**: Natural language response to driver

---

### 2. **The ML Training Pipeline** (TensorFlow Extended)

An automated assembly line that trains, validates, and deploys ML models for race strategy.

![TFX Pipeline](./docs/diagrams/tfx-pipeline.png)

#### Components:

**a. Trainer (`trainer.py`)**
- **Purpose**: The "Gym" where AI learns from telemetry data
- **Models Trained**:
  1. **Tire Degradation Model** (Linear Regression)
     - Inputs: Lap count, lateral G-force
     - Output: Predicted lap time slowdown
  2. **Fuel Consumption Model** (Linear Regression)
     - Inputs: RPM, throttle position
     - Output: Fuel usage per lap
  3. **Pace Prediction Model** (Random Forest)
     - Inputs: Traffic, gear, braking intensity
     - Output: Overall lap time prediction
- **Output**: Serialized models saved to `models/` directory

**b. Evaluator (`evaluator.py`)**
- **Purpose**: Quality Control inspector (prevents bad models from deployment)
- **Metric**: Mean Squared Error (MSE)
- **Decision Logic**:
  - MSE < 5.0 → Model "Blessed" ✅ (marked safe for production)
  - MSE ≥ 5.0 → Model rejected ❌ (system keeps old version)
- **Why It Matters**: Acts as a kill-switch for defective models

**c. Pipeline Orchestrator (`pipeline.py`)**
- **Purpose**: Ties the entire workflow together
- **Steps**:
  1. **Ingest**: Read raw telemetry CSVs (Barber Motorsports Park dataset)
  2. **Validate**: Check for missing data or anomalies
  3. **Transform**: Feature engineering (e.g., rolling averages)
  4. **Train**: Execute trainer
  5. **Evaluate**: Run evaluator
  6. **Push**: If blessed, copy to `serving_model/` directory
- **Automation**: Runs on schedule or triggered by new data

---

### 3. **The Strategy Brain** (Monte Carlo Simulation Engine)

Real-time race strategy optimization using statistical simulations.

![Monte Carlo Simulation](./docs/diagrams/monte-carlo.png)

#### Key Functions:

**a. `simulate_lap(lap_number, tire_wear, fuel_level)`**
- **Purpose**: Predicts lap time using trained ML models
- **Inputs**: Current lap, tire degradation %, fuel remaining
- **Output**: Predicted lap time (seconds)

**b. `run_strategy_simulation(pit_strategy)`**
- **Purpose**: Simulates entire race (e.g., 60 laps)
- **Process**:
  - Tracks fuel dropping lap-by-lap
  - Tracks tire wear accumulation
  - Accounts for pit stop time loss (~25 seconds)
- **Output**: Total race time for given strategy

**c. `find_optimal_pit_window()`**
- **Purpose**: Runs thousands of Monte Carlo simulations
- **Strategies Tested**: 1-stop, 2-stop, 3-stop
- **Output**: Statistically optimal pit lap (e.g., "Pit on Lap 28")

**d. `analyze_undercut_overcut(rival_position)`**
- **Purpose**: Tactical decision-making vs. competitors
- **Calculations**:
  - **Undercut**: Pit now to gain track position
  - **Overcut**: Stay out to preserve tire life
- **Output**: Recommended action with probability of success

---

### 4. **The MCP Server** (Model Context Protocol Interface)

The bridge between the mathematical engine and the Alora chatbot.

![MCP Server Architecture](./docs/diagrams/mcp-server.png)

#### Responsibilities:

**a. Model Loading**
- Monitors `serving_model/` directory
- Automatically loads latest "Blessed" models
- Hot-reloads on new model deployment

**b. Tool Exposure**
- Wraps complex functions into LLM-callable tools:
  - `get_optimal_pit_strategy`
  - `analyze_tire_degradation`
  - `predict_fuel_consumption`
  - `calculate_undercut_opportunity`

**c. Request Handling**
- Receives requests from ADK Orchestrator
- Executes Monte Carlo simulations
- Returns structured JSON responses

**Example Flow**:
```
User: "When should I pit?"
  ↓
ADK Orchestrator → MCP Server
  ↓
MCP Server runs find_optimal_pit_window()
  ↓
Returns: { "strategy": "1-stop", "pit_lap": 28, "confidence": 0.87 }
  ↓
SessionSummarizerAgent: "I recommend a 1-stop strategy. Pit on Lap 28."
```

---

### 5. **The Frontend** (React + Google Maps 3D)

An immersive, voice-controlled interface with a futuristic, glassmorphic HUD.

![Frontend Architecture](./docs/diagrams/frontend-architecture.png)

#### Key Features:

**a. The "Arc Reactor" Control Tray**
- Central interaction hub inspired by Iron Man's interface
- **Breathing Mic Button**: Visual feedback for voice activity (Idle, Listening, Processing)
- **Quick Actions**: One-tap access to Telemetry, Settings, and Debug tools

**b. Streaming Console (The "Jarvis" HUD)**
- Transient message display that fades away when not in use
- **Agent Messages**: Natural language responses
- **Rich Tool Outputs**: Interactive cards for EV stations, battery status, and race data
- **Glassmorphism**: Blurs background to maintain map visibility

**c. Dynamic Mode Switching**
- **Race Mode**: Telemetry panel, lap deltas, track map
- **EV Mode**: Battery status, charging station carousel, range circles
- Seamless transition via `EVModeToggle`

**d. 3D Map Integration**
- Google Maps 3D Tiles API
- Custom polylines for race track
- Car and ghost car markers with rotation

**e. Voice Interface**
- Gemini Live API for real-time audio streaming
- Hands-free operation
- Natural language understanding

**f. Cross-Platform Deployment**
- **Capacitor**: Wraps React app for native Android deployment
- **Native Integrations**: Geolocation API (`@capacitor/geolocation`)
- **WebView**: Full-featured web app runs natively on Android
- **App ID**: `com.surfiniaburger.alora`
- **Build**: Single codebase deploys to web (Firebase) and Android (APK)

---

### 5. **Memory Service & Persistence**

Hybrid memory architecture combining semantic vector search with structured session metadata.

![Memory Service](./docs/diagrams/memory-service.png)

#### Components:
- **Vertex AI Memory Bank**: Stores conversation turns as vector embeddings for long-term semantic retrieval.
- **Mongo Session Service**: Manages session metadata (IDs, User IDs) in MongoDB Atlas.
  - *Note*: Interaction history storage in MongoDB is currently in partial integration/debug mode.
- **Callbacks**: `after_agent_callback` triggers memory persistence only for the Orchestrator agent to ensure consistency.

---

### 6. **Prompt Evaluation Pipeline**

Automated benchmarking system to validate agent performance against ground-truth datasets.

![Prompt Evaluation](./docs/diagrams/prompt-evaluation.png)

#### Workflow:
1. **Dataset**: JSON file containing user queries and reference answers.
2. **Execution**: Runs agent against each query using a `MockSessionService`.
3. **Scoring**: Uses `SentenceTransformer` (all-MiniLM-L6-v2) to calculate cosine similarity between generated and reference answers.
4. **Threshold**: Pass/Fail based on similarity score (default ≥ 0.75).

---

### 6. **Cloud Infrastructure** (Google Cloud Run)

Serverless, auto-scaling deployment architecture.

![Cloud Infrastructure](./docs/diagrams/cloud-infrastructure.png)

#### Services:

**Service A: ADK Orchestrator**
- **Purpose**: The "Brain" - routes requests to specialized agents
- **Tech**: Python, Google ADK
- **Scaling**: 0-100 instances based on load

**Service B: MCP Server**
- **Purpose**: The "Knowledge" - RAG pipeline + ML model serving
- **Tech**: FastMCP, Elasticsearch
- **Storage**: Google Cloud Storage for models

**Service C: Simulation Worker**
- **Purpose**: Heavy Monte Carlo computations
- **Tech**: Python, NumPy, Scikit-Learn
- **Optimization**: CPU-optimized instances

**Frontend: React App**
- **Hosting**: Firebase Hosting
- **CDN**: Global edge caching
- **WebSockets**: Real-time streaming via Cloud Run

---

## 🎓 Lessons Learned

### 1. **Trust but Verify: Deterministic Gatekeeping**

**What We Built**: DeterministicDecisionAgent with hard-coded validation thresholds

**Why It Matters**:
- LLMs are probabilistic; safety-critical systems need determinism
- Code-based validation removes ambiguity
- Mathematical thresholds (e.g., confidence ≥ 0.25) are auditable

**Lesson**: For automotive/safety applications, **never rely solely on LLM judgment**. Always have a deterministic layer.

---

### 2. **Continuous Training Prevents Model Drift**

**What We Built**: TFX pipeline with automated retraining

**Why It Matters**:
- Car performance changes (weather, tire compounds, track evolution)
- Static models become inaccurate over time
- Automated retraining keeps predictions fresh

**Lesson**: ML models in dynamic environments need **continuous learning pipelines**, not one-time training.

---

### 3. **The Evaluator as a Kill-Switch**

**What We Built**: `evaluator.py` with MSE threshold gating

**Why It Matters**:
- Bad training data can produce dangerous models
- Automated deployment without validation is risky
- MSE threshold acts as a safety net

**Lesson**: **Never auto-deploy ML models** without a validation gate. The cost of a bad model in production is too high.

---

### 4. **Agent Specialization > Monolithic LLM**

**What We Built**: Multi-agent system with specialized roles

**Why It Matters**:
- Single LLM tries to do everything → mediocre at all
- Specialized agents (Researcher, Validator, Reviser) excel at specific tasks
- Parallel validation reduces latency

**Lesson**: **Decompose complex problems** into agent-specific tasks. Orchestrate, don't monolithize.

---

### 5. **MCP Enables Modular Intelligence**

**What We Built**: MCP Server as a standalone service

**Why It Matters**:
- Chatbot doesn't need to know calculus
- ML models can be updated without touching chatbot code
- Clear separation of concerns

**Lesson**: Use **Model Context Protocol** to decouple AI reasoning from domain-specific computation.

---



### 6. **Voice Interfaces Need Visual Grounding**

**What We Built**: Agent-driven camera movements synced with voice responses

**Why It Matters**:
- "Turn 10" is abstract without visual context
- Camera flying to location creates spatial understanding
- Multimodal feedback (voice + visual) reduces cognitive load

**Lesson**: For automotive AI, **voice alone isn't enough**. Pair it with visual grounding.

---

### 7. **WebSockets > Polling for Real-Time Data**

**What We Built**: Gemini Live API with WebSocket streaming

**Why It Matters**:
- Polling creates latency and wastes bandwidth
- WebSockets enable true real-time updates
- Critical for live telemetry and race strategy

**Lesson**: For time-sensitive applications, **WebSockets are non-negotiable**.

---

---

## 🔌 Use Case: Daily EV Driving

Alora isn't just for the track. We've introduced a dedicated **EV Mode** for daily drivers, transforming range anxiety into intelligent route planning.

### Intelligent Range Management

**Battery Awareness**:
- Real-time battery monitoring (State of Charge)
- Dynamic range estimation based on driving style
- Visual "Battery Status" HUD component

**Smart Charging Station Finder**:
- **"Find charging stations near me"**: Locates stations using Google Places API
- **Context-Aware Filtering**: Filters by connector type (Tesla, CCS, J1772)
- **Range Feasibility**: Instantly calculates if you have enough range to reach the station

### The EV Toolset (Client-Side)

Unlike the race strategy tools (which run on the MCP Server for heavy computation), the EV tools execute **client-side** in the React frontend:
- `setEVVehicleProfile`: Stores vehicle specs (battery capacity, efficiency)
- `findEVChargingStations`: Geospatial search using Google Maps Grounding API
- `showRouteToStation`: Route calculation via Google Directions API
- `calculateChargingTime`: Estimates charging duration based on battery and station type
- `setUserLocation`: Manual location setting via geocoding

**Why Client-Side?**
- Direct access to Google Maps APIs (Places, Routes, Geocoding)
- Real-time UI updates via Zustand stores
- No heavy computation required (unlike Monte Carlo simulations)

---

## 🏁 Use Case: Toyota GR Cup (Hack the Track)

We tailored Alora's "Track Mode" specifically for the **Toyota GR Cup** racing series.

### Dual Grounding Strategy

**Geospatial Data (Google Maps)**:
- 3D visualization of Barber Motorsports Park
- Turn-by-turn navigation
- Elevation profiles

**Mechanical Data (Toyota Telemetry)**:
- Live tire health monitoring
- Fuel consumption tracking
- Lap delta vs. rival

### The "Ghost Car" Feature

**Concept**: Visualize the gap between driver and rival

**Implementation**:
- Rival's position rendered as translucent "ghost" marker
- Real-time gap calculation (seconds ahead/behind)
- Predictive trajectory based on pace difference

**Impact**: Drivers can **see** the competition, not just hear about it.

---

## 🚀 Accomplishments We're Proud Of

### 1. **Self-Correcting AI**
- TFX pipeline retrains models when performance changes (e.g., rain, engine degradation)
- Monte Carlo simulation automatically adjusts strategy
- No manual intervention required

### 2. **Safe Deployment**
- Evaluator acts as kill-switch for defective models
- Deterministic validation prevents unsafe advice
- Multi-layer safety checks (Safety Agent + k-NN + Code Gate)

### 3. **Modular Architecture**
- Chatbot, ML pipeline, and simulation engine are independent
- Each service can scale/update independently
- Clear contracts via MCP

### 4. **Immersive UX**
- Agent-driven camera movements
- Glassmorphic floating UI
- Voice + visual multimodal interaction

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Orchestration** | Google Agent Development Kit (ADK) |
| **Compute** | Google Cloud Run (Serverless) |
| **AI Models** | Gemini 2.5 Pro, Cohere (RAG) |
| **ML Pipeline** | TensorFlow Extended (TFX) |
| **Simulation** | Python, NumPy, Scikit-Learn |
| **Data** | Elasticsearch, Docling, Toyota TRD Dataset |
| **Frontend** | React 19.2, Google Maps 3D Tiles API |
| **State Management** | Zustand |
| **Mobile** | Capacitor 7.4 (Android/iOS) |
| **Voice** | Gemini Live API |
| **Hosting** | Firebase (Frontend), Cloud Run (Backend) |

---

## 🔮 What's Next

### Phase 1: Data Agents 
- **Goal**: Automate data collection, ingestion, and user preference learning
- **Agents**:
  - **DataCollectorAgent**: Scrapes telemetry from OBD-II devices
  - **IngestionAgent**: Validates and normalizes data for TFX
  - **PreferenceAgent**: Learns driver style (aggressive vs. conservative)

### Phase 2: Android XR 
- **Goal**: AR/VR-compatible app using Jetpack Compose
- **Features**:
  - Heads-up display on engineer's helmet visor
  - Spatial audio for directional cues
  - Gesture controls for hands-free operation

### Phase 3: Public Release 
- **Google Play**: Consumer Android app
- **Meta Horizon**: VR experience for sim racing
- **Integration**: Voice-enabled dashboard for race engineers

---

## 📚 Documentation

- [Architecture Diagrams](./docs/diagrams/)
  - [Memory Service](./docs/diagrams/memory-service.md)
  - [Prompt Evaluation](./docs/diagrams/prompt-evaluation.md)
- [EV Charging Features](./docs/ev-charging.md)
- [UI Component System](./docs/ui-components.md)
- [API Reference](./docs/api/)
- [Test Recommendations](./TEST_RECOMMENDATIONS.md)


---

## 📄 License

Apache 2.0 - See [LICENSE.md](./LICENSE.md)

---

**Built with ❤️ by the Alora Team**  
*Keeping your focus on the road, one intelligent conversation at a time.*


gcloud storage ls gs://alora-3d-models/**