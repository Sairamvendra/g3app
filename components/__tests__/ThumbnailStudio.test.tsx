
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ThumbnailStudio from '../ThumbnailStudio';
import * as replicateService from '../../services/replicateService';

// Mock dependencies
vi.mock('../../services/replicateService', () => ({
    generateLogoWithReplicate: vi.fn(),
}));

const mockGenerateLogo = replicateService.generateLogoWithReplicate as any;

describe('ThumbnailStudio Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks
        mockGenerateLogo.mockResolvedValue({ result: 'http://test.com/logo.png', baseImage: 'http://test.com/base.png' });

        // Mock global Image to trigger onload immediately
        global.Image = class {
            onload: () => void;
            src: string = '';
            naturalWidth: number = 100;
            naturalHeight: number = 100;
            constructor() {
                this.onload = () => { };
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 10);
            }
        } as any;
    });

    it('renders correctly and defaults to Logo Generator step', () => {
        render(<ThumbnailStudio />);
        expect(screen.getByText('Thumbnail Studio')).toBeDefined();
        expect(screen.getByText('Title logo Description')).toBeDefined();
        expect(screen.getByText('Generate Logo')).toBeDefined();
    });

    it('switches between steps', () => {
        render(<ThumbnailStudio />);

        // Switch to Compose
        const composeTab = screen.queryAllByText('Compose').find(el => el.tagName === 'BUTTON');
        if (composeTab) fireEvent.click(composeTab);
        expect(screen.getByText('Canvas Preset')).toBeDefined();
    });

    it('handles logo generation', async () => {
        render(<ThumbnailStudio />);

        const input = screen.getByPlaceholderText("Describe the title logo (e.g. A futuristic, metallic text logo saying 'CyberNinja' with neon accents)");
        fireEvent.change(input, { target: { value: 'TestBrand' } });

        const generateBtn = screen.getByText('Generate Logo');
        fireEvent.click(generateBtn);

        expect(mockGenerateLogo).toHaveBeenCalledWith('TestBrand', undefined);

        await waitFor(() => {
            // Check if generated image appears in preview (based on alt text)
            expect(screen.getByAltText('Generated Logo')).toBeDefined();
        });
    });



    it('adds assets to canvas in compose mode', async () => {
        // Setup state with pre-existing assets by mocking useState? 
        // Harder with functional components. We'll simulate the flow.
        render(<ThumbnailStudio />);

        // 1. Generate Logo
        const input = screen.getByPlaceholderText("Describe the title logo (e.g. A futuristic, metallic text logo saying 'CyberNinja' with neon accents)");
        fireEvent.change(input, { target: { value: 'Brand' } });
        fireEvent.click(screen.getByText('Generate Logo'));
        await waitFor(() => screen.getByAltText('Generated Logo'));

        // 2. Go to Compose
        const composeTab = screen.queryAllByText('Compose').find(el => el.tagName === 'BUTTON');
        if (composeTab) fireEvent.click(composeTab);

        // 3. Click asset to add
        const asset = screen.getByAltText('LG'); // LG is alt for logo in asset list
        fireEvent.click(asset);

        // 4. Verify it's on canvas (check for img with alt="logo")
        // In canvas code: <img ... alt={el.type} ... /> so alt="logo"
        await waitFor(() => {
            expect(screen.getAllByAltText('logo').length).toBeGreaterThan(0);
        });
    });

    it('adds software fade layer and shows settings', async () => {
        render(<ThumbnailStudio />);

        // Go to Compose
        const composeTab = screen.queryAllByText('Compose').find(el => el.tagName === 'BUTTON');
        if (composeTab) fireEvent.click(composeTab);

        // Click Add Software Fade
        const addFadeBtn = screen.getByText('Add Fade');
        fireEvent.click(addFadeBtn);

        // Verify "Active Layer" section and Fade Settings appear
        await waitFor(() => {
            expect(screen.getByText('Active Layer')).toBeDefined();
            expect(screen.getByText('Fade Settings')).toBeDefined();
            expect(screen.getByText('Color')).toBeDefined();
            expect(screen.getByText('Direction')).toBeDefined();
        });
    });
});
