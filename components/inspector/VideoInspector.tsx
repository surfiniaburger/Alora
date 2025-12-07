/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import Webcam from 'react-webcam';

/**
 * Video Inspector Component
 * 
 * Handles camera access and frame streaming for Inspector Mode.
 * Automatically activates when the app is in 'inspector' mode.
 * Captures video frames and sends them to the Gemini Live API for analysis.
 */
export default function VideoInspector() {
    const { mode } = useAppStore();
    const { client, connected } = useLiveAPIContext();
    const webcamRef = useRef<Webcam>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    // Only active in inspector mode
    const isActive = mode === 'inspector';

    // Camera constraints - prefer environment (back) camera
    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: { exact: "environment" }
    };

    // Fallback constraints if environment camera fails
    const fallbackConstraints = {
        width: 640,
        height: 480,
        facingMode: "user"
    };

    const [constraints, setConstraints] = useState<any>(videoConstraints);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (isActive && connected && isCameraActive) {
            console.log('[Inspector] Starting video frame capture...');

            // Capture and send frames periodically
            intervalId = setInterval(() => {
                if (webcamRef.current) {
                    const imageSrc = webcamRef.current.getScreenshot();

                    if (imageSrc) {
                        // Remove data URL prefix (data:image/jpeg;base64,)
                        const base64Data = imageSrc.split(',')[1];

                        client.sendRealtimeInput([{
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }]);
                    }
                }
            }, 1000); // 1 FPS to balance bandwidth/latency
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isActive, connected, isCameraActive, client]);

    // Handle camera errors (e.g., no back camera on laptop)
    const handleUserMediaError = (error: string | DOMException) => {
        console.warn('[Inspector] Camera error:', error);
        // Fallback to user facing camera if environment fails
        if (constraints.facingMode?.exact === "environment") {
            console.log('[Inspector] Falling back to user camera...');
            setConstraints(fallbackConstraints);
        }
    };

    if (!isActive) return null;

    return (
        <div className="inspector-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 5, // Below UI overlay (10) but above map (0)
            pointerEvents: 'none', // Let clicks pass through
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black'
        }}>
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={constraints}
                onUserMedia={() => setIsCameraActive(true)}
                onUserMediaError={handleUserMediaError}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.8 // Slightly transparent to blend or just show clearly
                }}
            />

            {/* Inspector Reticle UI */}
            <div className="inspector-ui" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
            }}>
                {/* Reticle */}
                <div style={{
                    width: '200px',
                    height: '200px',
                    border: '2px solid rgba(0, 255, 255, 0.5)',
                    borderRadius: '10px',
                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)',
                    position: 'relative'
                }}>
                    {/* Corner markers */}
                    <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '4px solid cyan', borderLeft: '4px solid cyan' }} />
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '4px solid cyan', borderRight: '4px solid cyan' }} />
                    <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '4px solid cyan', borderLeft: '4px solid cyan' }} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '4px solid cyan', borderRight: '4px solid cyan' }} />
                </div>

                {/* Status Text */}
                <div style={{
                    marginTop: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    color: 'cyan',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'pulse 2s infinite' }}>videocam</span>
                    AI ANALYZING VIDEO FEED
                </div>
            </div>
        </div>
    );
}
