import React from 'react';
import { Play, Settings, HelpCircle, Code2, Flag, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { MissionType } from '../game/types';

interface MainMenuProps {
  isOpen: boolean;
  onPlay: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onOpenUnityCode: () => void;
  onSelectMission: (type: MissionType) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  isOpen,
  onPlay,
  onOpenSettings,
  onOpenControls,
  onOpenUnityCode,
  onSelectMission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-6 select-none font-sans text-white">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-950/95 border border-white/20 p-8 shadow-2xl shadow-black/90 text-center flex flex-col items-center">
        {/* Title & Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-rose-400 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AAA 3D OPEN-WORLD DRIVING ENGINE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.2)] mb-2">
          APEX VELOCITY
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mb-8">
          Phase 3 Complete Driving Experience: Full PC Controls, Traffic AI, Dynamic Weather, Dual Cameras & Missions.
        </p>

        {/* Primary Menu Options */}
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={onPlay}
            className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 py-4 text-base font-black tracking-wider uppercase text-white shadow-xl shadow-rose-600/30 transition-transform active:scale-98 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY GAME</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onPlay();
                onSelectMission('checkpoint_sprint');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4 text-sky-400" />
              <span>Sprint Race</span>
            </button>

            <button
              onClick={() => {
                onPlay();
                onSelectMission('precision_park');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4 text-emerald-400" />
              <span>Precision Park</span>
            </button>

            <button
              onClick={() => {
                onPlay();
                onSelectMission('drift_master');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>Drift King</span>
            </button>

            <button
              onClick={() => {
                onPlay();
                onSelectMission('delivery_rush');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-200 border border-white/10 transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4 text-amber-400" />
              <span>Delivery Rush</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 py-3 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={onOpenControls}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 py-3 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Controls</span>
            </button>

            <button
              onClick={onOpenUnityCode}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/70 py-3 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Unity C#</span>
            </button>
          </div>
        </div>

        {/* Footer Features & Development Credits Badge */}
        <div className="mt-8 pt-4 border-t border-white/10 w-full flex flex-col items-center gap-2 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center justify-center gap-6">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>PhysX Wheel Dynamics</span>
            </span>
            <span>•</span>
            <span>Adaptive AI Traffic</span>
            <span>•</span>
            <span>Day/Sunset/Rain Cycles</span>
          </div>
          <div className="text-[11px] font-sans text-zinc-400 flex items-center gap-1.5">
            <span>Created by:</span>
            <span className="font-bold text-emerald-400">Rehan Sheikh-158</span>
            <span>•</span>
            <span className="font-bold text-sky-400">Sujal Jogade</span>
            <span>•</span>
            <span className="font-bold text-amber-400">Prathamesh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
