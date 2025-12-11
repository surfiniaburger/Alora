import { create } from 'zustand';

export type Template = 'unified'; // Deprecated type kept for compatibility if needed elsewhere

import {
  ALORA_PROMPT,
  SCAVENGER_HUNT_PROMPT,
} from './constants.ts';

// Unified prompt for the main persona
const SYSTEM_PROMPT = ALORA_PROMPT;

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
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  isEasterEggMode: boolean;
  activePersona: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setPersona: (persona: string) => void;
  activateEasterEggMode: () => void;
}>(set => ({
  systemPrompt: SYSTEM_PROMPT,
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  isEasterEggMode: false,
  activePersona: 'Alora',
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setPersona: (persona: string) => {
    if (personas[persona]) {
      set({
        activePersona: persona,
        systemPrompt: personas[persona].prompt,
        voice: personas[persona].voice,
      });
    } else {
      // Revert to default Alora
      set({
        activePersona: 'Alora',
        systemPrompt: SYSTEM_PROMPT,
        voice: DEFAULT_VOICE,
      });
    }
  },
  activateEasterEggMode: () => {
    set(state => {
      if (!state.isEasterEggMode) {
        const persona = SCAVENGER_HUNT_PERSONA;
        return {
          isEasterEggMode: true,
          activePersona: persona,
          systemPrompt: personas[persona].prompt,
          voice: personas[persona].voice,
          model: 'gemini-live-2.5-flash-preview',
        };
      }
      return {};
    });
  },
}));

/**
 * UI
 */
export type AppMode = 'RACE' | 'EV' | 'STANDARD';

export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  showSystemMessages: boolean;
  toggleShowSystemMessages: () => void;
  isTelemetryPanelOpen: boolean;
  toggleTelemetryPanel: () => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  showSystemMessages: false,
  toggleShowSystemMessages: () =>
    set(state => ({ showSystemMessages: !state.showSystemMessages })),
  isTelemetryPanelOpen: true,
  toggleTelemetryPanel: () => set(state => ({ isTelemetryPanelOpen: !state.isTelemetryPanelOpen })),
  appMode: 'RACE', // Default to Race mode as implied by telemetry panel being open
  setAppMode: (mode) => set({ appMode: mode }),
}));

// Unused but keeping for reference if needed later, though tools are now largely static/unified
export const useTools = create<{
  // tools: FunctionCall[]; // Deprecated, we use tool-registry directly now
}>(set => ({
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