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
import React, { useCallback, useState, useEffect, useRef } from 'react';

import ControlTray from './components/ControlTray';
import ErrorScreen from './components/ErrorScreen';
import StreamingConsole from './components/streaming-console/StreamingConsole';
import PopUp from './components/popup/PopUp';
import Sidebar from './components/Sidebar';
import TelemetryPanel from './components/telemetry/TelemetryPanel';
import EVModeToggle from './components/EVModeToggle';
import EVStationPanel from './components/ev/EVStationPanel';

import DebugPanel from './components/DebugPanel';
import VideoInspector from './components/VideoInspector';
import { LiveAPIProvider, useLiveAPIContext } from './contexts/LiveAPIContext';
// FIX: Correctly import APIProvider as a named export.
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps } from './components/map-3d';
import { useMapStore, useTelemetryStore, useUI, useTools, useSettings } from './lib/state';
import { SoundManager } from './components/SoundManager';
import { useEVModeStore } from './lib/ev-mode-state';
import { MapController } from './lib/map-controller';
import { useTelemetrySimulation } from './hooks/use-telemetry';
import { useGeolocation } from './hooks/use-geolocation';
import { LiveConnectConfig } from '@google/genai';

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error(
    'Missing required environment variable: VITE_API_KEY'
  );
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error(
    'Missing required environment variable: VITE_GOOGLE_MAPS_API_KEY'
  );
}

// ROAD ATLANTA CONFIGURATION
const INITIAL_VIEW_PROPS = {
  center: {
    lat: 34.1458,
    lng: -83.8177,
    altitude: 150 // Lower altitude to show track details immediately
  },
  range: 1000,
  heading: 0,
  tilt: 45, // High tilt for 3D view
  roll: 0
};

