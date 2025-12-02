# Deferred Test Cases

This document tracks test cases that were identified but deferred due to implementation complexity or lower priority.

---

## Audio System Tests (Deferred - Phase 2)

**Reason for Deferral:** Complex mocking requirements for AudioWorklet API and Web Audio API components. High risk of brittle tests with low value.

**Alternative Approach:** Test audio functionality through integration tests and UI component tests.

### AudioRecorder Tests
- [ ] Initialization with sample rate
- [ ] Microphone permission request
- [ ] Audio stream creation
- [ ] PCM16 conversion
- [ ] Event emission (data, volume)
- [ ] Cleanup on stop
- [ ] Error handling for missing permissions

### AudioStreamer Tests
- [ ] PCM16 to Float32 conversion
- [ ] Audio buffering
- [ ] Playback scheduling with look-ahead
- [ ] Initial buffer time (100ms)
- [ ] Volume control via gain node
- [ ] Stop and cleanup
- [ ] Resume from suspended state
- [ ] Worklet integration

### Audio Context Utility Tests
- [ ] Singleton pattern
- [ ] State management (suspended/running)
- [ ] Browser compatibility

---

## Live API Client Tests (Deferred - Phase 2)

**Reason for Deferral:** Complex mocking of Google GenAI SDK. TypeScript type mismatches with partial mocks.

**Alternative Approach:** Test Live API functionality through E2E tests or integration tests with real API calls in test environment.

### GenAILiveClient Tests
- [ ] Connection lifecycle (connect, disconnect)
- [ ] WebSocket message handling
- [ ] Event emission (open, close, error, setupcomplete, toolcall, etc.)
- [ ] Audio streaming (send/receive)
- [ ] Text message sending
- [ ] Tool response handling
- [ ] Transcription events (input/output)
- [ ] Turn complete events
- [ ] Error recovery

---

## Tool Registry Tests (Partially Deferred - Phase 2)

**Status:** EV tools tested, Race tools not tested

### Race Strategy Tools (Not Tested)
- [ ] `analyzeTelemetry` - Analyze telemetry data
- [ ] `suggestStrategy` - Suggest race strategy
- [ ] `updateRacePosition` - Update car position on track
- [ ] Tool context injection (map, placesLib, routesLib)
- [ ] Error handling for missing context

### Maps Grounding Tool (Not Tested)
- [ ] Place search functionality
- [ ] Grounding metadata handling
- [ ] API error handling

### Tool Registry Core (Not Tested)
- [ ] Mode switching (race ↔ EV)
- [ ] Tool declaration validation
- [ ] Dynamic tool loading

---

## Integration Tests (Future - Phase 6)

**Reason for Deferral:** Requires setup of integration test infrastructure (Playwright, etc.)

### Voice Command Flow
- [ ] User speaks → Audio recording → Live API → Tool execution → State update → UI render
- [ ] Multi-turn conversations
- [ ] Tool call chains
- [ ] Error recovery in conversation flow

### EV Mode Flow
- [ ] Toggle EV mode → Tool registry switches → UI updates
- [ ] Set vehicle profile → Store updates → BatteryStatus renders
- [ ] Search stations → API call → Results in StationList
- [ ] Show route → Map updates → Polyline rendered

### Race Mode Flow
- [ ] Load telemetry → Store updates → TelemetryPanel renders
- [ ] Analyze telemetry → Suggest strategy → Display in console
- [ ] Update car position → Map marker moves → Camera follows

### Map Interaction Flow
- [ ] Click map → Event handler → Camera moves
- [ ] Click marker → Focus on location → Camera zooms
- [ ] Add polyline → Map updates → Polyline visible

---

## Notes

- **Priority:** Focus on state stores, UI components, and hooks first (Phases 3-5)
- **Integration tests** should be implemented before returning to complex unit tests
- **Audio and Live API** systems are working in production, so tests can be deferred
- Consider using **Playwright** or **Cypress** for E2E tests when implementing Phase 6
