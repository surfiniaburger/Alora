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

// Mock dependencies
vi.mock('../../lib/ev-mode-state', () => ({
    useEVModeStore: vi.fn(),
}));

vi.mock('../../lib/state', () => ({
    useTools: vi.fn(),
}));

describe('EVModeToggle', () => {
    const mockToggleEVMode = vi.fn();
    const mockSetTemplate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (useEVModeStore as any).mockReturnValue({
            isEVModeActive: false,
            toggleEVMode: mockToggleEVMode,
        });

        (useTools as any).mockReturnValue({
            setTemplate: mockSetTemplate,
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

    it('toggles mode and switches template on click (Race -> EV)', async () => {
        const user = userEvent.setup();

        // Initial state: Race Mode (isEVModeActive: false)
        // When clicked, it calls toggleEVMode() and then checks isEVModeActive
        // Note: In the component, it checks the *current* value from the hook, 
        // which won't update immediately in this test setup unless we simulate the store update.
        // However, the component logic uses the value *captured in render* for the if/else check inside handleToggle?
        // Actually, looking at the code:
        // const { isEVModeActive, toggleEVMode } = useEVModeStore();
        // ...
        // if (isEVModeActive) { ... } else { ... }
        // So if isEVModeActive is false (Race Mode), it will go to the else block -> setTemplate('ev-assistant')

        render(<EVModeToggle />);

        const button = screen.getByRole('button');
        await user.click(button);

        expect(mockToggleEVMode).toHaveBeenCalled();
        expect(mockSetTemplate).toHaveBeenCalledWith('ev-assistant');
    });

    it('toggles mode and switches template on click (EV -> Race)', async () => {
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
    });
});
