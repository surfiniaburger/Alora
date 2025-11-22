/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Added FC to the React import.
import React, { FC } from 'react';
import './PopUp.css';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content" style={{background: '#111', border: '1px solid #eb0a1e'}}>
        <h2 style={{color: '#eb0a1e'}}>TOYOTA GAZOO RACING</h2>
        <h3>Real-Time Strategy Dashboard // GR Cup</h3>
        <div className="popup-scrollable-content">
          <p>
            Welcome to the telemetry uplink. This dashboard simulates a real-time race engineer interface for the GR Cup at Road Atlanta.
          </p>
          <p>You are the Team Principal. The AI is your Chief Race Engineer.</p>
          <ol>
            <li>
              <span className="icon" style={{color: '#eb0a1e'}}>play_circle</span>
              <div>Press <strong>Connect</strong> to establish the radio link.</div>
            </li>
            <li>
              <span className="icon" style={{color: '#eb0a1e'}}>record_voice_over</span>
              <div><strong>Issue Commands:</strong> "Show me Turn 1," "What's the weather report?", "Analyze Sector 3."</div>
            </li>
            <li>
              <span className="icon" style={{color: '#eb0a1e'}}>map</span>
              <div><strong>Visual Confirmation:</strong> The 3D map will automatically fly to specific track sectors based on your discussion.</div>
            </li>
          </ol>
        </div>
        <button onClick={onClose} style={{background: '#eb0a1e', color: 'white'}}>INITIALIZE TELEMETRY</button>
      </div>
    </div>
  );
};

export default PopUp;