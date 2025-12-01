/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEVModeStore } from '@/lib/ev-mode-state';
import './BatteryStatus.css';

export default function BatteryStatus() {
    const { vehicleProfile } = useEVModeStore();

    if (!vehicleProfile) return null;

    return (
        <div className="battery-status-card">
            <div className="battery-icon-wrapper">
                <span className="battery-icon">🔋</span>
            </div>
            <div className="battery-info">
                <span className="battery-level">{vehicleProfile.currentCharge}%</span>
                <span className="battery-range">({vehicleProfile.estimatedRange} mi)</span>
            </div>
        </div>
    );
}
