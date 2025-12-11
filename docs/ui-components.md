# Alora UI Components Documentation

## Overview

Alora is a voice-enabled, map-centric AI assistant application with a futuristic HUD (Heads-Up Display) interface. The UI is designed to be mobile-first, with glassmorphic overlays that don't obstruct the 3D map view.

---

## Core Layout Architecture

### App Container Structure

#### `App.tsx`
The main application component that orchestrates all UI elements.

**Layout Hierarchy:**
```
LiveAPIProvider
├── ErrorScreen (full-screen overlay)
├── DebugPanel (conditional overlay)
├── Sidebar (drawer)
├── PopUp (welcome modal)
└── .app-container
    ├── .map-background (z-index: 0)
    │   └── Map3D
    └── .ui-overlay (z-index: 10, pointer-events: none)
        ├── TelemetryPanel (conditional)
        ├── StreamingConsole
        └── ControlTray
```

**Key Design Principles:**
- **Full-screen map**: The 3D map fills the entire viewport
- **Floating overlays**: UI elements float above the map with glassmorphism
- **Pointer events**: Containers have `pointer-events: none`, children have `pointer-events: auto`
- **Mobile-first**: Responsive design prioritizing touch interfaces

---

## HUD Components

### 1. TelemetryPanel

**Location:** `components/telemetry/TelemetryPanel.tsx`  
**Purpose:** Displays real-time racing telemetry data

**Position:** Top-right floating card

**Data Displayed:**
- **Speed** (MPH)
- **Gear** (with red highlight)
- **Lap Delta** (±seconds, color-coded)

**Styling:**
- Background: `rgba(0, 0, 0, 0.7)` with `blur(12px)`
- Border: `1px solid rgba(255, 255, 255, 0.15)`
- Border radius: `16px`

**Animation:**
- **Entry:** Slides down from off-screen (`y: -100, opacity: 0` → `y: 0, opacity: 1`)
- **Duration:** 1s with `power3.out` easing

**State Management:**
Uses `useTelemetryStore` from Zustand.

---

### 2. StreamingConsole

**Location:** `components/streaming-console/StreamingConsole.tsx`  
**Purpose:** Displays agent messages in a transient "Jarvis-style" HUD

**Behavior:**
- Shows **only the latest relevant message** (user, agent, or tool output)
- **Auto-hide**: Messages fade out after 5 seconds of inactivity
- **Processing indicator**: Shows "Processing..." when awaiting function response

**Position:** Bottom-center, above ControlTray

**Message Types:**
1. **User messages**: Blue accent
2. **Agent messages**: Standard styling
3. **System messages**: Includes tool outputs (StationList, BatteryStatus)

**Styling:**
- Container: `.hud-console-container`
- Card: `.hud-card` with glassmorphism
- Background: `rgba(0, 0, 0, 0.8)` with `blur(12px)`

**Animations:**
- **Entry:** `y: 20, opacity: 0` → `y: 0, opacity: 1` (0.4s)
- **Exit:** Opacity fades to 0 (0.3s)

**Special Components:**
- **StationList**: EV charging stations (horizontal carousel on mobile)
- **BatteryStatus**: EV battery information

---

### 3. ControlTray

**Location:** `components/ControlTray.tsx`  
**Purpose:** Main user interaction hub ("Arc Reactor" control center)

**Layout:** Floating cluster at bottom-center

**Components:**

#### a. Mic Button (Primary)
- **Size:** 80px circular button
- **Icon:** `mic` when active, `mic_off` when muted/disconnected
- **States:**
  - **Idle**: Static with subtle shadow
  - **Connected (muted)**: Subtle pulse (scale 1.02, 2s duration)
  - **Active**: Breathing red glow (scale 1.05, box-shadow animation, 1.5s)

**GSAP Animation:**
```tsx
useGSAP(() => {
  if (connected && !muted) {
    // Active breathing glow
    gsap.to(micButtonRef.current, {
      scale: 1.05,
      boxShadow: '0 0 30px rgba(235, 10, 30, 0.8), inset 0 0 25px rgba(235, 10, 30, 0.3)',
      duration: 1.5,
      yoyo: true,
      repeat: -1
    });
  }
}, [connected, muted]);
```

