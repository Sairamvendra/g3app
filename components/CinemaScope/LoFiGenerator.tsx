import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Check } from 'lucide-react';
import { ParsedScript, Scene, Shot, GeneratedPage } from './types';

interface LoFiGeneratorProps {
    parsedScript: ParsedScript;
    onPagesReady: (pages: GeneratedPage[]) => void;
}

interface PageSpec {
    pageNumber: number;
    sceneNumber: number;
    sceneDescription: string;
    shots: Shot[];
}

export const LoFiGenerator: React.FC<LoFiGeneratorProps> = ({ parsedScript, onPagesReady }) => {
    const [pages, setPages] = useState<GeneratedPage[]>([]);
    const [specs, setSpecs] = useState<PageSpec[]>([]);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 1. Prepare Page Specs on mount
    useEffect(() => {
        const newSpecs: PageSpec[] = [];
        let globalPageCount = 1;

        parsedScript.scenes.forEach(scene => {
            const shots = scene.shots;
            // Split into chunks of 6
            for (let i = 0; i < shots.length; i += 6) {
                newSpecs.push({
                    pageNumber: globalPageCount++,
                    sceneNumber: scene.sceneNumber,
                    sceneDescription: scene.sceneDescription,
                    shots: shots.slice(i, i + 6)
                });
            }
        });
        setSpecs(newSpecs);
    }, [parsedScript]);

    const generatePagePrompt = (spec: PageSpec) => {
        const framesText = spec.shots.map((shot, i) =>
            `Frame ${i + 1}: ${shot.composition}. ${shot.action}. ${shot.shotType} shot.`
        ).join(' | ');

        const gridDesc = spec.shots.length <= 2 ? "1x2 or 2x1 layout" : "2x3 grid layout";

        return `Professional storyboard page, pencil sketch art style, hand-drawn aesthetic, 9:16 vertical layout with ${spec.shots.length} panels arranged in a ${gridDesc}. Scene: ${spec.sceneDescription}. Panels: ${framesText}. Style: Clean pencil line art, professional storyboard quality, consistent character faces, consistent environment and lighting, clear panel borders, subtle shading, cinematic composition. 4K resolution, highly detailed pencil artwork.`;
    };

    const generateNext = async (currentIndex = 0) => {
        if (currentIndex >= specs.length) {
            setGeneratingIndex(null);
            return;
        }

        setGeneratingIndex(currentIndex);
        setError(null);

        const spec = specs[currentIndex];

        // Check if already generated
        if (pages.find(p => p.pageNumber === spec.pageNumber)) {
            await generateNext(currentIndex + 1);
            return;
        }

        try {
            const prompt = generatePagePrompt(spec);
            const res = await fetch('/api/cinemascope/generate-lofi-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();

            const newPage: GeneratedPage = {
                pageNumber: spec.pageNumber,
                sceneNumber: spec.sceneNumber,
                imageUrl: data.imageUrl,
                shotsIncluded: spec.shots.map(s => s.shotNumber),
                generationPrompt: prompt
            };

            setPages(prev => [...prev.filter(p => p.pageNumber !== newPage.pageNumber), newPage]);

            // Notify parent if we want streaming updates? Or wait till all done? 
            // For now, allow proceeding once at least one is done.
            onPagesReady([...pages, newPage]);

            // Continue to next (Sequential generation to avoid rate limits)
            await new Promise(r => setTimeout(r, 1000)); // Cool down
            await generateNext(currentIndex + 1);

        } catch (e: any) {
            console.error(e);
            setError(`Failed to generate page ${spec.pageNumber}: ${e.message}`);
            setGeneratingIndex(null); // Stop queue on error
        }
    };

    const startGeneration = () => {
        setPages([]);
        generateNext(0);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Step 3: Lo-Fi Storyboards</h2>
                        <p className="text-gray-400 text-sm">Generating {specs.length} storyboard pages</p>
                    </div>

                    {pages.length === 0 && !generatingIndex ? (
                        <button
                            onClick={startGeneration}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" /> Start Generation
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            {generatingIndex !== null ? (
                                <span className="text-yellow-400 flex items-center gap-2 text-sm animate-pulse">
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating Page {generatingIndex + 1}/{specs.length}...
                                </span>
                            ) : (
                                <span className="text-green-400 flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4" /> Complete
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg mb-4 text-sm">
                        {error} <button onClick={() => generateNext(pages.length)} className="underline ml-2">Retry</button>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {specs.map((spec) => {
                        const page = pages.find(p => p.pageNumber === spec.pageNumber);
                        return (
                            <div key={spec.pageNumber} className="relative aspect-[9/16] bg-gray-950 rounded-lg border border-gray-800 overflow-hidden group">
                                {page ? (
                                    <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                                        {generatingIndex === specs.indexOf(spec) ? (
                                            <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                                        ) : (
                                            <span className="font-mono text-2xl font-bold opacity-30">{spec.pageNumber}</span>
                                        )}
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white font-mono">
                                    Page {spec.pageNumber} • Scene {spec.sceneNumber}
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
