/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSettings, useUI, useTools, useMapStore } from './state';
import { DEFAULT_LIVE_API_MODEL } from './constants';

describe('State Stores', () => {
    describe('useSettings', () => {
        beforeEach(() => {
            // Reset store to initial state
            useSettings.setState({
                systemPrompt: useSettings.getState().systemPrompt,
                model: useSettings.getState().model,
                voice: useSettings.getState().voice,
                isEasterEggMode: false,
                template: 'race-strategy',
            });
        });

        it('should have default values', () => {
            const state = useSettings.getState();

            expect(state.systemPrompt).toBeDefined();
            expect(state.model).toBeDefined();
            expect(state.voice).toBeDefined();
            expect(state.isEasterEggMode).toBe(false);
            expect(state.template).toBe('race-strategy');
        });

        it('should update system prompt', () => {
            const newPrompt = 'Custom system prompt';
            useSettings.getState().setSystemPrompt(newPrompt);

            expect(useSettings.getState().systemPrompt).toBe(newPrompt);
        });

        it('should update model', () => {
            const newModel = 'gemini-2.0-flash';
            useSettings.getState().setModel(newModel);

            expect(useSettings.getState().model).toBe(newModel);
        });

        it('should update voice', () => {
            const newVoice = 'Puck';
            useSettings.getState().setVoice(newVoice);

            expect(useSettings.getState().voice).toBe(newVoice);
        });

        it('should switch template', () => {
            useSettings.getState().setTemplate('ev-assistant');

            const state = useSettings.getState();
            expect(state.template).toBe('ev-assistant');
            expect(state.systemPrompt).toBeDefined(); // Should update to EV prompt
        });

        it('should activate Easter egg mode', () => {
            useSettings.getState().activateEasterEggMode();

            const state = useSettings.getState();
            expect(state.isEasterEggMode).toBe(true);
            expect(state.activePersona).toBeDefined();
            expect(state.model).toBe(DEFAULT_LIVE_API_MODEL);
        });

        it('should not activate Easter egg mode twice', () => {
            useSettings.getState().activateEasterEggMode();
            const firstState = useSettings.getState();

            useSettings.getState().activateEasterEggMode();
            const secondState = useSettings.getState();

            expect(firstState).toEqual(secondState);
        });

        it('should set persona', () => {
            const persona = 'ClueMaster Cory, the Scavenger Hunt Creator';
            useSettings.getState().setPersona(persona);

            const state = useSettings.getState();
            expect(state.activePersona).toBe(persona);
            expect(state.systemPrompt).toBeDefined();
            expect(state.voice).toBeDefined();
        });
    });

    describe('useUI', () => {
        beforeEach(() => {
            // Reset to initial state
            useUI.setState({
                isSidebarOpen: false,
                showSystemMessages: false,
                isTelemetryPanelOpen: true,
            });
        });

        it('should have default values', () => {
            const state = useUI.getState();

            expect(state.isSidebarOpen).toBe(false);
            expect(state.showSystemMessages).toBe(false);
            expect(state.isTelemetryPanelOpen).toBe(true);
        });

        it('should toggle sidebar', () => {
            useUI.getState().toggleSidebar();
            expect(useUI.getState().isSidebarOpen).toBe(true);

            useUI.getState().toggleSidebar();
            expect(useUI.getState().isSidebarOpen).toBe(false);
        });

        it('should toggle system messages', () => {
            useUI.getState().toggleShowSystemMessages();
            expect(useUI.getState().showSystemMessages).toBe(true);

            useUI.getState().toggleShowSystemMessages();
            expect(useUI.getState().showSystemMessages).toBe(false);
        });

        it('should toggle telemetry panel', () => {
            useUI.getState().toggleTelemetryPanel();
            expect(useUI.getState().isTelemetryPanelOpen).toBe(false);

            useUI.getState().toggleTelemetryPanel();
            expect(useUI.getState().isTelemetryPanelOpen).toBe(true);
        });
    });

    describe('useTools', () => {
        beforeEach(() => {
            // Reset to initial state
            useTools.setState({
                template: 'race-strategy',
                tools: useTools.getState().tools,
            });
        });

        it('should have default template', () => {
            const state = useTools.getState();

            expect(state.template).toBe('race-strategy');
            expect(state.tools).toBeDefined();
            expect(Array.isArray(state.tools)).toBe(true);
        });

        it('should switch to EV template', () => {
            useTools.getState().setTemplate('ev-assistant');

            const state = useTools.getState();
            expect(state.template).toBe('ev-assistant');
            expect(state.tools).toBeDefined();
        });

        it('should sync template with useSettings', () => {
            useTools.getState().setTemplate('ev-assistant');

            expect(useSettings.getState().template).toBe('ev-assistant');
        });

        it('should load tools for different templates', () => {
            useTools.setState({ template: 'race-strategy' });
            const raceTools = useTools.getState().tools;

            useTools.getState().setTemplate('ev-assistant');
            const evTools = useTools.getState().tools;

            // Both templates should have tools
            expect(raceTools.length).toBeGreaterThan(0);
            expect(evTools.length).toBeGreaterThan(0);
        });
    });

    describe('useMapStore', () => {
        beforeEach(() => {
            // Reset to initial state
            useMapStore.setState({
                markers: [],
                cameraTarget: null,
                preventAutoFrame: false,
            });
        });

        it('should have default values', () => {
            const state = useMapStore.getState();

            expect(state.markers).toEqual([]);
            expect(state.cameraTarget).toBeNull();
            expect(state.preventAutoFrame).toBe(false);
        });

        it('should set markers', () => {
            const markers = [
                {
                    position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                    label: 'Test Marker',
                    showLabel: true,
                },
            ];

            useMapStore.getState().setMarkers(markers);

            expect(useMapStore.getState().markers).toEqual(markers);
        });

        it('should clear markers', () => {
            const markers = [
                {
                    position: { lat: 34.1458, lng: -83.8177, altitude: 0 },
                    label: 'Test Marker',
                    showLabel: true,
                },
            ];

            useMapStore.getState().setMarkers(markers);
            useMapStore.getState().clearMarkers();

            expect(useMapStore.getState().markers).toEqual([]);
        });

        it('should set camera target', () => {
            const target = {
                center: { lat: 34.1458, lng: -83.8177, altitude: 500 },
                range: 1000,
                tilt: 45,
                heading: 0,
            };

            useMapStore.getState().setCameraTarget(target);

            expect(useMapStore.getState().cameraTarget).toEqual(target);
        });

        it('should clear camera target', () => {
            const target = {
                center: { lat: 34.1458, lng: -83.8177, altitude: 500 },
                range: 1000,
                tilt: 45,
                heading: 0,
            };

            useMapStore.getState().setCameraTarget(target);
            useMapStore.getState().setCameraTarget(null);

            expect(useMapStore.getState().cameraTarget).toBeNull();
        });

        it('should set preventAutoFrame', () => {
            useMapStore.getState().setPreventAutoFrame(true);
            expect(useMapStore.getState().preventAutoFrame).toBe(true);

            useMapStore.getState().setPreventAutoFrame(false);
            expect(useMapStore.getState().preventAutoFrame).toBe(false);
        });
    });
});
