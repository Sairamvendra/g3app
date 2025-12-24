import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// ===== LOGGING SYSTEM =====
// Only enable file logging if NOT on Vercel (read-only FS)
const isVercel = process.env.VERCEL === '1';
const logsDir = path.join(process.cwd(), 'logs');

if (!isVercel && !fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create logs directory:', e);
  }
}

const logToFile = (type, data) => {
  if (isVercel) return; // Skip file logging on Vercel
  try {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsDir, `session-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `[${timestamp}] [${type}] ${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
};

const logger = {
  request: (endpoint, data) => {
    console.log(`📥 [REQUEST] ${endpoint}:`, JSON.stringify(data, null, 2));
    logToFile('REQUEST', { endpoint, data });
  },
  response: (endpoint, data) => {
    console.log(`📤 [RESPONSE] ${endpoint}:`, JSON.stringify(data, null, 2));
    logToFile('RESPONSE', { endpoint, data });
  },
  error: (endpoint, error) => {
    console.error(`❌ [ERROR] ${endpoint}:`, error);
    logToFile('ERROR', { endpoint, error: error.message, stack: error.stack });
  },
  info: (message, data = {}) => {
    console.log(`ℹ️  [INFO] ${message}`, data);
    logToFile('INFO', { message, ...data });
  }
};
// ===== END LOGGING SYSTEM =====

// Debug: Check if API key is loaded
console.log('🔑 API Key loaded:', process.env.REPLICATE_API_KEY ? `${process.env.REPLICATE_API_KEY.substring(0, 8)}...` : 'NOT FOUND');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudioProMax API Server Running' });
});

// API Key endpoint (for client to fetch server's key)
app.get('/api/key/replicate', (req, res) => {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API key not configured on server' });
  }
  res.json({ success: true, key: apiKey });
});

// Text generation endpoint
app.post('/api/generate/text', async (req, res) => {
  try {
    const { prompt, image, max_tokens = 2048, temperature = 0.7, model = 'google/gemini-3-pro' } = req.body;

    const input = {
      prompt,
      max_tokens,
      temperature,
    };

    if (image) {
      input.image = image;
    }

    const output = await replicate.run(model, { input });

    let result;
    if (typeof output === 'string') {
      result = output;
    } else if (Array.isArray(output)) {
      result = output.join('');
    } else {
      result = String(output);
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Text generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate text'
    });
  }
});

