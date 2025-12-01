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
 * EV Mode State Store
 * 
 * Manages:
 * - Mode activation state
 * - User's vehicle profile
 * - Nearby charging stations
 * - Selected station for navigation
 * - Route visualization data
 */
export const useEVModeStore = create<{
    // State
    isEVModeActive: boolean;
    vehicleProfile: EVVehicleProfile | null;
    nearbyStations: EVChargingStation[];
    selectedStation: EVChargingStation | null;
    routeToStation: google.maps.LatLngAltitudeLiteral[] | null;

    // Actions
    toggleEVMode: () => void;
    setVehicleProfile: (profile: EVVehicleProfile) => void;
    setNearbyStations: (stations: EVChargingStation[]) => void;
    selectStation: (station: EVChargingStation | null) => void;
    setRouteToStation: (route: google.maps.LatLngAltitudeLiteral[] | null) => void;
    clearEVData: () => void;
}>((set) => ({
    // Initial State
    isEVModeActive: false,
    vehicleProfile: null,
    nearbyStations: [],
    selectedStation: null,
    routeToStation: null,

    // Toggle EV Mode on/off
    toggleEVMode: () => set((state) => ({
        isEVModeActive: !state.isEVModeActive
    })),

    // Store user's vehicle profile
    setVehicleProfile: (profile) => set({ vehicleProfile: profile }),

    // Update the list of nearby charging stations
    setNearbyStations: (stations) => set({ nearbyStations: stations }),

    // Select a specific station for detailed view/navigation
    selectStation: (station) => set({ selectedStation: station }),

    // Store the calculated route to a station
    setRouteToStation: (route) => set({ routeToStation: route }),

    // Clear all EV-related data (useful when switching back to race mode)
    clearEVData: () => set({
        nearbyStations: [],
        selectedStation: null,
        routeToStation: null,
    }),
}));
