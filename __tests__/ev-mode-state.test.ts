/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for EV Mode State Management
 * 
 * Tests verify:
 * - State isolation from race telemetry
 * - Mode toggling behavior
 * - Vehicle profile management
 * - Station list management
 * - Station selection
 * - Route management
 * - Data clearing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEVModeStore, EVVehicleProfile, EVChargingStation } from '../lib/ev-mode-state';

describe('EV Mode State Management', () => {
    beforeEach(() => {
        // Reset state before each test
        const { result } = renderHook(() => useEVModeStore());
        act(() => {
            result.current.clearEVData();
            result.current.clearEVData();
        });
    });

    // Mode Toggling tests removed as logic moved to useUI in lib/state.ts

    describe('Vehicle Profile Management', () => {
        it('should start with null vehicle profile', () => {
            const { result } = renderHook(() => useEVModeStore());
            expect(result.current.vehicleProfile).toBeNull();
        });

        it('should store vehicle profile', () => {
            const { result } = renderHook(() => useEVModeStore());

            const profile: EVVehicleProfile = {
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 60,
                estimatedRange: 225,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS', 'Tesla'],
            };

            act(() => {
                result.current.setVehicleProfile(profile);
            });

            expect(result.current.vehicleProfile).toEqual(profile);
        });

        it('should update vehicle profile', () => {
            const { result } = renderHook(() => useEVModeStore());

            const profile1: EVVehicleProfile = {
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 60,
                estimatedRange: 225,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS', 'Tesla'],
            };

            const profile2: EVVehicleProfile = {
                ...profile1,
                currentCharge: 80,
                estimatedRange: 300,
            };

            act(() => {
                result.current.setVehicleProfile(profile1);
                result.current.setVehicleProfile(profile2);
            });

            expect(result.current.vehicleProfile?.currentCharge).toBe(80);
            expect(result.current.vehicleProfile?.estimatedRange).toBe(300);
        });
    });

    describe('Nearby Stations Management', () => {
        it('should start with empty stations array', () => {
            const { result } = renderHook(() => useEVModeStore());
            expect(result.current.nearbyStations).toEqual([]);
        });

        it('should store nearby stations', () => {
            const { result } = renderHook(() => useEVModeStore());

            const stations: EVChargingStation[] = [
                {
                    placeId: 'test-station-1',
                    name: 'ChargePoint Station',
                    position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
                    distance: 2.5,
                    availablePorts: 4,
                    chargingSpeed: ['DC Fast Charge', 'Level 2'],
                    pricing: '$$',
                    amenities: ['WiFi', 'Restroom'],
                    operatingHours: '24/7',
                    rating: 4.5,
                },
                {
                    placeId: 'test-station-2',
                    name: 'Tesla Supercharger',
                    position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                    distance: 3.2,
                    availablePorts: 8,
                    chargingSpeed: ['DC Fast Charge'],
                    amenities: ['WiFi'],
                    operatingHours: '24/7',
                    rating: 4.8,
                },
            ];

            act(() => {
                result.current.setNearbyStations(stations);
            });

            expect(result.current.nearbyStations).toHaveLength(2);
            expect(result.current.nearbyStations[0].name).toBe('ChargePoint Station');
            expect(result.current.nearbyStations[1].name).toBe('Tesla Supercharger');
        });

        it('should replace stations list when updated', () => {
            const { result } = renderHook(() => useEVModeStore());

            const stations1: EVChargingStation[] = [
                {
                    placeId: 'test-1',
                    name: 'Station 1',
                    position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
                    distance: 2.5,
                    availablePorts: 4,
                    chargingSpeed: ['Level 2'],
                    amenities: [],
                    operatingHours: '24/7',
                },
            ];

            const stations2: EVChargingStation[] = [
                {
                    placeId: 'test-2',
                    name: 'Station 2',
                    position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                    distance: 1.5,
                    availablePorts: 2,
                    chargingSpeed: ['DC Fast Charge'],
                    amenities: ['WiFi'],
                    operatingHours: '6am-10pm',
                },
            ];

            act(() => {
                result.current.setNearbyStations(stations1);
                result.current.setNearbyStations(stations2);
            });

            expect(result.current.nearbyStations).toHaveLength(1);
            expect(result.current.nearbyStations[0].name).toBe('Station 2');
        });
    });

    describe('Station Selection', () => {
        it('should start with no selected station', () => {
            const { result } = renderHook(() => useEVModeStore());
            expect(result.current.selectedStation).toBeNull();
        });

        it('should select a station', () => {
            const { result } = renderHook(() => useEVModeStore());

            const station: EVChargingStation = {
                placeId: 'test-station',
                name: 'Test Station',
                position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
                distance: 2.5,
                availablePorts: 4,
                chargingSpeed: ['DC Fast Charge'],
                amenities: ['WiFi'],
                operatingHours: '24/7',
                rating: 4.5,
            };

            act(() => {
                result.current.selectStation(station);
            });

            expect(result.current.selectedStation).toEqual(station);
        });

        it('should deselect a station', () => {
            const { result } = renderHook(() => useEVModeStore());

            const station: EVChargingStation = {
                placeId: 'test-station',
                name: 'Test Station',
                position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
                distance: 2.5,
                availablePorts: 4,
                chargingSpeed: ['DC Fast Charge'],
                amenities: [],
                operatingHours: '24/7',
            };

            act(() => {
                result.current.selectStation(station);
                result.current.selectStation(null);
            });

            expect(result.current.selectedStation).toBeNull();
        });
    });

    describe('Route Management', () => {
        it('should start with no route', () => {
            const { result } = renderHook(() => useEVModeStore());
            expect(result.current.routeToStation).toBeNull();
        });

        it('should store route to station', () => {
            const { result } = renderHook(() => useEVModeStore());

            const route: google.maps.LatLngAltitudeLiteral[] = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1470, lng: -83.8190, altitude: 0 },
                { lat: 34.1500, lng: -83.8200, altitude: 0 },
            ];

            act(() => {
                result.current.setRouteToStation(route);
            });

            expect(result.current.routeToStation).toHaveLength(3);
            expect(result.current.routeToStation).toEqual(route);
        });

        it('should clear route', () => {
            const { result } = renderHook(() => useEVModeStore());

            const route: google.maps.LatLngAltitudeLiteral[] = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
            ];

            act(() => {
                result.current.setRouteToStation(route);
                result.current.setRouteToStation(null);
            });

            expect(result.current.routeToStation).toBeNull();
        });
    });

    describe('Data Clearing', () => {
        it('should clear all EV data', () => {
            const { result } = renderHook(() => useEVModeStore());

            const profile: EVVehicleProfile = {
                make: 'Rivian',
                model: 'R1T',
                year: 2024,
                batteryCapacity: 135,
                currentCharge: 80,
                estimatedRange: 400,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            };

            const stations: EVChargingStation[] = [
                {
                    placeId: 'test-1',
                    name: 'Station 1',
                    position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
                    distance: 2.5,
                    availablePorts: 4,
                    chargingSpeed: ['DC Fast Charge'],
                    amenities: [],
                    operatingHours: '24/7',
                },
            ];

            const route: google.maps.LatLngAltitudeLiteral[] = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
            ];

            act(() => {
                result.current.setVehicleProfile(profile);
                result.current.setNearbyStations(stations);
                result.current.selectStation(stations[0]);
                result.current.setRouteToStation(route);
                result.current.clearEVData();
            });

            // Vehicle profile SHOULD be cleared
            expect(result.current.vehicleProfile).toBeNull();

            // But stations, selection, and route should be cleared
            expect(result.current.nearbyStations).toEqual([]);
            expect(result.current.selectedStation).toBeNull();
            expect(result.current.routeToStation).toBeNull();
        });
    });

    // State Isolation tests removed as toggling logic moved. 
    // New interaction tests should be in integration tests or useUI tests.
});
