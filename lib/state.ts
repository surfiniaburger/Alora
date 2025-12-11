/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { raceTools } from './tools/race-tools';
import { evAssistantTools } from './tools/ev-assistant-tools';

export type Template = 'race-strategy' | 'ev-assistant';

const toolsets: Record<Template, FunctionCall[]> = {
  'race-strategy': raceTools,
  'ev-assistant': evAssistantTools,
};

import { useEVModeStore } from './ev-mode-state';

import {
  RACE_ENGINEER_PROMPT,
  SCAVENGER_HUNT_PROMPT,
  EV_ASSISTANT_PROMPT,
} from './constants.ts';
const systemPrompts: Record<Template, string> = {
  'race-strategy': RACE_ENGINEER_PROMPT,
  'ev-assistant': EV_ASSISTANT_PROMPT,
};

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  GenerateContentResponse,
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
  GroundingChunk,
} from '@google/genai';
import { Map3DCameraProps } from '@/components/map-3d';

/**
 * Personas
 */
export const SCAVENGER_HUNT_PERSONA =
  'ClueMaster Cory, the Scavenger Hunt Creator';

export const personas: Record<string, { prompt: string; voice: string }> = {
  [SCAVENGER_HUNT_PERSONA]: {
    prompt: SCAVENGER_HUNT_PROMPT,
    voice: 'Puck',
  },
};

/**
 * Settings
 */
import { persist } from 'zustand/middleware';

export const useSettings = create(
  persist<{
    systemPrompt: string;
    model: string;
    voice: string;
    isEasterEggMode: boolean;
    activePersona: string;
    template: Template;
    setSystemPrompt: (prompt: string) => void;
    setModel: (model: string) => void;
    setVoice: (voice: string) => void;
    setPersona: (persona: string) => void;
    setTemplate: (template: Template) => void;
    activateEasterEggMode: () => void;
  }>(
    (set) => ({
      systemPrompt: systemPrompts['race-strategy'],
      model: DEFAULT_LIVE_API_MODEL,
      voice: DEFAULT_VOICE,
      isEasterEggMode: false,
      activePersona: SCAVENGER_HUNT_PERSONA,
      template: 'race-strategy',
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
      setModel: (model) => set({ model }),
      setVoice: (voice) => set({ voice }),
      setPersona: (persona: string) => {
        if (personas[persona]) {
          set({
            activePersona: persona,
            systemPrompt: personas[persona].prompt,
            voice: personas[persona].voice,
          });
        }
      },
      setTemplate: (template: Template) => {
        console.log('[Settings] setTemplate called:', template);
        console.trace('[Settings] setTemplate trace');
        set({
          template,
          systemPrompt: systemPrompts[template],
        });
      },
      activateEasterEggMode: () => {
        set((state) => {
          if (!state.isEasterEggMode) {
            const persona = SCAVENGER_HUNT_PERSONA;
            return {
              isEasterEggMode: true,
              activePersona: persona,
              systemPrompt: personas[persona].prompt,
              voice: personas[persona].voice,
              model: DEFAULT_LIVE_API_MODEL,
            };
          }
          return {};
        });
      },
    }),
    {
      name: 'alora-settings',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          if (persistedState?.model === 'gemini-live-2.5-flash-preview') {
            persistedState.model = DEFAULT_LIVE_API_MODEL;
          }
        }
        return persistedState;
      },
      },
      partialize: (state) => ({
        systemPrompt: state.systemPrompt,
        model: state.model,
        voice: state.voice,
        isEasterEggMode: state.isEasterEggMode,
        // template: state.template, // DO NOT PERSIST TEMPLATE (Causes startup desync)
        // Methods are not persisted, but we need to satisfy the type if strict
        // Alternatively, cast to unknown as any keyof State
      } as any),
    }
  )
);

/**
 * UI
 */
// App Mode Definition
export type AppMode = 'RACE' | 'EV' | 'INSPECTOR';

export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  showSystemMessages: boolean;
  toggleShowSystemMessages: () => void;
  isTelemetryPanelOpen: boolean;
  toggleTelemetryPanel: () => void;
  activeMode: AppMode;
  setMode: (mode: AppMode) => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  showSystemMessages: false,
  toggleShowSystemMessages: () =>
    set(state => ({ showSystemMessages: !state.showSystemMessages })),
  isTelemetryPanelOpen: true,
  toggleTelemetryPanel: () => set(state => ({ isTelemetryPanelOpen: !state.isTelemetryPanelOpen })),
  activeMode: 'RACE', // Default
  setMode: (mode) => {
    set({ activeMode: mode });

    // Centralized Template Sync
    // This replaces the useEffect in App.tsx
    const targetTemplate: Template = mode === 'RACE' ? 'race-strategy' : 'ev-assistant';
    const currentTemplate = useTools.getState().template;

    if (currentTemplate !== targetTemplate) {
      console.log(`[State] Auto-switching template to ${targetTemplate} for mode ${mode}`);
      useTools.getState().setTemplate(targetTemplate);
    }

    // Sync EV Mode Store
    const isEV = mode === 'EV';
    if (useEVModeStore.getState().isEVModeActive !== isEV) {
      console.log(`[State] Auto-switching EV Mode Store to ${isEV}`);
      if (isEV) {
        useEVModeStore.getState().setEVMode(true);
      } else {
        useEVModeStore.getState().setEVMode(false);
      }
    }
  },
}));

