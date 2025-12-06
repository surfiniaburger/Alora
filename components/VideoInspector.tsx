/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import classNames from 'classnames';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useLogStore } from '@/lib/state';

type VideoInspectorProps = {
    active: boolean;
    onClose: () => void;
};

function VideoInspector({ active, onClose }: VideoInspectorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const { client, connected } = useLiveAPIContext();
    const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Start/Stop Camera
    useEffect(() => {
        if (active) {
            const startCamera = async () => {
                try {
                    console.log('[VideoInspector] Requesting environment camera...');
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            facingMode: { ideal: 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                    setStream(newStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = newStream;
                    }
                    console.log('[VideoInspector] Camera started');

                    // Phase 4: Context Switch - Inform AI
                    if (connected) {
                        client.sendRealtimeText("SYSTEM UPDATE: Mode changed to INSPECTOR. Video feed is now the Rear Camera. User is showing you a vehicle part. Analyze visuals for defects (rust, cracks, bubbles). Be technical and precise.");
                    }
                } catch (err) {
                    console.error('[VideoInspector] Error accessing camera:', err);
                    useLogStore.getState().addTurn({
                        role: 'system',
                        text: `Camera Error: Could not access rear camera. ${err}`,
                        isFinal: true
                    });
                    onClose(); // Close if failed
                }
            };
            startCamera();
        } else {
            // Cleanup
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        }

        return () => {
            // Cleanup on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        };
    }, [active]);

    // Frame Streaming Logic
    useEffect(() => {
        if (!active || !stream || !connected) return;

        const captureFrame = () => {
            if (!videoRef.current || !canvasRef.current) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            // Draw video frame to canvas
            canvas.width = video.videoWidth / 2; // Scale down for performance
            canvas.height = video.videoHeight / 2;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to base64
            const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

            // Send to Gemini
            client.sendRealtimeInput([{
                mimeType: 'image/jpeg',
                data: base64Data
            }]);
        };

        // Send frame every 1 second (1 FPS)
        frameIntervalRef.current = setInterval(captureFrame, 1000);

        return () => {
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        };
    }, [active, stream, connected, client]);


    if (!active) return null;

    return (
        <div className="video-inspector-overlay">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="inspector-video"
            />

            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Reticle / HUD Overlay */}
            <div className="inspector-hud">
                <div className="reticle">
                    <svg viewBox="0 0 100 100" className="reticle-svg">
                        <path d="M 10 10 L 30 10 M 10 10 L 10 30" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="2" fill="none" />
                        <path d="M 90 10 L 70 10 M 90 10 L 90 30" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="2" fill="none" />
                        <path d="M 10 90 L 30 90 M 10 90 L 10 70" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="2" fill="none" />
                        <path d="M 90 90 L 70 90 M 90 90 L 90 70" stroke="rgba(0, 255, 255, 0.8)" strokeWidth="2" fill="none" />
                        <circle cx="50" cy="50" r="5" fill="rgba(255, 0, 0, 0.5)" />
                    </svg>
                </div>

                <div className="inspector-status">
                    <span className="live-indicator">● LIVE VISION</span>
                    <span className="mode-indicator">INSPECTOR MODE</span>
                </div>

                <button className="inspector-close-btn" onClick={onClose}>
                    <span className="material-symbols-outlined">close</span>
                    EXIT
                </button>
            </div>

            <style>{`
        .video-inspector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000;
          z-index: 2000; /* Above Map and ControlTray */
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .inspector-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .inspector-hud {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none; /* Let clicks pass through if needed, but we have a button */
        }
        .reticle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          opacity: 0.8;
        }
        .inspector-status {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1rem;
          background: rgba(0, 0, 0, 0.5);
          padding: 8px 16px;
          border-radius: 20px;
          color: #0ff;
          font-family: monospace;
          font-weight: bold;
        }
        .live-indicator {
          color: #f00;
          animation: blink 1s infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
        
        .inspector-close-btn {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: auto;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          backdrop-filter: blur(5px);
          transition: all 0.2s;
        }
        .inspector-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-50%) scale(1.05);
        }
      `}</style>
        </div>
    );
}

export default memo(VideoInspector);
