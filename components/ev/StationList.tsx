/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEVModeStore, EVChargingStation } from '@/lib/ev-mode-state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { Capacitor } from '@capacitor/core';
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
        console.log('[StationList] Navigating to:', station.name);
        selectStation(station);

        // Deep link to Google Maps for turn-by-turn navigation
        const { lat, lng } = station.position;

        if (Capacitor.isNativePlatform()) {
            // Native platform: Use Google Maps app via deep link
            const navigationUrl = `google.navigation:q=${lat},${lng}&mode=d`;
            window.open(navigationUrl, '_system');
        } else {
            // Web platform: Use Google Maps web URL
            const webNavigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
            window.open(webNavigationUrl, '_blank');
        }

        // Send AI announcement
        if (client && connected) {
            const aiMessage = `SYSTEM ALERT: User has started navigation to ${station.name}. End conversation to allow for driving focus, or offer to play music.`;
            client.send([{ text: aiMessage }]);
            console.log('[StationList] AI announcement sent:', aiMessage);
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
