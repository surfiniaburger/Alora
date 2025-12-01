/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StationList from '../../components/ev/StationList';
import { useEVModeStore, EVChargingStation, EVVehicleProfile } from '../../lib/ev-mode-state';

// Mock the useLiveAPIContext hook
vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: () => ({
        client: {
            sendRealtimeText: vi.fn(),
        },
        connected: true,
    }),
}));

describe('StationList', () => {
    const mockProfile: EVVehicleProfile = {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        batteryCapacity: 75,
        currentCharge: 60,
        estimatedRange: 225,
        chargingSpeed: 'DC Fast Charge',
        connectorTypes: ['CCS'],
    };

    const mockStations: EVChargingStation[] = [
        {
            placeId: 'station-1',
            name: 'Station One',
            position: { lat: 34.0, lng: -83.0, altitude: 0 },
            distance: 5,
            availablePorts: 4,
            chargingSpeed: ['DC Fast Charge'],
            amenities: [],
            operatingHours: '24/7',
        },
        {
            placeId: 'station-2',
            name: 'Station Two',
            position: { lat: 34.1, lng: -83.1, altitude: 0 },
            distance: 10,
            availablePorts: 2,
            chargingSpeed: ['Level 2'],
            amenities: [],
            operatingHours: '24/7',
        },
    ];

    beforeEach(() => {
        useEVModeStore.getState().clearEVData();
        useEVModeStore.getState().setVehicleProfile(mockProfile);
    });

    it('should render nothing if no stations found', () => {
        render(<StationList />);
        expect(screen.queryByText('Station One')).not.toBeInTheDocument();
    });

    it('should render list of stations', () => {
        useEVModeStore.getState().setNearbyStations(mockStations);

        render(<StationList />);

        expect(screen.getByText('Station One')).toBeInTheDocument();
        expect(screen.getByText('Station Two')).toBeInTheDocument();
    });

    it('should select a station when clicked', () => {
        useEVModeStore.getState().setNearbyStations(mockStations);

        render(<StationList />);

        fireEvent.click(screen.getByText('Station One'));

        const selectedStation = useEVModeStore.getState().selectedStation;
        expect(selectedStation?.placeId).toBe('station-1');
    });

    it('should show navigate button when selected', () => {
        useEVModeStore.getState().setNearbyStations(mockStations);
        useEVModeStore.getState().selectStation(mockStations[0]);

        render(<StationList />);

        expect(screen.getByText('Navigate')).toBeInTheDocument();
    });
});
