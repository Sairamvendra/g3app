import React, { useState, useEffect } from 'react';
import {
    SparklesIcon,
    DocumentTextIcon,
    SpeakerWaveIcon,
    VideoCameraIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    PlayIcon,
    ExclamationTriangleIcon,
    UserIcon,
    FilmIcon,
    PencilIcon,
    PlusIcon,
} from '@heroicons/react/24/solid';
import {
    InfluencerState,
    BRollMarker,
    INFLUENCER_VOICES,
    INFLUENCER_EMOTIONS,
    DEFAULT_INFLUENCER_STATE,
    InfluencerEmotion,
} from '../types';

const API_BASE = 'http://localhost:3002';

// Step indicator component
const StepIndicator: React.FC<{ currentStep: number; stepNumber: number; label: string; icon: React.ReactNode }> = ({
    currentStep,
    stepNumber,
    label,
    icon,
}) => {
    const isActive = currentStep === stepNumber;
    const isComplete = currentStep > stepNumber;

    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isComplete
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                    : isActive
                        ? 'bg-rose-500/20 text-rose-400 border-2 border-rose-500'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-2 border-[var(--border-color)]'
                    }`}
            >
                {isComplete ? <CheckCircleIcon className="w-5 h-5" /> : icon}
            </div>
            <span
                className={`text-[10px] font-medium ${isActive ? 'text-rose-400' : isComplete ? 'text-emerald-400' : 'text-[var(--text-secondary)]'
                    }`}
            >
                {label}
            </span>
        </div>
    );
};

// Progress connector between steps
const StepConnector: React.FC<{ isComplete: boolean }> = ({ isComplete }) => (
    <div
        className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-[var(--border-color)]'
            }`}
    />
);