// Image generation endpoint
app.post('/api/generate/image', async (req, res) => {
  try {
    const {
      prompt,
      aspect_ratio = '16:9',
      image_size = '2K',
      reference_image,
      model = 'google/nano-banana-pro',
      // Flux 2 Flex specific parameters
      steps,
      guidance,
      seed,
      prompt_upsampling,
      output_format,
      output_quality,
      safety_tolerance,
      custom_width,
      custom_height
    } = req.body;

    let input = { prompt };

    // Model-specific parameter mapping
    if (model === 'black-forest-labs/flux-2-flex' || model === 'black-forest-labs/flux-2-max') {
      // Flux 2 Flex parameters
      input.aspect_ratio = aspect_ratio || '1:1';
      input.resolution = image_size || '1 MP';

      if (req.body.image_input) {
        input.input_images = req.body.image_input;
      } else if (reference_image) {
        input.input_images = [reference_image];
      }

      // Handle 21:9 Aspect Ratio (Not natively supported by Flux)
      if (aspect_ratio === '21:9') {
        input.aspect_ratio = 'custom';
        // Auto-calculate dimensions if not provided
        if (!custom_width || !custom_height) {
          // Default to 1536x640 (1MP) or clamp based on image_size if I had that logic here.
          // For simplicity in server, let's map standard sizes:
          if (image_size === '0.5 MP') { input.width = 1088; input.height = 464; }
          else if (image_size === '2 MP' || image_size === '4 MP') { input.width = 2048; input.height = 880; }
          else { input.width = 1536; input.height = 640; } // 1 MP default
        }
      }

      // Custom dimensions (only when aspect_ratio is 'custom')
      if (aspect_ratio === 'custom' && custom_width && custom_height) {
        input.width = custom_width;
        input.height = custom_height;
      }

      // Advanced settings
      if (steps !== undefined) input.steps = steps;
      if (guidance !== undefined) input.guidance = guidance;
      if (seed !== undefined) input.seed = seed;
      if (prompt_upsampling !== undefined) input.prompt_upsampling = prompt_upsampling;
      if (output_format) input.output_format = output_format;
      if (output_quality !== undefined) input.output_quality = output_quality;
      if (safety_tolerance !== undefined) input.safety_tolerance = safety_tolerance;

    } else {
      // Nano Banana Pro parameters (default)
      input.resolution = image_size || '2K';
      input.aspect_ratio = aspect_ratio;
      input.output_format = output_format || 'png';
      input.safety_filter_level = 'block_only_high';

      if (req.body.image_input) {
        input.image_input = req.body.image_input;
      } else if (reference_image) {
        // Fallback for single image
        input.image = reference_image;
        input.image_prompt = reference_image;
      }
    }

    console.log('Generating image with model:', model);
    console.log('Input parameters:', JSON.stringify(input, null, 2));
    const output = await replicate.run(model, { input });

    console.log('Raw Replicate output:', JSON.stringify(output, null, 2));
    console.log('Output type:', typeof output);
    console.log('Is array:', Array.isArray(output));

    let imageUrl;

    // Handle FileOutput object from Replicate
    if (output && typeof output === 'object' && output.url) {
      // If url is a function, call it
      imageUrl = typeof output.url === 'function' ? output.url() : output.url;
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      // Handle FileOutput in array
      if (firstItem && typeof firstItem === 'object' && firstItem.url) {
        imageUrl = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
      } else {
        imageUrl = firstItem;
      }
    } else {
      console.error('Unexpected output format:', output);
      throw new Error('Unexpected output format from Replicate API');
    }

    console.log('Extracted imageUrl:', imageUrl);
    console.log('imageUrl type:', typeof imageUrl);

    // Convert URL object to string if needed
    if (imageUrl && typeof imageUrl === 'object' && imageUrl.href) {
      imageUrl = imageUrl.href;
      console.log('Converted URL object to string:', imageUrl);
    } else if (imageUrl && typeof imageUrl === 'object' && imageUrl.toString) {
      imageUrl = imageUrl.toString();
      console.log('Converted URL object using toString:', imageUrl);
    }

    // Ensure imageUrl is a string
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('Invalid imageUrl after extraction:', imageUrl);
      throw new Error('Invalid image URL received from Replicate');
    }

    // If URL, fetch and convert to base64
    if (imageUrl.startsWith('http')) {
      console.log('Fetching image from URL:', imageUrl);
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      res.json({ success: true, result: dataUrl });
    } else {
      res.json({ success: true, result: imageUrl });
    }

  } catch (error) {
    logger.error('/api/generate/image', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate image'
    });
  }
});

