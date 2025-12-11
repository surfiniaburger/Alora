
import { describe, it, expect } from 'vitest';
import { toolRegistry, getToolRegistry } from '@/lib/tools/tool-registry';

describe('Unified Tool Registry', () => {
    it('should contain tools from all domains', () => {
        // Check for common/race tools
        expect(toolRegistry).toHaveProperty('getLiveTelemetry');
        expect(toolRegistry).toHaveProperty('frameEstablishingShot');

        // Check for EV tools
        expect(toolRegistry).toHaveProperty('findEVChargingStations');

        // Check for new UI tools
        expect(toolRegistry).toHaveProperty('setAppMode');
    });

    it('should return the same registry regardless of template argument (legacy compatibility)', () => {
        const raceRegistry = getToolRegistry('race-strategy');
        const evRegistry = getToolRegistry('ev-assistant');

        expect(raceRegistry).toEqual(toolRegistry);
        expect(evRegistry).toEqual(toolRegistry);

        // Verification that they are indeed the exact same reference
        expect(raceRegistry).toBe(evRegistry);
    });
});
