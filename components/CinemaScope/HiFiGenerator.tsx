import React, { useState } from 'react';
import { Sparkles, Download, Play, RefreshCw, Check } from 'lucide-react';
import { CroppedFrame, HiFiFrame } from './types';

interface HiFiGeneratorProps {
    finalFrames: CroppedFrame[];
}

export const HiFiGenerator: React.FC<HiFiGeneratorProps> = ({ finalFrames }) => {
    const [hifiFrames, setHifiFrames] = useState<HiFiFrame[]>([]);
    const [processingIndex, setProcessingIndex] = useState<number | null>(null);

    const generateNext = async (idx: number) => {
        if (idx >= finalFrames.length) {
            setProcessingIndex(null);
            return;
        }

        setProcessingIndex(idx);
        const crop = finalFrames[idx];

        // Skip if already done
        if (hifiFrames.find(f => f.shotNumber === crop.shotData.shotNumber)) {
            await generateNext(idx + 1);
            return;
        }

        const shot = crop.shotData;

        // Construct Consistency-Aware Prompt
        // Add visual tokens described in PRD logic (e.g. style tokens, scene context)

        const prompt = `extreme high resolution, ultra realistic, photorealistic, cinematic lighting, film grain, ARRI Alexa quality, professional cinematography.
     
Scene: ${shot.styleNotes || 'Cinematic scene'}
Action: ${shot.action}
Composition: ${shot.composition}
Camera: ${shot.shotType} shot. ${shot.cameraMovement}.
Lighting: ${shot.lighting}.

Style: Highly detailed, volumetric lighting, 8k resolution, cinematic color grading.`;

        try {
            const res = await fetch('/api/cinemascope/generate-hifi-frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    image: crop.base64 // Pass the sketch as reference!
                })
            });

            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();

            setHifiFrames(prev => [...prev, {
                shotNumber: shot.shotNumber,
                imageUrl: data.imageUrl,
                generationPrompt: prompt
            }]);

            // Sequential delay
            await new Promise(r => setTimeout(r, 1000));
            await generateNext(idx + 1);

        } catch (e) {
            console.error(`Failed frame ${idx}`, e);
            // Skip and continue
            await generateNext(idx + 1);
        }
    };

    const startGeneration = () => {
        setHifiFrames([]);
        generateNext(0);
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        Step 5: High-Fidelity Rendering
                    </h2>
                    <p className="text-gray-400 text-sm">Transforming sketches into cinematic frames</p>
                </div>

                {hifiFrames.length === 0 && !processingIndex ? (
                    <button
                        onClick={startGeneration}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <Play className="w-4 h-4 fill-black" /> Render All
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        {processingIndex !== null ? (
                            <span className="text-purple-400 flex items-center gap-2 text-sm animate-pulse">
                                <RefreshCw className="w-4 h-4 animate-spin" /> Rendering Frame {processingIndex + 1}/{finalFrames.length}...
                            </span>
                        ) : (
                            <span className="text-green-400 flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4" /> All Complete
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {finalFrames.map((crop, idx) => {
                    const hifi = hifiFrames.find(f => f.shotNumber === crop.shotData.shotNumber);
                    const isProcessing = processingIndex === idx;

                    return (
                        <div key={crop.shotNumber} className="bg-gray-950 rounded-xl overflow-hidden border border-gray-800 hover:border-yellow-500/50 transition-colors group">
                            <div className="aspect-video relative bg-black">
                                {hifi ? (
                                    <img src={hifi.imageUrl} alt={`Cinematic Shot ${hifi.shotNumber}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center opacity-50 space-y-2">
                                        {isProcessing ? (
                                            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                                        ) : (
                                            <img src={crop.base64} className="w-full h-full object-cover opacity-30 grayscale" />
                                        )}
                                    </div>
                                )}

                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white font-mono border border-white/10">
                                    SHOT {crop.shotData.shotNumber} • {crop.shotData.shotType}
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                <p className="text-sm text-gray-300 line-clamp-2 italic">
                                    "{crop.shotData.action}"
                                </p>

                                {hifi && (
                                    <div className="pt-2 flex justify-end">
                                        <a
                                            href={hifi.imageUrl}
                                            target="_blank"
                                            download={`shot_${hifi.shotNumber}.png`}
                                            className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> Download
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
