/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useTelemetryStore } from '../../lib/state';
import './TelemetryPanel.css';

export default function TelemetryPanel() {
  const { data } = useTelemetryStore();

  // Tire color logic
  let tireColor = '#0d9c53'; // Green
  if (data.tireHealth < 70) tireColor = '#f5a623'; // Yellow
  // MATCHING PROMPT LOGIC: Red if < 45% (Critical/Box Window)
  if (data.tireHealth < 45) tireColor = '#eb0a1e'; // Red

  // Delta Formatting
  const deltaVal = data.lapDelta;
  const deltaColor = deltaVal <= 0 ? 'delta-green' : 'delta-red';
  // Ensure + sign for positive numbers. Negative numbers usually bring their own sign via toFixed.
  const formattedDelta = (deltaVal > 0 ? '+' : '') + deltaVal.toFixed(2);

  return (
    <div className="telemetry-panel">
      <div className="telemetry-header">
        <h2>GR SUPRA GT4 // LIVE</h2>
        <span className="live-indicator">TX ACTIVE</span>
      </div>

      <div className="telemetry-grid">
        {/* Speed & Gear */}
        <div className="telemetry-cell large">
            <div>
                <span className="label">Speed</span>
                <div className="speed-readout">
                    {Math.round(data.speed)}<span className="unit">MPH</span>
                </div>
            </div>
            <div>
                <span className="label" style={{textAlign: 'right', display: 'block'}}>Gear</span>
                <div className="gear-readout">{data.gear}</div>
            </div>
        </div>

        {/* Tires */}
        <div className="telemetry-cell">
            <span className="label">Tire Deg.</span>
            <div className="value">{data.tireHealth.toFixed(1)}%</div>
            <div className="progress-container">
                <div 
                    className="progress-bar" 
                    style={{ width: `${data.tireHealth}%`, backgroundColor: tireColor }}
                ></div>
            </div>
        </div>

        {/* Fuel */}
        <div className="telemetry-cell">
            <span className="label">Fuel Load</span>
            <div className="value">{data.fuelLevel.toFixed(1)}%</div>
             <div className="progress-container">
                <div 
                    className="progress-bar" 
                    style={{ width: `${data.fuelLevel}%`, backgroundColor: '#fff' }}
                ></div>
            </div>
        </div>

        {/* Delta */}
        <div className="telemetry-cell">
            <span className="label">Lap Delta</span>
            <div className={`delta-value ${deltaColor}`}>
                {formattedDelta}s
            </div>
        </div>

        {/* RPM */}
        <div className="telemetry-cell">
            <span className="label">RPM</span>
            <div className="value">{Math.round(data.rpm).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}