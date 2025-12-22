import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SmartBanners from '../SmartBanners';
import * as replicateService from '../../services/replicateService';

// Mock replicateService
vi.mock('../../services/replicateService', () => ({
    reframeBannerWithReplicate: vi.fn(),
    editBannerWithReplicate: vi.fn()
}));

const mockReframe = replicateService.reframeBannerWithReplicate as any;
const mockEdit = replicateService.editBannerWithReplicate as any;

describe('SmartBanners', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock returns
        mockReframe.mockResolvedValue('http://mock.com/banner_16_9.png');
        mockEdit.mockResolvedValue('http://mock.com/banner_edited.png');
    });

    it('renders the Smart Banners module correctly', () => {
        render(<SmartBanners />);

        expect(screen.getByRole('heading', { name: 'Smart Banners' })).toBeInTheDocument();
        expect(screen.getByText('1. Upload Banner')).toBeInTheDocument();
        expect(screen.getByText('2. Target Ratios')).toBeInTheDocument();
        expect(screen.getByText('Generated Assets')).toBeInTheDocument();
    });

    it('displays empty state initially', () => {
        render(<SmartBanners />);
        expect(screen.getByText('No assets generated yet.')).toBeInTheDocument();
        expect(screen.getByText('Upload a banner and select ratios to begin.')).toBeInTheDocument();
    });

    it('allows toggling aspect ratios', () => {
        render(<SmartBanners />);

        // 1:1 should be selected by default (based on component code)
        const squareRatioBtn = screen.getByText('1:1').closest('button');
        expect(squareRatioBtn).toHaveClass('bg-indigo-500/10');

        // Toggle 16:9
        const landscapeBtn = screen.getByText('16:9').closest('button');
        fireEvent.click(landscapeBtn!);
        expect(landscapeBtn).toHaveClass('bg-indigo-500/10');

        // Toggle 1:1 off
        fireEvent.click(squareRatioBtn!);
        expect(squareRatioBtn).not.toHaveClass('bg-indigo-500/10');
    });

    it('enables generate button only when image is uploaded', () => {
        render(<SmartBanners />);

        const generateBtn = screen.getByRole('button', { name: /Analyze & Reframe/i });
        // Initially disabled because no image
        expect(generateBtn).toBeDisabled();
    });

    it('calls generate service when button clicked', async () => {
        render(<SmartBanners />);

        // Mock FileReader
        const mockReadAsDataURL = vi.fn();
        let lastFileReaderInstance: any;

        class MockFileReader {
            readAsDataURL = mockReadAsDataURL;
            result = 'data:image/png;base64,mock-data';
            onloadend: any = null;
            constructor() {
                lastFileReaderInstance = this;
            }
        }
        window.FileReader = MockFileReader as any;

        // Upload File
        const fileInput = screen.getByTestId('banner-upload');
        fireEvent.change(fileInput, { target: { files: [new File(['(⌐□_□)'], 'banner.png', { type: 'image/png' })] } });

        // Trigger FileReader callback wrapped in act
        act(() => {
            if (lastFileReaderInstance && lastFileReaderInstance.onloadend) {
                lastFileReaderInstance.onloadend({} as any);
            }
        });

        // Check if image is displayed
        await waitFor(() => {
            expect(screen.getByAltText('Uploaded Banner')).toBeInTheDocument();
        });

        // Click Generate
        const generateBtn = screen.getByRole('button', { name: /Analyze & Reframe/i });
        expect(generateBtn).not.toBeDisabled();
        fireEvent.click(generateBtn);

        // Expect service to be called
        // 1:1 is selected by default
        expect(mockReframe).toHaveBeenCalledWith(
            'data:image/png;base64,mock-data',
            '1:1'
        );
    });

    it('handles edit workflow', async () => {
        render(<SmartBanners />);

        // --- 1. SETUP: Upload and Generate ---
        const mockReadAsDataURL = vi.fn();
        let lastFileReaderInstance: any;
        class MockFileReader {
            readAsDataURL = mockReadAsDataURL;
            result = 'data:image/png;base64,mock-data';
            onloadend: any = null;
            constructor() { lastFileReaderInstance = this; }
        }
        window.FileReader = MockFileReader as any;

        const fileInput = screen.getByTestId('banner-upload');
        fireEvent.change(fileInput, { target: { files: [new File(['foo'], 'foo.png', { type: 'image/png' })] } });

        act(() => {
            if (lastFileReaderInstance?.onloadend) lastFileReaderInstance.onloadend({});
        });

        await waitFor(() => screen.getByAltText('Uploaded Banner'));

        fireEvent.click(screen.getByRole('button', { name: /Analyze & Reframe/i }));

        // Wait for generation to complete (mock resolves immediately, but we wait for UI update)
        await waitFor(() => {
            // Wait for image
            expect(screen.getByAltText('Generated 1:1')).toBeInTheDocument();
        });

        // --- 2. INTERACT: Click Edit ---
        const editBtns = screen.getAllByTitle('Edit with AI');
        expect(editBtns.length).toBeGreaterThan(0);

        fireEvent.click(editBtns[0]);

        // --- 3. ASSERT: Modal Open ---
        expect(screen.getByText('Edit Banner (1:1)')).toBeInTheDocument();

        // --- 4. INTERACT: Enter Prompt and Submit ---
        const promptInput = screen.getByPlaceholderText(/Describe how you want to modify/i);
        fireEvent.change(promptInput, { target: { value: 'Make it pop' } });

        const applyBtn = screen.getByRole('button', { name: /Apply Edits/i });
        fireEvent.click(applyBtn);

        // --- 5. ASSERT: Service Called ---
        expect(mockEdit).toHaveBeenCalledWith(
            'http://mock.com/banner_16_9.png', // The original mocked return from reframe
            'Make it pop',
            '1:1'
        );

        // --- 6. ASSERT: Modal closes ---
        await waitFor(() => {
            expect(screen.queryByText('Edit Banner (1:1)')).not.toBeInTheDocument();
        });
    });
});
