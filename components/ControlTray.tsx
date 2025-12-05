
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

import cn from 'classnames';
// FIX: Added missing React imports.
import React, { memo, useEffect, useRef, useState, FormEvent, Ref } from 'react';
import { AudioRecorder } from '../lib/audio-recorder';
import { useLogStore, useUI, useSettings, useTelemetryStore } from '@/lib/state';
import { useEVModeStore } from '@/lib/ev-mode-state';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { Capacitor } from '@capacitor/core';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

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

export type ControlTrayProps = {
  trayRef?: Ref<HTMLElement>;
  onToggleDebug?: () => void;
};

function ControlTray({ trayRef, onToggleDebug }: ControlTrayProps) {
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(true);
  const [textPrompt, setTextPrompt] = useState('');
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const { toggleSidebar, toggleTelemetryPanel, isTelemetryPanelOpen } = useUI();
  const { activateEasterEggMode } = useSettings();
  const { selectedStation, isEVModeActive } = useEVModeStore();
  const settingsClickTimestamps = useRef<number[]>([]);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isTextEntryVisible, setIsTextEntryVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  const { client, connected, connect, disconnect, audioStreamer } =
    useLiveAPIContext();

  // GSAP Animation for Mic Button
  // We can use a simple ref-based animation or the CSS animation defined in index.css
  // The user requested a GSAP hook, so let's add it for extra polish if needed, 
  // but the CSS 'reactor-pulse' is already quite good. 
  // Let's stick to the CSS class toggling 'mic-active' which triggers the CSS animation 
  // as it's more performant and cleaner for this specific "pulse" effect.

  useEffect(() => {
    if (audioStreamer.current) {
      audioStreamer.current.gainNode.gain.value = speakerMuted ? 0 : 1;
    }
  }, [speakerMuted, audioStreamer]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder]);

  // GSAP Animation for Mic Button States
  useGSAP(() => {
    if (!micButtonRef.current) return;

    // Kill any existing animations
    gsap.killTweensOf(micButtonRef.current);

    if (connected && !muted) {
      // Active state: Slow breathing glow
      gsap.to(micButtonRef.current, {
        scale: 1.05,
        boxShadow: '0 0 30px rgba(235, 10, 30, 0.8), inset 0 0 25px rgba(235, 10, 30, 0.3)',
        duration: 1.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    } else if (connected && muted) {
      // Connected but muted: Subtle pulse
      gsap.to(micButtonRef.current, {
        scale: 1.02,
        duration: 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      // Idle state: Reset to normal
      gsap.to(micButtonRef.current, {
        scale: 1,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [connected, muted]);

  const handleMicClick = async () => {
    console.log('[Tool Registry] Mic button clicked');
    console.log('[Tool Registry] Current state - connected:', connected, 'muted:', muted);

    if (!connected) {
      console.log('[Tool Registry] Starting connection flow...');

      try {
        // Step 1: Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const errorMsg = 'Media Devices API not available in this browser/webview';
          console.error('[Tool Registry] Error:', errorMsg);
          useLogStore.getState().addTurn({
            role: 'system',
            text: `Audio Error: ${errorMsg}. Please try a different browser.`,
            isFinal: true,
          });
          return;
        }

        console.log('[Tool Registry] Media Devices API available, requesting microphone access...');

        // Step 2: Request microphone permission (CRITICAL for mobile)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Tool Registry] ✓ Microphone stream acquired successfully');
        console.log('[Tool Registry] Stream active:', stream.active, 'tracks:', stream.getTracks().length);

        // Step 3: Resume AudioContext if suspended (CRITICAL for mobile)
        if (audioStreamer.current) {
          const audioCtx = audioStreamer.current.context;
          console.log('[Tool Registry] AudioContext state:', audioCtx.state);

          if (audioCtx.state === 'suspended') {
            console.log('[Tool Registry] Resuming AudioContext...');
            await audioCtx.resume();
            console.log('[Tool Registry] ✓ AudioContext resumed, state:', audioCtx.state);
          }
        }

        // Step 4: Connect to Live API
        console.log('[Tool Registry] Calling connect()...');
        await connect();
        console.log('[Tool Registry] ✓ connect() completed');
        setMuted(false);
        console.log('[Tool Registry] ✓ Microphone unmuted');

      } catch (error) {
        console.error('[Tool Registry] Error in mic flow:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        useLogStore.getState().addTurn({
          role: 'system',
          text: `Microphone Error: ${errorMessage}. Please check permissions in your device settings.`,
          isFinal: true,
        });
      }
    } else {
      console.log('[Tool Registry] Already connected, toggling mute state');
      const newMutedState = !muted;
      setMuted(newMutedState);
      console.log('[Tool Registry] Muted state changed to:', newMutedState);
    }
  };

  const handleTextSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textPrompt.trim()) return;

    useLogStore.getState().addTurn({
      role: 'user',
      text: textPrompt,
      isFinal: true,
    });
    const currentPrompt = textPrompt;

    // Inject current telemetry for text requests
    const telemetry = useTelemetryStore.getState().data;
    const promptWithContext = `${currentPrompt} \n [SYSTEM CONTEXT: Race Data: ${JSON.stringify(telemetry)}]`;

    setTextPrompt(''); // Clear input immediately

    if (!connected) {
      console.warn("Cannot send text message: not connected to live stream.");
      useLogStore.getState().addTurn({
        role: 'system',
        text: `Cannot send message. Please connect to the stream first.`,
        isFinal: true,
      });
      return;
    }
    client.sendRealtimeText(promptWithContext);
  };

  const handleNavigate = () => {
    if (!selectedStation) return;

    console.log('[ControlTray] Navigating to:', selectedStation.name);

    // Deep link to Google Maps for turn-by-turn navigation
    const { lat, lng } = selectedStation.position;

    if (Capacitor.isNativePlatform()) {
      // Native platform: Use Google Maps app via deep link
      const navigationUrl = `google.navigation:q=${lat},${lng}&mode=d`;
      window.open(navigationUrl, '_system');
    } else {
      // Web platform: Use Google Maps web URL
      const webNavigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      window.open(webNavigationUrl, '_blank');
    }

    // Send AI announcement
    if (client && connected) {
      const aiMessage = `SYSTEM ALERT: User has started navigation to ${selectedStation.name}. End conversation to allow for driving focus, or offer to play music.`;
      client.send([{ text: aiMessage }]);
      console.log('[ControlTray] AI announcement sent:', aiMessage);
    }

    setIsMenuOpen(false);
  };

  const handleSettingsClick = () => {
    toggleSidebar();
    // Easter egg logic preserved but hidden for now
  };

  return (
    <section className="control-tray" ref={trayRef}>
      <div className="hud-controls">
        {/* Left: Keyboard Toggle */}
        <button
          className={cn('hud-button', { 'active': isTextEntryVisible })}
          onClick={() => setIsTextEntryVisible(!isTextEntryVisible)}
          title="Toggle Text Input"
        >
          <span className="icon material-symbols-outlined">keyboard</span>
        </button>

        {/* Center: Arc Reactor Mic */}
        <button
          ref={micButtonRef}
          className={cn('hud-mic', {
            'mic-active': connected && !muted,
          })}
          onClick={handleMicClick}
          title={!connected ? "Connect & Start" : (muted ? "Unmute" : "Mute")}
        >
          <span className="material-symbols-outlined filled">
            {!connected ? 'mic_off' : (muted ? 'mic_off' : 'mic')}
          </span>
        </button>

        {/* Right: Tools Menu (Settings/Dashboard) */}
        <div style={{ position: 'relative' }}>
          <button
            className={cn('hud-button', { 'active': isMenuOpen })}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Tools & Settings"
          >
            <span className="icon material-symbols-outlined">grid_view</span>
          </button>

          {/* Quick Actions Popover */}
          {isMenuOpen && (
            <div className="hud-quick-menu" ref={menuRef}>
              <button
                className="hud-menu-item"
                onClick={() => {
                  toggleTelemetryPanel();
                  setIsMenuOpen(false);
                }}
              >
                <span className="icon material-symbols-outlined">
                  {isTelemetryPanelOpen ? 'visibility_off' : 'visibility'}
                </span>
                <span>{isTelemetryPanelOpen ? 'Hide Telemetry' : 'Show Telemetry'}</span>
              </button>

              {/* Navigate option - only show in EV Mode with selected station */}
              {isEVModeActive && selectedStation && (
                <button
                  className="hud-menu-item primary"
                  onClick={handleNavigate}
                >
                  <span className="icon material-symbols-outlined">navigation</span>
                  <span>Navigate to {selectedStation.name}</span>
                </button>
              )}

              <button
                className="hud-menu-item"
                onClick={() => {
                  toggleSidebar();
                  setIsMenuOpen(false);
                }}
              >
                <span className="icon material-symbols-outlined">settings</span>
                <span>Settings</span>
              </button>

              <button
                className="hud-menu-item"
                onClick={() => {
                  onToggleDebug?.();
                  setIsMenuOpen(false);
                }}
              >
                <span className="icon material-symbols-outlined">bug_report</span>
                <span>Debug Logs</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Text Input Overlay (Only visible when toggled) */}
      {isTextEntryVisible && (
        <div className="hud-text-input-container">
          <form className="floating-prompt-form prompt-form" onSubmit={handleTextSubmit}>
            <input
              type="text"
              className="prompt-input"
              placeholder={connected ? 'Type a message...' : 'Connect to start typing...'}
              value={textPrompt}
              onChange={e => setTextPrompt(e.target.value)}
              autoFocus
              disabled={!connected}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!textPrompt.trim() || !connected}
            >
              <span className="icon material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default memo(ControlTray);
