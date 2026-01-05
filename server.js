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
    const { prompt, image, images, max_tokens = 2048, temperature = 0.7, model = 'google/gemini-3-pro' } = req.body;

    const input = {
      prompt,
      max_tokens,
      temperature,
    };

    if (images && Array.isArray(images)) {
      input.images = images;
    } else if (image) {
      input.images = [image];
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

    } else if (model === 'qwen/qwen-image-2512') {
      // Qwen Image 2512 parameters - matching exact API schema
      input.prompt = prompt;

      // Negative prompt (default: " ")
      if (req.body.negative_prompt) {
        input.negative_prompt = req.body.negative_prompt;
      }

      // Aspect ratio - Qwen supports: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, custom
      const validQwenRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', 'custom'];
      if (aspect_ratio && validQwenRatios.includes(aspect_ratio)) {
        input.aspect_ratio = aspect_ratio;
      } else if (aspect_ratio === '21:9' || aspect_ratio === '5:4' || aspect_ratio === '4:5') {
        // Handle unsupported ratios with custom dimensions
        input.aspect_ratio = 'custom';
        if (aspect_ratio === '21:9') { input.width = 1792; input.height = 768; }
        else if (aspect_ratio === '5:4') { input.width = 1280; input.height = 1024; }
        else if (aspect_ratio === '4:5') { input.width = 1024; input.height = 1280; }
      } else {
        input.aspect_ratio = '16:9'; // Default
      }

      // Guidance (0-10, default 4)
      if (req.body.guidance !== undefined) input.guidance = req.body.guidance;

      // Inference steps (20-50, default 40)
      if (req.body.num_inference_steps !== undefined) input.num_inference_steps = req.body.num_inference_steps;

      // Go fast (default true)
      if (req.body.go_fast !== undefined) input.go_fast = req.body.go_fast;

      // Output format (webp, jpg, png - default webp)
      input.output_format = 'png'; // Override to png for consistency

      // Output quality (0-100, default 95)
      if (req.body.output_quality !== undefined) input.output_quality = req.body.output_quality;

      // Seed (optional)
      if (req.body.seed !== undefined && req.body.seed !== null) input.seed = req.body.seed;

      // Disable safety checker (default false)
      if (req.body.disable_safety_checker !== undefined) input.disable_safety_checker = req.body.disable_safety_checker;

      // Image2Image support
      if (req.body.image_input && req.body.image_input.length > 0) {
        input.image = req.body.image_input[0];
        // Strength for image2image (0-1, default 0.8)
        if (req.body.strength !== undefined) input.strength = req.body.strength;
      } else if (reference_image) {
        input.image = reference_image;
        if (req.body.strength !== undefined) input.strength = req.body.strength;
      }

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

// ========== INFLUENCER CONTENT MODULE ENDPOINTS ==========

// Script Refinement - Uses Gemini 3 Pro to refine script and identify B-roll segments
app.post('/api/influencer/refine-script', async (req, res) => {
  try {
    const { rawScript, style = 'professional' } = req.body;

    if (!rawScript || rawScript.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Script content is required' });
    }

    logger.request('/api/influencer/refine-script', { scriptLength: rawScript.length, style });

    const systemPrompt = `You are an expert video script editor for influencer content. Your job is to:
1. Refine the script for ${style} tone while keeping the core message
2. Identify 2-4 segments where B-roll footage would enhance the video
3. Return a JSON response with the refined script and B-roll markers

For each B-roll marker, provide:
- textStart: character index where the B-roll segment starts
- textEnd: character index where the B-roll segment ends  
- prompt: a detailed prompt for generating relevant B-roll video (5-10 words, visual and cinematic)

Return ONLY valid JSON in this exact format:
{
  "refinedScript": "The refined script text...",
  "brollMarkers": [
    { "textStart": 0, "textEnd": 50, "prompt": "Aerial view of modern cityscape at sunset" },
    { "textStart": 100, "textEnd": 150, "prompt": "Close-up hands typing on laptop keyboard" }
  ]
}`;

    const input = {
      prompt: `${systemPrompt}\n\nOriginal Script:\n${rawScript}`,
      max_tokens: 4096,
      temperature: 0.7,
    };

    const output = await replicate.run('google/gemini-3-pro', { input });

    let result;
    if (typeof output === 'string') {
      result = output;
    } else if (Array.isArray(output)) {
      result = output.join('');
    } else {
      result = String(output);
    }

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Add IDs to markers
    const markersWithIds = (parsed.brollMarkers || []).map((marker, index) => ({
      id: `broll-${Date.now()}-${index}`,
      ...marker,
      status: 'pending'
    }));

    logger.response('/api/influencer/refine-script', {
      refinedLength: parsed.refinedScript?.length,
      markerCount: markersWithIds.length
    });

    res.json({
      success: true,
      refinedScript: parsed.refinedScript,
      brollMarkers: markersWithIds
    });

  } catch (error) {
    logger.error('/api/influencer/refine-script', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refine script'
    });
  }
});