// ---------------------------------------------------------------------------
// INNER APP: Contains Main Logic having access to LiveAPIContext
// ---------------------------------------------------------------------------
function InnerApp({
  map,
  setMap,
  padding,
  setPadding
}: {
  map: google.maps.maps3d.Map3DElement | null;
  setMap: (m: google.maps.maps3d.Map3DElement | null) => void;
  padding: [number, number, number, number];
  setPadding: (p: [number, number, number, number]) => void;
}) {
  const [viewProps, setViewProps] = useState(INITIAL_VIEW_PROPS);

  // Zustand Stores
  const { markers, cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  const telemetryData = useTelemetryStore(state => state.data);
  const { isTelemetryPanelOpen, activeMode } = useUI();
  const { nearbyStations, isEVModeActive, routePath } = useEVModeStore();

  // Contexts
  const { setConfig } = useLiveAPIContext();
  const { systemPrompt, voice } = useSettings();
  const { tools, setTemplate, template } = useTools();

  const mapController = useRef<MapController | null>(null);
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');

  const [showPopUp, setShowPopUp] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const consolePanelRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLElement>(null);

  // Initialize Telemetry
  useTelemetrySimulation();

  // ---------------------------------------------------------------------------
  // CENTRALIZED AGENT CONFIGURATION (THE FIX)
  // ---------------------------------------------------------------------------

  // 1. Sync State: Ensure "Brain" (Template) matches "Body" (UI Mode)
  useEffect(() => {
    if (activeMode === 'EV' && template !== 'ev-assistant') {
      console.log('[App] Syncing Template to EV Assistant');
      setTemplate('ev-assistant');
    } else if (activeMode === 'RACE' && template !== 'race-strategy') {
      console.log('[App] Syncing Template to Race Strategy');
      setTemplate('race-strategy');
    } else if (activeMode === 'INSPECTOR' && template !== 'ev-assistant') {
      console.log('[App] Syncing Template to Inspector (EV tools)');
      setTemplate('ev-assistant');
    }
  }, [activeMode, template, setTemplate]);

  // 2. Configure Live API: Publish Config to Gemini
  // This is the SINGLE SOURCE OF TRUTH for tool registration.
  useEffect(() => {
    const enabledTools = tools
      .filter(tool => tool.isEnabled)
      .map(tool => ({
        functionDeclarations: [
          {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        ],
      }));

    const config: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      tools: enabledTools,
      thinkingConfig: { thinkingBudget: 0 },
    };

    console.log('[App] Updating Live API Config:', {
      mode: activeMode,
      template,
      voice,
      toolCount: enabledTools.length
    });

    setConfig(config);
  }, [setConfig, systemPrompt, tools, voice, activeMode, template]);

  // ---------------------------------------------------------------------------
  // MAP CONTROLLER & EFFECTS
  // ---------------------------------------------------------------------------

  // Instantiate MapController
  useEffect(() => {
    if (map && maps3dLib && elevationLib) {
      mapController.current = new MapController({
        map,
        // The Maps 3D library is currently in Alpha and the types in @types/google.maps
        // may not fully reflect the latest experimental features, necessitating this cast.
        maps3dLib: maps3dLib as unknown as google.maps.Maps3DLibrary,
        elevationLib: elevationLib as unknown as google.maps.ElevationLibrary,
      });
    }
    return () => {
      mapController.current = null;
    };
  }, [map, maps3dLib, elevationLib]);

  // Draw Race Layer
  useEffect(() => {
    if (mapController.current) {
      if (telemetryData.trackPath) mapController.current.drawTrack(telemetryData.trackPath);
      mapController.current.updateRaceCars(telemetryData.carPosition, telemetryData.ghostPosition);
    }
  }, [telemetryData.carPosition, telemetryData.ghostPosition, telemetryData.trackPath]);

  // Draw EV Layer
  useEffect(() => {
    if (mapController.current) {
      if (!isEVModeActive) {
        mapController.current.clearEVMarkers();
        mapController.current.clearRoute();
      } else {
        if (nearbyStations.length > 0) mapController.current.addEVStationMarkers(nearbyStations);
        if (routePath) mapController.current.drawRoute(routePath);
        else mapController.current.clearRoute();
      }
    }
  }, [nearbyStations, isEVModeActive, routePath]);

  // Handle Geolocation (Auto Zoom)
  const { location: gpsLocation, error: geoError } = useGeolocation(isEVModeActive);
  useEffect(() => {
    if (gpsLocation && isEVModeActive && mapController.current) {
      console.log('[Geolocation] GPS location obtained:', gpsLocation);
      mapController.current.flyTo({
        center: { lat: gpsLocation.lat, lng: gpsLocation.lng, altitude: 5000 },
        range: 50000, tilt: 0, heading: 0, roll: 0
      });
    }
  }, [gpsLocation, isEVModeActive]);

  // Handle Geolocation Errors
  useEffect(() => {
    if (geoError) console.log('[Geolocation] Error:', geoError);
  }, [geoError]);

  // Revert Camera on Exit EV Mode
  useEffect(() => {
    if (!isEVModeActive && mapController.current) {
      mapController.current.flyTo(INITIAL_VIEW_PROPS);
    }
  }, [isEVModeActive]);

  // Markers & Auto-Frame
  useEffect(() => {
    if (!mapController.current) return;
    const controller = mapController.current;
    controller.clearMap();
    if (markers.length > 0) controller.addMarkers(markers);

    const markerPositions = markers.map(m => m.position);
    const allEntities = [...markerPositions].map(p => ({ position: p }));

    if (allEntities.length > 0 && !preventAutoFrame) {
      controller.frameEntities(allEntities, padding);
    }
  }, [markers, padding, preventAutoFrame]);

  // Direct Camera Targeting
  useEffect(() => {
    if (cameraTarget && mapController.current) {
      mapController.current.flyTo(cameraTarget);
      setCameraTarget(null);
      useMapStore.getState().setPreventAutoFrame(false);
    }
  }, [cameraTarget, setCameraTarget]);

  // Calculate Map Padding
  useEffect(() => {
    const calculatePadding = () => {
      const trayEl = controlTrayRef.current;
      const vh = window.innerHeight;
      const top = 0.05;
      const right = 0.05;
      const left = 0.05;
      let bottom = 0.1;

      if (trayEl) {
        const trayHeight = trayEl.offsetHeight;
        bottom = Math.max(bottom, (trayHeight / vh) + 0.05);
      }
      setPadding([top, right, bottom, left]);
    };
    const observer = new ResizeObserver(calculatePadding);
    if (consolePanelRef.current) observer.observe(consolePanelRef.current);
    if (controlTrayRef.current) observer.observe(controlTrayRef.current);
    window.addEventListener('resize', calculatePadding);
    const timeoutId = setTimeout(calculatePadding, 100);
    return () => {
      window.removeEventListener('resize', calculatePadding);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [setPadding]);

  // Handle Banner
  useEffect(() => {
    if (map) {
      const banner = document.querySelector('.vAygCK-api-load-alpha-banner') as HTMLElement;
      if (banner) banner.style.display = 'none';
    }
  }, [map]);

  const handleCameraChange = useCallback((props: Map3DCameraProps) => {
    setViewProps(oldProps => ({ ...oldProps, ...props }));
  }, []);

  return (
    <>
      <ErrorScreen />
      <EVModeToggle />
      <DebugPanel
        isVisible={showDebugPanel}
        onToggle={() => setShowDebugPanel(!showDebugPanel)}
      />
      <Sidebar />
      {showPopUp && <PopUp onClose={() => setShowPopUp(false)} />}
      <div className="app-container">
        <div className="map-background">
          <Map3D
            ref={element => setMap(element ?? null)}
            onCameraChange={handleCameraChange}
            {...viewProps}>
          </Map3D>
        </div>
        <div className="ui-overlay" ref={consolePanelRef}>
          {isTelemetryPanelOpen && <TelemetryPanel />}
          <StreamingConsole />
          <ControlTray
            trayRef={controlTrayRef}
            onToggleDebug={() => setShowDebugPanel(!showDebugPanel)}
          />
        </div>
        <VideoInspector
          active={useUI(state => state.activeMode === 'INSPECTOR')}
          onClose={() => useUI.getState().setMode('RACE')}
        />
      </div>
    </>
  );
}

/**
 * Shell Component
 */

function AppComponent() {
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');
  const routesLib = useMapsLibrary('routes');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [padding, setPadding] = useState<[number, number, number, number]>([0.05, 0.05, 0.05, 0.05]);

  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  return (
    <LiveAPIProvider
      apiKey={API_KEY}
      map={map}
      placesLib={placesLib}
      routesLib={routesLib}
      elevationLib={elevationLib}
      geocoder={geocoder}
      padding={padding}
    >
      <SoundManager />
      <InnerApp
        map={map}
        setMap={setMap}
        padding={padding}
        setPadding={setPadding}
      />
    </LiveAPIProvider>
  );
}

/**
 * Main application entry point
 */
function App() {
  return (
    <div className="App">
      <APIProvider
        version={'alpha'}
        apiKey={GOOGLE_MAPS_API_KEY}
        solutionChannel={"gmp_aistudio_itineraryapplet_v1.0.0"}>
        <AppComponent />
      </APIProvider>
    </div>
  );
}

export default App;
