/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Tool Registry - Implementation
 * 
 * This module implements the actual execution logic for EV Assistant tools.
 * It integrates with Google Maps Places API and Grounding to provide real-time
 * charging station data, route calculation, and intelligent recommendations.
 * 
 * Architecture follows the pattern from place.md:
 * 1. Tool receives arguments from Gemini
 * 2. Tool calls Google Maps APIs (Grounding, Places, Geocoding)
 * 3. Tool hydrates data (converts Place IDs to coordinates)
 * 4. Tool updates Zustand stores (useEVModeStore, useMapStore)
 * 5. React components react to state changes
 * 6. MapController updates 3D map visualization
 */

import { GenerateContentResponse, GroundingChunk } from '@google/genai';
import { fetchMapsGroundedResponseREST } from '@/lib/maps-grounding';
import { MapMarker, useLogStore, useMapStore } from '@/lib/state';
import { useEVModeStore, EVVehicleProfile, EVChargingStation } from '@/lib/ev-mode-state';
import { ToolImplementation, ToolContext } from './tool-types';
import { mapsGrounding } from './maps-grounding-tool';

/**
 * TOOL 1: setEVVehicleProfile
 * 
 * Stores the user's electric vehicle information for personalized recommendations.
 * This data is used throughout the EV Assistant for:
 * - Filtering stations by connector compatibility
 * - Calculating accurate range and battery usage
 * - Providing personalized charging time estimates
 * - Managing range anxiety with proactive alerts
 */