// Audio Generation - Uses MiniMax Speech 2.6 HD for high-quality TTS
app.post('/api/influencer/generate-audio', async (req, res) => {
  try {
    const {
      text,
      voiceId = 'English_expressive_narrator',
      emotion = 'auto',
      speed = 1.0,
      audioFormat = 'mp3'
    } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    logger.request('/api/influencer/generate-audio', {
      textLength: text.length,
      voiceId,
      emotion
    });

    const input = {
      text: text,
      voice_id: voiceId,
      emotion: emotion,
      speed: speed,
      audio_format: audioFormat,
      sample_rate: 32000,
      bitrate: 128000,
      subtitle_enable: true
    };

    console.log('Generating audio with minimax/speech-2.6-hd...');
    const output = await replicate.run('minimax/speech-2.6-hd', { input });

    // Extract audio URL from output
    let audioUrl;
    if (output && typeof output === 'object' && output.audio) {
      audioUrl = typeof output.audio.url === 'function' ? output.audio.url() : output.audio.url || output.audio;
    } else if (typeof output === 'string') {
      audioUrl = output;
    } else if (output && output.url) {
      audioUrl = typeof output.url === 'function' ? output.url() : output.url;
    }

    // Convert URL object to string if needed
    if (audioUrl && typeof audioUrl === 'object' && audioUrl.toString) {
      audioUrl = audioUrl.toString();
    }

    if (!audioUrl || typeof audioUrl !== 'string') {
      console.error('Unexpected audio output format:', output);
      throw new Error('Invalid audio URL received from MiniMax');
    }

    // Extract duration if available
    const durationMs = output?.duration_ms || output?.metadata?.duration_ms || null;

    logger.response('/api/influencer/generate-audio', { audioUrl: audioUrl.substring(0, 50) + '...' });

    res.json({
      success: true,
      audioUrl: audioUrl,
      durationMs: durationMs,
      subtitles: output?.subtitles || null
    });

  } catch (error) {
    logger.error('/api/influencer/generate-audio', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate audio'
    });
  }
});

// B-Roll Video Generation - Uses VEO 3.1 Fast for quick B-roll clips
app.post('/api/influencer/generate-broll', async (req, res) => {
  try {
    const {
      prompt,
      duration = 4,
      aspectRatio = '16:9'
    } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    logger.request('/api/influencer/generate-broll', { prompt, duration, aspectRatio });

    // Veo only supports durations: 4, 6, or 8 seconds
    const validDurations = [4, 6, 8];
    let videoDuration = parseInt(duration);
    if (!validDurations.includes(videoDuration)) {
      videoDuration = validDurations.reduce((prev, curr) =>
        Math.abs(curr - videoDuration) < Math.abs(prev - videoDuration) ? curr : prev
      );
    }

    // Veo only supports 16:9 or 9:16
    const validAspectRatio = (aspectRatio === '16:9' || aspectRatio === '9:16') ? aspectRatio : '16:9';

    const input = {
      prompt: `Cinematic B-roll footage: ${prompt}. High quality, smooth motion, professional videography.`,
      duration: videoDuration,
      aspect_ratio: validAspectRatio,
      resolution: '720p'
    };

    console.log('Generating B-roll with google/veo-3.1-fast...');
    const output = await replicate.run('google/veo-3.1-fast', { input });

    const videoUrl = extractUrlFromOutput(output);

    logger.response('/api/influencer/generate-broll', { videoUrl: videoUrl.substring(0, 50) + '...' });

    res.json({
      success: true,
      videoUrl: videoUrl
    });

  } catch (error) {
    logger.error('/api/influencer/generate-broll', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate B-roll video'
    });
  }
});

