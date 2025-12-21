import React, { useState } from 'react';
import { CloudArrowUpIcon, RocketLaunchIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, StopIcon, RectangleStackIcon, PhotoIcon, PencilSquareIcon, TrashIcon, ArrowDownTrayIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { reframeBannerWithReplicate, editBannerWithReplicate } from '../services/replicateService';

// ... (props interface)
interface SmartBannersProps { }

// ... (aspect ratios constant)
const ASPECT_RATIOS = [
    { label: '16:9', desc: 'Landscape', icon: ComputerDesktopIcon, ratio: 'aspect-video' },
    { label: '9:16', desc: 'Portrait', icon: DevicePhoneMobileIcon, ratio: 'aspect-[9/16]' },
    { label: '1:1', desc: 'Square', icon: StopIcon, ratio: 'aspect-square' },
    { label: '4:3', desc: 'Standard', icon: RectangleStackIcon, ratio: 'aspect-[4/3]' },
    { label: '3:4', desc: 'Vertical', icon: RectangleStackIcon, ratio: 'aspect-[3/4]' },
    { label: '21:9', desc: 'Cinema', icon: ComputerDesktopIcon, ratio: 'aspect-[21/9]' },
    { label: '3:2', desc: 'Classic 35mm', icon: ComputerDesktopIcon, ratio: 'aspect-[3/2]' },
    { label: '2:3', desc: 'Portrait 35mm', icon: DevicePhoneMobileIcon, ratio: 'aspect-[2/3]' },
    { label: '5:4', desc: 'Medium Format', icon: RectangleStackIcon, ratio: 'aspect-[5/4]' },
    { label: '4:5', desc: 'Portrait Med', icon: RectangleStackIcon, ratio: 'aspect-[4/5]' },
];

const SmartBanners: React.FC<SmartBannersProps> = () => {
    const [bannerImage, setBannerImage] = useState<string | null>(null);
    const [selectedRatios, setSelectedRatios] = useState<string[]>(['1:1']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAssets, setGeneratedAssets] = useState<{ ratio: string, url: string, status: 'pending' | 'completed' | 'failed' }[]>([]);

    // Edit State
    const [editingAsset, setEditingAsset] = useState<{ ratio: string, url: string, idx: number } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleGenerate = async () => {
        if (!bannerImage || selectedRatios.length === 0) return;

        setIsGenerating(true);
        // Initialize placeholders
        const newAssets = selectedRatios.map(ratio => ({ ratio, url: '', status: 'pending' as const }));
        setGeneratedAssets(newAssets);

        try {
            await Promise.all(selectedRatios.map(async (ratio) => {
                try {
                    const resultUrl = await reframeBannerWithReplicate(bannerImage, ratio);
                    setGeneratedAssets(prev => prev.map(asset =>
                        asset.ratio === ratio ? { ...asset, url: resultUrl, status: 'completed' } : asset
                    ));
                } catch (error) {
                    console.error(`Failed to generate ${ratio}:`, error);
                    setGeneratedAssets(prev => prev.map(asset =>
                        asset.ratio === ratio ? { ...asset, status: 'failed' } : asset
                    ));
                }
            }));
        } catch (error) {
            console.error("Batch generation error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEditStart = (asset: { ratio: string, url: string }, idx: number) => {
        setEditingAsset({ ...asset, idx });
        setEditPrompt('');
    };

    const handleEditSubmit = async () => {
        if (!editingAsset || !editPrompt) return;

        setIsEditing(true);
        try {
            const newItemUrl = await editBannerWithReplicate(editingAsset.url, editPrompt);

            // Update the asset in the grid
            setGeneratedAssets(prev => prev.map((asset, i) =>
                i === editingAsset.idx ? { ...asset, url: newItemUrl } : asset
            ));

            setEditingAsset(null); // Close modal
        } catch (error) {
            console.error("Edit failed:", error);
            alert("Failed to edit banner. Please try again.");
        } finally {
            setIsEditing(false);
        }
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) setBannerImage(reader.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const toggleRatio = (label: string) => {
        setSelectedRatios(prev =>
            prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label]
        );
    };

    return (
        <div className="flex h-full w-full overflow-hidden relative">
            {/* Sidebar Controls */}
            <div className="w-80 flex-none bg-[var(--bg-panel)] border-r border-[var(--border-color)] overflow-y-auto p-4 flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Smart Banners</h2>
                </div>

                {/* 1. Upload Banner */}
                <section className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">1. Upload Banner</h3>
                    <div className="bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center gap-3 relative group transition hover:border-indigo-500/50 hover:bg-[var(--bg-input)]">
                        {bannerImage ? (
                            <>
                                <img src={bannerImage} alt="Uploaded Banner" className="w-full h-40 object-contain rounded-lg bg-black/5" />
                                <button
                                    onClick={() => setBannerImage(null)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition backdrop-blur-sm"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-muted)] group-hover:scale-110 transition group-hover:text-indigo-500">
                                    <CloudArrowUpIcon className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[var(--text-primary)]">Click to Upload</p>
                                    <p className="text-[10px] text-[var(--text-muted)]">Supports JPEG, PNG</p>
                                </div>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBannerUpload} data-testid="banner-upload" />
                            </>
                        )}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={!bannerImage || selectedRatios.length === 0 || isGenerating}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${!bannerImage || selectedRatios.length === 0 || isGenerating ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
                    >
                        {isGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <RocketLaunchIcon className="w-4 h-4" />}
                        {isGenerating ? 'Analyzing & Reframing...' : 'Analyze & Reframe'}
                    </button>
                </section>

                {/* 2. Aspect Ratios */}
                <section className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">2. Target Ratios</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {ASPECT_RATIOS.map((ratio) => {
                            const isSelected = selectedRatios.includes(ratio.label);
                            const Icon = ratio.icon;
                            return (
                                <button
                                    key={ratio.label}
                                    onClick={() => toggleRatio(ratio.label)}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all duration-200 ${isSelected
                                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold">{ratio.label}</span>
                                        <span className="text-[9px] opacity-70">{ratio.desc}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-[var(--bg-main)] p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Generated Assets</h2>
                    <div className="flex gap-2">
                        {/* Placeholder for future specific page actions */}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Empty State */}
                    {generatedAssets.length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]/50">
                            <PhotoIcon className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No assets generated yet.</p>
                            <p className="text-xs opacity-60">Upload a banner and select ratios to begin.</p>
                        </div>
                    )}

                    {/* Results Grid */}
                    {generatedAssets.map((asset, idx) => (
                        <div key={`${asset.ratio}-${idx}`} className="group relative aspect-square bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium border border-white/10">
                                {asset.ratio}
                            </div>

                            {asset.status === 'pending' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                                    <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                    <span className="text-xs">Generating...</span>
                                </div>
                            ) : asset.status === 'failed' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-red-400">
                                    <span className="text-xs">Generation Failed</span>
                                </div>
                            ) : (
                                <>
                                    <img src={asset.url} alt={`Generated ${asset.ratio}`} className="w-full h-full object-contain bg-black/20" />
                                    {/* Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <a href={asset.url} download={`banner-${asset.ratio}.png`} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Download">
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        </a>
                                        <button onClick={() => handleEditStart(asset, idx)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Edit with AI">
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Modal Overlay */}
            {editingAsset && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-primary)]">Edit Banner ({editingAsset.ratio})</h3>
                            <button onClick={() => setEditingAsset(null)} className="text-[var(--text-muted)] hover:text-white transition"><XMarkIcon className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 flex flex-col gap-6">
                            <div className="flex justify-center bg-black/20 rounded-xl p-4 border border-[var(--border-color)] border-dashed h-64">
                                <img src={editingAsset.url} className="h-full object-contain" alt="Editing Target" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Edit Instructions</label>
                                <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="Describe how you want to modify this banner (e.g., 'Make the background darker', 'Add a lens flare', 'Make text more legible')..."
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] p-3 rounded-xl border border-[var(--border-color)] focus:border-indigo-500 outline-none h-24 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex justify-end gap-3">
                            <button onClick={() => setEditingAsset(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">Cancel</button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={!editPrompt || isEditing}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isEditing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PencilSquareIcon className="w-4 h-4" />}
                                {isEditing ? 'Processing...' : 'Apply Edits'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartBanners;
