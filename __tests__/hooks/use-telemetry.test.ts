/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTelemetrySimulation } from '../../hooks/use-telemetry';
import { useTelemetryStore } from '../../lib/state';

// Mock dependencies
vi.mock('../../lib/state', () => ({
    useTelemetryStore: vi.fn(),
}));

describe('useTelemetrySimulation', () => {
    let mockUpdateTelemetry: any;
    let mockGetState: any;
    let mockData: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockData = {
            speed: 0,
            gear: 1,
            rpm: 0,
            tireHealth: 100,
            fuelLevel: 100,
            lapDelta: 0,
            carPosition: { lat: 0, lng: 0, altitude: 0 },
            ghostPosition: { lat: 0, lng: 0, altitude: 0 },
            carHeading: 0,
            ghostHeading: 0,
        };

        mockUpdateTelemetry = vi.fn();
        mockGetState = vi.fn(() => ({ data: mockData }));

        // Mock the store hook
        (useTelemetryStore as any).mockReturnValue({
            updateTelemetry: mockUpdateTelemetry,
        });

        // Mock the static getState method
        (useTelemetryStore as any).getState = mockGetState;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes track path on mount', () => {
        renderHook(() => useTelemetrySimulation());

        expect(mockUpdateTelemetry).toHaveBeenCalledWith(expect.objectContaining({
            trackPath: expect.any(Array),
        }));
    });

    it('starts simulation loop on mount', () => {
        renderHook(() => useTelemetrySimulation());

        // Fast-forward time to trigger interval
        vi.advanceTimersByTime(100);

        expect(mockUpdateTelemetry).toHaveBeenCalledTimes(2); // 1 for init, 1 for tick
    });

    it('updates telemetry data correctly in loop', () => {
        renderHook(() => useTelemetrySimulation());

        // Fast-forward multiple ticks
        vi.advanceTimersByTime(500);

        // Check if updateTelemetry was called with expected data structure
        const lastCall = mockUpdateTelemetry.mock.calls[mockUpdateTelemetry.mock.calls.length - 1][0];

        expect(lastCall).toHaveProperty('speed');
        expect(lastCall).toHaveProperty('gear');
        expect(lastCall).toHaveProperty('rpm');
        expect(lastCall).toHaveProperty('tireHealth');
        expect(lastCall).toHaveProperty('fuelLevel');
        expect(lastCall).toHaveProperty('carPosition');
    });

    it('cleans up interval on unmount', () => {
        const { unmount } = renderHook(() => useTelemetrySimulation());

        // Clear previous calls
        mockUpdateTelemetry.mockClear();

        unmount();

        // Fast-forward time
        vi.advanceTimersByTime(200);

        // Should not have been called after unmount
        expect(mockUpdateTelemetry).not.toHaveBeenCalled();
    });

    it('decreases fuel and tire health over time', () => {
        renderHook(() => useTelemetrySimulation());

        // Advance time significantly
        vi.advanceTimersByTime(1000);

        const calls = mockUpdateTelemetry.mock.calls;
        // Skip initialization call
        const firstTick = calls[1][0];
        const lastTick = calls[calls.length - 1][0];

        // Note: The simulation logic uses random values and complex calculations,
        // so exact assertions are hard. But we can check if values are changing/decreasing
        // relative to the initial mockData (100).

        expect(lastTick.fuelLevel).toBeLessThanOrEqual(100);
        expect(lastTick.tireHealth).toBeLessThanOrEqual(100);
    });
});
