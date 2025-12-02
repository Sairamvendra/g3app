import React, { useState } from 'react';
import { CameraSettings } from '../types';
import { ArrowPathIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

interface CameraControlsProps {
  settings: CameraSettings;
  onChange: (newSettings: CameraSettings) => void;
  className?: string;
}

const CameraControls: React.FC<CameraControlsProps> = ({ settings, onChange, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleReset = (field: keyof CameraSettings, defaultValue: number) => {
    onChange({ ...settings, [field]: defaultValue });
  };

  // Helper to display semantic labels
  const getRotationLabel = (deg: number) => {
      const abs = Math.abs(deg);
      const dir = deg > 0 ? "Right" : "Left";
      if (abs < 10) return "Front View";
      if (abs < 45) return `Slight ${dir}`;
      if (abs < 80) return `3/4 View (${dir})`;
      if (abs < 110) return `Side Profile (${dir})`;
      if (abs < 160) return `Rear 3/4 (${dir})`;
      return "Back View";
  };

  const getZoomLabel = (val: number) => {
      if (val === 0) return "Default";
      if (val <= 2) return "Medium Shot";
      if (val <= 4) return "Med. Close-Up";
      if (val <= 7) return "Close-Up";
      if (val <= 9) return "Ext. Close-Up";
      return "Macro";
  };

  const getVerticalLabel = (val: number) => {
      if (Math.abs(val) < 0.2) return "Eye Level";
      if (val > 0.6) return "Bird's Eye";
      if (val > 0) return "High Angle";
      if (val < -0.6) return "Worm's Eye";
      return "Low Angle";
  };

  const isActive = settings.rotation !== 0 || settings.moveForward !== 0 || settings.verticalAngle !== 0 || settings.isWideAngle;

  return (
    <div className={`border border-zinc-800 rounded-xl bg-[#1e1e20] shadow-xl overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* Header (Always Visible) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex justify-between items-center bg-[#1e1e20] hover:bg-zinc-800 transition"
      >
        <div className="flex items-center gap-3">
             <div className="flex flex-col items-start">
                <h3 className="text-orange-500 font-bold text-sm uppercase tracking-wide">Camera Controls</h3>
                <div className={`h-0.5 bg-orange-500 mt-1 transition-all duration-300 ${isExpanded ? 'w-12' : 'w-4'}`}></div>
             </div>
             {isActive && !isExpanded && (
                <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded animate-pulse">
                    Active
                </span>
             )}
        </div>
        <div className="text-zinc-500">
            {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-5 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-200">
            
            {/* Rotate Right-Left */}
            <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-200 font-medium text-xs uppercase tracking-wider">Rotation (Pan)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-orange-300 font-mono">{getRotationLabel(settings.rotation)}</span>
                        
                        {/* Back View Preset */}
                        <button 
                            onClick={() => onChange({...settings, rotation: 180})}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border border-zinc-600 transition flex items-center gap-1"
                            title="Switch to Back View"
                        >
                            <ArrowUturnLeftIcon className="w-3 h-3" /> Back
                        </button>

                        <button 
                            onClick={() => handleReset('rotation', 0)}
                            className="text-zinc-500 hover:text-white transition"
                            title="Reset"
                        >
                            <ArrowPathIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-500 font-mono w-8 text-right">-180</span>
                    <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        step="5"
                        value={settings.rotation}
                        onChange={(e) => onChange({...settings, rotation: Number(e.target.value)})}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono w-8">180</span>
                </div>
            </div>

            {/* Move Forward -> Close-Up */}
            <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-200 font-medium text-xs uppercase tracking-wider">Distance (Dolly)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-orange-300 font-mono">{getZoomLabel(settings.moveForward)}</span>
                        <button 
                            onClick={() => handleReset('moveForward', 0)}
                            className="text-zinc-500 hover:text-white transition"
                            title="Reset"
                        >
                            <ArrowPathIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-500 font-mono w-8 text-right">0</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="0.5"
                        value={settings.moveForward}
                        onChange={(e) => onChange({...settings, moveForward: Number(e.target.value)})}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-200"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono w-8">10</span>
                </div>
            </div>

            {/* Vertical Angle */}
            <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-zinc-200 font-medium text-xs uppercase tracking-wider">Angle (Tilt)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-orange-300 font-mono">{getVerticalLabel(settings.verticalAngle)}</span>
                        <button 
                            onClick={() => handleReset('verticalAngle', 0)}
                            className="text-zinc-500 hover:text-white transition"
                            title="Reset"
                        >
                            <ArrowPathIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-500 font-mono w-8 text-right">-1</span>
                    <input 
                        type="range" 
                        min="-1" 
                        max="1" 
                        step="0.1"
                        value={settings.verticalAngle}
                        onChange={(e) => onChange({...settings, verticalAngle: Number(e.target.value)})}
                        className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                    />
                    <span className="text-[9px] text-zinc-500 font-mono w-8">1</span>
                </div>
            </div>

            {/* Wide Angle Lens */}
            <div className="pt-2 border-t border-zinc-700/50">
                <label className="flex items-center gap-3 cursor-pointer group bg-zinc-800/50 p-2 rounded-lg border border-transparent hover:border-zinc-700 transition">
                    <div 
                        className={`w-5 h-5 rounded border flex items-center justify-center transition flex-shrink-0 ${
                            settings.isWideAngle 
                            ? 'bg-orange-500 border-orange-500 text-white' 
                            : 'bg-zinc-800 border-zinc-600 group-hover:border-zinc-500'
                        }`}
                    >
                        {settings.isWideAngle && <CheckIcon className="w-3.5 h-3.5" />}
                    </div>
                    <input 
                        type="checkbox" 
                        checked={settings.isWideAngle}
                        onChange={(e) => onChange({...settings, isWideAngle: e.target.checked})}
                        className="hidden"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white group-hover:text-zinc-200 transition">Wide-Angle Lens</span>
                        <span className="text-[9px] text-zinc-500">Expands field of view (18-24mm)</span>
                    </div>
                </label>
            </div>
        </div>
      )}
    </div>
  );
};

export default CameraControls;