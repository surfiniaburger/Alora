/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import Webcam from 'react-webcam';
import './VideoInspector.css';

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

    const [constraints, setConstraints] = useState<MediaStreamConstraints>(videoConstraints);

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
        <div className="inspector-overlay">
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={constraints}
                onUserMedia={() => setIsCameraActive(true)}
                onUserMediaError={handleUserMediaError}
                className="inspector-webcam"
            />

            {/* Inspector Reticle UI */}
            <div className="inspector-ui">
                {/* Reticle */}
                <div className="inspector-reticle">
                    {/* Corner markers */}
                    <div className="inspector-corner top-left" />
                    <div className="inspector-corner top-right" />
                    <div className="inspector-corner bottom-left" />
                    <div className="inspector-corner bottom-right" />
                </div>

                {/* Status Text */}
                <div className="inspector-status">
                    <span className="material-symbols-outlined inspector-icon">videocam</span>
                    AI ANALYZING VIDEO FEED
                </div>
            </div>
        </div>
    );
}
