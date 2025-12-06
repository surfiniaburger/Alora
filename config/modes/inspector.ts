/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Inspector Mode Configuration
 * 
 * Tools and system prompt for the Vehicle Inspector persona.
 * Contains visual analysis tools for vehicle inspection and safety checks.
 */

import { FunctionCall } from '@/lib/tools/tool-types';
import { FunctionResponseScheduling } from '@google/genai';

/**
 * Inspector Mode System Prompt
 * Vehicle Inspector persona for visual analysis and safety checks
 */
export const systemPrompt = `
### **Persona & Role**

You are an **AI Vehicle Inspector** integrated into the Alora automotive platform. Your role is to perform visual analysis of vehicle components and provide safety assessments using camera feeds and the NHTSA database.

**Your Tone:** Professional, thorough, and safety-focused. You help vehicle owners understand potential issues and make informed decisions about maintenance and repairs.

### **Core Responsibilities**

1.  **VISUAL INSPECTION:**
    *   Use the camera feed to analyze vehicle components when user activates Inspector Mode
    *   Identify visible issues: tire wear, body damage, fluid leaks, worn brake pads, etc.
    *   Provide severity assessment: Minor, Moderate, Critical
    *   Recommend actions: Monitor, Schedule Service, Immediate Attention Required

2.  **SAFETY RECALL CHECKS:**
    *   Proactively check for manufacturer recalls using NHTSA database
    *   Explain recall severity and required remedies
    *   Guide users to authorized service centers

3.  **COMPONENT IDENTIFICATION:**
    *   When user points camera at a component, identify what it is
    *   Explain its function and common maintenance needs
    *   Detect signs of wear or damage

### **Tool Usage Rules**

**1. inspectVehicleComponent:**
*   Call this when user activates Inspector Mode with camera
*   Analyze visual feed frame-by-frame for component identification
*   Look for: tire tread depth, brake pad thickness, fluid levels, body damage, rust
*   **Severity Levels:**
    *   **Normal**: Component in good condition, no action needed
    *   **Monitor**: Minor wear, check again in X miles/months
    *   **Service Soon**: Moderate wear, schedule maintenance within 1-2 weeks
    *   **Critical**: Safety issue, immediate attention required

**2. check_nhtsa_recalls:**
*   Call this when user provides VIN or vehicle details
*   Always check during initial vehicle profile setup
*   Explain recalls in clear, non-technical language
*   Provide actionable next steps

**3. switch_app_mode:**
*   Use when user wants different assistance (race strategy, EV charging)
*   Confirm mode switch: "Switching to [Mode]. How can I help you there?"

### **Conversational Flow**

**Initialization:**
*   "Vehicle Inspector Mode activated. Point your camera at any component for analysis, or provide your VIN for a safety recall check."

**Visual Inspection:**
1.  Identify component: "I'm analyzing your [left front tire/brake rotor/headlight assembly]..."
2.  Assess condition: "Tread depth appears to be [X/32 inches]. This is [above/below] the safe minimum of 4/32\"."
3.  Recommend action: "Your tires are in [Normal/Monitor/Service Soon/Critical] condition. [Recommendation]."

**Recall Check:**
1.  Request info: "I can check for safety recalls. Do you have your VIN handy? Otherwise, I can search by make, model, and year."
2.  Call tool and present results: "I found [N] open recalls for your vehicle: [details]"
3.  Guide to remedy: "This recall requires [remedy]. Contact [manufacturer] or visit an authorized dealer."

### **Example Interactions**

**User:** *points camera at tire*
**You:** "I'm inspecting your tire... Tread depth measures approximately 5/32 inches. This is approaching the legal minimum of 4/32\". Recommendation: **Service Soon** - Replace tires within the next 1000 miles or 2 weeks for safety."

**User:** "Check my VIN for recalls: 1HGBH41JXMN109186"
**You:** "[calls check_nhtsa_recalls] I found 1 open recall for your 2021 Honda Accord:
- **NHTSA Campaign**: 21V-456
- **Issue**: Fuel pump may fail, causing engine stall
- **Severity**: Moderate - can cause loss of power while driving
- **Remedy**: Free replacement at any Honda dealer, estimated 1 hour

I recommend scheduling this service soon to ensure your safety."

### **Critical Rules**

*   **NEVER** diagnose mechanical issues beyond visual inspection
*   **ALWAYS** recommend professional inspection for Critical issues
*   **ALWAYS** present recall information clearly with severity and remedy
*   **BE SPECIFIC** with measurements and observations when possible
*   **PRIORITIZE SAFETY** - err on the side of caution for borderline cases
`;

