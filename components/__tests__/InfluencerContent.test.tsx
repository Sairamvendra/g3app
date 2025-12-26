import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InfluencerContent from '../InfluencerContent';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('InfluencerContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    it('renders the component with step 1 active', () => {
        render(<InfluencerContent />);

        expect(screen.getByText('Influencer Content')).toBeInTheDocument();
        expect(screen.getByText('Enter Your Script')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Refine Script/i })).toBeInTheDocument();
    });

    it('renders the 5-step progress indicator', () => {
        render(<InfluencerContent />);

        expect(screen.getByText('Script')).toBeInTheDocument();
        expect(screen.getByText('Voice')).toBeInTheDocument();
        expect(screen.getByText('Avatar')).toBeInTheDocument();
        expect(screen.getByText('Video')).toBeInTheDocument();
        expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('disables refine button when script is empty', () => {
        render(<InfluencerContent />);

        const refineButton = screen.getByRole('button', { name: /Refine Script/i });
        expect(refineButton).toBeDisabled();
    });

    it('enables refine button when script has content', () => {
        render(<InfluencerContent />);

        const textarea = screen.getByPlaceholderText(/Enter your script here/i);
        fireEvent.change(textarea, { target: { value: 'Test script content' } });

        const refineButton = screen.getByRole('button', { name: /Refine Script/i });
        expect(refineButton).not.toBeDisabled();
    });

    it('calls refine-script API when button is clicked', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: true,
                refinedScript: 'Refined test script',
                brollMarkers: [
                    { id: 'broll-1', textStart: 0, textEnd: 10, prompt: 'Test B-roll', status: 'pending' }
                ]
            })
        });

        render(<InfluencerContent />);

        const textarea = screen.getByPlaceholderText(/Enter your script here/i);
        fireEvent.change(textarea, { target: { value: 'Test script content' } });

        const refineButton = screen.getByRole('button', { name: /Refine Script/i });
        fireEvent.click(refineButton);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3002/api/influencer/refine-script',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });
    });

    it('displays error when API call fails', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: false,
                error: 'Test error message'
            })
        });

        render(<InfluencerContent />);

        const textarea = screen.getByPlaceholderText(/Enter your script here/i);
        fireEvent.change(textarea, { target: { value: 'Test script content' } });

        const refineButton = screen.getByRole('button', { name: /Refine Script/i });
        fireEvent.click(refineButton);

        await waitFor(() => {
            expect(screen.getByText('Test error message')).toBeInTheDocument();
        });
    });

    it('displays voice selection on step 2', async () => {
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: true,
                refinedScript: 'Refined test script',
                brollMarkers: []
            })
        });

        render(<InfluencerContent />);

        // Go to step 2
        const textarea = screen.getByPlaceholderText(/Enter your script here/i);
        fireEvent.change(textarea, { target: { value: 'Test script' } });
        fireEvent.click(screen.getByRole('button', { name: /Refine Script/i }));

        await waitFor(() => {
            expect(screen.getByText('Refined Script & Voice')).toBeInTheDocument();
        });

        // Check voice and emotion selection exists (appears in step indicator too)
        expect(screen.getAllByText('Voice').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Emotion').length).toBeGreaterThanOrEqual(1);
    });

    it('advances to step 3 (Avatar) after voiceover generation', async () => {
        // Step 1: Refine script
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: true,
                refinedScript: 'Refined test script',
                brollMarkers: []
            })
        });

        render(<InfluencerContent />);

        const textarea = screen.getByPlaceholderText(/Enter your script here/i);
        fireEvent.change(textarea, { target: { value: 'Test script' } });
        fireEvent.click(screen.getByRole('button', { name: /Refine Script/i }));

        await waitFor(() => {
            expect(screen.getByText('Refined Script & Voice')).toBeInTheDocument();
        });

        // Step 2: Generate voiceover (also mock the avatar generation that auto-triggers)
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: true,
                audioUrl: 'https://example.com/audio.mp3',
                durationMs: 5000
            })
        });

        // Mock the avatar auto-generation
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({
                success: true,
                avatarUrls: ['https://example.com/avatar1.png', 'https://example.com/avatar2.png', 'https://example.com/avatar3.png'],
                prompts: ['Avatar 1', 'Avatar 2', 'Avatar 3']
            })
        });

        fireEvent.click(screen.getByRole('button', { name: /Generate Voiceover/i }));

        await waitFor(() => {
            expect(screen.getByText('Select Avatar')).toBeInTheDocument();
        });
    });
});