const InfluencerContent: React.FC = () => {
    const [state, setState] = useState<InfluencerState>(DEFAULT_INFLUENCER_STATE);
    const [showCustomAvatar, setShowCustomAvatar] = useState(false);

    // Auto-generate avatars when entering step 3
    useEffect(() => {
        if (state.currentStep === 3 && state.generatedAvatarUrls.length === 0 && !state.isProcessing && state.generatedAudio) {
            handleGenerateAvatars();
        }
    }, [state.currentStep]);

    // API call handlers
    const handleRefineScript = async () => {
        if (!state.rawScript.trim()) return;

        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Refining script with AI...', error: null }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/refine-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawScript: state.rawScript, style: 'professional' }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                refinedScript: data.refinedScript,
                brollMarkers: data.brollMarkers,
                currentStep: 2,
                isProcessing: false,
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to refine script',
            }));
        }
    };

    const handleGenerateAudio = async () => {
        if (!state.refinedScript.trim()) return;

        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Generating voiceover...', error: null }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/generate-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: state.refinedScript,
                    voiceId: state.selectedVoiceId,
                    emotion: state.selectedEmotion,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                generatedAudio: { url: data.audioUrl, durationMs: data.durationMs || 0 },
                currentStep: 3,
                isProcessing: false,
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to generate audio',
            }));
        }
    };

    const handleGenerateAvatars = async () => {
        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Generating 3 avatar options...', error: null }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/generate-avatar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refinedScript: state.refinedScript,
                    voiceId: state.selectedVoiceId,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                generatedAvatarUrls: data.avatarUrls || [],
                avatarPrompts: data.prompts || [],
                selectedAvatarIndex: 0,
                isProcessing: false,
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to generate avatars',
            }));
        }
    };

    const handleCreateCustomAvatar = async () => {
        if (!state.customAvatarPrompt.trim()) return;

        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Creating custom avatar...', error: null }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/generate-avatar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customPrompt: state.customAvatarPrompt,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            // Add to existing avatars
            setState((prev) => ({
                ...prev,
                generatedAvatarUrls: [...prev.generatedAvatarUrls, ...(data.avatarUrls || [])],
                avatarPrompts: [...prev.avatarPrompts, state.customAvatarPrompt],
                selectedAvatarIndex: prev.generatedAvatarUrls.length, // Select the new one
                customAvatarPrompt: '',
                isProcessing: false,
                processingMessage: '',
            }));
            setShowCustomAvatar(false);
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to create custom avatar',
            }));
        }
    };

    const handleGenerateTalkingHead = async () => {
        const selectedAvatarUrl = state.generatedAvatarUrls[state.selectedAvatarIndex];
        if (!selectedAvatarUrl || !state.generatedAudio?.url) return;

        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Generating talking head video... This may take 2-5 minutes.', error: null }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/generate-talking-head`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: selectedAvatarUrl,
                    audioUrl: state.generatedAudio.url,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                talkingHeadVideoUrl: data.videoUrl,
                isProcessing: false,
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to generate talking head video',
            }));
        }
    };

    const handleGenerateBRoll = async (marker: BRollMarker) => {
        setState((prev) => ({
            ...prev,
            brollMarkers: prev.brollMarkers.map((m) =>
                m.id === marker.id ? { ...m, status: 'generating' as const } : m
            ),
            processingMessage: `Generating B-roll: ${marker.prompt}`,
        }));

        try {
            const response = await fetch(`${API_BASE}/api/influencer/generate-broll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: marker.prompt, duration: 4, aspectRatio: '9:16' }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                brollMarkers: prev.brollMarkers.map((m) =>
                    m.id === marker.id ? { ...m, videoUrl: data.videoUrl, status: 'complete' as const } : m
                ),
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                brollMarkers: prev.brollMarkers.map((m) =>
                    m.id === marker.id ? { ...m, status: 'error' as const } : m
                ),
                processingMessage: '',
                error: error.message || 'Failed to generate B-roll',
            }));
        }
    };

    const handleStitchVideo = async () => {
        if (!state.talkingHeadVideoUrl) return;

        setState((prev) => ({ ...prev, isProcessing: true, processingMessage: 'Stitching final video...', error: null }));

        try {
            const brollSegments = state.brollMarkers
                .filter((m) => m.status === 'complete' && m.videoUrl)
                .map((m, index) => ({
                    url: m.videoUrl,
                    insertAtMs: index * 10000,
                    durationMs: 4000,
                }));

            const response = await fetch(`${API_BASE}/api/influencer/stitch-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talkingHeadUrl: state.talkingHeadVideoUrl,
                    brollSegments,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setState((prev) => ({
                ...prev,
                finalStitchedVideoUrl: data.finalVideoUrl,
                currentStep: 5,
                isProcessing: false,
                processingMessage: '',
            }));
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isProcessing: false,
                processingMessage: '',
                error: error.message || 'Failed to stitch video',
            }));
        }
    };

    const goToStep = (step: 1 | 2 | 3 | 4 | 5) => {
        setState((prev) => ({ ...prev, currentStep: step }));
    };

    const allBRollComplete = state.brollMarkers.length === 0 || state.brollMarkers.every((m) => m.status === 'complete');
    const selectedAvatarUrl = state.generatedAvatarUrls[state.selectedAvatarIndex];

    return (
        <div className="h-full flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex-none p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-500/10 rounded-lg">
                        <VideoCameraIcon className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">Influencer Content</h1>
                        <p className="text-xs text-[var(--text-secondary)]">AI-powered video creation</p>
                    </div>
                </div>

                {/* 5-Step Progress */}
                <div className="flex items-center justify-between">
                    <StepIndicator currentStep={state.currentStep} stepNumber={1} label="Script" icon={<DocumentTextIcon className="w-4 h-4" />} />
                    <StepConnector isComplete={state.currentStep > 1} />
                    <StepIndicator currentStep={state.currentStep} stepNumber={2} label="Voice" icon={<SpeakerWaveIcon className="w-4 h-4" />} />
                    <StepConnector isComplete={state.currentStep > 2} />
                    <StepIndicator currentStep={state.currentStep} stepNumber={3} label="Avatar" icon={<UserIcon className="w-4 h-4" />} />
                    <StepConnector isComplete={state.currentStep > 3} />
                    <StepIndicator currentStep={state.currentStep} stepNumber={4} label="Video" icon={<FilmIcon className="w-4 h-4" />} />
                    <StepConnector isComplete={state.currentStep > 4} />
                    <StepIndicator currentStep={state.currentStep} stepNumber={5} label="Export" icon={<PlayIcon className="w-4 h-4" />} />
                </div>
            </div>

            {/* Error Banner */}
            {state.error && (
                <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-none" />
                    <span className="text-sm text-red-400">{state.error}</span>
                    <button onClick={() => setState((prev) => ({ ...prev, error: null }))} className="ml-auto text-red-400 hover:text-red-300">×</button>
                </div>
            )}

            {/* Processing Indicator */}
            {state.isProcessing && (
                <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-rose-400">{state.processingMessage}</span>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Step 1: Script Input */}
                {state.currentStep === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Enter Your Script</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Paste your video script. AI will refine it and identify B-roll opportunities.
                        </p>
                        <textarea
                            value={state.rawScript}
                            onChange={(e) => setState((prev) => ({ ...prev, rawScript: e.target.value }))}
                            placeholder="Enter your script here..."
                            className="w-full h-48 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleRefineScript}
                                disabled={!state.rawScript.trim() || state.isProcessing}
                                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Refine Script
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Script Refinement + Voice Selection */}
                {state.currentStep === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Refined Script & Voice</h2>
                            <button onClick={() => goToStep(1)} className="text-sm text-[var(--text-secondary)] hover:text-rose-400 flex items-center gap-1">
                                <ArrowLeftIcon className="w-4 h-4" /> Back
                            </button>
                        </div>

                        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl max-h-40 overflow-y-auto">
                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{state.refinedScript}</p>
                        </div>

                        {/* B-Roll Markers */}
                        {state.brollMarkers.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)]">B-Roll Segments ({state.brollMarkers.length})</h3>
                                <div className="grid gap-2">
                                    {state.brollMarkers.map((marker, index) => (
                                        <div key={marker.id} className="p-2 bg-[var(--bg-card)] border border-rose-500/30 rounded-lg flex items-center gap-2">
                                            <div className="w-6 h-6 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-400 text-xs font-bold">{index + 1}</div>
                                            <span className="text-xs text-[var(--text-primary)] truncate flex-1">{marker.prompt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Voice Selection */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Voice</label>
                                <select
                                    value={state.selectedVoiceId}
                                    onChange={(e) => setState((prev) => ({ ...prev, selectedVoiceId: e.target.value }))}
                                    className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500"
                                >
                                    {INFLUENCER_VOICES.map((voice) => (
                                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Emotion</label>
                                <select
                                    value={state.selectedEmotion}
                                    onChange={(e) => setState((prev) => ({ ...prev, selectedEmotion: e.target.value as InfluencerEmotion }))}
                                    className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500"
                                >
                                    {INFLUENCER_EMOTIONS.map((emotion) => (
                                        <option key={emotion} value={emotion}>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerateAudio}
                                disabled={state.isProcessing}
                                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <SpeakerWaveIcon className="w-4 h-4" />
                                Generate Voiceover
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Avatar Selection (Auto-generated) */}
                {state.currentStep === 3 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Select Avatar</h2>
                            <button onClick={() => goToStep(2)} className="text-sm text-[var(--text-secondary)] hover:text-rose-400 flex items-center gap-1">
                                <ArrowLeftIcon className="w-4 h-4" /> Back
                            </button>
                        </div>

                        {/* Audio Preview */}
                        {state.generatedAudio && (
                            <div className="p-3 bg-[var(--bg-card)] border border-emerald-500/30 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                    <span className="text-sm font-medium text-emerald-400">Voiceover Ready</span>
                                </div>
                                <audio controls className="w-full h-8" src={state.generatedAudio.url}>Your browser does not support audio.</audio>
                            </div>
                        )}

                        {/* Avatar Grid */}
                        {state.generatedAvatarUrls.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-sm text-[var(--text-secondary)]">AI generated 3 avatar options based on your script and voice. Select one or create your own.</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {state.generatedAvatarUrls.map((url, index) => (
                                        <div
                                            key={index}
                                            onClick={() => setState((prev) => ({ ...prev, selectedAvatarIndex: index }))}
                                            className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${state.selectedAvatarIndex === index
                                                ? 'border-rose-500 ring-2 ring-rose-500/30'
                                                : 'border-[var(--border-color)] hover:border-rose-500/50'
                                                }`}
                                        >
                                            <img src={url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                                            {state.selectedAvatarIndex === index && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                                                    <CheckCircleIcon className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Custom Avatar Option */}
                        {!showCustomAvatar ? (
                            <button
                                onClick={() => setShowCustomAvatar(true)}
                                className="w-full p-3 border-2 border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:border-rose-500/50 hover:text-rose-400 flex items-center justify-center gap-2 transition-all"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create Custom Avatar
                            </button>
                        ) : (
                            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4 text-rose-400" />
                                        Custom Avatar
                                    </h3>
                                    <button onClick={() => setShowCustomAvatar(false)} className="text-[var(--text-secondary)] hover:text-rose-400">×</button>
                                </div>
                                <textarea
                                    value={state.customAvatarPrompt}
                                    onChange={(e) => setState((prev) => ({ ...prev, customAvatarPrompt: e.target.value }))}
                                    placeholder="Describe your avatar... e.g., 'Young Asian woman with short hair, wearing a blue blazer, warm smile'"
                                    className="w-full h-20 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                                <button
                                    onClick={handleCreateCustomAvatar}
                                    disabled={!state.customAvatarPrompt.trim() || state.isProcessing}
                                    className="w-full px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg font-medium hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Generate Custom Avatar
                                </button>
                            </div>
                        )}

                        {/* Regenerate Button */}
                        {state.generatedAvatarUrls.length > 0 && (
                            <button
                                onClick={handleGenerateAvatars}
                                disabled={state.isProcessing}
                                className="w-full px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-50 transition-all"
                            >
                                <SparklesIcon className="w-4 h-4 inline mr-2" />
                                Regenerate All Avatars
                            </button>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={() => goToStep(4)}
                                disabled={state.generatedAvatarUrls.length === 0}
                                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Next: Create Video
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Talking Head + B-Roll Generation */}
                {state.currentStep === 4 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Generate Videos</h2>
                            <button onClick={() => goToStep(3)} className="text-sm text-[var(--text-secondary)] hover:text-rose-400 flex items-center gap-1">
                                <ArrowLeftIcon className="w-4 h-4" /> Back
                            </button>
                        </div>

                        {/* Talking Head Section */}
                        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <FilmIcon className="w-4 h-4 text-rose-400" />
                                Talking Head Video
                            </h3>

                            {/* Preview: Avatar + Audio */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="aspect-[9/16] bg-[var(--bg-main)] rounded-lg overflow-hidden">
                                    {selectedAvatarUrl && (
                                        <img src={selectedAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <p className="text-xs text-[var(--text-secondary)] mb-2">Avatar + Audio → Talking Head</p>
                                    {state.generatedAudio && (
                                        <audio controls className="w-full h-8" src={state.generatedAudio.url} />
                                    )}
                                </div>
                            </div>

                            {state.talkingHeadVideoUrl ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm text-emerald-400">Talking Head Ready</span>
                                    </div>
                                    <video controls className="w-full rounded-lg" src={state.talkingHeadVideoUrl}>Your browser does not support video.</video>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateTalkingHead}
                                    disabled={state.isProcessing}
                                    className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <FilmIcon className="w-4 h-4" />
                                    Generate Talking Head Video
                                </button>
                            )}
                        </div>

                        {/* B-Roll Generation */}
                        {state.brollMarkers.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">B-Roll Videos</h3>
                                <div className="grid gap-2">
                                    {state.brollMarkers.map((marker, index) => (
                                        <div
                                            key={marker.id}
                                            className={`p-3 bg-[var(--bg-card)] border rounded-xl ${marker.status === 'complete' ? 'border-emerald-500/30' : marker.status === 'generating' ? 'border-amber-500/30' : 'border-[var(--border-color)]'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-400 text-xs font-bold">{index + 1}</div>
                                                    <span className="text-xs text-[var(--text-primary)] truncate">{marker.prompt}</span>
                                                </div>
                                                {marker.status === 'pending' && (
                                                    <button onClick={() => handleGenerateBRoll(marker)} className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded text-xs hover:bg-rose-500/30">Generate</button>
                                                )}
                                                {marker.status === 'generating' && (
                                                    <div className="flex items-center gap-1 text-amber-400 text-xs">
                                                        <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                                        Processing
                                                    </div>
                                                )}
                                                {marker.status === 'complete' && <CheckCircleIcon className="w-4 h-4 text-emerald-400" />}
                                            </div>
                                            {marker.videoUrl && (
                                                <video controls className="w-full rounded-lg" src={marker.videoUrl}>Your browser does not support video.</video>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={handleStitchVideo}
                                disabled={!state.talkingHeadVideoUrl || !allBRollComplete || state.isProcessing}
                                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center gap-2 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <PlayIcon className="w-4 h-4" />
                                Stitch & Preview
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Stitch & Export */}
                {state.currentStep === 5 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Final Video</h2>
                            <button onClick={() => goToStep(4)} className="text-sm text-[var(--text-secondary)] hover:text-rose-400 flex items-center gap-1">
                                <ArrowLeftIcon className="w-4 h-4" /> Back
                            </button>
                        </div>

                        <div className="p-4 bg-[var(--bg-card)] border border-emerald-500/30 rounded-xl text-center">
                            <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <h3 className="text-lg font-bold mb-2">Video Complete!</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">Your talking head video is ready for export.</p>

                            {state.finalStitchedVideoUrl && (
                                <video controls className="w-full rounded-lg mb-4" src={state.finalStitchedVideoUrl}>Your browser does not support video.</video>
                            )}

                            {/* Asset Summary */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="p-3 bg-[var(--bg-main)] rounded-lg text-center">
                                    <SpeakerWaveIcon className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                                    <p className="text-xs text-[var(--text-secondary)]">Voiceover</p>
                                </div>
                                <div className="p-3 bg-[var(--bg-main)] rounded-lg text-center">
                                    <UserIcon className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                                    <p className="text-xs text-[var(--text-secondary)]">Avatar</p>
                                </div>
                                <div className="p-3 bg-[var(--bg-main)] rounded-lg text-center">
                                    <VideoCameraIcon className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                                    <p className="text-xs text-[var(--text-secondary)]">{state.brollMarkers.length} B-Roll</p>
                                </div>
                            </div>

                            <a
                                href={state.finalStitchedVideoUrl || '#'}
                                download="influencer-video.mp4"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all"
                            >
                                Download Video
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfluencerContent;
