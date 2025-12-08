/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EVModeToggle from '../../components/EVModeToggle';
import { useEVModeStore } from '../../lib/ev-mode-state';
import { useTools, useUI } from '../../lib/state'; // Import useUI
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

// Mock dependencies
vi.mock('../../lib/ev-mode-state', () => ({
    useEVModeStore: vi.fn(),
}));

const { mockUseUI } = vi.hoisted(() => {
    const fn = vi.fn() as any;
    fn.getState = vi.fn();
    return { mockUseUI: fn };
});

vi.mock('../../lib/state', () => ({
    useTools: vi.fn(),
    useUI: mockUseUI,
}));

vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: vi.fn(),
}));

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: () => false,
    },
}));

vi.mock('@capacitor/geolocation', () => ({
    Geolocation: {
        checkPermissions: vi.fn(),
        requestPermissions: vi.fn(),
        getCurrentPosition: vi.fn(),
    },
}));

describe('EVModeToggle', () => {
    // const mockToggleEVMode = vi.fn(); // Removed from component
    const mockSetTemplate = vi.fn(); // Removed from component
    const mockClientSend = vi.fn();
    const mockSetUserLocation = vi.fn();
    const mockSetMode = vi.fn(); // New centralized action

    let mockStoreState: any; // Shared state for EV Store

    // Mock geolocation
    const mockGeolocation = {
        getCurrentPosition: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Initialize the EV store state
        mockStoreState = {
            isEVModeActive: false,
            // toggleEVMode: mockToggleEVMode, // No longer called directly
            setUserLocation: mockSetUserLocation,
        };

        (useEVModeStore as any).mockReturnValue(mockStoreState);
        (useEVModeStore as any).getState = vi.fn(() => mockStoreState);

        (useTools as any).mockReturnValue({
            setTemplate: mockSetTemplate,
        });

        // Mock useUI hook return (for components)
        mockUseUI.mockReturnValue({
            activeMode: 'RACE',
            setMode: mockSetMode,
        });

        // Mock useUI.getState() (for logic inside callbacks)
        mockUseUI.getState.mockReturnValue({
            activeMode: 'RACE',
            setMode: mockSetMode,
        });


        (useLiveAPIContext as any).mockReturnValue({
            client: { send: mockClientSend },
        });

        // Mock navigator.geolocation for web
        Object.defineProperty(global.navigator, 'geolocation', {
            value: mockGeolocation,
            configurable: true,
            writable: true, // Allow overwriting
        });

        // Default successful geolocation response
        mockGeolocation.getCurrentPosition.mockImplementation((success) => {
            success({
                coords: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                },
            });
        });
    });

    it('renders in Race Mode initially', () => {
        render(<EVModeToggle />);

        expect(screen.getByText('Race Mode')).toBeInTheDocument();
        expect(screen.getByText('Strategy Desk')).toBeInTheDocument();
        expect(screen.getByText('🏎️')).toBeInTheDocument();

        const button = screen.getByRole('button');
        expect(button).toHaveClass('race-active');
        expect(button).toHaveAttribute('aria-label', 'Switch to EV Mode');
    });

    it('renders in EV Mode when active', () => {
        // Mock useUI to return EV mode
        mockUseUI.mockReturnValue({
            activeMode: 'EV',
            setMode: mockSetMode,
        });

        render(<EVModeToggle />);

        expect(screen.getByText('EV Mode')).toBeInTheDocument();
        expect(screen.getByText('Charging Assistant')).toBeInTheDocument();
        expect(screen.getByText('⚡')).toBeInTheDocument();

        const button = screen.getByRole('button');
        expect(button).toHaveClass('ev-active');
        expect(button).toHaveAttribute('aria-label', 'Switch to Race Mode');
    });

    it('fetches location and sends dynamic coordinates when switching to EV Mode', async () => {
        const user = userEvent.setup();

        // We need getState to return EV for the promise chain check
        mockUseUI.getState.mockReturnValue({
            activeMode: 'EV',
            setMode: mockSetMode,
        });

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        // Wait for async operations
        await waitFor(() => {
            expect(mockSetMode).toHaveBeenCalledWith('EV');
            // mockSetTemplate is no longer called directly by the component

            expect(mockSetUserLocation).toHaveBeenCalledWith({
                lat: 40.7128,
                lng: -74.0060,
                source: 'gps',
                timestamp: expect.any(Number),
                description: 'Current GPS location',
            });
            expect(mockClientSend).toHaveBeenCalledWith([{
                text: expect.stringContaining('SYSTEM UPDATE: Switch to EV Mode. Current User Coordinates: 40.7128, -74.006')
            }]);
        });
    });

    it('sends Road Atlanta coordinates when switching to Race Mode', async () => {
        const user = userEvent.setup();

        // Start in EV Mode
        mockUseUI.mockReturnValue({
            activeMode: 'EV',
            setMode: mockSetMode,
        });

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        await waitFor(() => {
            expect(mockSetMode).toHaveBeenCalledWith('RACE');
            expect(mockClientSend).toHaveBeenCalledWith([{
                text: expect.stringContaining('Road Atlanta Track (34.1458, -83.8177)')
            }]);
        });
    });

    it('sends fallback message when location fetch fails', async () => {
        const user = userEvent.setup();

        // We need getState to return EV for the promise chain check
        mockUseUI.getState.mockReturnValue({
            activeMode: 'EV',
            setMode: mockSetMode,
        });

        // Mock geolocation failure
        mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
            error({
                code: 1,
                message: 'User denied geolocation',
            });
        });

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        // Wait for async operations
        await waitFor(() => {
            expect(mockSetMode).toHaveBeenCalledWith('EV');
            expect(mockClientSend).toHaveBeenCalledWith([{
                text: 'SYSTEM UPDATE: Switched to EV Mode. Using last known region.'
            }]);
        });

        // Verify setUserLocation was NOT called (no coords available)
        expect(mockSetUserLocation).not.toHaveBeenCalled();
    });
});
