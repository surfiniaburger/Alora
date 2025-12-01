/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for EV Tool Registry
 * 
 * Tests verify:
 * - Vehicle profile storage
 * - Charging station search logic
 * - Distance calculations
 * - Route navigation
 * - Charging time estimates
 * - Helper function accuracy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evToolRegistry } from '../lib/tools/ev-tool-registry';
import { useEVModeStore } from '../lib/ev-mode-state';
import { ToolContext } from '../lib/tools/tool-registry';

// Mock the stores
vi.mock('../lib/state', () => ({
    useLogStore: {
        getState: () => ({
            addTurn: vi.fn(),
        }),
    },
    useMapStore: {
        getState: () => ({
            setMarkers: vi.fn(),
            setPreventAutoFrame: vi.fn(),
            setCameraTarget: vi.fn(),
        }),
    },
}));

vi.mock('../lib/maps-grounding', () => ({
    fetchMapsGroundedResponseREST: vi.fn(),
}));

describe('EV Tool Registry', () => {
    let mockContext: ToolContext;

    beforeEach(() => {
        // Reset EV store
        useEVModeStore.getState().clearEVData();
        if (useEVModeStore.getState().vehicleProfile) {
            useEVModeStore.setState({ vehicleProfile: null });
        }

        // Create mock context
        mockContext = {
            map: {
                center: { lat: 34.1458, lng: -83.8177 },
            } as any,
            placesLib: null,
            elevationLib: null,
            geocoder: null,
            padding: [0, 0, 0, 0],
            setHeldGroundedResponse: vi.fn(),
            setHeldGroundingChunks: vi.fn(),
        };
    });

    describe('setEVVehicleProfile', () => {
        it('should store vehicle profile', async () => {
            const args = {
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 60,
                estimatedRange: 225,
                connectorTypes: ['CCS', 'Tesla'],
            };

            const result = await evToolRegistry.setEVVehicleProfile(args, mockContext);

            expect(result).toContain('Tesla');
            expect(result).toContain('Model 3');
            expect(result).toContain('75kWh');

            const profile = useEVModeStore.getState().vehicleProfile;
            expect(profile).not.toBeNull();
            expect(profile?.make).toBe('Tesla');
            expect(profile?.model).toBe('Model 3');
            expect(profile?.batteryCapacity).toBe(75);
            expect(profile?.currentCharge).toBe(60);
        });

        it('should calculate estimated range if not provided', async () => {
            const args = {
                make: 'Rivian',
                model: 'R1T',
                batteryCapacity: 135,
                currentCharge: 80,
                connectorTypes: ['CCS'],
            };

            await evToolRegistry.setEVVehicleProfile(args, mockContext);

            const profile = useEVModeStore.getState().vehicleProfile;
            expect(profile?.estimatedRange).toBe(405); // 135 * 3
        });

        it('should default to current year if not provided', async () => {
            const args = {
                make: 'Nissan',
                model: 'Leaf',
                batteryCapacity: 62,
                currentCharge: 50,
                connectorTypes: ['CHAdeMO'],
            };

            await evToolRegistry.setEVVehicleProfile(args, mockContext);

            const profile = useEVModeStore.getState().vehicleProfile;
            expect(profile?.year).toBe(new Date().getFullYear());
        });
    });

    describe('findEVChargingStations', () => {
        it('should require vehicle profile', async () => {
            const args = {
                searchRadius: 10,
            };

            const result = await evToolRegistry.findEVChargingStations(args, mockContext);

            expect(result).toContain('Please set up your vehicle profile');
        });

        it('should build correct query with all parameters', async () => {
            // Set up vehicle profile first
            useEVModeStore.getState().setVehicleProfile({
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 60,
                estimatedRange: 225,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            });

            const { fetchMapsGroundedResponseREST } = await import('../lib/maps-grounding');
            vi.mocked(fetchMapsGroundedResponseREST).mockResolvedValue({
                candidates: [{
                    groundingMetadata: {
                        groundingChunks: [],
                    },
                }],
            } as any);

            const args = {
                searchRadius: 15,
                chargingSpeed: 'DC Fast Charge',
                connectorType: 'CCS',
                requireAmenities: ['WiFi', 'Restroom'],
            };

            await evToolRegistry.findEVChargingStations(args, mockContext);

            expect(fetchMapsGroundedResponseREST).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.stringContaining('15 miles'),
                    lat: 34.1458,
                    lng: -83.8177,
                })
            );
        });
    });

    describe('showRouteToStation', () => {
        it('should require vehicle profile', async () => {
            const args = {
                stationPlaceId: 'test-123',
            };

            const result = await evToolRegistry.showRouteToStation(args, mockContext);

            expect(result).toContain('Vehicle profile not set');
        });

        it('should calculate battery usage correctly', async () => {
            // Set up vehicle profile
            useEVModeStore.getState().setVehicleProfile({
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 60,
                estimatedRange: 225,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            });

            // Add a nearby station
            const station = {
                placeId: 'test-123',
                name: 'Test Supercharger',
                position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                distance: 15, // 15 miles
                availablePorts: 8,
                chargingSpeed: ['DC Fast Charge'],
                amenities: ['WiFi'],
                operatingHours: '24/7',
                rating: 4.8,
            };

            useEVModeStore.getState().setNearbyStations([station]);

            const args = {
                stationPlaceId: 'test-123',
            };

            const result = await evToolRegistry.showRouteToStation(args, mockContext);

            // 15 miles / 3 mi/kWh = 5 kWh
            // 5 kWh / 75 kWh = 6.67%
            expect(result).toContain('15.0 miles');
            expect(result).toContain('6.7%'); // Battery usage
        });

        it('should warn if station is out of range', async () => {
            // Set up vehicle profile with low charge
            useEVModeStore.getState().setVehicleProfile({
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 10, // Only 10% charge
                estimatedRange: 30,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            });

            // Add a distant station
            const station = {
                placeId: 'test-456',
                name: 'Distant Charger',
                position: { lat: 35.0000, lng: -84.0000, altitude: 1 },
                distance: 50, // 50 miles - too far
                availablePorts: 4,
                chargingSpeed: ['DC Fast Charge'],
                amenities: [],
                operatingHours: '24/7',
            };

            useEVModeStore.getState().setNearbyStations([station]);

            const args = {
                stationPlaceId: 'test-456',
            };

            const result = await evToolRegistry.showRouteToStation(args, mockContext);

            expect(result).toContain('⚠️ Warning');
            expect(result).toContain('may not be sufficient');
        });
    });

    describe('calculateChargingTime', () => {
        it('should calculate time for DC Fast Charge correctly', async () => {
            // Set up vehicle profile
            useEVModeStore.getState().setVehicleProfile({
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 20,
                estimatedRange: 75,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            });

            // Add a DC Fast Charge station
            const station = {
                placeId: 'test-789',
                name: 'Fast Charger',
                position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                distance: 5,
                availablePorts: 4,
                chargingSpeed: ['DC Fast Charge'],
                amenities: [],
                operatingHours: '24/7',
            };

            useEVModeStore.getState().setNearbyStations([station]);

            const args = {
                stationPlaceId: 'test-789',
                targetCharge: 80,
            };

            const result = await evToolRegistry.calculateChargingTime(args, mockContext);

            // 60% charge needed = 45 kWh
            // At 150kW = 0.3 hours = 18 minutes
            expect(result).toContain('minutes');
            expect(result).toContain('45.0 kWh');
        });

        it('should calculate time for Level 2 charging correctly', async () => {
            // Set up vehicle profile
            useEVModeStore.getState().setVehicleProfile({
                make: 'Nissan',
                model: 'Leaf',
                year: 2023,
                batteryCapacity: 62,
                currentCharge: 30,
                estimatedRange: 90,
                chargingSpeed: 'Level 2',
                connectorTypes: ['J1772'],
            });

            // Add a Level 2 station
            const station = {
                placeId: 'test-l2',
                name: 'Level 2 Charger',
                position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                distance: 2,
                availablePorts: 2,
                chargingSpeed: ['Level 2'],
                amenities: [],
                operatingHours: '24/7',
            };

            useEVModeStore.getState().setNearbyStations([station]);

            const args = {
                stationPlaceId: 'test-l2',
                targetCharge: 80,
            };

            const result = await evToolRegistry.calculateChargingTime(args, mockContext);

            // 50% charge needed = 31 kWh
            // At 7.2kW = 4.3 hours
            expect(result).toContain('31.0 kWh');
            expect(result).toMatch(/\d+h \d+min/); // Should show hours and minutes
        });

        it('should handle already charged battery', async () => {
            useEVModeStore.getState().setVehicleProfile({
                make: 'Tesla',
                model: 'Model 3',
                year: 2023,
                batteryCapacity: 75,
                currentCharge: 90,
                estimatedRange: 270,
                chargingSpeed: 'DC Fast Charge',
                connectorTypes: ['CCS'],
            });

            const station = {
                placeId: 'test-full',
                name: 'Charger',
                position: { lat: 34.1500, lng: -83.8200, altitude: 1 },
                distance: 5,
                availablePorts: 4,
                chargingSpeed: ['DC Fast Charge'],
                amenities: [],
                operatingHours: '24/7',
            };

            useEVModeStore.getState().setNearbyStations([station]);

            const args = {
                stationPlaceId: 'test-full',
                targetCharge: 80,
            };

            const result = await evToolRegistry.calculateChargingTime(args, mockContext);

            expect(result).toContain('already at 90%');
        });
    });
});
