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
    id: 'google/veo-3.1-fast',
    name: 'Google Veo 3.1 Fast',
    description: 'Fast, high-quality video generation with optional audio synthesis',
    type: 'text-to-video',
    maxDuration: 8,
    durations: [4, 6, 8],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    supportsAudio: true,
  },
  {
    id: 'google/veo-3.1',
    name: 'Google Veo 3.1',
    description: 'Advanced video generation with reference image support',
    type: 'text-to-video',
    maxDuration: 8,
    durations: [4, 6, 8],
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p'],
    supportsReferenceImages: true,
    supportsAudio: true,
  },
  {
    id: 'wan-video/wan-2.2-i2v-fast',
    name: 'Wan 2.2 I2V Fast',
    description: 'Fast image-to-video with flexible frame and FPS control',
    type: 'image-to-video',
    maxDuration: 7.5,
    resolutions: ['480p', '720p'],
    requiresStartImage: true,
    frameRange: [81, 121],
    fpsRange: [5, 30],
    // Note: Wan determines aspect ratio from input image
  },
  {
    id: 'bytedance/seedance-1-pro',
    name: 'SeeDance 1 Pro',
    description: 'High-quality text/image-to-video with 480p-1080p resolution support',
    type: 'text-to-video',
    maxDuration: 12,
    durations: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    resolutions: ['480p', '720p', '1080p'],
    supportsReferenceImages: true,
    supportsCameraFixed: true,
    supportsEndFrame: true,
  },
  {
    id: 'bytedance/seedance-1-lite',
    name: 'SeeDance 1 Lite',
    description: 'Fast text/image-to-video with 480p-720p resolution',
    type: 'text-to-video',
    maxDuration: 12,
    durations: [5, 10],
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '9:21'],
    resolutions: ['480p', '720p'],
    supportsReferenceImages: true,
    supportsCameraFixed: true,
    supportsEndFrame: true,
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
    case 'google/veo-3.1-fast':
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      if (endImage) {
        input.last_frame = prepareImageForReplicate(endImage);
      }
      input.duration = settings.duration || 8;
      input.aspect_ratio = settings.aspectRatio || '16:9';
      input.resolution = settings.resolution || '1080p';
      input.generate_audio = settings.generateAudio !== false; // Default true
      if (settings.negativePrompt) {
        input.negative_prompt = settings.negativePrompt;
      }
      if (settings.seed) {
        input.seed = settings.seed;
      }
      break;

    case 'google/veo-3.1':
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      if (endImage) {
        input.last_frame = prepareImageForReplicate(endImage);
      }
      // Reference images support (1-3 images)
      if (settings.referenceImages && settings.referenceImages.length > 0) {
        input.reference_images = settings.referenceImages
          .slice(0, 3)
          .map(img => prepareImageForReplicate(img));
      }
      input.duration = settings.duration || 8;
      input.aspect_ratio = settings.aspectRatio || '16:9';
      input.resolution = settings.resolution || '1080p';
      input.generate_audio = settings.generateAudio !== false; // Default true
      if (settings.negativePrompt) {
        input.negative_prompt = settings.negativePrompt;
      }
      if (settings.seed) {
        input.seed = settings.seed;
      }
      break;

    case 'wan-video/wan-2.2-i2v-fast':
      // Wan 2.2 REQUIRES a start image
      if (!startImage) {
        throw new Error('Wan 2.2 I2V Fast requires a start image for image-to-video generation');
      }
      input.image = prepareImageForReplicate(startImage);

      if (endImage) {
        input.last_image = prepareImageForReplicate(endImage);
      }

      input.num_frames = settings.numFrames || 81; // 81 gives best results
      input.resolution = settings.resolution || '480p';
      input.frames_per_second = settings.fps || 16;
      input.sample_shift = settings.sampleShift || 12;
      input.go_fast = settings.goFast !== false; // Default true
      input.interpolate_output = settings.interpolateOutput || false;

      if (settings.seed) {
        input.seed = settings.seed;
      }
      break;

    case 'bytedance/seedance-1-pro':
    case 'bytedance/seedance-1-lite':
      // SeeDance models support both text-to-video and image-to-video
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }

      // Last frame image (requires start image)
      if (endImage && startImage) {
        input.last_frame_image = prepareImageForReplicate(endImage);
      }

      // Reference images (1-4 images for character/style guidance)
      if (settings.referenceImages && settings.referenceImages.length > 0) {
        input.reference_images = settings.referenceImages
          .slice(0, 4)
          .map((img: string) => prepareImageForReplicate(img));
      }

      input.duration = settings.duration || 5;

      // Aspect ratio is ignored when input image is provided
      if (!startImage) {
        input.aspect_ratio = settings.aspectRatio || '16:9';
      }

      input.resolution = settings.resolution || (settings.model === 'bytedance/seedance-1-pro' ? '1080p' : '720p');
      input.fps = 24; // Fixed at 24 fps for both models

      // Camera fixed option (locks camera position)
      if (settings.cameraFixed !== undefined) {
        input.camera_fixed = settings.cameraFixed;
      }

      if (settings.negativePrompt) {
        input.negative_prompt = settings.negativePrompt;
      }

      if (settings.seed) {
        input.seed = settings.seed;
      }
      break;

    default:
      // Generic fallback
      if (startImage) {
        input.image = prepareImageForReplicate(startImage);
      }
      break;
  }

  try {
    console.log(`Generating video via server with ${modelConfig.name}...`, input);

    // Call server endpoint instead of direct Replicate API
    const response = await fetch('http://localhost:3002/api/generate/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        prompt: input.prompt,
        resolution: input.resolution || settings.resolution,
        duration: input.duration || settings.duration,
        negative_prompt: input.negative_prompt || settings.negativePrompt,
        aspect_ratio: input.aspect_ratio || settings.aspectRatio,
        mode: input.mode || settings.mode,
        start_image: startImage,
        end_image: endImage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Failed to generate video');
    }

    console.log('Video generated successfully:', data.result);
    return data.result;
  } catch (error: any) {
    console.error('Video generation error:', error);

    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('Invalid Replicate API key. Please check your server configuration.');
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

// ============================================================================
// TEXT GENERATION FUNCTIONS (using google/gemini-3-pro)
// ============================================================================

// Helper to convert File to base64 data URI
const fileToDataUri = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Refine prompt with conversational AI (replaces refinePromptWithGemini)
export const refinePromptWithReplicate = async (
  conversationHistory: { role: string; text: string }[],
  systemInstruction: string,
  storyboardImage?: File | null
): Promise<string> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required.');
  }

  const replicate = getReplicateClient();

  // Build prompt with conversation history
  let fullPrompt = `${systemInstruction}\n\nConversation History:\n`;
  conversationHistory.forEach(msg => {
    fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
  });

  const input: Record<string, any> = {
    prompt: fullPrompt,
    system_instruction: systemInstruction,
    thinking_level: 'high',
    temperature: 0.7,
    max_output_tokens: 4096,
  };

  // Add image if provided
  if (storyboardImage) {
    const dataUri = await fileToDataUri(storyboardImage);
    input.images = [dataUri];
  }

  try {
    // Call server endpoint for text generation
    const response = await fetch('http://localhost:3002/api/generate/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image: input.images?.[0],
        max_tokens: 4096,
        temperature: 0.7,
        model: 'google/gemini-3-pro',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Failed to generate response');
    }

    return data.result || "I couldn't generate a response.";
  } catch (error: any) {
    console.error('Text generation error:', error);
    throw new Error(`Prompt refinement failed: ${error.message || 'Unknown error'}`);
  }
};