**Functionality:**
- **Not connected**: Requests mic permission → connects to Live API
- **Connected**: Toggles mute/unmute

#### b. Keyboard Button (Secondary)
- **Purpose:** Toggles text input overlay
- **Icon:** `keyboard`
- **Size:** 48px

#### c. Tools/Menu Button (Secondary)
- **Purpose:** Opens Quick Actions popover
- **Icon:** `more_vert`
- **Size:** 48px

**Quick Actions Menu:**
- **Toggle Telemetry**: Show/hide TelemetryPanel
- **Settings**: Opens Sidebar
- **Debug Logs**: Toggles DebugPanel

**Click-outside handling:**
```tsx
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMenuOpen(false);
    }
  };
  if (isMenuOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
}, [isMenuOpen]);
```

#### d. Text Input Overlay
- **Trigger:** Keyboard button
- **Position:** Above control tray
- **Styling:** Glassmorphic card with rounded input field
- **Classes:** `.hud-text-input-container`, `.floating-prompt-form`

---

### 4. DebugPanel

**Location:** `components/DebugPanel.tsx`  
**Purpose:** Developer console for debugging logs

**Activation:**
- Via Quick Actions menu → "Debug Logs"
- Controlled by `showDebugPanel` state in App.tsx

**Features:**
- Intercepts `console.log`, `console.warn`, `console.error`
- Filters for specific patterns: `[EV Tool]`, `[Tool Registry]`, `Error`
- Shows timestamp, log level, and message
- **Actions**: Clear logs, Close panel

**Props:**
```tsx
interface DebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}
```

---

### 5. Sidebar

**Location:** `components/Sidebar.tsx`  
**Purpose:** Application settings and configuration

**Activation:**
- Via Quick Actions menu → "Settings"
- Controlled by `useUI.toggleSidebar()`

**Content:**
- Model selection
- API configuration
- User preferences

---

### 6. ErrorScreen

**Location:** `components/error-screen/ErrorScreen.tsx`  
**Purpose:** Full-screen error display

**Triggers:**
- API connection failures
- Critical application errors

---

### 7. PopUp (Welcome Screen)

**Location:** `components/PopUp.tsx`  
**Purpose:** Initial welcome modal with instructions

**Behavior:**
- Shows on first visit
- Can be dismissed
- State managed via `showPopUp` in App.tsx

---

## EV Components

### StationList

**Location:** `components/ev/StationList.tsx`  
**Purpose:** Display nearby EV charging stations

**Layout:**
- **Desktop**: Vertical list
- **Mobile**: Horizontal carousel

**Features:**
- Station cards with distance, availability, connector types
- Navigate button for each station
- Powered by Google Places API

### StationCard

**Location:** `components/ev/StationCard.tsx`  
**Purpose:** Individual charging station display

**Data:**
- Station name
- Distance from user
- Estimated range needed
- Connector types (J1772, CCS, CHAdeMO, Tesla)
- Opening hours

### BatteryStatus

**Location:** `components/ev/BatteryStatus.tsx`  
**Purpose:** Display current EV battery information

**Data:**
- Current charge percentage
- Estimated range
- Visual battery indicator

---

## Styling System

### Color Palette

**GR Racing Red:**
- `--gr-red`: `rgb(235, 10, 30)`
- Used for: Active states, gear indicator, brand accents

**Glassmorphism:**
- Background: `rgba(0, 0, 0, 0.7)`
- Backdrop filter: `blur(10-12px)`
- Border: `1px solid rgba(255, 255, 255, 0.1-0.15)`

### CSS Architecture

**Main Stylesheet:** `index.css` (27.5KB)

**Sections:**
1. Global reset and variables
2. Layout classes (`.app-container`, `.map-background`, `.ui-overlay`)
3. HUD components (`.hud-mic`, `.hud-button`, `.hud-card`)
4. Telemetry panel
5. Streaming console
6. Control tray
7. Text input and forms
8. Responsive breakpoints

