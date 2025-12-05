import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptArchitect from '../PromptArchitect';
import { refinePromptWithReplicate } from '../../services/replicateService';

// Mock the replicateService using manual mock in __mocks__
vi.mock('../../services/replicateService');

describe('PromptArchitect', () => {
    const mockOnPromptFinalized = vi.fn();
    const mockToggleCollapse = vi.fn();

    it('renders correctly', () => {
        render(
            <PromptArchitect
                onPromptFinalized={mockOnPromptFinalized}
                isCollapsed={false}
                toggleCollapse={mockToggleCollapse}
            />
        );
        expect(screen.getByPlaceholderText(/Describe your idea/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Prompt Architect/i })).toBeInTheDocument();
    });

    it('updates input value when typing', () => {
        render(
            <PromptArchitect
                onPromptFinalized={mockOnPromptFinalized}
                isCollapsed={false}
                toggleCollapse={mockToggleCollapse}
            />
        );
        const textarea = screen.getByPlaceholderText(/Describe your idea/i) as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'A futuristic city' } });
        expect(textarea.value).toBe('A futuristic city');
    });

    it('calls onPromptFinalized when transfer button is clicked', async () => {
        render(
            <PromptArchitect
                onPromptFinalized={mockOnPromptFinalized}
                isCollapsed={false}
                toggleCollapse={mockToggleCollapse}
            />
        );
        const textarea = screen.getByPlaceholderText(/Describe your idea/i) as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'A futuristic city' } });
        expect(textarea.value).toBe('A futuristic city'); // Verify input update

        // Send the message
        const sendBtn = screen.getByTestId('send-button');
        fireEvent.click(sendBtn);

        // Check if thinking state appears
        expect(screen.getByText(/AI is Thinking/i)).toBeInTheDocument();

        expect(refinePromptWithReplicate).toHaveBeenCalled();

        // Wait for the response to appear
        try {
            const textElement = await screen.findByText('Refined prompt from manual mock');

            // Find the transfer button (Use Full Text as Prompt)
            // We need to find the container first because the button might be nested
            // The container is rendered when there are no code blocks
            const parent = textElement.parentElement!;
            const children = Array.from(parent.children);
            const container = children.find(c => c.getAttribute('data-testid') === 'transfer-container');

            if (!container) throw new Error('Transfer container not found');
            const transferBtn = within(container as HTMLElement).getByRole('button');

            fireEvent.click(transferBtn);
        } catch (e) {
            // If not found, maybe it's the error message?
            const errorMsg = await screen.findByText(/I encountered an error/i).catch(() => null);
            if (errorMsg) {
                throw new Error(`Found error message instead of prompt: ${errorMsg.textContent}`);
            }
            throw e;
        }

        expect(mockOnPromptFinalized).toHaveBeenCalledWith('Refined prompt from manual mock');
    });
});
