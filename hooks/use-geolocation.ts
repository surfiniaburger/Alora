/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Geolocation Hook for EV Mode
 * 
 * Attempts to get the user's GPS location via the browser Geolocation API
 * or Capacitor Geolocation plugin when running natively.
 * Updates the EV mode store when a location is obtained or when an error occurs.
 */

import { useEffect, useState, useCallback } from 'react';
import { useEVModeStore, UserLocation } from '@/lib/ev-mode-state';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

interface GeolocationResult {
    location: UserLocation | null;
    error: string | null;
    loading: boolean;
    requestLocation: () => void;
}

/**
 * Hook to request and manage user's geolocation.
 * 
 * @param enabled - Whether to actively request location (typically tied to EV mode being active)
 * @returns Object containing location, error state, loading state, and manual request function
 */
export function useGeolocation(enabled: boolean): GeolocationResult {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const setUserLocation = useEVModeStore(state => state.setUserLocation);

    const requestLocation = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Native (Android/iOS)
        if (Capacitor.isNativePlatform()) {
            console.log('[Geolocation] Requesting native location...');
            try {
                const permissionStatus = await Geolocation.checkPermissions();
                if (permissionStatus.location !== 'granted') {
                    const requestStatus = await Geolocation.requestPermissions();
                    if (requestStatus.location !== 'granted') {
                        throw new Error('Location permission denied');
                    }
                }

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                });

                const userLoc: UserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    source: 'gps',
                    timestamp: Date.now(),
                    description: 'Current GPS location',
                };

                console.log('[Geolocation] Native location obtained:', userLoc);
                setLocation(userLoc);
                setUserLocation(userLoc);
                setLoading(false);
            } catch (err: any) {
                console.error('[Geolocation] Native error:', err);
                setError(err.message || 'Unable to retrieve location');
                setLoading(false);
            }
            return;
        }

        // Web Fallback
        if (!navigator.geolocation) {
            const errorMsg = 'Geolocation is not supported by your browser';
            console.log('[Geolocation] Not supported');
            setError(errorMsg);
            setLoading(false);
            return;
        }

        console.log('[Geolocation] Requesting web location...');
        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                const userLoc: UserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    source: 'gps',
                    timestamp: Date.now(),
                    description: 'Current GPS location',
                };

                console.log('[Geolocation] Web location obtained:', userLoc);
                setLocation(userLoc);
                setUserLocation(userLoc);
                setLoading(false);
            },
            // Error callback
            (err) => {
                let errorMsg = 'Unable to retrieve your location';

                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied';
                        console.log('[Geolocation] Permission denied');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMsg = 'Location information unavailable';
                        console.log('[Geolocation] Position unavailable');
                        break;
                    case err.TIMEOUT:
                        errorMsg = 'Location request timed out';
                        console.log('[Geolocation] Timeout');
                        break;
                }

                console.error('[Geolocation] Error:', err.message);
                setError(errorMsg);
                setLoading(false);
            },
            // Options
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 60000, // Cache for 1 minute
            }
        );
    }, [setUserLocation]);

    // Auto-request location when enabled
    useEffect(() => {
        if (enabled && !location && !error) {
            requestLocation();
        }
    }, [enabled, location, error, requestLocation]);

    return {
        location,
        error,
        loading,
        requestLocation,
    };
}
