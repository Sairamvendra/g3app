import React, { useState, useRef, useEffect } from 'react';
import { ThumbnailState, CanvasElement } from '../types';
import * as replicateService from '../services/replicateService';
import { ArrowDownTrayIcon, SparklesIcon, TrashIcon, SwatchIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, StopIcon, RectangleStackIcon } from '@heroicons/react/24/outline';

const LOGO_STYLES = [
    'Minimal/Clean',
    'Bold/Cinematic',
    'Vintage/Retro',
    'Playful/Cartoon',
    'Elegant/Luxury'
];



const ASPECT_RATIOS = [
    { label: '16:9', desc: 'Landscape', icon: ComputerDesktopIcon, value: '16:9' },
    { label: '9:16', desc: 'Portrait', icon: DevicePhoneMobileIcon, value: '9:16' },
    { label: '1:1', desc: 'Square', icon: StopIcon, value: '1:1' },
    { label: '4:3', desc: 'Standard', icon: RectangleStackIcon, value: '4:3' },
    { label: '3:4', desc: 'Vertical', icon: RectangleStackIcon, value: '3:4' },
    { label: '21:9', desc: 'Cinema', icon: ComputerDesktopIcon, value: '21:9' },
    { label: '3:2', desc: 'Classic 35mm', icon: ComputerDesktopIcon, value: '3:2' },
    { label: '2:3', desc: 'Portrait 35mm', icon: DevicePhoneMobileIcon, value: '2:3' },
    { label: '5:4', desc: 'Medium Format', icon: RectangleStackIcon, value: '5:4' },
    { label: '4:5', desc: 'Portrait Med', icon: RectangleStackIcon, value: '4:5' },
];

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};




