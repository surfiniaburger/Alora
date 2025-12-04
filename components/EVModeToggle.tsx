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

import React, { useState } from 'react';
import { useEVModeStore } from '@/lib/ev-mode-state';
import { useTools } from '@/lib/state';
import './EVModeToggle.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

import { useLiveAPIContext } from '../contexts/LiveAPIContext';

// Road Atlanta coordinates
const ROAD_ATLANTA_COORDS = {
    lat: 34.1458,
    lng: -83.8177,
};

export default function EVModeToggle() {
    const { isEVModeActive, toggleEVMode, setUserLocation } = useEVModeStore();
    const { setTemplate } = useTools();
    const { client } = useLiveAPIContext();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Helper to fetch current GPS location
     * Returns a Promise with coordinates or fallback location
     */
    const fetchCurrentLocation = async (): Promise<{ lat: number; lng: number }> => {
        try {
            // Native (Android/iOS)
            if (Capacitor.isNativePlatform()) {
                const permissionStatus = await Geolocation.checkPermissions();
                if (permissionStatus.location !== 'granted') {
                    const requestStatus = await Geolocation.requestPermissions();
                    if (requestStatus.location !== 'granted') {
                        throw new Error('Location permission denied');
                    }
                }

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000,
                });

                return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
            }

            // Web fallback
            if (!navigator.geolocation) {
                throw new Error('Geolocation not supported');
            }

            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        });
                    },
                    (error) => {
                        reject(error);
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 5000,
                        maximumAge: 60000,
                    }
                );
            });
        } catch (error) {
            console.warn('[EVModeToggle] Geolocation failed, using fallback:', error);
            // Fallback to a neutral location (user can manually set via AI)
            return { lat: 0, lng: 0 };
        }
    };

    const handleToggle = async () => {
        console.log('[EVModeToggle] Toggle clicked, current mode:', isEVModeActive ? 'EV' : 'Race');

        setIsLoading(true);
        toggleEVMode();

        try {
            // Switch template to change tools and system prompt
            if (isEVModeActive) {
                // Switching TO Race Mode
                console.log('[EVModeToggle] Switching to race-strategy');
                setTemplate('race-strategy');

                // Send system message with Road Atlanta coordinates
                const message = `SYSTEM UPDATE: Switch to Race Mode. Location: Road Atlanta Track (${ROAD_ATLANTA_COORDS.lat}, ${ROAD_ATLANTA_COORDS.lng}). Revert to Race Strategy. Prioritize lap times and tire degradation.`;
                client.send([{ text: message }]);
                console.log('[EVModeToggle] Sent to AI:', message);
            } else {
                // Switching TO EV Mode - fetch real-time location
                console.log('[EVModeToggle] Switching to ev-assistant, fetching location...');
                setTemplate('ev-assistant');

                const coords = await fetchCurrentLocation();
                console.log('[EVModeToggle] Location fetched:', coords);

                // Update EV store with user location
                setUserLocation({
                    lat: coords.lat,
                    lng: coords.lng,
                    source: 'gps',
                    timestamp: Date.now(),
                    description: 'Current GPS location',
                });

                // Send dynamic system message to AI with actual coordinates
                const message = `SYSTEM UPDATE: Switch to EV Mode. Current User Coordinates: ${coords.lat}, ${coords.lng}. Re-center context to this location. Prioritize range anxiety and charging stations.`;
                client.send([{ text: message }]);
                console.log('[EVModeToggle] Sent to AI:', message);
            }
        } catch (error) {
            console.error('[EVModeToggle] Error during mode switch:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ev-mode-toggle">
            <button
                className={`toggle-button ${isEVModeActive ? 'ev-active' : 'race-active'} ${isLoading ? 'loading' : ''}`}
                onClick={handleToggle}
                disabled={isLoading}
                aria-label={`Switch to ${isEVModeActive ? 'Race' : 'EV'} Mode`}
                title={`Currently in ${isEVModeActive ? 'EV' : 'Race'} Mode. Click to switch.`}
            >
                <span className="icon">
                    {isLoading ? '⏳' : (isEVModeActive ? '⚡' : '🏎️')}
                </span>
                <span className="label">
                    {isLoading ? 'Switching...' : (isEVModeActive ? 'EV Mode' : 'Race Mode')}
                </span>
                <span className="mode-indicator">
                    {isEVModeActive ? 'Charging Assistant' : 'Strategy Desk'}
                </span>
            </button>
        </div>
    );
}