// Analyze storyboard flow (replaces analyzeStoryboardFlow)
export const analyzeStoryboardFlowWithReplicate = async (
  storyboardBase64: string,
  userPrompt: string,
  systemInstruction: string
): Promise<string[]> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required.');
  }

  const replicate = getReplicateClient();

  const analysisPrompt = `
You are an expert storyboard artist and cinematographer.
1. Analyze the attached storyboard page image.
2. Identify the number of individual panels (usually 6-8).
3. For EACH panel, write a highly detailed image generation prompt.
4. Incorporate the user's specific story guidance: "${userPrompt}".
5. Adhere to these System Instructions: "${systemInstruction}".

OUTPUT FORMAT:
You must return strictly a JSON array of strings, where each string is the prompt for one panel.
Example: ["Panel 1 prompt...", "Panel 2 prompt...", "Panel 3 prompt..."]
  `;

  const input = {
    prompt: analysisPrompt,
    images: [storyboardBase64],
    system_instruction: systemInstruction,
    thinking_level: 'high',
    temperature: 0.5,
    max_output_tokens: 8192,
  };

  try {
    const response = await fetch('http://localhost:3002/api/generate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: analysisPrompt,
        image: storyboardBase64,
        max_tokens: 8192,
        temperature: 0.5,
        model: 'google/gemini-3-pro',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.result || '';

    console.log('[Storyboard Analysis] Raw response:', text);

    try {
      // Clean up markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(String);
      } else if (Array.isArray(parsed) && parsed.length === 0) {
        console.warn('[Storyboard Analysis] Received empty array');
        return [];
      }

      console.warn('[Storyboard Analysis] Parsed result is not an array:', parsed);
      return [];
    } catch (e) {
      console.error('[Storyboard Analysis] JSON Parse Error:', e);
      console.log('[Storyboard Analysis] Failed text content:', text);
      return text.split('\n').filter((line: string) => line.length > 10);
    }
  } catch (error: any) {
    console.error('Storyboard analysis error:', error);
    throw new Error(`Storyboard analysis failed: ${error.message || 'Unknown error'}`);
  }
};

