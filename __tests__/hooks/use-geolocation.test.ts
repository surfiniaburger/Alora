/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '../../hooks/use-geolocation';

describe('useGeolocation', () => {
    const mockGeolocation = {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
    };

    beforeEach(() => {
        // @ts-ignore
        global.navigator.geolocation = mockGeolocation;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useGeolocation());

        expect(result.current.location).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should request location successfully', async () => {
        const mockPosition = {
            coords: {
                latitude: 34.1458,
                longitude: -83.8177,
                accuracy: 10,
            },
            timestamp: Date.now(),
        };

        mockGeolocation.getCurrentPosition.mockImplementation((success) => {
            success(mockPosition);
        });

        const { result } = renderHook(() => useGeolocation());

        await act(async () => {
            await result.current.requestLocation();
        });

        expect(result.current.location).toEqual(expect.objectContaining({
            lat: 34.1458,
            lng: -83.8177,
        }));
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should handle location error', async () => {
        const mockError = {
            code: 1,
            message: 'User denied Geolocation',
        };

        mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
            error(mockError);
        });

        const { result } = renderHook(() => useGeolocation());

        await act(async () => {
            await result.current.requestLocation();
        });

        expect(result.current.location).toBeNull();
        expect(result.current.error).toBe('Unable to retrieve your location');
        expect(result.current.loading).toBe(false);
    });

    it('should auto-request location if enabled', () => {
        renderHook(() => useGeolocation(true));
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should not auto-request location if disabled', () => {
        renderHook(() => useGeolocation(false));
        expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
});
