# EV Charging Feature Documentation

## Overview

The EV (Electric Vehicle) Charging feature enables Alora to find nearby charging stations, display battery information, calculate range requirements, and provide navigation assistance to charging locations.

---

## Architecture

### Feature Toggle

**Component:** `EVModeToggle.tsx`  
**Position:** Top-left floating button

**States:**
- **Race Mode** (default): Shows telemetry, enables race strategy tools
- **EV Mode**: Shows battery status, enables EV charging tools

**State Management:**
```tsx
const { isEVMode, toggleEVMode } = useEVModeStore();
```

---

## State Management

### EV Mode Store

**Location:** `lib/state/ev-mode-state.ts`  
**Type:** Zustand store

**State Interface:**
```typescript
interface EVModeState {
  isEVMode: boolean;
  vehicleProfile: EVVehicleProfile | null;
  nearbyStations: ChargingStation[];
  routePath: google.maps.LatLng[] | null;
  userLocation: GeolocationCoordinates | null;
  
  // Actions
  toggleEVMode: () => void;
  setVehicleProfile: (profile: EVVehicleProfile) => void;
  setNearbyStations: (stations: ChargingStation[]) => void;
  setRoutePath: (path: google.maps.LatLng[] | null) => void;
  setUserLocation: (location: GeolocationCoordinates | null) => void;
  clearEVData: () => void;
}
```

**Vehicle Profile:**
```typescript
interface EVVehicleProfile {
  make: string;
  model: string;
  year: number;
  batteryCapacityKWh: number;
  currentChargePercent: number;
  estimatedRangeMiles: number;
  preferredConnectorTypes: ConnectorType[];
}
```

**Charging Station:**
```typescript
interface ChargingStation {
  place_id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  vicinity: string;
  opening_hours?: {
    open_now: boolean;
  };
  distanceMiles?: number;
  estimatedRangeMiles?: number;
}
```

---

## Tools Registry

### EV Tool Definitions

**Location:** `lib/tools/ev-tool-registry.ts`

**Available Tools:**

#### 1. `setEVVehicleProfile`

**Purpose:** Set or update the user's EV specifications

**Parameters:**
- `make`: Vehicle manufacturer (e.g., "Tesla")
- `model`: Vehicle model (e.g., "Model 3")
- `year`: Model year
- `batteryCapacityKWh`: Total battery capacity
- `currentChargePercent`: Current charge level (0-100)
- `estimatedRangeMiles`: Estimated range at current charge

**Implementation:**
```tsx
export const setEVVehicleProfile = implementTool({
  declaration: EVToolDeclarations.setEVVehicleProfile,
  handler: async (args, context) => {
    const profile = {
      make: args.make,
      model: args.model,
      year: args.year,
      batteryCapacityKWh: args.batteryCapacityKWh,
      currentChargePercent: args.currentChargePercent,
      estimatedRangeMiles: args.estimatedRangeMiles,
      preferredConnectorTypes: args.preferredConnectorTypes || []
    };
    
    useEVModeStore.getState().setVehicleProfile(profile);
    
    return {
      success: true,
      profile,
      message: `Vehicle profile set: ${profile.year} ${profile.make} ${profile.model}`
    };
  }
);
```

#### 2. `findEVChargingStations`

**Purpose:** Find nearby charging stations based on user location

**Parameters:**
- `radiusMiles`: Search radius (default: 10)
- `minPowerKW`: Minimum charging power (optional)
- `requiredConnectorTypes`: Required connector types (optional)

**Implementation:**
```tsx
export const findEVChargingStations = implementTool(
  declaration: EVToolDeclarations.findEVChargingStations,
  handler: async (args, context) => {
    // Get user location (hybrid: device GPS or agent-prompted)
    const userLocation = await getUserLocation(context);
    
    // Search using Google Places API
    const stations = await searchChargingStations({
      location: userLocation,
      radius: args.radiusMiles * 1609.34, // Convert to meters
      placesLib: context.placesLib
    });
    
    // Calculate distances and range requirements
    const enrichedStations = stations.map(station => ({
      ...station,
      distanceMiles: calculateDistance(userLocation, station.location),
      estimatedRangeMiles: calculateRangeNeeded(vehicle, station)
    }));
    
    useEVModeStore.getState().setNearbyStations(enrichedStations);
    
    return {
      success: true,
      stationsFound: enrichedStations.length,
      stations: enrichedStations
    };
  }
);
```

**Location Logic:**
1. Check device geolocation (`navigator.geolocation`)
2. If unavailable, prompt agent to ask user for location
3. Update `userLocation` in store

#### 3. `showRouteToStation`

**Purpose:** Calculate and display route to a charging station

**Parameters:**
- `place_id`: Google Places ID of the target station