// Avatar Image Generation - Auto-generates 3 variants based on script and voice
app.post('/api/influencer/generate-avatar', async (req, res) => {
  try {
    const {
      refinedScript,
      voiceId,
      customPrompt // Optional: for manual avatar creation
    } = req.body;

    // Validate inputs
    if (!refinedScript && !customPrompt) {
      return res.status(400).json({ success: false, error: 'Script or custom prompt is required' });
    }

    logger.request('/api/influencer/generate-avatar', {
      scriptLength: refinedScript?.length,
      voiceId,
      hasCustomPrompt: !!customPrompt
    });

    // Determine gender from voice ID
    const isWoman = voiceId?.toLowerCase().includes('woman') ||
      voiceId?.toLowerCase().includes('female') ||
      voiceId?.toLowerCase().includes('narrator_female');
    const isMale = voiceId?.toLowerCase().includes('man') ||
      voiceId?.toLowerCase().includes('male') ||
      voiceId?.toLowerCase().includes('narrator_male');
    const gender = isWoman ? 'woman' : (isMale ? 'man' : 'person');

    // If custom prompt provided, generate just one avatar
    if (customPrompt) {
      const input = {
        prompt: `Professional portrait photo of ${customPrompt}. Looking at camera, confident expression, clean studio background, professional lighting, high quality headshot, 9:16 vertical format.`,
        aspect_ratio: '9:16',
        resolution: '2K',
        output_format: 'png',
        safety_filter_level: 'block_only_high'
      };

      console.log('Generating custom avatar with google/nano-banana-pro...');
      const output = await replicate.run('google/nano-banana-pro', { input });
      const imageUrl = extractUrlFromOutput(output);

      return res.json({
        success: true,
        avatarUrls: [imageUrl],
        prompts: [customPrompt]
      });
    }

    // Generate 3 avatar prompts based on script context using Gemini
    const analysisPrompt = `Analyze this influencer video script and suggest 3 different avatar descriptions for a ${gender} presenter.
    
Script:
${refinedScript.substring(0, 500)}

Return ONLY a JSON array with 3 short avatar descriptions (no explanation, just the array):
["description 1", "description 2", "description 3"]

Each description should be 10-20 words describing the person's appearance, style, and attire suitable for this content.
Focus on: age range, ethnicity diversity, professional attire, and confident expressions.`;

    const analysisInput = {
      prompt: analysisPrompt,
      max_tokens: 500,
      temperature: 0.8,
    };

    console.log('Analyzing script for avatar prompts...');
    const analysisOutput = await replicate.run('google/gemini-3-pro', { input: analysisInput });

    let analysisResult = typeof analysisOutput === 'string' ? analysisOutput :
      Array.isArray(analysisOutput) ? analysisOutput.join('') : String(analysisOutput);

    // Parse the JSON array of prompts
    let avatarPrompts = [];
    try {
      const jsonMatch = analysisResult.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        avatarPrompts = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback prompts if parsing fails
      avatarPrompts = [
        `Professional ${gender} in business casual attire, confident smile, modern look`,
        `Approachable ${gender} with warm expression, smart casual clothing, friendly demeanor`,
        `Dynamic ${gender} with energetic presence, contemporary style, engaging expression`
      ];
    }

    // Ensure we have exactly 3 prompts
    while (avatarPrompts.length < 3) {
      avatarPrompts.push(`Professional ${gender} with confident expression and modern attire`);
    }
    avatarPrompts = avatarPrompts.slice(0, 3);

    // Generate all 3 avatars in parallel
    console.log('Generating 3 avatar variants with google/nano-banana-pro...');
    const avatarPromises = avatarPrompts.map(async (prompt) => {
      const input = {
        prompt: `Professional portrait photo of a ${prompt}. Looking at camera, confident expression, clean studio background, professional lighting, high quality headshot for video content, 9:16 vertical format.`,
        aspect_ratio: '9:16',
        resolution: '2K',
        output_format: 'png',
        safety_filter_level: 'block_only_high'
      };

      const output = await replicate.run('google/nano-banana-pro', { input });
      return extractUrlFromOutput(output);
    });

    const avatarUrls = await Promise.all(avatarPromises);

    logger.response('/api/influencer/generate-avatar', {
      avatarCount: avatarUrls.length,
      prompts: avatarPrompts
    });

    res.json({
      success: true,
      avatarUrls: avatarUrls,
      prompts: avatarPrompts
    });

  } catch (error) {
    logger.error('/api/influencer/generate-avatar', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate avatars'
    });
  }
});

