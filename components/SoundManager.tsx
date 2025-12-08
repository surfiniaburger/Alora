
import { useEffect, useRef } from 'react';
import { useUI } from '@/lib/state';

export function SoundManager() {
    const activeMode = useUI((state) => state.activeMode);

    // Refs to hold Audio objects to persist across renders without re-creating
    const startupAudio = useRef<HTMLAudioElement | null>(null);
    const backgroundAudio = useRef<HTMLAudioElement | null>(null);
    const switchAudio = useRef<HTMLAudioElement | null>(null);

    // Track if we've already done the initial startup sound
    const hasStarted = useRef(false);

    useEffect(() => {
        // Initialize Audio objects
        startupAudio.current = new Audio('/sounds/startup.mp3');
        backgroundAudio.current = new Audio('/sounds/background_loop.mp3');
        switchAudio.current = new Audio('/sounds/switch_mode.mp3');

        // Configure Background Loop
        if (backgroundAudio.current) {
            backgroundAudio.current.loop = true;
            backgroundAudio.current.volume = 0.05; // Very low volume for background
        }

        // Configure Startup
        if (startupAudio.current) {
            startupAudio.current.volume = 0.4;
        }

        // Configure Switch
        if (switchAudio.current) {
            switchAudio.current.volume = 0.3;
        }

        // Attempt to start background audio immediately (browsers may block this without interaction)
        const playBackground = async () => {
            try {
                if (backgroundAudio.current) {
                    await backgroundAudio.current.play();
                }
            } catch (e) {
                console.warn('[SoundManager] Autoplay prevented. User interaction needed.', e);
                // Fallback: Add a one-time click listener to start audio?
                // For now, we rely on the user interacting with the app naturally.
            }
        };

        const playStartup = async () => {
            try {
                if (startupAudio.current && !hasStarted.current) {
                    await startupAudio.current.play();
                    hasStarted.current = true;
                }
            } catch (e) {
                console.warn('[SoundManager] Startup sound prevented.', e);
            }
        };

        playBackground();
        playStartup();

        return () => {
            // Cleanup
            if (backgroundAudio.current) {
                backgroundAudio.current.pause();
                backgroundAudio.current = null;
            }
            if (startupAudio.current) {
                startupAudio.current.pause();
                startupAudio.current = null;
            }
            if (switchAudio.current) {
                switchAudio.current = null;
            }
        };
    }, []);

    // Effect to play switch sound on mode change
    // We skip the very first render (startup) to avoid double sounds, 
    // relying on hasStarted to distinguish.
    const prevMode = useRef(activeMode);
    useEffect(() => {
        if (prevMode.current !== activeMode) {
            // Mode Changed
            if (switchAudio.current) {
                // Reset time to 0 to allow rapid re-plays
                switchAudio.current.currentTime = 0;
                switchAudio.current.play().catch(e => console.warn('[SoundManager] Switch sound failed', e));
            }
            prevMode.current = activeMode;
        }
    }, [activeMode]);

    return null; // Component renders nothing visibly
}
