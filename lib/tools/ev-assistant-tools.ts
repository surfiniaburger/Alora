/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EV Assistant Tool Definitions
 * 
 * Defines the function calling schema for EV-specific tools that integrate with
 * Google Maps Places API and Grounding to provide intelligent charging station
 * discovery and navigation.
 */

import { FunctionCall } from './tool-types';
import { FunctionResponseScheduling } from '@google/genai';

export const evAssistantTools: FunctionCall[] = [
    {
        name: 'setEVVehicleProfile',
        description: `Stores the user's electric vehicle information for personalized charging recommendations. 
    
    Call this when the user provides their vehicle details. This information is used to:
    - Filter charging stations by connector compatibility
    - Calculate accurate range and battery usage
    - Provide personalized charging time estimates
    - Manage range anxiety with proactive alerts`,
        parameters: {
            type: 'OBJECT',
            properties: {
                make: {
                    type: 'STRING',
                    description: 'Vehicle manufacturer (e.g., Tesla, Rivian, Ford, Chevrolet, Nissan)',
                },
                model: {
                    type: 'STRING',
                    description: 'Vehicle model (e.g., Model 3, R1T, Mustang Mach-E, Bolt EV, Leaf)',
                },
                year: {
                    type: 'NUMBER',
                    description: 'Model year (e.g., 2023)',
                },
                batteryCapacity: {
                    type: 'NUMBER',
                    description: 'Total battery capacity in kilowatt-hours (kWh). Common values: Tesla Model 3 (75kWh), Rivian R1T (135kWh), Nissan Leaf (62kWh)',
                },
                currentCharge: {
                    type: 'NUMBER',
                    description: 'Current battery charge percentage (0-100)',
                },
                estimatedRange: {
                    type: 'NUMBER',
                    description: 'Estimated remaining range in miles at current charge level',
                },
                connectorTypes: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                    description: 'Supported connector types. Common values: CCS (most EVs), CHAdeMO (Nissan), Tesla (Tesla vehicles), J1772 (Level 2 charging)',
                },
            },
            required: ['make', 'model', 'batteryCapacity', 'currentCharge', 'connectorTypes'],
        },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    },
    {
        name: 'findEVChargingStations',
        description: `Searches for EV charging stations using Google Maps with advanced filtering.
    
    This tool leverages Google Maps Grounding to find real, operational charging stations with detailed information including:
    - Charging speeds (Level 1, Level 2, DC Fast Charge)
    - Connector types (CCS, CHAdeMO, Tesla, J1772)
    - Real-time availability (when available)
    - Pricing information
    - Amenities (WiFi, restrooms, food nearby)
    - User ratings and reviews
    
    **When to call:**
    - User asks: "Find charging stations", "Where can I charge?", "Show me fast chargers"
    - Battery is low and user needs to charge soon
    - Planning a route and need to find charging stops
    
    **How to use parameters:**
    - searchRadius: Start with 10 miles, increase to 25-50 for rural areas
    - chargingSpeed: Use "DC Fast Charge" for road trips, "Level 2" for overnight/destination charging
    - connectorType: Filter by user's vehicle connector if known from profile
    - sortBy: "distance" (default), "rating" (for best stations), "charging_speed" (for fastest)
    - requireAmenities: Add if user mentions specific needs like WiFi or restrooms`,
        parameters: {
            type: 'OBJECT',
            properties: {
                searchRadius: {
                    type: 'NUMBER',
                    description: 'Search radius in miles (default: 10, max: 50)',
                },
                chargingSpeed: {
                    type: 'STRING',
                    enum: ['Level 2', 'DC Fast Charge', 'any'],
                    description: 'Filter by minimum charging speed. DC Fast Charge for quick stops (20-30 min), Level 2 for overnight (4-8 hours)',
                },
                connectorType: {
                    type: 'STRING',
                    description: 'Filter by connector type (CCS, CHAdeMO, Tesla, J1772). Use user\'s vehicle connector from profile.',
                },
                maxResults: {
                    type: 'NUMBER',
                    description: 'Maximum number of results to return (default: 10, max: 20)',
                },
                sortBy: {
                    type: 'STRING',
                    enum: ['distance', 'rating', 'charging_speed'],
                    description: 'Sort order for results (default: distance)',
                },
                requireAmenities: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                    description: 'Required amenities (WiFi, Restroom, Food, Shopping)',
                },
            },
        },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    },
    {
        name: 'showRouteToStation',
        description: `Displays the navigation route from the current location to a selected charging station on the 3D map.
    
    This tool:
    - Calculates the optimal route to the station
    - Estimates battery usage for the trip
    - Displays the route on the 3D map with turn-by-turn visualization
    - Warns if the station is beyond current range
    
    Call this when:
    - User selects a specific station from search results
    - User says "navigate to [station name]" or "show me the route"
    - User asks "how do I get there?"`,
        parameters: {
            type: 'OBJECT',
            properties: {
                stationPlaceId: {
                    type: 'STRING',
                    description: 'The Google Maps Place ID of the charging station (from findEVChargingStations results)',
                },
            },
            required: ['stationPlaceId'],
        },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    },
    {
        name: 'calculateChargingTime',
        description: `Estimates the time required to charge the vehicle to a target percentage at a specific station.
    
    Calculation factors:
    - Current battery charge level
    - Target charge level
    - Battery capacity (from vehicle profile)
    - Station charging speed (from station data)
    - Charging curve (batteries charge slower at higher percentages)
    
    Call this when:
    - User asks "How long will it take to charge?"
    - User wants to know if they have time for a meal/break
    - Planning charging stops on a road trip`,
        parameters: {
            type: 'OBJECT',
            properties: {
                stationPlaceId: {
                    type: 'STRING',
                    description: 'The charging station Place ID',
                },
                targetCharge: {
                    type: 'NUMBER',
                    description: 'Target charge percentage (0-100). Recommend 80% for DC Fast Charge to optimize time.',
                },
            },
            required: ['stationPlaceId', 'targetCharge'],
        },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    },
    {
        name: 'mapsGrounding',
        description: `Fallback tool for general location queries not specific to EV charging.
    
    Use this for:
    - Finding restaurants, coffee shops, hotels near charging stations
    - General navigation queries
    - Exploring areas while waiting for charging
    
    Do NOT use this for finding charging stations - use findEVChargingStations instead.`,
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: 'The search query (e.g., "coffee shops near me", "hotels in downtown")',
                },
                markerBehavior: {
                    type: 'STRING',
                    enum: ['mentioned', 'all', 'none'],
                    description: 'Controls map markers. Use "all" to show all results, "mentioned" for only discussed places.',
                },
            },
            required: ['query'],
        },
        isEnabled: true,
        scheduling: FunctionResponseScheduling.INTERRUPT,
    },
];
