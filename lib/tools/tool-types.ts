/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GenerateContentResponse, GroundingChunk, FunctionResponseScheduling } from '@google/genai';

export interface FunctionCall {
    name: string;
    description?: string;
    parameters?: any;
    isEnabled: boolean;
    scheduling?: FunctionResponseScheduling;
}

/**
 * Context object containing shared resources and setters that can be passed
 * to any tool implementation.
 */
export interface ToolContext {
    map: google.maps.maps3d.Map3DElement | null;
    placesLib: google.maps.PlacesLibrary | null;
    elevationLib: google.maps.ElevationLibrary | null;
    geocoder: google.maps.Geocoder | null;
    padding: [number, number, number, number];
    setHeldGroundedResponse: (
        response: GenerateContentResponse | undefined,
    ) => void;
    setHeldGroundingChunks: (chunks: GroundingChunk[] | undefined) => void;
}

/**
 * Defines the signature for any tool's implementation function.
 * @param args - The arguments for the function call, provided by the model.
 * @param context - The shared context object.
 * @returns A promise that resolves to either a string or a GenerateContentResponse
 *          to be sent back to the model.
 */
export type ToolImplementation = (
    args: any,
    context: ToolContext,
) => Promise<GenerateContentResponse | string>;
