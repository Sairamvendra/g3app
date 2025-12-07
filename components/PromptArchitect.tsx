
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { refinePromptWithReplicate } from '../services/replicateService';
import { PaperAirplaneIcon, DocumentTextIcon, PhotoIcon, SparklesIcon, ChevronRightIcon, CheckCircleIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

interface PromptArchitectProps {
  onPromptFinalized: (prompt: string) => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const DEFAULT_SYSTEM_INSTRUCTION = 'You are an expert prompt engineer. Help the user create a highly detailed, structured image generation prompt. Ask clarifying questions if the idea is vague. Once the details are settled, provide the Final Prompt in a clearly marked code block.';
const STORAGE_KEY = 'gemini_architect_system_instruction';

const PromptArchitect: React.FC<PromptArchitectProps> = ({ onPromptFinalized, isCollapsed, toggleCollapse }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your AI Prompt Architect. Describe your idea or upload a storyboard, and I'll help you structure the perfect prompt." }
  ]);
  const [input, setInput] = useState('');

  // Initialize system instruction from localStorage or default
  const [systemInstruction, setSystemInstruction] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return saved;
    }
    return DEFAULT_SYSTEM_INSTRUCTION;
  });

  const [storyboard, setStoryboard] = useState<File | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Settings UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSaveSystemInstruction = () => {
    localStorage.setItem(STORAGE_KEY, systemInstruction);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSettingsOpen(false);
    }, 1000);
  };

  const handleSend = async () => {
    if (!input.trim() && !storyboard) return;

    const userMessage: Message = { role: 'user', text: input };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsThinking(true);

    try {
      const responseText = await refinePromptWithReplicate(
        newHistory,
        systemInstruction,
        storyboard
      );

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      setStoryboard(null);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error while thinking. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    onPromptFinalized(text); // Also send to the other panel
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render content with robust code block detection
  const renderMessageContent = (text: string, msgIndex: number) => {
    const parts = [];
    const regex = /```(?:[\w-]*\n)?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      // Code block
      parts.push({ type: 'code', content: match[1] });
      lastIndex = regex.lastIndex;
    }
    // Remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    // If regex failed to match anything (no code blocks), return as single text part
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return (
      <div className="min-w-0 w-full">
        {parts.map((part, partIdx) => {
          if (part.type === 'code') {
            const uniqueId = msgIndex * 1000 + partIdx;
            const isCopied = copiedIndex === uniqueId;
            return (
              <div key={partIdx} className="relative mt-3 mb-3 group/code">
                <div className="absolute -top-3 right-2 z-10">
                  <button
                    onClick={() => copyToClipboard(part.content.trim(), uniqueId)}
                    className={`text-xs px-2 py-1 rounded-md shadow-lg flex items-center gap-1 cursor-pointer transition-all duration-200 ${isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                  >
                    {isCopied ? <CheckCircleIcon className="w-3 h-3" /> : <DocumentTextIcon className="w-3 h-3" />}
                    {isCopied ? 'Sent!' : 'Use Prompt'}
                  </button>
                </div>
                <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-green-400 font-mono text-xs border border-[var(--border-color)]/50 max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words min-w-0">
                  {part.content.trim()}
                </pre>
              </div>
            );
          }
          return <span key={partIdx} className="whitespace-pre-wrap break-words">{part.content}</span>;
        })}

        {/* Fallback button if no code blocks were found but it's a model message */}
        {!parts.some(p => p.type === 'code') && (
          <div className="mt-2 pt-2 border-t border-white/10 flex justify-end" data-testid="transfer-container">
            <button
              onClick={() => copyToClipboard(text, msgIndex)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors flex items-center gap-1 ${copiedIndex === msgIndex
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : 'bg-white/5 text-[var(--text-secondary)] border-white/10 hover:bg-white/10'
                }`}
              data-testid="transfer-btn"
            >
              {copiedIndex === msgIndex ? <CheckCircleIcon className="w-3 h-3" /> : <ArrowTopRightOnSquareIcon className="w-3 h-3" />}
              Use Full Text as Prompt
            </button>
          </div>
        )}
      </div>
    );
  };

  // Minimal Collapsed View
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-panel)] border-r border-[var(--border-color)] items-center py-4 w-full">
        <button
          onClick={toggleCollapse}
          className="p-2 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition mb-4"
          title="Expand"
        >
          <ArrowsPointingOutIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col items-center gap-4">
          <span
            onClick={toggleCollapse}
            className="[writing-mode:vertical-rl] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium tracking-widest uppercase rotate-180 cursor-pointer transition select-none"
          >
            Prompt Architect
          </span>
          <div className="w-8 h-[1px] bg-[var(--border-color)]"></div>
          <button onClick={toggleCollapse} className="p-2 text-indigo-500 hover:text-indigo-400">
            <SparklesIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] min-w-0">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] backdrop-blur-md sticky top-0 z-10 flex items-start justify-between">
        <div className="flex-1 mr-2 min-w-0">
          <div
            onClick={toggleCollapse}
            className="flex items-center space-x-2 mb-2 cursor-pointer group select-none"
            title="Collapse Panel"
          >
            <SparklesIcon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition flex-shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-indigo-300 transition truncate">Prompt Architect</h2>
          </div>

          {/* System Instructions Toggle/Input */}
          <div className="border border-[var(--border-color)] rounded-lg bg-[var(--bg-input)] overflow-hidden transition-all duration-300">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full flex items-center justify-between p-2 text-xs text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-[var(--bg-hover)]/50 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <ChevronRightIcon className={`w-3 h-3 transition-transform duration-200 flex-shrink-0 ${isSettingsOpen ? 'rotate-90' : ''}`} />
                <span className="truncate">Configure System Instructions</span>
              </div>
            </button>

            {isSettingsOpen && (
              <div className="p-2 border-t border-[var(--border-color)] animate-in slide-in-from-top-2 fade-in duration-200">
                <textarea
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs p-3 rounded border border-[var(--border-color)] focus:border-indigo-500 outline-none resize-y min-h-[100px] mb-2"
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  placeholder="Define how the AI should behave..."
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSystemInstruction}
                    className={`text-xs px-4 py-1.5 rounded flex items-center gap-1.5 transition-all duration-200 font-medium ${saveSuccess
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      }`}
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircleIcon className="w-3 h-3" /> Saved
                      </>
                    ) : (
                      "Save Prompt"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={toggleCollapse}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition flex-shrink-0"
          title="Minimize Panel"
        >
          <ArrowsPointingInIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] rounded-2xl p-4 min-w-0 ${msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-[var(--bg-card)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border-color)]'
              }`}>
              <div className="text-sm leading-relaxed font-light break-words">
                {msg.role === 'model' ? renderMessageContent(msg.text, idx) : msg.text}
              </div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-[var(--bg-card)] text-indigo-400 px-4 py-2 rounded-full text-xs flex items-center gap-2 border border-[var(--border-color)]">
              <SparklesIcon className="w-3 h-3 animate-spin" />
              AI is Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-color)] min-w-0">
        {storyboard && (
          <div className="flex items-center gap-2 mb-2 bg-[var(--bg-input)] p-2 rounded-lg w-fit border border-[var(--border-color)] max-w-full">
            <PhotoIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <span className="text-xs text-[var(--text-secondary)] truncate">{storyboard.name}</span>
            <button
              onClick={() => setStoryboard(null)}
              className="text-[var(--text-muted)] hover:text-red-400 ml-2 flex-shrink-0"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-[var(--text-muted)] hover:text-indigo-400 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] rounded-xl transition flex-shrink-0"
            title="Upload Storyboard/Reference"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => e.target.files && setStoryboard(e.target.files[0])}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your idea..."
            className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl p-3 max-h-32 min-h-[48px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-[var(--border-color)] text-sm font-light min-w-0"
          />

          <button
            onClick={handleSend}
            disabled={isThinking || (!input.trim() && !storyboard)}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition shadow-lg shadow-indigo-500/20 flex-shrink-0"
            data-testid="send-button"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptArchitect;