// Generate persona prompt from image (replaces generatePersonaPrompt)
export const generatePersonaPromptWithReplicate = async (
  imageBase64: string,
  name: string
): Promise<string> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required.');
  }

  const replicate = getReplicateClient();

  const promptText = `
Analyze the uploaded image of the character named "${name}".
Create a compressed "Persona Prompt" that captures their key physical visual traits, attire, and cultural markers.
Format: ${name.toUpperCase()}|ethnicity|body|clothing|accessory|hair|vibe
Return ONLY the string.
  `;

  const input = {
    prompt: promptText,
    images: [imageBase64],
    temperature: 0.3,
    max_output_tokens: 512,
  };

  try {
    const response = await fetch('http://localhost:3002/api/generate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        image: imageBase64,
        max_tokens: 512,
        temperature: 0.3,
        model: 'google/gemini-3-pro',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return (data.result || '').trim();
  } catch (error: any) {
    console.error('Persona generation error:', error);
    throw new Error(`Persona generation failed: ${error.message || 'Unknown error'}`);
  }
};

// Improve video prompt (replaces improveVideoPromptWithGemini)
export const improveVideoPromptWithReplicate = async (
  prompt: string,
  startImage: string | null,
  endImage: string | null
): Promise<string> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required.');
  }

  const replicate = getReplicateClient();

  const systemInstruction = `
You are an expert video prompt engineer / cinematographer.
Task: Analyze the provided start/end frames and user text to create a high-fidelity video generation prompt.

Output Format Strategy:
- If the scene is technical or complex, use 'JSON Structure' (e.g. {"subject": "...", "action": "...", "camera_movement": "...", "lighting": "..."}).
- If the scene is narrative-driven, use 'TOON/Tag Format' (e.g. [SUBJECT: ...] [ACTION: ...] [CAMERA: ...]).
- Choose the format that best ensures the model understands the transition between the two images.

Constraint:
- Return ONLY the final prompt text string. Do not include markdown code blocks or explanations.
  `;

  const images: string[] = [];
  let imageContext = '';

  if (startImage) {
    images.push(startImage);
    imageContext += 'Image 1: Start Frame\n';
  }

  if (endImage) {
    images.push(endImage);
    imageContext += 'Image 2: End Frame\n';
  }

  const fullPrompt = `${imageContext}\nUser Instruction: "${prompt || 'Create a transition between these images'}"\n\nImprove this prompt to explain the motion clearly.`;

  const input: Record<string, any> = {
    prompt: fullPrompt,
    system_instruction: systemInstruction,
    thinking_level: 'high',
    temperature: 0.6,
    max_output_tokens: 2048,
  };

  if (images.length > 0) {
    input.images = images;
  }

  try {
    const response = await fetch('http://localhost:3002/api/generate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        image: images[0] || null,
        max_tokens: 2048,
        temperature: 0.6,
        model: 'google/gemini-3-pro',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return (data.result || prompt).trim();
  } catch (error: any) {
    console.error('Video prompt improvement error:', error);
    throw new Error(`Video prompt improvement failed: ${error.message || 'Unknown error'}`);
  }
};

