/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ErrorScreen from '../../components/ErrorScreen';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

// Mock dependencies
vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: vi.fn(),
}));

describe('ErrorScreen', () => {
    let mockClient: any;
    let errorCallback: (event: any) => void;

    beforeEach(() => {
        vi.clearAllMocks();

        mockClient = {
            on: vi.fn((event, cb) => {
                if (event === 'error') {
                    errorCallback = cb;
                }
            }),
            off: vi.fn(),
        };

        (useLiveAPIContext as any).mockReturnValue({
            client: mockClient,
        });
    });

    it('renders nothing initially', () => {
        const { container } = render(<ErrorScreen />);
        expect(container.firstChild).toHaveStyle({ display: 'none' });
    });

    it('renders error message when error event occurs', () => {
        render(<ErrorScreen />);

        // Simulate error event
        const errorEvent = {
            message: 'Test error message',
        };

        // Trigger the callback captured in beforeEach
        act(() => {
            if (errorCallback) {
                errorCallback(errorEvent);
            }
        });

        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('renders quota exceeded message specifically', () => {
        render(<ErrorScreen />);

        const errorEvent = {
            message: 'RESOURCE_EXHAUSTED: Quota exceeded',
        };

        act(() => {
            if (errorCallback) {
                errorCallback(errorEvent);
            }
        });

        expect(screen.getByText(/Gemini Live API in AI Studio has a limited free quota/)).toBeInTheDocument();
        // Should not show raw message for quota errors
        expect(screen.queryByText('RESOURCE_EXHAUSTED')).not.toBeInTheDocument();
    });

    it('hides close button for quota errors', () => {
        render(<ErrorScreen />);

        const errorEvent = {
            message: 'RESOURCE_EXHAUSTED',
        };

        act(() => {
            if (errorCallback) {
                errorCallback(errorEvent);
            }
        });

        expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('allows dismissing generic errors', () => {
        render(<ErrorScreen />);

        const errorEvent = {
            message: 'Generic error',
        };

        act(() => {
            if (errorCallback) {
                errorCallback(errorEvent);
            }
        });

        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        // Should return to hidden state. After clicking "Close", the error message
        // should no longer be in the document.
        expect(screen.queryByText('Generic error')).not.toBeInTheDocument();
    });

    it('subscribes to error events on mount', () => {
        render(<ErrorScreen />);
        expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('unsubscribes from error events on unmount', () => {
        const { unmount } = render(<ErrorScreen />);
        unmount();
        expect(mockClient.off).toHaveBeenCalledWith('error', expect.any(Function));
    });
});