// Unified Video generation endpoint
app.post('/api/generate/video', async (req, res) => {
  try {
    const {
      model = 'google/veo-3.1',
      prompt,
      resolution,
      duration,
      negative_prompt,
      aspect_ratio,
      start_image,
      end_image,
      mode
    } = req.body;

    logger.request('/api/generate/video', {
      model,
      prompt: prompt ? `${prompt.substring(0, 100)}...` : null,
      resolution,
      duration,
      aspect_ratio,
      mode,
      hasStartImage: !!start_image,
      hasEndImage: !!end_image
    });

    const input = {
      prompt: prompt || 'A cinematic video scene',
    };

    // Model-specific parameter mapping
    switch (model) {
      case 'google/veo-3.1':
      case 'google/veo-3.1-fast':
        // Veo models use: resolution, duration, negative_prompt, aspect_ratio, image, last_frame
        if (resolution) input.resolution = resolution;

        // Veo only supports durations: 4, 6, or 8 seconds
        const validVeoDurations = [4, 6, 8];
        let videoDuration = duration ? parseInt(duration) : 4;
        if (!validVeoDurations.includes(videoDuration)) {
          // Find closest valid duration
          videoDuration = validVeoDurations.reduce((prev, curr) =>
            Math.abs(curr - videoDuration) < Math.abs(prev - videoDuration) ? curr : prev
          );
          console.warn(`[Veo] Adjusting duration from ${duration} to nearest valid value: ${videoDuration} seconds`);
        }
        input.duration = videoDuration;

        if (negative_prompt) input.negative_prompt = negative_prompt;
        // Veo only supports 16:9 or 9:16, default to 16:9 if invalid
        if (aspect_ratio && (aspect_ratio === '16:9' || aspect_ratio === '9:16')) {
          input.aspect_ratio = aspect_ratio;
        } else {
          input.aspect_ratio = '16:9'; // Default fallback
        }
        if (start_image) input.image = start_image;
        if (end_image) input.last_frame = end_image;
        break;

      case 'wan-video/wan-2.2-i2v-fast':
        // Wan 2.2 I2V - Image-to-Video (REQUIRES image)
        // Parameters: prompt, image (required), last_image, num_frames, resolution, frames_per_second, go_fast, sample_shift, seed

        if (!start_image) {
          throw new Error('Wan 2.2 I2V requires a start image');
        }
        input.image = start_image;

        // Last image (optional)
        if (end_image) {
          input.last_image = end_image;
        }

        // Resolution: "480p" or "720p"
        input.resolution = (resolution === '720p' || resolution === '1080p') ? '720p' : '480p';

        // num_frames: 81-121 (81 recommended for best results)
        // Convert duration to frames if provided, otherwise use default
        if (duration) {
          const fps = 16; // Default FPS
          input.num_frames = Math.max(81, Math.min(parseInt(duration) * fps, 121));
        } else {
          input.num_frames = 81; // Default recommended value
        }

        // Frames per second: 5-30 (default 16)
        input.frames_per_second = 16;

        // Go fast mode (default true)
        input.go_fast = true;

        // Sample shift (default 12)
        input.sample_shift = 12;

        break;

      case 'bytedance/seedance-1-pro':
      case 'bytedance/seedance-1-lite':
        // SeeDance models - Text-to-Video and Image-to-Video
        // Parameters: prompt (required), image, last_frame_image, duration, resolution, aspect_ratio, fps, camera_fixed, seed

        // Image (optional - supports both T2V and I2V)
        if (start_image) {
          input.image = start_image;
        }

        // Last frame image (optional, only works if start image is provided)
        if (end_image && start_image) {
          input.last_frame_image = end_image;
        }

        // Duration: 2-12 seconds (default 5)
        const seedanceDuration = duration ? parseInt(duration) : 5;
        input.duration = Math.max(2, Math.min(seedanceDuration, 12));

        // Resolution: "480p", "720p", or "1080p"
        // SeeDance 1 Lite only supports up to 720p
        if (model === 'bytedance/seedance-1-lite') {
          input.resolution = (resolution === '720p' || resolution === '1080p') ? '720p' : '480p';
        } else {
          // SeeDance 1 Pro supports up to 1080p
          if (resolution === '1080p') input.resolution = '1080p';
          else if (resolution === '720p') input.resolution = '720p';
          else input.resolution = '480p';
        }

        // Aspect ratio (ignored if image is provided)
        if (!start_image && aspect_ratio) {
          // Valid: "16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "9:21"
          const validRatios = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'];
          input.aspect_ratio = validRatios.includes(aspect_ratio) ? aspect_ratio : '16:9';
        }

        // FPS: Fixed at 24
        input.fps = 24;

        // Camera fixed (default false)
        input.camera_fixed = false;

        break;

      default:
        console.warn(`Unknown model: ${model}, using generic parameters`);
        if (start_image) input.image = start_image;
        if (end_image) input.last_frame = end_image;
        if (resolution) input.resolution = resolution;
        if (duration) input.duration = parseInt(duration);
        break;
    }

    console.log(`Generating video with ${model}...`);
    console.log('Input parameters:', JSON.stringify(input, null, 2));

    const output = await replicate.run(model, { input });

    // ===== COMPREHENSIVE LOGGING FOR DEBUGGING =====
    console.log('Raw Replicate output:', JSON.stringify(output, null, 2));
    console.log('Output type:', typeof output);
    console.log('Is array:', Array.isArray(output));
    if (output && typeof output === 'object') {
      console.log('Output keys:', Object.keys(output));
      console.log('Output properties:', Object.getOwnPropertyNames(output));
    }
    // ===== END LOGGING =====

    let videoUrl;

    // Handle FileOutput object from Replicate (similar to image handling)
    if (output && typeof output === 'object' && output.url) {
      // If url is a function, call it
      videoUrl = typeof output.url === 'function' ? output.url() : output.url;
      console.log('Extracted from output.url:', videoUrl);
    } else if (typeof output === 'string') {
      videoUrl = output;
      console.log('Output is direct string:', videoUrl);
    } else if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      // Handle FileOutput in array
      if (firstItem && typeof firstItem === 'object' && firstItem.url) {
        videoUrl = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
        console.log('Extracted from array[0].url:', videoUrl);
      } else {
        videoUrl = firstItem;
        console.log('Extracted from array[0]:', videoUrl);
      }
    } else if (output && typeof output === 'object') {
      // Try different possible property names
      videoUrl = output.video || output.output || output.result;
      console.log('Extracted from output properties:', videoUrl);

      // Handle nested URL objects
      if (videoUrl && typeof videoUrl === 'object' && videoUrl.url) {
        videoUrl = typeof videoUrl.url === 'function' ? videoUrl.url() : videoUrl.url;
        console.log('Extracted from nested url property:', videoUrl);
      }
    }

    console.log('Extracted videoUrl:', videoUrl);
    console.log('videoUrl type:', typeof videoUrl);

    // Convert URL object to string if needed
    if (videoUrl && typeof videoUrl === 'object' && videoUrl.href) {
      videoUrl = videoUrl.href;
      console.log('Converted URL object to string:', videoUrl);
    } else if (videoUrl && typeof videoUrl === 'object' && videoUrl.toString) {
      videoUrl = videoUrl.toString();
      console.log('Converted URL object using toString:', videoUrl);
    }

    // Final validation
    if (!videoUrl || typeof videoUrl !== 'string') {
      console.error('=== VIDEO PARSING FAILED ===');
      console.error('Final videoUrl value:', videoUrl);
      console.error('Final videoUrl type:', typeof videoUrl);
      console.error('Original output:', JSON.stringify(output, null, 2));
      throw new Error(`Invalid video URL received from Replicate. Output type: ${typeof output}. Please check server logs for details.`);
    }

    logger.info('Video generated successfully', { model, videoUrl: videoUrl.substring(0, 100) + '...' });
    logger.response('/api/generate/video', { success: true, model });
    res.json({ success: true, result: videoUrl });
  } catch (error) {
    logger.error('/api/generate/video', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate video'
    });
  }
});

