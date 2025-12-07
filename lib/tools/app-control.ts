/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * App Control Tools
 * 
 * Tools for controlling application-level state and behavior,
 * including mode switching and system configuration.
 */

import { useAppStore, useLogStore } from '@/lib/state';
import type { ToolImplementation } from './tool-types';

/**
 * Switch App Mode Tool Implementation
 * 
 * Allows the AI agent to switch between race, ev, and inspector modes.
 * Updates the global app state and persists the change to localStorage.
 * 
 * @param args - Tool arguments containing target mode
 * @param context - Tool execution context
 * @returns Success message confirming mode switch
 */
export const switchAppMode: ToolImplementation = async (args, context) => {
    const { mode } = args;

    // Validate mode
    const validModes = ['race', 'ev', 'inspector'];
    if (!validModes.includes(mode)) {
        const errorMessage = `Invalid mode: ${mode}. Valid modes are: ${validModes.join(', ')}`;
        useLogStore.getState().addTurn({
            role: 'system',
            text: errorMessage,
            isFinal: true,
        });
        return errorMessage;
    }

    // Update app mode
    useAppStore.getState().setMode(mode);

    const modeNames = {
        race: 'Race Mode - Chief Strategist',
        ev: 'EV Mode - Charging Assistant',
        inspector: 'Inspector Mode - Vehicle Inspector',
    };

    const successMessage = `Successfully switched to ${modeNames[mode as keyof typeof modeNames]}. All tools and context have been updated.`;

    // Log the mode switch
    console.log(`[App Control] Mode switched to: ${mode}`);

    return successMessage;
};

/**
 * App Control Tool Registry
 * Maps tool names to their implementations
 */
export const appControlTools: Record<string, ToolImplementation> = {
    switch_app_mode: switchAppMode,
};
