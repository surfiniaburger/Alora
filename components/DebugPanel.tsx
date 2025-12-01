import React, { useEffect, useState, useRef } from 'react';
import './DebugPanel.css';

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
}

export default function DebugPanel() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Override console methods to capture logs
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const formatArg = (arg: any) => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        };

        const addLog = (level: 'info' | 'warn' | 'error', args: any[]) => {
            // Filter for our relevant logs
            const message = args.map(formatArg).join(' ');
            if (message.includes('[EV Tool]') || message.includes('[Tool Registry]') || message.includes('Error')) {
                setLogs(prev => [...prev.slice(-49), {
                    timestamp: new Date().toLocaleTimeString(),
                    level,
                    message,
                }]);
            }
        };

        console.log = (...args) => {
            addLog('info', args);
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            addLog('warn', args);
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            addLog('error', args);
            originalError.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    useEffect(() => {
        if (isVisible && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isVisible]);

    if (!isVisible) {
        return (
            <button
                className="debug-toggle"
                onClick={() => setIsVisible(true)}
                title="Show Debug Logs"
            >
                🐞
            </button>
        );
    }

    return (
        <div className="debug-panel">
            <div className="debug-header">
                <h3>Debug Logs</h3>
                <div className="debug-actions">
                    <button onClick={() => setLogs([])}>Clear</button>
                    <button onClick={() => setIsVisible(false)}>Close</button>
                </div>
            </div>
            <div className="debug-content">
                {logs.length === 0 ? (
                    <div className="no-logs">No relevant logs captured yet...</div>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className={`log-entry ${log.level}`}>
                            <span className="timestamp">[{log.timestamp}]</span>
                            <span className="message">{log.message}</span>
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
}
