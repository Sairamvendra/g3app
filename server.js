import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

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
    if (model === 'black-forest-labs/flux-2-flex') {
      // Flux 2 Flex parameters
      input.aspect_ratio = aspect_ratio || '1:1';
      input.resolution = image_size || '1 MP';

      if (reference_image) {
        input.input_images = [reference_image];
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

      if (reference_image) {
        input.image_input = [reference_image];
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
    console.error('Image generation error:', error);
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
      end_image
    } = req.body;

    const input = {
      prompt: prompt || 'A cinematic video scene',
    };

    // Model-specific parameter mapping
    switch (model) {
      case 'google/veo-3.1':
      case 'google/veo-3.1-fast':
        // Veo models use: resolution, duration, negative_prompt, aspect_ratio, image, last_frame
        if (resolution) input.resolution = resolution;
        if (duration) input.duration = duration;
        if (negative_prompt) input.negative_prompt = negative_prompt;
        if (aspect_ratio) input.aspect_ratio = aspect_ratio;
        if (start_image) input.image = start_image;
        if (end_image) input.last_frame = end_image;
        break;

      case 'kwaivgi/kling-v2.1':
        // Kling uses: mode (instead of resolution), duration, negative_prompt, start_image (required!), end_image
        if (!start_image) {
          throw new Error('Kling v2.1 requires a start image');
        }
        input.start_image = start_image;
        if (end_image) input.end_image = end_image;

        // Map resolution to mode
        input.mode = resolution === 'pro' || resolution === '1080p' ? 'pro' : 'standard';
        if (duration) input.duration = duration;
        if (negative_prompt) input.negative_prompt = negative_prompt;
        break;

      case 'wan-video/wan-2.2-i2v-fast':
        // Wan uses: resolution, image (required!), last_image, num_frames (instead of duration)
        if (!start_image) {
          throw new Error('Wan 2.2 I2V requires a start image');
        }
        input.image = start_image;
        if (end_image) input.last_image = end_image;
        if (resolution) input.resolution = resolution;

        // Convert duration to num_frames (approximate: 16fps default)
        if (duration) {
          input.num_frames = Math.min(duration * 16, 121);
        }
        break;

      case 'bytedance/seedance-1-pro':
      case 'bytedance/seedance-1-lite':
        // SeeDance models support both text-to-video and image-to-video
        if (start_image) input.image = start_image;
        if (end_image) input.last_frame_image = end_image;

        // Core parameters
        if (duration) input.duration = duration;
        if (!start_image && aspect_ratio) input.aspect_ratio = aspect_ratio; // Ignored when image is provided
        if (resolution) input.resolution = resolution;
        input.fps = 24; // Fixed at 24 fps

        if (negative_prompt) input.negative_prompt = negative_prompt;
        break;

      default:
        console.warn(`Unknown model: ${model}, using generic parameters`);
        if (start_image) input.image = start_image;
        if (end_image) input.last_frame = end_image;
        if (resolution) input.resolution = resolution;
        if (duration) input.duration = duration;
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

    console.log('Video generated successfully:', videoUrl);
    res.json({ success: true, result: videoUrl });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate video'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StudioProMax API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
