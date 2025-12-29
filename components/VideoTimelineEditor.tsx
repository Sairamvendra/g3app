import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    PlayIcon,
    PauseIcon,
    BackwardIcon,
    ForwardIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ScissorsIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    ShareIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/solid';
import {
    TimelineSegment,
    AudioTrack,
    ExportSettings,
    SceneHealth,
    TimelineState,
    DEFAULT_TIMELINE_STATE,
    VideoResolution,
    VideoFormat,
} from '../types';

interface VideoTimelineEditorProps {
    talkingHeadVideoUrl: string | null;
    audioUrl: string | null;
    brollSegments: Array<{ id: string; url: string | undefined; prompt: string; durationMs: number }>;
    onExport: (settings: ExportSettings) => void;
    onRegenerate?: (segmentId: string) => void;
}

// Helper to format time as MM:SS:FF (minutes:seconds:frames)
const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frames = Math.floor((ms % 1000) / (1000 / 30)); // 30fps
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};

// Generate fake waveform data for visualization
const generateWaveformData = (samples: number = 100): number[] => {
    return Array.from({ length: samples }, () => 0.2 + Math.random() * 0.6);
};

const VideoTimelineEditor: React.FC<VideoTimelineEditorProps> = ({
    talkingHeadVideoUrl,
    audioUrl,
    brollSegments,
    onExport,
    onRegenerate,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [timeline, setTimeline] = useState<TimelineState>(() => {
        // Build initial timeline from props
        const segments: TimelineSegment[] = [];
        let currentTime = 0;

        // Add talking head as main segment
        if (talkingHeadVideoUrl) {
            segments.push({
                id: 'talking-head',
                type: 'talking-head',
                label: 'Main Video',
                startMs: currentTime,
                durationMs: 30000, // Placeholder, will be updated on video load
                videoUrl: talkingHeadVideoUrl,
            });
            currentTime += 30000;
        }

        // Add b-roll segments
        brollSegments.forEach((broll, index) => {
            if (broll.url) {
                segments.push({
                    id: broll.id,
                    type: 'broll',
                    label: broll.prompt.length > 20 ? broll.prompt.substring(0, 20) + '...' : broll.prompt,
                    startMs: currentTime,
                    durationMs: broll.durationMs || 4000,
                    videoUrl: broll.url,
                });
                currentTime += broll.durationMs || 4000;
            }
        });

        // Build audio track
        const audioTracks: AudioTrack[] = [];
        if (audioUrl) {
            audioTracks.push({
                id: 'main-audio',
                label: 'Voiceover',
                startMs: 0,
                durationMs: currentTime,
                audioUrl: audioUrl,
                waveformData: generateWaveformData(150),
                volume: 1,
                muted: false,
            });
        }

        // Calculate scene health
        const sceneHealth: SceneHealth = {
            avatarAudioSync: talkingHeadVideoUrl && audioUrl ? 'good' : 'warning',
            brollTransitions: brollSegments.map((broll) => ({
                segmentId: broll.id,
                status: broll.url ? 'good' : 'warning',
                message: broll.url ? undefined : 'B-roll not generated',
            })),
        };

        return {
            ...DEFAULT_TIMELINE_STATE,
            segments,
            audioTracks,
            totalDurationMs: currentTime || 30000,
            sceneHealth,
        };
    });

    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Update video time display
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setTimeline((prev) => ({
                ...prev,
                currentTimeMs: video.currentTime * 1000,
            }));
        };

        const handleLoadedMetadata = () => {
            setTimeline((prev) => {
                const newSegments = prev.segments.map((seg) =>
                    seg.id === 'talking-head' ? { ...seg, durationMs: video.duration * 1000 } : seg
                );
                const totalDuration = newSegments.reduce((sum, seg) => sum + seg.durationMs, 0);
                return {
                    ...prev,
                    segments: newSegments,
                    totalDurationMs: totalDuration,
                };
            });
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, []);

    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (timeline.isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setTimeline((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const newTime = parseFloat(e.target.value);
        video.currentTime = newTime / 1000;
        setTimeline((prev) => ({ ...prev, currentTimeMs: newTime }));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSpeedChange = () => {
        const speeds = [0.5, 1, 1.5, 2];
        const currentIndex = speeds.indexOf(timeline.playbackSpeed);
        const newSpeed = speeds[(currentIndex + 1) % speeds.length];
        if (videoRef.current) {
            videoRef.current.playbackRate = newSpeed;
        }
        setTimeline((prev) => ({ ...prev, playbackSpeed: newSpeed }));
    };

    const handleSegmentClick = (segmentId: string) => {
        setTimeline((prev) => ({ ...prev, selectedSegmentId: segmentId }));
    };

    const handleExportClick = () => {
        onExport(timeline.exportSettings);
    };

    const updateExportSettings = (updates: Partial<ExportSettings>) => {
        setTimeline((prev) => ({
            ...prev,
            exportSettings: { ...prev.exportSettings, ...updates },
        }));
    };

    // Calculate estimated file size
    const estimatedSize = () => {
        const durationMin = timeline.totalDurationMs / 60000;
        const baseMbPerMin = timeline.exportSettings.resolution === '4K' ? 200 : timeline.exportSettings.resolution === '1080p' ? 50 : 25;
        return Math.round(durationMin * baseMbPerMin);
    };

    return (
        <div className="h-full flex gap-4">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Video Preview */}
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
                    {talkingHeadVideoUrl ? (
                        <video
                            ref={videoRef}
                            src={talkingHeadVideoUrl}
                            className="w-full h-full object-contain"
                            onClick={handlePlayPause}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[var(--text-secondary)]">No video available</span>
                        </div>
                    )}

                    {/* Play overlay */}
                    {!timeline.isPlaying && talkingHeadVideoUrl && (
                        <button
                            onClick={handlePlayPause}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                        >
                            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                                <PlayIcon className="w-8 h-8 text-white ml-1" />
                            </div>
                        </button>
                    )}

                    {/* Hold to Compare */}
                    <button className="absolute bottom-4 right-4 px-3 py-1.5 bg-[var(--bg-card)]/80 text-xs text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card)]">
                        HOLD TO COMPARE
                    </button>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-card)] rounded-xl mb-4">
                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }} className="p-1.5 text-[var(--text-secondary)] hover:text-white">
                        <BackwardIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handlePlayPause} className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600">
                        {timeline.isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }} className="p-1.5 text-[var(--text-secondary)] hover:text-white">
                        <ForwardIcon className="w-5 h-5" />
                    </button>

                    <span className="text-rose-400 font-mono text-sm">{formatTime(timeline.currentTimeMs)}</span>
                    <span className="text-[var(--text-secondary)]">/</span>
                    <span className="text-[var(--text-secondary)] font-mono text-sm">{formatTime(timeline.totalDurationMs)}</span>

                    {/* Scrubber */}
                    <input
                        type="range"
                        min="0"
                        max={timeline.totalDurationMs}
                        value={timeline.currentTimeMs}
                        onChange={handleSeek}
                        className="flex-1 h-1 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-blue-500"
                    />

                    {/* Volume */}
                    <button onClick={toggleMute} className="p-1.5 text-[var(--text-secondary)] hover:text-white">
                        {isMuted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-blue-500"
                    />

                    {/* Speed */}
                    <button onClick={handleSpeedChange} className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-main)] rounded hover:text-white">
                        {timeline.playbackSpeed}x
                    </button>
                </div>

                {/* Timeline Toolbar */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] rounded-t-xl border-b border-[var(--border-color)]">
                    <button className="p-1.5 text-[var(--text-secondary)] hover:text-white" title="Split">
                        <ScissorsIcon className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-[var(--text-secondary)] hover:text-white" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="flex-1" />
                    <input
                        type="range"
                        min="50"
                        max="200"
                        defaultValue="100"
                        className="w-24 h-1 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-rose-500"
                        title="Zoom"
                    />
                </div>

                {/* Video Segments Track */}
                <div className="bg-[var(--bg-card)] px-3 py-2 border-b border-[var(--border-color)]">
                    <div className="relative h-16 overflow-x-auto">
                        {/* Time markers */}
                        <div className="absolute top-0 left-0 right-0 h-4 flex text-[10px] text-[var(--text-secondary)]">
                            {Array.from({ length: Math.ceil(timeline.totalDurationMs / 15000) + 1 }).map((_, i) => (
                                <span key={i} style={{ position: 'absolute', left: `${(i * 15000 / timeline.totalDurationMs) * 100}%` }}>
                                    {formatTime(i * 15000).substring(0, 5)}
                                </span>
                            ))}
                        </div>

                        {/* Playhead */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                            style={{ left: `${(timeline.currentTimeMs / timeline.totalDurationMs) * 100}%` }}
                        >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-500 rotate-45" />
                        </div>

                        {/* Segments */}
                        <div className="absolute top-5 left-0 right-0 h-10 flex gap-1">
                            {timeline.segments.map((segment) => (
                                <div
                                    key={segment.id}
                                    onClick={() => handleSegmentClick(segment.id)}
                                    style={{ width: `${(segment.durationMs / timeline.totalDurationMs) * 100}%` }}
                                    className={`h-full rounded-lg cursor-pointer flex items-center justify-center text-xs font-medium px-2 truncate transition-all ${segment.type === 'talking-head'
                                            ? 'bg-gradient-to-r from-slate-600 to-slate-700'
                                            : segment.type === 'broll'
                                                ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                        } ${timeline.selectedSegmentId === segment.id ? 'ring-2 ring-rose-500' : ''}`}
                                >
                                    {segment.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Audio Waveform Track */}
                <div className="bg-[var(--bg-card)] px-3 py-2 rounded-b-xl">
                    <div className="relative h-10 flex items-center gap-0.5">
                        {timeline.audioTracks[0]?.waveformData.map((amplitude, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-[var(--text-secondary)]/40 rounded-sm"
                                style={{ height: `${amplitude * 100}%` }}
                            />
                        ))}
                        {timeline.audioTracks.length === 0 && (
                            <span className="text-xs text-[var(--text-secondary)]">No audio track</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Export Settings */}
            <div className="w-72 flex-none flex flex-col gap-4">
                <div className="bg-[var(--bg-card)] rounded-xl p-4 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">Final Review</h2>
                        <p className="text-xs text-[var(--text-secondary)]">Configure your export settings before finalizing.</p>
                    </div>

                    {/* Export Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="text-base">⚙️</span> EXPORT SETTINGS
                        </h3>

                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Resolution</label>
                            <select
                                value={timeline.exportSettings.resolution}
                                onChange={(e) => updateExportSettings({ resolution: e.target.value as VideoResolution })}
                                className="w-full p-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                                <option value="720p">720p (HD)</option>
                                <option value="1080p">1080p (Full HD)</option>
                                <option value="4K">4K (Ultra HD)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Format</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateExportSettings({ format: 'mp4' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${timeline.exportSettings.format === 'mp4'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                                        }`}
                                >
                                    MP4
                                </button>
                                <button
                                    onClick={() => updateExportSettings({ format: 'mov' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${timeline.exportSettings.format === 'mov'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-[var(--bg-main)] text-[var(--text-secondary)]'
                                        }`}
                                >
                                    MOV
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm">Burn-in Captions</label>
                            <button
                                onClick={() => updateExportSettings({ burnInCaptions: !timeline.exportSettings.burnInCaptions })}
                                className={`w-10 h-5 rounded-full transition-colors ${timeline.exportSettings.burnInCaptions ? 'bg-blue-500' : 'bg-[var(--border-color)]'
                                    }`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${timeline.exportSettings.burnInCaptions ? 'translate-x-5' : 'translate-x-0.5'
                                    }`} />
                            </button>
                        </div>
                    </div>

                    {/* Scene Health */}
                    <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="text-base">🎬</span> SCENE HEALTH
                        </h3>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {timeline.sceneHealth.avatarAudioSync === 'good' ? (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                )}
                                <span className="text-sm">Avatar Audio Sync</span>
                            </div>
                            {timeline.sceneHealth.avatarAudioSync === 'good' ? (
                                <span className="text-xs text-emerald-400">Perfectly aligned</span>
                            ) : (
                                <span className="text-xs text-amber-400">Check alignment</span>
                            )}
                        </div>

                        {timeline.sceneHealth.brollTransitions.map((transition, i) => (
                            <div key={transition.segmentId} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {transition.status === 'good' ? (
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    )}
                                    <span className="text-sm">B-Roll Transition {i + 1}</span>
                                </div>
                                {transition.status === 'warning' && onRegenerate && (
                                    <button
                                        onClick={() => onRegenerate(transition.segmentId)}
                                        className="text-xs text-rose-400 hover:text-rose-300"
                                    >
                                        REGENERATE
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Project Info */}
                    <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                            <span className="text-base">ℹ️</span> PROJECT INFO
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[var(--bg-main)] rounded-lg text-center">
                                <p className="text-xs text-[var(--text-secondary)]">Duration</p>
                                <p className="text-sm font-medium">{formatTime(timeline.totalDurationMs).substring(0, 5)}</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-main)] rounded-lg text-center">
                                <p className="text-xs text-[var(--text-secondary)]">Size Est.</p>
                                <p className="text-sm font-medium">~{estimatedSize()}MB</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <button
                    onClick={handleExportClick}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export Video
                </button>
                <button className="w-full py-3 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-xl font-medium flex items-center justify-center gap-2 hover:text-white transition-colors">
                    <ShareIcon className="w-5 h-5" />
                    Share Draft
                </button>
            </div>
        </div>
    );
};

export default VideoTimelineEditor;
