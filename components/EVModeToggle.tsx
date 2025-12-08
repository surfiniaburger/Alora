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
import { useUI, useTools } from '@/lib/state';
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

    const { activeMode, setMode } = useUI();
    const isEV = activeMode === 'EV';

    const handleToggle = async () => {
        console.log('[EVModeToggle] Toggle clicked, current mode:', activeMode);
        setIsLoading(true);

        try {
            if (activeMode === 'EV') {
                // Switch TO Race Mode
                console.log('[EVModeToggle] Switching to RACE');
                setMode('RACE');

                // setTemplate and toggleEVMode are now handled by setMode in lib/state.ts

                const message = `SYSTEM UPDATE: Switch to Race Mode. Location: Road Atlanta Track (${ROAD_ATLANTA_COORDS.lat}, ${ROAD_ATLANTA_COORDS.lng}). Revert to Race Strategy.`;
                client.send([{ text: message }]);

            } else {
                // Switch TO EV Mode
                // Also handles switching from INSPECTOR -> EV
                console.log('[EVModeToggle] Switching to EV');
                setMode('EV');

                // setTemplate and toggleEVMode are now handled by setMode in lib/state.ts

                fetchCurrentLocation()
                    .then((coords) => {
                        if (useUI.getState().activeMode !== 'EV') return; // Abort if user switched away

                        setUserLocation({
                            lat: coords.lat,
                            lng: coords.lng,
                            source: 'gps',
                            timestamp: Date.now(),
                            description: 'Current GPS location',
                        });

                        const message = `SYSTEM UPDATE: Switch to EV Mode. Current User Coordinates: ${coords.lat}, ${coords.lng}. Re-center context.`;
                        client.send([{ text: message }]);
                    })
                    .catch((error) => {
                        if (useUI.getState().activeMode !== 'EV') return;
                        const msg = `SYSTEM UPDATE: Switched to EV Mode. Using last known region.`;
                        client.send([{ text: msg }]);
                    });
            }
        } catch (error) {
            console.error('[EVModeToggle] Error:', error);
            // Fallback?
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ev-mode-toggle">
            <button
                className={`toggle-button ${isEV ? 'ev-active' : 'race-active'} ${isLoading ? 'loading' : ''}`}
                onClick={handleToggle}
                disabled={isLoading}
                aria-label={`Switch to ${isEV ? 'Race' : 'EV'} Mode`}
                title={`Currently in ${activeMode} Mode. Click to switch.`}
            >
                <span className="icon">
                    {isLoading ? '⏳' : (isEV ? '⚡' : '🏎️')}
                </span>
                <span className="label">
                    {isLoading ? 'Switching...' : (isEV ? 'EV Mode' : 'Race Mode')}
                </span>
                <span className="mode-indicator">
                    {isEV ? 'Charging Assistant' : 'Strategy Desk'}
                </span>
            </button>
        </div>
    );
}
