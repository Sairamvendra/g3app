import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudioPanel from '../StudioPanel';

// Mock the child components to simplify testing
vi.mock('../OrbitCamera', () => ({
    default: () => <div data-testid="orbit-camera">Orbit Camera</div>
}));
vi.mock('../RelightPanel', () => ({
    default: () => <div data-testid="relight-panel">Relight Panel</div>
}));

// Mock replicateService
vi.mock('../../services/replicateService', () => ({
    generateImageWithReplicate: vi.fn(() => Promise.resolve('http://mock-url.com/image.png')),
    analyzeStoryboardFlowWithReplicate: vi.fn(() => Promise.resolve([])),
    generatePersonaPromptWithReplicate: vi.fn(() => Promise.resolve('Persona prompt')),
    improveVideoPromptWithReplicate: vi.fn(() => Promise.resolve('Improved prompt')),
    generateVideoWithReplicate: vi.fn(() => Promise.resolve('http://mock-url.com/video.mp4')),
    hasValidReplicateApiKey: vi.fn(() => true),
    REPLICATE_VIDEO_MODELS: [
        { id: 'google/veo-3.1', name: 'Veo', type: 'text-to-video' }
    ]
}));

describe('StudioPanel', () => {
    it('renders with initial prompt', () => {
        render(<StudioPanel initialPrompt="Initial prompt value" />);
        const textarea = screen.getByDisplayValue('Initial prompt value');
        expect(textarea).toBeInTheDocument();
    });

    it('toggles left sidebar panels', () => {
        render(<StudioPanel initialPrompt="" />);

        // Click Story Flow button
        const storyBtn = screen.getByTitle('Story Flow');
        fireEvent.click(storyBtn);
        expect(screen.getByRole('heading', { name: 'Story Flow' })).toBeInTheDocument();
        expect(screen.getByText('Upload Page')).toBeInTheDocument();

        // Click Characters button
        const charBtn = screen.getByTitle('Characters');
        fireEvent.click(charBtn);
        expect(screen.getByRole('heading', { name: 'Characters' })).toBeInTheDocument();
        expect(screen.getByText('New Character')).toBeInTheDocument();
    });

    it('toggles right sidebar (Studio Settings)', () => {
        render(<StudioPanel initialPrompt="" />);

        // Find Studio Settings button (it's in the right sidebar strip)
        const settingsBtn = screen.getByTitle('Studio Settings');
        fireEvent.click(settingsBtn);

        // Check if settings panel content is visible
        // Use getByRole to target the header specifically, avoiding ambiguity with the button text
        expect(screen.getByRole('heading', { name: 'Studio Settings' })).toBeInTheDocument();
        expect(screen.getByText('Format')).toBeInTheDocument();
        expect(screen.getByText('Cinematography')).toBeInTheDocument();
    });

    it('updates prompt when typing in StudioPanel', () => {
        render(<StudioPanel initialPrompt="" />);
        // There are two textareas (one for main prompt, one potentially for negative/video prompt depending on state)
        // We target the main one by placeholder or label
        const textarea = screen.getByPlaceholderText(/Waiting for prompt from Architect/i);
        fireEvent.change(textarea, { target: { value: 'New studio prompt' } });
        expect(textarea).toHaveValue('New studio prompt');
    });
    it('generates with default angle when no specific angle selected', async () => {
        const { generateImageWithReplicate } = await import('../../services/replicateService');
        render(<StudioPanel initialPrompt="" />);

        // Enter a prompt
        const textarea = screen.getByPlaceholderText(/Waiting for prompt from Architect/i);
        fireEvent.change(textarea, { target: { value: 'Test generation' } });

        // Click Generate button (assuming generic Generate button text since count is defaults)
        // Click Generate button - use exact text match to avoid ambiguity with "Generate Video"
        const generateBtn = screen.getByRole('button', { name: 'Generate (1)' });
        fireEvent.click(generateBtn);

        // Verify that replicate service was called
        expect(generateImageWithReplicate).toHaveBeenCalled();
    });
});
