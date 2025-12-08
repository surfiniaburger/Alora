# EV Mode Flow Documentation (feature/inspector-mode)

This document outlines the EV Mode flow as implemented in the `feature/inspector-mode` branch.

## 1. Activation (Mode Switch)

**File:** `components/EVModeToggle.tsx`

When the user switches to EV mode, the `handleToggle` function executes the following logic:

1.  Sets the UI mode to `EV`.
2.  Updates the tool template to `ev-assistant`.
3.  Fetches the user's current GPS location.
4.  Sends a system message to the AI to establish context.

```typescript
// components/EVModeToggle.tsx

const handleToggle = async () => {
    // ...
    // Switch TO EV Mode
    setMode('EV');

    // Sync Store
    if (!useEVModeStore.getState().isEVModeActive) {
        toggleEVMode();
    }

    // Set Tool Template
    setTemplate('ev-assistant');

    // Fetch Location & Send Context
    fetchCurrentLocation()
        .then((coords) => {
            // ...
            setUserLocation({ ...coords, source: 'gps' ... });

            const message = \`SYSTEM UPDATE: Switch to EV Mode. Current User Coordinates: \${coords.lat}, \${coords.lng}. Re-center context.\`;
            client.send([{ text: message }]);
        })
        // ...
};
```

## 2. System Prompt & Persona

**File:** `lib/constants.ts`

The AI's behavior is governed by the `EV_ASSISTANT_PROMPT`. It defines the persona, responsibilities, and specific protocols for vehicle profile setup and station discovery.

```typescript
// lib/constants.ts

export const EV_ASSISTANT_PROMPT = \`
### **Persona & Role**
You are an **intelligent EV Charging Assistant**...

### **Core Responsibilities**
1. STATION DISCOVERY...
2. INTELLIGENT RECOMMENDATIONS...
3. RANGE ANXIETY MANAGEMENT...
4. VEHICLE PROFILE SETUP...

### **Conversational Flow**
**Initialization:**
*   **CHECK CONTEXT FIRST:** Look for a \`[SYSTEM]\` message containing "User Vehicle Profile Loaded".
*   **If no profile:** "Hi! I'm your EV Charging Assistant. To provide personalized recommendations, I'll need some details about your vehicle..."
\`;
```

## 3. Tool Definitions

**File:** `lib/tools/ev-assistant-tools.ts`

The tools available to the AI in EV mode are defined here.

### Key Tools:

1.  **`setEVVehicleProfile`**: Stores user's vehicle details.
    ```typescript
    {
        name: 'setEVVehicleProfile',
        description: "Stores the user's electric vehicle information...",
        parameters: { ... }
    }
    ```

2.  **`findEVChargingStations`**: Searches for stations using Google Maps Grounding.
    ```typescript
    {
        name: 'findEVChargingStations',
        description: "Searches for EV charging stations using Google Maps...",
        parameters: {
            searchRadius: { type: 'NUMBER' },
            chargingSpeed: { type: 'STRING' },
            connectorType: { type: 'STRING' },
            // ...
        }
    }
    ```

## 4. Tool Implementation & State

**File:** `lib/tools/ev-tool-registry.ts`

This file contains the actual logic for the tools, interacting with the Google Maps API and updating the application state (Zustand).

```typescript
// lib/tools/ev-tool-registry.ts

const findEVChargingStations: ToolImplementation = async (args, context) => {
    // 1. Check for vehicle profile
    const vehicleProfile = useEVModeStore.getState().vehicleProfile;
    if (!vehicleProfile) {
        return 'Please set up your vehicle profile first...';
    }

    // 2. Build Query
    let query = \`EV charging stations within \${searchRadius} miles\`;
    // ...

    // 3. Call Grounding API
    const groundedResponse = await fetchMapsGroundedResponseREST({ prompt: query, ... });

    // 4. Hydrate & Store Results
    const stations = await hydrateEVStations(groundingChunks, ...);
    useEVModeStore.getState().setNearbyStations(stations);
    
    // ...
};
```

## 5. State Management

**File:** `lib/ev-mode-state.ts` (implied usage)

Global state is managed via `useEVModeStore`.

*   `isEVModeActive`: boolean
*   `vehicleProfile`: EVVehicleProfile | null
*   `nearbyStations`: EVChargingStation[]
*   `userLocation`: UserLocation | null

---
**Summary of Flow:**
1.  **User** toggles EV Mode.
2.  **App** sends "Switch to EV Mode" system message with coordinates.
3.  **AI** (prompted by `EV_ASSISTANT_PROMPT`) checks if a profile exists.
4.  **AI** asks for vehicle details if missing ("What make and model...").
5.  **User** responds ("Tesla Model 3").
6.  **AI** calls `setEVVehicleProfile`.
7.  **Tool** stores profile in `useEVModeStore` and logs "User Vehicle Profile Loaded".
8.  **AI** can now comfortably call `findEVChargingStations` knowing the connector type and range.
