/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEVModeStore, EVChargingStation } from '@/lib/ev-mode-state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
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
        vehicleProfile
    } = useEVModeStore();
    const { client, connected } = useLiveAPIContext();

    // Use passed stations or fallback to store
    const displayStations = stations || nearbyStations;

    if (!displayStations || displayStations.length === 0) {
        return null;
    }

    const handleNavigate = (station: EVChargingStation) => {
        // Trigger navigation by sending a text prompt to the AI
        console.log('Navigating to:', station.name);
        selectStation(station);
        if (client && connected) {
            client.sendRealtimeText(`show route to station ${station.placeId}`);
        }
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