interface ThumbnailStudioProps {
    externalAssets?: string[];
    onRemoveExternalAsset?: (url: string) => void;
}

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({ externalAssets = [], onRemoveExternalAsset }) => {
    const [state, setState] = useState<ThumbnailState>({
        step: 'logo',
        logoSettings: { text: '' },
        generatedAssets: { logos: [], keyArts: [] },
        canvas: { ratio: '16:9', elements: [], activeElementId: null }
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- LOGO STEP ---
    const handleLogoGenerate = async () => {
        if (!state.logoSettings.text) return;
        setIsGenerating(true);
        setError(null);
        console.log('[ThumbnailStudio] Starting Logo Generation:', { text: state.logoSettings.text });
        try {
            const { result } = await replicateService.generateLogoWithReplicate(
                state.logoSettings.text,
                state.logoSettings.referenceImage
            );
            setState(prev => ({
                ...prev,
                generatedAssets: {
                    ...prev.generatedAssets,
                    logos: [...prev.generatedAssets.logos, result]
                }
            }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setState(prev => ({
                    ...prev,
                    logoSettings: { ...prev.logoSettings, referenceImage: reader.result as string }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- KEY-ART / UPLOAD STEP ---
    const handleKeyArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setState(prev => ({
                    ...prev,
                    generatedAssets: {
                        ...prev.generatedAssets,
                        keyArts: [...prev.generatedAssets.keyArts, result]
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLocalAsset = (type: 'logo' | 'keyart', urlToRemove: string) => {
        setState(prev => ({
            ...prev,
            generatedAssets: {
                ...prev.generatedAssets,
                [type === 'logo' ? 'logos' : 'keyArts']: prev.generatedAssets[type === 'logo' ? 'logos' : 'keyArts'].filter(url => url !== urlToRemove)
            }
        }));
    };

    // --- COMPOSER STEP ---
    // --- COMPOSER STEP ---
    const addToCanvas = (type: 'logo' | 'keyart' | 'fade', src?: string) => {
        if (type === 'fade') {
            const newElement: CanvasElement = {
                id: Date.now().toString(),
                type: 'fade',
                x: 50,
                y: 50,
                scale: 1,
                rotation: 0,
                zIndex: state.canvas.elements.length + 1,
                opacity: 1,
                fadeSettings: {
                    color: '#000000',
                    startOpacity: 0,
                    endOpacity: 1,
                    direction: 'to bottom'
                }
            };
            setState(prev => ({
                ...prev,
                canvas: { ...prev.canvas, elements: [...prev.canvas.elements, newElement], activeElementId: newElement.id }
            }));
            return;
        }

        // Auto-Zoom Logic for Images
        if (!src) return;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            // Calculate defaults
            let scale = 0.4; // Default for logos
            let x = 50;
            let y = 50;
            let rotation = 0;

            if (type === 'keyart') {
                // Auto-Zoom to Cover
                const [canvasW, canvasH] = state.canvas.ratio.split(':').map(Number);
                const imageAspect = img.naturalWidth / img.naturalHeight;
                const canvasAspect = canvasW / canvasH;
                scale = Math.max(1, imageAspect / canvasAspect);
            }

            const newElement: CanvasElement = {
                id: Date.now().toString(),
                type: 'logo', // Default fallback, overridden below
                src,
                x,
                y,
                scale,
                rotation,
                zIndex: state.canvas.elements.length + 1,
                opacity: 1,
                ...(type === 'keyart' ? { type: 'keyart' } : { type: 'logo' }) // Correct type assignment
            };
            setState(prev => ({
                ...prev,
                canvas: { ...prev.canvas, elements: [...prev.canvas.elements, newElement], activeElementId: newElement.id }
            }));
        };
    };

    const updateElement = (id: string, updates: Partial<CanvasElement>) => {
        setState(prev => ({
            ...prev,
            canvas: {
                ...prev.canvas,
                elements: prev.canvas.elements.map(el => el.id === id ? { ...el, ...updates } : el)
            }
        }));
    };

    const deleteElement = () => {
        if (state.canvas.activeElementId) {
            setState(prev => ({
                ...prev,
                canvas: {
                    ...prev.canvas,
                    elements: prev.canvas.elements.filter(e => e.id !== prev.canvas.activeElementId),
                    activeElementId: null
                }
            }));
        }
    };

    // --- COMPOSER LOGIC ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setState(prev => ({ ...prev, canvas: { ...prev.canvas, activeElementId: id } }));
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !state.canvas.activeElementId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

        setState(prev => ({
            ...prev,
            canvas: {
                ...prev.canvas,
                elements: prev.canvas.elements.map(el => {
                    if (el.id === prev.canvas.activeElementId) {
                        return { ...el, x: el.x + deltaX, y: el.y + deltaY };
                    }
                    return el;
                })
            }
        }));

        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleExport = async () => {
        if (!state.canvas.elements.length) return;

        const canvas = document.createElement('canvas');

        // Robust dimension calculation
        let width = 1080;
        let height = 1080;

        try {
            const [wPart, hPart] = state.canvas.ratio.split(':').map(Number);
            if (wPart && hPart) {
                // Base resolution depending on orientation
                // If landscape, width is base. If portrait, height is base?
                // Or just fix 1080p as standard baseline
                // Standard Logic: Height 1080 for wide, Width 1080 for tall
                if (wPart > hPart) {
                    height = 1080;
                    width = Math.round(height * (wPart / hPart));
                } else {
                    width = 1080;
                    height = Math.round(width * (hPart / wPart));
                }
            }
        } catch (e) {
            console.error("Invalid aspect ratio format", state.canvas.ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill background black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Sort by zIndex
        const elements = [...state.canvas.elements].sort((a, b) => a.zIndex - b.zIndex);

        for (const el of elements) {
            if (el.type === 'fade' && el.fadeSettings) {
                ctx.save();
                // Position
                const x = (el.x / 100) * width;
                const y = (el.y / 100) * height;

                ctx.translate(x, y);
                ctx.rotate((el.rotation * Math.PI) / 180);
                ctx.globalAlpha = el.opacity;

                const drawWidth = width * el.scale;
                const drawHeight = height * el.scale;

                let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
                switch (el.fadeSettings.direction) {
                    case 'to bottom': x0 = 0; y0 = -drawHeight / 2; x1 = 0; y1 = drawHeight / 2; break;
                    case 'to top': x0 = 0; y0 = drawHeight / 2; x1 = 0; y1 = -drawHeight / 2; break;
                    case 'to right': x0 = -drawWidth / 2; y0 = 0; x1 = drawWidth / 2; y1 = 0; break;
                    case 'to left': x0 = drawWidth / 2; y0 = 0; x1 = -drawWidth / 2; y1 = 0; break;
                }

                const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
                gradient.addColorStop(0, hexToRgba(el.fadeSettings.color, el.fadeSettings.startOpacity));
                gradient.addColorStop(1, hexToRgba(el.fadeSettings.color, el.fadeSettings.endOpacity));

                ctx.fillStyle = gradient;
                ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();
            } else {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        ctx.save();
                        // Position
                        const x = (el.x / 100) * width;
                        const y = (el.y / 100) * height;

                        ctx.translate(x, y);
                        ctx.rotate((el.rotation * Math.PI) / 180);
                        ctx.globalAlpha = el.opacity;

                        // Scale Logic: percentage of canvas WIDTH
                        const drawWidth = width * el.scale;
                        const aspect = img.naturalWidth / img.naturalHeight;
                        const drawHeight = drawWidth / aspect;

                        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

                        ctx.restore();
                        resolve();
                    };
                    img.onerror = () => resolve(); // Don't block export on single image error
                    img.src = el.src;
                });
            }
        }

        const link = document.createElement('a');
        link.download = `thumbnail-studio-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // --- RENDER ---
    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Sidebar Navigation */}
            <div className="w-80 border-r border-white/10 p-4 flex flex-col gap-6 overflow-y-auto z-20 bg-[#0a0a0a]">
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10 shadow-sm">
                    <SwatchIcon className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-white text-base">Thumbnail Studio</h3>
                </div>

                {/* Steps Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl">
                    {['logo', 'compose'].map((step) => (
                        <button
                            key={step}
                            onClick={() => setState(prev => ({ ...prev, step: step as any }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${state.step === step ? 'bg-[#f43f5e] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {step.charAt(0).toUpperCase() + step.slice(1)}
                        </button>
                    ))}
                </div>

                {state.step === 'logo' && (
                    <div className="space-y-4">
                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Title logo Description</label>
                            <textarea
                                value={state.logoSettings.text}
                                onChange={(e) => setState(p => ({ ...p, logoSettings: { ...p.logoSettings, text: e.target.value } }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-[#f43f5e] outline-none h-24 resize-none"
                                placeholder="Describe the title logo (e.g. A futuristic, metallic text logo saying 'CyberNinja' with neon accents)"
                            />
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Reference Image (Required for matching style)</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-[#f43f5e]/50 hover:bg-white/5 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="text-[10px] text-gray-400"><span className="font-bold">Click to upload</span> Reference Image</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </section>

                        <button
                            onClick={handleLogoGenerate}
                            disabled={isGenerating || !state.logoSettings.text}
                            className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-[#f43f5e] to-rose-600 hover:scale-[1.02]'
                                }`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Logo'}
                        </button>
                    </div>
                )}



                {state.step === 'compose' && (
                    <div className="space-y-4">
                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Canvas Preset</label>
                            <div className="grid grid-cols-3 gap-2">
                                {ASPECT_RATIOS.map(ratio => (
                                    <button
                                        key={ratio.value}
                                        onClick={() => setState(p => ({ ...p, canvas: { ...p.canvas, ratio: ratio.value } }))}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all duration-200 ${state.canvas.ratio === ratio.value
                                            ? 'bg-[#f43f5e]/10 border-[#f43f5e]/50 text-[#f43f5e]'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <ratio.icon className="w-5 h-5" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold">{ratio.label}</span>
                                            <span className="text-[9px] opacity-70">{ratio.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Tools</label>
                            <div className="flex gap-2">
                                <button onClick={() => addToCanvas('fade')} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 group hover:border-[#f43f5e]/50 text-white">
                                    <div className="w-4 h-4 rounded bg-gradient-to-b from-transparent to-white/50 border border-white/20 group-hover:border-[#f43f5e]"></div>
                                    Add Software Fade
                                </button>
                            </div>
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Upload Key-Art</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-white/10 rounded-lg cursor-pointer hover:border-[#f43f5e]/50 hover:bg-white/5 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="text-[10px] text-gray-400"><span className="font-bold">Click to upload</span> Key-Art</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleKeyArtUpload} />
                                </label>
                            </div>
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Available Assets</label>
                            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-60 p-2 bg-black/20 rounded-lg">
                                {/* External Assets from Visual Studio */}
                                {externalAssets.length > 0 && externalAssets.map((url, i) => (
                                    <div key={`ext-${i}`} className="relative group">
                                        <span className="absolute top-1 left-1 z-10 bg-[#f43f5e] text-white text-[8px] px-1 rounded-sm uppercase font-bold tracking-wider">Imported</span>
                                        <img src={url} alt="Imported Asset" onClick={() => addToCanvas('keyart', url)} className="rounded border border-white/10 cursor-pointer hover:border-[#f43f5e] w-full h-20 object-cover" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveExternalAsset?.(url); }}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {state.generatedAssets.keyArts.map((url, i) => (
                                    <div key={`ka-${i}`} className="relative group">
                                        <img src={url} alt="KA" onClick={() => addToCanvas('keyart', url)} className="rounded border border-white/10 cursor-pointer hover:border-[#f43f5e] w-full h-20 object-cover" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveLocalAsset('keyart', url); }}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {state.generatedAssets.logos.map((url, i) => (
                                    <div key={`lg-${i}`} className="relative group bg-[url('/checker.png')] rounded overflow-hidden h-20 border border-white/10 hover:border-[#f43f5e] cursor-pointer">
                                        <img src={url} alt="LG" onClick={() => addToCanvas('logo', url)} className="w-full h-full object-contain" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveLocalAsset('logo', url); }}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {state.canvas.activeElementId && (
                            <section className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3 transition-all animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-xs font-bold text-white flex justify-between">
                                    Active Layer
                                    <span className="text-[10px] text-gray-400 font-normal">ID: {state.canvas.activeElementId.slice(-4)}</span>
                                </h3>

                                {/* Fade Settings */}
                                {state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.type === 'fade' && (
                                    <div className="space-y-3 pb-3 border-b border-white/10 mb-3">
                                        <div className="flex justify-between items-center"><label className="text-[10px] text-gray-400 font-bold">Fade Settings</label></div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Color</label>
                                                <input type="color"
                                                    value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.color}
                                                    onChange={(e) => updateElement(state.canvas.activeElementId!, { fadeSettings: { ...state.canvas.elements.find(el => el.id === state.canvas.activeElementId)!.fadeSettings!, color: e.target.value } })}
                                                    className="w-full h-8 rounded bg-transparent cursor-pointer" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400 block mb-1">Direction</label>
                                                <select
                                                    value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.direction}
                                                    onChange={(e) => updateElement(state.canvas.activeElementId!, { fadeSettings: { ...state.canvas.elements.find(el => el.id === state.canvas.activeElementId)!.fadeSettings!, direction: e.target.value as any } })}
                                                    className="w-full h-8 bg-black/50 border border-white/10 rounded text-[10px] text-white px-1">
                                                    <option value="to bottom">Top ↓ Bottom</option>
                                                    <option value="to top">Bottom ↑ Top</option>
                                                    <option value="to right">Left → Right</option>
                                                    <option value="to left">Right ← Left</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-400"><span>Start Opacity</span> <span>{state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.startOpacity}</span></div>
                                            <input type="range" min="0" max="1" step="0.1"
                                                value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.startOpacity}
                                                onChange={(e) => updateElement(state.canvas.activeElementId!, { fadeSettings: { ...state.canvas.elements.find(el => el.id === state.canvas.activeElementId)!.fadeSettings!, startOpacity: parseFloat(e.target.value) } })}
                                                className="w-full accent-[#f43f5e] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-400"><span>End Opacity</span> <span>{state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.endOpacity}</span></div>
                                            <input type="range" min="0" max="1" step="0.1"
                                                value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.fadeSettings?.endOpacity}
                                                onChange={(e) => updateElement(state.canvas.activeElementId!, { fadeSettings: { ...state.canvas.elements.find(el => el.id === state.canvas.activeElementId)!.fadeSettings!, endOpacity: parseFloat(e.target.value) } })}
                                                className="w-full accent-[#f43f5e] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-gray-400">Scale</label>
                                        <input
                                            type="range" min="0.1" max="3" step="0.1"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.scale || 1}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { scale: parseFloat(e.target.value) })}
                                            className="w-full accent-[#f43f5e] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Rotation</label>
                                        <input
                                            type="range" min="-180" max="180"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.rotation || 0}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { rotation: parseInt(e.target.value) })}
                                            className="w-full accent-[#f43f5e] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Opacity</label>
                                        <input
                                            type="range" min="0" max="1" step="0.1"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.opacity || 1}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { opacity: parseFloat(e.target.value) })}
                                            className="w-full accent-[#f43f5e] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button onClick={() => {
                                            const el = state.canvas.elements.find(e => e.id === state.canvas.activeElementId);
                                            if (el) updateElement(state.canvas.activeElementId!, { zIndex: el.zIndex + 1 });
                                        }} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded mr-2">Bring Fwd</button>
                                        <button onClick={() => {
                                            const el = state.canvas.elements.find(e => e.id === state.canvas.activeElementId);
                                            if (el) updateElement(state.canvas.activeElementId!, { zIndex: Math.max(0, el.zIndex - 1) });
                                        }} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded">Send Back</button>
                                    </div>
                                </div>
                                <button onClick={deleteElement} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 w-full py-2 rounded-lg transition">Delete Layer</button>
                            </section>
                        )}

                        <div className="pt-4 mt-auto">
                            <button onClick={handleExport} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-2">
                                <ArrowDownTrayIcon className="w-5 h-5" /> Export Thumbnail
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="p-3 rounded-lg bg-red-500/20 text-red-200 text-xs border border-red-50/10">{error}</div>}
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 bg-[#151515] flex items-center justify-center p-8 overflow-hidden relative select-none">
                {state.step !== 'compose' ? (
                    // Preview Grid for Generations
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl max-h-full overflow-y-auto">
                        {state.step === 'logo' && state.generatedAssets.logos.map((url, i) => (
                            <div key={i} className="aspect-[3/2] bg-[url('/checker.png')] bg-repeat rounded-xl overflow-hidden border border-white/10 relative group hover:border-[#f43f5e] transition">
                                <img src={url} alt="Generated Logo" className="w-full h-full object-contain" />
                            </div>
                        ))}
                        {/* Empty State */}
                        {state.step === 'logo' && state.generatedAssets.logos.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20">
                                <SparklesIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>No assets generated yet.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Composer Canvas
                    (() => {
                        const [w, h] = state.canvas.ratio.split(':').map(Number);
                        const isTall = h > w;
                        return (
                            <div
                                ref={canvasRef}
                                className="bg-black relative overflow-hidden shadow-2xl transition-all duration-300 group"
                                onMouseMove={handleMouseMove}
                                style={{
                                    aspectRatio: state.canvas.ratio.replace(':', '/'),
                                    height: isTall ? '80vh' : 'auto',
                                    width: isTall ? 'auto' : '100%',
                                    maxHeight: '80vh',
                                    maxWidth: '100%',
                                    boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                                    backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                }}
                                onClick={() => setState(p => ({ ...p, canvas: { ...p.canvas, activeElementId: null } }))}
                            >
                                {/* Render Elements */}
                                {state.canvas.elements.sort((a, b) => a.zIndex - b.zIndex).map(el => (
                                    <div
                                        key={el.id}
                                        onMouseDown={(e) => handleMouseDown(e, el.id)}
                                        onClick={(e) => { e.stopPropagation(); }} // Prevent deselection
                                        style={{
                                            position: 'absolute',
                                            left: `${el.x}%`,
                                            top: `${el.y}%`,
                                            width: `${el.scale * 100}%`, // Scale controls width relative to canvas
                                            transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                                            opacity: el.opacity,
                                            cursor: isDragging && state.canvas.activeElementId === el.id ? 'grabbing' : 'grab',
                                            zIndex: el.zIndex,
                                            userSelect: 'none',
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        {el.type === 'fade' && el.fadeSettings ? (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: state.canvas.ratio.replace(':', '/'),
                                                    background: `linear-gradient(${el.fadeSettings.direction}, ${hexToRgba(el.fadeSettings.color, el.fadeSettings.startOpacity)}, ${hexToRgba(el.fadeSettings.color, el.fadeSettings.endOpacity)})`
                                                }}
                                                className={`pointer-events-none ${state.canvas.activeElementId === el.id ? 'ring-2 ring-[#f43f5e] shadow-xl' : ''}`}
                                            ></div>
                                        ) : (
                                            <img
                                                src={el.src}
                                                alt={el.type}
                                                className={`pointer-events-none w-full h-auto ${state.canvas.activeElementId === el.id ? 'ring-2 ring-[#f43f5e] shadow-xl' : ''}`}
                                                style={{ display: 'block' }}
                                            />
                                        )}
                                    </div>
                                ))}

                                {/* Empty Canvas Hint */}
                                {state.canvas.elements.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                        <p className="text-white text-sm font-medium">Drag & Drop Assets to Compose</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()
                )}
            </div>
        </div >
    );
};

export default ThumbnailStudio;
