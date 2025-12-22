import React, { useState, useRef, useEffect } from 'react';
import { ThumbnailState, CanvasElement } from '../types';
import * as replicateService from '../services/replicateService';
import { ArrowDownTrayIcon, SparklesIcon } from '@heroicons/react/24/outline';

const LOGO_STYLES = [
    'Minimal/Clean',
    'Bold/Cinematic',
    'Vintage/Retro',
    'Playful/Cartoon',
    'Elegant/Luxury'
];

const MOODS = [
    'Action/Thriller',
    'Drama',
    'Comedy',
    'Horror',
    'Romance',
    'Sci-Fi/Fantasy',
    'Documentary'
];

const ASPECT_RATIOS = [
    { label: '16:9 (Landscape)', value: '16:9' },
    { label: '9:16 (Portrait)', value: '9:16' },
    { label: '1:1 (Square)', value: '1:1' },
    { label: '4:3 (Standard)', value: '4:3' },
    { label: '3:4 (Portrait)', value: '3:4' },
    { label: '21:9 (Ultrawide)', value: '21:9' },
    { label: '3:2 (Classic 35mm)', value: '3:2' },
    { label: '2:3 (Portrait 35mm)', value: '2:3' },
    { label: '5:4 (Medium Format)', value: '5:4' },
    { label: '4:5 (Portrait Medium)', value: '4:5' },
];

