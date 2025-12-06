import React, { useState, useEffect, useRef } from 'react';
import PromptArchitect from './components/PromptArchitect';
import StudioPanel from './components/StudioPanel';

import { ChevronRightIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [transferredPrompt, setTransferredPrompt] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Check viewport for responsive behavior
  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Resize Handlers
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(300, Math.min(e.clientX, window.innerWidth - 400));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handlePromptFinalized = (prompt: string) => {
    setTransferredPrompt(prompt);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-300">



      {/* Left Panel: Prompt Architect */}
      <div
        className={`relative z-20 border-r border-[var(--border-color)] shadow-2xl flex-none ${
          // Only animate when NOT resizing to avoid jitter
          isResizing ? '' : 'transition-all duration-300 ease-out'
          } ${!isSidebarOpen ? 'md:w-auto w-full h-12 md:h-full' : 'w-full md:w-auto'
          }`}
        style={{
          width: (isDesktop && isSidebarOpen) ? sidebarWidth : undefined,
          height: (!isDesktop && isSidebarOpen) ? '50%' : undefined
        }}
      >
        <PromptArchitect
          onPromptFinalized={handlePromptFinalized}
          isCollapsed={!isSidebarOpen}
          toggleCollapse={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Resize Handle (Desktop Only) */}
      {isDesktop && isSidebarOpen && (
        <div
          onMouseDown={startResizing}
          className={`w-1 h-full cursor-col-resize hover:bg-[var(--brand-primary)] transition-colors z-30 flex-none bg-[var(--bg-panel)] border-r border-[var(--border-color)] ${isResizing ? 'bg-[var(--brand-primary)]' : ''}`}
        />
      )}

      {/* Right Panel: Studio */}
      <div className="flex-1 h-full bg-[var(--bg-main)] relative overflow-hidden flex flex-col min-w-0">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}>
        </div>

        {/* Mobile Toggle Trigger (when sidebar is collapsed on mobile) */}
        {!isSidebarOpen && !isDesktop && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 md:hidden bg-[var(--bg-card)] p-2 rounded-lg text-[var(--text-primary)] shadow-lg border border-[var(--border-color)]"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}

        <div className="relative z-10 flex-1 h-full min-w-0">
          <StudioPanel initialPrompt={transferredPrompt} />
        </div>
      </div>
    </div>
  );
};

export default App;