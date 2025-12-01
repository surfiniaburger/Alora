/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StationCard from '../../components/ev/StationCard';
import { EVChargingStation, EVVehicleProfile } from '../../lib/ev-mode-state';
import { MILES_PER_KWH_ESTIMATE } from '../../lib/constants';

describe('StationCard', () => {
    const mockStation: EVChargingStation = {
        placeId: 'test-station',
        name: 'Test Station',
        position: { lat: 34.1458, lng: -83.8177, altitude: 1 },
        distance: 15,
        availablePorts: 4,
        chargingSpeed: ['DC Fast Charge'],
        amenities: ['WiFi'],
        operatingHours: '24/7',
        rating: 4.5,
        pricing: '$$',
    };

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

    const mockOnSelect = vi.fn();
    const mockOnNavigate = vi.fn();

    it('should render station details correctly', () => {
        render(
            <StationCard
                station={mockStation}
                vehicleProfile={mockProfile}
                isSelected={false}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        expect(screen.getByText('Test Station')).toBeInTheDocument();
        expect(screen.getByText('15.0')).toBeInTheDocument(); // Distance
        expect(screen.getByText('mi')).toBeInTheDocument();
        expect(screen.getByText('DC Fast Charge')).toBeInTheDocument();
        expect(screen.getByText('4 available')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument(); // Rating
        expect(screen.getByText('$$')).toBeInTheDocument(); // Pricing
        expect(screen.getByText('WiFi')).toBeInTheDocument(); // Amenity
    });

    it('should calculate and display battery usage', () => {
        render(
            <StationCard
                station={mockStation}
                vehicleProfile={mockProfile}
                isSelected={false}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        // 15 miles / MILES_PER_KWH_ESTIMATE = kWh
        const expectedKWh = 15 / MILES_PER_KWH_ESTIMATE;
        const expectedPercent = (expectedKWh / 75) * 100;

        expect(screen.getByText(`~${expectedPercent.toFixed(1)}%`)).toBeInTheDocument();
    });

    it('should show low range warning if unreachable', () => {
        const lowChargeProfile = { ...mockProfile, currentCharge: 5 }; // 5% charge

        render(
            <StationCard
                station={mockStation}
                vehicleProfile={lowChargeProfile}
                isSelected={false}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        expect(screen.getByText('⚠️ Low Range')).toBeInTheDocument();
    });

    it('should call onSelect when clicked', () => {
        render(
            <StationCard
                station={mockStation}
                vehicleProfile={mockProfile}
                isSelected={false}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        fireEvent.click(screen.getByText('Test Station'));
        expect(mockOnSelect).toHaveBeenCalledWith(mockStation);
    });

    it('should show actions when selected', () => {
        render(
            <StationCard
                station={mockStation}
                vehicleProfile={mockProfile}
                isSelected={true}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        expect(screen.getByText('Navigate')).toBeInTheDocument();
        expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('should call onNavigate when navigate button is clicked', () => {
        render(
            <StationCard
                station={mockStation}
                vehicleProfile={mockProfile}
                isSelected={true}
                onSelect={mockOnSelect}
                onNavigate={mockOnNavigate}
            />
        );

        fireEvent.click(screen.getByText('Navigate'));
        expect(mockOnNavigate).toHaveBeenCalledWith(mockStation);
    });
});