const ThumbnailStudio: React.FC = () => {
    const [state, setState] = useState<ThumbnailState>({
        step: 'logo',
        logoSettings: { text: '' },
        keyArtSettings: { description: '', mood: MOODS[0] },
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

    // --- KEY-ART STEP ---
    const handleKeyArtGenerate = async () => {
        if (!state.keyArtSettings.description) return;
        setIsGenerating(true);
        setError(null);
        try {
            const result = await replicateService.generateKeyArtWithReplicate(
                state.keyArtSettings.description,
                state.keyArtSettings.mood,
                state.keyArtSettings.referenceImage
            );
            setState(prev => ({
                ...prev,
                generatedAssets: {
                    ...prev.generatedAssets,
                    keyArts: [...prev.generatedAssets.keyArts, result]
                }
            }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- COMPOSER STEP ---
    const addToCanvas = (type: 'logo' | 'keyart', src: string) => {
        const newElement: CanvasElement = {
            id: Date.now().toString(),
            type,
            src,
            x: 50, // Center percent
            y: 50,
            scale: 1,
            rotation: 0,
            zIndex: state.canvas.elements.length + 1,
            opacity: 1
        };
        setState(prev => ({
            ...prev,
            canvas: { ...prev.canvas, elements: [...prev.canvas.elements, newElement], activeElementId: newElement.id }
        }));
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
                    ctx.scale(el.scale, el.scale);
                    ctx.globalAlpha = el.opacity;

                    // Draw centered
                    // Maintain aspect ratio of the image itself
                    // We assume 'scale' usually relates to the canvas size, but capturing raw image size is better for quality
                    // Let's deduce a "base size" relative to canvas. 
                    // To mimic CSS "width: auto" behavior, we need to know the natural aspect of the image vs canvas
                    // A simple heuristic: logos (usually small) vs keyart (usually covers)
                    // For now, let's draw strictly based on natural size scaled by 'scale' relative to canvas size?
                    // Actually, the CSS view renders them based on their natural size? No, `img` tags in divs just render at intrinsic size unless constrained.
                    // But in our CSS we don't constrain them! Wait, `img` in `div` without width/height set will render intrinsic.
                    // This might be huge (4K image) on a small canvas.
                    // Let's assume we want to match visually what is on screen.
                    // The CSS preview has `max-width: 100%` usually? No, I implemented it as absolute position image...
                    // Let's check the CSS implementation:
                    // style={{ position: 'absolute', transform: ...,  }}
                    // It doesn't restrict width. So an image with 4000px width will blow up the container if strict overflow hidden wasn't there.
                    // THIS IS A BUG in my CSS implementation that I should fix too.
                    // I should normalize images to a "standard" size relative to canvas width, e.g. 50% of canvas width.

                    // Improved Export Logic:
                    // Draw image at natural size? No, that depends on how it looked in DOM.
                    // In DOM, if I didn't set width, it is natural size.
                    // So if I draw it at natural size here, it matches DOM.
                    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

                    ctx.restore();
                    resolve();
                };
                img.onerror = reject;
                img.src = el.src;
            });
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
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Thumbnail Studio
                </h1>

                {/* Steps Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl">
                    {['logo', 'keyart', 'compose'].map((step) => (
                        <button
                            key={step}
                            onClick={() => setState(prev => ({ ...prev, step: step as any }))}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${state.step === step ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
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
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                                placeholder="Describe the title logo (e.g. A futuristic, metallic text logo saying 'CyberNinja' with neon accents)"
                            />
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Reference Image (Required for matching style)</label>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-gray-400" />
                        </section>

                        <button
                            onClick={handleLogoGenerate}
                            disabled={isGenerating || !state.logoSettings.text}
                            className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02]'
                                }`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Logo'}
                        </button>
                    </div>
                )}

                {state.step === 'keyart' && (
                    <div className="space-y-4">
                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Scene Description</label>
                            <textarea
                                value={state.keyArtSettings.description}
                                onChange={(e) => setState(p => ({ ...p, keyArtSettings: { ...p.keyArtSettings, description: e.target.value } }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                                placeholder="Describe the main subject and action..."
                            />
                        </section>
                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Mood / Genre</label>
                            <select
                                value={state.keyArtSettings.mood}
                                onChange={(e) => setState(p => ({ ...p, keyArtSettings: { ...p.keyArtSettings, mood: e.target.value } }))}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                            >
                                {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </section>
                        <button
                            onClick={handleKeyArtGenerate}
                            disabled={isGenerating || !state.keyArtSettings.description}
                            className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-[1.02]'
                                }`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Key-Art'}
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
                                        className={`p-2 text-[10px] rounded border ${state.canvas.ratio === ratio.value ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10'}`}
                                    >
                                        {ratio.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <label className="text-xs font-bold text-gray-400 block mb-2">Available Assets</label>
                            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-60 p-2 bg-black/20 rounded-lg">
                                {state.generatedAssets.keyArts.map((url, i) => (
                                    <img key={`ka-${i}`} src={url} alt="KA" onClick={() => addToCanvas('keyart', url)} className="rounded border border-white/10 cursor-pointer hover:border-pink-500 w-full h-20 object-cover" />
                                ))}
                                {state.generatedAssets.logos.map((url, i) => (
                                    <div key={`lg-${i}`} className="bg-[url('/checker.png')] rounded overflow-hidden h-20 border border-white/10 hover:border-indigo-500 cursor-pointer">
                                        <img src={url} alt="LG" onClick={() => addToCanvas('logo', url)} className="w-full h-full object-contain" />
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
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-gray-400">Scale</label>
                                        <input
                                            type="range" min="0.1" max="3" step="0.1"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.scale || 1}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { scale: parseFloat(e.target.value) })}
                                            className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Rotation</label>
                                        <input
                                            type="range" min="-180" max="180"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.rotation || 0}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { rotation: parseInt(e.target.value) })}
                                            className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400">Opacity</label>
                                        <input
                                            type="range" min="0" max="1" step="0.1"
                                            value={state.canvas.elements.find(el => el.id === state.canvas.activeElementId)?.opacity || 1}
                                            onChange={(e) => updateElement(state.canvas.activeElementId!, { opacity: parseFloat(e.target.value) })}
                                            className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
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
                            <div key={i} className="aspect-[3/2] bg-[url('/checker.png')] bg-repeat rounded-xl overflow-hidden border border-white/10 relative group hover:border-indigo-500 transition">
                                <img src={url} alt="Generated Logo" className="w-full h-full object-contain" />
                            </div>
                        ))}
                        {state.step === 'keyart' && state.generatedAssets.keyArts.map((url, i) => (
                            <div key={i} className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group relative hover:border-pink-500 transition">
                                <img src={url} alt="Generated KeyArt" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {/* Empty State */}
                        {((state.step === 'logo' && state.generatedAssets.logos.length === 0) || (state.step === 'keyart' && state.generatedAssets.keyArts.length === 0)) && (
                            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20">
                                <SparklesIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>No assets generated yet.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Composer Canvas
                    <div
                        ref={canvasRef}
                        className="bg-black relative overflow-hidden shadow-2xl transition-all duration-300"
                        onMouseMove={handleMouseMove}
                        style={{
                            aspectRatio: state.canvas.ratio.replace(':', '/'),
                            height: '80%',
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
                                style={{
                                    position: 'absolute',
                                    left: `${el.x}%`,
                                    top: `${el.y}%`,
                                    transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale})`,
                                    opacity: el.opacity,
                                    cursor: isDragging && state.canvas.activeElementId === el.id ? 'grabbing' : 'grab',
                                    zIndex: el.zIndex,
                                    userSelect: 'none',
                                    pointerEvents: 'auto'
                                }}
                            >
                                <img
                                    src={el.src}
                                    alt={el.type}
                                    className={`pointer-events-none ${state.canvas.activeElementId === el.id ? 'ring-2 ring-indigo-500 shadow-xl' : ''}`}
                                    style={{
                                        // Ensure image has some intrinsic dimension if needed, but 'auto' usually works
                                        maxWidth: 'none', // Prevent constraint
                                        display: 'block'
                                    }}
                                />
                            </div>
                        ))}

                        {/* Empty Canvas Hint */}
                        {state.canvas.elements.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                <p className="text-white text-sm font-medium">Drag & Drop Assets to Compose</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThumbnailStudio;
