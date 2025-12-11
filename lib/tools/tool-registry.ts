
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GenerateContentResponse, GroundingChunk } from '@google/genai';
import { mapsGrounding, fetchPlaceDetailsFromChunks, updateMapStateWithMarkers } from './maps-grounding-tool';

import { MapMarker, useLogStore, useMapStore, useTelemetryStore } from '@/lib/state';
import { lookAtWithPadding } from '../look-at';

import type { ToolImplementation, ToolContext, FunctionCall } from './tool-types';
export type { ToolImplementation, ToolContext };
import { evToolRegistry } from './ev-tool-registry';
import { uiTools, uiToolDeclarations } from './ui-tools';
import { itineraryPlannerTools } from './itinerary-planner';
import { evAssistantTools } from './ev-assistant-tools';


/**
 * Tool implementation for retrieving live race telemetry.
 */
const getLiveTelemetry: ToolImplementation = async (args, context) => {
  const data = useTelemetryStore.getState().data;

  // Return a structured summary for the model to digest easily
  const summary = {
    speed: `${data.speed} MPH`,
    tireHealth: `${data.tireHealth}%`,
    fuelLevel: `${data.fuelLevel}%`,
    lapDelta: `${data.lapDelta > 0 ? '+' : ''}${data.lapDelta}s`,
    rpm: data.rpm,
    gear: data.gear
  };

  return JSON.stringify(summary);
};

/**
 * Tool implementation for displaying a city on the 3D map.
 * This tool sets the `cameraTarget` in the global Zustand store. The main `App`
 * component has a `useEffect` hook that listens for changes to this state and
 * commands the `MapController` to fly to the new target.
 */
const frameEstablishingShot: ToolImplementation = async (args, context) => {
  let { lat, lng, geocode } = args;
  const { geocoder } = context;

  if (geocode && typeof geocode === 'string') {
    if (!geocoder) {
      const errorMessage = 'Geocoding service is not available.';
      useLogStore.getState().addTurn({
        role: 'system',
        text: errorMessage,
        isFinal: true,
      });
      return errorMessage;
    }
    try {
      const response = await geocoder.geocode({ address: geocode });
      if (response.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        lat = location.lat();
        lng = location.lng();
      } else {
        const errorMessage = `Could not find a location for "${geocode}".`;
        useLogStore.getState().addTurn({
          role: 'system',
          text: errorMessage,
          isFinal: true,
        });
        return errorMessage;
      }
    } catch (error) {
      console.error(`Geocoding failed for "${geocode}":`, error);
      const errorMessage = `There was an error trying to find the location for "${geocode}". See browser console for details.`;
      useLogStore.getState().addTurn({
        role: 'system',
        text: errorMessage,
        isFinal: true,
      });
      return `There was an error trying to find the location for "${geocode}".`;
    }
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return 'Invalid arguments for frameEstablishingShot. You must provide either a `geocode` string or numeric `lat` and `lng` values.';
  }

  // Instead of directly manipulating the map, we set a target in the global state.
  // The App component will observe this state and command the MapController to fly to the target.
  useMapStore.getState().setCameraTarget({
    center: { lat, lng, altitude: 5000 },
    range: 15000,
    tilt: 10,
    heading: 0,
    roll: 0,
  });

  if (geocode) {
    return `Set camera target to ${geocode}.`;
  }
  return `Set camera target to latitude ${lat} and longitude ${lng}.`;
};


/**
 * Tool implementation for framing a list of locations on the map. It can either
 * fly the camera to view the locations or add markers for them, letting the
 * main app's reactive state handle the camera framing.
 */
