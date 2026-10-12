import React from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Palette,
  Gauge,
  Settings,
  Code2,
  X,
  Sun,
  Sunset,
  Moon,
  Cloud,
  CloudRain,
  Car,
  Flag,
  Target,
  Trophy,
  Map as MapIcon,
  Home,
  Package,
} from 'lucide-react';
import { GameSettings, HandlingMode, TimeOfDay, WeatherType, MissionType } from '../game/types';

interface PauseMenuProps {
  isOpen: boolean;
  settings: GameSettings;
  activeMissionType: MissionType;
  onResume: () => void;
  onResetVehicle: () => void;
  onOpenSettings: () => void;
  onOpenMap: () => void;
  onReturnToMainMenu: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onSelectMission: (type: MissionType) => void;
  onOpenUnityCode: () => void;
}

const PAINT_COLORS = [
  { name: 'Hyper Crimson', hex: '#e11d48' },
  { name: 'Obsidian Jet', hex: '#18181b' },
  { name: 'Cyber Cyan', hex: '#0284c7' },
  { name: 'Aurora Gold', hex: '#d97706' },
  { name: 'Arctic Pearl', hex: '#f8fafc' },
  { name: 'Acid Lime', hex: '#65a30d' },
];

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  settings,
  activeMissionType,
  onResume,
  onResetVehicle,
  onOpenSettings,
  onOpenMap,
  onReturnToMainMenu,
  onUpdateSettings,
  onSelectMission,
  onOpenUnityCode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 select-none">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-950/95 border border-white/20 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase text-white">GAME PAUSED</h2>
              <p className="text-xs text-zinc-400">Apex Velocity — Phase 3 Polish & Controls</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                settings.soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              }`}
              title={settings.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={onResume}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options & Settings */}
        <div className="space-y-3 text-sm">
          {/* Quick Access Utility Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onResume();
                onOpenMap();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 p-3 text-xs font-bold text-sky-300 border border-sky-500/30 transition-all cursor-pointer shadow-md"
            >
              <MapIcon className="w-4 h-4 text-sky-400" />
              <span>Open City GPS Map</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 p-3 text-xs font-bold text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-md"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Full Settings & Remap</span>
            </button>
          </div>

          {/* Driving Missions / Challenges */}
          <div className="rounded-2xl bg-zinc-900/80 p-3.5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <Flag className="w-4 h-4" />
                <span>DRIVING MISSIONS & OBJECTIVES</span>
              </span>
              <span className="text-[10px] text-zinc-500 uppercase">Interactive</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onSelectMission('checkpoint_sprint')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                  activeMissionType === 'checkpoint_sprint'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 border border-sky-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Sprint Race</span>
              </button>

              <button
                onClick={() => onSelectMission('precision_park')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                  activeMissionType === 'precision_park'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Precision Park</span>
              </button>

              <button
                onClick={() => onSelectMission('drift_master')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                  activeMissionType === 'drift_master'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 border border-rose-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Drift King</span>
              </button>

              <button
                onClick={() => onSelectMission('delivery_rush')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 text-center ${
                  activeMissionType === 'delivery_rush'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>
            </div>
          </div>

          {/* Time of Day & Weather Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time of Day */}
            <div className="rounded-2xl bg-zinc-900/80 p-3 border border-white/5 space-y-1.5">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>TIME OF DAY</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['day', 'sunset', 'night'] as TimeOfDay[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => onUpdateSettings({ timeOfDay: t })}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                      settings.timeOfDay === t
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div className="rounded-2xl bg-zinc-900/80 p-3 border border-white/5 space-y-1.5">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                <span>WEATHER</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['clear', 'cloudy', 'rain'] as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateSettings({ weather: w })}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                      settings.weather === w
                        ? 'bg-sky-500/30 text-sky-300 border border-sky-400/50'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicle Paint Customizer */}
          <div className="rounded-2xl bg-zinc-900/80 p-3 border border-white/5 space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>CAR PAINT FINISH</span>
            </span>
            <div className="flex items-center justify-between gap-2">
              {PAINT_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => onUpdateSettings({ paintColor: c.hex })}
                  title={c.name}
                  className={`h-9 w-9 rounded-xl transition-all cursor-pointer border-2 ${
                    settings.paintColor === c.hex
                      ? 'scale-110 border-white shadow-lg'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Unity C# Architecture Export Banner */}
          <button
            onClick={() => {
              onResume();
              onOpenUnityCode();
            }}
            className="w-full flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-900/60 to-blue-900/60 hover:from-indigo-800/80 hover:to-blue-800/80 p-3 border border-indigo-500/30 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Unity C# Architecture Workspace</div>
                <div className="text-[11px] text-zinc-400">Complete scripts, WheelCollider & AI setup</div>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-300">OPEN &rarr;</span>
          </button>
          {/* Creator Attribution */}
          <div className="rounded-2xl bg-zinc-900/60 p-3 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Created by:</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-emerald-400">Rehan Sheikh-158</span>
              <span className="text-zinc-600">•</span>
              <span className="text-sky-400">Sujal Jogade</span>
              <span className="text-zinc-600">•</span>
              <span className="text-amber-400">Prathamesh</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-4 flex items-center gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onResume}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 py-3 text-sm font-black text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            onClick={() => {
              onResetVehicle();
              onResume();
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 py-3 px-4 text-xs font-bold text-zinc-200 transition-colors cursor-pointer border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET CAR</span>
          </button>

          <button
            onClick={onReturnToMainMenu}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 py-3 px-3 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="Return to Main Menu"
          >
            <Home className="w-3.5 h-3.5" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
