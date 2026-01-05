import React, { useState } from 'react';
import { Scissors, Check, Play, Loader } from 'lucide-react';
import { GeneratedPage, CroppedFrame, ParsedScript, Shot } from './types';

interface FrameCropperProps {
    pages: GeneratedPage[];
    parsedScript: ParsedScript;
    onFramesReady: (frames: CroppedFrame[]) => void;
}

export const FrameCropper: React.FC<FrameCropperProps> = ({ pages, parsedScript, onFramesReady }) => {
    const [frames, setFrames] = useState<CroppedFrame[]>([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const getShotData = (pageNumber: number, frameIndex: number): Shot | null => {
        // Find the page in pages
        const page = pages.find(p => p.pageNumber === pageNumber);
        if (!page) return null;

        // shotIncluded is logical shot number. 
        // Is the grid always filled sequentially? Yes per LoFi logic.
        // Frame Index 0-5.

        // We need to map frameIndex to shotNumber.
        // In LoFiGenerator logic: shots.slice(0, 6). 
        // So frameIndex 0 = first shot in that page spec.

        const shotNum = page.shotsIncluded[frameIndex];
        if (!shotNum) return null; // Empty panel?

        // Find shot data in parsedScript
        for (const scene of parsedScript.scenes) {
            const shot = scene.shots.find(s => s.shotNumber === shotNum);
            if (shot) return shot;
        }
        return null;
    };

    const handleCropAll = async () => {
        setProcessing(true);
        const allFrames: CroppedFrame[] = [];

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            setProgress(((i) / pages.length) * 100);

            try {
                const res = await fetch('/api/cinemascope/crop-frames', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: page.imageUrl, gridCols: 2, gridRows: 3 })
                });

                if (!res.ok) throw new Error('Crop failed');
                const data = await res.json();

                // Map cropped parts to real shot data
                data.frames.forEach((f: any) => {
                    const shotData = getShotData(page.pageNumber, f.frameIndex);
                    if (shotData) {
                        allFrames.push({
                            frameIndex: f.frameIndex,
                            pageNumber: page.pageNumber,
                            shotNumber: shotData.shotNumber,
                            base64: f.base64,
                            shotData: shotData
                        });
                    }
                });

            } catch (e) {
                console.error(`Failed to crop page ${page.pageNumber}`, e);
            }
        }

        setFrames(allFrames);
        setProcessing(false);
        setProgress(100);
        onFramesReady(allFrames);
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Step 4: Crop Individual Frames</h2>
                    <p className="text-gray-400 text-sm">
                        Extracting individual panels for Hi-Fi upscaling
                    </p>
                </div>

                {frames.length === 0 ? (
                    <button
                        onClick={handleCropAll}
                        disabled={processing}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                        {processing ? `Processing ${Math.round(progress)}%` : 'Crop All Frames'}
                    </button>
                ) : (
                    <div className="text-green-400 flex items-center gap-2 font-medium">
                        <Check className="w-5 h-5" /> {frames.length} Frames Extracted
                    </div>
                )}
            </div>

            {frames.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {frames.map((frame) => (
                        <div key={`${frame.pageNumber}-${frame.frameIndex}`} className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800 group">
                            <div className="aspect-[16/9] relative">
                                <img src={frame.base64} alt={`Shot ${frame.shotNumber}`} className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                                    #{frame.shotNumber}
                                </div>
                            </div>
                            <div className="p-2 text-xs text-gray-400 truncate">
                                {frame.shotData.shotType}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