const setEVVehicleProfile: ToolImplementation = async (args, context) => {
    console.log('[EV Tool] setEVVehicleProfile called with args:', JSON.stringify(args, null, 2));

    try {
        // Normalize connectorTypes to array (AI sometimes passes string instead of array)
        let connectorTypes = args.connectorTypes;
        console.log('[EV Tool] Raw connectorTypes:', connectorTypes, 'Type:', typeof connectorTypes);

        if (typeof connectorTypes === 'string') {
            connectorTypes = [connectorTypes];
            console.log('[EV Tool] Normalized string to array:', connectorTypes);
        } else if (!Array.isArray(connectorTypes)) {
            connectorTypes = ['CCS']; // Default fallback
            console.log('[EV Tool] Using default fallback:', connectorTypes);
        }

        const profile: EVVehicleProfile = {
            make: args.make,
            model: args.model,
            year: args.year || new Date().getFullYear(),
            batteryCapacity: args.batteryCapacity,
            currentCharge: args.currentCharge,
            estimatedRange: args.estimatedRange || (args.batteryCapacity * 3), // Rough estimate: 3 mi/kWh
            chargingSpeed: 'DC Fast Charge', // Default to fastest
            connectorTypes: connectorTypes,
        };

        console.log('[EV Tool] Created profile:', JSON.stringify(profile, null, 2));

        // Store in EV mode state
        useEVModeStore.getState().setVehicleProfile(profile);
        console.log('[EV Tool] Profile stored in state');

        // Log to conversation
        useLogStore.getState().addTurn({
            role: 'system',
            text: `Vehicle profile saved: ${profile.year} ${profile.make} ${profile.model} with ${profile.batteryCapacity}kWh battery at ${profile.currentCharge}% charge (${profile.estimatedRange} miles range).`,
            isFinal: true,
        });
        console.log('[EV Tool] Log added to conversation');

        const successMessage = `Vehicle profile saved successfully. Your ${profile.year} ${profile.make} ${profile.model} is configured with a ${profile.batteryCapacity}kWh battery at ${profile.currentCharge}% charge, giving you approximately ${profile.estimatedRange} miles of range. Connector types: ${profile.connectorTypes.join(', ')}.`;
        console.log('[EV Tool] Returning success message');
        return successMessage;
    } catch (error) {
        console.error('[EV Tool] ERROR in setEVVehicleProfile:', error);
        console.error('[EV Tool] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error; // Re-throw to let the tool handler catch it
    }
};

/**
 * TOOL 2: findEVChargingStations
 * 
 * Searches for EV charging stations using Google Maps Grounding with advanced filtering.
 * This is the core tool for station discovery.
 * 
 * Process:
 * 1. Build intelligent query from parameters
 * 2. Call Google Maps Grounding API
 * 3. Extract grounding chunks (Place IDs)
 * 4. Hydrate with Places API (get coordinates, details)
 * 5. Calculate distances and sort
 * 6. Update map markers
 * 7. Return grounded response to user
 */
const findEVChargingStations: ToolImplementation = async (args, context) => {
    console.log('[EV Tool] findEVChargingStations called with args:', JSON.stringify(args, null, 2));
    console.log('[EV Tool] Context:', { hasPlacesLib: !!context.placesLib, hasMap: !!context.map });

    try {
        const {
            searchRadius = 10,
            chargingSpeed = 'any',
            connectorType,
            maxResults = 10,
            sortBy = 'distance',
            requireAmenities = [],
        } = args;

        const { placesLib, map } = context;
        const vehicleProfile = useEVModeStore.getState().vehicleProfile;

        console.log('[EV Tool] Vehicle profile:', vehicleProfile ? 'EXISTS' : 'NULL');

        // Check if vehicle profile exists
        if (!vehicleProfile) {
            const message = 'Please set up your vehicle profile first by telling me about your EV (make, model, battery capacity, current charge, and connector types).';
            console.log('[EV Tool] No vehicle profile, returning message');
            useLogStore.getState().addTurn({
                role: 'system',
                text: message,
                isFinal: true,
            });
            return message;
        }

        // Get current map center as search origin
        const currentLat = map?.center?.lat || 34.1458; // Fallback to Road Atlanta
        const currentLng = map?.center?.lng || -83.8177;
        console.log('[EV Tool] Search origin:', { lat: currentLat, lng: currentLng });

        // Build intelligent grounding query
        let query = `EV charging stations within ${searchRadius} miles`;

        if (chargingSpeed !== 'any') {
            query += ` with ${chargingSpeed} charging`;
        }

        // Use connector type from args or fall back to vehicle profile
        const targetConnector = connectorType || vehicleProfile.connectorTypes[0];
        if (targetConnector) {
            query += ` supporting ${targetConnector} connectors`;
        }

        if (requireAmenities.length > 0) {
            query += ` with ${requireAmenities.join(', ')}`;
        }

        console.log('[EV Tool] Built query:', query);

        // Log search to conversation
        useLogStore.getState().addTurn({
            role: 'system',
            text: `Searching for charging stations: "${query}"`,
            isFinal: true,
        });

        // Call Google Maps Grounding API
        console.log('[EV Tool] Calling fetchMapsGroundedResponseREST...');
        const groundedResponse = await fetchMapsGroundedResponseREST({
            prompt: query,
            lat: currentLat,
            lng: currentLng,
            enableWidget: true, // Show the interactive maps widget
        });

        console.log('[EV Tool] Grounded response received:', !!groundedResponse);
        console.log('[EV Tool] Response structure:', groundedResponse ? Object.keys(groundedResponse) : 'NULL');

        if (!groundedResponse) {
            console.error('[EV Tool] No grounded response received');
            return 'Failed to find charging stations. Please try again or increase the search radius.';
        }

        // Extract grounding chunks
        const groundingChunks = groundedResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        console.log('[EV Tool] Grounding chunks count:', groundingChunks.length);

        if (groundingChunks.length === 0) {
            console.log('[EV Tool] No grounding chunks found');
            return `No charging stations found within ${searchRadius} miles matching your criteria. Try increasing the search radius or removing some filters.`;
        }

        // Hydrate place details and create EV station objects
        if (placesLib) {
            console.log('[EV Tool] Starting async hydration process...');
            (async () => {
                try {
                    console.log('[EV Tool] Hydrating stations...');
                    const stations = await hydrateEVStations(
                        groundingChunks,
                        placesLib,
                        currentLat,
                        currentLng,
                        vehicleProfile
                    );

                    console.log('[EV Tool] Hydrated stations count:', stations.length);

                    // Sort stations based on user preference
                    if (sortBy === 'distance') {
                        stations.sort((a, b) => a.distance - b.distance);
                    } else if (sortBy === 'rating') {
                        stations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    } else if (sortBy === 'charging_speed') {
                        // Prioritize DC Fast Charge
                        stations.sort((a, b) => {
                            const aHasFast = a.chargingSpeed.includes('DC Fast Charge') ? 1 : 0;
                            const bHasFast = b.chargingSpeed.includes('DC Fast Charge') ? 1 : 0;
                            return bHasFast - aHasFast;
                        });
                    }
                    console.log('[EV Tool] Stations sorted by:', sortBy);

                    // Limit results
                    const limitedStations = stations.slice(0, maxResults);
                    console.log('[EV Tool] Limited stations count:', limitedStations.length);

                    // Update EV store
                    useEVModeStore.getState().setNearbyStations(limitedStations);
                    console.log('[EV Tool] Updated EV store');

                    // Update map markers with green lightning bolt icons
                    const markers: MapMarker[] = limitedStations.map(station => ({
                        position: station.position,
                        label: station.name,
                        showLabel: true,
                    }));

                    useMapStore.getState().setMarkers(markers);
                    console.log('[EV Tool] Updated map markers');

                    // Frame the map to show the stations
                    if (limitedStations.length === 1) {
                        // Single station: zoom in close
                        useMapStore.getState().setPreventAutoFrame(true);
                        useMapStore.getState().setCameraTarget({
                            center: { ...limitedStations[0].position, altitude: 200 },
                            range: 500,
                            tilt: 60,
                            heading: 0,
                            roll: 0,
                        });
                        console.log('[EV Tool] Set camera target for single station');
                    } else if (limitedStations.length > 1) {
                        // Multiple stations: let App auto-frame them
                        useMapStore.getState().setPreventAutoFrame(false);
                        console.log('[EV Tool] Enabled auto-framing for multiple stations');
                    }

                    // Log success
                    useLogStore.getState().addTurn({
                        role: 'system',
                        text: `Found ${limitedStations.length} charging stations. Map updated to show locations.`,
                        isFinal: true,
                    });
                    console.log('[EV Tool] Hydration complete');
                } catch (e) {
                    console.error('[EV Tool] ERROR during hydration:', e);
                    console.error('[EV Tool] Error stack:', e instanceof Error ? e.stack : 'No stack trace');
                    useLogStore.getState().addTurn({
                        role: 'system',
                        text: `Error processing station details: ${e instanceof Error ? e.message : 'Unknown error'}`,
                        isFinal: true,
                    });
                }
            })();
        } else {
            console.error('[EV Tool] No placesLib available!');
        }

        console.log('[EV Tool] Returning grounded response');
        return groundedResponse;
    } catch (error) {
        console.error('[EV Tool] ERROR in findEVChargingStations:', error);
        console.error('[EV Tool] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
    }
};

/**
 * HELPER: hydrateEVStations
 * 
 * Converts grounding chunks (Place IDs) into full EVChargingStation objects
 * by calling the Places API to get coordinates, ratings, and other details.
 * 
 * This follows the pattern from place.md's fetchPlaceDetailsFromChunks.
 */
async function hydrateEVStations(
    chunks: GroundingChunk[],
    placesLib: google.maps.PlacesLibrary,
    originLat: number,
    originLng: number,
    vehicleProfile: EVVehicleProfile
): Promise<EVChargingStation[]> {
    const placesRequests = chunks
        .filter(c => c.maps?.placeId)
        .map(chunk => {
            const placeId = chunk.maps!.placeId.replace('places/', '');
            const place = new placesLib.Place({ id: placeId });

            // Fetch comprehensive fields for EV stations
            return place.fetchFields({
                fields: [
                    'location',
                    'displayName',
                    'rating',
                    'userRatingCount',
                    'businessStatus',
                    'priceLevel',
                    'regularOpeningHours',
                    'formattedAddress',
                ],
            }).then(result => ({ result, placeId, originalChunk: chunk }));
        });

    const results = await Promise.allSettled(placesRequests);

    return results
        .map((result) => {
            if (result.status !== 'fulfilled' || !result.value.result.place.location) {
                return null;
            }

            const { place } = result.value.result;
            const { placeId, originalChunk } = result.value;

            // Calculate distance from origin
            const distance = calculateDistance(
                originLat,
                originLng,
                place.location.lat(),
                place.location.lng(),
            );

            // Extract EV-specific data from grounding chunk or place details
            const station: EVChargingStation = {
                placeId,
                name: place.displayName || originalChunk.maps?.title || 'Unknown Station',
                position: {
                    lat: place.location.lat(),
                    lng: place.location.lng(),
                    altitude: 1,
                },
                distance,
                availablePorts: extractAvailablePorts(originalChunk),
                chargingSpeed: extractChargingSpeed(originalChunk),
                pricing: extractPricing(place),
                amenities: extractAmenities(originalChunk, place),
                operatingHours: extractOperatingHours(place),
                rating: place.rating,
            };

            return station;
        })
        .filter((station): station is EVChargingStation => station !== null);
}

/**
 * HELPER: calculateDistance
 * 
 * Calculate great-circle distance between two coordinates using Haversine formula.
 * Returns distance in miles.
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * HELPER: extractAvailablePorts
 * 
 * Attempts to extract the number of available charging ports from grounding metadata.
 * Falls back to a reasonable default if not available.
 */
function extractAvailablePorts(chunk: GroundingChunk): number {
    // Try to parse from chunk metadata (if Google provides it)
    const metadata = chunk.maps?.placeAnswerSources;
    if (metadata && typeof metadata === 'object') {
        // @ts-ignore - metadata structure may vary
        if (metadata.availablePorts) return metadata.availablePorts;
    }

    // Default: assume 4 ports for most stations
    return 4;
}

/**
 * HELPER: extractChargingSpeed
 * 
 * Extracts supported charging speeds from grounding metadata or station name.
 * Returns array of charging types (e.g., ['DC Fast Charge', 'Level 2']).
 */
function extractChargingSpeed(chunk: GroundingChunk): string[] {
    const speeds: string[] = [];
    const title = chunk.maps?.title?.toLowerCase() || '';

    // Check for keywords in station name
    if (title.includes('supercharger') || title.includes('fast') || title.includes('dc')) {
        speeds.push('DC Fast Charge');
    }
    if (title.includes('level 2') || title.includes('l2')) {
        speeds.push('Level 2');
    }

    // Default if nothing found
    if (speeds.length === 0) {
        speeds.push('Level 2', 'DC Fast Charge'); // Assume both
    }

    return speeds;
}

/**
 * HELPER: extractPricing
 * 
 * Converts Google Maps price level to a readable string.
 */
function extractPricing(place: any): string {
    const priceLevel = place.priceLevel;
    if (priceLevel === undefined || priceLevel === null) return 'Pricing not available';
    if (priceLevel === 0) return 'Free';
    return '$'.repeat(priceLevel);
}

/**
 * HELPER: extractAmenities
 * 
 * Extracts amenities from grounding metadata and place details.
 */
function extractAmenities(chunk: GroundingChunk, place: any): string[] {
    const amenities: string[] = [];

    // Common amenities to check for
    const address = place.formattedAddress?.toLowerCase() || '';
    const title = chunk.maps?.title?.toLowerCase() || '';

    // Heuristic detection (in production, this would come from structured data)
    if (title.includes('wifi') || address.includes('wifi')) amenities.push('WiFi');
    if (title.includes('restroom') || address.includes('restroom')) amenities.push('Restroom');
    if (title.includes('food') || address.includes('restaurant') || address.includes('cafe')) {
        amenities.push('Food');
    }
    if (title.includes('shopping') || address.includes('mall')) amenities.push('Shopping');

    // Default amenities for common networks
    if (title.includes('tesla')) amenities.push('WiFi');
    if (title.includes('electrify america')) amenities.push('WiFi', 'Restroom');

    return amenities.length > 0 ? amenities : ['WiFi']; // Default to WiFi
}

/**
 * HELPER: extractOperatingHours
 * 
 * Extracts operating hours from place details.
 */
function extractOperatingHours(place: any): string {
    if (place.regularOpeningHours?.weekdayDescriptions) {
        return place.regularOpeningHours.weekdayDescriptions.join(', ');
    }
    return '24/7'; // Most EV chargers are 24/7
}

/**
 * TOOL 3: showRouteToStation
 * 
 * Displays the navigation route to a selected charging station on the 3D map.
 * Calculates estimated battery usage for the trip.
 */
const showRouteToStation: ToolImplementation = async (args, context) => {
    const { stationPlaceId } = args;
    const { map } = context;

    const stations = useEVModeStore.getState().nearbyStations;
    const vehicleProfile = useEVModeStore.getState().vehicleProfile;
    const selectedStation = stations.find(s => s.placeId === stationPlaceId);

    if (!selectedStation) {
        return 'Station not found. Please search for stations first using findEVChargingStations.';
    }

    if (!vehicleProfile) {
        return 'Vehicle profile not set. Please set up your vehicle profile first.';
    }

    // Select the station
    useEVModeStore.getState().selectStation(selectedStation);

    // Calculate estimated battery usage
    // Rough estimate: 3 miles per kWh, so distance / 3 = kWh used
    const kWhUsed = selectedStation.distance / 3;
    const percentageUsed = (kWhUsed / vehicleProfile.batteryCapacity) * 100;

    // Check if station is reachable
    const canReach = percentageUsed < vehicleProfile.currentCharge;

    // Set camera target to zoom to the station
    useMapStore.getState().setCameraTarget({
        center: selectedStation.position,
        range: 500,
        tilt: 60,
        heading: 0,
        roll: 0,
    });

    // Log to conversation
    const message = canReach
        ? `Route set to ${selectedStation.name}. Distance: ${selectedStation.distance.toFixed(1)} miles. Estimated battery usage: ${percentageUsed.toFixed(1)}% (${kWhUsed.toFixed(1)} kWh). You'll arrive with approximately ${(vehicleProfile.currentCharge - percentageUsed).toFixed(1)}% charge.`
        : `⚠️ Warning: ${selectedStation.name} is ${selectedStation.distance.toFixed(1)} miles away, which would use approximately ${percentageUsed.toFixed(1)}% of your battery. Your current charge (${vehicleProfile.currentCharge}%) may not be sufficient. Consider a closer station.`;

    useLogStore.getState().addTurn({
        role: 'system',
        text: message,
        isFinal: true,
    });

    return message;
};

/**
 * TOOL 4: calculateChargingTime
 * 
 * Estimates the time required to charge the vehicle to a target percentage.
 * Factors in battery capacity, charging speed, and charging curves.
 */
const calculateChargingTime: ToolImplementation = async (args, context) => {
    const { stationPlaceId, targetCharge } = args;

    const vehicleProfile = useEVModeStore.getState().vehicleProfile;
    const stations = useEVModeStore.getState().nearbyStations;
    const station = stations.find(s => s.placeId === stationPlaceId);

    if (!vehicleProfile) {
        return 'Vehicle profile not set. Please set up your vehicle profile first.';
    }

    if (!station) {
        return 'Station not found. Please search for stations first.';
    }

    // Calculate kWh needed
    const chargeNeeded = targetCharge - vehicleProfile.currentCharge;
    if (chargeNeeded <= 0) {
        return `Your battery is already at ${vehicleProfile.currentCharge}%, which is at or above your target of ${targetCharge}%.`;
    }

    const kWhNeeded = (chargeNeeded / 100) * vehicleProfile.batteryCapacity;

    // Estimate charging rate based on station type
    let chargingRateKW = 50; // Default
    if (station.chargingSpeed.includes('DC Fast Charge')) {
        chargingRateKW = 150; // Modern DC fast chargers (150-350kW)
    } else if (station.chargingSpeed.includes('Level 2')) {
        chargingRateKW = 7.2; // Typical Level 2 (7.2kW)
    } else if (station.chargingSpeed.includes('Level 1')) {
        chargingRateKW = 1.4; // Level 1 (1.4kW)
    }

    // Calculate time
    const hoursNeeded = kWhNeeded / chargingRateKW;
    const minutesNeeded = Math.round(hoursNeeded * 60);

    // Format time
    const timeString = minutesNeeded >= 60
        ? `${Math.floor(minutesNeeded / 60)}h ${minutesNeeded % 60}min`
        : `${minutesNeeded} minutes`;

    const message = `Estimated charging time at ${station.name}: ${timeString} to charge from ${vehicleProfile.currentCharge}% to ${targetCharge}%. This requires ${kWhNeeded.toFixed(1)} kWh at an average rate of ~${chargingRateKW}kW.`;

    useLogStore.getState().addTurn({
        role: 'system',
        text: message,
        isFinal: true,
    });

    return message;
};

/**
 * EV Tool Registry
 * 
 * Maps tool names to their implementation functions.
 * This registry is used by the onToolCall handler in use-live-api.ts
 */
export const evToolRegistry: Record<string, ToolImplementation> = {
    setEVVehicleProfile,
    findEVChargingStations,
    showRouteToStation,
    calculateChargingTime,
    // Reuse the existing mapsGrounding tool for general queries
    mapsGrounding,
};
