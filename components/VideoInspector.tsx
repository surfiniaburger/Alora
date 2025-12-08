/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import classNames from 'classnames';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useLogStore } from '@/lib/state';
import './inspector/VideoInspector.css';

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
                        client.sendRealtimeText("SYSTEM UPDATE: Mode changed to INSPECTOR (AUGMENTED MECHANIC). \nUser is pointing the camera at a vehicle part. \nYour task: Identify the component, look for defects (rust, leaks, wear), and provide technical advice. \nBe precise, helpful, and concise.");
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
                        <path d="M 10 10 L 30 10 M 10 10 L 10 30" stroke="var(--ar-cyan)" strokeWidth="2" fill="none" />
                        <path d="M 90 10 L 70 10 M 90 10 L 90 30" stroke="var(--ar-cyan)" strokeWidth="2" fill="none" />
                        <path d="M 10 90 L 30 90 M 10 90 L 10 70" stroke="var(--ar-cyan)" strokeWidth="2" fill="none" />
                        <path d="M 90 90 L 70 90 M 90 90 L 90 70" stroke="var(--ar-cyan)" strokeWidth="2" fill="none" />
                        <circle cx="50" cy="50" r="2" fill="var(--ar-red)" opacity="0.8" />
                    </svg>
                </div>

                <div className="inspector-status">
                    <span className="live-indicator">● LIVE FEED</span>
                    <span className="mode-indicator">MECHANIC_AI_V1</span>
                    <span className="scanning-text">SCANNING_SURFACE...</span>
                </div>

                <button className="inspector-close-btn" onClick={onClose}>
                    <span className="material-symbols-outlined">close</span>
                    DISENGAGE
                </button>
            </div>
        </div>
    );
}

export default memo(VideoInspector);
