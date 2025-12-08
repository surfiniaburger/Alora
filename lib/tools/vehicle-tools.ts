/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolImplementation } from './tool-types';
import { useLogStore, useMapStore } from '@/lib/state';
import { useEVModeStore } from '@/lib/ev-mode-state';

/**
 * Helper function to fetch recalls from NHTSA API.
 * Returns raw data for internal use or tool output.
 */
export async function fetchNHTSARecalls(make: string, model: string, year: number | string) {
    try {
        const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${make}&model=${model}&year=${year}`;
        console.log('[Vehicle Tool] Fetching URL:', url);
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[Vehicle Tool] Error fetching recalls:', error);
        return null; // Return null on failure
    }
}

/**
 * Checks for vehicle recalls using the NHTSA API.
 */
const check_nhtsa_recalls: ToolImplementation = async (args) => {
    let { make, model, year } = args;

    console.log(`[Vehicle Tool] Checking recalls. Args:`, args);

    // Fallback to persisted vehicle profile if arguments are missing
    if (!make || !model || !year) {
        const profile = useEVModeStore.getState().vehicleProfile;
        if (profile) {
            console.log('[Vehicle Tool] Using persisted vehicle profile:', profile);
            make = make || profile.make;
            model = model || profile.model;
            year = year || profile.year;
        }
    }

    if (!make || !model || !year) {
        return 'I need to know the make, model, and year of your vehicle to check for recalls. Please provide them.';
    }

    console.log(`[Vehicle Tool] Querying NHTSA for ${year} ${make} ${model}`);

    const data = await fetchNHTSARecalls(make, model, year);

    if (!data) {
        return 'Failed to check for recalls. Please try again later.';
    }

    console.log('[Vehicle Tool] NHTSA API Response:', data);

    if (data.Count > 0) {
        const recalls = data.results.map((r: any) => ({
            component: r.Component,
            summary: r.Summary,
            consequence: r.Consequence,
            remedy: r.Remedy,
        }));

        // Summarize the first 3 recalls to avoid overwhelming the context
        const summary = recalls.slice(0, 3).map((r: any, i: number) =>
            `Recall ${i + 1}: ${r.component} - ${r.summary}`
        ).join('\n');

        const fullMessage = `Found ${data.Count} recalls for ${year} ${make} ${model}. Here are the top ones:\n${summary}`;

        useLogStore.getState().addTurn({
            role: 'system',
            text: fullMessage,
            isFinal: true
        });

        return fullMessage;
    } else {
        const message = `No recalls found for ${year} ${make} ${model}.`;
        useLogStore.getState().addTurn({
            role: 'system',
            text: message,
            isFinal: true
        });
        return message;
    }
};

/**
 * Camera presets for vehicle inspection views.
 * Values are relative to the car's current position and heading.
 */
const INSPECTION_PRESETS: Record<string, { range: number, tilt: number, headingOffset: number, altitude: number }> = {
    'tires': { range: 4, tilt: 80, headingOffset: 45, altitude: 1 },         // Low angle, close up
    'wheels': { range: 4, tilt: 80, headingOffset: 45, altitude: 1 },        // Alias
    'brakes': { range: 3, tilt: 85, headingOffset: 90, altitude: 0.5 },      // Very close to side
    'hood': { range: 6, tilt: 45, headingOffset: 0, altitude: 2 },           // Front view, looking down
    'engine': { range: 5, tilt: 60, headingOffset: 0, altitude: 2 },         // Engine bay view
    'trunk': { range: 6, tilt: 45, headingOffset: 180, altitude: 2 },        // Rear view
    'interior': { range: 2, tilt: 20, headingOffset: 0, altitude: 1.5 },     // Driver's perspective (approx)
    'cockpit': { range: 2, tilt: 20, headingOffset: 0, altitude: 1.5 },      // Alias
    'overview': { range: 15, tilt: 60, headingOffset: -30, altitude: 5 },    // Standard Establish shot
};

/**
 * Moves the 3D Map camera to "inspect" a specific part of the vehicle.
 */
const inspect_vehicle_component: ToolImplementation = async (args) => {
    const { component } = args;
    const normalizedComponent = component?.toLowerCase() || 'overview';

    console.log(`[Vehicle Tool] Inspecting component: ${normalizedComponent}`);

    const preset = INSPECTION_PRESETS[normalizedComponent] || INSPECTION_PRESETS['overview'];

    // Get current user location to orbit around
    const userLocation = useEVModeStore.getState().userLocation;
    const currentPos = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 34.1458, lng: -83.8177 }; // Default to Road Atlanta

    // Apply camera move
    useMapStore.getState().setCameraTarget({
        center: { ...currentPos, altitude: preset.altitude },
        range: preset.range,
        tilt: preset.tilt,
        heading: preset.headingOffset, // Absolute heading for now (assuming North-up car) or we could add to current bearing
        roll: 0,
    });

    const message = `Adjusting camera to inspect the ${normalizedComponent}.`;

    useLogStore.getState().addTurn({
        role: 'system',
        text: message,
        isFinal: true
    });

    return message;
};

export const vehicleTools: Record<string, ToolImplementation> = {
    check_nhtsa_recalls,
    inspect_vehicle_component,
};
