/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEVModeStore, EVChargingStation } from '@/lib/ev-mode-state';
import StationCard from './StationCard';
import './StationList.css';

interface StationListProps {
    stations?: EVChargingStation[]; // Optional: can pass stations directly or use store
}

export default function StationList({ stations }: StationListProps) {
    const {
        nearbyStations,
        selectedStation,
        selectStation,
        vehicleProfile,
        setRouteToStation
    } = useEVModeStore();

    // Use passed stations or fallback to store
    const displayStations = stations || nearbyStations;

    if (!displayStations || displayStations.length === 0) {
        return null;
    }

    const handleNavigate = (station: EVChargingStation) => {
        // Logic to trigger navigation (e.g., call showRouteToStation tool or update state)
        console.log('Navigating to:', station.name);
        // For now, just select it. In real app, this would trigger the route tool.
        selectStation(station);
    };

    return (
        <div className="station-list-container">
            {displayStations.map((station) => (
                <StationCard
                    key={station.placeId}
                    station={station}
                    vehicleProfile={vehicleProfile}
                    isSelected={selectedStation?.placeId === station.placeId}
                    onSelect={selectStation}
                    onNavigate={handleNavigate}
                />
            ))}
        </div>
    );
}
