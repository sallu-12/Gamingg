import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, BookOpen, X } from 'lucide-react';
import { UNITY_PROJECT_SCRIPTS, UNITY_SETUP_GUIDE } from '../unity/scripts';

interface UnityCodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnityCodeViewer: React.FC<UnityCodeViewerProps> = ({ isOpen, onClose }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [viewingGuide, setViewingGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentScript = UNITY_PROJECT_SCRIPTS[selectedIdx];
  const activeContent = viewingGuide ? UNITY_SETUP_GUIDE : currentScript.code;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = viewingGuide ? 'UnitySetupGuide.md' : currentScript.filename;
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Downloads all 7 scripts sequentially
    UNITY_PROJECT_SCRIPTS.forEach((s) => {
      const blob = new Blob([s.code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = s.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 select-none font-sans text-white">
      <div className="relative flex flex-col h-[88vh] w-full max-w-5xl rounded-3xl bg-zinc-950 border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                UNITY C# ARCHITECTURE & SCRIPTS (PHASE 1)
              </h2>
              <p className="text-xs text-zinc-400">
                Production-ready C# components for Unity 2022/6000 LTS with WheelCollider physics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All .cs Files</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Code Editor */}
        <div className="flex flex-1 min-h-0">
          {/* Script List Sidebar */}
          <div className="w-64 border-r border-white/10 bg-zinc-900/40 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
              Unity C# Scripts
            </div>

            {UNITY_PROJECT_SCRIPTS.map((script, idx) => (
              <button
                key={script.filename}
                onClick={() => {
                  setSelectedIdx(idx);
                  setViewingGuide(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col gap-0.5 transition-all cursor-pointer ${
                  !viewingGuide && selectedIdx === idx
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="font-mono">{script.filename}</span>
                <span className="text-[10px] text-zinc-500 font-normal">{script.category}</span>
              </button>
            ))}

            <div className="pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-1">
                Documentation
              </div>
              <button
                onClick={() => setViewingGuide(true)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  viewingGuide
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Unity Setup Guide</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/80">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/10 bg-zinc-900/30">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-indigo-400 font-bold">
                  {viewingGuide ? 'UnitySetupGuide.md' : currentScript.path}
                </span>
                {!viewingGuide && (
                  <span className="text-[11px] text-zinc-500">({currentScript.description})</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 border border-white/10 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 border border-white/10 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Pre/Code Area */}
            <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-zinc-300 bg-zinc-950">
              <pre className="whitespace-pre">
                <code>{activeContent}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
