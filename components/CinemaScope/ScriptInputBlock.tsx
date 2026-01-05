import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ScriptInputBlockProps {
    onScriptReady: (content: string | File) => void;
}

export const ScriptInputBlock: React.FC<ScriptInputBlockProps> = ({ onScriptReady }) => {
    const [inputType, setInputType] = useState<'text' | 'file'>('text');
    const [textContent, setTextContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (inputType === 'text' && textContent.trim()) {
            onScriptReady(textContent);
        } else if (inputType === 'file' && selectedFile) {
            onScriptReady(selectedFile);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Step 1: Script Input
            </h2>

            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setInputType('text')}
                    className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${inputType === 'text'
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                            : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-750'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Paste Text
                </button>
                <button
                    onClick={() => setInputType('file')}
                    className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${inputType === 'file'
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
                            : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-750'
                        }`}
                >
                    <Upload className="w-4 h-4" />
                    Upload File
                </button>
            </div>

            {inputType === 'text' ? (
                <div className="space-y-4">
                    <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="EXT. CITY STREET - NIGHT\n\nRain slicks the pavement as DETECTIVE MILLER steps out of his car..."
                        className="w-full h-64 bg-gray-950 border border-gray-800 rounded-lg p-4 text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none font-mono text-sm leading-relaxed"
                    />
                    <div className="flex justify-end text-xs text-gray-500">
                        {textContent.length} characters
                    </div>
                </div>
            ) : (
                <div
                    className="border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center bg-gray-950/50 hover:bg-gray-950 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                    />

                    {selectedFile ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <p className="text-white font-medium mb-1">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                className="mt-4 text-sm text-red-400 hover:text-red-300"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-300 font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-sm text-gray-500">PDF, DOCX, or TXT (Max 10MB)</p>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={(inputType === 'text' && !textContent.trim()) || (inputType === 'file' && !selectedFile)}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/20"
            >
                Analyze Script
            </button>
        </div>
    );
};
