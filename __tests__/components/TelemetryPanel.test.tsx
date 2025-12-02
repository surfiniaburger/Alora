/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TelemetryPanel from '../../components/telemetry/TelemetryPanel';
import { useTelemetryStore, useUI } from '../../lib/state';

// Mock dependencies
vi.mock('../../lib/state', () => ({
    useTelemetryStore: vi.fn(),
    useUI: vi.fn(),
}));

// Mock GSAP
vi.mock('@gsap/react', () => ({
    useGSAP: vi.fn(),
}));

vi.mock('gsap', () => ({
    default: {
        fromTo: vi.fn(),
    },
}));

describe('TelemetryPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        (useUI as any).mockReturnValue({
            isTelemetryPanelOpen: true,
        });

        (useTelemetryStore as any).mockReturnValue({
            data: {
                speed: 100,
                gear: 4,
                lapDelta: -0.5,
            },
        });
    });

    it('renders telemetry data when open', () => {
        render(<TelemetryPanel />);

        expect(screen.getByText('100')).toBeInTheDocument(); // Speed
        expect(screen.getByText('MPH')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument(); // Gear
        expect(screen.getByText(/-0.50s/)).toBeInTheDocument(); // Delta
    });

    it('formats positive lap delta correctly', () => {
        (useTelemetryStore as any).mockReturnValue({
            data: {
                speed: 100,
                gear: 4,
                lapDelta: 1.25,
            },
        });

        render(<TelemetryPanel />);
        expect(screen.getByText(/\+1.25s/)).toBeInTheDocument();
    });

    it('applies correct color class for delta', () => {
        // Negative delta (faster) -> Green
        const { rerender } = render(<TelemetryPanel />);
        const deltaValue = screen.getByText(/-0.50s/);
        expect(deltaValue).toHaveClass('delta-green');

        // Positive delta (slower) -> Red
        (useTelemetryStore as any).mockReturnValue({
            data: {
                speed: 100,
                gear: 4,
                lapDelta: 1.25,
            },
        });

        rerender(<TelemetryPanel />);
        const positiveDelta = screen.getByText(/\+1.25s/);
        expect(positiveDelta).toHaveClass('delta-red');
    });
});
