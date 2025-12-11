
import { ToolImplementation, FunctionCall } from './tool-types';
import { useUI } from '../state';

/**
 * Tool to switch the application UI mode.
 * Alora can use this to adapt the interface based on the conversation context.
 */
const setAppMode: ToolImplementation = async (args, context) => {
    const { mode } = args;

    if (mode !== 'RACE' && mode !== 'EV' && mode !== 'STANDARD') {
        return 'Invalid mode. Supported modes are: RACE, EV, STANDARD.';
    }

    // Update the EV Mode store to reflect the change
    // We repurpose the existing "EV Mode" boolean for now to mean "EV Mode Active"
    // or "Race Mode (default)".
    // Long term we should have a dedicated `appMode` string in a store.
    // For now: EV = true, RACE/STANDARD = false.

    const { setAppMode } = useUI.getState();

    if (mode === 'EV') {
        setAppMode('EV');
        return 'HUD adapted for EV context.';
    } else {
        setAppMode(mode as any);
        return `HUD adapted for ${mode} context.`;
    }
};

export const uiToolDeclarations: FunctionCall[] = [
    {
        name: 'setAppMode',
        description: 'Switches the application UI mode to adapt to the conversation context. Use "RACE" for telemetry/track focus, "EV" for charging/range focus, and "STANDARD" for general use.',
        parameters: {
            type: 'OBJECT',
            properties: {
                mode: {
                    type: 'STRING',
                    enum: ['RACE', 'EV', 'STANDARD'],
                    description: 'The target UI mode.',
                },
            },
            required: ['mode'],
        },
        isEnabled: true,
    },
];

export const uiTools: Record<string, ToolImplementation> = {
    setAppMode,
};
