
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionCall } from './tool-types';
import { FunctionResponseScheduling } from '@google/genai';
import { switch_app_mode, mapsGrounding } from './core-tools';

export const raceTools: FunctionCall[] = [
  {
    name: 'getLiveTelemetry',
    description: 'Retrieves real-time race car telemetry including Speed (MPH), Tire Health (%), Fuel Level (%), and Lap Time Delta (seconds). Call this whenever the user asks about car status, tires, fuel, or strategy.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  mapsGrounding,
  {
    name: 'frameEstablishingShot',
    description: 'Call this function to display a city or location on the map. Provide either a location name to geocode, or a specific latitude and longitude. This provides a wide, establishing shot of the area.',
    parameters: {
      type: 'OBJECT',
      properties: {
        geocode: {
          type: 'STRING',
          description: 'The name of the location to look up (e.g., "Paris, France"). You **MUST be as precise as possible**, include as much location data that you can such as city, state and/or country to reduce ambiguous results.'
        },
        lat: {
          type: 'NUMBER',
          description: 'The latitude of the location.'
        },
        lng: {
          type: 'NUMBER',
          description: 'The longitude of the location.'
        },
      },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'frameLocations',
    description: 'Frames multiple locations on the map, ensuring all are visible. Provide either an array of location names to geocode, or an array of specific latitude/longitude points. Can optionally add markers for these locations. When relying on geocoding you **MUST be as precise as possible**, include as much location data that you can such as city, state and/or country to reduce ambiguous results.',
    parameters: {
      type: 'OBJECT',
      properties: {
        locations: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              lat: { type: 'NUMBER' },
              lng: { type: 'NUMBER' },
            },
            required: ['lat', 'lng'],
          },
        },
        geocode: {
          type: 'ARRAY',
          description: 'An array of location names to look up (e.g., ["Eiffel Tower", "Louvre Museum"]).',
          items: {
            type: 'STRING',
          },
        },
        markers: {
          type: 'BOOLEAN',
          description: 'If true, adds markers to the map for each location being framed.'
        }
      },
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  switch_app_mode,
];
