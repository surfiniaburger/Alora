/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../lib/state';

const roadAtlantaPath: google.maps.LatLngAltitudeLiteral[] = [
    // Start/Finish Line (Adjusted slightly)
    { lat: 34.14815, lng: -83.81550, altitude: 10 }, 
    
    // Turn 1 (Right Uphill)
    { lat: 34.14840, lng: -83.81530, altitude: 14 },
    { lat: 34.14870, lng: -83.81530, altitude: 16 }, // Apex T1
    { lat: 34.14910, lng: -83.81570, altitude: 18 }, // Track Out T1

    // Turn 2 (Blind Left - Setting up for Esses)
    { lat: 34.14920, lng: -83.81660, altitude: 18 },

    // Turn 3 (Esses Entry Right)
    { lat: 34.14880, lng: -83.81770, altitude: 16 },

    // Turn 4 (Esses Left)
    { lat: 34.14800, lng: -83.81860, altitude: 12 },

    // Turn 5 (Esses Bottom/Right)
    { lat: 34.14650, lng: -83.82000, altitude: 9 },
    { lat: 34.14610, lng: -83.82020, altitude: 8 }, // Apex T5

    // Turn 6 (Exit Esses Right - Uphill)
    { lat: 34.14600, lng: -83.81920, altitude: 9 },

    // Turn 7 Approach (Short Chute)
    { lat: 34.14550, lng: -83.81610, altitude: 11 },

    // Turn 7 (Sharp 90-degree Right onto Back Straight)
    { lat: 34.14530, lng: -83.81460, altitude: 12 }, // Braking Zone
    { lat: 34.14500, lng: -83.81430, altitude: 12 }, // Apex T7

    // Back Straight
    { lat: 34.14440, lng: -83.81360, altitude: 11 },
    { lat: 34.14290, lng: -83.81260, altitude: 9 },
    { lat: 34.14140, lng: -83.81170, altitude: 7 },

    // Turn 10A (Chicane Left)
    { lat: 34.14020, lng: -83.81120, altitude: 5 }, // Braking
    { lat: 34.13995, lng: -83.81145, altitude: 5 }, // Apex Left

    // Turn 10B (Chicane Right)
    { lat: 34.14010, lng: -83.81210, altitude: 6 }, // Apex Right

    // Turn 11 (Bridge / Foxhole)
    { lat: 34.14120, lng: -83.81340, altitude: 8 },
    { lat: 34.14320, lng: -83.81520, altitude: 13 }, // Under Bridge

    // Turn 12 (Fast Downhill Right)
    { lat: 34.14420, lng: -83.81570, altitude: 12 },
    { lat: 34.14540, lng: -83.81630, altitude: 11 }, // Apex T12
    { lat: 34.14640, lng: -83.81620, altitude: 10 }, // Track Out

    // Close Loop (Adjusted to meet new start/finish)
    { lat: 34.14815, lng: -83.81550, altitude: 10 }
];


// Helper to interpolate between points
function interpolate(p1: google.maps.LatLngAltitudeLiteral, p2: google.maps.LatLngAltitudeLiteral, fraction: number) {
    return {
        lat: p1.lat + (p2.lat - p1.lat) * fraction,
        lng: p1.lng + (p2.lng - p1.lng) * fraction,
        altitude: p1.altitude + (p2.altitude - p1.altitude) * fraction
    };
}

// Calculate bearing between two points
function getBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = startLat * (Math.PI / 180);
  const startLngRad = startLng * (Math.PI / 180);
  const destLatRad = destLat * (Math.PI / 180);
  const destLngRad = destLng * (Math.PI / 180);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
        Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = Math.atan2(y, x);
  const brngDeg = (brng * 180 / Math.PI + 360) % 360;
  return brngDeg;
}

