
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { LiveConnectConfig, Modality, LiveServerContent } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import {
  useSettings,
  useLogStore,
  useAppStore,
  ConversationTurn,
  useUI,
} from '@/lib/state';
import * as raceConfig from '@/config/modes/race';
import * as evConfig from '@/config/modes/ev';
import * as inspectorConfig from '@/config/modes/inspector';
import { SourcesPopover } from '../sources-popover/sources-popover';
import { GroundingWidget } from '../GroundingWidget';

const formatTimestamp = (date: Date) => {
  const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// Hook to detect screen size for responsive component rendering
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => {
      setMatches(media.matches);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};


import StationList from '../ev/StationList';
import BatteryStatus from '../ev/BatteryStatus';

import { useEVModeStore } from '@/lib/ev-mode-state';

export default function StreamingConsole() {
  const {
    client,
    setConfig,
    heldGroundingChunks,
    clearHeldGroundingChunks,
    heldGroundedResponse,
    clearHeldGroundedResponse,
  } = useLiveAPIContext();
  const { voice } = useSettings();
  const { mode } = useAppStore();
  const turns = useLogStore(state => state.turns);
  const addTurn = useLogStore(state => state.addTurn);

  // Select config based on current mode
  const modeConfig = useMemo(() => {
    switch (mode) {
      case 'race': return raceConfig;
      case 'ev': return evConfig;
      case 'inspector': return inspectorConfig;
      default: return raceConfig;
    }
  }, [mode]);

  const { tools, systemPrompt } = modeConfig;
  const { showSystemMessages } = useUI();
  const { isEVModeActive } = useEVModeStore();
  const isAwaitingFunctionResponse = useLogStore(
    state => state.isAwaitingFunctionResponse,
  );

  // Transient HUD State
  const [isVisible, setIsVisible] = useState(false);
  const [latestTurn, setLatestTurn] = useState<ConversationTurn | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter turns to find the last relevant one to display
  useEffect(() => {
    if (turns.length === 0) return;

    const lastTurn = turns[turns.length - 1];

    // Ignore system messages unless they are tool outputs we want to show
    const isRelevantSystem = lastTurn.role === 'system' && (
      showSystemMessages ||
      lastTurn.toolUseRequest?.functionCalls.some(fc =>
        ['findEVChargingStations', 'setEVVehicleProfile'].includes(fc.name)
      )
    );

    if (lastTurn.role !== 'system' || isRelevantSystem) {
      setLatestTurn(lastTurn);
      setIsVisible(true);

      // Reset timer
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

      // Auto-hide after 5 seconds of silence (if not a tool output which might need interaction)
      const isToolOutput = lastTurn.role === 'system' && lastTurn.toolUseRequest;
      if (!isToolOutput) {
        fadeTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    }
  }, [turns, showSystemMessages]);

  // Animate HUD card visibility changes
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (cardRef.current) {
      if (isVisible) {
        // Entry animation
        gsap.fromTo(
          cardRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
        );
      } else {
        // Exit animation
        gsap.to(cardRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in'
        });
      }
    }
  }, [isVisible]);

  // Set the configuration for the Live API (Keep existing logic)
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
    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      tools: enabledTools,
      thinkingConfig: { thinkingBudget: 0 },
    };

    setConfig(config);
  }, [setConfig, systemPrompt, tools, voice]);

  // Notify LLM when mode changes
  useEffect(() => {
    if (mode) {
      const modeNames = {
        race: 'RACE MODE - Chief Strategist',
        ev: 'EV MODE - Charging Assistant',
        inspector: 'INSPECTOR MODE - Vehicle Inspector',
      };

      addTurn({
        role: 'system',
        text: `Mode switched to ${modeNames[mode]}. All tools and context have been updated for this mode.`,
        isFinal: true,
      });
    }
  }, [mode, addTurn]);

  // Handle Transcriptions

  const updateLastTurn = useLogStore(state => state.updateLastTurn);
  const mergeIntoLastAgentTurn = useLogStore(state => state.mergeIntoLastAgentTurn);
  // We need access to the current turns state inside the event handlers without triggering re-renders on every change.
  // Using a ref to track the current turns allows us to access the latest state inside the callbacks.
  const turnsRef = useRef(turns);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const currentTurns = turnsRef.current;
      const last = currentTurns[currentTurns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({ text: last.text + text, isFinal });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const currentTurns = turnsRef.current;
      const last = currentTurns[currentTurns.length - 1];

      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: last.text + text, isFinal });
      } else {
        const lastAgentTurnIndex = currentTurns.map(t => t.role).lastIndexOf('agent');
        let shouldMerge = false;
        if (lastAgentTurnIndex !== -1) {
          const subsequentTurns = currentTurns.slice(lastAgentTurnIndex + 1);
          if (subsequentTurns.length > 0 && subsequentTurns.every(t => t.role === 'system')) {
            shouldMerge = true;
          }
        }

        const turnData: Omit<ConversationTurn, 'timestamp' | 'role'> = { text, isFinal };
        if (heldGroundingChunks) {
          turnData.groundingChunks = heldGroundingChunks;
          clearHeldGroundingChunks();
        }
        if (heldGroundedResponse) {
          turnData.toolResponse = heldGroundedResponse;
          clearHeldGroundedResponse();
        }

        if (shouldMerge) {
          mergeIntoLastAgentTurn(turnData);
        } else {
          addTurn({ ...turnData, role: 'agent' });
        }
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const currentTurns = turnsRef.current;
      const text = serverContent.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join('') ?? '';
      const groundingChunks = serverContent.groundingMetadata?.groundingChunks;

      if (!text && !groundingChunks) return;

      const last = currentTurns[currentTurns.length - 1];

      if (last?.role === 'agent' && !last.isFinal) {
        const updatedTurn: Partial<ConversationTurn> = { text: last.text + text };
        if (groundingChunks) {
          updatedTurn.groundingChunks = [...(last.groundingChunks || []), ...groundingChunks];
        }
        updateLastTurn(updatedTurn);
      } else {
        const lastAgentTurnIndex = currentTurns.map(t => t.role).lastIndexOf('agent');
        let shouldMerge = false;
        if (lastAgentTurnIndex !== -1) {
          const subsequentTurns = currentTurns.slice(lastAgentTurnIndex + 1);
          if (subsequentTurns.length > 0 && subsequentTurns.every(t => t.role === 'system')) {
            shouldMerge = true;
          }
        }

        const newTurnData: Omit<ConversationTurn, 'timestamp' | 'role'> = {
          text,
          isFinal: false,
          groundingChunks,
        };
        if (heldGroundingChunks) {
          newTurnData.groundingChunks = [...(heldGroundingChunks || []), ...(newTurnData.groundingChunks || [])];
          clearHeldGroundingChunks();
        }
        if (heldGroundedResponse) {
          newTurnData.toolResponse = heldGroundedResponse;
          clearHeldGroundedResponse();
        }

        if (shouldMerge) {
          mergeIntoLastAgentTurn(newTurnData);
        } else {
          addTurn({ ...newTurnData, role: 'agent' });
        }
      }
    };

    const handleTurnComplete = () => {
      const currentTurns = turnsRef.current;
      const last = currentTurns[currentTurns.length - 1];
      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);
    client.on('generationcomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
      client.off('generationcomplete', handleTurnComplete);
    };
  }, [client, heldGroundingChunks, clearHeldGroundingChunks, heldGroundedResponse, clearHeldGroundedResponse, addTurn, updateLastTurn, mergeIntoLastAgentTurn]);


  // Render Helper
  const renderContent = (turn: ConversationTurn) => {
    // 1. Tool Outputs (Station List, etc.)
    if (turn.role === 'system' && turn.toolUseRequest) {
      const isStationSearch = turn.toolUseRequest.functionCalls.some(fc => fc.name === 'findEVChargingStations');
      const isProfileSetup = turn.toolUseRequest.functionCalls.some(fc => fc.name === 'setEVVehicleProfile');

      if (isStationSearch) return <StationList />;
      if (isProfileSetup) return <BatteryStatus />;
    }

    // 2. Text Content (User or Agent)
    return (
      <div className="hud-message-content">
        <div className={`hud-avatar ${turn.role}`}>
          <span className="material-symbols-outlined">
            {turn.role === 'user' ? 'person' : 'auto_awesome'}
          </span>
        </div>
        <div className="hud-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {turn.text}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className={`hud-console-container ${isVisible ? 'visible' : 'hidden'}`}>
      {latestTurn && (
        <div className={`hud-card ${latestTurn.role}`} ref={cardRef}>
          {renderContent(latestTurn)}
        </div>
      )}

      {isAwaitingFunctionResponse && (
        <div className="hud-status-indicator">
          <div className="spinner-small"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}