
export interface Message {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5' | 'Auto';
export type ImageSize = '1K' | '2K' | '4K' | 'match_input_image' | '0.5 MP' | '1 MP' | '2 MP' | '4 MP';

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

export interface FluxSettings {
  safety_tolerance: number; // 1-5, default 2
  steps: number; // 4-50, default 28
  guidance: number; // 0-10, default 3.5
  output_quality: number; // 0-100, default 80
  interval: number; // 1-4, default 2 (for fast mode, maybe not exposed)
}

export interface QwenSettings {
  negative_prompt: string; // Text describing what to avoid
  seed?: number; // For reproducibility
  guidance: number; // 0-10, default 4
  num_inference_steps: number; // 20-50, default 40
  go_fast: boolean; // default true
  strength: number; // 0-1, default 0.8 (for image2image)
  output_quality: number; // 0-100, default 95
  disable_safety_checker: boolean; // default false
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


export interface CinemaGearSettings {
  enabled: boolean;
  presetId?: string; // To track if a preset is active
  cameraModel: string;
  lensSeries: string;
  focalLength: string; // e.g., "35mm"
  aperture: string; // e.g., "T1.8"
  shutter: string; // e.g., "180deg"
  iso: string; // e.g., "800"
  fps: string; // e.g., "24"
  colorScience?: string; // e.g., "Log C"
  sensorMode?: string; // e.g., "Open Gate"
  recordingFormat?: string; // e.g., "ARRIRAW"
}

export interface ImageSettings {
  model?: 'google/nano-banana-pro' | 'black-forest-labs/flux-2-flex' | 'black-forest-labs/flux-2-max' | 'qwen/qwen-image-2512';
  fluxSettings?: FluxSettings;
  qwenSettings?: QwenSettings;
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
  cinemaGear?: CinemaGearSettings;
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

export type SidebarMode = 'none' | 'story' | 'characters' | 'relight' | 'settings' | 'video' | 'smart-banners' | 'thumbnail-studio' | 'influencer' | 'cinemascope';

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
  model: 'google/nano-banana-pro',
  fluxSettings: {
    safety_tolerance: 2,
    steps: 28,
    guidance: 3.5,
    output_quality: 90,
    interval: 2
  },
  qwenSettings: {
    negative_prompt: '',
    guidance: 4,
    num_inference_steps: 40,
    go_fast: true,
    strength: 0.8,
    output_quality: 95,
    disable_safety_checker: false,
  },
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
  relight: DEFAULT_RELIGHT_SETTINGS,
  cinemaGear: {
    enabled: false,
    cameraModel: 'ALEXA 35',
    lensSeries: 'ARRI Signature Prime',
    focalLength: '35mm',
    aperture: 'T1.8',
    shutter: '180°',
    iso: '800',
    fps: '24',
  }
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
  cinemaGear?: CinemaGearSettings;
}

export const REPLICATE_VIDEO_MODELS = [
  { id: 'minimax/video-01', name: 'MiniMax Video-01', type: 'text-to-video' },
  { id: 'lightricks/ltx-video', name: 'LTX Video', type: 'text-to-video' },
  { id: 'tencent/hunyuan-video', name: 'Hunyuan Video', type: 'text-to-video' },
  { id: 'genmo/mochi-1-preview', name: 'Mochi 1', type: 'text-to-video' },
  { id: 'fofr/kling-video', name: 'Kling Video', type: 'text-to-video' },
  { id: 'tencent/hunyuan-video-i2v', name: 'Hunyuan I2V', type: 'image-to-video' },
];

export const MINIMAX_VOICES = [
  { id: 'voice-01', name: 'Voice 1' },
  { id: 'voice-02', name: 'Voice 2' },
];

// ========== INFLUENCER CONTENT MODULE TYPES ==========

// Voice options for influencer TTS (from MiniMax Speech 2.6 HD)
export const INFLUENCER_VOICES = [
  { id: 'English_expressive_narrator', name: 'Expressive Narrator', emotion: 'calm', useCase: 'Professional narration, tutorials' },
  { id: 'English_Upbeat_Woman', name: 'Upbeat Woman', emotion: 'happy', useCase: 'Energetic content, product reviews' },
  { id: 'English_CaptivatingStoryteller', name: 'Captivating Storyteller', emotion: 'auto', useCase: 'Story-driven content, vlogs' },
  { id: 'English_magnetic_voiced_man', name: 'Magnetic-Voiced Man', emotion: 'neutral', useCase: 'Authoritative content, tech reviews' },
];

export const INFLUENCER_EMOTIONS = [
  'auto', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'calm', 'fluent', 'neutral'
] as const;

export type InfluencerEmotion = typeof INFLUENCER_EMOTIONS[number];

// Avatar dimension options (for Nano Banana Pro)
export const AVATAR_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'] as const;
export type AvatarAspectRatio = typeof AVATAR_ASPECT_RATIOS[number];

export const AVATAR_RESOLUTIONS = ['1K', '2K', '4K'] as const;
export type AvatarResolution = typeof AVATAR_RESOLUTIONS[number];

export interface AvatarSettings {
  prompt: string;
  aspectRatio: AvatarAspectRatio;
  resolution: AvatarResolution;
}

export interface BRollMarker {
  id: string;
  textStart: number;  // Character index in script
  textEnd: number;    // Character index in script
  prompt: string;     // AI-generated prompt for B-roll video
  videoUrl?: string;  // Generated video URL
  status: 'pending' | 'generating' | 'complete' | 'error';
}

export interface InfluencerProject {
  id: string;
  name: string;
  rawScript: string;
  refinedScript: string;
  brollMarkers: BRollMarker[];
  voiceId: string;
  emotion: InfluencerEmotion;
  audioUrl?: string;
  audioDurationMs?: number;
  status: 'draft' | 'refining' | 'generating-assets' | 'complete';
  createdAt: number;
}

export interface InfluencerState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  rawScript: string;
  refinedScript: string;
  brollMarkers: BRollMarker[];
  selectedVoiceId: string;
  selectedEmotion: InfluencerEmotion;
  generatedAudio: { url: string; durationMs: number } | null;
  // Avatar generation (Step 3)
  avatarPrompts: string[]; // AI-derived prompts for avatar generation
  generatedAvatarUrls: string[]; // Array of 3 generated avatars
  selectedAvatarIndex: number; // Which avatar is selected (0, 1, or 2)
  customAvatarPrompt: string; // For manual avatar creation
  // Talking head video (Step 4)
  talkingHeadVideoUrl: string | null;
  // Final stitched video (Step 5)
  finalStitchedVideoUrl: string | null;
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;
}

export const DEFAULT_INFLUENCER_STATE: InfluencerState = {
  currentStep: 1,
  rawScript: '',
  refinedScript: '',
  brollMarkers: [],
  selectedVoiceId: 'English_expressive_narrator',
  selectedEmotion: 'auto',
  generatedAudio: null,
  avatarPrompts: [],
  generatedAvatarUrls: [],
  selectedAvatarIndex: 0,
  customAvatarPrompt: '',
  talkingHeadVideoUrl: null,
  finalStitchedVideoUrl: null,
  isProcessing: false,
  processingMessage: '',
  error: null,
};

export interface CanvasElement {
  id: string;
  type: 'logo' | 'keyart' | 'text' | 'image' | 'fade';
  src?: string;
  text?: string;
  fadeSettings?: {
    color: string;
    startOpacity: number;
    endOpacity: number;
    direction: 'to bottom' | 'to top' | 'to left' | 'to right';
  };
  x: number;
  y: number;
  width?: number; // Initial width for scaling reference
  height?: number;
  scale: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
}

export interface ThumbnailState {
  step: 'logo' | 'compose';
  logoSettings: {
    text: string;
    referenceImage?: string; // Base64
  };
  generatedAssets: {
    logos: string[];
    keyArts: string[]; // Kept for uploads/imports
  };
  canvas: {
    ratio: string;
    elements: CanvasElement[];
    activeElementId: string | null;
  };
}

// =============================================
// Video Timeline Editor Types
// =============================================

export interface TimelineSegment {
  id: string;
  type: 'talking-head' | 'broll' | 'intro' | 'outro';
  label: string;
  startMs: number;
  durationMs: number;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface AudioTrack {
  id: string;
  label: string;
  startMs: number;
  durationMs: number;
  audioUrl: string;
  waveformData: number[]; // Amplitude samples for visualization (0-1)
  volume: number; // 0-1
  muted: boolean;
}

export type VideoResolution = '720p' | '1080p' | '4K';
export type VideoFormat = 'mp4' | 'mov';

export interface ExportSettings {
  resolution: VideoResolution;
  format: VideoFormat;
  burnInCaptions: boolean;
}

export interface SceneHealth {
  avatarAudioSync: 'good' | 'warning' | 'error';
  brollTransitions: Array<{ segmentId: string; status: 'good' | 'warning'; message?: string }>;
}

export interface TimelineState {
  segments: TimelineSegment[];
  audioTracks: AudioTrack[];
  currentTimeMs: number;
  totalDurationMs: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedSegmentId: string | null;
  exportSettings: ExportSettings;
  sceneHealth: SceneHealth;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution: '1080p',
  format: 'mp4',
  burnInCaptions: false,
};

export const DEFAULT_TIMELINE_STATE: TimelineState = {
  segments: [],
  audioTracks: [],
  currentTimeMs: 0,
  totalDurationMs: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedSegmentId: null,
  exportSettings: DEFAULT_EXPORT_SETTINGS,
  sceneHealth: {
    avatarAudioSync: 'good',
    brollTransitions: [],
  },
};
