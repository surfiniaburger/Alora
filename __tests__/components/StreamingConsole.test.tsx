/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import StreamingConsole from '../../components/streaming-console/StreamingConsole';
import { useLogStore, useSettings, useTools, useUI } from '../../lib/state';
import { useEVModeStore } from '../../lib/ev-mode-state';

// Mock dependencies
vi.mock('../../lib/state', () => ({
    useLogStore: vi.fn(),
    useSettings: vi.fn(),
    useTools: vi.fn(),
    useUI: vi.fn(),
}));

vi.mock('../../lib/ev-mode-state', () => ({
    useEVModeStore: vi.fn(),
}));

// Mock GSAP
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        fromTo: vi.fn(),
        to: vi.fn(),
    },
}));

// Mock child components to simplify testing
vi.mock('../../components/ev/StationList', () => ({
    default: () => <div data-testid="station-list">Station List</div>,
}));

vi.mock('../../components/ev/BatteryStatus', () => ({
    default: () => <div data-testid="battery-status">Battery Status</div>,
}));

import { LiveAPIProvider } from '../../contexts/LiveAPIContext';
import React from 'react';

const mockClient = {
    on: vi.fn(),
    off: vi.fn(),
};

const mockContextValue = {
    client: mockClient,
    setConfig: vi.fn(),
    heldGroundingChunks: null,
    clearHeldGroundingChunks: vi.fn(),
    heldGroundedResponse: null,
    clearHeldGroundedResponse: vi.fn(),
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    volume: 0,
    setVolume: vi.fn(),
    isMuted: false,
    toggleMute: vi.fn(),
    isSpeaking: false,
    isThinking: false,
};

const renderWithProvider = (ui: React.ReactElement) => {
    return render(
        <LiveAPIProvider value={mockContextValue}>
            {ui}
        </LiveAPIProvider>
    );
};

import { create } from 'zustand';

describe('StreamingConsole', async () => {
    const mockLogStore = create((set) => ({
        turns: [],
        isAwaitingFunctionResponse: false,
        addTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
        updateLastTurn: vi.fn(),
        mergeIntoLastAgentTurn: vi.fn(),
    }));

    beforeEach(() => {
        vi.clearAllMocks();
        mockLogStore.setState({ turns: [], isAwaitingFunctionResponse: false });

        // Mock the hook to return the store state
        (useLogStore as any).mockImplementation(mockLogStore);

        // CRITICAL: Expose getState method for direct store access
        // The component calls useLogStore.getState() in useEffect
        Object.assign(useLogStore, {
            getState: mockLogStore.getState.bind(mockLogStore)
        });

        (useSettings as any).mockReturnValue({
            systemPrompt: '',
            voice: '',
        });
        (useTools as any).mockReturnValue({
            tools: [],
        });
        (useUI as any).mockReturnValue({
            showSystemMessages: true,
        });
        (useEVModeStore as any).mockReturnValue({
            isEVModeActive: false,
        });
    });

    it('renders nothing when there are no logs', () => {
        const { container } = renderWithProvider(<StreamingConsole />);
        expect(container.firstChild.hasChildNodes()).toBe(false);
    });

    it('renders the latest user message', async () => {
        renderWithProvider(<StreamingConsole />);
        act(() => {
            mockLogStore.getState().addTurn({ role: 'user', text: 'Hello Alora', isFinal: true });
        });
        const message = await screen.findByText('Hello Alora');
        expect(message).toBeInTheDocument();
    });

    it('renders the latest agent message', async () => {
        renderWithProvider(<StreamingConsole />);
        act(() => {
            mockLogStore.getState().addTurn({ role: 'user', text: 'Hello', isFinal: true });
            mockLogStore.getState().addTurn({ role: 'agent', text: 'Hi there!', isFinal: true });
        });
        const message = await screen.findByText('Hi there!');
        expect(message).toBeInTheDocument();
    });

    it('renders tool outputs correctly', async () => {
        renderWithProvider(<StreamingConsole />);
        act(() => {
            mockLogStore.getState().addTurn({
                role: 'system',
                text: 'Found stations',
                toolUseRequest: { functionCalls: [{ name: 'findEVChargingStations' }] },
                isFinal: true
            });
        });
        const stationList = await screen.findByTestId('station-list');
        expect(stationList).toBeInTheDocument();
    });

    it('renders processing state for non-final messages', async () => {
        mockLogStore.setState({ isAwaitingFunctionResponse: true });
        renderWithProvider(<StreamingConsole />);
        const processing = await screen.findByText('Processing...');
        expect(processing).toBeInTheDocument();
    });
});
