/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef } from 'react';
import { useTelemetryStore } from '../../lib/state';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import './TelemetryPanel.css';

export default function TelemetryPanel() {
    const { data } = useTelemetryStore();
    const panelRef = useRef<HTMLDivElement>(null);

    // Slide-down entrance animation
    useGSAP(() => {
        if (panelRef.current) {
            gsap.fromTo(
                panelRef.current,
                { y: -100, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
            );
        }
    }, []);

    // Delta Formatting
    const deltaVal = data.lapDelta;
    const deltaColor = deltaVal <= 0 ? 'delta-green' : 'delta-red';
    const formattedDelta = (deltaVal > 0 ? '+' : '') + deltaVal.toFixed(2);

    return (
        <div className="telemetry-panel" ref={panelRef}>
            {/* Compact Grid: Speed, Gear, Delta */}
            <div className="telemetry-grid-compact">
                {/* Speed */}
                <div className="telemetry-item">
                    <span className="label">Speed</span>
                    <div className="value-large">
                        {Math.round(data.speed)}<span className="unit">MPH</span>
                    </div>
                </div>

                {/* Gear */}
                <div className="telemetry-item">
                    <span className="label">Gear</span>
                    <div className="value-gear">{data.gear}</div>
                </div>

                {/* Lap Delta */}
                <div className="telemetry-item">
                    <span className="label">Δ Lap</span>
                    <div className={`value-delta ${deltaColor}`}>
                        {formattedDelta}s
                    </div>
                </div>
            </div>
        </div>
    );
}