/**
 * Tools
 */
import { FunctionCall } from './tools/tool-types';



export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
}>(set => ({
  tools: raceTools,
  template: 'race-strategy',
  setTemplate: (template: Template) => {
    console.log('[State] useTools.setTemplate called:', template);
    set({ tools: toolsets[template], template });
    // Sync with useSettings
    useSettings.getState().setTemplate(template);
  },
}));

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
// FIX: Update GroundingChunk to match the type from @google/genai, where uri and title are optional.
// export interface GroundingChunk {
//   web?: {
//     uri?: string;
//     title?: string;
//   };
//   maps?: {
//     uri?: string;
//     title?: string;
//     placeId: string;
//     placeAnswerSources?: any;
//   };
// }

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
  toolResponse?: GenerateContentResponse;
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  isAwaitingFunctionResponse: boolean;
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  mergeIntoLastAgentTurn: (
    update: Omit<ConversationTurn, 'timestamp' | 'role'>,
  ) => void;
  clearTurns: () => void;
  setIsAwaitingFunctionResponse: (isAwaiting: boolean) => void;
}>((set, get) => ({
  turns: [],
  isAwaitingFunctionResponse: false,
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  mergeIntoLastAgentTurn: (
    update: Omit<ConversationTurn, 'timestamp' | 'role'>,
  ) => {
    set(state => {
      const turns = state.turns;
      const lastAgentTurnIndex = turns.map(t => t.role).lastIndexOf('agent');

      if (lastAgentTurnIndex === -1) {
        // Fallback: add a new turn.
        return {
          turns: [
            ...turns,
            { ...update, role: 'agent', timestamp: new Date() } as ConversationTurn,
          ],
        };
      }

      const lastAgentTurn = turns[lastAgentTurnIndex];
      const mergedTurn: ConversationTurn = {
        ...lastAgentTurn,
        text: lastAgentTurn.text + (update.text || ''),
        isFinal: update.isFinal,
        groundingChunks: [
          ...(lastAgentTurn.groundingChunks || []),
          ...(update.groundingChunks || []),
        ],
        toolResponse: update.toolResponse || lastAgentTurn.toolResponse,
      };

      // Rebuild the turns array, replacing the old agent turn.
      const newTurns = [...turns];
      newTurns[lastAgentTurnIndex] = mergedTurn;


      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
  setIsAwaitingFunctionResponse: isAwaiting =>
    set({ isAwaitingFunctionResponse: isAwaiting }),
}));

/**
 * Map Entities
 */
export interface MapMarker {
  position: {
    lat: number;
    lng: number;
    altitude: number;
  };
  label: string;
  showLabel: boolean;
}

export const useMapStore = create<{
  markers: MapMarker[];
  cameraTarget: Map3DCameraProps | null;
  preventAutoFrame: boolean;
  setMarkers: (markers: MapMarker[]) => void;
  clearMarkers: () => void;
  setCameraTarget: (target: Map3DCameraProps | null) => void;
  setPreventAutoFrame: (prevent: boolean) => void;
}>(set => ({
  markers: [],
  cameraTarget: null,
  preventAutoFrame: false,
  setMarkers: markers => set({ markers }),
  clearMarkers: () => set({ markers: [] }),
  setCameraTarget: target => set({ cameraTarget: target }),
  setPreventAutoFrame: prevent => set({ preventAutoFrame: prevent }),
}));

/**
 * Telemetry Data (Simulated)
 */
export interface TelemetryData {
  speed: number; // MPH
  rpm: number;
  gear: number;
  tireHealth: number; // Percentage 0-100
  fuelLevel: number; // Percentage 0-100
  lapDelta: number; // Seconds (+/-)
  trackTemp: number; // Celsius
  carPosition?: google.maps.LatLngAltitudeLiteral;
  ghostPosition?: google.maps.LatLngAltitudeLiteral;
  carHeading?: number;
  ghostHeading?: number;
  trackPath?: google.maps.LatLngAltitudeLiteral[];
}

export const useTelemetryStore = create<{
  data: TelemetryData;
  updateTelemetry: (update: Partial<TelemetryData>) => void;
}>(set => ({
  data: {
    speed: 0,
    rpm: 0,
    gear: 1,
    tireHealth: 100,
    fuelLevel: 100,
    lapDelta: 0,
    trackTemp: 38,
  },
  updateTelemetry: (update) => set(state => ({
    data: { ...state.data, ...update }
  })),
}));