import React, { useState } from 'react';
import { Film, FileText, Layout, Scissors, Sparkles, ChevronRight } from 'lucide-react';
import { ScriptInputBlock } from './ScriptInputBlock';
import { StructureView } from './StructureView';
import { LoFiGenerator } from './LoFiGenerator';
import { FrameCropper } from './FrameCropper';
import { HiFiGenerator } from './HiFiGenerator';
import { ParsedScript, GeneratedPage, CroppedFrame, CinemaScopeStep } from './types';

export const CinemaScopePanel: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<CinemaScopeStep>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);
    const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
    const [croppedFrames, setCroppedFrames] = useState<CroppedFrame[]>([]);

    // Step 1: Handle Script Input -> Parse
    const handleScriptReady = async (input: string | File) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            if (input instanceof File) {
                formData.append('scriptFile', input);
            } else {
                formData.append('scriptContent', input);
            }

            const res = await fetch('/api/cinemascope/parse-script', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to parse script');
            const data: ParsedScript = await res.json();

            setParsedScript(data);
            setCurrentStep(2); // Move to Review
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Error parsing script');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 flex items-center gap-3">
                    <Film className="w-8 h-8 text-purple-500" />
                    CinemaScope
                </h1>
                <p className="text-gray-400 mt-2">
                    AI-Powered Script-to-Screen Storyboard Generator
                </p>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-4">
                <StepIndicator step={1} current={currentStep} icon={FileText} label="Script" />
                <ChevronRight className="w-4 h-4 text-gray-700" />
                <StepIndicator step={2} current={currentStep} icon={Layout} label="Structure" />
                <ChevronRight className="w-4 h-4 text-gray-700" />
                <StepIndicator step={3} current={currentStep} icon={Layout} label="Lo-Fi Boards" />
                <ChevronRight className="w-4 h-4 text-gray-700" />
                <StepIndicator step={4} current={currentStep} icon={Scissors} label="Crop" />
                <ChevronRight className="w-4 h-4 text-gray-700" />
                <StepIndicator step={5} current={currentStep} icon={Sparkles} label="Hi-Fi Render" />
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg">
                        Error: {error}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-fadeIn">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-purple-300 font-medium animate-pulse">Processing your script with AI...</p>
                    </div>
                )}

                {/* Steps */}
                {!loading && currentStep === 1 && (
                    <ScriptInputBlock onScriptReady={handleScriptReady} />
                )}

                {!loading && currentStep === 2 && parsedScript && (
                    <StructureView
                        parsedScript={parsedScript}
                        onProceed={() => setCurrentStep(3)}
                    />
                )}

                {!loading && currentStep === 3 && parsedScript && (
                    <div className="space-y-6">
                        <LoFiGenerator
                            parsedScript={parsedScript}
                            onPagesReady={(pages) => setGeneratedPages(pages)}
                        />

                        {generatedPages.length > 0 && (
                            <div className="flex justify-end pt-4 border-t border-gray-800">
                                <button
                                    onClick={() => setCurrentStep(4)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transform transition-all hover:scale-105 shadow-lg shadow-purple-900/20"
                                >
                                    Proceed to Cropping <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!loading && currentStep === 4 && parsedScript && (
                    <div className="space-y-6">
                        <FrameCropper
                            pages={generatedPages}
                            parsedScript={parsedScript}
                            onFramesReady={(frames) => setCroppedFrames(frames)}
                        />

                        {croppedFrames.length > 0 && (
                            <div className="flex justify-end pt-4 border-t border-gray-800">
                                <button
                                    onClick={() => setCurrentStep(5)}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black px-8 py-3 rounded-lg font-bold flex items-center gap-2 transform transition-all hover:scale-105 shadow-lg shadow-orange-900/20"
                                >
                                    <Sparkles className="w-5 h-5" /> Start Hi-Fi Rendering
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!loading && currentStep === 5 && (
                    <HiFiGenerator finalFrames={croppedFrames} />
                )}
            </div>
        </div>
    );
};

const StepIndicator: React.FC<{ step: number; current: number; icon: any; label: string }> = ({ step, current, icon: Icon, label }) => {
    const isActive = current === step;
    const isCompleted = current > step;

    return (
        <div className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full transition-colors ${isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' :
                isCompleted ? 'text-green-400' : 'text-gray-600'
            }`}>
            <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-400' : ''}`} />
            <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>{label}</span>
        </div>
    );
};