// Talking Head Video Generation - Uses OmniHuman 1.5 to animate avatar with audio
app.post('/api/influencer/generate-talking-head', async (req, res) => {
  try {
    const {
      imageUrl,
      audioUrl,
      prompt = ''
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Avatar image URL is required' });
    }
    if (!audioUrl) {
      return res.status(400).json({ success: false, error: 'Audio URL is required' });
    }

    logger.request('/api/influencer/generate-talking-head', {
      hasImageUrl: !!imageUrl,
      hasAudioUrl: !!audioUrl,
      promptLength: prompt?.length || 0
    });

    const input = {
      image: imageUrl,
      audio: audioUrl
    };

    // Optional prompt for controlling expressions/movements
    if (prompt && prompt.trim().length > 0) {
      input.prompt = prompt;
    }

    console.log('Generating talking head with bytedance/omni-human-1.5...');
    console.log('Input:', JSON.stringify({ ...input, image: input.image?.substring(0, 50) + '...', audio: input.audio?.substring(0, 50) + '...' }, null, 2));

    const output = await replicate.run('bytedance/omni-human-1.5', { input });

    const videoUrl = extractUrlFromOutput(output);

    logger.response('/api/influencer/generate-talking-head', { videoUrl: videoUrl.substring(0, 50) + '...' });

    res.json({
      success: true,
      videoUrl: videoUrl
    });

  } catch (error) {
    logger.error('/api/influencer/generate-talking-head', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate talking head video'
    });
  }
});

// Video Stitching - Combines talking head video with B-roll segments
// Note: This is a simple concatenation endpoint. For complex stitching, consider using ffmpeg
app.post('/api/influencer/stitch-video', async (req, res) => {
  try {
    const {
      talkingHeadUrl,
      brollSegments = [] // Array of { url, insertAtMs, durationMs }
    } = req.body;

    if (!talkingHeadUrl) {
      return res.status(400).json({ success: false, error: 'Talking head video URL is required' });
    }

    logger.request('/api/influencer/stitch-video', {
      hasTalkingHead: !!talkingHeadUrl,
      brollCount: brollSegments.length
    });

    // For now, if no B-roll segments, just return the talking head video
    // In a full implementation, this would use ffmpeg or a video stitching service
    if (brollSegments.length === 0) {
      logger.response('/api/influencer/stitch-video', { finalUrl: talkingHeadUrl.substring(0, 50) + '...' });
      return res.json({
        success: true,
        finalVideoUrl: talkingHeadUrl,
        segments: [{ type: 'talking-head', url: talkingHeadUrl }]
      });
    }

    // Build segment list for client-side preview/export
    // Full stitching would require a video processing service
    const segments = [
      { type: 'talking-head', url: talkingHeadUrl, startMs: 0 },
      ...brollSegments.map((broll, index) => ({
        type: 'broll',
        url: broll.url,
        insertAtMs: broll.insertAtMs,
        durationMs: broll.durationMs,
        index
      }))
    ];

    logger.response('/api/influencer/stitch-video', {
      segmentCount: segments.length,
      hasStitchedVideo: false
    });

    // For MVP, return segment list for client-side handling
    // TODO: Implement server-side video stitching with ffmpeg
    res.json({
      success: true,
      finalVideoUrl: talkingHeadUrl, // Primary video
      segments: segments,
      note: 'Video segments returned for client-side assembly. Full server-side stitching coming soon.'
    });

  } catch (error) {
    logger.error('/api/influencer/stitch-video', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stitch video'
    });
  }
});

// =============================================
// Timeline Editor Endpoints
// =============================================

