/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionResponseScheduling } from '@google/genai';
import { ToolImplementation } from './tool-types';
import { useUI, useTools, AppMode, useLogStore } from '@/lib/state';
import { useEVModeStore } from '@/lib/ev-mode-state';

export const switch_app_mode: ToolImplementation = async (args) => {
    const targetMode = (args.mode as string)?.toUpperCase() as AppMode;

    if (!['RACE', 'EV', 'INSPECTOR'].includes(targetMode)) {
        return `Invalid mode: ${targetMode}. Supported modes: RACE, EV, INSPECTOR.`;
    }

    console.log(`[Control Tool] Switching to mode: ${targetMode}`);

    const { setMode } = useUI.getState();
    const { setTemplate } = useTools.getState();
    const { isEVModeActive, toggleEVMode } = useEVModeStore.getState();

    // 1. Update UI Mode
    setMode(targetMode);

    // 2. Sync Stores
    if (targetMode === 'EV') {
        if (!isEVModeActive) toggleEVMode();
        setTemplate('ev-assistant');
        return `Switched to EV Mode. Charging stations and range tools are now active.`;
    } else if (targetMode === 'RACE') {
        if (isEVModeActive) toggleEVMode();
        setTemplate('race-strategy');
        return `Switched to Race Mode. Telemetry and track analysis are active.`;
    } else if (targetMode === 'INSPECTOR') {
        // Keeps underlying EV mode state if we want (e.g. to inspect while charging), 
        // OR forces EV mode? 
        // For now, let's say Inspector is a overlay that works on top of current context, 
        // BUT we typically access it from EV. 
        // Let's not touch isEVModeActive so we can return to previous state easily?
        // Actually, the requirement was "mutually exclusive".
        // Let's assume Inspector uses 'ev-assistant' tools (vision analysis) or just generic?
        // Using 'ev-assistant' template seems safe for Inspector.
        setTemplate('ev-assistant');
        return `Switched to Inspector Mode. Rear camera is active. Please examine the vehicle.`;
    }

    return `Mode switch complete without specific actions.`;
};


export const controlToolsImplementation = {
    switch_app_mode
};
