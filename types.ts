
export interface Message {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5' | 'Auto';
export type ImageSize = '1K' | '2K' | '4K';

export interface CameraSettings {
  rotation: number;      // -90 to 90
  moveForward: number;   // 0 to 10
  verticalAngle: number; // -1 to 1
  isWideAngle: boolean;
}

export interface RelightLight {
  enabled: boolean;
  colorIndex: number; // 0-3 (Index of the gel to use)
  intensity: number; // 0-100
  x: number; // 0-100% (Position on frame)
  y: number; // 0-100% (Position on frame)
}

export interface RelightSettings {
  enabled: boolean;
  gels: string[]; // Array of 4 hex codes
  lights: {
    key: RelightLight;
    rim: RelightLight;
    back: RelightLight;
    bounce: RelightLight;
  };
  modifiers: {
    diffuser: number; // 0-100 (Hard -> Soft)
    negativeFill: number; // 0-100 (None -> Deep Shadows)
  };
}

export interface CharacterReference {
  name: string;
  imageBase64: string;
  persona?: string; // Added persona field
}

export interface VideoSettings {
  model: string;
  duration: string;
  frameRate: string;
  motionPrompt: string;
}

export interface ImageSettings {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  lighting: string;
  cameraAngles: string[];
  mood: string;
  referenceImages: string[];
  characterReferences: CharacterReference[];
  diWorkflow: string;
  customColorGrading: string;
  cameraControls: CameraSettings;
  relight: RelightSettings;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  settings: ImageSettings;
  angleUsed: string;
}

export interface StoryFlowState {
  storyboardImage: string | null; // base64
  storyPrompt: string;
  detectedPrompts: string[];
  isAnalyzing: boolean;
}

export interface Character {
  id: string;
  name: string; // The trigger name (e.g., "vani" for @vani)
  personaPrompt: string;
  imageBase64: string;
}

export type SidebarMode = 'none' | 'story' | 'characters' | 'relight' | 'settings' | 'video' | 'smart-banners';

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  rotation: 0,
  moveForward: 0,
  verticalAngle: 0,
  isWideAngle: false
};

export const DEFAULT_RELIGHT_SETTINGS: RelightSettings = {
  enabled: false,
  gels: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33'], // Default warm/cool/neutral mix
  lights: {
    key: { enabled: true, colorIndex: 0, intensity: 80, x: 25, y: 30 }, // Top-Left
    rim: { enabled: true, colorIndex: 2, intensity: 60, x: 85, y: 20 }, // Top-Right Back
    back: { enabled: false, colorIndex: 3, intensity: 40, x: 50, y: 10 }, // Top Center
    bounce: { enabled: false, colorIndex: 1, intensity: 30, x: 20, y: 80 } // Bottom-Left Fill
  },
  modifiers: {
    diffuser: 50,
    negativeFill: 20
  }
};

export const DEFAULT_SETTINGS: ImageSettings = {
  aspectRatio: '16:9',
  imageSize: '1K',
  lighting: 'Natural',
  cameraAngles: ['Eye Level'],
  mood: 'Cinematic',
  referenceImages: [],
  characterReferences: [],
  diWorkflow: 'Standard Rec.709',
  customColorGrading: '',
  cameraControls: DEFAULT_CAMERA_SETTINGS,
  relight: DEFAULT_RELIGHT_SETTINGS
};

export const LIGHTING_OPTIONS = [
  'Natural', 'Studio', 'Cinematic', 'Golden Hour', 'Neon', 'Dramatic', 'Softbox', 'Rembrandt', 'Bioluminescent'
];

export const FRAMING_OPTIONS = [
  'Close-Up (CU)',
  'Medium Shot (MS)',
  'Wide Shot (WS)',
  'Extreme Close-Up (ECU)',
  'Medium Close-Up (MCU)',
  'Establishing Shot'
];

export const CAMERA_ANGLE_OPTIONS = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  'Dutch Angle',
  'Over-the-Shoulder (OTS)',
  'Point of View (POV)'
];

// Unified list for UI display, ensuring unique values
export const ANGLE_OPTIONS = Array.from(new Set([
  ...CAMERA_ANGLE_OPTIONS,
  ...FRAMING_OPTIONS,
  'Aerial/Drone',
  'Macro'
]));

export const MOOD_OPTIONS = [
  'Cinematic', 'Ethereal', 'Dark & Gritty', 'Vibrant', 'Minimalist', 'Retro', 'Cyberpunk', 'Fantasy', 'Surreal'
];

export const DI_WORKFLOW_OPTIONS = [
  'Standard Rec.709',
  'Log (Flat Profile)',
  'Technicolor 2-Strip',
  'Technicolor 3-Strip',
  'Bleach Bypass',
  'Cross Process',
  'Teal & Orange',
  'Kodak Portra 400 Emulation',
  'Fujifilm Velvia Emulation',
  'Black & White Noir',
  'Sepia Tone',
  'Day for Night',
  'Infrared',
  'Custom'
];

// Video Generation Constants
export const VIDEO_MODELS = [
  { label: 'veo3', value: 'veo-3.1-generate-preview' },
  { label: 'veo3.1', value: 'veo-3.1-generate-preview' },
  { label: 'veo3 fast', value: 'veo-3.1-fast-generate-preview' },
  { label: 'veo3.1 fast', value: 'veo-3.1-fast-generate-preview' },
];

export const VIDEO_DURATIONS = ['5', '10'];
export const VIDEO_FRAMERATES = ['18', '24', '30', '60'];

// Replicate Video Generation Types
export interface ReplicateVideoSettings {
  model: string;
  aspectRatio?: string;
  duration?: string;
  numFrames?: number;
  inferenceSteps?: number;
  guidanceScale?: number;
  cfgScale?: number;
  videoLength?: string;
  resolution?: string;
  seed?: number;
  // Additional options for various models
  generateAudio?: boolean;
  negativePrompt?: string;
  mode?: string;
  fps?: number;
  goFast?: boolean;
  sampleShift?: number;
  interpolateOutput?: boolean;
  cameraFixed?: boolean;
  referenceImages?: string[];
}

export const REPLICATE_VIDEO_MODELS = [
  { id: 'minimax/video-01', name: 'MiniMax Video-01', type: 'text-to-video' },
  { id: 'lightricks/ltx-video', name: 'LTX Video', type: 'text-to-video' },
  { id: 'tencent/hunyuan-video', name: 'Hunyuan Video', type: 'text-to-video' },
  { id: 'genmo/mochi-1-preview', name: 'Mochi 1', type: 'text-to-video' },
  { id: 'fofr/kling-video', name: 'Kling Video', type: 'text-to-video' },
  { id: 'tencent/hunyuan-video-i2v', name: 'Hunyuan I2V', type: 'image-to-video' },
];