// Thumbnail Studio - Logo Generation
app.post('/api/generate-logo', async (req, res) => {
  try {
    const { prompt, referenceImage } = req.body;

    logger.request('/api/generate-logo', { prompt, hasRefImage: !!referenceImage });

    // 1. Construct prompt
    const enhancedPrompt = `${prompt}, solid background, high contrast, centered composition, high quality`;

    const input = {
      prompt: enhancedPrompt,
      aspect_ratio: '3:2',
      resolution: '2K',
      output_format: 'png',
      safety_filter_level: 'block_only_high'
    };

    if (referenceImage) {
      input.image_input = [referenceImage];
    }

    // 2. Generate Base Logo
    console.log('Generating base logo with google/nano-banana-pro...');
    const logoOutput = await replicate.run('google/nano-banana-pro', { input });

    let logoUrl = extractUrlFromOutput(logoOutput);
    console.log('Base logo generated:', logoUrl);

    // 3. Remove Background
    console.log('Removing background with recraft-ai/recraft-remove-background...');
    const bgRemovalOutput = await replicate.run('recraft-ai/recraft-remove-background', {
      input: {
        image: logoUrl
      }
    });

    let transparentLogoUrl = extractUrlFromOutput(bgRemovalOutput);
    console.log('Background removed:', transparentLogoUrl);

    res.json({ success: true, result: transparentLogoUrl, baseImage: logoUrl });

  } catch (error) {
    logger.error('/api/generate-logo', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate logo' });
  }
});

// Thumbnail Studio - Key-Art Generation
app.post('/api/generate-keyart', async (req, res) => {
  try {
    const { description, mood, referenceImage } = req.body;

    logger.request('/api/generate-keyart', { description, mood, hasRefImage: !!referenceImage });

    // 1. Construct Composition Prompt
    const compositionPrompt = `${description}, cinematic composition with all key subjects positioned in the exact center of the frame, surrounding area contains only atmospheric background elements, professional advertising photography style, ${mood || 'cinematic'}`;

    const input = {
      prompt: compositionPrompt,
      aspect_ratio: '16:9',
      resolution: '4K',
      output_format: 'png',
      safety_filter_level: 'block_only_high'
    };

    if (referenceImage) {
      input.image = referenceImage;
      input.image_prompt = referenceImage;
    }

    console.log('Generating key-art with google/nano-banana-pro...');
    const output = await replicate.run('google/nano-banana-pro', { input });

    const imageUrl = extractUrlFromOutput(output);
    console.log('Key-art generated:', imageUrl);

    res.json({ success: true, result: imageUrl });

  } catch (error) {
    logger.error('/api/generate-keyart', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate key-art' });
  }
});

// Helper function to extract URL from various Replicate output formats
function extractUrlFromOutput(output) {
  let url;
  if (output && typeof output === 'object' && output.url) {
    url = typeof output.url === 'function' ? output.url() : output.url;
  } else if (typeof output === 'string') {
    url = output;
  } else if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];
    if (firstItem && typeof firstItem === 'object' && firstItem.url) {
      url = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
    } else {
      url = firstItem;
    }
  }

  if (url && typeof url === 'object' && url.toString) {
    url = url.toString();
  }

  if (!url || typeof url !== 'string') {
    throw new Error('Failed to extract URL from Replicate output: ' + JSON.stringify(output));
  }

  return url;
}

// Start server only if run directly (not imported as a module)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 StudioProMax API Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
