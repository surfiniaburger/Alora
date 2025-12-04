/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Mode Toggle Component
 * 
 * A toggle button that switches between Race Mode and EV Mode.
 * Updates the template in the global state, which triggers:
 * - Tool registry switch (race tools ↔ EV tools)
 * - System prompt switch (race engineer ↔ EV assistant)
 * - UI visibility changes (telemetry panel ↔ EV station panel)
 */

import React from 'react';
import { useEVModeStore } from '@/lib/ev-mode-state';
import { useTools } from '@/lib/state';
import './EVModeToggle.css';

import { useLiveAPIContext } from '../contexts/LiveAPIContext';

export default function EVModeToggle() {
    const { isEVModeActive, toggleEVMode } = useEVModeStore();
    const { setTemplate } = useTools();
    const { client } = useLiveAPIContext();

    const handleToggle = () => {
        console.log('[EVModeToggle] Toggle clicked, current mode:', isEVModeActive ? 'EV' : 'Race');
        toggleEVMode();

        // Switch template to change tools and system prompt
        if (isEVModeActive) {
            console.log('[EVModeToggle] Switching to race-strategy');
            setTemplate('race-strategy');
            // Send system message to switch AI persona
            client.send([{ text: "System Alert: Driver is on track. Switch persona to 'Chief Strategist'. Prioritize lap times and tire degradation." }]);
        } else {
            console.log('[EVModeToggle] Switching to ev-assistant');
            setTemplate('ev-assistant');
            // Send system message to switch AI persona
            client.send([{ text: "System Alert: Driver has left the track. Switch persona to 'EV Assistant'. Prioritize range anxiety and charging stations." }]);
        }
    };

    return (
        <div className="ev-mode-toggle">
            <button
                className={`toggle-button ${isEVModeActive ? 'ev-active' : 'race-active'}`}
                onClick={handleToggle}
                aria-label={`Switch to ${isEVModeActive ? 'Race' : 'EV'} Mode`}
                title={`Currently in ${isEVModeActive ? 'EV' : 'Race'} Mode. Click to switch.`}
            >
                <span className="icon">
                    {isEVModeActive ? '⚡' : '🏎️'}
                </span>
                <span className="label">
                    {isEVModeActive ? 'EV Mode' : 'Race Mode'}
                </span>
                <span className="mode-indicator">
                    {isEVModeActive ? 'Charging Assistant' : 'Strategy Desk'}
                </span>
            </button>
        </div>
    );
}
