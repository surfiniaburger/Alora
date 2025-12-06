/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Mode Configuration
 * 
 * Tools and system prompt for the EV Charging Assistant persona.
 * Contains EV-specific tools for finding charging stations, navigation, and vehicle profile management.
 */

import { FunctionCall } from '@/lib/tools/tool-types';
import { EV_ASSISTANT_PROMPT } from '@/lib/constants';
import { evAssistantTools } from '@/lib/tools/ev-assistant-tools';
import { FunctionResponseScheduling } from '@google/genai';

/**
 * Switch App Mode Tool
 * Allows transitioning between race, ev, and inspector modes
 */
const switchAppModeTool: FunctionCall = {
    name: 'switch_app_mode',
    description: `Switches the application to a different mode. Use this when the user explicitly requests a different assistant or context.
  
  **Available Modes:**
  - 'race': Chief Strategist for race telemetry and strategy
  - 'ev': EV Charging Assistant for finding charging stations
  - 'inspector': Vehicle Inspector for visual analysis and safety checks
  
  **When to call:**
  - User says "switch to race mode" or "I need race help"
  - User asks "inspect my vehicle" or "check for recalls"
  - User wants EV assistance with "EV mode" or "charging help"`,
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
 * Queries the NHTSA API for vehicle safety recalls
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
  - User provides VIN and wants safety information
  - User mentions concerns about vehicle safety
  - During vehicle profile setup for comprehensive safety check
  
  **How to use:**
  - Prefer VIN if available (most accurate)
  - Fall back to make/model/year if VIN unknown
  - Always present results clearly with severity and remedy status`,
    parameters: {
        type: 'OBJECT',
        properties: {
            vin: {
                type: 'STRING',
                description: 'Vehicle Identification Number (17 characters). Most accurate method for recall lookup.',
            },
            make: {
                type: 'STRING',
                description: 'Vehicle manufacturer (e.g., Tesla, Ford, Nissan). Use with model and year if VIN unavailable.',
            },
            model: {
                type: 'STRING',
                description: 'Vehicle model (e.g., Model 3, Mustang Mach-E, Leaf)',
            },
            year: {
                type: 'NUMBER',
                description: 'Model year (e.g., 2023)',
            },
        },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};

/**
 * EV Mode Tools
 * Combines EV-specific tools with mode switching and safety check capabilities
 */
export const tools: FunctionCall[] = [
    ...evAssistantTools,
    switchAppModeTool,
    checkNHTSARecallsTool,
];

/**
 * EV Mode System Prompt
 * EV Charging Assistant persona
 */
export const systemPrompt = EV_ASSISTANT_PROMPT;
