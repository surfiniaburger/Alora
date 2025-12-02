/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveApi } from '../../hooks/use-live-api';
import { useSettings, useLogStore, useMapStore } from '../../lib/state';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { AudioStreamer } from '../../lib/audio-streamer';

// Mock dependencies
vi.mock('../../lib/state', () => ({
    useSettings: vi.fn(),
    useLogStore: {
        getState: vi.fn(),
    },
    useMapStore: {
        getState: vi.fn(),
    },
}));

vi.mock('../../lib/genai-live-client', () => {
    return {
        GenAILiveClient: vi.fn().mockImplementation(function () {
            return {
                connect: vi.fn(),
                disconnect: vi.fn(),
                sendRealtimeText: vi.fn(),
                sendToolResponse: vi.fn(),
                on: vi.fn(),
                off: vi.fn(),
            };
        }),
    };
});

vi.mock('../../lib/audio-streamer', () => {
    return {
        AudioStreamer: vi.fn().mockImplementation(function () {
            return {
                addWorklet: vi.fn().mockResolvedValue(undefined),
                addPCM16: vi.fn(),
                stop: vi.fn(),
            };
        }),
    };
});

vi.mock('../../lib/utils', () => ({
    audioContext: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../lib/tools/tool-registry', () => ({
    getToolRegistry: vi.fn().mockReturnValue({}),
}));

describe('useLiveApi', () => {
    let mockClient: any;
    let mockLogStore: any;
    let mockMapStore: any;

    const defaultProps = {
        apiKey: 'test-api-key',
        map: null,
        placesLib: null,
        routesLib: null,
        elevationLib: null,
        geocoder: null,
        padding: [0, 0, 0, 0] as [number, number, number, number],
    };

    beforeEach(() => {
        vi.clearAllMocks();

        (useSettings as any).mockReturnValue({
            model: 'test-model',
            template: 'test-template',
        });

        (useSettings as any).getState = vi.fn().mockReturnValue({
            template: 'test-template',
        });

        mockLogStore = {
            addTurn: vi.fn(),
            updateLastTurn: vi.fn(),
            clearTurns: vi.fn(),
            setIsAwaitingFunctionResponse: vi.fn(),
            turns: [],
        };
        (useLogStore as any).getState.mockReturnValue(mockLogStore);

        mockMapStore = {
            clearMarkers: vi.fn(),
        };
        (useMapStore as any).getState.mockReturnValue(mockMapStore);
    });

    it('instantiates client with correct config', async () => {
        renderHook(() => useLiveApi(defaultProps));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(GenAILiveClient).toHaveBeenCalledWith('test-api-key', 'test-model');
    });

    it('connects when connect is called', async () => {
        const { result } = renderHook(() => useLiveApi(defaultProps));

        // Wait for init
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Set config first
        act(() => {
            result.current.setConfig({ model: 'test-model' } as any);
        });

        await act(async () => {
            await result.current.connect();
        });

        expect(result.current.client.connect).toHaveBeenCalledWith({ model: 'test-model' });
        expect(mockLogStore.clearTurns).toHaveBeenCalled();
        expect(mockMapStore.clearMarkers).toHaveBeenCalled();
    });

    it('disconnects when disconnect is called', async () => {
        const { result } = renderHook(() => useLiveApi(defaultProps));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        act(() => {
            result.current.disconnect();
        });

        expect(result.current.client.disconnect).toHaveBeenCalled();
        expect(result.current.connected).toBe(false);
    });

    it('handles connection events', async () => {
        const { result } = renderHook(() => useLiveApi(defaultProps));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Get the 'open' handler passed to client.on
        const onOpen = (result.current.client.on as any).mock.calls.find((call: any) => call[0] === 'open')[1];

        act(() => {
            onOpen();
        });

        expect(result.current.connected).toBe(true);
    });

    it('handles setup complete event', async () => {
        const { result } = renderHook(() => useLiveApi(defaultProps));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        const onSetupComplete = (result.current.client.on as any).mock.calls.find((call: any) => call[0] === 'setupcomplete')[1];

        act(() => {
            onSetupComplete();
        });

        expect(result.current.client.sendRealtimeText).toHaveBeenCalledWith('hello');
    });

    it('initializes audio streamer', async () => {
        const { result } = renderHook(() => useLiveApi(defaultProps));

        // Wait for async audio context setup
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(AudioStreamer).toHaveBeenCalled();
        expect(result.current.audioStreamer.current).toBeDefined();
    });
});
