import { vi } from 'vitest';

export const refinePromptWithReplicate = vi.fn(() => Promise.resolve('Refined prompt from manual mock'));
export const generateImageWithReplicate = vi.fn(() => Promise.resolve('http://mock-url.com/image.png'));
export const analyzeStoryboardFlowWithReplicate = vi.fn(() => Promise.resolve([]));
export const generatePersonaPromptWithReplicate = vi.fn(() => Promise.resolve('Persona prompt'));
export const generateVideoWithReplicate = vi.fn(() => Promise.resolve('http://mock-url.com/video.mp4'));