**Key Classes:**
- `.hud-console-container`: Transient message container
- `.hud-card`: Glassmorphic message card
- `.hud-mic`: Primary mic button
- `.hud-button`: Secondary action buttons
- `.hud-quick-menu`: Popover menu
- `.floating-prompt-form`: Text input overlay
- `.telemetry-panel`: Racing data display
- `.station-list`: EV charging stations

### Responsive Design

**Mobile Breakpoint:** `@media (max-width: 768px)`

**Mobile Adjustments:**
- Smaller telemetry panel
- Horizontal station carousel
- Reduced padding and margins
- Touch-optimized button sizes (minimum 48px)

**Landscape Orientation:** `@media (orientation: landscape) and (max-height: 768px)`
- Adjusted panel positioning for landscape mobile

---

## Animation System

### GSAP Animations

**Installed Packages:**
- `gsap`
- `@gsap/react`

**Animated Components:**

1. **Mic Button** (ControlTray)
   - Idle → Connected → Active state transitions
   - Breathing glow effect

2. **TelemetryPanel**
   - Slide-down entrance animation
   - `gsap.fromTo()` with `y` and `opacity`

3. **StreamingConsole**
   - Message card entry/exit
   - Smooth fade transitions

### CSS Animations

**Removed in favor of GSAP:**
- ~~`reactor-pulse` keyframes~~ (now handled by GSAP)

**Remaining CSS Animations:**
- Button press effects (`:active` pseudo-class)
- Hover transitions
- `.slide-up-fade` for HUD card entry

---

## Accessibility Features

**Keyboard Navigation:**
- Form inputs are keyboard accessible
- Buttons have clear focus states

**Touch Targets:**
- Minimum 48px for mobile buttons
- Clear tap feedback (scale on active)

**Screen Reader Support:**
- Semantic HTML elements
- Icon labels with Material Symbols

**Visual Feedback:**
- Color-coded lap delta (green = faster, red = slower)
- Pulsing animations indicate active states
- Loading indicators during processing

---

## State Integration

All UI components integrate with Zustand stores:

- **`useMapStore`**: Map markers, camera position
- **`useTelemetryStore`**: Racing data
- **`useUI`**: Sidebar, telemetry panel visibility
- **`useLogStore`**: Chat messages, conversation history
- **`useEVModeStore`**: EV mode, battery, stations
- **`useSettings`**: User preferences, model selection

---

## Voice Integration

**Live API Context:**
- Provider: `LiveAPIProvider` in App.tsx
- Hook: `useLiveAPIContext()` in components
- Audio streaming handled by `AudioStreamer` class

**Mic Button Flow:**
1. User clicks mic
2. Request `getUserMedia({ audio: true })`
3. Resume AudioContext if suspended (critical for mobile)
4. Call `connect()` to start Live API session
5. Audio streams via `audioRecorder` and `audioStreamer`

---

## Best Practices

### Pointer Events Strategy

**Containers:** `pointer-events: none`  
**Interactive Children:** `pointer-events: auto`

This allows clicks to pass through transparent areas to the map below.

### Mobile Audio

**Critical for iOS/Android:**
```tsx
// Request mic permission synchronously in click handler
const handleMicClick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Then connect...
};
```

### State Management

- Use Zustand's `getState()` for imperative updates
- Subscribe with hooks for reactive UI: `const data = useTelemetryStore(state => state.data)`

### CSS Organization

- Component-specific styles in separate files (e.g., `TelemetryPanel.css`)
- Global HUD styles in `index.css`
- Use CSS variables for brand colors

---

## File Structure

```
components/
├── telemetry/
│   ├── TelemetryPanel.tsx
│   └── TelemetryPanel.css
├── streaming-console/
│   └── StreamingConsole.tsx
├── ev/
│   ├── StationList.tsx
│   ├── StationCard.tsx
│   ├── BatteryStatus.tsx
│   └── *.css files
├── ControlTray.tsx
├── DebugPanel.tsx
├── Sidebar.tsx
├── ErrorScreen.tsx
└── PopUp.tsx
```

---

## Future Enhancements

- [ ] Voice command recognition for UI controls
- [ ] Haptic feedback for mobile
- [ ] Dark/light mode toggle
- [ ] Customizable HUD layout
- [ ] Offline mode support
