# Alora Documentation Index

Welcome to the Alora documentation! This index will guide you to the right documentation file based on what you need.

---

## Quick Links

- **[UI Components](#ui-components)** - Interface design, HUD components, styling
- **[EV Charging](#ev-charging)** - Electric vehicle features, charging stations
- **[Architecture](#architecture)** - System design, data flow, project structure
- **[State Management](#state-management)** - Zustand stores, patterns, best practices
- **[API Integration](#api-integration)** - Live API, WebSocket, audio streaming

---

## Documentation Files

### UI Components
**File:** [`ui-components.md`](./ui-components.md)

**Topics Covered:**
- Core layout architecture (App container, map background, UI overlay)
- HUD components (TelemetryPanel, StreamingConsole, ControlTray)
- EV UI components (StationList, StationCard, BatteryStatus)
- Styling system and glassmorphism
- GSAP animations
- Responsive design
- Accessibility features

**When to read:**
- Designing new UI components
- Understanding the HUD layout
- Implementing animations
- Working on mobile responsiveness
- Styling new features

---

### EV Charging
**File:** [`ev-charging.md`](./ev-charging.md)

**Topics Covered:**
- EV mode toggle and state management
- Vehicle profile configuration
- Charging station search and display
- Route calculation and navigation
- Google Places/Directions API integration
- Geolocation strategies
- Tool definitions and handlers

**When to read:**
- Adding EV features
- Debugging charging station search
- Understanding tool context
- Integrating with Google Maps APIs
- Implementing new EV tools

---

### Architecture
**File:** [`architecture.md`](./architecture.md)

**Topics Covered:**
- Technology stack
- Project structure
- Application flow (initialization, rendering)
- Core systems (MapController, Audio, Tool Registry)
- Data flow patterns
- Performance optimizations
- Security (Network Security Config, API keys)
- Build & deployment

**When to read:**
- Understanding the big picture
- Onboarding new developers
- Making architectural decisions
- Optimizing performance
- Setting up the development environment
- Deploying to production

---

### State Management
**File:** [`state-management.md`](./state-management.md)

**Topics Covered:**
- Zustand store pattern
- Core stores (Map, Telemetry, UI, Log, EVMode, Settings)
- Advanced patterns (computed values, subscriptions, middleware)
- Store communication
- React integration
- Testing stores
- Performance optimization

**When to read:**
- Creating new stores
- Managing application state
- Debugging state updates
- Optimizing re-renders
- Testing state logic
- Migrating from Redux/Context

---

### API Integration
**File:** [`api-integration.md`](./api-integration.md)

**Topics Covered:**
- LiveAPIContext setup
- GenAILiveClient configuration
- Audio streaming (input/output)
- Tool calling system
- System prompt generation
- Message protocol
- Error handling
- Performance optimization
- Security

**When to read:**
- Integrating voice features
- Understanding audio flow
- Implementing new tools
- Debugging WebSocket issues
- Handling API errors
- Optimizing audio performance

---

## Common Tasks

### Adding a New Feature

1. **Plan the feature:**
   - Read [Architecture](./architecture.md) to understand the system
   - Choose the right store from [State Management](./state-management.md)

2. **Implement the UI:**
   - Follow patterns in [UI Components](./ui-components.md)
   - Use glassmorphism styling
   - Ensure mobile responsiveness

3. **Add tools (if voice-controlled):**
   - Follow tool patterns in [API Integration](./api-integration.md)
   - Use examples from [EV Charging](./ev-charging.md)

4. **Test:**
   - Unit tests for stores
   - Component tests for UI
   - Integration tests for tool handlers

### Debugging Issues

**UI not rendering correctly:**
- Check [UI Components](./ui-components.md) for layout patterns
- Verify pointer-events strategy
- Inspect z-index layers

**State not updating:**
- Review [State Management](./state-management.md) for store patterns
- Check subscriptions and selectors
- Verify actions are being called

**Voice features not working:**
- Read [API Integration](./api-integration.md) for connection flow
- Check microphone permissions
- Verify AudioContext state (mobile)
- Inspect WebSocket messages

**Tools not executing:**
- Check tool declaration in [API Integration](./api-integration.md)
- Verify tool context is passed correctly
- Review [EV Charging](./ev-charging.md) for tool examples

**Map interactions failing:**
- Check MapController in [Architecture](./architecture.md)
- Verify Google Maps libraries are loaded
- Review tool context setup

### Performance Optimization

**UI feels slow:**
- Review optimization tips in [UI Components](./ui-components.md)
- Check GSAP animation performance
- Optimize React re-renders

**State updates lagging:**
- Read performance section in [State Management](./state-management.md)
- Use selective subscriptions
- Batch state updates

**Audio latency:**
- Review buffering strategy in [API Integration](./api-integration.md)
- Check AudioContext state
- Verify chunk sizes

**Map rendering slow:**
- Check [Architecture](./architecture.md) for map optimization
- Consider marker clustering
- Reduce polyline complexity

---

## Code Examples

### Creating a New Store

```typescript
// lib/state/my-feature-state.ts
import { create } from 'zustand';

interface MyFeatureState {
  value: number;
  setValue: (value: number) => void;
  reset: () => void;
}

export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  value: 0,
  setValue: (value) => set({ value }),
  reset: () => set({ value: 0 })
}));
```

See full patterns in [State Management](./state-management.md).

### Creating a New Tool

```typescript
// lib/tools/my-tool.ts
import { z } from 'zod';

const myToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional()
});

export const myTool = implementTool({
  declaration: {
    name: 'myTool',
    description: 'What this tool does',
    parameters: zodToJsonSchema(myToolSchema)
  },
  handler: async (args, context) => {
    const validatedArgs = myToolSchema.parse(args);
    // Implement logic...
    return { success: true, data: result };
  }
});
```

See full patterns in [API Integration](./api-integration.md) and [EV Charging](./ev-charging.md).

### Creating a New UI Component

```tsx
// components/MyComponent.tsx
import { useMyFeatureStore } from '@/lib/state/my-feature-state';

export default function MyComponent() {
  const value = useMyFeatureStore(state => state.value);
  
  return (
    <div className="my-component">
      <div className="glassmorphic-card">
        Value: {value}
      </div>
    </div>
  );
}

// components/MyComponent.css
.my-component {
  position: absolute;
  top: 1rem;
  left: 1rem;
}

.glassmorphic-card {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 16px;
  pointer-events: auto;
}
```

See full patterns in [UI Components](./ui-components.md).

---

## Development Workflow

### 1. Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

See [Architecture](./architecture.md) for full setup instructions.

### 2. Development

- Create feature branch: `git checkout -b feature/my-feature`
- Follow code conventions in [Architecture](./architecture.md)
- Write tests as you go

### 3. Testing

```bash
# Run unit tests
npm test

# Build for production
npm run build
```

### 4. Documentation

- Update relevant `.md` files
- Add code examples
- Document breaking changes

### 5. Deployment

```bash
# Build web assets
npm run build

# Sync to native platforms
npx cap sync

# Open native IDEs
npx cap open android
npx cap open ios
```

See [Architecture](./architecture.md) for deployment details.

---

## Contributing

### Documentation Style Guide

**Markdown formatting:**
- Use `###` for main sections
- Use code blocks with language specification
- Include examples for concepts
- Link to related documentation

**Code examples:**
- Show complete, working examples
- Include comments for clarity
- Highlight best practices
- Show anti-patterns (❌) vs good patterns (✅)

**Organization:**
- Start with overview
- Progress from simple to complex
- Include "When to read" sections
- Cross-reference related docs

### Updating Documentation

**When to update:**
- Adding new features
- Changing APIs or patterns
- Fixing bugs (if documented)
- Refactoring code structure

**What to update:**
- Relevant `.md` file(s)
- Code examples
- Diagrams (if applicable)
- This index (if adding new files)

---

## Additional Resources

### Diagrams

The `diagrams/` folder contains visual representations of:
- System architecture
- Data flow
- Component hierarchy
- API interactions

### External Links

- [Google Gemini Live API](https://ai.google.dev/api/multimodal-live)
- [Google Maps Platform](https://developers.google.com/maps)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Documentation](https://react.dev)
- [GSAP Documentation](https://greensock.com/docs/)
- [Vite Documentation](https://vitejs.dev)

---

## Getting Help

**Common issues:**
1. Check the relevant documentation file first
2. Search for error messages in the codebase
3. Review recent Git commits for related changes
4. Check the DebugPanel for runtime logs

**Still stuck?**
- Open an issue on GitHub
- Include error messages and logs
- Describe steps to reproduce
- Note your environment (OS, browser, etc.)

---

## Documentation Roadmap

### Planned Additions

- [ ] **Mobile Development Guide** - Capacitor setup, native plugins
- [ ] **Testing Guide** - Unit, integration, and E2E tests
- [ ] **Deployment Guide** - CI/CD, app store submission
- [ ] **Accessibility Guide** - WCAG compliance, screen readers
- [ ] **Performance Guide** - Profiling, optimization techniques

### Improvement Ideas

- [ ] Add more code examples
- [ ] Create video tutorials
- [ ] Interactive API explorer
- [ ] Component playground
- [ ] Architecture diagrams (Mermaid)

---

## Version History

- **v1.0** (Dec 2025): Initial comprehensive documentation
  - UI Components
  - EV Charging
  - Architecture
  - State Management
  - API Integration

---

**Last Updated:** December 2, 2025  
**Maintained By:** Alora Development Team
