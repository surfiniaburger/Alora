/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Mode State Management
 * 
 * This store manages all state related to the EV Charging Assistant feature.
 * It is completely isolated from the race telemetry state to prevent conflicts
 * when switching between Race Mode and EV Mode.
 */

import { create } from 'zustand';

/**
 * User's electric vehicle profile for personalized recommendations.
 */
export interface EVVehicleProfile {
    make: string;
    model: string;
    year: number;
    batteryCapacity: number; // kWh
    currentCharge: number; // Percentage 0-100
    estimatedRange: number; // Miles
    chargingSpeed: 'Level 1' | 'Level 2' | 'DC Fast Charge';
    connectorTypes: string[]; // ['CCS', 'CHAdeMO', 'Tesla', 'J1772']
}

/**
 * Represents a single EV charging station with all relevant details.
 */
export interface EVChargingStation {
    placeId: string;
    name: string;
    position: {
        lat: number;
        lng: number;
        altitude: number;
    };
    distance: number; // Miles from current location
    availablePorts: number;
    chargingSpeed: string[];
    pricing?: string;
    amenities: string[]; // ['WiFi', 'Restroom', 'Food']
    operatingHours: string;
    rating?: number;
}

/**
 * User's location for charging station searches.
 * Sources: 'gps' (browser geolocation), 'manual' (user-provided city), 'fallback' (race track default)
 */
export interface UserLocation {
    lat: number;
    lng: number;
    source: 'gps' | 'manual' | 'fallback';
    timestamp: number;
    description?: string; // e.g., "San Francisco, CA" or "Current GPS location"
}

/**
 * EV Mode State Store Interface
 */
interface EVModeState {
    // State
    isEVModeActive: boolean;
    vehicleProfile: EVVehicleProfile | null;
    nearbyStations: EVChargingStation[];
    selectedStation: EVChargingStation | null;
    routeToStation: google.maps.LatLngAltitudeLiteral[] | null;
    userLocation: UserLocation | null;
    routePath: google.maps.LatLngAltitudeLiteral[] | null;

    // Actions
    toggleEVMode: () => void;
    setVehicleProfile: (profile: EVVehicleProfile) => void;
    setNearbyStations: (stations: EVChargingStation[]) => void;
    selectStation: (station: EVChargingStation | null) => void;
    setRouteToStation: (route: google.maps.LatLngAltitudeLiteral[] | null) => void;
    setUserLocation: (location: UserLocation | null) => void;
    setRoutePath: (path: google.maps.LatLngAltitudeLiteral[] | null) => void;
    clearRoutePath: () => void;
    clearEVData: () => void;
}

/**
 * EV Mode State Store Implementation
 */
import { persist } from 'zustand/middleware';

export const useEVModeStore = create(
    persist<EVModeState>(
        (set) => ({
            // Initial State
            isEVModeActive: false,
            vehicleProfile: null,
            nearbyStations: [],
            selectedStation: null,
            routeToStation: null,
            userLocation: null,
            routePath: null,

            // Toggle EV Mode on/off
            toggleEVMode: () => set((state) => ({
                isEVModeActive: !state.isEVModeActive
            })),

            // Setters
            setVehicleProfile: (profile) => set({ vehicleProfile: profile }),
            setNearbyStations: (stations) => set({ nearbyStations: stations }),
            selectStation: (station) => set({ selectedStation: station }),
            setRouteToStation: (route) => set({ routeToStation: route }),
            setUserLocation: (location) => {
                console.log('[EV Store] Setting user location:', location);
                set({ userLocation: location });
            },
            setRoutePath: (path) => set({ routePath: path }),
            clearRoutePath: () => set({ routePath: null }),

            // Clear all data
            clearEVData: () => set({
                vehicleProfile: null,
                nearbyStations: [],
                selectedStation: null,
                routeToStation: null,
                userLocation: null,
                routePath: null,
            }),
        }),
        {
            name: 'ev-mode-storage',
            partialize: (state) => ({
                vehicleProfile: state.vehicleProfile,
            } as any),
        }
    )
);