export function useTelemetrySimulation() {
  const { updateTelemetry } = useTelemetryStore();
  // FIX: Use number for setInterval ID to avoid Node/Browser type conflicts
  const intervalRef = useRef<number | null>(null);
  
  // Simulation state
  const simState = useRef({
      tick: 0,
      carProgressIndex: 0, // Current index in roadAtlantaPath
      carFraction: 0, // Fraction between current index and next
      ghostProgressIndex: 0,
      ghostFraction: 0,
      ghostOffset: -2, // Ghost starts slightly behind
  });

  useEffect(() => {
    // Initialize track path in store once
    updateTelemetry({ trackPath: roadAtlantaPath });

    const simulateTelemetry = () => {
        // ACCESS LATEST STATE DIRECTLY to avoid closure staleness and effect resets
        const currentData = useTelemetryStore.getState().data;

        simState.current.tick += 1;
        
        // 1. Calculate Physics (Speed/RPM/Fuel)
        // Simulate Speed: Oscillate between 60 and 180 based on a sine wave (simulating straights vs corners)
        const baseSpeed = 120;
        const variance = 60;
        const noise = Math.random() * 5 - 2.5;
        const wave = Math.sin(simState.current.tick * 0.1); 
        const speed = Math.max(60, Math.min(180, Math.floor(baseSpeed + (wave * variance) + noise)));

        // Gears
        let gear = 1;
        if (speed > 30) gear = 2;
        if (speed > 60) gear = 3;
        if (speed > 90) gear = 4;
        if (speed > 120) gear = 5;
        if (speed > 150) gear = 6;

        const minGearSpeed = (gear - 1) * 30;
        const gearProgress = (speed - minGearSpeed) / 30;
        const rpm = Math.floor(4000 + (gearProgress * 3500)) + (Math.random() * 100);

        // Degradation
        // FIX: Use currentData from getState() to ensure we aren't using stale initial state
        const newTire = Math.max(0, currentData.tireHealth - 0.05);
        const newFuel = Math.max(0, currentData.fuelLevel - 0.02);
        const deltaDrift = (Math.random() * 0.1) - 0.05;
        let newDelta = currentData.lapDelta + deltaDrift;
        newDelta = Math.max(-0.5, Math.min(0.5, newDelta));

        // 2. Calculate Position on Track
        // Simple logic: speed determines how fast we move through the array
        // Higher speed = larger increment
        // Tuning: increased divisor to 4000 since we have more points now
        const speedFactor = speed / 4000; 
        
        // Update Car Position
        simState.current.carFraction += speedFactor;
        if (simState.current.carFraction >= 1) {
            simState.current.carProgressIndex = (simState.current.carProgressIndex + 1) % roadAtlantaPath.length;
            simState.current.carFraction = 0;
        }
        
        const p1 = roadAtlantaPath[simState.current.carProgressIndex];
        const p2 = roadAtlantaPath[(simState.current.carProgressIndex + 1) % roadAtlantaPath.length];
        const carPos = interpolate(p1, p2, simState.current.carFraction);
        const carHeading = getBearing(p1.lat, p1.lng, p2.lat, p2.lng);

        // Update Ghost Position (Rival Pace)
        // Ghost moves at a slightly different consistent pace
        const ghostSpeedFactor = (150 / 4000); // Constant 150mph average
        simState.current.ghostFraction += ghostSpeedFactor;
         if (simState.current.ghostFraction >= 1) {
            simState.current.ghostProgressIndex = (simState.current.ghostProgressIndex + 1) % roadAtlantaPath.length;
            simState.current.ghostFraction = 0;
        }
        const g1 = roadAtlantaPath[simState.current.ghostProgressIndex];
        const g2 = roadAtlantaPath[(simState.current.ghostProgressIndex + 1) % roadAtlantaPath.length];
        const ghostPos = interpolate(g1, g2, simState.current.ghostFraction);
        const ghostHeading = getBearing(g1.lat, g1.lng, g2.lat, g2.lng);

        updateTelemetry({
            speed,
            gear,
            rpm,
            // FIX: toFixed(2) prevents rounding 99.95 back up to 100.0
            tireHealth: Number(newTire.toFixed(2)),
            fuelLevel: Number(newFuel.toFixed(2)),
            lapDelta: Number(newDelta.toFixed(2)),
            carPosition: carPos,
            ghostPosition: ghostPos,
            carHeading,
            ghostHeading
        });
    };

    intervalRef.current = window.setInterval(simulateTelemetry, 100);

    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };
  }, [updateTelemetry]); // Only re-run if updateTelemetry changes (it's stable)
}
