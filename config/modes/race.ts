/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Race Mode Configuration
 * 
 * Tools and system prompt for the Chief Strategist persona.
 * Contains racing-specific tools for telemetry, track visualization, and strategy.
 */

import { FunctionCall } from '@/lib/tools/tool-types';
import { RACE_ENGINEER_PROMPT } from '@/lib/constants';
import { itineraryPlannerTools } from '@/lib/tools/itinerary-planner';
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
  - User says "switch to EV mode" or "I need charging help"
  - User asks "inspect my vehicle" or "check for recalls"
  - User wants to return to race mode with "back to racing" or "race mode"`,
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
 * Race Mode Tools
 * Combines race-specific tools with mode switching capability
 */
export const tools: FunctionCall[] = [
    ...itineraryPlannerTools,
    switchAppModeTool,
];

/**
 * Race Mode System Prompt
 * Chief Strategist persona for Toyota Gazoo Racing
 */
export const systemPrompt = RACE_ENGINEER_PROMPT;
