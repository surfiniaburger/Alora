# 🏎️ Alora: The Multi-Agent Automotive Co-Pilot
**Deployed on Google Cloud Run | Built with Google Agent Development Kit (ADK)**

Mobile efforts are currently ongoing [here](https://github.com/surfiniaburger/mooncake)

### 💡 The Vision
Cars are becoming supercomputers, but the interface is stuck in the past. Whether you are a professional Race Engineer analyzing telemetry or a daily driver trying to understand a warning light, the data is locked away in screens and manuals.

**Alora is a Multi-Agent System** that breaks this barrier. It isn't just a chatbot; it's a digital crew sitting in the passenger seat (or the pit wall). It connects **Google Maps 3D Tiles**, **Live Telemetry**, and **RAG Knowledge Bases** into a single, voice-controlled interface.

---

### 🤖 The "Agentic" Architecture (Google ADK)
We didn't just write a script; we built a **Multi-Agent Workflow** using the Google ADK. The system creates a "Mind" for the car composed of specialized agents that collaborate to solve complex queries.

#### 1. The Dispatcher Agent (The Brain)
*   **Role:** The main interface that listens to the driver/engineer.
*   **Function:** It analyzes the intent. Is the user asking about a mechanical feature? Or are they asking for a race strategy? It routes the task to the correct specialist.

#### 2. The Researcher Agent (RAG & Safety)
*   **Role:** The Mechanic / Manual Expert.
*   **Tech:** FastMCP, Elasticsearch, Docling.
*   **Workflow:** When asked *"How do I use Launch Control?"* or *"What is this error code?"*, this agent performs a hybrid vector search on the vehicle's technical manual. It uses a "Safety-First" critique loop to ensure it never gives dangerous advice.

#### 3. The Strategist Agent (The Racing Logic)
*   **Role:** The Race Engineer.
*   **Tech:** Python (Scikit-Learn), Monte Carlo Simulations.
*   **Workflow:** When in "Track Mode" (Toyota GR Integration), this agent ingests live telemetry (Tire Wear, Fuel, Lap Delta). It runs real-time simulations to predict pit windows and competitor pace.

#### 4. The Director Agent (UI & Map Control) 🌟 *Key Feature*
*   **Role:** The Cameraman.
*   **Capability:** **"Agent-Driven UI."**
*   **How it works:** Most chatbots just output text. Alora outputs *actions*. If the Strategist says, *"There is traffic at Turn 10,"* the Director Agent triggers a `move_camera(lat, lng, tilt)` tool.
*   **Result:** The 3D Map on the user's screen physically rotates and flies to the location the Agent is talking about, creating a grounded, immersive experience.

---

### ☁️ Cloud Infrastructure (Google Cloud Run)
The entire ecosystem is serverless and scalable, deployed on **Google Cloud Run**.

*   **Service A (The Brain):** Python ADK Server (Orchestration).
*   **Service B (The Knowledge):** An MCP Server hosting the RAG pipeline and Elasticsearch connection.
*   **Service C (The Simulation):** A specialized worker for running heavy Monte Carlo math without blocking the chat.
*   **Frontend:** Next.js/React hosted on Firebase, streaming responses via WebSockets.

---

### 🏁 Use Case: The Toyota GR Cup (Hack the Track)
We tailored Alora's "Track Mode" specifically for the Toyota GR Cup.
*   **Dual Grounding:** The agents are grounded in both **Geospatial Data** (Google Maps) and **Mechanical Data** (Toyota Telemetry).
*   **The "Ghost Car":** The agents visualize the gap between the driver and the rival by rendering a "Ghost" marker on the map, allowing for intuitive, visual strategy decisions.

---

### 🚀 Accomplishments We Are Proud Of
1.  **Agents Controlling Reality:** We moved beyond "text-in, text-out." Seeing the Agent automatically pan the 3D Camera to "The Chicane" when we mentioned it was a magic moment.
2.  **Parallelized Reasoning:** Using Cloud Run, we can have the Researcher Agent looking up a manual page while the Strategist Agent runs a pit-stop simulation simultaneously.
3.  **Resilient NLP:** Our agent understood "Chicken" meant "Chicane" and correctly adjusted the suspension recommendations.

---

### 🛠️ Tech Stack
*   **Orchestration:** Google Agent Development Kit (ADK)
*   **Compute:** Google Cloud Run (Services & Jobs)
*   **AI Models:** Gemini 1.5 Pro (Reasoning), Cohere (RAG)
*   **Data:** Elasticsearch, Docling, Toyota TRD Dataset
*   **Frontend:** React, Google Maps JS API (3D Tiles)