**Implementation:**
```tsx
export const showRouteToStation = implementTool(
  declaration: EVToolDeclarations.showRouteToStation,
  handler: async (args, context) => {
    const { place_id } = args;
    const userLocation = useEVModeStore.getState().userLocation;
    const station = findStationByPlaceId(place_id);
    
    // Use Google Directions API
    const route = await calculateRoute({
      origin: userLocation,
      destination: station.location,
      routesLib: context.routesLib
    });
    
    // Extract path for polyline rendering
    const path = route.routes[0].legs[0].steps.map(step => step.end_location);
    
    useEVModeStore.getState().setRoutePath(path);
    
    return {
      success: true,
      station: station.name,
      distance: route.routes[0].legs[0].distance.text,
      duration: route.routes[0].legs[0].duration.text
    };
  }
);
```

---

## UI Components

### BatteryStatus

**Location:** `components/ev/BatteryStatus.tsx`

**Purpose:** Display current EV battery information

**Data Source:** `useEVModeStore().vehicleProfile`

**Display:**
```tsx
<div className="battery-status">
  <div className="battery-icon">
    <div className="battery-level" style={{width: `${chargePercent}%`}} />
  </div>
  <div className="battery-info">
    <div className="charge-percent">{chargePercent}%</div>
    <div className="estimated-range">{estimatedRange} mi</div>
  </div>
</div>
```

**Styling:** `BatteryStatus.css`
- Glassmorphic card
- Color-coded battery level:
  - Green: > 50%
  - Yellow: 20-50%
  - Red: < 20%

---

### StationList

**Location:** `components/ev/StationList.tsx`

**Purpose:** Display list/carousel of nearby charging stations

**Data Source:** `useEVModeStore().nearbyStations`

**Layouts:**
- **Desktop:** Vertical scrollable list
- **Mobile:** Horizontal swipeable carousel

**Features:**
- Sort by distance
- Filter by connector type
- Show availability status
- Navigate button for each station

**Cell Rendering:**
```tsx
{stations.map(station => (
  <StationCard
    key={station.place_id}
    station={station}
    onNavigate={() => handleNavigate(station.place_id)}
  />
))}
```

---

### StationCard

**Location:** `components/ev/StationCard.tsx`

**Purpose:** Individual charging station display card

**Props:**
```typescript
interface StationCardProps {
  station: ChargingStation;
  onNavigate: () => void;
}
```

**Display Elements:**
1. **Name:** Station name from Google Places
2. **Distance:** Calculated distance from user
3. **Range Needed:** Estimated battery % needed to reach station
4. **Connector Types:** Icons for available connector types
5. **Availability:** Open/closed status
6. **Navigate Button:** Triggers route calculation

**Range Calculation:**
```tsx
const MILES_PER_KWH_ESTIMATE = 3; // Industry average

const rangeNeeded = station.distanceMiles;
const energyNeeded = rangeNeeded / MILES_PER_KWH_ESTIMATE;
const percentNeeded = (energyNeeded / vehicle.batteryCapacityKWh) * 100;
```

**Connector Icons:**
- **J1772:** Standard Level 2
- **CCS:** CCS Combo (DC Fast)
- **CHAdeMO:** Japanese DC Fast
- **Tesla:** Supercharger

---

## Map Integration

### MapController EV Methods

**Location:** `lib/map-controller.ts`

#### Add EV Station Markers

```tsx
addEVStationMarkers(stations: ChargingStation[]): void {
  this.clearEVMarkers();
  
  stations.forEach(station => {
    const marker = new this.maps3dLib.Marker3DElement({
      position: station.location,
      altitudeMode: 'RELATIVE_TO_GROUND',
      extruded: true
    });
    
    // Custom icon: green lightning bolt
    marker.content = createEVMarkerSVG();
    
    // Click handler
    marker.addEventListener('click', () => {
      this.focusOnStation(station);
    });
    
    this.map.append(marker);
    this.evMarkers.push(marker);
  });
}
```

#### Draw Route

```tsx
drawRoute(path: google.maps.LatLng[]): void {
  this.clearRoute();
  
  const polyline = new this.maps3dLib.Polyline3DElement({
    coordinates: path,
    strokeColor: 'rgba(66, 133, 244, 0.8)', // Google Blue
    strokeWidth: 5,
    altitudeMode: 'CLAMP_TO_GROUND'
  });
  
  this.map.append(polyline);
  this.currentRoute = polyline;
}
```

---

## Geolocation System

### Hybrid Geolocation Strategy

**Hook:** `hooks/use-geolocation.ts`

**Strategy:**
1. **Device GPS:** Attempt `navigator.geolocation.getCurrentPosition()`
2. **Agent Prompt:** If GPS fails, agent asks user for location
3. **Manual Input:** User provides city/address via voice or text

**Implementation:**
```tsx
export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(coords);
        useEVModeStore.getState().setUserLocation(coords);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(error.message);
        // Agent will prompt user for location
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);
  
  return { location, error, requestLocation };
}
```

---

## Tool Context

### ToolContext Interface

Passed to all tool handlers:

```typescript
interface ToolContext {
  map: google.maps.maps3d.Map3DElement | null;
  placesLib: google.maps.PlacesLibrary | null;
  routesLib: google.maps.RoutesLibrary | null;
  elevationLib: google.maps.ElevationLibrary | null;
  geocoder: google.maps.Geocoder | null;
  padding: [number, number, number, number];
}
```

