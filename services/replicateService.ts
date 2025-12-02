import Replicate from 'replicate';
import { ReplicateVideoSettings } from '../types';

// Dynamic API Key Retrieval
export const getReplicateApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('replicate_api_key');
    if (stored) return stored;
  }
  return process.env.REPLICATE_API_KEY || '';
};

export const hasValidReplicateApiKey = (): boolean => {
  const key = getReplicateApiKey();
  return !!key && key.length > 0;
};

// Helper to get a fresh client instance
const getReplicateClient = () => {
  return new Replicate({
    auth: getReplicateApiKey(),
  });
};

// Replicate Video Models Configuration
export const REPLICATE_VIDEO_MODELS = [
  {
    id: 'minimax/video-01',
    name: 'MiniMax Video-01',
    description: 'High-quality text-to-video and image-to-video generation',
    type: 'text-to-video',
    maxDuration: 6,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  {
    id: 'lightricks/ltx-video',
    name: 'LTX Video',
    description: 'Fast, high-quality video generation model',
    type: 'text-to-video',
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
  },
  {
    id: 'tencent/hunyuan-video',
    name: 'Hunyuan Video',
    description: 'Tencent\'s advanced video generation model',
    type: 'text-to-video',
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  {
    id: 'genmo/mochi-1-preview',
    name: 'Mochi 1',
    description: 'State-of-the-art video generation with realistic motion',
    type: 'text-to-video',
    maxDuration: 6,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  {
    id: 'fofr/kling-video',
    name: 'Kling Video',
    description: 'Professional-grade video generation',
    type: 'text-to-video',
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
  {
    id: 'tencent/hunyuan-video-i2v',
    name: 'Hunyuan Image-to-Video',
    description: 'Convert images to videos with motion',
    type: 'image-to-video',
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1'],
  },
];

// Helper function to convert base64 to data URI for Replicate
const prepareImageForReplicate = (base64Image: string): string => {
  // If it's already a data URI, return as is
  if (base64Image.startsWith('data:')) {
    return base64Image;
  }
  // Otherwise, assume it's PNG and add the data URI prefix
  return `data:image/png;base64,${base64Image}`;
};

// Main video generation function
export const generateVideoWithReplicate = async (
  settings: ReplicateVideoSettings,
  prompt: string,
  startImage?: string | null,
  endImage?: string | null
): Promise<string> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required. Please configure it in settings.');
  }

  const replicate = getReplicateClient();
  const modelConfig = REPLICATE_VIDEO_MODELS.find(m => m.id === settings.model);

  if (!modelConfig) {
    throw new Error(`Unknown model: ${settings.model}`);
  }

  // Prepare input based on model type and available inputs
  const input: Record<string, any> = {
    prompt: prompt || 'A cinematic video scene',
  };

  // Model-specific configurations
  switch (settings.model) {
    case 'minimax/video-01':
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      input.aspect_ratio = settings.aspectRatio || '16:9';
      break;

    case 'lightricks/ltx-video':
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      input.aspect_ratio = settings.aspectRatio || '16:9';
      input.num_frames = Math.min(settings.numFrames || 121, 257);
      input.num_inference_steps = settings.inferenceSteps || 30;
      break;

    case 'tencent/hunyuan-video':
      input.video_length = settings.videoLength || '5s';
      input.resolution = settings.resolution || '720p';
      input.seed = settings.seed;
      break;

    case 'genmo/mochi-1-preview':
      input.num_frames = settings.numFrames || 84;
      input.num_inference_steps = settings.inferenceSteps || 64;
      input.guidance_scale = settings.guidanceScale || 4.5;
      input.seed = settings.seed;
      break;

    case 'fofr/kling-video':
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      input.duration = settings.duration || '5';
      input.aspect_ratio = settings.aspectRatio || '16:9';
      input.cfg_scale = settings.cfgScale || 0.5;
      break;

    case 'tencent/hunyuan-video-i2v':
      if (!startImage) {
        throw new Error('Image-to-video model requires a start image');
      }
      input.image = prepareImageForReplicate(startImage);
      input.video_length = settings.videoLength || '5s';
      input.seed = settings.seed;
      break;

    default:
      // Generic fallback
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      break;
  }

  try {
    console.log(`Generating video with ${modelConfig.name}...`, input);

    const output = await replicate.run(
      settings.model as `${string}/${string}:${string}` | `${string}/${string}`,
      { input }
    );

    // Handle different output formats
    let videoUrl: string;

    if (typeof output === 'string') {
      videoUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = output[0];
    } else if (output && typeof output === 'object' && 'video' in output) {
      videoUrl = (output as any).video;
    } else {
      throw new Error('Unexpected output format from Replicate API');
    }

    console.log('Video generated successfully:', videoUrl);
    return videoUrl;
  } catch (error: any) {
    console.error('Replicate video generation error:', error);

    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('Invalid Replicate API key. Please check your configuration.');
    }

    if (error.message?.includes('quota') || error.message?.includes('credits')) {
      throw new Error('Insufficient Replicate credits. Please check your account.');
    }

    throw new Error(`Video generation failed: ${error.message || 'Unknown error'}`);
  }
};

// Utility to check model capabilities
export const getModelCapabilities = (modelId: string) => {
  return REPLICATE_VIDEO_MODELS.find(m => m.id === modelId);
};

// Utility to validate settings for a specific model
export const validateModelSettings = (
  modelId: string,
  settings: ReplicateVideoSettings
): { valid: boolean; errors: string[] } => {
  const model = getModelCapabilities(modelId);
  const errors: string[] = [];

  if (!model) {
    errors.push('Unknown model');
    return { valid: false, errors };
  }

  if (settings.aspectRatio && !model.aspectRatios.includes(settings.aspectRatio)) {
    errors.push(`Aspect ratio ${settings.aspectRatio} not supported by ${model.name}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