const frameLocations: ToolImplementation = async (args, context) => {
  const {
    locations: explicitLocations,
    geocode,
    markers: shouldCreateMarkers,
  } = args;
  const { elevationLib, padding, geocoder } = context;

  const locationsWithLabels: { lat: number; lng: number; label?: string }[] =
    [];

  // 1. Collect all locations from explicit coordinates and geocoded addresses.
  if (Array.isArray(explicitLocations)) {
    locationsWithLabels.push(
      ...(explicitLocations.map((loc: { lat: number; lng: number }) => ({
        ...loc,
      })) || []),
    );
  }

  if (Array.isArray(geocode) && geocode.length > 0) {
    if (!geocoder) {
      const errorMessage = 'Geocoding service is not available.';
      useLogStore
        .getState()
        .addTurn({ role: 'system', text: errorMessage, isFinal: true });
      return errorMessage;
    }

    const geocodePromises = geocode.map(address =>
      geocoder.geocode({ address }).then(response => ({ response, address })),
    );
    const geocodeResults = await Promise.allSettled(geocodePromises);

    geocodeResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const { response, address } = result.value;
        if (response.results && response.results.length > 0) {
          const location = response.results[0].geometry.location;
          locationsWithLabels.push({
            lat: location.lat(),
            lng: location.lng(),
            label: address,
          });
        } else {
          const errorMessage = `Could not find a location for "${address}".`;
          useLogStore
            .getState()
            .addTurn({ role: 'system', text: errorMessage, isFinal: true });
        }
      } else {
        const errorMessage = `Geocoding failed for an address.`;
        console.error(errorMessage, result.reason);
        useLogStore
          .getState()
          .addTurn({ role: 'system', text: errorMessage, isFinal: true });
      }
    });
  }

  // 2. Check if we have any valid locations.
  if (locationsWithLabels.length === 0) {
    return 'Could not find any valid locations to frame.';
  }

  // 3. Perform the requested action.
  if (shouldCreateMarkers) {
    // Create markers and update the global state. The App component will
    // reactively frame these new markers.
    const markersToSet = locationsWithLabels.map((loc, index) => ({
      position: { lat: loc.lat, lng: loc.lng, altitude: 1 },
      label: loc.label || `Location ${index + 1}`,
      showLabel: true,
    }));

    const { setMarkers, setPreventAutoFrame } = useMapStore.getState();
    setPreventAutoFrame(false); // Ensure auto-framing is enabled
    setMarkers(markersToSet);

    return `Framed and added markers for ${markersToSet.length} locations.`;
  } else {
    // No markers requested. Clear existing markers and manually fly the camera.
    if (!elevationLib) {
      return 'Elevation library is not available.';
    }

    useMapStore.getState().clearMarkers();

    const elevator = new elevationLib.ElevationService();
    const cameraProps = await lookAtWithPadding(
      locationsWithLabels,
      elevator,
      0,
      padding,
    );

    useMapStore.getState().setCameraTarget({
      center: {
        lat: cameraProps.lat,
        lng: cameraProps.lng,
        altitude: cameraProps.altitude,
      },
      range: cameraProps.range + 1000,
      heading: cameraProps.heading,
      tilt: cameraProps.tilt,
      roll: 0,
    });

    return `Framed ${locationsWithLabels.length} locations on the map.`;
  }
};

/**
 * Common Tools
 */
export const commonTools: Record<string, ToolImplementation> = {
  getLiveTelemetry,
  mapsGrounding,
  frameEstablishingShot,
  frameLocations,
};

/**
 * Unified Tool Registry
 * Contains ALL tools available to the Unified Alora Persona.
 */
export const toolRegistry: Record<string, ToolImplementation> = {
  ...commonTools,
  ...evToolRegistry, // Import EV tools (find stations, vehicle profile, etc)
  ...uiTools,       // Import UI tools (setAppMode)
};

/**
 * Legacy export for backward compatibility or if dynamic loading is needed in future.
 * For now, returns the unified registry.
 */
export function getToolRegistry(template: string): Record<string, ToolImplementation> {
  // We ignore the template now as Alora is unified.
  // We log it just for debugging if something old calls it.
  // console.log('[Tool Registry] getToolRegistry called (Unified Mode):', template); // Optional log
  return toolRegistry;
}

/**
 * Unified Tool Declarations
 * Contains the metadata (name, description, parameters) for all tools.
 * Used by the UI to configure the Gemini Live API.
 */
export const toolDeclarations: FunctionCall[] = [
  ...itineraryPlannerTools,
  ...evAssistantTools,
  ...uiToolDeclarations,
];