// Extract Audio from Video - Returns audio URL and basic metadata
app.post('/api/influencer/extract-audio', async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'Video URL is required' });
    }

    logger.request('/api/influencer/extract-audio', { videoUrl: videoUrl.substring(0, 50) + '...' });

    // For MVP, we'll use a simple approach:
    // 1. If the video already has audio, we return a reference
    // 2. In production, this would use FFmpeg or a cloud service to extract audio

    // Simulate audio extraction (in production, use FFmpeg.wasm or cloud processing)
    const audioDurationMs = 30000; // Default duration

    // For now, return the original audio URL if available, or indicate extraction needed
    const result = {
      success: true,
      audioUrl: videoUrl, // In production: extracted audio file URL
      durationMs: audioDurationMs,
      sampleRate: 44100,
      channels: 2,
      note: 'Audio extraction simulated. Use FFmpeg for production.',
    };

    logger.response('/api/influencer/extract-audio', result);
    res.json(result);

  } catch (error) {
    logger.error('/api/influencer/extract-audio', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract audio'
    });
  }
});

// Generate Waveform Data - Returns amplitude samples for visualization
app.post('/api/influencer/generate-waveform', async (req, res) => {
  try {
    const { audioUrl, samples = 150 } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ success: false, error: 'Audio URL is required' });
    }

    logger.request('/api/influencer/generate-waveform', {
      audioUrl: audioUrl.substring(0, 50) + '...',
      samples
    });

    // Generate waveform data
    // In production, this would analyze the actual audio file
    // For MVP, we generate realistic-looking random waveform data
    const waveformData = [];
    const numSamples = Math.min(Math.max(samples, 50), 500); // Clamp between 50-500

    // Create a wave pattern with some randomness to look realistic
    for (let i = 0; i < numSamples; i++) {
      // Base wave with some variation
      const position = i / numSamples;
      const baseAmplitude = 0.3 + 0.2 * Math.sin(position * Math.PI * 4);
      const randomVariation = Math.random() * 0.4;
      const amplitude = Math.min(1, Math.max(0.1, baseAmplitude + randomVariation));
      waveformData.push(amplitude);
    }

    const result = {
      success: true,
      waveformData,
      sampleCount: waveformData.length,
      note: 'Waveform generated. For production, analyze actual audio.',
    };

    logger.response('/api/influencer/generate-waveform', { sampleCount: waveformData.length });
    res.json(result);

  } catch (error) {
    logger.error('/api/influencer/generate-waveform', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate waveform'
    });
  }
});

// Export Video - Combines segments with export settings
app.post('/api/influencer/export-video', async (req, res) => {
  try {
    const {
      segments = [],
      audioTracks = [],
      settings = {}
    } = req.body;

    const { resolution = '1080p', format = 'mp4', burnInCaptions = false } = settings;

    logger.request('/api/influencer/export-video', {
      segmentCount: segments.length,
      audioTrackCount: audioTracks.length,
      resolution,
      format,
      burnInCaptions
    });

    // Validate required data
    if (segments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one video segment is required for export'
      });
    }

    // Calculate total duration
    const totalDurationMs = segments.reduce((sum, seg) => sum + (seg.durationMs || 0), 0);

    // Estimate file size based on resolution and duration
    const mbPerMinute = resolution === '4K' ? 200 : resolution === '1080p' ? 50 : 25;
    const estimatedSizeMb = Math.round((totalDurationMs / 60000) * mbPerMinute);

    // For MVP, return the primary video URL with metadata
    // In production, this would trigger a video processing job
    const primarySegment = segments.find(s => s.type === 'talking-head') || segments[0];

    const result = {
      success: true,
      exportId: `export-${Date.now()}`,
      finalVideoUrl: primarySegment?.videoUrl || null,
      metadata: {
        resolution,
        format,
        burnInCaptions,
        totalDurationMs,
        estimatedSizeMb,
        segmentCount: segments.length,
        audioTrackCount: audioTracks.length
      },
      status: 'complete', // In production: 'processing' -> poll for completion
      note: 'Export simulated. For production, use FFmpeg cloud service.'
    };

    logger.response('/api/influencer/export-video', {
      exportId: result.exportId,
      estimatedSizeMb: result.metadata.estimatedSizeMb
    });

    res.json(result);

  } catch (error) {
    logger.error('/api/influencer/export-video', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export video'
    });
  }
});

// Start server only if run directly (not imported as a module)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 StudioProMax API Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
