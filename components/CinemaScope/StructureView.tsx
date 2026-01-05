import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Video, Camera, Mic, Sun } from 'lucide-react';
import { ParsedScript, Scene, Shot } from './types';

interface StructureViewProps {
    parsedScript: ParsedScript;
    onProceed: () => void;
}

export const StructureView: React.FC<StructureViewProps> = ({ parsedScript, onProceed }) => {
    const [expandedScenes, setExpandedScenes] = useState<number[]>([1]); // Default first scene open

    const toggleScene = (sceneNum: number) => {
        setExpandedScenes(prev =>
            prev.includes(sceneNum)
                ? prev.filter(n => n !== sceneNum)
                : [...prev, sceneNum]
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-1">Step 2: Review Structure</h2>
                        <p className="text-gray-400 text-sm">
                            Analyzed <strong>{parsedScript.totalScenes} scenes</strong> with <strong>{parsedScript.scenes.reduce((acc, s) => acc + s.shots.length, 0)} shots</strong>
                        </p>
                    </div>
                    <button
                        onClick={onProceed}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Generate Storyboards
                    </button>
                </div>

                <div className="space-y-4">
                    {parsedScript.scenes.map((scene) => (
                        <div key={scene.sceneNumber} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                            <button
                                onClick={() => toggleScene(scene.sceneNumber)}
                                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedScenes.includes(scene.sceneNumber) ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                    <div className="text-left">
                                        <span className="text-purple-400 font-mono text-sm mr-3">SCENE {scene.sceneNumber}</span>
                                        <span className="text-white font-medium">{scene.location}</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                    {scene.shots.length} SHOTS
                                </span>
                            </button>

                            {expandedScenes.includes(scene.sceneNumber) && (
                                <div className="p-4 border-t border-gray-800 space-y-3">
                                    <p className="text-gray-400 italic text-sm mb-4 pl-2 border-l-2 border-gray-700">
                                        "{scene.sceneDescription}"
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {scene.shots.map((shot) => (
                                            <ShotCard key={shot.shotNumber} shot={shot} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ShotCard: React.FC<{ shot: Shot }> = ({ shot }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-purple-500/30 transition-colors group">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-mono text-gray-500">#{shot.shotNumber}</span>
            <span className="text-xs font-bold text-purple-300 bg-purple-900/20 px-1.5 py-0.5 rounded">
                {shot.shotType}
            </span>
        </div>

        <div className="space-y-2">
            <div className="flex items-start gap-2">
                <Camera className="w-3 h-3 text-gray-500 mt-0.5" />
                <p className="text-xs text-gray-300 line-clamp-2" title={shot.composition}>
                    {shot.composition}
                </p>
            </div>

            {shot.action && (
                <div className="flex items-start gap-2">
                    <Video className="w-3 h-3 text-gray-500 mt-0.5" />
                    <p className="text-xs text-gray-400 line-clamp-2">
                        {shot.action}
                    </p>
                </div>
            )}

            {shot.dialogue && (
                <div className="flex items-start gap-2">
                    <Mic className="w-3 h-3 text-gray-500 mt-0.5" />
                    <p className="text-xs text-gray-500 italic line-clamp-1">
                        "{shot.dialogue}"
                    </p>
                </div>
            )}
        </div>
    </div>
);
