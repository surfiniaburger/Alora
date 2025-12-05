/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapController } from './map-controller';

describe('MapController', () => {
    let mockMap: any;
    let mockMaps3dLib: any;
    let mockElevationLib: any;
    let mapController: MapController;
    let createdMarkers: any[];
    let createdPolylines: any[];

    beforeEach(() => {
        createdMarkers = [];
        createdPolylines = [];

        // Mock the Map3DElement
        mockMap = {
            appendChild: vi.fn((element) => {
                // Track created elements
                if (element._isMarker) createdMarkers.push(element);
                if (element._isPolyline) createdPolylines.push(element);
            }),
            removeChild: vi.fn(),
            flyCameraTo: vi.fn(),
            heading: 0,
        };

        // Mock Marker3DInteractiveElement
        class MockMarker {
            _isMarker = true;
            position: any;
            label: any;
            altitudeMode: any;
            remove = vi.fn();
            append = vi.fn();
            querySelector = vi.fn().mockReturnValue(null);
            removeChild = vi.fn();

            constructor(options: any) {
                this.position = options.position;
                this.label = options.label;
                this.altitudeMode = options.altitudeMode;
            }
        }

        // Mock Polyline3DElement
        class MockPolyline {
            _isPolyline = true;
            coordinates: any;
            strokeColor: any;
            strokeWidth: any;
            altitudeMode: any;

            constructor(options: any) {
                this.coordinates = options.coordinates;
                this.strokeColor = options.strokeColor;
                this.strokeWidth = options.strokeWidth;
                this.altitudeMode = options.altitudeMode;
            }
        }

        mockMaps3dLib = {
            Marker3DInteractiveElement: MockMarker,
            Polyline3DElement: MockPolyline,
        };

        mockElevationLib = {
            ElevationService: vi.fn(),
        };

        mapController = new MapController({
            map: mockMap,
            maps3dLib: mockMaps3dLib,
            elevationLib: mockElevationLib,
        });
    });

    describe('addMarkers', () => {
        it('should add markers to the map', () => {
            const markers = [
                {
                    position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                    label: 'Test Marker 1',
                    showLabel: true,
                },
                {
                    position: { lat: 34.1460, lng: -83.8180, altitude: 0 },
                    label: 'Test Marker 2',
                    showLabel: false,
                },
            ];

            mapController.addMarkers(markers);

            expect(mockMap.appendChild).toHaveBeenCalledTimes(2);
            expect(createdMarkers).toHaveLength(2);
            expect(createdMarkers[0].position).toEqual(markers[0].position);
            expect(createdMarkers[1].position).toEqual(markers[1].position);
        });

        it('should respect showLabel flag', () => {
            const markers = [
                {
                    position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                    label: 'Visible Label',
                    showLabel: true,
                },
                {
                    position: { lat: 34.1460, lng: -83.8180, altitude: 0 },
                    label: 'Hidden Label',
                    showLabel: false,
                },
            ];

            mapController.addMarkers(markers);

            expect(createdMarkers[0].label).toBe('Visible Label');
            expect(createdMarkers[1].label).toBeNull();
        });
    });

    describe('clearMap', () => {
        it('should remove all tool markers', () => {
            const markers = [
                {
                    position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                    label: 'Test',
                    showLabel: true,
                },
            ];

            mapController.addMarkers(markers);
            expect(createdMarkers).toHaveLength(1);

            mapController.clearMap();

            expect(createdMarkers[0].remove).toHaveBeenCalled();
        });
    });

    describe('drawTrack', () => {
        it('should create a polyline for the track', () => {
            const trackPath = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1460, lng: -83.8180, altitude: 0 },
                { lat: 34.1462, lng: -83.8183, altitude: 0 },
            ];

            mapController.drawTrack(trackPath);

            expect(createdPolylines).toHaveLength(1);
            expect(createdPolylines[0].coordinates).toEqual(trackPath);
            expect(createdPolylines[0].strokeColor).toBe('#FF0000'); // Updated to High Contrast Red
            expect(createdPolylines[0].strokeWidth).toBe(8); // Updated to 8
        });

        it('should update existing polyline coordinates', () => {
            const initialPath = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1460, lng: -83.8180, altitude: 0 },
            ];

            const updatedPath = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1460, lng: -83.8180, altitude: 0 },
                { lat: 34.1462, lng: -83.8183, altitude: 0 },
            ];

            mapController.drawTrack(initialPath);
            const initialCount = createdPolylines.length;

            mapController.drawTrack(updatedPath);
            const finalCount = createdPolylines.length;

            // Should not create a new polyline, just update coordinates
            expect(finalCount).toBe(initialCount);
            expect(createdPolylines[0].coordinates).toEqual(updatedPath);
        });
    });

    describe('drawRoute', () => {
        it('should create a polyline for the route', () => {
            const routePath = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1460, lng: -83.8180, altitude: 0 },
            ];

            mapController.drawRoute(routePath);

            expect(createdPolylines).toHaveLength(1);
            expect(createdPolylines[0].coordinates).toEqual(routePath);
            expect(createdPolylines[0].strokeColor).toBe('#00FFFF'); // Cyan for EV Mode
            expect(createdPolylines[0].strokeWidth).toBe(8);
        });

        it('should update existing route coordinates', () => {
            const initialPath = [{ lat: 34.1458, lng: -83.8177, altitude: 0 }];
            const updatedPath = [
                { lat: 34.1458, lng: -83.8177, altitude: 0 },
                { lat: 34.1460, lng: -83.8180, altitude: 0 },
            ];

            mapController.drawRoute(initialPath);
            mapController.drawRoute(updatedPath);

            expect(createdPolylines).toHaveLength(1);
            expect(createdPolylines[0].coordinates).toEqual(updatedPath);
        });

        it('should clear the route', () => {
            const routePath = [{ lat: 34.1458, lng: -83.8177, altitude: 0 }];
            mapController.drawRoute(routePath);

            expect(createdPolylines).toHaveLength(1);

            mapController.clearRoute();
            expect(mockMap.removeChild).toHaveBeenCalledWith(createdPolylines[0]);
        });
    });

    describe('flyTo', () => {
        it('should call flyCameraTo with correct parameters', () => {
            const cameraProps = {
                center: { lat: 34.1458, lng: -83.8177, altitude: 150 },
                range: 1000,
                heading: 45,
                tilt: 60,
                roll: 0,
            };

            mapController.flyTo(cameraProps);

            expect(mockMap.flyCameraTo).toHaveBeenCalledWith(
                expect.objectContaining({
                    durationMillis: 5000,
                    endCamera: expect.objectContaining({
                        center: cameraProps.center,
                        range: cameraProps.range,
                        heading: cameraProps.heading,
                        tilt: cameraProps.tilt,
                        roll: cameraProps.roll,
                    }),
                })
            );
        });
    });

    describe('updateRaceCars', () => {
        it('should create car marker on first call', () => {
            const carPos = { lat: 34.1458, lng: -83.8177, altitude: 0 };

            mapController.updateRaceCars(carPos);

            const carMarkers = createdMarkers.filter(m => m.label === 'GR SUPRA');
            expect(carMarkers).toHaveLength(1);
            expect(carMarkers[0].position).toEqual(carPos);
        });

        it('should create ghost marker on first call', () => {
            const ghostPos = { lat: 34.1460, lng: -83.8180, altitude: 0 };

            mapController.updateRaceCars(undefined, ghostPos);

            const ghostMarkers = createdMarkers.filter(m => m.label === 'RIVAL');
            expect(ghostMarkers).toHaveLength(1);
            expect(ghostMarkers[0].position).toEqual(ghostPos);
        });
    });
});
