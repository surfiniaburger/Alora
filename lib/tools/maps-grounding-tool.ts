/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchMapsGroundedResponseREST } from '@/lib/maps-grounding';
import { useMapStore, MapMarker } from '@/lib/state';
import { ToolImplementation, ToolContext } from './tool-types';
import { GroundingChunk } from '@google/genai';

/**
 * HELPER: fetchPlaceDetailsFromChunks
 * 
 * Fetches place details for a list of grounding chunks.
 * This is used by both mapsGrounding and findEVChargingStations.
 */
export async function fetchPlaceDetailsFromChunks(
    chunks: GroundingChunk[],
    placesLib: google.maps.PlacesLibrary,
    responseText?: string,
    markerBehavior: 'all' | 'mentioned' | 'none' = 'mentioned',
): Promise<MapMarker[]> {
    const chunksToProcess = chunks.filter(chunk => {
        if (!chunk.maps?.placeId) return false;
        // If behavior is 'mentioned', only process chunks that are actually mentioned in the text
        // (This is a simplified check; a real implementation would check indices)
        return true;
    });

    const placesRequests = chunksToProcess.map(chunk => {
        const placeId = chunk.maps!.placeId.replace('places/', '');
        const place = new placesLib.Place({ id: placeId });
        return place.fetchFields({
            fields: ['location', 'displayName'],
        }).then(result => ({ result, place }));
    });

    const results = await Promise.allSettled(placesRequests);

    const newMarkers: MapMarker[] = results
        .map((result, index) => {
            if (result.status !== 'fulfilled' || !result.value.place.location) {
                return null;
            }

            const { place } = result.value;
            const originalChunk = chunksToProcess[index];

            let showLabel = true; // Default for 'mentioned'
            if (markerBehavior === 'all') {
                showLabel = !!(responseText && originalChunk.maps?.title && responseText.includes(originalChunk.maps.title));
            }

            return {
                position: {
                    lat: place.location.lat(),
                    lng: place.location.lng(),
                    altitude: 1,
                },
                label: place.displayName ?? '',
                showLabel,
            };
        })
        .filter((marker): marker is MapMarker => marker !== null);

    return newMarkers;
}

/**
 * HELPER: updateMapStateWithMarkers
 * 
 * Updates the global map state based on the provided markers and grounding data.
 */
export function updateMapStateWithMarkers(
    markers: MapMarker[],
    groundingChunks: GroundingChunk[],
) {
    const hasPlaceAnswerSources = groundingChunks.some(
        chunk => chunk.maps?.placeAnswerSources,
    );

    if (hasPlaceAnswerSources && markers.length === 1) {
        // Special close-up zoom: prevent auto-framing and set a direct camera target.
        const { setPreventAutoFrame, setMarkers, setCameraTarget } =
            useMapStore.getState();

        setPreventAutoFrame(true);
        setMarkers(markers);
        setCameraTarget({
            center: { ...markers[0].position, altitude: 200 },
            range: 500, // A tighter range for a close-up
            tilt: 60, // A steeper tilt for a more dramatic view
            heading: 0,
            roll: 0,
        });
    } else {
        // Default behavior: just set the markers and let the App component auto-frame them.
        const { setPreventAutoFrame, setMarkers } = useMapStore.getState();
        setPreventAutoFrame(false);
        setMarkers(markers);
    }
}

/**
 * Tool implementation for grounding queries with Google Maps.
 *
 * This tool fetches a grounded response and then, in a non-blocking way,
 * processes the place data to update the markers and camera on the 3D map.
 */
export const mapsGrounding: ToolImplementation = async (args, context) => {
    const { setHeldGroundedResponse, setHeldGroundingChunks, placesLib } = context;
    const {
        query,
        markerBehavior = 'mentioned',
        systemInstruction,
        enableWidget,
    } = args;

    const groundedResponse = await fetchMapsGroundedResponseREST({
        prompt: query as string,
        systemInstruction: systemInstruction as string | undefined,
        enableWidget: enableWidget as boolean | undefined,
    });

    if (!groundedResponse) {
        return 'Failed to get a response from maps grounding.';
    }

    // Hold response data for display in the chat log
    setHeldGroundedResponse(groundedResponse);
    const groundingChunks =
        groundedResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
        setHeldGroundingChunks(groundingChunks);
    } else {
        // If there are no grounding chunks, clear any existing markers and return.
        useMapStore.getState().setMarkers([]);
        return groundedResponse;
    }

    // Process place details and update the map state asynchronously.
    // This is done in a self-invoking async function so that the `mapsGrounding`
    // tool can return the response to the model immediately without waiting for
    // the map UI to update.
    if (placesLib && markerBehavior !== 'none') {
        (async () => {
            try {
                const responseText =
                    groundedResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
                const markers = await fetchPlaceDetailsFromChunks(
                    groundingChunks,
                    placesLib,
                    responseText,
                    markerBehavior,
                );
                updateMapStateWithMarkers(markers, groundingChunks);
            } catch (e) {
                console.error('Error processing place details and updating map:', e);
            }
        })();
    } else if (markerBehavior === 'none') {
        // If no markers are to be created, ensure the map is cleared.
        useMapStore.getState().setMarkers([]);
    }

    return groundedResponse;
};
