/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlTray from '../../components/ControlTray';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { useUI, useSettings } from '../../lib/state';

// Mock dependencies
vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: vi.fn(),
}));

vi.mock('../../lib/state', () => ({
    useUI: vi.fn(),
    useSettings: vi.fn(),
}));

// Mock GSAP to avoid animation errors in tests
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        to: vi.fn(),
        killTweensOf: vi.fn(),
    },
}));

describe('ControlTray', () => {
    const mockConnect = vi.fn();
    const mockDisconnect = vi.fn();
    const mockToggleSidebar = vi.fn();
    const mockToggleTelemetryPanel = vi.fn();

    // A base mock context that can be spread and overridden in tests
    const baseMockContext = {
        connected: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        volume: 0,
        audioStreamer: {
            current: {
                gainNode: { gain: { value: 1 } },
                context: { state: 'running', resume: vi.fn().mockResolvedValue(undefined) }
            }
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        (useLiveAPIContext as any).mockReturnValue(baseMockContext);

        (useUI as any).mockReturnValue({
            isSidebarOpen: false,
            toggleSidebar: mockToggleSidebar,
            isTelemetryPanelOpen: false,
            toggleTelemetryPanel: mockToggleTelemetryPanel,
        });

        (useSettings as any).mockReturnValue({
            activateEasterEggMode: vi.fn(),
        });
    });

    it('renders correctly in disconnected state', () => {
        render(<ControlTray />);
        const micButton = screen.getByTitle('Connect & Start');
        expect(micButton).toBeInTheDocument();
        expect(micButton).not.toHaveClass('mic-active');
    });

    it('renders correctly in connected state', () => {
        (useLiveAPIContext as any).mockReturnValue({
            ...baseMockContext,
            connected: true,
        });

        render(<ControlTray />);
        // When connected, the default state is muted, so the title is "Unmute"
        const micButton = screen.getByTitle('Unmute');
        expect(micButton).toBeInTheDocument();
        // The icon will be 'mic_off' if muted.
        expect(screen.getByText('mic_off')).toBeInTheDocument();
    });

    it('toggles connection on mic click', async () => {
        const user = userEvent.setup();
        render(<ControlTray />);
        const micButton = screen.getByTitle('Connect & Start');

        await user.click(micButton);

        expect(mockConnect).toHaveBeenCalled();
    });

    it('opens quick menu on tools button click', async () => {
        const user = userEvent.setup();
        render(<ControlTray />);
        const toolsButton = screen.getByTitle('Tools & Settings');
        expect(toolsButton).toBeInTheDocument();

        await user.click(toolsButton);
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Show Telemetry')).toBeInTheDocument();
    });

    it('toggles text input on keyboard button click', async () => {
        const user = userEvent.setup();
        render(<ControlTray />);
        const keyboardButton = screen.getByTitle('Toggle Text Input');
        expect(keyboardButton).toBeInTheDocument();

        await user.click(keyboardButton);
        // When not connected, placeholder is different
        const input = screen.getByPlaceholderText('Connect to start typing...');
        expect(input).toBeInTheDocument();
    });
});
