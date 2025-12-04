
import { GoogleGenerativeAI, GenerateContentResponse } from "@google/generative-ai";
import { ImageSettings, RelightSettings, VideoSettings } from "../types";

// Dynamic API Key Retrieval
export const getApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) return stored;
  }
  return process.env.API_KEY || '';
};

export const hasValidApiKey = (): boolean => {
    const key = getApiKey();
    return !!key && key.length > 0;
};

// Helper to get a fresh client instance (ensures key updates are respected)
const getGeminiClient = () => {
  return new GoogleGenerativeAI({ apiKey: getApiKey() });
};

// Supported directly by the API config
const VALID_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', '3:2', '2:3', '5:4', '4:5'];

function mapAspectRatioToSupported(ratio: string): string | undefined {
  if (VALID_ASPECT_RATIOS.includes(ratio)) return ratio;
  return undefined;
}

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> => {
  let lastError: any;
  let delay = baseDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorStr = (error?.message || '') + (error?.toString() || '') + JSON.stringify(error || {});
      const isTransient = 
        errorStr.includes('503') || 
        errorStr.includes('overloaded') || 
        errorStr.includes('UNAVAILABLE') || 
        errorStr.includes('429') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('500') || 
        errorStr.includes('INTERNAL') ||
        errorStr.includes('Internal Server Error');

      if (isTransient && i < maxRetries - 1) {
        const jitter = Math.random() * 100;
        const waitTime = delay + jitter;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 1.5;
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const extractImageFromResponse = (response: GenerateContentResponse): string => {
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${base64EncodeString}`;
      }
    }
  }
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      const text = candidate.content?.parts?.map(p => p.text).join(' ') || '';
      throw new Error(`Generation Failed (${candidate.finishReason}): ${text}`);
  }
  const textContent = candidate?.content?.parts?.map(p => p.text).join(' ');
  if (textContent) {
      throw new Error(`Model returned text instead of image: "${textContent.slice(0, 150)}..."`);
  }
  throw new Error("No image data found in response (Empty Candidate)");
};

export const refinePromptWithGemini = async (
  conversationHistory: { role: string; text: string }[],
  systemInstruction: string,
  storyboardImage?: File | null
): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  const contents: any[] = [];
  const ai = getGeminiClient();

  conversationHistory.forEach(msg => {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  });

  if (storyboardImage) {
      const imagePart = await fileToGenerativePart(storyboardImage);
      const lastMsg = contents[contents.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
          lastMsg.parts.push(imagePart);
      } else {
            const hasUserText = conversationHistory.some(m => m.role === 'user' && m.text.trim().length > 0);
            const promptText = hasUserText 
                ? "Analyze this storyboard image to help refine the prompt."
                : "Analyze this uploaded image and generate a detailed text prompt that would recreate this image, describing the subject, environment, lighting, style, and camera angle.";

            contents.push({
                role: 'user',
                parts: [imagePart, { text: promptText }]
            });
      }
  }

  try {
    const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 2048 },
      }
    }));
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.warn(`Primary model ${modelId} failed. Attempting fallback...`, error);
    try {
        const fallbackResponse: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { systemInstruction: systemInstruction }
        }));
        return fallbackResponse.text || "I couldn't generate a response (Fallback).";
    } catch (fallbackError) {
        throw fallbackError;
    }
  }
};

export const analyzeStoryboardFlow = async (
  storyboardBase64: string,
  userPrompt: string,
  systemInstruction: string
): Promise<string[]> => {
    const modelId = 'gemini-3-pro-preview';
    const ai = getGeminiClient();

    const analysisPrompt = `
      You are an expert storyboard artist and cinematographer.
      1. Analyze the attached storyboard page image.
      2. Identify the number of individual panels (usually 6-8).
      3. For EACH panel, write a highly detailed image generation prompt.
      4. Incorporate the user's specific story guidance: "${userPrompt}".
      5. Adhere to these System Instructions: "${systemInstruction}".
      
      OUTPUT FORMAT:
      You must return strictly a JSON array of strings, where each string is the prompt for one panel.
    `;

    const parts = [
        { inlineData: { mimeType: 'image/png', data: storyboardBase64.split(',')[1] } },
        { text: analysisPrompt }
    ];

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: modelId,
            contents: { role: 'user', parts: parts },
            config: {
                thinkingConfig: { thinkingBudget: 2048 },
                responseMimeType: 'application/json' 
            }
        }));
        const text = response.text || "[]";
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed.map(String);
            return [];
        } catch (e) {
            return text.split('\n').filter(line => line.length > 10);
        }
    } catch (error) {
        throw error;
    }
};

export const generatePersonaPrompt = async (
  imageBase64: string,
  name: string
): Promise<string> => {
    const modelId = 'gemini-2.5-flash';
    const ai = getGeminiClient();

    const promptText = `
        Analyze the uploaded image of the character named "${name}".
        Create a compressed "Persona Prompt" that captures their key physical visual traits, attire, and cultural markers.
        Format: ${name.toUpperCase()}|ethnicity|body|clothing|accessory|hair|vibe
        Return ONLY the string.
    `;
    const parts = [
        { inlineData: { mimeType: 'image/png', data: imageBase64.split(',')[1] } },
        { text: promptText }
    ];
    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: modelId,
            contents: { role: 'user', parts: parts }
        }));
        return response.text?.trim() || "";
    } catch (error) {
        throw new Error("Failed to generate persona prompt");
    }
};

// Helper to determine precise clock direction from 2D coordinates
const getLightDescription = (role: string, x: number, y: number) => {
    // 0,0 is Top-Left. 100,100 is Bottom-Right. 50,50 is Center.
    const dx = x - 50;
    const dy = y - 50; 
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Handle Central Placement (Z-Axis implication)
    if (distance < 10) {
        if (role === 'Back Light' || role === 'Rim Light') return "directly behind the subject (Halo/Silhouette effect)";
        if (role === 'Key Light') return "directly frontal (Flat lighting)";
        return "centered overhead";
    }

    // Calculate Angle (Clock Face)
    // 12 o'clock = Top (-90deg), 3 o'clock = Right (0deg), 6 = Bottom (90deg), 9 = Left (180/-180deg)
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI);
    
    // Convert to Clock Hour (1-12)
    // Shift -90 (Top) to 0. 
    let clockVal = (angleDeg + 90) / 30;
    if (clockVal < 0) clockVal += 12;
    if (clockVal === 0) clockVal = 12;
    const hour = Math.round(clockVal) || 12;

    const clockDesc = `${hour} o'clock position`;

    // Role-Based Descriptions to ensure correct Z-Space rendering
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

export const generateImageWithGemini = async (
  prompt: string,
  settings: ImageSettings,
  activeAngle: string
): Promise<string> => {
    const primaryModelId = 'gemini-3-pro-image-preview'; 
    const fallbackModelId = 'gemini-2.5-flash-image';
    const ai = getGeminiClient();

    let ratioInstruction = `Aspect Ratio: ${settings.aspectRatio}`;
    if (settings.aspectRatio === '21:9') ratioInstruction += " (Cinematic Ultrawide).";
    else if (settings.aspectRatio === '3:2') ratioInstruction += " (35mm Film).";
    
    let gradingInstruction = `Color Workflow: ${settings.diWorkflow}`;
    if (settings.customColorGrading) gradingInstruction += ` | Custom Look/LUT: ${settings.customColorGrading}`;

    let lightingInstruction = `Lighting Style: ${settings.lighting}`;
    
    if (settings.relight && settings.relight.enabled) {
        const { gels, lights, modifiers } = settings.relight;
        const activeLights: string[] = [];

        const getIntensityDesc = (val: number) => {
            if (val < 20) return "Faint";
            if (val < 50) return "Moderate";
            if (val < 80) return "Bright";
            return "Intense";
        };

        const addLightPrompt = (role: string, light: any, colorHex: string) => {
            if (!light.enabled) return;
            const description = getLightDescription(role, light.x, light.y);
            const intensity = getIntensityDesc(light.intensity);
            
            // STRICT enforcement of off-camera source
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

    const parts: any[] = [];
    
    // 1. Character References (High Priority - Identity Consistency)
    if (settings.characterReferences && settings.characterReferences.length > 0) {
        settings.characterReferences.forEach(char => {
             const match = char.imageBase64.match(/^data:(.*?);base64,(.*)$/);
             if (match) {
                 parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                 parts.push({ 
                    text: `[STRICT SUBJECT REQUIREMENT]: The image MUST contain the character "${char.name}" exactly as shown in the reference image provided. \n\nCRITICAL INSTRUCTIONS FOR "${char.name}":\n1. FACIAL ACCURACY: The face must be a 100% match to the reference. Copy facial features, bone structure, and eyes exactly.\n2. CONSISTENCY: Maintain body type, skin tone, and hair texture/color/style (unless the prompt specifically requests a hair change).\n3. EXCLUSION: Do not alter the subject's identity to fit a style. Use the reference as a hard constraint.\n\nNow, render "${char.name}" in this context: ${prompt}`
                 });
             }
        });
    }

    // 2. Style/Scene References (Medium Priority)
    if (settings.referenceImages?.length > 0) {
      let hasStyleRefs = false;
      settings.referenceImages.forEach(imgDataUrl => {
        const match = imgDataUrl.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            hasStyleRefs = true;
        }
      });
      if (hasStyleRefs) {
          parts.push({ text: `[STYLE/COMPOSITION REFERENCES]: Use the above ${settings.referenceImages.length} images as references for mood, lighting, framing, and style. Do not use them for character identity.` });
      }
    }
    
    // 3. Main Prompt (if not already appended in character block)
    if (!settings.characterReferences || settings.characterReferences.length === 0) {
        parts.push({ text: fullPrompt });
    } else {
        // Just append technical specs if char prompt was used
        parts.push({ text: `\n\nADDITIONAL SCENE DETAILS:\n${fullPrompt}`});
    }

    const attemptGeneration = async (model: string, useConfig: boolean) => {
        const config: any = { imageConfig: {} };
        if (useConfig) config.imageConfig.imageSize = settings.imageSize;
        if (settings.aspectRatio !== 'Auto') {
            const supportedRatio = mapAspectRatioToSupported(settings.aspectRatio);
            if (supportedRatio) config.imageConfig.aspectRatio = supportedRatio;
        }

        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: config
        }));
        return extractImageFromResponse(response);
    };

    try {
        return await attemptGeneration(primaryModelId, true);
    } catch (error) {
        console.warn("Primary image model failed. Attempting fallback...", error);
        return await attemptGeneration(fallbackModelId, false);
    }
};

export const improveVideoPromptWithGemini = async (
  prompt: string,
  startImage: string | null,
  endImage: string | null
): Promise<string> => {
  const modelId = 'gemini-3-pro-preview';
  const ai = getGeminiClient();
  
  const parts: any[] = [];
  
  if (startImage) {
      parts.push({ inlineData: { mimeType: 'image/png', data: startImage.split(',')[1] } });
      parts.push({ text: "Image 1: Start Frame" });
  }
  
  if (endImage) {
      parts.push({ inlineData: { mimeType: 'image/png', data: endImage.split(',')[1] } });
      parts.push({ text: "Image 2: End Frame" });
  }

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

  parts.push({ text: `User Instruction: "${prompt || 'Create a transition between these images'}" \n\nImprove this prompt to explain the motion clearly.` });

  try {
      const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
          model: modelId,
          contents: { role: 'user', parts: parts },
          config: { systemInstruction: systemInstruction }
      }));
      return response.text?.trim() || prompt;
  } catch (error) {
      console.error("Prompt improvement failed", error);
      throw error;
  }
};