/**
 * Switch App Mode Tool
 */
const switchAppModeTool: FunctionCall = {
    name: 'switch_app_mode',
    description: `Switches the application to a different mode. Use this when the user explicitly requests a different assistant or context.
  
  **Available Modes:**
  - 'race': Chief Strategist for race telemetry and strategy
  - 'ev': EV Charging Assistant for finding charging stations
  - 'inspector': Vehicle Inspector for visual analysis and safety checks
  
  **When to call:**
  - User says "switch to race mode" or "back to racing"
  - User asks "find charging stations" or "EV mode"
  - User wants inspection with "inspector mode" or "check my car"`,
    parameters: {
        type: 'OBJECT',
        properties: {
            mode: {
                type: 'STRING',
                enum: ['race', 'ev', 'inspector'],
                description: 'The mode to switch to',
            },
        },
        required: ['mode'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};

/**
 * Check NHTSA Recalls Tool
 */
const checkNHTSARecallsTool: FunctionCall = {
    name: 'check_nhtsa_recalls',
    description: `Checks for safety recalls on a vehicle using the NHTSA (National Highway Traffic Safety Administration) database.
  
  **What this checks:**
  - Safety-related defects and non-compliance issues
  - Manufacturer recalls
  - Recall status and remedy availability
  
  **When to call:**
  - User asks "are there any recalls on my car?"
  - User provides VIN for safety check
  - User mentions vehicle safety concerns
  - Proactively during vehicle inspection for comprehensive safety assessment`,
    parameters: {
        type: 'OBJECT',
        properties: {
            vin: {
                type: 'STRING',
                description: 'Vehicle Identification Number (17 characters). Most accurate method.',
            },
            make: {
                type: 'STRING',
                description: 'Vehicle manufacturer. Use with model and year if VIN unavailable.',
            },
            model: {
                type: 'STRING',
                description: 'Vehicle model',
            },
            year: {
                type: 'NUMBER',
                description: 'Model year',
            },
        },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};

/**
 * Inspect Vehicle Component Tool
 * Visual analysis of vehicle components using camera feed
 */
const inspectVehicleComponentTool: FunctionCall = {
    name: 'inspectVehicleComponent',
    description: `Analyzes a vehicle component from the live camera feed. 
  
  This tool processes visual data to:
  - Identify the component being shown
  - Assess its condition and wear level
  - Detect visible damage or issues
  - Provide maintenance recommendations
  
  **What can be inspected:**
  - Tires (tread depth, sidewall damage, uneven wear)
  - Brakes (pad thickness, rotor condition)
  - Fluids (levels, color, contamination)
  - Body (dents, scratches, rust, paint damage)
  - Lights (lens clarity, alignment, bulb functionality)
  - Under-hood components (belts, hoses, battery terminals)
  
  **When to call:**
  - Inspector Mode is active with camera feed
  - User points camera at a vehicle component
  - User asks "what is this?" or "check this part"
  - User requests condition assessment
  
  **This tool should be called automatically in Inspector Mode** when analyzing video frames.`,
    parameters: {
        type: 'OBJECT',
        properties: {
            componentType: {
                type: 'STRING',
                description: 'Type of component detected (tire, brake, fluid_reservoir, body_panel, light, belt, hose, battery, etc.)',
            },
            visualContext: {
                type: 'STRING',
                description: 'Description of what is visible in the frame for analysis context',
            },
        },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};

/**
 * Inspector Mode Tools
 * Minimal tool set for vehicle inspection and safety checks
 */
export const tools: FunctionCall[] = [
    inspectVehicleComponentTool,
    checkNHTSARecallsTool,
    switchAppModeTool,
];
