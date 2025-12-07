/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vehicle Tools
 * 
 * Tools for vehicle inspection, safety checks, and NHTSA recall queries.
 */

import { useAppStore, useLogStore } from '@/lib/state';
import type { ToolImplementation } from './tool-types';

/**
 * NHTSA Recall Check Tool Implementation
 * 
 * Queries the NHTSA (National Highway Traffic Safety Administration) API
 * to check for safety recalls on a vehicle.
 * 
 * @param args - Tool arguments containing VIN or make/model/year
 * @param context - Tool execution context
 * @returns Recall information or error message
 */
export const checkNHTSARecalls: ToolImplementation = async (args, context) => {
    const { vin, make, model, year } = args;

    try {
        let apiUrl: string;
        let searchMethod: string;

        // Prefer VIN if available (most accurate)
        if (vin && typeof vin === 'string') {
            apiUrl = `https://api.nhtsa.gov/recalls/recallsByVehicle?vin=${encodeURIComponent(vin)}`;
            searchMethod = `VIN ${vin}`;
        } else if (make && model && year) {
            // Fall back to make/model/year
            apiUrl = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
            searchMethod = `${year} ${make} ${model}`;
        } else {
            const errorMessage = 'Invalid arguments. Please provide either a VIN or make, model, and year.';
            useLogStore.getState().addTurn({
                role: 'system',
                text: errorMessage,
                isFinal: true,
            });
            return errorMessage;
        }

        console.log(`[NHTSA] Checking recalls for: ${searchMethod}`);
        console.log(`[NHTSA] API URL: ${apiUrl}`);

        // Query NHTSA API
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`NHTSA API returned status ${response.status}`);
        }

        const data = await response.json();

        // Parse results
        const recalls = data.results || [];

        if (recalls.length === 0) {
            const successMessage = `✅ Good news! No open recalls found for ${searchMethod}.`;
            return successMessage;
        }

        // Format recall information
        let recallSummary = `⚠️ Found ${recalls.length} recall(s) for ${searchMethod}:\n\n`;

        recalls.forEach((recall: any, index: number) => {
            recallSummary += `**Recall ${index + 1}:**\n`;
            recallSummary += `- **Campaign**: ${recall.NHTSACampaignNumber || 'N/A'}\n`;
            recallSummary += `- **Component**: ${recall.Component || 'N/A'}\n`;
            recallSummary += `- **Summary**: ${recall.Summary || 'N/A'}\n`;
            recallSummary += `- **Consequence**: ${recall.Conequence || 'N/A'}\n`;
            recallSummary += `- **Remedy**: ${recall.Remedy || 'N/A'}\n`;
            recallSummary += `- **Manufacturer**: ${recall.Manufacturer || 'N/A'}\n\n`;
        });

        recallSummary += `\n**Action Required:** Contact an authorized dealer to schedule recall service. Most recalls are repaired at no cost.`;

        console.log(`[NHTSA] Found ${recalls.length} recalls`);

        return recallSummary;

    } catch (error) {
        console.error('[NHTSA] Error checking recalls:', error);
        const errorMessage = `Failed to check recalls: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;

        useLogStore.getState().addTurn({
            role: 'system',
            text: errorMessage,
            isFinal: true,
        });

        return errorMessage;
    }
};

/**
 * Inspect Vehicle Component Tool Implementation
 * 
 * Analyzes vehicle components from camera feed using Gemini's vision capabilities.
 * This is a placeholder that would integrate with the video feed in Inspector Mode.
 * 
 * @param args - Tool arguments containing component type and visual context
 * @param context - Tool execution context
 * @returns Analysis results or placeholder message
 */
export const inspectVehicleComponent: ToolImplementation = async (args, context) => {
    const { componentType, visualContext } = args;

    // TODO: Integrate with actual camera feed and Gemini vision API
    // For now, return a placeholder response

    const placeholderMessage = `[Inspector Mode] Visual analysis requested for: ${componentType || 'unknown component'}
  
**Note:** Full camera integration is pending. This tool will analyze live video frames to:
- Identify vehicle components
- Assess wear and damage
- Provide maintenance recommendations

**Context:** ${visualContext || 'No visual context provided'}

To enable this feature, the camera feed needs to be connected to Gemini's vision capabilities.`;

    console.log('[Inspector] Component inspection requested:', componentType);

    return placeholderMessage;
};

/**
 * Vehicle Tools Registry
 * Maps tool names to their implementations
 */
export const vehicleTools: Record<string, ToolImplementation> = {
    check_nhtsa_recalls: checkNHTSARecalls,
    inspectVehicleComponent: inspectVehicleComponent,
};