Used for:
- **Places API**: Finding charging stations
- **Routes API**: Calculating directions
- **Geocoding**: Converting addresses to coordinates
- **Map**: Rendering markers and routes

---

## API Integration

### Google Places API

**Search Parameters:**
```javascript
{
  type: 'electric_vehicle_charging_station',
  keyword: 'EV charging',
  location: { lat, lng },
  radius: radiusMeters
}
```

**Response Processing:**
1. Filter results by connector type (if specified)
2. Calculate distance from user location
3. Estimate range needed to reach station
4. Sort by distance (nearest first)

### Google Directions API

**Route Request:**
```javascript
{
  origin: userLocation,
  destination: stationLocation,
  travelMode: 'DRIVING',
  drivingOptions: {
    departureTime: new Date(),
    trafficModel: 'bestguess'
  }
}
```

**Response:**
- Total distance
- Estimated duration (with traffic)
- Step-by-step directions
- Polyline path for map rendering

---

## System Prompt Integration

### EV Mode Prompt

When EV mode is active, the system prompt includes:

```markdown
## EV Charging Assistant

You are helping the user find electric vehicle charging stations.

**Available Tools:**
1. setEVVehicleProfile - Get user's EV details
2. findEVChargingStations - Search for nearby stations
3. showRouteToStation - Navigate to a station

**Workflow:**
1. Ask for vehicle details (make, model, current charge)
2. Get user location (or ask if unavailable)
3. Search for nearby stations
4. Present options with StationList component
5. Help user navigate to chosen station

**Key Information:**
- Battery capacity and current charge
- Connector compatibility
- Distance vs. remaining range
- Station availability (open/closed)
```

---

## Testing

### Unit Tests

**Location:** `__tests__/ev-tool-registry.test.ts`

**Coverage:**
- `setEVVehicleProfile` - Profile creation and validation
- `findEVChargingStations` - Station search and filtering
- `showRouteToStation` - Route calculation
- Distance calculations
- Range estimations

**Test Utilities:**
- Mock Google Maps APIs
- Mock geolocation
- Sample station data

### Component Tests

**StationCard:**
- Renders station information correctly
- Displays connector icons
- Handles navigation clicks
- Calculates range needed accurately

**StationList:**
- Renders all stations
- Switches between list/carousel layouts
- Filters by connector type
- Sorts by distance

**BatteryStatus:**
- Displays charge percentage
- Shows estimated range
- Color-codes battery level
- Updates reactively

---

## Configuration

### Constants

**Location:** `lib/constants.ts`

```typescript
export const MILES_PER_KWH_ESTIMATE = 3;
export const DEFAULT_SEARCH_RADIUS_MILES = 10;
export const MAX_STATIONS_TO_DISPLAY = 20;

export const CONNECTOR_TYPES = {
  J1772: 'J1772',
  CCS: 'CCS',
  CHAdeMO: 'CHAdeMO',
  TESLA: 'Tesla'
} as const;
```

### Environment Variables

```bash
VITE_GOOGLE_MAPS_API_KEY=<your_api_key>
```

**Required APIs:**
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API

---

## User Flows

### Finding a Charging Station

1. **User:** "Find charging stations near me"
2. **Agent:** Calls `findEVChargingStations`
3. **System:** Gets location, searches Places API
4. **UI:** Displays `StationList` with results
5. **User:** "Navigate to the closest one"
6. **Agent:** Calls `showRouteToStation` with first station's place_id
7. **System:** Calculates route, draws on map
8. **UI:** Shows route polyline, updates camera to frame route

### Setting Vehicle Profile

1. **User:** "I drive a 2023 Tesla Model 3"
2. **Agent:** "What's your current battery percentage?"
3. **User:** "75%"
4. **Agent:** Calls `setEVVehicleProfile` with details
5. **System:** Stores profile, calculates estimated range
6. **UI:** Shows `BatteryStatus` component

---

## Future Enhancements

- [ ] Real-time station availability via external APIs
- [ ] Charging cost estimates
- [ ] Compare charging speeds (L2 vs DC Fast)
- [ ] Route planning with mid-trip charging stops
- [ ] Save favorite stations
- [ ] Charging history tracking
- [ ] Integration with vehicle APIs (Tesla, Rivian, etc.)
- [ ] Reservation support for charging spots

---

## Troubleshooting

### Common Issues

**"No stations found"**
- Check geolocation permissions
- Increase search radius
- Verify API key has Places API enabled

**"Could not calculate route"**
- Verify Directions API is enabled
- Check that destination is routable
- Ensure user location is available

**"Battery status not showing"**
- Ensure EV mode is enabled
- Check that vehicle profile is set
- Verify `isEVMode` state is true

### Debug Logging

Enable debug logs with:
```typescript
console.log('[EV Tool]', ...);
```

These logs are captured by `DebugPanel` for on-device debugging.