// ============================================================================
// IMAGE GENERATION FUNCTION (using google/nano-banana-pro)
// ============================================================================

export const generateImageWithReplicate = async (
  prompt: string,
  settings: any,
  activeAngle: string
): Promise<string> => {
  if (!hasValidReplicateApiKey()) {
    throw new Error('Replicate API key is required.');
  }

  const replicate = getReplicateClient();

  // Build comprehensive prompt with all settings
  let ratioInstruction = `Aspect Ratio: ${settings.aspectRatio}`;
  if (settings.aspectRatio === '21:9') ratioInstruction += " (Cinematic Ultrawide).";
  else if (settings.aspectRatio === '3:2') ratioInstruction += " (35mm Film).";

  let gradingInstruction = `Color Workflow: ${settings.diWorkflow}`;
  if (settings.customColorGrading) gradingInstruction += ` | Custom Look/LUT: ${settings.customColorGrading}`;

  let lightingInstruction = `Lighting Style: ${settings.lighting}`;

  // Handle relight settings
  if (settings.relight && settings.relight.enabled) {
    const { gels, lights, modifiers } = settings.relight;
    const activeLights: string[] = [];

    const getIntensityDesc = (val: number) => {
      if (val < 20) return "Faint";
      if (val < 50) return "Moderate";
      if (val < 80) return "Bright";
      return "Intense";
    };

    const getLightDescription = (role: string, x: number, y: number) => {
      const dx = x - 50;
      const dy = y - 50;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        if (role === 'Back Light' || role === 'Rim Light') return "directly behind the subject (Halo/Silhouette effect)";
        if (role === 'Key Light') return "directly frontal (Flat lighting)";
        return "centered overhead";
      }

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * (180 / Math.PI);
      let clockVal = (angleDeg + 90) / 30;
      if (clockVal < 0) clockVal += 12;
      if (clockVal === 0) clockVal = 12;
      const hour = Math.round(clockVal) || 12;

      const clockDesc = `${hour} o'clock position`;

      switch (role) {
        case 'Key Light':
          return `Key Light acting from ${clockDesc} (illuminating the subject's face/front)`;
        case 'Rim Light':
          return `Rim Light coming from ${clockDesc} (positioned BEHIND the subject, highlighting the edge)`;
        case 'Back Light':
          return `Back Light originating from ${clockDesc} (source is BEHIND subject, separating them from background)`;
        case 'Bounce Light':
          return `Soft Fill/Bounce Light from ${clockDesc}`;
        default:
          return `Light Source from ${clockDesc}`;
      }
    };

    const addLightPrompt = (role: string, light: any, colorHex: string) => {
      if (!light.enabled) return;
      const description = getLightDescription(role, light.x, light.y);
      const intensity = getIntensityDesc(light.intensity);
      activeLights.push(`- (OFF-CAMERA INVISIBLE SOURCE) ${description}, Intensity: ${intensity}, Gel Color: ${colorHex}.`);
    };

    addLightPrompt("Key Light", lights.key, gels[lights.key.colorIndex]);
    addLightPrompt("Rim Light", lights.rim, gels[lights.rim.colorIndex]);
    addLightPrompt("Back Light", lights.back, gels[lights.back.colorIndex]);
    addLightPrompt("Bounce Light", lights.bounce, gels[lights.bounce.colorIndex]);

    lightingInstruction = `
[VIRTUAL RELIGHT CONFIGURATION]:
The following lights are purely atmospheric/illumination effects. The sources MUST NOT be visible.
${activeLights.join('\n')}

[LIGHT QUALITY]:
- Spread/Softness: ${modifiers.diffuser > 50 ? 'Large soft source (Diffused)' : 'Tight beam (Hard/Specular)'}.
- Contrast: ${modifiers.negativeFill > 50 ? 'High contrast (Negative Fill)' : 'Natural fill'}.
    `;
  }

  let cameraControlsInstruction = "";
  const cc = settings.cameraControls;
  const hasCustomControls = cc && (cc.rotation !== 0 || cc.moveForward !== 0 || cc.verticalAngle !== 0 || cc.isWideAngle);

  if (hasCustomControls) {
    const directives = [];
    if (cc.rotation !== 0) directives.push(`Rotation: ${cc.rotation > 0 ? 'Right' : 'Left'} ${Math.abs(cc.rotation)} degrees.`);
    if (cc.moveForward > 0) directives.push(`Distance: Zoom Level ${cc.moveForward}/10.`);
    if (cc.verticalAngle !== 0) directives.push(`Height: ${cc.verticalAngle > 0 ? 'High' : 'Low'} Angle ${Math.abs(cc.verticalAngle)}.`);
    if (cc.isWideAngle) directives.push("Lens: Wide Angle.");
    cameraControlsInstruction = `[CAMERA CONFIG]: ${directives.join(' ')}`;
  }

  let shotTypeInstruction = `Camera Shot: ${activeAngle}`;
  if (activeAngle === 'Custom Camera Settings' || hasCustomControls) shotTypeInstruction = "";

  const fullPrompt = `
${prompt}

TECHNICAL SPECS:
${ratioInstruction}. ${shotTypeInstruction}
Mood: ${settings.mood}.
DI/Grading: ${gradingInstruction}.

${lightingInstruction}
${cameraControlsInstruction}

RENDER GUIDELINES:
- Photorealistic, High Fidelity, 4K.
- COMPOSITION: Ensure the subject is framed such that the light sources themselves are OUT OF FRAME.

NEGATIVE PROMPT / EXCLUSIONS:
- DO NOT RENDER: Light stands, c-stands, softboxes, light fixtures, studio lamps, umbrellas, tripods.
- The image should look like a movie still, NOT a behind-the-scenes photo.
- No visible lighting equipment in the shot.
  `.trim();

  // Map aspect ratio to nano-banana-pro format
  const aspectRatioMap: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '3:4': '3:4',
    '4:3': '4:3',
    '21:9': '21:9',
    '3:2': '3:2',
    '2:3': '2:3',
    '5:4': '5:4',
    '4:5': '4:5',
    'Auto': 'match_input_image',
  };

  const input: Record<string, any> = {
    prompt: fullPrompt,
    aspect_ratio: aspectRatioMap[settings.aspectRatio] || '16:9',
    resolution: settings.imageSize || '2K', // Use the actual selected value: 1K, 2K, or 4K
    output_format: 'png',
    safety_filter_level: 'block_only_high',
  };

  // Add reference images if provided
  const imageInputs: string[] = [];

  // Character references
  if (settings.characterReferences && settings.characterReferences.length > 0) {
    settings.characterReferences.forEach((char: any) => {
      imageInputs.push(char.imageBase64);
      // Add character-specific instruction to prompt
      input.prompt += `\n\n[CHARACTER REFERENCE]: Include "${char.name}" exactly as shown in reference image.`;
      if (char.persona) {
        input.prompt += ` Persona/Description: ${char.persona}`;
      }
    });
  }

  // Style/scene references
  if (settings.referenceImages && settings.referenceImages.length > 0) {
    settings.referenceImages.forEach((imgDataUrl: string) => {
      imageInputs.push(imgDataUrl);
    });
    input.prompt += `\n\n[STYLE REFERENCES]: Use reference images for mood, lighting, framing, and style.`;
  }

  if (imageInputs.length > 0) {
    // nano-banana-pro supports up to 14 images
    input.image_input = imageInputs.slice(0, 14);
  }

  try {
    console.log('Generating image via server...', { aspectRatio: input.aspect_ratio, resolution: input.resolution });

    // Call server endpoint instead of direct Replicate API
    const response = await fetch('http://localhost:3002/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio,
        image_size: input.resolution,
        // Send all reference images (characters + style)
        image_input: input.image_input,
        model: 'google/nano-banana-pro',
        output_format: input.output_format,
      }),
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Image Generation] Server error (${response.status}):`, errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: `Server error: ${response.status} - ${errorText.substring(0, 100)}` };
      }
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      console.error('[Image Generation] API returned failure:', data);
      throw new Error(data.error || 'Failed to generate image');
    }

    return data.result;
  } catch (error: any) {
    // Enhanced error logging
    console.error('[Image Generation] Client-side exception:', error);

    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('Invalid Replicate API key. Please check your server configuration.');
    }

    if (error.message?.includes('quota') || error.message?.includes('credits')) {
      throw new Error('Insufficient Replicate credits. Please check your account.');
    }

    throw new Error(error.message || 'Unknown error during image generation');
  }
};
