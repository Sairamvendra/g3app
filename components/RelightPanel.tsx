
import React, { useRef } from 'react';
import { RelightSettings, RelightLight } from '../types';
import { LightBulbIcon, SunIcon, MoonIcon, SparklesIcon, AdjustmentsHorizontalIcon, PowerIcon } from '@heroicons/react/24/solid';

interface RelightPanelProps {
  settings: RelightSettings;
  onChange: (settings: RelightSettings) => void;
}

const RelightPanel: React.FC<RelightPanelProps> = ({ settings, onChange }) => {
  
  // Toggle the entire module
  const toggleEnabled = () => {
    onChange({ ...settings, enabled: !settings.enabled });
  };

  const updateGel = (index: number, newColor: string) => {
    const newGels = [...settings.gels];
    newGels[index] = newColor;
    onChange({ ...settings, gels: newGels });
  };

  const updateLight = (key: keyof RelightSettings['lights'], updates: Partial<RelightLight>) => {
    onChange({
      ...settings,
      lights: {
        ...settings.lights,
        [key]: { ...settings.lights[key], ...updates }
      }
    });
  };

  const updateModifier = (key: keyof RelightSettings['modifiers'], value: number) => {
    onChange({
      ...settings,
      modifiers: {
        ...settings.modifiers,
        [key]: value
      }
    });
  };

  const renderGelPicker = (color: string, index: number) => {
    return (
      <div key={index} className="flex flex-col items-center gap-1 group relative">
         <div 
           className="w-10 h-10 rounded-full border-2 border-zinc-700 shadow-lg cursor-pointer hover:scale-110 transition-transform relative overflow-hidden"
           style={{ backgroundColor: color }}
         >
             <input 
               type="color" 
               value={color}
               onChange={(e) => updateGel(index, e.target.value)}
               className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
             />
         </div>
         <span className="text-[9px] text-zinc-500 font-mono uppercase">Gel {index + 1}</span>
      </div>
    );
  };

  const renderLightControl = (
    label: string, 
    lightKey: keyof RelightSettings['lights'], 
    icon: React.ReactNode
  ) => {
    const light = settings.lights[lightKey];
    
    // Get current gel color for the glowing indicator
    const activeGelColor = settings.gels[light.colorIndex];

    return (
      <div className={`bg-zinc-800/50 rounded-xl p-3 border ${light.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'} transition-all`}>
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${light.enabled ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
                    {icon}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wide ${light.enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
            </div>
            <button 
              onClick={() => updateLight(lightKey, { enabled: !light.enabled })}
              className={`w-8 h-4 rounded-full p-0.5 transition-colors ${light.enabled ? 'bg-green-500' : 'bg-zinc-700'}`}
            >
                <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${light.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        </div>

        {light.enabled && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Intensity Slider */}
                <div className="flex items-center gap-3">
                    <SunIcon className="w-3 h-3 text-zinc-500" />
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={light.intensity}
                        onChange={(e) => updateLight(lightKey, { intensity: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <span className="text-[10px] w-6 text-right font-mono text-zinc-400">{light.intensity}%</span>
                </div>

                {/* Gel Selector */}
                <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-zinc-500">Gel Color</span>
                    <div className="flex gap-1">
                        {settings.gels.map((gel, idx) => (
                            <button
                                key={idx}
                                onClick={() => updateLight(lightKey, { colorIndex: idx })}
                                className={`w-4 h-4 rounded-full border transition-all ${
                                    light.colorIndex === idx 
                                    ? 'border-white scale-125 ring-1 ring-white/20' 
                                    : 'border-transparent opacity-50 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: gel }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col min-w-0">
        
        {/* Header Toggle */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-600'}`}>
                    <LightBulbIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-base">Relight Studio</h3>
                    <p className="text-[10px] text-zinc-500">Virtual Lighting Mixer</p>
                </div>
            </div>
            <button 
                onClick={toggleEnabled}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    settings.enabled 
                    ? 'bg-amber-500 text-black hover:bg-amber-400' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
                <PowerIcon className="w-3 h-3" />
                {settings.enabled ? 'ON' : 'OFF'}
            </button>
        </div>

        <div className={`space-y-6 overflow-y-auto pr-2 scrollbar-hide flex-1 transition-opacity duration-300 ${settings.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none grayscale'}`}>
            
            {/* Gel Palette */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Gel Palette</label>
                <div className="flex justify-between px-2">
                    {settings.gels.map((gel, idx) => renderGelPicker(gel, idx))}
                </div>
            </div>

            {/* Fixtures */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Fixtures</label>
                {renderLightControl("Key Light", "key", <SunIcon className="w-4 h-4" />)}
                {renderLightControl("Rim Light", "rim", <SparklesIcon className="w-4 h-4" />)}
                {renderLightControl("Backlight", "back", <MoonIcon className="w-4 h-4" />)}
                {renderLightControl("Bounce Light", "bounce", <AdjustmentsHorizontalIcon className="w-4 h-4" />)}
            </div>

            {/* Modifiers */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-4">
                 <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Modifiers</label>
                 
                 {/* Diffuser */}
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Diffuser</span>
                        <span>{settings.modifiers.diffuser > 50 ? 'Soft' : 'Hard'}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={settings.modifiers.diffuser}
                        onChange={(e) => updateModifier('diffuser', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gradient-to-r from-zinc-700 to-zinc-400 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                 </div>

                 {/* Negative Fill */}
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Negative Fill</span>
                        <span>{settings.modifiers.negativeFill}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={settings.modifiers.negativeFill}
                        onChange={(e) => updateModifier('negativeFill', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-black border border-zinc-700"
                    />
                 </div>
            </div>

        </div>
    </div>
  );
};

export default RelightPanel;
