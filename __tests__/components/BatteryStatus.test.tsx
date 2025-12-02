/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BatteryStatus from '../../components/ev/BatteryStatus';
import { useEVModeStore } from '../../lib/ev-mode-state';

// Mock dependencies
vi.mock('../../lib/ev-mode-state', () => ({
    useEVModeStore: vi.fn(),
}));

describe('BatteryStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when no vehicle profile is set', () => {
        (useEVModeStore as any).mockReturnValue({
            vehicleProfile: null,
        });

        const { container } = render(<BatteryStatus />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders battery info when vehicle profile exists', () => {
        (useEVModeStore as any).mockReturnValue({
            vehicleProfile: {
                currentCharge: 75,
                estimatedRange: 240,
            },
        });

        render(<BatteryStatus />);

        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('(240 mi)')).toBeInTheDocument();
        expect(screen.getByText('🔋')).toBeInTheDocument();
    });

    it('renders correctly with low battery', () => {
        (useEVModeStore as any).mockReturnValue({
            vehicleProfile: {
                currentCharge: 10,
                estimatedRange: 30,
            },
        });

        render(<BatteryStatus />);

        expect(screen.getByText('10%')).toBeInTheDocument();
        expect(screen.getByText('(30 mi)')).toBeInTheDocument();
    });
});
