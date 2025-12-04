/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EVModeToggle from '../../components/EVModeToggle';
import { useEVModeStore } from '../../lib/ev-mode-state';
import { useTools } from '../../lib/state';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

// Mock dependencies
vi.mock('../../lib/ev-mode-state', () => ({
    useEVModeStore: vi.fn(),
}));

vi.mock('../../lib/state', () => ({
    useTools: vi.fn(),
}));

vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: vi.fn(),
}));

describe('EVModeToggle', () => {
    const mockToggleEVMode = vi.fn();
    const mockSetTemplate = vi.fn();
    const mockClientSend = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (useEVModeStore as any).mockReturnValue({
            isEVModeActive: false,
            toggleEVMode: mockToggleEVMode,
        });

        (useTools as any).mockReturnValue({
            setTemplate: mockSetTemplate,
        });

        (useLiveAPIContext as any).mockReturnValue({
            client: { send: mockClientSend },
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
        (useEVModeStore as any).mockReturnValue({
            isEVModeActive: true,
            toggleEVMode: mockToggleEVMode,
        });

        render(<EVModeToggle />);

        expect(screen.getByText('EV Mode')).toBeInTheDocument();
        expect(screen.getByText('Charging Assistant')).toBeInTheDocument();
        expect(screen.getByText('⚡')).toBeInTheDocument();

        const button = screen.getByRole('button');
        expect(button).toHaveClass('ev-active');
        expect(button).toHaveAttribute('aria-label', 'Switch to Race Mode');
    });

    it('toggles mode, switches template, and sends AI message (Race -> EV)', async () => {
        const user = userEvent.setup();

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        expect(mockToggleEVMode).toHaveBeenCalled();
        expect(mockSetTemplate).toHaveBeenCalledWith('ev-assistant');
        expect(mockClientSend).toHaveBeenCalledWith([{
            text: expect.stringContaining("Switch persona to 'EV Assistant'")
        }]);
    });

    it('toggles mode, switches template, and sends AI message (EV -> Race)', async () => {
        const user = userEvent.setup();

        (useEVModeStore as any).mockReturnValue({
            isEVModeActive: true,
            toggleEVMode: mockToggleEVMode,
        });

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        expect(mockToggleEVMode).toHaveBeenCalled();
        expect(mockSetTemplate).toHaveBeenCalledWith('race-strategy');
        expect(mockClientSend).toHaveBeenCalledWith([{
            text: expect.stringContaining("Switch persona to 'Chief Strategist'")
        }]);
    });
});
