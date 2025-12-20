
import React, { useState, useEffect, useRef } from 'react';
import { AspectRatio, ImageSize, ImageSettings, GeneratedImage, DEFAULT_SETTINGS, LIGHTING_OPTIONS, ANGLE_OPTIONS, MOOD_OPTIONS, FRAMING_OPTIONS, CAMERA_ANGLE_OPTIONS, DI_WORKFLOW_OPTIONS, StoryFlowState, Character, SidebarMode, RelightLight, CharacterReference, VideoSettings, VIDEO_MODELS, VIDEO_DURATIONS, VIDEO_FRAMERATES, ReplicateVideoSettings, REPLICATE_VIDEO_MODELS } from '../types';
import { generateImageWithReplicate, analyzeStoryboardFlowWithReplicate, generatePersonaPromptWithReplicate, improveVideoPromptWithReplicate, generateVideoWithReplicate, hasValidReplicateApiKey, REPLICATE_VIDEO_MODELS as REPLICATE_MODELS } from '../services/replicateService';
import { ArrowDownTrayIcon, BoltIcon, PhotoIcon, CheckCircleIcon, XMarkIcon, PlusIcon, VideoCameraIcon, EyeIcon, LinkIcon, PaintBrushIcon, SparklesIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, UserGroupIcon, TrashIcon, CloudArrowDownIcon, LightBulbIcon, FilmIcon, ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, PlayIcon, KeyIcon, ExclamationTriangleIcon, AdjustmentsHorizontalIcon, RectangleGroupIcon, CubeIcon, QueueListIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import CameraControls from './OrbitCamera';
import RelightPanel from './RelightPanel';
import SmartBanners from './SmartBanners';

interface StudioPanelProps {
    initialPrompt: string;
}

const StudioPanel: React.FC<StudioPanelProps> = ({ initialPrompt }) => {
    // Helper to convert aspect ratio string to CSS value
    const getAspectRatioValue = (ratio: AspectRatio): string => {
        if (ratio === 'Auto') return '1/1'; // Default or handle appropriately
        return ratio.replace(':', '/');
    };

    const [prompt, setPrompt] = useState(initialPrompt);
    React.useEffect(() => {
        if (initialPrompt) setPrompt(initialPrompt);
    }, [initialPrompt]);

    const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [storyPromptSaveSuccess, setStoryPromptSaveSuccess] = useState(false);
    const [activeSidebar, setActiveSidebar] = useState<SidebarMode>('none');
    const [showSettings, setShowSettings] = useState(false);
    const [isSettingsPinned, setIsSettingsPinned] = useState(false);
    const [draggingLight, setDraggingLight] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    // Video State
    const [videoSettings, setVideoSettings] = useState<VideoSettings>({
        model: VIDEO_MODELS[1].value, // Default to veo3.1 (HQ)
        duration: '5',
        frameRate: '18',
        motionPrompt: ''
    });
    const [videoFrames, setVideoFrames] = useState<{ start: string | null, end: string | null }>({ start: null, end: null });
    const [isVideoExpanded, setIsVideoExpanded] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);

    // Resize Observer for Aspect Ratio Preview
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!previewRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });
        observer.observe(previewRef.current);
        return () => observer.disconnect();
    }, []);

    // Calculate dynamic preview style
    const getPreviewStyle = () => {
        const { width, height } = containerSize;
        if (width === 0 || height === 0) return { opacity: 0 };

        const ratioStr = getAspectRatioValue(settings.aspectRatio);
        const [wStr, hStr] = ratioStr.split('/');
        const targetRatio = parseFloat(wStr) / parseFloat(hStr);
        const containerRatio = width / height;

        if (containerRatio > targetRatio) {
            // Container is wider than target -> Fit to height
            return {
                height: '100%',
                width: `calc(100% * ${targetRatio / containerRatio})`, // Fallback
                aspectRatio: ratioStr
            };
        } else {
            // Container is narrower -> Fit to width
            return {
                width: '100%',
                height: `calc(100% * ${containerRatio / targetRatio})`, // Fallback
                aspectRatio: ratioStr
            };
        }
    };


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

    // Load API key from server on mount
    useEffect(() => {
        const loadApiKey = async () => {
            if (typeof window !== 'undefined') {
                const storedReplicateKey = localStorage.getItem('replicate_api_key');
                if (!storedReplicateKey) {
                    // Fetch API key from server
                    try {
                        const response = await fetch('http://localhost:3002/api/key/replicate');
                        const data = await response.json();
                        if (data.success && data.key) {
                            localStorage.setItem('replicate_api_key', data.key);
                        }
                    } catch (error) {
                        console.error('Failed to fetch API key from server:', error);
                    }
                }
            }
        };
        loadApiKey();
    }, []);

    const isFramingAllSelected = FRAMING_OPTIONS.every(opt => settings.cameraAngles.includes(opt));
    const isAngleAllSelected = CAMERA_ANGLE_OPTIONS.every(opt => settings.cameraAngles.includes(opt));
    const isPresetComboMode = isFramingAllSelected && isAngleAllSelected;

    // Global Mouse Handlers for Dragging
    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (!draggingLight || !boxRef.current) return;
            const rect = boxRef.current.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;

            // Clamp values 0-100
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            setSettings(prev => ({
                ...prev,
                relight: {
                    ...prev.relight,
                    lights: {
                        ...prev.relight.lights,
                        [draggingLight]: {
                            ...(prev.relight.lights as any)[draggingLight],
                            x,
                            y
                        }
                    }
                }
            }));
        };

        const handleGlobalUp = () => {
            setDraggingLight(null);
            document.body.style.cursor = 'default';
        };

        if (draggingLight) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
            document.body.style.cursor = 'grabbing';
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
            document.body.style.cursor = 'default';
        };
    }, [draggingLight]);

    const handleLightDragStart = (e: React.MouseEvent, lightKey: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!settings.relight.enabled) return;
        setDraggingLight(lightKey);
    };

    const handleSaveStoryPrompt = () => {
        localStorage.setItem('gemini_studio_story_prompt', storyFlow.storyPrompt);
        setStoryPromptSaveSuccess(true);
        setTimeout(() => setStoryPromptSaveSuccess(false), 2000);
    };

    const handleDownloadAll = async () => {
        for (let i = 0; i < generatedImages.length; i++) {
            const img = generatedImages[i];
            const link = document.createElement('a');
            link.href = img.url;
            link.download = `gemini-studio-${img.angleUsed.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}-${i + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    };

    const handleAnalyzeStoryFlow = async () => {
        if (!storyFlow.storyboardImage) return;
        setStoryFlow(prev => ({ ...prev, isAnalyzing: true, detectedPrompts: [] }));
        try {
            const systemInstruction = localStorage.getItem('gemini_architect_system_instruction') || '';
            const prompts = await analyzeStoryboardFlowWithReplicate(storyFlow.storyboardImage, storyFlow.storyPrompt, systemInstruction);
            if (prompts.length === 0) {
                setError("Analysis complete but no panels identified. Try ensuring the storyboard is clear and lines are visible.");
            } else {
                setStoryFlow(prev => ({ ...prev, detectedPrompts: prompts }));
            }
        } catch (e) {
            setError("Failed to analyze storyboard.");
        } finally {
            setStoryFlow(prev => ({ ...prev, isAnalyzing: false }));
        }
    };

    const handleNewCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => { if (reader.result) setNewCharacterImage(reader.result as string); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleAutoGeneratePersona = async () => {
        if (!newCharacterImage || !newCharacterName) { setError("Please provide an image and name first."); return; }
        setIsGeneratingPersona(true); setError(null);
        try {
            const persona = await generatePersonaPromptWithReplicate(newCharacterImage, newCharacterName);
            setNewCharacterPersona(persona);
        } catch (e) { setError("Failed to generate persona prompt."); } finally { setIsGeneratingPersona(false); }
    };

    const handleSaveCharacter = () => {
        if (!newCharacterImage || !newCharacterName || !newCharacterPersona) { setError("Please fill in all character fields."); return; }
        const newChar: Character = {
            id: Date.now().toString(),
            name: newCharacterName.trim().replace('@', ''),
            personaPrompt: newCharacterPersona,
            imageBase64: newCharacterImage
        };
        setCharacters(prev => [...prev, newChar]);
        setNewCharacterImage(null); setNewCharacterName(''); setNewCharacterPersona('');
    };

    const handleDeleteCharacter = (id: string) => { setCharacters(prev => prev.filter(c => c.id !== id)); };

    const handleDownloadVideo = async (videoUrl: string, filename: string) => {
        try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download video:', error);
            setError('Failed to download video. Please try again.');
        }
    };

    const prepareGenerationPayload = (rawPrompt: string) => {
        let finalPrompt = rawPrompt;
        const injectedReferenceImages = [...settings.referenceImages];
        const characterRefs: CharacterReference[] = [];

        characters.forEach(char => {
            const regex = new RegExp(`@${char.name}`, 'gi');
            if (regex.test(finalPrompt)) {
                finalPrompt = finalPrompt.replace(regex, char.name);
                if (!characterRefs.find(c => c.name === char.name)) {
                    characterRefs.push({
                        name: char.name,
                        imageBase64: char.imageBase64,
                        persona: char.personaPrompt // Pass the persona text
                    });
                }
            }
        });
        return { finalPrompt, injectedReferenceImages, characterRefs };
    };

    const handleGenerate = async () => {
        if (!hasValidReplicateApiKey()) {
            setError("Replicate API key is required. Please configure it in your environment.");
            return;
        }
        setError(null);
        setIsGenerating(true);
        setGeneratedImages([]);
        setSelectedImageIndex(0);
        setGeneratedVideoUrl(null);

        const performGeneration = async (
            panelPrompt: string,
            currentAngle: string,
            currentSettings: ImageSettings
        ) => {
            const { finalPrompt, injectedReferenceImages, characterRefs } = prepareGenerationPayload(panelPrompt);
            const tempSettings = {
                ...currentSettings,
                referenceImages: injectedReferenceImages,
                characterReferences: characterRefs
            };
            const url = await generateImageWithReplicate(finalPrompt, tempSettings, currentAngle);
            return { url, prompt: panelPrompt, settings: tempSettings, angleUsed: currentAngle } as GeneratedImage;
        };

        try {
            let results: GeneratedImage[] = [];

            if (activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0) {
                const activeAngle = settings.cameraAngles.length > 0 ? settings.cameraAngles.join(' + ') : 'Cinematic Composition';
                const promises = storyFlow.detectedPrompts.map((panelPrompt, idx) =>
                    performGeneration(panelPrompt, `Panel ${idx + 1}`, settings)
                );
                const outcomes = await Promise.allSettled(promises);
                results = outcomes
                    .filter((r): r is PromiseFulfilledResult<GeneratedImage> => r.status === 'fulfilled')
                    .map(r => r.value);

                const failures = outcomes.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    setError(`Storyboard partial completion: ${results.length}/${outcomes.length} panels generated.`);
                }
            } else {
                if (!prompt) { setIsGenerating(false); return; }
                if (settings.cameraAngles.length === 0) { setError("Please select at least one camera angle."); setIsGenerating(false); return; }

                let anglesToGenerate: string[] = [];
                const hasCustomCamera = settings.cameraControls.rotation !== 0 || settings.cameraControls.moveForward !== 0 || settings.cameraControls.verticalAngle !== 0 || settings.cameraControls.isWideAngle;

                if (hasCustomCamera) anglesToGenerate = ['Custom Camera Settings'];
                else if (isMergeMode) anglesToGenerate = [settings.cameraAngles.join(' + ')];
                else if (isPresetComboMode) anglesToGenerate = ['Medium Shot (MS) + OTS', 'Close-Up (CU) + Eye Level', 'Wide Shot (WS) + Eye Level', 'Medium Shot (MS) + Eye Level', 'Close-Up (CU) + Low Angle', 'Wide Shot (WS) + High Angle'];
                else anglesToGenerate = settings.cameraAngles;

                const promises = anglesToGenerate.map(angle => performGeneration(prompt, angle, settings));
                const outcomes = await Promise.allSettled(promises);

                results = outcomes
                    .filter((r): r is PromiseFulfilledResult<GeneratedImage> => r.status === 'fulfilled')
                    .map(r => r.value);

                const failures = outcomes.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    console.error('Partial generation failures:', failures);
                    const failCount = failures.length;
                    const total = outcomes.length;
                    setError(`Generated ${results.length}/${total} images. ${failCount} failed. Check console for details.`);
                }
            }

            setGeneratedImages(results);

            // Auto-update video start/end frames
            if (results.length >= 2) {
                setVideoFrames({ start: results[results.length - 2].url, end: results[results.length - 1].url });
            } else if (results.length === 1) {
                // Shift current end to start, new image to end
                setVideoFrames(prev => ({ start: prev.end || null, end: results[0].url }));
            }

        } catch (err: any) {
            if (err.message.includes('API key') || err.message.includes('400') || err.message.includes('403')) {
                setError("Authentication failed. Please check your Replicate API key.");
            } else {
                setError(err.message || "Failed to generate images. Please try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImprovePrompt = async () => {
        if (!hasValidReplicateApiKey()) {
            setError("Replicate API key is required. Please configure it in your environment.");
            return;
        }
        if (!videoSettings.motionPrompt && !videoFrames.start && !videoFrames.end && !prompt) {
            setError("Please provide a prompt or images to improve.");
            return;
        }
        setIsImprovingPrompt(true);
        setError(null);
        try {
            const promptToImprove = videoSettings.motionPrompt || prompt || "";
            const improved = await improveVideoPromptWithReplicate(
                promptToImprove,
                videoFrames.start,
                videoFrames.end
            );
            setVideoSettings(prev => ({ ...prev, motionPrompt: improved }));
        } catch (e: any) {
            setError(e.message || "Failed to improve prompt. Please check your Replicate API key.");
        } finally {
            setIsImprovingPrompt(false);
        }
    };

    // Gemini Veo video generation removed - using Replicate for all video generation

    const handleVideoFrameUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) setVideoFrames(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleGenerateReplicateVideo = async () => {
        if (!hasValidReplicateApiKey()) {
            setError("Replicate API key is required. Please check your server configuration.");
            return;
        }
        setError(null);
        setIsGeneratingReplicateVideo(true);
        setGeneratedReplicateVideoUrl(null);
        try {
            const { finalPrompt } = prepareGenerationPayload(prompt);
            const videoPrompt = videoSettings.motionPrompt || finalPrompt;

            if (!videoPrompt) throw new Error("A prompt is required for video generation.");

            const url = await generateVideoWithReplicate(
                replicateVideoSettings,
                videoPrompt,
                videoFrames.start,
                videoFrames.end
            );
            setGeneratedReplicateVideoUrl(url);
        } catch (err: any) {
            if (err.message.includes('API key') || err.message.includes('Unauthorized')) {
                setError("Replicate API Key Error: Please check your server configuration.");
            } else {
                setError(err.message);
            }
        } finally {
            setIsGeneratingReplicateVideo(false);
        }
    };

    const toggleAngle = (angle: string) => {
        setSettings(prev => {
            const current = prev.cameraAngles;
            return current.includes(angle) ? { ...prev, cameraAngles: current.filter(a => a !== angle) } : { ...prev, cameraAngles: [...current, angle] };
        });
    };

    const togglePreset = (presetOptions: string[]) => {
        setSettings(prev => {
            const current = prev.cameraAngles;
            const allSelected = presetOptions.every(opt => current.includes(opt));
            return allSelected ? { ...prev, cameraAngles: current.filter(a => !presetOptions.includes(a)) } : { ...prev, cameraAngles: [...current, ...presetOptions.filter(o => !current.includes(o))] };
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            files.slice(0, 4 - settings.referenceImages.length).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => { if (reader.result) setSettings(prev => ({ ...prev, referenceImages: [...prev.referenceImages, reader.result as string] })); };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        }
    };

    const handleStoryFlowUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => { if (reader.result) setStoryFlow(prev => ({ ...prev, storyboardImage: reader.result as string, detectedPrompts: [] })); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleRemoveReferenceImage = (index: number) => { setSettings(prev => ({ ...prev, referenceImages: prev.referenceImages.filter((_, i) => i !== index) })); };

    const handleUseLastRender = () => {
        if (generatedImages.length === 0) {
            setError("No generated images available. Generate an image first.");
            return;
        }
        if (settings.referenceImages.length >= 4) {
            setError("Maximum 4 reference images allowed. Remove one first.");
            return;
        }
        const lastImage = generatedImages[generatedImages.length - 1];
        setSettings(prev => ({ ...prev, referenceImages: [...prev.referenceImages, lastImage.url] }));
    };

    const currentImage = generatedImages.length > 0 ? generatedImages[selectedImageIndex] : null;
    const hasCustomCamera = settings.cameraControls.rotation !== 0 || settings.cameraControls.moveForward !== 0 || settings.cameraControls.verticalAngle !== 0 || settings.cameraControls.isWideAngle;
    let generateButtonText = "Generate";
    let count = 0;

    if (activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0) { count = storyFlow.detectedPrompts.length; generateButtonText = `Generate (${count}) Storyboard Panels`; }
    else if (hasCustomCamera) { count = 1; generateButtonText = "Generate with Custom Camera"; }
    else if (isMergeMode) { count = 1; generateButtonText = "Generate (1) Combined Image"; }
    else if (isPresetComboMode) { count = 6; generateButtonText = "Generate (6) Cinematic Combos"; }
    else { count = settings.cameraAngles.length || 1; generateButtonText = `Generate (${count})`; }

    const toggleSidebar = (mode: SidebarMode) => {
        if (mode === 'settings') {
            const willShow = !showSettings;
            setShowSettings(willShow);
            // If opening settings and not pinned, close left sidebar?
            // User did not ask for this specific behavior, but standard UI patterns suggest mutual exclusivity unless pinned.
            // However, sticking to "Pin keeps it open" implies unpinned might close.
            if (willShow && !isSettingsPinned) {
                setActiveSidebar('none');
            }
        } else {
            // Left sidebar mode
            if (activeSidebar === mode) {
                setActiveSidebar('none');
            } else {
                setActiveSidebar(mode);
                // If opening left sidebar, close settings unless pinned
                if (!isSettingsPinned) {
                    setShowSettings(false);
                }
            }
        }
    };

    const getClockPosition = (x: number, y: number) => {
        const dx = x - 50;
        const dy = y - 50;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 10) return "Center";

        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);
        let clockVal = (angleDeg + 90) / 30;
        if (clockVal < 0) clockVal += 12;
        if (clockVal === 0) clockVal = 12;
        return `${Math.round(clockVal) || 12} o'clock`;
    };

    const renderLightHandle = (key: string, label: string) => {
        const lights = settings.relight.lights as any;
        const light = lights[key] as RelightLight;
        if (!light || !light.enabled) return null;
        const gelColor = settings.relight.gels[light.colorIndex];
        const isDragging = draggingLight === key;
        const clockPos = getClockPosition(light.x, light.y);

        return (
            <div
                key={key}
                onMouseDown={(e) => handleLightDragStart(e, key)}
                className={`absolute w-8 h-8 rounded-full shadow-xl cursor-grab active:cursor-grabbing z-[60] group transform -translate-x-1/2 -translate-y-1/2 transition-transform pointer-events-auto flex items-center justify-center ${isDragging ? 'scale-125' : 'hover:scale-110'}`}
                style={{
                    left: `${light.x}%`,
                    top: `${light.y}%`,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    border: `2px solid ${gelColor}`,
                    boxShadow: `0 0 12px ${gelColor}80, inset 0 0 8px ${gelColor}40`
                }}
            >
                <div className="w-2 h-2 rounded-full bg-white opacity-80" />

                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[9px] px-2 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none border border-white/10 z-50 shadow-xl flex flex-col items-center gap-0.5">
                    <span className="font-bold">{label}</span>
                    <span className="text-zinc-300">{clockPos} (Off-Camera)</span>
                    <div className="text-[8px] text-zinc-500 font-mono mt-0.5">
                        Int: {light.intensity}%
                    </div>
                </div>
            </div>
        );
    };

    const renderLightBeam = (key: string) => {
        const lights = settings.relight.lights as any;
        const light = lights[key] as RelightLight;
        if (!light || !light.enabled) return null;

        const gelColor = settings.relight.gels[light.colorIndex];

        const centerX = 50;
        const centerY = 50;

        const dx = centerX - light.x;
        const dy = centerY - light.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const opacity = Math.max(0.1, light.intensity / 100);
        const blurAmount = 2 + (settings.relight.modifiers.diffuser / 6);
        const spread = 15 + (settings.relight.modifiers.diffuser / 4);

        return (
            <g key={`beam-${key}`} style={{ mixBlendMode: 'screen' }}>
                <defs>
                    <filter id={`blur-${key}`}>
                        <feGaussianBlur in="SourceGraphic" stdDeviation={blurAmount} />
                    </filter>
                    <linearGradient id={`grad-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={gelColor} stopOpacity={opacity * 0.6} />
                        <stop offset="100%" stopColor={gelColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={`M 0 0 L ${dist} -${spread / 2} L ${dist} ${spread / 2} Z`}
                    fill={`url(#grad-${key})`}
                    filter={`url(#blur-${key})`}
                    transform={`translate(${light.x}, ${light.y}) rotate(${angle})`}
                    style={{ pointerEvents: 'none' }}
                />
            </g>
        );
    };

    return (
        <div className="flex flex-row h-full bg-[var(--bg-main)] relative w-full overflow-hidden font-sans text-[var(--text-primary)] transition-colors duration-300">
            {/* Primary Navigation sidebar */}
            <div className="w-14 flex-none z-30 bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col items-center py-4 gap-4 h-full shadow-sm">
                <button onClick={() => toggleSidebar('story')} className={`p-2 rounded-xl transition-all relative group shadow-sm ${activeSidebar === 'story' ? 'text-indigo-500 bg-[var(--bg-input)] ring-1 ring-indigo-500/20' : 'text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--bg-hover)]'}`} title="Story Flow">
                    <div className="w-6 h-6 flex items-center justify-center"><SparklesIcon className="w-6 h-6" /></div>
                    {/* Tooltip */}
                    <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 whitespace-nowrap ml-2">Story Flow</div>
                    {activeSidebar === 'story' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r"></div>}
                </button>
                <button onClick={() => toggleSidebar('characters')} className={`p-2 rounded-xl transition-all relative group shadow-sm ${activeSidebar === 'characters' ? 'text-pink-500 bg-[var(--bg-input)] ring-1 ring-pink-500/20' : 'text-[var(--text-muted)] hover:text-pink-500 hover:bg-[var(--bg-hover)]'}`} title="Characters">
                    <div className="w-6 h-6 flex items-center justify-center"><UserGroupIcon className="w-6 h-6" /></div>
                    <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 whitespace-nowrap ml-2">Characters</div>
                    {activeSidebar === 'characters' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-pink-500 rounded-r"></div>}
                </button>
                <button onClick={() => toggleSidebar('relight')} className={`p-2 rounded-xl transition-all relative group shadow-sm ${activeSidebar === 'relight' ? 'text-amber-500 bg-[var(--bg-input)] ring-1 ring-amber-500/20' : 'text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-hover)]'}`} title="Relight Studio">
                    <div className="w-6 h-6 flex items-center justify-center"><LightBulbIcon className="w-6 h-6" /></div>
                    <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 whitespace-nowrap ml-2">Relight</div>
                    {activeSidebar === 'relight' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r"></div>}
                </button>
                <button onClick={() => toggleSidebar('video')} className={`p-2 rounded-xl transition-all relative group shadow-sm ${activeSidebar === 'video' ? 'text-emerald-500 bg-[var(--bg-input)] ring-1 ring-emerald-500/20' : 'text-[var(--text-muted)] hover:text-emerald-500 hover:bg-[var(--bg-hover)]'}`} title="Video Generation">
                    <div className="w-6 h-6 flex items-center justify-center"><FilmIcon className="w-6 h-6" /></div>
                    <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 whitespace-nowrap ml-2">Video</div>
                    {activeSidebar === 'video' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r"></div>}
                </button>

                <button onClick={() => toggleSidebar('smart-banners')} className={`p-2 rounded-xl transition-all relative group shadow-sm ${activeSidebar === 'smart-banners' ? 'text-purple-500 bg-[var(--bg-input)] ring-1 ring-purple-500/20' : 'text-[var(--text-muted)] hover:text-purple-500 hover:bg-[var(--bg-hover)]'}`} title="Smart Banners">
                    <div className="w-6 h-6 flex items-center justify-center"><RectangleGroupIcon className="w-6 h-6" /></div>
                    <div className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 whitespace-nowrap ml-2">Smart Banners</div>
                    {activeSidebar === 'smart-banners' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-purple-500 rounded-r"></div>}
                </button>
            </div>

            {/* Expansible Sidebar Content */}
            <div className={`flex-none bg-[var(--bg-panel)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${['story', 'characters', 'relight', 'video'].includes(activeSidebar) ? 'w-80 shadow-2xl opacity-100' : 'w-0 opacity-0 border-none'}`}>
                {activeSidebar === 'story' && (
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-24 scrollbar-hide min-w-0">
                        <div className="flex items-center gap-3 mb-4 p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] shadow-sm">
                            <SparklesIcon className="w-5 h-5 text-indigo-500" />
                            <h3 className="font-bold text-[var(--text-primary)] text-base">Story Flow</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px]">1</span>
                                Upload Page
                            </div>
                            <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-indigo-500/50 hover:bg-[var(--bg-input)] transition relative flex flex-col items-center justify-center text-[var(--text-muted)] group overflow-hidden bg-[var(--bg-card)]">
                                {storyFlow.storyboardImage ? (
                                    <><img src={storyFlow.storyboardImage} alt="Board" className="absolute inset-0 w-full h-full object-contain bg-black/5" /><button onClick={() => setStoryFlow(prev => ({ ...prev, storyboardImage: null, detectedPrompts: [] }))} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full z-10 transition backdrop-blur-sm"><XMarkIcon className="w-4 h-4" /></button></>
                                ) : (
                                    <><CloudArrowDownIcon className="w-8 h-8 mb-2 group-hover:scale-110 transition text-[var(--text-muted)]" /><span className="text-xs text-center px-4 font-medium">Click to Upload Storyboard</span><input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleStoryFlowUpload} /></>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px]">2</span>
                                Story Context
                            </div>
                            <textarea value={storyFlow.storyPrompt} onChange={(e) => setStoryFlow(prev => ({ ...prev, storyPrompt: e.target.value }))} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-sm p-4 rounded-2xl border border-[var(--border-color)] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-[100px] resize-none transition" placeholder="Briefly describe the scene flow..." autoComplete="off" data-lpignore="true" />
                            <div className="flex justify-end"><button onClick={handleSaveStoryPrompt} className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium ${storyPromptSaveSuccess ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'}`}>{storyPromptSaveSuccess ? <CheckCircleIcon className="w-3.5 h-3.5" /> : null}{storyPromptSaveSuccess ? 'Saved' : 'Save Context'}</button></div>
                        </div>
                        <button onClick={handleAnalyzeStoryFlow} disabled={!storyFlow.storyboardImage || storyFlow.isAnalyzing} className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">{storyFlow.isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <BoltIcon className="w-5 h-5" />}Analyze Board</button>
                        {storyFlow.detectedPrompts.length > 0 && <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4"><div className="flex items-center gap-2 text-green-500 text-sm font-bold mb-2"><CheckCircleIcon className="w-5 h-5" />{storyFlow.detectedPrompts.length} Panels Identified</div><p className="text-xs text-[var(--text-secondary)] leading-relaxed">Analysis complete. Close this sidebar to start generating scenes.</p></div>}
                    </div>
                )}
                {activeSidebar === 'characters' && (
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-24 scrollbar-hide min-w-0">
                        <div className="flex items-center gap-3 mb-4 p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] shadow-sm">
                            <UserGroupIcon className="w-5 h-5 text-pink-500" />
                            <h3 className="font-bold text-[var(--text-primary)] text-base">Characters</h3>
                        </div>
                        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)] space-y-4 shadow-sm">
                            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">New Character</div>
                            <div className="flex gap-4">
                                <label className="w-20 h-20 shrink-0 rounded-2xl bg-[var(--bg-input)] border border-dashed border-[var(--border-color)] hover:border-pink-500 cursor-pointer flex items-center justify-center overflow-hidden transition group">
                                    {newCharacterImage ? <img src={newCharacterImage} className="w-full h-full object-cover" alt="New Char" /> : <PlusIcon className="w-6 h-6 text-[var(--text-muted)] group-hover:scale-110 transition" />}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleNewCharacterUpload} />
                                </label>
                                <div className="flex-1 space-y-3">
                                    <input type="text" placeholder="Name (e.g. Vani)" value={newCharacterName} onChange={e => setNewCharacterName(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2.5 text-sm text-[var(--text-primary)] focus:border-pink-500 outline-none transition" autoComplete="off" data-lpignore="true" />
                                    <button onClick={handleAutoGeneratePersona} disabled={isGeneratingPersona || !newCharacterImage} className="w-full bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-xs py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center gap-1.5 disabled:opacity-50 transition">{isGeneratingPersona ? <div className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-[var(--text-primary)] rounded-full animate-spin" /> : <SparklesIcon className="w-3.5 h-3.5" />}Auto-Gen Persona</button>
                                </div>
                            </div>
                            <textarea value={newCharacterPersona} onChange={e => setNewCharacterPersona(e.target.value)} placeholder="Persona Prompt (NAME|trait|trait...)" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-secondary)] focus:border-pink-500 outline-none min-h-[80px]" autoComplete="off" data-lpignore="true" />
                            <button onClick={handleSaveCharacter} className="w-full bg-pink-600 hover:bg-pink-500 text-white text-sm py-2.5 rounded-xl font-bold shadow-lg shadow-pink-500/20 transition">Save Character</button>
                        </div>
                        <div className="space-y-3">
                            <div className="text-xs font-bold text-[var(--text-muted)] uppercase mt-6 mb-2 tracking-wider">Library ({characters.length})</div>
                            {characters.map(char => (
                                <div key={char.id} className="bg-[var(--bg-card)] rounded-2xl p-3 flex gap-4 group relative border border-[var(--border-color)] hover:border-zinc-400 dark:hover:border-zinc-600 transition-all hover:shadow-md">
                                    <img src={char.imageBase64} alt={char.name} className="w-16 h-16 rounded-xl object-cover bg-black/10 flex-shrink-0" />
                                    <div className="flex-1 min-w-0 flex flex-col justify-center"><div className="text-sm font-bold text-[var(--text-primary)] truncate">@{char.name}</div><div className="text-[10px] text-[var(--text-muted)] line-clamp-3 leading-tight mt-1">{char.personaPrompt}</div></div>
                                    <button onClick={() => handleDeleteCharacter(char.id)} className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition bg-[var(--bg-main)] p-1.5 rounded-full shadow-sm border border-[var(--border-color)]"><TrashIcon className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeSidebar === 'relight' && (
                    <div className="flex-1 p-4 overflow-hidden flex flex-col min-w-0 h-full bg-[var(--bg-panel)]">
                        <RelightPanel settings={settings.relight} onChange={(newRelight) => setSettings({ ...settings, relight: newRelight })} />
                        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-500 flex gap-2 leading-relaxed items-start"><LightBulbIcon className="w-5 h-5 shrink-0" /><div><strong>Pro Tip:</strong> Drag lights on the canvas to position. Beam shape previews spread.</div></div>
                    </div>
                )}
                {activeSidebar === 'video' && (
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-24 scrollbar-hide min-w-0">
                        <div className="flex items-center gap-3 mb-4 p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] shadow-sm">
                            <FilmIcon className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-[var(--text-primary)] text-base">Video Generation</h3>
                        </div>
                        {(() => {
                            const selectedModel = REPLICATE_MODELS.find(m => m.id === replicateVideoSettings.model);
                            const requiresImage = selectedModel?.requiresStartImage || selectedModel?.type === 'image-to-video';

                            return (
                                <div className="space-y-4">
                                    {/* Frame Uploads */}
                                    <div className="flex gap-3 items-stretch h-32">
                                        {/* Start Frame */}
                                        <div className="w-1/3 relative group bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col hover:border-emerald-500/50 transition">
                                            <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold p-1 text-center bg-[var(--bg-card)] border-b border-[var(--border-color)]">Start Frame</div>
                                            <div className="flex-1 relative flex items-center justify-center">
                                                {videoFrames.start ? (
                                                    <img src={videoFrames.start} alt="Start" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <PhotoIcon className="w-5 h-5 text-[var(--text-muted)]" />
                                                        <span className="text-[9px] text-[var(--text-muted)]">{requiresImage ? 'Required' : 'Optional'}</span>
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition backdrop-blur-[1px]">
                                                    <PencilSquareIcon className="w-5 h-5 text-white" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVideoFrameUpload(e, 'start')} />
                                                </label>
                                            </div>
                                        </div>

                                        {/* End Frame */}
                                        <div className="w-1/3 relative group bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col hover:border-emerald-500/50 transition">
                                            <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold p-1 text-center bg-[var(--bg-card)] border-b border-[var(--border-color)]">End Frame</div>
                                            <div className="flex-1 relative flex items-center justify-center">
                                                {videoFrames.end ? (
                                                    <img src={videoFrames.end} alt="End" className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[9px] text-[var(--text-muted)]">Optional</span>
                                                )}
                                                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition backdrop-blur-[1px]">
                                                    <PencilSquareIcon className="w-5 h-5 text-white" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleVideoFrameUpload(e, 'end')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Motion Prompt */}
                                    <div className="flex flex-col relative space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Motion Prompt</span>
                                            <button onClick={handleImprovePrompt} disabled={isImprovingPrompt} className="text-[10px] flex items-center gap-1 text-indigo-500 hover:text-indigo-600 disabled:opacity-50 transition font-medium">
                                                {isImprovingPrompt ? <div className="w-3 h-3 rounded-full border border-indigo-500 border-t-transparent animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                                                {isImprovingPrompt ? 'Analyzing...' : 'Improve'}
                                            </button>
                                        </div>
                                        <textarea value={videoSettings.motionPrompt} onChange={(e) => setVideoSettings({ ...videoSettings, motionPrompt: e.target.value })} placeholder={prompt ? "Using main prompt..." : "Describe motion..."} className="w-full h-20 bg-[var(--bg-input)] text-[var(--text-primary)] p-3 text-xs rounded-xl border border-[var(--border-color)] resize-none outline-none focus:border-emerald-500 transition" />
                                    </div>

                                    {/* Model Selector */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-[var(--text-muted)] block">Video Model</label>
                                        <select value={replicateVideoSettings.model} onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, model: e.target.value })} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] text-xs outline-none focus:border-emerald-500">
                                            {REPLICATE_MODELS.map(m => (<option key={m.id} value={m.id}>{m.name} ({m.type})</option>))}
                                        </select>
                                    </div>

                                    {/* Settings Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-[var(--text-muted)] block mb-1">Aspect Ratio</label>
                                            <select value={replicateVideoSettings.aspectRatio} onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, aspectRatio: e.target.value })} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-color)] text-xs outline-none focus:border-emerald-500">
                                                {selectedModel?.aspectRatios?.map(r => <option key={r} value={r}>{r}</option>) || <option>Default</option>}
                                            </select>
                                        </div>
                                        {selectedModel?.durations && (
                                            <div>
                                                <label className="text-[10px] text-[var(--text-muted)] block mb-1">Duration</label>
                                                <select value={replicateVideoSettings.duration} onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, duration: e.target.value })} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-color)] text-xs outline-none focus:border-emerald-500">
                                                    {selectedModel.durations.map(dur => <option key={dur} value={dur}>{dur}s</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resolution */}
                                    <div>
                                        <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Resolution</label>
                                        {selectedModel?.resolutions ? (
                                            <select
                                                value={replicateVideoSettings.resolution}
                                                onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, resolution: e.target.value })}
                                                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded border border-[var(--border-color)] text-xs outline-none"
                                            >
                                                {selectedModel.resolutions.map(res => (
                                                    <option key={res} value={res}>{res}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="w-full bg-[var(--bg-input)] text-[var(--text-secondary)] p-2 rounded border border-[var(--border-color)] text-xs flex items-center justify-center opacity-50 cursor-not-allowed">
                                                Auto
                                            </div>
                                        )}
                                    </div>

                                    {/* FPS (for Wan model only) */}
                                    {selectedModel?.fpsRange && (
                                        <div>
                                            <label className="text-[10px] text-[var(--text-secondary)] block mb-1">FPS (Frames/Sec)</label>
                                            <input
                                                type="number"
                                                min={selectedModel.fpsRange[0]}
                                                max={selectedModel.fpsRange[1]}
                                                value={replicateVideoSettings.fps || 16}
                                                onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, fps: parseInt(e.target.value) })}
                                                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded border border-[var(--border-color)] text-xs outline-none"
                                            />
                                        </div>
                                    )}

                                    {/* Frame Count (for Wan model only) */}
                                    {selectedModel?.frameRange && (
                                        <div>
                                            <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Frame Count</label>
                                            <input
                                                type="number"
                                                min={selectedModel.frameRange[0]}
                                                max={selectedModel.frameRange[1]}
                                                value={replicateVideoSettings.numFrames || 81}
                                                onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, numFrames: parseInt(e.target.value) })}
                                                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 rounded border border-[var(--border-color)] text-xs outline-none"
                                            />
                                        </div>
                                    )}

                                    {/* Audio Generation Toggle (for Veo models) */}
                                    {selectedModel?.supportsAudio && (
                                        <div className="flex items-center justify-between p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                                            <label className="text-[10px] text-[var(--text-secondary)]">Generate Audio</label>
                                            <button
                                                onClick={() => setReplicateVideoSettings({
                                                    ...replicateVideoSettings,
                                                    generateAudio: !replicateVideoSettings.generateAudio
                                                })}
                                                className={`relative w-10 h-5 rounded-full transition ${replicateVideoSettings.generateAudio !== false ? 'bg-emerald-500' : 'bg-[var(--bg-hover)]'
                                                    }`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${replicateVideoSettings.generateAudio !== false ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Negative Prompt */}
                                    <div>
                                        <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Negative Prompt (Optional)</label>
                                        <textarea
                                            value={replicateVideoSettings.negativePrompt || ''}
                                            onChange={(e) => setReplicateVideoSettings({ ...replicateVideoSettings, negativePrompt: e.target.value })}
                                            placeholder="Describe what you don't want to see..."
                                            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2 text-xs rounded-lg border border-[var(--border-color)] resize-none outline-none focus:border-emerald-500 h-16"
                                        />
                                    </div>

                                    {/* Generate Button */}
                                    <button onClick={handleGenerateReplicateVideo} disabled={isGeneratingReplicateVideo || (requiresImage && !videoFrames.start)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm">
                                        {isGeneratingReplicateVideo ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><FilmIcon className="w-4 h-4" />Generate Video</>}
                                    </button>
                                </div>
                            );
                        })()}
                    </div >
                )}
            </div >

            {/* Smart Banners Module (Persisted) */}
            <div className={`flex-1 min-w-0 ${activeSidebar === 'smart-banners' ? 'block' : 'hidden'}`}>
                <SmartBanners />
            </div>

            {/* Main Visual Studio Module */}
            <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ${activeSidebar === 'smart-banners' ? 'hidden' : 'flex'}`}>
                <div className="p-2 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-none sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <PhotoIcon className="w-5 h-5 text-green-400" />
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Visual Studio</h2>
                            <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20 ml-2">PRO</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 gap-3">
                    <div className="w-full flex-1 min-h-0 bg-[var(--bg-card)] rounded-2xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center relative overflow-hidden group select-none shadow-2xl">
                        {/* Parent Container (Reference for ResizeObserver) */}
                        <div ref={previewRef} className="absolute inset-0 flex items-center justify-center p-8 z-0">

                            {/* Dynamic Aspect Ratio Box (Reference for Content & Dragging) */}
                            <div
                                ref={boxRef}
                                className={`relative transition-all duration-300 shadow-2xl ${!currentImage && !generatedVideoUrl && !generatedReplicateVideoUrl ? 'border-[2px] border-zinc-500/40 bg-[var(--bg-main)]' : ''}`}
                                style={getPreviewStyle()}
                            >
                                {/* Active Format Label (Only in Schematic Mode) */}
                                {!currentImage && !generatedVideoUrl && !generatedReplicateVideoUrl && (
                                    <div className="absolute -top-6 left-0 text-[10px] font-medium text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-white/10 z-20">
                                        {settings.aspectRatio}
                                    </div>
                                )}

                                {/* Content Layer */}
                                <div className="absolute inset-0 overflow-hidden">
                                    {isGenerating || isGeneratingVideo || isGeneratingReplicateVideo ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-[var(--bg-main)]">
                                            <div className="w-16 h-16 border-4 border-[var(--border-color)] border-t-indigo-500 rounded-full animate-spin"></div>
                                            <p className="text-[var(--text-secondary)] text-sm font-medium animate-pulse">
                                                {isGeneratingVideo ? 'Synthesizing Veo Video...' :
                                                    isGeneratingReplicateVideo ? 'Generating Replicate Video...' :
                                                        'Rendering Scene...'}
                                            </p>
                                        </div>
                                    ) : generatedVideoUrl ? (
                                        <div className="relative w-full h-full">
                                            <video src={generatedVideoUrl} controls className="w-full h-full object-cover" autoPlay loop />
                                            <button onClick={() => setGeneratedVideoUrl(null)} className="absolute top-4 right-4 bg-black/80 p-2 rounded-full text-white hover:bg-red-500 transition z-50"><XMarkIcon className="w-4 h-4" /></button>
                                        </div>
                                    ) : generatedReplicateVideoUrl ? (
                                        <div className="relative w-full h-full">
                                            <video src={generatedReplicateVideoUrl} controls className="w-full h-full object-cover" autoPlay loop />
                                            <button onClick={() => setGeneratedReplicateVideoUrl(null)} className="absolute top-4 right-4 bg-black/80 p-2 rounded-full text-white hover:bg-red-500 transition z-50"><XMarkIcon className="w-4 h-4" /></button>
                                        </div>
                                    ) : currentImage ? (
                                        <img src={currentImage.url} alt="Generated" className="w-full h-full object-cover" draggable={false} />
                                    ) : (
                                        <div className="relative w-full h-full flex items-center justify-center bg-[var(--bg-main)] perspective-[1000px] overflow-hidden group">
                                            {/* Schematic Grid */}
                                            <div className="absolute w-[200%] h-[200%] opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'rotateX(60deg) translateY(-20%) translateZ(-100px)', transformOrigin: 'center 40%' }} />
                                            {/* Subject */}
                                            <div className="relative z-10 flex flex-col items-center justify-center transition duration-500">
                                                <UserIcon className="w-24 h-24 text-[var(--text-muted)] drop-shadow-2xl opacity-50" />
                                                <div className="w-20 h-4 bg-black/50 blur-lg rounded-[100%] mt-[-10px]"></div>
                                            </div>
                                            {!settings.relight.enabled && (
                                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                    <button onClick={() => setSettings(s => ({ ...s, relight: { ...s.relight, enabled: true } }))} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-2xl shadow-indigo-500/20 flex items-center gap-2 transform hover:scale-105 transition">
                                                        <BoltIcon className="w-5 h-5" />Enable Studio Lights
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Lighting Overlay (Confined to Box) */}
                                {settings.relight.enabled && !generatedVideoUrl && !generatedReplicateVideoUrl && !isGeneratingVideo && !isGeneratingReplicateVideo && (
                                    <>
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden">
                                            {renderLightBeam('key')}
                                            {renderLightBeam('rim')}
                                            {renderLightBeam('back')}
                                            {renderLightBeam('bounce')}
                                        </svg>
                                        <div className="absolute inset-0 z-20 pointer-events-none">
                                            {renderLightHandle('key', 'Key Light')}
                                            {renderLightHandle('rim', 'Rim Light')}
                                            {renderLightHandle('back', 'Backlight')}
                                            {renderLightHandle('bounce', 'Bounce Fill')}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center relative z-20">
                        {generatedImages.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide flex-1 max-w-full">
                                {generatedImages.map((img, idx) => (
                                    <button key={idx} onClick={() => { setSelectedImageIndex(idx); setGeneratedVideoUrl(null); }} className={`relative flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 transition ${selectedImageIndex === idx ? 'border-green-500 ring-2 ring-green-500/30' : 'border-[var(--border-color)] opacity-60 hover:opacity-100'}`} title={img.angleUsed}>
                                        <img src={img.url} className="w-full h-full object-cover" alt={`Variant ${idx}`} />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 w-full md:w-auto">
                            {generatedImages.length > 1 && (
                                <button onClick={handleDownloadAll} className="flex-1 md:flex-none bg-[var(--bg-hover)] hover:bg-[var(--border-hover)] text-[var(--text-primary)] hover:text-[var(--text-primary)] px-4 py-2.5 rounded-lg text-xs font-bold border border-[var(--border-color)] transition flex items-center justify-center gap-2 shadow-sm whitespace-nowrap cursor-pointer">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download All
                                </button>
                            )}
                            {generatedVideoUrl && (
                                <button onClick={() => handleDownloadVideo(generatedVideoUrl, `gemini-video-${Date.now()}.mp4`)} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap cursor-pointer z-30">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download Veo Video
                                </button>
                            )}
                            {generatedReplicateVideoUrl && (
                                <button onClick={() => handleDownloadVideo(generatedReplicateVideoUrl, `replicate-video-${Date.now()}.mp4`)} className="flex-1 md:flex-none bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap cursor-pointer z-30">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download Video
                                </button>
                            )}
                            {!generatedVideoUrl && !generatedReplicateVideoUrl && currentImage && (
                                <a href={currentImage.url} download={`gemini-studio-render-${Date.now()}.png`} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 text-sm whitespace-nowrap cursor-pointer z-30">
                                    <ArrowDownTrayIcon className="w-4 h-4" /> Download Image
                                </a>
                            )}
                        </div>
                    </div>


                </div>
                <div className="p-3 bg-[var(--bg-main)] border-t border-[var(--border-color)] space-y-3 z-20 flex-none">
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex justify-between"><span>Final Prompt</span>{characters.length > 0 && <span className="text-[10px] text-pink-400">Tip: Use @name to insert character</span>}</label>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0} className={`w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl p-2 border border-[var(--border-color)] focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none h-24 resize-none font-light leading-relaxed ${activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder={activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0 ? "Using prompts detected from Story Flow..." : "Waiting for prompt from Architect... (Type @name to use characters)"} />
                        </div>
                    </div>

                    {error && (<div className="p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg text-sm">{error}</div>)}
                    <button onClick={handleGenerate} disabled={isGenerating || (!prompt && activeSidebar !== 'story')} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-lg group relative z-20">
                        {isGenerating ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Synthesizing {count} Variants...</>) : (<><BoltIcon className="w-6 h-6 group-hover:animate-pulse" />{generateButtonText}</>)}
                    </button>
                </div>

            </div>



            <div className={`flex-none bg-[var(--bg-panel)] border-l border-[var(--border-color)] transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${showSettings ? 'w-80 shadow-2xl opacity-100' : 'w-0 opacity-0 border-none'}`}>
                {showSettings && (
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 pb-24 scrollbar-hide min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => toggleSidebar('settings')}>
                                <AdjustmentsHorizontalIcon className="w-6 h-6 text-cyan-400" />
                                <h3 className="font-bold text-[var(--text-primary)] text-base">Studio Settings</h3>
                            </div>
                            <button
                                onClick={() => setIsSettingsPinned(!isSettingsPinned)}
                                className={`p-1.5 rounded-lg transition-colors ${isSettingsPinned ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                                title={isSettingsPinned ? "Unpin Settings" : "Pin Settings"}
                            >
                                <PaperClipIcon className={`w-4 h-4 ${isSettingsPinned ? 'text-cyan-400' : ''}`} />
                            </button>
                        </div>

                        <div className="space-y-2">


                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Model</label>
                            <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-color)] mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <CubeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                                    <select
                                        value={settings.model || 'google/nano-banana-pro'}
                                        onChange={(e) => {
                                            const newModel = e.target.value as any;
                                            const defaultSize = newModel.includes('flux') ? '1 MP' : '1K';
                                            setSettings({ ...settings, model: newModel, imageSize: defaultSize });
                                        }}
                                        className="w-full bg-transparent text-[var(--text-primary)] text-sm font-medium outline-none"
                                    >
                                        <option value="google/nano-banana-pro">Nano Banana Pro</option>
                                        <option value="black-forest-labs/flux-2-flex">Flux 2.1 Flex</option>
                                        <option value="black-forest-labs/flux-2-max">Flux 2.1 Max</option>
                                    </select>
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">
                                    {settings.model?.includes('flux') ? 'Advanced model with high fidelity.' : 'Fast, efficient standard model.'}
                                </div>
                            </div>

                            {(settings.model === 'black-forest-labs/flux-2-flex' || settings.model === 'black-forest-labs/flux-2-max') && settings.fluxSettings && (
                                <div className="space-y-3 mb-4 p-3 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2"><SparklesIcon className="w-3 h-3 text-purple-400" /> Flux Settings</h4>

                                    <div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                                            <span>Safety Tolerance</span>
                                            <span>{settings.fluxSettings.safety_tolerance}</span>
                                        </div>
                                        <input type="range" min="1" max="5" step="1" value={settings.fluxSettings.safety_tolerance} onChange={(e) => setSettings({ ...settings, fluxSettings: { ...settings.fluxSettings!, safety_tolerance: parseInt(e.target.value) } })} className="w-full" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                                            <span>Steps</span>
                                            <span>{settings.fluxSettings.steps}</span>
                                        </div>
                                        <input type="range" min="4" max="50" step="1" value={settings.fluxSettings.steps} onChange={(e) => setSettings({ ...settings, fluxSettings: { ...settings.fluxSettings!, steps: parseInt(e.target.value) } })} className="w-full" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                                            <span>Guidance</span>
                                            <span>{settings.fluxSettings.guidance}</span>
                                        </div>
                                        <input type="range" min="0" max="10" step="0.5" value={settings.fluxSettings.guidance} onChange={(e) => setSettings({ ...settings, fluxSettings: { ...settings.fluxSettings!, guidance: parseFloat(e.target.value) } })} className="w-full" />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                                            <span>Output Quality</span>
                                            <span>{settings.fluxSettings.output_quality}</span>
                                        </div>
                                        <input type="range" min="0" max="100" step="1" value={settings.fluxSettings.output_quality} onChange={(e) => setSettings({ ...settings, fluxSettings: { ...settings.fluxSettings!, output_quality: parseInt(e.target.value) } })} className="w-full" />
                                    </div>
                                </div>
                            )}

                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Format</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-xs text-[var(--text-secondary)] mb-1 block">Aspect Ratio</span><select value={settings.aspectRatio} onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as AspectRatio })} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-sm"><option value="Auto">Auto</option><option value="1:1">1:1 (Square)</option><option value="16:9">16:9 (Landscape)</option><option value="9:16">9:16 (Portrait)</option><option value="4:3">4:3 (Standard)</option><option value="3:4">3:4 (Portrait)</option><option value="21:9">21:9 (Ultrawide)</option><option value="3:2">3:2 (Classic 35mm)</option><option value="2:3">2:3 (Portrait 35mm)</option><option value="5:4">5:4 (Medium Format)</option><option value="4:5">4:5 (Portrait Medium)</option></select></div>
                                <div>
                                    <span className="text-xs text-[var(--text-secondary)] mb-1 block">Resolution</span>
                                    {(settings.model === 'black-forest-labs/flux-2-flex' || settings.model === 'black-forest-labs/flux-2-max') ? (
                                        <select
                                            value={settings.imageSize}
                                            onChange={(e) => setSettings({ ...settings, imageSize: e.target.value as ImageSize })}
                                            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-sm"
                                        >
                                            <option value="match_input_image">Match Input Image</option>
                                            <option value="0.5 MP">0.5 MP</option>
                                            <option value="1 MP">1 MP</option>
                                            <option value="2 MP">2 MP</option>
                                            <option value="4 MP">4 MP</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={settings.imageSize}
                                            onChange={(e) => setSettings({ ...settings, imageSize: e.target.value as ImageSize })}
                                            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-sm"
                                        >
                                            {['1K', '2K', '4K'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Reference Images</label><span className="text-[10px] text-[var(--text-muted)]">{settings.referenceImages.length}/4</span></div>
                                <div className="grid grid-cols-4 gap-2">
                                    {settings.referenceImages.map((img, idx) => (<div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-[var(--border-color)] bg-[var(--bg-input)]"><img src={img} alt="Ref" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" /><button onClick={() => handleRemoveReferenceImage(idx)} className="absolute top-1 right-1 bg-black/70 hover:bg-red-500/80 p-1 rounded-full text-white backdrop-blur-sm transition" title="Remove"><XMarkIcon className="w-3 h-3" /></button></div>))}
                                    {settings.referenceImages.length < 4 && (
                                        <>
                                            <button
                                                onClick={handleUseLastRender}
                                                disabled={generatedImages.length === 0}
                                                className="aspect-square rounded-lg border border-dashed border-[var(--border-color)] hover:border-indigo-500/50 hover:bg-[var(--bg-hover)] transition cursor-pointer flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-indigo-400 group disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-muted)]"
                                                title={generatedImages.length === 0 ? "No images generated yet" : "Use last generated image"}
                                            >
                                                <ArrowDownTrayIcon className="w-5 h-5 mb-1 group-hover:scale-110 transition" />
                                                <span className="text-[9px]">Use Last</span>
                                            </button>
                                            <label className="aspect-square rounded-lg border border-dashed border-[var(--border-color)] hover:border-green-500/50 hover:bg-[var(--bg-hover)] transition cursor-pointer flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-green-400 group"><PlusIcon className="w-5 h-5 mb-1 group-hover:scale-110 transition" /><span className="text-[9px]">Add Image</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} /></label>
                                        </>
                                    )}
                                </div>
                            </div>

                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Cinematography</label>
                            <div className="grid grid-cols-1 gap-3">
                                <CameraControls settings={settings.cameraControls} onChange={(newCam) => setSettings({ ...settings, cameraControls: newCam })} />
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={settings.lighting} onChange={(e) => setSettings({ ...settings, lighting: e.target.value })} disabled={settings.relight?.enabled} className={`w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-sm ${settings.relight?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}><option disabled>Select Lighting</option>{LIGHTING_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}</select>
                                    <select value={settings.mood} onChange={(e) => setSettings({ ...settings, mood: e.target.value })} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-2.5 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-sm"><option disabled>Select Mood</option>{MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                                </div>
                                {settings.relight?.enabled && (<button onClick={() => toggleSidebar('relight')} className="w-full p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-amber-500/20 transition"><LightBulbIcon className="w-4 h-4" /> Relight Active (Modify in Sidebar)</button>)}
                                <div className="bg-[var(--bg-input)] rounded-xl p-3 border border-[var(--border-color)]">
                                    <div className="flex justify-between items-center mb-2"><span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1.5"><PaintBrushIcon className="w-3 h-3" />Digital Intermediate (DI)</span></div>
                                    <div className="space-y-2"><select value={settings.diWorkflow} onChange={(e) => setSettings({ ...settings, diWorkflow: e.target.value })} className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-xs">{DI_WORKFLOW_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select><input type="text" value={settings.customColorGrading} onChange={(e) => setSettings({ ...settings, customColorGrading: e.target.value })} placeholder="Custom LUT / Color Hex / Preset..." className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-color)] outline-none focus:border-green-500 text-xs placeholder-[var(--text-muted)]" /></div>
                                </div>
                                <div className={`bg-[var(--bg-input)] rounded-xl p-3 border border-[var(--border-color)] ${hasCustomCamera ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <div className="flex justify-between items-center mb-2"><span className="text-xs text-[var(--text-secondary)] font-medium">Camera Shot / Angle (Multi-Select)</span>{!isMergeMode && isPresetComboMode && activeSidebar === 'none' && !hasCustomCamera && (<span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full animate-pulse">Preset Combo (6 Shots)</span>)}</div>
                                    <div className="flex flex-wrap gap-2 mb-3">{ANGLE_OPTIONS.map(angle => { const isSelected = settings.cameraAngles.includes(angle); return (<button key={angle} onClick={() => toggleAngle(angle)} className={`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 ${isSelected ? 'bg-green-500/10 text-green-400 border-green-500/50 shadow-sm shadow-green-500/10' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]'}`}>{isSelected && <CheckCircleIcon className="w-3 h-3" />}{angle}</button>); })}</div>
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-color)]">
                                        <button onClick={() => togglePreset(FRAMING_OPTIONS)} className={`p-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${isFramingAllSelected ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow shadow-indigo-500/10' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)]'}`}><VideoCameraIcon className="w-4 h-4" /> By Distance/Framing</button>
                                        <button onClick={() => togglePreset(CAMERA_ANGLE_OPTIONS)} className={`p-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${isAngleAllSelected ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow shadow-purple-500/10' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)]'}`}><EyeIcon className="w-4 h-4" /> By Angle</button>
                                    </div>
                                    <button onClick={() => setIsMergeMode(!isMergeMode)} disabled={activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0} className={`w-full mt-2 p-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${isMergeMode ? 'bg-teal-600 text-white border-teal-500 shadow-lg shadow-teal-500/20' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)]'} ${activeSidebar === 'story' && storyFlow.detectedPrompts.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}><LinkIcon className="w-4 h-4" />{isMergeMode ? 'Combined Mode Active (Single Image)' : 'Activate Combined Mode'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`w-10 flex-none z-30 bg-[var(--bg-main)] border-l border-[var(--border-color)] flex flex-col items-center py-2 gap-2 h-full ${showSettings ? 'hidden' : ''}`}>
                <button onClick={() => toggleSidebar('settings')} className={`mt-28 p-1 rounded-lg transition-all relative group ${showSettings ? 'text-cyan-400 bg-[var(--bg-hover)]' : 'text-[var(--text-secondary)] hover:text-cyan-300'}`} title="Studio Settings">
                    <div className="[writing-mode:vertical-rl] font-bold text-[10px] tracking-widest uppercase whitespace-nowrap h-24 flex items-center justify-center">Studio Settings</div>
                    {showSettings && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-cyan-500 rounded-r"></div>}
                </button>
            </div>
        </div >
    );
};

export default StudioPanel;
