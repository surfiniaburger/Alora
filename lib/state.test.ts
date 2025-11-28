/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useMapStore, useTelemetryStore } from './state';

describe('useMapStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useMapStore.setState({
            markers: [],
            cameraTarget: null,
            preventAutoFrame: false,
        });
    });

    it('should update markers and trigger re-render', () => {
        const { setMarkers } = useMapStore.getState();
        const newMarkers = [
            {
                position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                label: 'Test Marker',
                showLabel: true
            }
        ];

        setMarkers(newMarkers);

        expect(useMapStore.getState().markers).toEqual(newMarkers);
    });

    it('should set camera target and clear after use', () => {
        const { setCameraTarget } = useMapStore.getState();
        const target = {
            center: { lat: 34.1458, lng: -83.8177, altitude: 150 },
            range: 1000,
            heading: 0,
            tilt: 45,
            roll: 0
        };

        setCameraTarget(target);
        expect(useMapStore.getState().cameraTarget).toEqual(target);

        // Simulate App component consuming the target
        setCameraTarget(null);
        expect(useMapStore.getState().cameraTarget).toBeNull();
    });

    it('should clear all markers', () => {
        const { setMarkers, clearMarkers } = useMapStore.getState();

        setMarkers([
            { position: { lat: 34.1458, lng: -83.8177, altitude: 0 }, label: 'Test', showLabel: true }
        ]);

        expect(useMapStore.getState().markers).toHaveLength(1);

        clearMarkers();
        expect(useMapStore.getState().markers).toHaveLength(0);
    });

    it('should set and unset preventAutoFrame flag', () => {
        const { setPreventAutoFrame } = useMapStore.getState();

        expect(useMapStore.getState().preventAutoFrame).toBe(false);

        setPreventAutoFrame(true);
        expect(useMapStore.getState().preventAutoFrame).toBe(true);

        setPreventAutoFrame(false);
        expect(useMapStore.getState().preventAutoFrame).toBe(false);
    });
});

describe('useTelemetryStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useTelemetryStore.setState({
            data: {
                speed: 0,
                rpm: 0,
                gear: 1,
                tireHealth: 100,
                fuelLevel: 100,
                lapDelta: 0,
                trackTemp: 38,
            }
        });
    });

    it('should update telemetry data partially', () => {
        const { updateTelemetry } = useTelemetryStore.getState();

        updateTelemetry({ speed: 120, rpm: 7500 });

        const data = useTelemetryStore.getState().data;
        expect(data.speed).toBe(120);
        expect(data.rpm).toBe(7500);
        // Other fields should remain unchanged
        expect(data.gear).toBe(1);
        expect(data.tireHealth).toBe(100);
    });

    it('should update car and ghost positions', () => {
        const { updateTelemetry } = useTelemetryStore.getState();

        const carPosition = { lat: 34.1458, lng: -83.8177, altitude: 0 };
        const ghostPosition = { lat: 34.1460, lng: -83.8180, altitude: 0 };

        updateTelemetry({
            carPosition,
            ghostPosition,
            carHeading: 90,
            ghostHeading: 85
        });

        const data = useTelemetryStore.getState().data;
        expect(data.carPosition).toEqual(carPosition);
        expect(data.ghostPosition).toEqual(ghostPosition);
        expect(data.carHeading).toBe(90);
        expect(data.ghostHeading).toBe(85);
    });

    it('should update track path', () => {
        const { updateTelemetry } = useTelemetryStore.getState();

        const trackPath = [
            { lat: 34.1458, lng: -83.8177, altitude: 0 },
            { lat: 34.1460, lng: -83.8180, altitude: 0 },
            { lat: 34.1462, lng: -83.8183, altitude: 0 },
        ];

        updateTelemetry({ trackPath });

        const data = useTelemetryStore.getState().data;
        expect(data.trackPath).toEqual(trackPath);
        expect(data.trackPath).toHaveLength(3);
    });
});
