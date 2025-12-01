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
import { LiveAPIProvider } from './contexts/LiveAPIContext';
// FIX: Correctly import APIProvider as a named export.
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Map3D, Map3DCameraProps } from './components/map-3d';
import { useMapStore, useTelemetryStore, useUI } from './lib/state';
import { useEVModeStore } from './lib/ev-mode-state';
import { MapController } from './lib/map-controller';
import { useTelemetrySimulation } from './hooks/use-telemetry';
import { useGeolocation } from './hooks/use-geolocation';

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

/**
 * The main application component. It serves as the primary view controller,
 * orchestrating the layout of UI components and reacting to global state changes
 * to update the 3D map.
 */
function AppComponent() {
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement | null>(null);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [viewProps, setViewProps] = useState(INITIAL_VIEW_PROPS);
  // Subscribe to marker and camera state from the global Zustand store.
  const { markers, cameraTarget, setCameraTarget, preventAutoFrame } = useMapStore();
  // Subscribe to telemetry state
  const telemetryData = useTelemetryStore(state => state.data);

  const mapController = useRef<MapController | null>(null);

  const maps3dLib = useMapsLibrary('maps3d');
  const elevationLib = useMapsLibrary('elevation');
  const routesLib = useMapsLibrary('routes');

  const [showPopUp, setShowPopUp] = useState(true);

  const consolePanelRef = useRef<HTMLDivElement>(null);
  const controlTrayRef = useRef<HTMLElement>(null);
  // Padding state is used to ensure map content isn't hidden by UI elements.
  const [padding, setPadding] = useState<[number, number, number, number]>([0.05, 0.05, 0.05, 0.05]);

  // Initialize Telemetry Simulation
  useTelemetrySimulation();

  // Effect: Instantiate the Geocoder once the library is loaded.
  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  // Effect: Instantiate the MapController.
  // This runs once all necessary map libraries and the map element itself are
  // loaded and available, creating a centralized controller for all map interactions.
  useEffect(() => {
    if (map && maps3dLib && elevationLib) {
      mapController.current = new MapController({
        map,
        maps3dLib,
        elevationLib,
      });
    }
    // Invalidate the controller if its dependencies change.
    return () => {
      mapController.current = null;
    };
  }, [map, maps3dLib, elevationLib]);

  // Effect: Update Race Layer (Track and Cars)
  useEffect(() => {
    if (mapController.current) {
      // Draw track if defined
      if (telemetryData.trackPath) {
        mapController.current.drawTrack(telemetryData.trackPath);
      }
      // Update cars
      mapController.current.updateRaceCars(
        telemetryData.carPosition,
        telemetryData.ghostPosition
      );
    }
  }, [telemetryData.carPosition, telemetryData.ghostPosition, telemetryData.trackPath]);

  // Effect: Calculate responsive padding.
  // This effect observes the size of the console and control tray to calculate
  // padding values. These values represent how much of the viewport is
  // covered by UI, ensuring that when the map frames content, nothing is hidden.
  // See `lib/look-at.ts` for how this padding is used.
  useEffect(() => {
    const calculatePadding = () => {
      const consoleEl = consolePanelRef.current;
      const trayEl = controlTrayRef.current;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      if (!consoleEl || !trayEl) return;

      const isMobile = window.matchMedia('(max-width: 768px)').matches;

      const top = 0.05;
      let right = 0.05;
      let bottom = 0.05;
      let left = 0.05;

      if (!isMobile) {
        // On desktop, console is on the RIGHT. 
        right = Math.max(right, (consoleEl.offsetWidth / vw) + 0.02); // add 2% buffer
        // Left side is now clear for the map
      }

      setPadding([top, right, bottom, left]);
    };

    // Use ResizeObserver for more reliable updates on the elements themselves.
    const observer = new ResizeObserver(calculatePadding);
    if (consolePanelRef.current) observer.observe(consolePanelRef.current);
    if (controlTrayRef.current) observer.observe(controlTrayRef.current);

    // Also listen to window resize
    window.addEventListener('resize', calculatePadding);

    // Initial calculation after a short delay to ensure layout is stable
    const timeoutId = setTimeout(calculatePadding, 100);

    return () => {
      window.removeEventListener('resize', calculatePadding);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  // Effect: Update EV station markers when stations are found
  // This connects the EV tool results with the 3D map visualization
  const { isSidebarOpen, isTelemetryPanelOpen } = useUI();
  const { nearbyStations, isEVModeActive, routePath } = useEVModeStore();
  // Request geolocation when in EV mode
  const { location: gpsLocation, error: geoError } = useGeolocation(isEVModeActive);
  useEffect(() => {
    if (mapController.current) {
      if (!isEVModeActive) {
        mapController.current.clearEVMarkers();
        mapController.current.clearRoute();
      } else {
        if (nearbyStations.length > 0) {
          mapController.current.addEVStationMarkers(nearbyStations);
        }
        if (routePath) {
          mapController.current.drawRoute(routePath);
        } else {
          mapController.current.clearRoute();
        }
      }
    }
  }, [nearbyStations, isEVModeActive, routePath]);

  // Effect: Zoom map to user's GPS location when obtained in EV mode
  useEffect(() => {
    if (gpsLocation && isEVModeActive && mapController.current) {
      console.log('[Geolocation] GPS location obtained, zooming to user location');
      mapController.current.flyTo({
        center: {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          altitude: 5000,
        },
        range: 50000,
        tilt: 0,
        heading: 0,
        roll: 0,
      });
    }
  }, [gpsLocation, isEVModeActive]);

  // Effect: Log geolocation errors
  useEffect(() => {
    if (geoError) {
      console.log('[Geolocation] Error:', geoError);
      // The AI will naturally ask for location via setUserLocation tool as fallback
    }
  }, [geoError]);

  useEffect(() => {
    console.log('[EV Tool] App mounted - DebugPanel test log');
    console.log('[Tool Registry] DebugPanel test log');
  }, []);

  const handleClosePopUp = () => {
    setShowPopUp(false);
  };

  useEffect(() => {
    if (map) {
      const banner = document.querySelector(
        '.vAygCK-api-load-alpha-banner',
      ) as HTMLElement;
      if (banner) {
        banner.style.display = 'none';
      }
    }
  }, [map]);


  // Effect: Reactively render markers and routes on the map.
  // This is the core of the component's "reactive" nature. It listens for
  // changes to the `markers` array in the global Zustand store.
  // Whenever a tool updates this state, this effect triggers, commanding the
  // MapController to clear the map, add the new entities, and then
  // intelligently frame them all in the camera's view, respecting UI padding.
  useEffect(() => {
    if (!mapController.current) return;

    const controller = mapController.current;
    controller.clearMap();

    if (markers.length > 0) {
      controller.addMarkers(markers);
    }

    // Combine all points from markers for framing
    const markerPositions = markers.map(m => m.position);
    const allEntities = [...markerPositions].map(p => ({ position: p }));

    if (allEntities.length > 0 && !preventAutoFrame) {
      controller.frameEntities(allEntities, padding);
    }
  }, [markers, padding, preventAutoFrame]); // Re-run when markers or padding change


  // Effect: Reactively handle direct camera movement requests.
  // This effect listens for changes to `cameraTarget`. Tools can set this state
  // to request a direct camera flight to a specific location or view. Once the
  // flight is initiated, the target is cleared to prevent re-triggering.
  useEffect(() => {
    if (cameraTarget && mapController.current) {
      mapController.current.flyTo(cameraTarget);
      // Reset the target so it doesn't re-trigger on re-renders
      setCameraTarget(null);
      // After a direct camera flight, reset the auto-frame prevention flag
      // to ensure subsequent marker updates behave as expected.
      useMapStore.getState().setPreventAutoFrame(false);
    }
  }, [cameraTarget, setCameraTarget]);


  const handleCameraChange = useCallback((props: Map3DCameraProps) => {
    setViewProps(oldProps => ({ ...oldProps, ...props }));
  }, []);

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
      <ErrorScreen />
      <EVModeToggle />
      <DebugPanel />
      <Sidebar />
      {showPopUp && <PopUp onClose={handleClosePopUp} />}
      <div className="streaming-console">
        {/* Console panel is now styled to be on the right via CSS */}
        <div className="console-panel" ref={consolePanelRef}>
          {isTelemetryPanelOpen && <TelemetryPanel />}
          {/* EV Station Panel removed in favor of chat integration */}
          <StreamingConsole />
          <ControlTray trayRef={controlTrayRef} />
        </div>
        <div className="map-panel">
          <Map3D
            ref={element => setMap(element ?? null)}
            onCameraChange={handleCameraChange}
            {...viewProps}>
          </Map3D>
        </div>
      </div>
    </LiveAPIProvider>
  );
}


/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
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
