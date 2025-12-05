
import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, ImageSize, ImageSettings, GeneratedImage, DEFAULT_SETTINGS, LIGHTING_OPTIONS, ANGLE_OPTIONS, MOOD_OPTIONS, FRAMING_OPTIONS, CAMERA_ANGLE_OPTIONS, DI_WORKFLOW_OPTIONS, StoryFlowState, Character, SidebarMode, RelightLight, CharacterReference, VideoSettings, VIDEO_MODELS, VIDEO_DURATIONS, VIDEO_FRAMERATES, ReplicateVideoSettings, REPLICATE_VIDEO_MODELS } from '../types';
import { generateImageWithReplicate, analyzeStoryboardFlowWithReplicate, generatePersonaPromptWithReplicate, improveVideoPromptWithReplicate, generateVideoWithReplicate, hasValidReplicateApiKey, REPLICATE_VIDEO_MODELS as REPLICATE_MODELS } from '../services/replicateService';
import { ArrowDownTrayIcon, BoltIcon, PhotoIcon, CheckCircleIcon, XMarkIcon, PlusIcon, VideoCameraIcon, EyeIcon, LinkIcon, PaintBrushIcon, SparklesIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, UserGroupIcon, TrashIcon, CloudArrowDownIcon, LightBulbIcon, FilmIcon, ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, PlayIcon, KeyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import CameraControls from './OrbitCamera';
import RelightPanel from './RelightPanel';

interface StudioPanelProps {
  initialPrompt: string;
}

const StudioPanel: React.FC<StudioPanelProps> = ({ initialPrompt }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  React.useEffect(() => {
    if(initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [storyPromptSaveSuccess, setStoryPromptSaveSuccess] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<SidebarMode>('none');
  const [draggingLight, setDraggingLight] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Video State
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
      model: VIDEO_MODELS[1].value, // Default to veo3.1 (HQ)
      duration: '5',
      frameRate: '18',
      motionPrompt: ''
  });
  const [videoFrames, setVideoFrames] = useState<{start: string | null, end: string | null}>({start: null, end: null});
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);

  // Replicate Video State
  const [replicateVideoSettings, setReplicateVideoSettings] = useState<ReplicateVideoSettings>({
    model: REPLICATE_MODELS[0].id,
    aspectRatio: '16:9',
    duration: '5',
    numFrames: 121,
    inferenceSteps: 30,
    guidanceScale: 4.5,
    cfgScale: 0.5,
    videoLength: '5s',
    resolution: '720p',
  });
  const [isReplicateExpanded, setIsReplicateExpanded] = useState(false);
  const [isGeneratingReplicateVideo, setIsGeneratingReplicateVideo] = useState(false);
  const [generatedReplicateVideoUrl, setGeneratedReplicateVideoUrl] = useState<string | null>(null);

  // Kling V2.1 Video State
  const [klingVideoSettings, setKlingVideoSettings] = useState({
    mode: 'standard' as 'standard' | 'pro',
    duration: 5 as 5 | 10,
    negativePrompt: '',
  });
  const [isKlingExpanded, setIsKlingExpanded] = useState(false);
  const [isGeneratingKlingVideo, setIsGeneratingKlingVideo] = useState(false);
  const [generatedKlingVideoUrl, setGeneratedKlingVideoUrl] = useState<string | null>(null);

  const [storyFlow, setStoryFlow] = useState<StoryFlowState>(() => {
    let savedPrompt = '';
    if (typeof window !== 'undefined') {
        savedPrompt = localStorage.getItem('gemini_studio_story_prompt') || '';
    }
    return { storyboardImage: null, storyPrompt: savedPrompt, detectedPrompts: [], isAnalyzing: false };
  });

  const [characters, setCharacters] = useState<Character[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('gemini_studio_characters');
        try { return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
    }
    return [];
  });
  
  const [newCharacterImage, setNewCharacterImage] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterPersona, setNewCharacterPersona] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);

  useEffect(() => {
    localStorage.setItem('gemini_studio_characters', JSON.stringify(characters));
  }, [characters]);

  // Handler for Kling V2.1 video generation
  const handleGenerateKlingVideo = async () => {
    if (!videoFrames.start) {
      setError('Start image is required for Kling V2.1');
      return;
    }

    setIsGeneratingKlingVideo(true);
    setError(null);
    setGeneratedKlingVideoUrl(null);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          startImage: videoFrames.start,
          endImage: videoFrames.end || undefined,
          negativePrompt: klingVideoSettings.negativePrompt || undefined,
          mode: klingVideoSettings.mode,
          duration: klingVideoSettings.duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setGeneratedKlingVideoUrl(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating video');
    } finally {
      setIsGeneratingKlingVideo(false);
    }
  };

  // ... rest of your existing code (all other handlers, effects, etc.)
  // I'm keeping this as "..." to save space, but you would keep ALL your existing code here

  return (
    <div className="flex gap-4 h-full">
      {/* ... Your existing sidebar code ... */}

      <div className="flex-1 flex flex-col h-full bg-zinc-950 rounded-2xl overflow-hidden">
          {/* ... Your existing preview section ... */}

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="space-y-4 lg:col-span-2">
                 {/* ... Your existing prompt and image generation controls ... */}

                 {/* VIDEO GENERATION SECTION */}
                 <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3">
                     <div className="flex items-center justify-between">
                         <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                             <FilmIcon className="w-4 h-4" />
                             Video Generation
                         </label>
                     </div>

                     {/* Google Veo Panel */}
                     <div className="border border-zinc-800 rounded-lg overflow-hidden">
                         <button 
                             onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                             className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 transition flex items-center justify-between"
                         >
                             <span className="text-sm font-medium text-white flex items-center gap-2">
                                 <PlayIcon className="w-4 h-4" />
                                 Google Veo (Vertex AI)
                             </span>
                             {isVideoExpanded ? <ChevronUpIcon className="w-4 h-4 text-zinc-400" /> : <ChevronDownIcon className="w-4 h-4 text-zinc-400" />}
                         </button>
                         {/* ... Your existing Google Veo implementation ... */}
                     </div>

                     {/* Replicate Models Panel */}
                     <div className="border border-zinc-800 rounded-lg overflow-hidden">
                         <button 
                             onClick={() => setIsReplicateExpanded(!isReplicateExpanded)}
                             className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 transition flex items-center justify-between"
                         >
                             <span className="text-sm font-medium text-white flex items-center gap-2">
                                 <FilmIcon className="w-4 h-4" />
                                 Replicate Video Models
                             </span>
                             {isReplicateExpanded ? <ChevronUpIcon className="w-4 h-4 text-zinc-400" /> : <ChevronDownIcon className="w-4 h-4 text-zinc-400" />}
                         </button>
                         {/* ... Your existing Replicate models implementation ... */}
                     </div>

                     {/* NEW: Kling V2.1 Panel */}
                     <div className="border border-emerald-800 rounded-lg overflow-hidden">
                         <button 
                             onClick={() => setIsKlingExpanded(!isKlingExpanded)}
                             className="w-full p-3 bg-emerald-900/20 hover:bg-emerald-900/30 transition flex items-center justify-between"
                         >
                             <span className="text-sm font-medium text-white flex items-center gap-2">
                                 <SparklesIcon className="w-4 h-4 text-emerald-400" />
                                 Kling V2.1 (Image-to-Video)
                                 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">NEW</span>
                             </span>
                             {isKlingExpanded ? <ChevronUpIcon className="w-4 h-4 text-zinc-400" /> : <ChevronDownIcon className="w-4 h-4 text-zinc-400" />}
                         </button>

                         {isKlingExpanded && (
                             <div className="p-4 space-y-3 bg-zinc-900/50">
                                 {/* Info Banner */}
                                 <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                     <p className="text-xs text-emerald-300 flex items-start gap-2">
                                         <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                         <span>
                                             <strong>Requires Start Image:</strong> Kling V2.1 converts images into videos. 
                                             Upload a start frame below. Add an end frame (optional) for controlled animation.
                                         </span>
                                     </p>
                                 </div>

                                 {/* Frame Selection */}
                                 <div className="grid grid-cols-2 gap-3">
                                     <div>
                                         <label className="text-xs text-zinc-400 mb-1.5 block">Start Frame *</label>
                                         <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border-2 border-dashed border-zinc-700 group hover:border-emerald-500/50 transition">
                                             {videoFrames.start ? (
                                                 <>
                                                     <img src={videoFrames.start} alt="Start" className="w-full h-full object-cover" />
                                                     <button
                                                         onClick={() => setVideoFrames({...videoFrames, start: null})}
                                                         className="absolute top-2 right-2 bg-black/70 hover:bg-red-500/80 p-1.5 rounded-full text-white backdrop-blur-sm transition"
                                                     >
                                                         <XMarkIcon className="w-3 h-3" />
                                                     </button>
                                                 </>
                                             ) : (
                                                 <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-emerald-400 transition">
                                                     <PhotoIcon className="w-8 h-8 mb-1" />
                                                     <span className="text-xs">Upload Start</span>
                                                     <input
                                                         type="file"
                                                         accept="image/*"
                                                         className="hidden"
                                                         onChange={(e) => {
                                                             const file = e.target.files?.[0];
                                                             if (file) {
                                                                 const reader = new FileReader();
                                                                 reader.onload = (ev) => {
                                                                     setVideoFrames({...videoFrames, start: ev.target?.result as string});
                                                                 };
                                                                 reader.readAsDataURL(file);
                                                             }
                                                         }}
                                                     />
                                                 </label>
                                             )}
                                         </div>
                                     </div>

                                     <div>
                                         <label className="text-xs text-zinc-400 mb-1.5 block">
                                             End Frame <span className="text-zinc-600">(Optional)</span>
                                         </label>
                                         <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800 border-2 border-dashed border-zinc-700 group hover:border-purple-500/50 transition">
                                             {videoFrames.end ? (
                                                 <>
                                                     <img src={videoFrames.end} alt="End" className="w-full h-full object-cover" />
                                                     <button
                                                         onClick={() => setVideoFrames({...videoFrames, end: null})}
                                                         className="absolute top-2 right-2 bg-black/70 hover:bg-red-500/80 p-1.5 rounded-full text-white backdrop-blur-sm transition"
                                                     >
                                                         <XMarkIcon className="w-3 h-3" />
                                                     </button>
                                                 </>
                                             ) : (
                                                 <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-purple-400 transition">
                                                     <PhotoIcon className="w-8 h-8 mb-1" />
                                                     <span className="text-xs">Upload End</span>
                                                     <input
                                                         type="file"
                                                         accept="image/*"
                                                         className="hidden"
                                                         onChange={(e) => {
                                                             const file = e.target.files?.[0];
                                                             if (file) {
                                                                 const reader = new FileReader();
                                                                 reader.onload = (ev) => {
                                                                     setVideoFrames({...videoFrames, end: ev.target?.result as string});
                                                                 };
                                                                 reader.readAsDataURL(file);
                                                             }
                                                         }}
                                                     />
                                                 </label>
                                             )}
                                         </div>
                                         {videoFrames.end && (
                                             <p className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
                                                 <ExclamationTriangleIcon className="w-3 h-3" />
                                                 Forces Pro mode (1080p)
                                             </p>
                                         )}
                                     </div>
                                 </div>

                                 {/* Mode Selection */}
                                 <div>
                                     <label className="text-xs text-zinc-400 mb-1.5 block">Quality Mode</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button
                                             onClick={() => setKlingVideoSettings({...klingVideoSettings, mode: 'standard'})}
                                             disabled={videoFrames.end !== null}
                                             className={`p-2.5 rounded-lg border text-sm font-medium transition ${
                                                 klingVideoSettings.mode === 'standard' && !videoFrames.end
                                                     ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                     : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                             } ${videoFrames.end ? 'opacity-50 cursor-not-allowed' : ''}`}
                                         >
                                             <div className="text-xs font-bold">Standard</div>
                                             <div className="text-[10px] text-zinc-500">720p • 24fps</div>
                                         </button>
                                         <button
                                             onClick={() => setKlingVideoSettings({...klingVideoSettings, mode: 'pro'})}
                                             className={`p-2.5 rounded-lg border text-sm font-medium transition ${
                                                 klingVideoSettings.mode === 'pro' || videoFrames.end
                                                     ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                     : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                             }`}
                                         >
                                             <div className="text-xs font-bold">Pro</div>
                                             <div className="text-[10px] text-zinc-500">1080p • 24fps</div>
                                         </button>
                                     </div>
                                 </div>

                                 {/* Duration Selection */}
                                 <div>
                                     <label className="text-xs text-zinc-400 mb-1.5 block">Duration</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         <button
                                             onClick={() => setKlingVideoSettings({...klingVideoSettings, duration: 5})}
                                             className={`p-2 rounded-lg border text-sm font-medium transition ${
                                                 klingVideoSettings.duration === 5
                                                     ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                     : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                             }`}
                                         >
                                             5 seconds
                                         </button>
                                         <button
                                             onClick={() => setKlingVideoSettings({...klingVideoSettings, duration: 10})}
                                             className={`p-2 rounded-lg border text-sm font-medium transition ${
                                                 klingVideoSettings.duration === 10
                                                     ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                     : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                                             }`}
                                         >
                                             10 seconds
                                         </button>
                                     </div>
                                 </div>

                                 {/* Motion Prompt */}
                                 <div>
                                     <label className="text-xs text-zinc-400 mb-1.5 block">Motion Prompt</label>
                                     <textarea
                                         value={prompt}
                                         onChange={(e) => setPrompt(e.target.value)}
                                         placeholder="Describe the motion and animation you want..."
                                         className="w-full bg-zinc-900 text-white p-3 text-sm rounded-lg border border-zinc-700 resize-none outline-none focus:border-emerald-500 h-20"
                                     />
                                 </div>

                                 {/* Negative Prompt */}
                                 <div>
                                     <label className="text-xs text-zinc-400 mb-1.5 block">Negative Prompt (Optional)</label>
                                     <textarea
                                         value={klingVideoSettings.negativePrompt}
                                         onChange={(e) => setKlingVideoSettings({...klingVideoSettings, negativePrompt: e.target.value})}
                                         placeholder="Things you don't want to see in the video..."
                                         className="w-full bg-zinc-900 text-white p-2 text-xs rounded-lg border border-zinc-700 resize-none outline-none focus:border-emerald-500 h-16"
                                     />
                                 </div>

                                 {/* Generate Button */}
                                 <button
                                     onClick={handleGenerateKlingVideo}
                                     disabled={isGeneratingKlingVideo || !videoFrames.start || !prompt}
                                     className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm"
                                 >
                                     {isGeneratingKlingVideo ? (
                                         <>
                                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                             Generating Kling Video...
                                         </>
                                     ) : (
                                         <>
                                             <SparklesIcon className="w-4 h-4" />
                                             Generate with Kling V2.1
                                         </>
                                     )}
                                 </button>

                                 {/* Video Result */}
                                 {generatedKlingVideoUrl && (
                                     <div className="mt-4 p-3 bg-zinc-800 rounded-lg border border-emerald-500/30">
                                         <div className="flex items-center justify-between mb-2">
                                             <span className="text-xs font-medium text-emerald-400">Generated Video</span>
                                             <a
                                                 href={generatedKlingVideoUrl}
                                                 download
                                                 className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                                             >
                                                 <CloudArrowDownIcon className="w-4 h-4" />
                                                 Download
                                             </a>
                                         </div>
                                         <video
                                             controls
                                             src={generatedKlingVideoUrl}
                                             className="w-full rounded-lg"
                                         />
                                     </div>
                                 )}
                             </div>
                         )}
                     </div>
                 </div>

                 {/* ... Rest of your existing controls ... */}
              </div>
              
              {/* ... Your existing right column (Cinematography) ... */}
            </div>

            {/* ... Your existing error display and generate button ... */}
          </div>
      </div>
    </div>
  );
};

export default StudioPanel;