export const generateVideoWithGemini = async (
    prompt: string,
    startImageBase64: string | null,
    endImageBase64: string | null,
    settings: VideoSettings,
    aspectRatio: string
): Promise<string> => {
    // Check API Key selection (Only for AI Studio environment)
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
             const success = await (window as any).aistudio.openSelectKey();
             if (!success) throw new Error("API Key selection required for Video Generation");
        }
    }
    
    // Create new instance to pick up the potentially selected key or user override
    const veoAi = new GoogleGenerativeAI({ apiKey: getApiKey() });

    // Map aspect ratio to closest supported (16:9 or 9:16)
    // Most cinematic/standard ratios map to 16:9. Vertical/portrait map to 9:16.
    const isPortrait = ['9:16', '3:4', '2:3', '4:5'].includes(aspectRatio);
    const videoAspectRatio = isPortrait ? '9:16' : '16:9';

    const config: any = {
        numberOfVideos: 1,
        resolution: '1080p', // Prefer high quality
        aspectRatio: videoAspectRatio,
    };

    const imageParam: any = startImageBase64 ? {
        imageBytes: startImageBase64.split(',')[1],
        mimeType: 'image/png' 
    } : undefined;

    if (endImageBase64) {
        config.lastFrame = {
             imageBytes: endImageBase64.split(',')[1],
             mimeType: 'image/png'
        };
    }

    // Prepare prompt
    const finalPrompt = prompt || settings.motionPrompt || "A cinematic video scene.";

    let operation = await veoAi.models.generateVideos({
        model: settings.model,
        prompt: finalPrompt,
        image: imageParam,
        config: config
    });

    // Polling
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await veoAi.operations.getVideosOperation({ operation: operation });
    }
    
    if (operation.error) {
        throw new Error(`Video Generation Failed: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned");

    // Fetch the actual video bytes with key appended
    const finalUrl = `${videoUri}&key=${getApiKey()}`;
    return finalUrl;
};
