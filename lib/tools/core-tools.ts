/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionCall } from './tool-types';
import { FunctionResponseScheduling } from '@google/genai';

/**
 * Shared Core Tools
 * These tools are available across multiple modes/templates.
 */

export const switch_app_mode: FunctionCall = {
    name: 'switch_app_mode',
    description: 'Switches the application mode. Use this tool when the user asks to switch modes (e.g. "Go to EV mode", "Open Inspector", "Back to Race Mode") or when context requires a switch (e.g. low battery -> EV, visual check -> Inspector).',
    parameters: {
        type: 'OBJECT',
        properties: {
            mode: {
                type: 'STRING',
                enum: ['RACE', 'EV', 'INSPECTOR'],
                description: 'The target mode to switch to.'
            }
        },
        required: ['mode']
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};

export const mapsGrounding: FunctionCall = {
    name: 'mapsGrounding',
    description: `
    A versatile tool that leverages Google Maps data to generate contextual information and creative content about places. It can be used for two primary purposes:

    1.  **For Itinerary Planning:** Find and summarize information about places like restaurants, museums, or parks. Use a straightforward query to get factual summaries of top results.
        -   **Example Query:** "fun museums in Paris" or "best pizza in Brooklyn".

    2.  **For Creative Content:** Generate engaging narratives, riddles, or scavenger hunt clues based on real-world location data. Use a descriptive query combined with a custom 'systemInstruction' to guide the creative output.
        -   **Example Query:** "a famous historical restaurant in Paris".

    Args:
        query: A string describing the search parameters. You **MUST be as precise as possible**, include as much location data that you can such as city, state and/or country to reduce ambiguous results.
        markerBehavior: (Optional) Controls map markers. "mentioned" (default), "all", or "none".
        systemInstruction: (Optional) A string that provides a persona and instructions for the tool's output. Use this for creative tasks to ensure the response is formatted as a clue, riddle, etc.
        enableWidget: (Optional) A boolean to control whether the interactive maps widget is enabled for the response. Defaults to true. Set to false for simple text-only responses or when the UI cannot support the widget.

    Returns:
        A response from the maps grounding agent. The content and tone of the response will be shaped by the query and the optional 'systemInstruction'.
    `,
    parameters: {
        type: 'OBJECT',
        properties: {
            query: {
                type: 'STRING',
            },
            markerBehavior: {
                type: 'STRING',
                description:
                    'Controls which results get markers. "mentioned" for places in the text response, "all" for all search results, or "none" for no markers.',
                enum: ['mentioned', 'all', 'none'],
            },
            systemInstruction: {
                type: 'STRING',
                description:
                    "A string that provides a persona and instructions for the tool's output. Use this for creative tasks to ensure the response is formatted as a clue, riddle, etc.",
            },
            enableWidget: {
                type: 'BOOLEAN',
                description:
                    'A boolean to control whether the interactive maps widget is enabled for the response. Defaults to true. Set to false for simple text-only responses or when the UI cannot support the widget.',
            },
        },
        required: ['query'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
};
