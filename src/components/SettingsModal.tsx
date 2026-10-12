import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Gauge,
  Sliders,
  Keyboard,
  RotateCcw,
  Check,
  AlertCircle,
  Monitor,
} from 'lucide-react';
import {
  GameSettings,
  GraphicsQuality,
  HandlingMode,
  KeyBindings,
  DEFAULT_KEY_BINDINGS,
} from '../game/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

type TabType = 'graphics' | 'audio' | 'gameplay' | 'controls';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('graphics');
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);
  const [rebindConflict, setRebindConflict] = useState<string | null>(null);

  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't allow Escape as anything other than pause
      if (e.code === 'Escape' && rebindingAction !== 'pause') {
        setRebindingAction(null);
        return;
      }

      // Check for duplicate key conflict
      const currentKeys = { ...settings.keyBindings };
      const duplicateAction = (Object.keys(currentKeys) as (keyof KeyBindings)[]).find(
        (action) => action !== rebindingAction && currentKeys[action] === e.code
      );

      if (duplicateAction) {
        setRebindConflict(`Key "${e.code}" is already bound to "${duplicateAction}"`);
        setTimeout(() => setRebindConflict(null), 2500);
        return;
      }

      // Assign new key binding
      currentKeys[rebindingAction] = e.code;
      onUpdateSettings({ keyBindings: currentKeys });
      setRebindingAction(null);
      setRebindConflict(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [rebindingAction, settings.keyBindings, onUpdateSettings]);

  if (!isOpen) return null;

  const handleRestoreDefaultBindings = () => {
    onUpdateSettings({ keyBindings: { ...DEFAULT_KEY_BINDINGS } });
    setRebindingAction(null);
    setRebindConflict(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 select-none font-sans text-white">
      <div className="relative flex flex-col h-[85vh] w-full max-w-3xl rounded-3xl bg-zinc-950 border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/30">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                GAME SETTINGS & CONFIGURATION
              </h2>
              <p className="text-xs text-zinc-400">
                Graphics quality, audio volume, driving physics & key remapping
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-900/40 px-6">
          <button
            onClick={() => setActiveTab('graphics')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'graphics'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Graphics</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Audio</span>
          </button>

          <button
            onClick={() => setActiveTab('gameplay')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'gameplay'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Gameplay</span>
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'controls'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Key Remapping</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. GRAPHICS TAB */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-3">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Graphics Quality Preset
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {(['medium', 'high', 'ultra'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => onUpdateSettings({ graphicsQuality: q })}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-amber-400'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Vehicle Paint Color
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-zinc-300">{settings.paintColor}</span>
                    <input
                      type="color"
                      value={settings.paintColor}
                      onChange={(e) => onUpdateSettings({ paintColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {[
                    { name: 'Crimson Red', hex: '#e11d48' },
                    { name: 'Velocity Blue', hex: '#2563eb' },
                    { name: 'Stealth Onyx', hex: '#18181b' },
                    { name: 'Cyber Emerald', hex: '#10b981' },
                    { name: 'Sunburst Gold', hex: '#f59e0b' },
                    { name: 'Neon Purple', hex: '#8b5cf6' },
                    { name: 'Pearl White', hex: '#f8fafc' },
                    { name: 'Sunset Orange', hex: '#ea580c' },
                    { name: 'Miami Cyan', hex: '#06b6d4' },
                    { name: 'Nardo Slate', hex: '#64748b' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => onUpdateSettings({ paintColor: c.hex })}
                      title={c.name}
                      className={`h-7 rounded-xl transition-all cursor-pointer relative ${
                        settings.paintColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">Real-Time Directional Shadows</div>
                  <div className="text-[11px] text-zinc-400">Soft PCF shadow maps for car and buildings</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ shadows: !settings.shadows })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
                    settings.shadows
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.shadows ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          )}

          {/* 2. AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">Master Sound State</div>
                  <div className="text-[11px] text-zinc-400">Enable or mute all audio synthesis</div>
                </div>
                <button
                  onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
                    settings.soundEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {settings.soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-300">
                  <span>Master Volume Level</span>
                  <span className="font-mono">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-300">
                  <span>Engine Exhaust & RPM Volume</span>
                  <span className="font-mono">{Math.round(settings.engineVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.engineVolume}
                  onChange={(e) => onUpdateSettings({ engineVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-300">
                  <span>Sound Effects & Ambience Volume</span>
                  <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 3. GAMEPLAY TAB */}
          {activeTab === 'gameplay' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Vehicle Handling Profile
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {(['simulation', 'arcade', 'drift'] as HandlingMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdateSettings({ handlingMode: m })}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        settings.handlingMode === m
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 border border-rose-400'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-300">
                  <span>Steering Sensitivity</span>
                  <span className="font-mono">{settings.steeringSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.steeringSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ steeringSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div className="rounded-2xl bg-zinc-900/70 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-zinc-300">
                  <span>Camera Mouse Orbit Sensitivity</span>
                  <span className="font-mono">{settings.cameraSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.cameraSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 4. KEY REMAPPING TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Custom Keyboard Keybinds
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Click any key to rebind. Press ESC to cancel rebinding.
                  </p>
                </div>

                <button
                  onClick={handleRestoreDefaultBindings}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              </div>

              {rebindConflict && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs font-semibold text-rose-300 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rebindConflict}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(settings.keyBindings) as (keyof KeyBindings)[]).map((action) => {
                  const currentCode = settings.keyBindings[action];
                  const isRebinding = rebindingAction === action;

                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-white/5"
                    >
                      <span className="text-xs font-medium text-zinc-300 capitalize">
                        {action.replace(/([A-Z])/g, ' $1')}
                      </span>

                      <button
                        onClick={() => setRebindingAction(action)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isRebinding
                            ? 'bg-amber-500 text-black animate-pulse shadow-md'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-white/10'
                        }`}
                      >
                        {isRebinding ? 'PRESS KEY...' : currentCode.replace('Key', '')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-zinc-900/60">
          <div className="text-[11px] text-zinc-500 font-mono">
            Settings automatically persist in local session
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 px-5 py-2 text-xs font-black uppercase text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>SAVE & RETURN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
