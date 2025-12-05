/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Station Panel Component
 * 
 * Displays a list of nearby charging stations with detailed information.
 * Allows users to select stations for navigation and view details.
 * Integrates with the EV mode state and map visualization.
 */

import React from 'react';
import { useEVModeStore, EVChargingStation } from '@/lib/ev-mode-state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { Capacitor } from '@capacitor/core';
import { navigateToStation } from '@/lib/navigation';
import './EVStationPanel.css';

export default function EVStationPanel() {
    const { nearbyStations, selectedStation, selectStation, vehicleProfile } = useEVModeStore();
    const { client, connected } = useLiveAPIContext();

    if (nearbyStations.length === 0) {
        return null; // Don't show panel if no stations found
    }

    const handleStationClick = (station: EVChargingStation) => {
        selectStation(selectedStation?.placeId === station.placeId ? null : station);
    };

    const handleNavigate = (station: EVChargingStation, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card selection
        navigateToStation(station, client, connected);
    };

    // Calculate battery usage for each station
    const getBatteryUsage = (distance: number): number => {
        if (!vehicleProfile) return 0;
        const kWhUsed = distance / 3; // Rough estimate: 3 mi/kWh
        return (kWhUsed / vehicleProfile.batteryCapacity) * 100;
    };

    const canReachStation = (distance: number): boolean => {
        if (!vehicleProfile) return true;
        const batteryUsage = getBatteryUsage(distance);
        return batteryUsage < vehicleProfile.currentCharge;
    };

    return (
        <div className="ev-station-panel">
            <div className="panel-header">
                <div className="header-content">
                    <h3>⚡ Nearby Charging Stations</h3>
                    <span className="station-count">{nearbyStations.length} found</span>
                </div>
                {vehicleProfile && (
                    <div className="battery-status">
                        <span className="battery-icon">🔋</span>
                        <span className="battery-level">{vehicleProfile.currentCharge}%</span>
                        <span className="battery-range">({vehicleProfile.estimatedRange} mi)</span>
                    </div>
                )}
            </div>

            <div className="station-list">
                {nearbyStations.map((station) => {
                    const isSelected = selectedStation?.placeId === station.placeId;
                    const batteryUsage = getBatteryUsage(station.distance);
                    const reachable = canReachStation(station.distance);

                    return (
                        <div
                            key={station.placeId}
                            className={`station-card ${isSelected ? 'selected' : ''} ${!reachable ? 'out-of-range' : ''}`}
                            onClick={() => handleStationClick(station)}
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
                                        onClick={(e) => handleNavigate(station, e)}
                                    >
                                        Navigate
                                    </button>
                                    <button className="action-button secondary">
                                        Details
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
