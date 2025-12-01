/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EVChargingStation, EVVehicleProfile } from '@/lib/ev-mode-state';
import { MILES_PER_KWH_ESTIMATE } from '@/lib/constants';
import './StationCard.css';

interface StationCardProps {
    station: EVChargingStation;
    vehicleProfile: EVVehicleProfile | null;
    isSelected: boolean;
    onSelect: (station: EVChargingStation) => void;
    onNavigate: (station: EVChargingStation) => void;
}

export default function StationCard({
    station,
    vehicleProfile,
    isSelected,
    onSelect,
    onNavigate
}: StationCardProps) {
    // Calculate battery usage
    const getBatteryUsage = (distance: number): number => {
        if (!vehicleProfile) return 0;
        const kWhUsed = distance / MILES_PER_KWH_ESTIMATE;
        return (kWhUsed / vehicleProfile.batteryCapacity) * 100;
    };

    const canReachStation = (distance: number): boolean => {
        if (!vehicleProfile) return true;
        const batteryUsage = getBatteryUsage(distance);
        return batteryUsage < vehicleProfile.currentCharge;
    };

    const batteryUsage = getBatteryUsage(station.distance);
    const reachable = canReachStation(station.distance);

    return (
        <div
            className={`station-card ${isSelected ? 'selected' : ''} ${!reachable ? 'out-of-range' : ''}`}
            onClick={() => onSelect(station)}
        >
            <div className="station-header">
                <div className="station-name-row">
                    <h4>{station.name}</h4>
                    {!reachable && <span className="warning-badge">⚠️ Low Range</span>}
                </div>
                <div className="station-distance">
                    <span className="distance-value">{station.distance.toFixed(1)}</span>
                    <span className="distance-unit">mi</span>
                </div>
            </div>

            <div className="station-details">
                <div className="detail-row">
                    <span className="label">⚡ Charging:</span>
                    <span className="value charging-speed">
                        {station.chargingSpeed.join(', ')}
                    </span>
                </div>

                <div className="detail-row">
                    <span className="label">🔌 Ports:</span>
                    <span className="value">{station.availablePorts} available</span>
                </div>

                {station.rating && (
                    <div className="detail-row">
                        <span className="label">⭐ Rating:</span>
                        <span className="value">{station.rating.toFixed(1)}</span>
                    </div>
                )}

                {station.pricing && (
                    <div className="detail-row">
                        <span className="label">💰 Price:</span>
                        <span className="value">{station.pricing}</span>
                    </div>
                )}

                {vehicleProfile && (
                    <div className="detail-row battery-usage">
                        <span className="label">🔋 Usage:</span>
                        <span className={`value ${!reachable ? 'warning' : ''}`}>
                            ~{batteryUsage.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>

            {station.amenities.length > 0 && (
                <div className="station-amenities">
                    {station.amenities.map((amenity) => (
                        <span key={amenity} className="amenity-tag">{amenity}</span>
                    ))}
                </div>
            )}

            {isSelected && (
                <div className="station-actions">
                    <button
                        className="action-button primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(station);
                        }}
                    >
                        Navigate
                    </button>
                    <button
                        className="action-button secondary"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Details logic could go here
                        }}
                    >
                        Details
                    </button>
                </div>
            )}
        </div>
    );
}
