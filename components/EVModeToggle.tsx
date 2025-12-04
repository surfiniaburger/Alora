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
                    enableHighAccuracy: false,  // Fast: Use WiFi/Cell instead of GPS
                    timeout: 5000,
                    maximumAge: 300000,          // Accept cached locations up to 5 minutes old
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
                        enableHighAccuracy: false,  // Fast: Use WiFi/Cell instead of GPS
                        timeout: 5000,
                        maximumAge: 300000,          // Accept cached locations up to 5 minutes old
                    }
                );
            });
        } catch (error) {
            console.warn('[EVModeToggle] Geolocation failed:', error);
            throw error;  // Re-throw to let caller handle
        }
    };

    const handleToggle = async () => {
        console.log('[EVModeToggle] Toggle clicked, current mode:', isEVModeActive ? 'EV' : 'Race');

        setIsLoading(true);

        try {
            // Optimistically toggle the mode. We'll revert this in the catch block if anything fails.
            toggleEVMode();

            // The logic below relies on the pre-toggle value of `isEVModeActive` due to closure.
            if (isEVModeActive) {
                // Switching TO Race Mode
                console.log('[EVModeToggle] Switching to race-strategy');
                setTemplate('race-strategy');

                // Send system message with Road Atlanta coordinates
                const message = `SYSTEM UPDATE: Switch to Race Mode. Location: Road Atlanta Track (${ROAD_ATLANTA_COORDS.lat}, ${ROAD_ATLANTA_COORDS.lng}). Revert to Race Strategy. Prioritize lap times and tire degradation.`;
                client.send([{ text: message }]);
                console.log('[EVModeToggle] Sent to AI:', message);
            } else {
                // Switching TO EV Mode - Optimistic UI pattern
                console.log('[EVModeToggle] Switching to ev-assistant (optimistic)');
                setTemplate('ev-assistant');

                // Non-blocking location fetch with fast config
                // UI switches immediately, location updates asynchronously
                fetchCurrentLocation()
                    .then((coords) => {
                        console.log('[EVModeToggle] Location fetched:', coords);

                        // Update EV store with user location
                        setUserLocation({
                            lat: coords.lat,
                            lng: coords.lng,
                            source: 'gps',
                            timestamp: Date.now(),
                            description: 'Current GPS location',
                        });

                        // Send update to AI with real coordinates
                        const message = `SYSTEM UPDATE: Switch to EV Mode. Current User Coordinates: ${coords.lat}, ${coords.lng}. Re-center context to this location. Prioritize range anxiety and charging stations.`;
                        client.send([{ text: message }]);
                        console.log('[EVModeToggle] Sent to AI (with location):', message);
                    })
                    .catch((error) => {
                        console.warn('[EVModeToggle] Location fetch failed, using fallback:', error);

                        // Send fallback message to AI without exact coordinates
                        const fallbackMessage = `SYSTEM UPDATE: Switched to EV Mode. Exact location unavailable, using last known region. Prioritize range anxiety and charging stations.`;
                        client.send([{ text: fallbackMessage }]);
                        console.log('[EVModeToggle] Sent to AI (fallback):', fallbackMessage);
                    });
            }
        } catch (error) {
            console.error('[EVModeToggle] Error during mode switch, reverting state:', error);
            // Revert the optimistic UI update on failure to maintain a consistent state.
            toggleEVMode();
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
