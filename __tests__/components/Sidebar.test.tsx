/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../../components/Sidebar';
import { useUI, useSettings, useLogStore, useTools } from '../../lib/state';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

// Mock dependencies
vi.mock('../../lib/state', () => ({
    useUI: vi.fn(),
    useSettings: vi.fn(),
    useLogStore: {
        getState: vi.fn(),
    },
    useTools: {
        getState: vi.fn(),
    },
    personas: {
        'test-persona': { prompt: 'test prompt', voice: 'test voice' },
    },
}));

vi.mock('../../lib/constants', () => ({
    AVAILABLE_VOICES_FULL: [{ name: 'Puck', description: 'Test Voice' }, { name: 'Charon', description: 'Test Voice 2' }],
    AVAILABLE_VOICES_LIMITED: [{ name: 'Puck', description: 'Test Voice' }, { name: 'Charon', description: 'Test Voice 2' }],
    MODELS_WITH_LIMITED_VOICES: ['gemini-2.0-flash-live-001'],
    DEFAULT_VOICE: 'Puck',
}));

vi.mock('../../contexts/LiveAPIContext', () => ({
    useLiveAPIContext: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('Sidebar', () => {
    const mockToggleSidebar = vi.fn();
    const mockToggleShowSystemMessages = vi.fn();
    const mockSetSystemPrompt = vi.fn();
    const mockSetModel = vi.fn();
    const mockSetVoice = vi.fn();
    const mockSetPersona = vi.fn();
    const mockClearTurns = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        (useUI as any).mockReturnValue({
            isSidebarOpen: true,
            toggleSidebar: mockToggleSidebar,
            showSystemMessages: false,
            toggleShowSystemMessages: mockToggleShowSystemMessages,
        });

        (useSettings as any).mockReturnValue({
            systemPrompt: 'Default prompt',
            model: 'gemini-2.0-flash-live-001',
            voice: 'Puck',
            setSystemPrompt: mockSetSystemPrompt,
            setModel: mockSetModel,
            setVoice: mockSetVoice,
            isEasterEggMode: false,
            activePersona: 'test-persona',
            setPersona: mockSetPersona,
        });

        (useSettings as any).getState = vi.fn().mockReturnValue({
            systemPrompt: 'Default prompt',
            model: 'gemini-2.0-flash-live-001',
        });

        (useLiveAPIContext as any).mockReturnValue({
            connected: false,
        });

        (useLogStore as any).getState.mockReturnValue({
            turns: [],
            clearTurns: mockClearTurns,
        });

        (useTools as any).getState.mockReturnValue({
            tools: [],
        });
    });

    it('renders correctly when open', () => {
        render(<Sidebar />);

        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('System Prompt')).toBeInTheDocument();
        expect(screen.getByText('Model')).toBeInTheDocument();
        expect(screen.getByText('Voice')).toBeInTheDocument();
    });

    it('renders correctly when closed', () => {
        (useUI as any).mockReturnValue({
            isSidebarOpen: false,
            toggleSidebar: mockToggleSidebar,
        });

        const { container } = render(<Sidebar />);
        // Check if the sidebar element does not have the 'open' class
        expect(container.querySelector('.sidebar')).not.toHaveClass('open');
    });

    it('handles close button click', () => {
        render(<Sidebar />);

        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);

        expect(mockToggleSidebar).toHaveBeenCalled();
    });

    it('disables inputs when connected', () => {
        (useLiveAPIContext as any).mockReturnValue({
            connected: true,
        });

        render(<Sidebar />);

        const fieldset = screen.getByText('System Prompt').closest('fieldset');
        expect(fieldset).toBeDisabled();
    });

    it('updates system prompt', () => {
        render(<Sidebar />);

        const textarea = screen.getByLabelText('System Prompt');
        fireEvent.change(textarea, { target: { value: 'New prompt' } });

        expect(mockSetSystemPrompt).toHaveBeenCalledWith('New prompt');
    });

    it('updates model', () => {
        // Enable model selection (Easter egg mode)
        (useSettings as any).mockReturnValue({
            ...useSettings(),
            isEasterEggMode: true,
        });

        render(<Sidebar />);

        const select = screen.getByLabelText('Model');
        fireEvent.change(select, { target: { value: 'gemini-live-2.5-flash-preview' } });

        expect(mockSetModel).toHaveBeenCalledWith('gemini-live-2.5-flash-preview');
    });

    it('updates voice', () => {
        render(<Sidebar />);

        const select = screen.getByLabelText('Voice');
        fireEvent.change(select, { target: { value: 'Charon' } });

        expect(mockSetVoice).toHaveBeenCalledWith('Charon');
    });

    it('toggles system messages', () => {
        render(<Sidebar />);

        const checkbox = screen.getByLabelText('Show system messages');
        fireEvent.click(checkbox);

        expect(mockToggleShowSystemMessages).toHaveBeenCalled();
    });

    it('handles export logs', () => {
        render(<Sidebar />);

        const exportButton = screen.getByTitle('Export session logs');
        fireEvent.click(exportButton);

        // Verify URL creation (part of export process)
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('handles reset session', () => {
        render(<Sidebar />);

        const resetButton = screen.getByTitle('Reset session logs');
        fireEvent.click(resetButton);

        expect(mockClearTurns).toHaveBeenCalled();
    });

    it('shows persona selector in Easter egg mode', () => {
        (useSettings as any).mockReturnValue({
            ...useSettings(),
            isEasterEggMode: true,
        });

        render(<Sidebar />);

        expect(screen.getByText('Persona')).toBeInTheDocument();
    });

    it('hides persona selector in normal mode', () => {
        (useSettings as any).mockReturnValue({
            ...useSettings(),
            isEasterEggMode: false,
        });

        render(<Sidebar />);

        expect(screen.queryByText('Persona')).not.toBeInTheDocument();
    });
});
