import React, { useState } from 'react';
import {
  Camera,
  Eye,
  HelpCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Lightbulb,
  Play,
  Code2,
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Cloud,
  Flag,
  Target,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Map as MapIcon,
  Compass,
  ArrowLeft,
  ArrowRight,
  Package,
  Zap,
  Smartphone,
  Sparkles,
  Star,
  RefreshCw,
  Minimize2,
  Maximize2,
  ChevronDown,
  Palette,
  X,
  Gauge,
  Users,
  Award,
  Heart,
  ExternalLink,
} from 'lucide-react';
import {
  VehicleTelemetry,
  CameraMode,
  MissionState,
  TimeOfDay,
  WeatherType,
  MissionType,
  NavigationDestination,
  SpeedTrapEvent,
  StuntJumpEvent,
} from '../game/types';

interface HUDProps {
  telemetry: VehicleTelemetry;
  cameraMode: CameraMode;
  speedUnit: 'kmh' | 'mph';
  soundEnabled: boolean;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  missionState: MissionState;
  activeDestination: NavigationDestination | null;
  trafficPositions: { x: number; z: number }[];
  showHelpOverlay: boolean;
  speedTrapEvent?: SpeedTrapEvent | null;
  stuntJumpEvent?: StuntJumpEvent | null;
  showVirtualPedals: boolean;
  carColor?: string;
  onChangeCarColor?: (color: string) => void;
  onToggleVirtualPedals: () => void;
  onPedalPress: (control: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'handbrake', active: boolean) => void;
  onCancelMission: () => void;
  onToggleHelp: () => void;
  onOpenMap: () => void;
  onToggleSound: () => void;
  onToggleCamera: () => void;
  onToggleRearView: () => void;
  onToggleLights: () => void;
  onToggleIndicatorLeft: () => void;
  onToggleIndicatorRight: () => void;
  onResetVehicle: () => void;
  onOpenPause: () => void;
  onOpenUnityCode: () => void;
  onCycleTimeOfDay: () => void;
  onCycleWeather: () => void;
  onStartMission: (type: MissionType) => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  cameraMode,
  speedUnit,
  soundEnabled,
  timeOfDay,
  weather,
  missionState,
  activeDestination,
  trafficPositions,
  showHelpOverlay,
  speedTrapEvent,
  stuntJumpEvent,
  showVirtualPedals,
  onToggleVirtualPedals,
  onPedalPress,
  onCancelMission,
  onToggleHelp,
  onOpenMap,
  onToggleSound,
  onToggleCamera,
  onToggleRearView,
  onToggleLights,
  onToggleIndicatorLeft,
  onToggleIndicatorRight,
  onResetVehicle,
  onOpenPause,
  onOpenUnityCode,
  onCycleTimeOfDay,
  onCycleWeather,
  onStartMission,
  carColor = '#e11d48',
  onChangeCarColor,
}) => {
  const [isMiniMapMinimized, setIsMiniMapMinimized] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [isMiniMapDismissed, setIsMiniMapDismissed] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [isSpeedoHidden, setIsSpeedoHidden] = useState(false);

  const displaySpeed = speedUnit === 'kmh' ? telemetry.speedKmh : telemetry.speedMph;
  const unitLabel = speedUnit === 'kmh' ? 'KM/H' : 'MPH';
  const rpmPercent = Math.min(100, (telemetry.rpm / 8000) * 100);
  const isRedline = telemetry.rpm > 6800;

  // Mini-map coordinates
  const mapWidth = 150;
  const mapHeight = 150;
  const mapCarX = Math.max(6, Math.min(mapWidth - 6, ((telemetry.position.x + 160) / 320) * mapWidth));
  const mapCarY = Math.max(6, Math.min(mapHeight - 6, ((telemetry.position.z + 220) / 440) * mapHeight));
  const mapHeadingDeg = (-telemetry.heading * 180) / Math.PI;

  // GPS Distance
  const gpsDistance = activeDestination
    ? Math.round(Math.hypot(telemetry.position.x - activeDestination.x, telemetry.position.z - activeDestination.z))
    : null;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans text-white">
      {/* Top Header Bar - Clean, Compact & Streamlined */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        {/* Left: Brand Badge & Key Speed Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Clickable APEX Creator Badge */}
          <button
            onClick={() => setShowCreditsModal(true)}
            title="Created by Rehan Sheikh-158, Sujal Jogade, Prathamesh (Click to view Creators)"
            className="pointer-events-auto group flex items-center gap-1.5 rounded-xl bg-black/75 hover:bg-zinc-900 px-2.5 py-1.5 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/60 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse group-hover:scale-125 transition-transform" />
            <span className="text-xs font-black tracking-wider text-white group-hover:text-emerald-300 transition-colors">APEX</span>
            <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              DEV TEAM
            </span>
          </button>

          {/* Minimal Speed & Gear Pill */}
          <div className="flex items-center gap-1 rounded-xl bg-black/70 px-2.5 py-1.5 backdrop-blur-md border border-white/10 shadow-md text-xs font-mono">
            <span className="text-sm font-black text-white">{displaySpeed}</span>
            <span className="text-[10px] text-sky-400 font-bold">{unitLabel}</span>
            <span className="text-[10px] font-black px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">
              G{telemetry.gear}
            </span>
          </div>

          {/* Camera View Mode */}
          <button
            onClick={onToggleCamera}
            title="Cycle Camera View [C]"
            className="pointer-events-auto flex items-center gap-1 rounded-xl bg-black/60 hover:bg-black/80 px-2 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 cursor-pointer transition-colors"
          >
            {cameraMode === 'chase' && <Camera className="w-3.5 h-3.5 text-sky-400" />}
            {cameraMode === 'cockpit' && <Eye className="w-3.5 h-3.5 text-amber-400" />}
            {cameraMode === 'rearview' && <Compass className="w-3.5 h-3.5 text-rose-400" />}
            <span className="hidden md:inline uppercase text-[11px]">{cameraMode}</span>
          </button>

          {/* Time & Weather Quick Buttons (Hidden on tiny phones to save space) */}
          <button
            onClick={onCycleTimeOfDay}
            className="pointer-events-auto hidden sm:flex items-center gap-1 rounded-xl bg-black/60 hover:bg-black/80 px-2 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 cursor-pointer transition-colors"
            title="Cycle Time of Day"
          >
            {timeOfDay === 'day' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
            {timeOfDay === 'sunset' && <Sunset className="w-3.5 h-3.5 text-orange-400" />}
            {timeOfDay === 'night' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>

          <button
            onClick={onCycleWeather}
            className="pointer-events-auto hidden sm:flex items-center gap-1 rounded-xl bg-black/60 hover:bg-black/80 px-2 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 cursor-pointer transition-colors"
            title="Cycle Weather"
          >
            {weather === 'clear' && <Sun className="w-3.5 h-3.5 text-sky-400" />}
            {weather === 'cloudy' && <Cloud className="w-3.5 h-3.5 text-zinc-400" />}
            {weather === 'rain' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
          </button>

          {telemetry.isDrifting && (
            <div className="flex items-center gap-1 rounded-xl bg-rose-500/90 px-2.5 py-1 backdrop-blur-md border border-rose-400/40 text-[11px] font-black tracking-wider text-white shadow-lg animate-pulse">
              <span>DRIFT</span>
              <span className="text-[10px] font-mono">{(telemetry.driftSlip * 10).toFixed(1)}G</span>
            </div>
          )}
        </div>

        {/* Right: Streamlined Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Quick Mission Pill (Desktops/Tablets) */}
          <div className="hidden lg:flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/10 backdrop-blur-md text-[11px] font-bold">
            <button
              onClick={() => onStartMission('checkpoint_sprint')}
              title="Start Downtown Sprint"
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                missionState.type === 'checkpoint_sprint'
                  ? 'bg-sky-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sprint
            </button>
            <button
              onClick={() => onStartMission('precision_park')}
              title="Start Precision Park"
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                missionState.type === 'precision_park'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Park
            </button>
            <button
              onClick={() => onStartMission('drift_master')}
              title="Start Drift King"
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                missionState.type === 'drift_master'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Drift
            </button>
          </div>

          {/* Car Paint Color Picker Button */}
          {onChangeCarColor && (
            <button
              onClick={() => setShowColorPicker((prev) => !prev)}
              title="Change Car Color"
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold backdrop-blur-md border transition-all cursor-pointer ${
                showColorPicker
                  ? 'bg-rose-500/30 text-rose-300 border-rose-400/50 shadow-md'
                  : 'bg-black/60 text-zinc-300 border-white/10 hover:text-white hover:bg-black/80'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-rose-400" />
              <span
                className="w-3 h-3 rounded-full border border-white/70 shadow-xs"
                style={{ backgroundColor: carColor }}
              />
            </button>
          )}

          {/* Mini-map restore button if dismissed */}
          {isMiniMapDismissed && (
            <button
              onClick={() => {
                setIsMiniMapDismissed(false);
                setIsMiniMapMinimized(false);
              }}
              title="Show GPS Radar"
              className="flex items-center gap-1 rounded-xl bg-black/60 hover:bg-black/80 px-2 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 hover:text-sky-300 cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5 text-sky-400" />
            </button>
          )}

          {/* Full Map Toggle [M] */}
          <button
            onClick={onOpenMap}
            title="Open City GPS Navigation Map [M]"
            className="flex items-center gap-1 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white px-2.5 py-1.5 text-xs font-bold backdrop-blur-md border border-sky-400/40 transition-colors cursor-pointer shadow-md"
          >
            <MapIcon className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Map</span>
          </button>

          {/* Virtual Pedals Toggle */}
          <button
            onClick={onToggleVirtualPedals}
            title="Toggle On-Screen Touch / Mouse Pedals"
            className={`flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-bold backdrop-blur-md border transition-colors cursor-pointer ${
              showVirtualPedals
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/40'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          {/* Lights [L] */}
          <button
            onClick={onToggleLights}
            title="Toggle Headlights [L]"
            className={`p-1.5 sm:p-2 rounded-xl backdrop-blur-md border transition-colors cursor-pointer ${
              telemetry.headlightsOn
                ? 'bg-sky-500/30 text-sky-300 border-sky-400/40'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>

          {/* Audio Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            className="p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Reset Vehicle [R] */}
          <button
            onClick={onResetVehicle}
            title="Reset Vehicle [R]"
            className="p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Pause Menu [ESC] */}
          <button
            onClick={onOpenPause}
            title="Pause Menu [ESC]"
            className="flex items-center gap-1 rounded-xl bg-black/80 hover:bg-zinc-900 text-white px-2.5 py-1.5 text-xs font-bold backdrop-blur-md border border-white/20 transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">MENU</span>
          </button>
        </div>
      </div>

      {/* Floating Car Color Customizer Tray */}
      {showColorPicker && onChangeCarColor && (
        <div className="pointer-events-auto absolute top-16 right-4 sm:right-24 z-40 flex flex-col items-center gap-2 rounded-2xl bg-zinc-950/95 p-3.5 backdrop-blur-xl border border-white/20 shadow-2xl animate-fade-in max-w-xs">
          <div className="flex items-center justify-between w-full pb-1.5 border-b border-white/10 text-[11px] font-bold text-zinc-300">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Palette className="w-3.5 h-3.5" />
              <span>CAR PAINT COLOR</span>
            </span>
            <button
              onClick={() => setShowColorPicker(false)}
              className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 py-1 w-full justify-items-center">
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
                onClick={() => onChangeCarColor(c.hex)}
                title={c.name}
                className={`w-7 h-7 rounded-xl transition-all cursor-pointer relative shadow-md ${
                  carColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          <div className="w-full flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-zinc-400">
            <span>Custom Shade:</span>
            <label className="flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10">
              <span className="font-mono text-zinc-200">{carColor}</span>
              <input
                type="color"
                value={carColor}
                onChange={(e) => onChangeCarColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
            </label>
          </div>
        </div>
      )}

      {/* Professional Creators & Development Team Credits Modal */}
      {showCreditsModal && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950/95 p-6 sm:p-7 border border-white/15 shadow-2xl overflow-hidden text-left">
            {/* Ambient Decorative Glow */}
            <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-52 h-52 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/30">
                  <Award className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black tracking-wider text-white">APEX VELOCITY</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      OFFICIAL CREDITS
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    Master Architects, Engine Physics & Simulation Leads
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreditsModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
                title="Close Credits"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Creators Highlight Cards */}
            <div className="relative mt-5 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Lead Creators & Development Team</span>
              </div>

              {/* Creator 1: Rehan Sheikh-158 */}
              <div className="group rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 p-3.5 border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black text-sm">
                    RS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                        Rehan Sheikh-158
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        LEAD DEV & CREATOR
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Game Director • City World Architecture • Systems Lead
                    </p>
                  </div>
                </div>
                <div className="text-emerald-400/80">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
              </div>

              {/* Creator 2: Sujal Jogade */}
              <div className="group rounded-2xl bg-gradient-to-r from-sky-950/40 via-zinc-900/60 to-zinc-900/40 p-3.5 border border-sky-500/30 hover:border-sky-400/60 transition-all flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-black text-sm">
                    SJ
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                        Sujal Jogade
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                        CO-CREATOR
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Vehicle Dynamics • Gameplay Design • Mechanics Specialist
                    </p>
                  </div>
                </div>
                <div className="text-sky-400/80">
                  <Zap className="w-4 h-4" />
                </div>
              </div>

              {/* Creator 3: Prathamesh */}
              <div className="group rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900/40 p-3.5 border border-amber-500/30 hover:border-amber-400/60 transition-all flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-sm">
                    PR
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                        Prathamesh
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        CO-CREATOR
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      UI/UX Architecture • Sound Synthesizer • Mission Design
                    </p>
                  </div>
                </div>
                <div className="text-amber-400/80">
                  <Star className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Special Dedication Badge */}
            <div className="relative mt-4 rounded-xl bg-black/60 p-3 border border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                <span>Crafted with passion by <strong>Rehan Sheikh-158</strong>, <strong>Sujal Jogade</strong> & <strong>Prathamesh</strong></span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">v3.4 PRO</span>
            </div>

            {/* Modal Bottom Button */}
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowCreditsModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
              >
                CLOSE & CONTINUE DRIVING
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active GPS Waypoint Guidance Banner */}
      {activeDestination && (
        <div className="absolute top-16 left-6 rounded-xl bg-black/75 px-3.5 py-1.5 backdrop-blur-md border border-amber-400/40 text-xs font-semibold text-amber-300 flex items-center gap-2 shadow-lg">
          <Compass className="w-4 h-4 text-amber-400 animate-spin" />
          <span>GPS: {activeDestination.name}</span>
          <span className="font-mono text-zinc-300">({gpsDistance}m)</span>
        </div>
      )}

      {/* Active Mission Objective Banner */}
      {missionState.type !== 'none' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-2xl bg-black/80 px-6 py-2.5 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-6">
          <div className="flex items-center gap-2">
            {missionState.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : missionState.status === 'failed' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Target className="w-5 h-5 text-sky-400 animate-spin" />
            )}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                {missionState.title}
              </div>
              <div className="text-[11px] text-zinc-400">
                {missionState.status === 'completed'
                  ? 'MISSION ACCOMPLISHED!'
                  : missionState.status === 'failed'
                  ? 'TIME EXPIRED! TRY AGAIN!'
                  : missionState.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l border-white/15 pl-5">
            {missionState.type === 'checkpoint_sprint' && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">CHECKPOINT</span>
                <span className="text-sm font-black text-amber-400">
                  {missionState.currentCheckpoint} / {missionState.totalCheckpoints}
                </span>
              </div>
            )}

            {missionState.type === 'precision_park' && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">PARK PROGRESS</span>
                <span className="text-sm font-black text-emerald-400">{missionState.score}%</span>
              </div>
            )}

            {missionState.type === 'drift_master' && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">DRIFT SCORE</span>
                <span className="text-sm font-black text-rose-400">
                  {missionState.score} / {missionState.targetScore}
                </span>
              </div>
            )}

            {missionState.type === 'delivery_rush' && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase">STAGE</span>
                <span className="text-sm font-black text-amber-400">
                  {missionState.currentCheckpoint} / {missionState.totalCheckpoints}
                </span>
              </div>
            )}

            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold text-zinc-400 uppercase">TIME REMAINING</span>
              <span className="font-mono text-sm font-black text-sky-400">
                {Math.ceil(missionState.timeRemaining)}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right Mini-Map (Collapsible, Dismissible & Mobile-friendly) */}
      {!isMiniMapDismissed && (
        isMiniMapMinimized ? (
          <div className="pointer-events-auto absolute top-16 right-3 sm:right-4 flex items-center gap-1.5 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMiniMapMinimized(false);
              }}
              title="Expand Radar [M]"
              className="flex items-center gap-1.5 rounded-xl bg-black/80 hover:bg-zinc-900 px-3 py-1.5 backdrop-blur-md border border-white/20 text-xs font-bold text-sky-300 shadow-xl cursor-pointer hover:border-sky-400/50 transition-all active:scale-95"
            >
              <MapIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px]">RADAR</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMiniMapDismissed(true);
              }}
              title="Remove from Screen"
              className="p-1.5 rounded-xl bg-black/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-white/20 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={onOpenMap}
            title="Click to Open Full City Map [M]"
            className="pointer-events-auto absolute top-16 right-3 sm:right-4 rounded-2xl bg-black/80 p-2 backdrop-blur-md border border-white/15 shadow-2xl cursor-pointer hover:border-sky-400/50 transition-all select-none z-20"
          >
            {/* Header Bar with Minimize & Close Buttons */}
            <div className="flex items-center justify-between pb-1.5 px-0.5 text-[10px] font-mono text-zinc-400 font-bold border-b border-white/10 mb-1.5">
              <span className="flex items-center gap-1 text-sky-400">
                <MapIcon className="w-3 h-3" />
                <span>CITY GPS</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMiniMapMinimized(true);
                  }}
                  title="Minimize Mini-Map"
                  className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMiniMapDismissed(true);
                  }}
                  title="Remove from Screen"
                  className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

          <div className="relative w-[120px] h-[120px] sm:w-[145px] sm:h-[145px] rounded-xl overflow-hidden bg-zinc-950/95 border border-white/5">
            {/* Main Boulevard */}
            <div className="absolute left-[55px] sm:left-[67px] top-0 bottom-0 w-[10px] sm:w-[12px] bg-zinc-600/70" />
            {/* Red Bus Rapid Transit Priority Route */}
            <div className="absolute left-[56px] sm:left-[68px] top-0 bottom-0 w-[2px] bg-rose-500/80" />
            <div className="absolute left-[63px] sm:left-[77px] top-0 bottom-0 w-[2px] bg-rose-500/80" />

            {/* West & East Secondary Avenues with Green Bike Lanes */}
            <div className="absolute left-[24px] sm:left-[28px] top-0 bottom-0 w-[8px] bg-zinc-700/60" />
            <div className="absolute left-[22px] sm:left-[26px] top-0 bottom-0 w-[2px] bg-emerald-400/80" />
            <div className="absolute right-[24px] sm:right-[28px] top-0 bottom-0 w-[8px] bg-zinc-700/60" />
            <div className="absolute right-[22px] sm:right-[26px] top-0 bottom-0 w-[2px] bg-emerald-400/80" />

            {/* Cross Boulevards */}
            <div className="absolute top-[34px] sm:top-[42px] left-0 right-0 h-[8px] sm:h-[10px] bg-zinc-600/70" />
            <div className="absolute top-[85px] sm:top-[104px] left-0 right-0 h-[8px] sm:h-[10px] bg-zinc-600/70" />

            {/* School Campus Marker (West district) */}
            <div className="absolute left-[4px] sm:left-[6px] top-[48px] sm:top-[58px] px-1 py-0.5 bg-amber-500/20 border border-amber-400/40 rounded-xs text-[6px] sm:text-[7px] font-bold text-amber-300">
              SCH
            </div>

            {/* Cyber Tech HQ Marker (East district) */}
            <div className="absolute right-[4px] sm:right-[6px] top-[48px] sm:top-[58px] px-1 py-0.5 bg-sky-500/20 border border-sky-400/40 rounded-xs text-[6px] sm:text-[7px] font-bold text-sky-300">
              TECH
            </div>

            {/* Parking Bay Area */}
            <div className="absolute left-[72px] sm:left-[88px] top-[48px] sm:top-[58px] w-[14px] sm:w-[18px] h-[14px] sm:h-[18px] bg-emerald-500/20 border border-emerald-400/40 rounded-xs flex items-center justify-center text-[7px] text-emerald-300 font-bold">
              P
            </div>

            {/* AI Traffic Vehicles */}
            {trafficPositions.map((pos, idx) => {
              const currentMapWidth = 145;
              const currentMapHeight = 145;
              const tx = Math.max(4, Math.min(currentMapWidth - 4, ((pos.x + 160) / 320) * currentMapWidth));
              const ty = Math.max(4, Math.min(currentMapHeight - 4, ((pos.z + 220) / 440) * currentMapHeight));
              return (
                <div
                  key={idx}
                  className="absolute w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.8)] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${tx}px`, top: `${ty}px` }}
                />
              );
            })}

            {/* Mission Target Destination Marker */}
            {missionState.targetPosition && (
              <div
                className="absolute w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/40 -translate-x-1/2 -translate-y-1/2 animate-ping"
                style={{
                  left: `${((missionState.targetPosition.x + 160) / 320) * mapWidth}px`,
                  top: `${((missionState.targetPosition.z + 220) / 440) * mapHeight}px`,
                }}
              />
            )}

            {/* Player Car Marker with Heading Arrow */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform"
              style={{
                left: `${mapCarX}px`,
                top: `${mapCarY}px`,
                transform: `translate(-50%, -50%) rotate(${mapHeadingDeg}deg)`,
              }}
            >
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
            </div>

            <div className="absolute bottom-1 right-1.5 text-[7px] sm:text-[8px] font-mono font-bold text-zinc-500">
              [M] FULL
            </div>
          </div>
        </div>
      ))}

      {/* Sleek Corner Speedometer (Moved away from center: never covers or blocks the car!) */}
      {!isSpeedoHidden && (
        <div
          className={`fixed transition-all duration-300 z-20 pointer-events-auto ${
            showVirtualPedals
              ? 'bottom-32 right-4 sm:bottom-32 sm:right-6'
              : 'bottom-5 right-4 sm:bottom-6 sm:right-6'
          }`}
        >
          <div className="relative flex flex-col items-end rounded-2xl bg-black/75 p-3 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/80 transition-all select-none">
            {/* Header: Turn signals, RPM bar & Close button */}
            <div className="flex items-center justify-between w-full gap-2 mb-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleIndicatorLeft}
                  title="Toggle Left Turn Signal [Q]"
                  className={`p-1 rounded-lg border transition-all cursor-pointer ${
                    telemetry.indicatorLeft
                      ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-500 border-white/5 hover:text-zinc-300'
                  }`}
                >
                  <ArrowLeft className="w-3 h-3 font-bold" />
                </button>
                <button
                  onClick={onToggleIndicatorRight}
                  title="Toggle Right Turn Signal [E]"
                  className={`p-1 rounded-lg border transition-all cursor-pointer ${
                    telemetry.indicatorRight
                      ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-500 border-white/5 hover:text-zinc-300'
                  }`}
                >
                  <ArrowRight className="w-3 h-3 font-bold" />
                </button>
              </div>

              {/* Dynamic RPM Arc Bar */}
              <div className="flex-1 mx-2 min-w-[70px]">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      isRedline
                        ? 'bg-gradient-to-r from-amber-500 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                        : 'bg-gradient-to-r from-sky-500 to-emerald-400'
                    }`}
                    style={{ width: `${rpmPercent}%` }}
                  />
                </div>
              </div>

              {/* Close Button ("hata isko" - removes from screen completely) */}
              <button
                onClick={() => setIsSpeedoHidden(true)}
                title="Remove Speedometer from Screen [X]"
                className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed & Gear & Lights Row */}
            <div className="flex items-center gap-3">
              {/* Gear Box */}
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-bold text-zinc-400">GEAR</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/90 border border-white/15 text-lg font-black text-amber-400 shadow-inner">
                  {telemetry.gear}
                </div>
              </div>

              {/* Big Speed Digits */}
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {displaySpeed}
                </span>
                <span className="font-mono text-xs font-bold text-sky-400 tracking-wider">
                  {unitLabel}
                </span>
              </div>

              {/* Status Indicators */}
              <div className="flex flex-col gap-1 text-[9px] font-semibold">
                <button
                  onClick={onToggleLights}
                  title="Toggle Headlights [L]"
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition-colors cursor-pointer ${
                    telemetry.headlightsOn
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      : 'bg-zinc-900 text-zinc-500 border-white/5 hover:text-zinc-400'
                  }`}
                >
                  <Lightbulb className="w-2.5 h-2.5" />
                  <span>LIGHT</span>
                </button>
                <div
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border transition-colors ${
                    telemetry.brakeLightsOn
                      ? 'bg-rose-500/30 text-rose-300 border-rose-400/40'
                      : 'bg-zinc-900 text-zinc-500 border-white/5'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span>{telemetry.handbrake ? 'DRIFT' : 'BRAKE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Trap Xenon Flash Screen Overlay */}
      {speedTrapEvent && Date.now() - speedTrapEvent.timestamp < 220 && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-white/75 backdrop-blur-xs transition-opacity duration-200" />
      )}

      {/* Floating Alerts Container (Top Center below objective) */}
      <div className="pointer-events-none absolute top-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30">
        {speedTrapEvent && Date.now() - speedTrapEvent.timestamp < 3600 && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-600/90 px-4 py-2 text-white border border-rose-300 font-bold shadow-2xl animate-bounce backdrop-blur-md">
            <Zap className="w-5 h-5 text-amber-300 animate-spin" />
            <span className="text-xs sm:text-sm uppercase tracking-wider">
              SPEED TRAP FLASH! {speedTrapEvent.speedKmh} KM/H (LIMIT {speedTrapEvent.limitKmh})
            </span>
          </div>
        )}

        {stuntJumpEvent && Date.now() - stuntJumpEvent.timestamp < 3600 && (
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-600/90 px-4 py-2 text-white border border-indigo-300 font-bold shadow-2xl animate-pulse backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-xs sm:text-sm uppercase tracking-wider">
              STUNT JUMP! AIR: {stuntJumpEvent.airTime}s • DIST: {stuntJumpEvent.distance}m
            </span>
          </div>
        )}

        {telemetry.isAirborne && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/90 px-3 py-1 text-xs font-black text-black shadow-lg animate-pulse">
            <span>AIRBORNE</span>
            <span className="font-mono">{telemetry.airTime}s</span>
          </div>
        )}
      </div>

      {/* Mission Victory Celebration Modal Overlay */}
      {missionState.status === 'completed' && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950/95 border border-emerald-500/40 p-6 shadow-2xl text-center flex flex-col items-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 mb-3 shadow-lg shadow-emerald-500/30">
              <Trophy className="w-9 h-9" />
            </div>

            <div className="flex gap-1 text-amber-400 mb-2">
              <Star className="w-5 h-5 fill-current animate-bounce" />
              <Star className="w-5 h-5 fill-current animate-bounce delay-100" />
              <Star className="w-5 h-5 fill-current animate-bounce delay-200" />
            </div>

            <h2 className="text-xl font-black uppercase tracking-wider text-white">CHALLENGE COMPLETED!</h2>
            <p className="text-sm text-emerald-400 font-bold mt-1">{missionState.title}</p>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              Target reached with {Math.ceil(missionState.timeRemaining)}s remaining on the clock!
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => {
                  const nextMissions: MissionType[] = [
                    'checkpoint_sprint',
                    'precision_park',
                    'drift_master',
                    'delivery_rush',
                  ];
                  const currentIdx = nextMissions.indexOf(missionState.type);
                  const nextMission = nextMissions[(currentIdx + 1) % nextMissions.length];
                  onStartMission(nextMission);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Next Mission</span>
              </button>

              <button
                onClick={onCancelMission}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-xs font-bold text-zinc-200 border border-white/10 transition-colors cursor-pointer"
              >
                <span>Free Roam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mission Failed Modal Overlay */}
      {missionState.status === 'failed' && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950/95 border border-rose-500/40 p-6 shadow-2xl text-center flex flex-col items-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/40 mb-3 shadow-lg shadow-rose-500/30">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h2 className="text-xl font-black uppercase tracking-wider text-white">CHALLENGE FAILED</h2>
            <p className="text-sm text-rose-400 font-bold mt-1">TIME EXPIRED</p>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              You ran out of time! Re-evaluate your driving line and attempt again.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => onStartMission(missionState.type)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 py-3 text-xs font-bold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Mission</span>
              </button>

              <button
                onClick={onCancelMission}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-3 text-xs font-bold text-zinc-200 border border-white/10 transition-colors cursor-pointer"
              >
                <span>Free Roam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual On-Screen Touch / Mouse Driving Pedals (Toggled via [Pedals] button) */}
      {showVirtualPedals && (
        <div className="pointer-events-auto fixed bottom-6 left-6 right-6 flex items-end justify-between z-30 select-none">
          {/* Steering Controls (Left / Right) */}
          <div className="flex items-center gap-3">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onPedalPress('steerLeft', true);
              }}
              onPointerUp={() => onPedalPress('steerLeft', false)}
              onPointerLeave={() => onPedalPress('steerLeft', false)}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/80 hover:bg-zinc-800 text-white border border-white/20 shadow-2xl backdrop-blur-md active:bg-sky-600 active:scale-95 cursor-pointer text-sm font-bold"
              title="Steer Left"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onPedalPress('steerRight', true);
              }}
              onPointerUp={() => onPedalPress('steerRight', false)}
              onPointerLeave={() => onPedalPress('steerRight', false)}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/80 hover:bg-zinc-800 text-white border border-white/20 shadow-2xl backdrop-blur-md active:bg-sky-600 active:scale-95 cursor-pointer text-sm font-bold"
              title="Steer Right"
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* Drive & Brake & Handbrake Pedals */}
          <div className="flex items-center gap-3">
            {/* Handbrake */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onPedalPress('handbrake', true);
              }}
              onPointerUp={() => onPedalPress('handbrake', false)}
              onPointerLeave={() => onPedalPress('handbrake', false)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 border border-amber-400/40 shadow-2xl backdrop-blur-md active:bg-amber-500 active:text-black active:scale-95 cursor-pointer text-[10px] font-black uppercase tracking-wider"
              title="Handbrake Drift"
            >
              DRIFT
            </button>

            {/* Brake / Reverse Pedal */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onPedalPress('brake', true);
              }}
              onPointerUp={() => onPedalPress('brake', false)}
              onPointerLeave={() => onPedalPress('brake', false)}
              className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-rose-500/30 hover:bg-rose-500/50 text-rose-300 border border-rose-400/40 shadow-2xl backdrop-blur-md active:bg-rose-600 active:text-white active:scale-95 cursor-pointer text-xs font-black uppercase"
              title="Brake / Reverse"
            >
              <div className="text-[10px] text-zinc-300 font-mono">BRAKE</div>
              <div className="text-xs">REV</div>
            </button>

            {/* Gas / Throttle Pedal */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onPedalPress('accelerate', true);
              }}
              onPointerUp={() => onPedalPress('accelerate', false)}
              onPointerLeave={() => onPedalPress('accelerate', false)}
              className="flex h-20 w-16 flex-col items-center justify-center rounded-2xl bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-300 border border-emerald-400/40 shadow-2xl backdrop-blur-md active:bg-emerald-600 active:text-white active:scale-95 cursor-pointer text-sm font-black uppercase"
              title="Gas / Accelerate"
            >
              <div className="text-base font-black">GAS</div>
              <div className="text-[10px] text-zinc-300 font-mono">DRIVE</div>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Left: Controls Legend (Toggled with [H]) */}
      {showHelpOverlay && (
        <div className="absolute bottom-6 left-6 rounded-2xl bg-black/75 p-4 backdrop-blur-xl border border-white/15 text-xs text-zinc-300 space-y-2 shadow-2xl max-w-sm animate-fade-in">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2 border-b border-white/10 pb-1.5">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Complete Driving Controls</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">[H to Hide]</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">W</kbd>
              <span className="text-zinc-300">Accelerate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">S</kbd>
              <span className="text-zinc-300">Brake / Rev</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">A/D</kbd>
              <span className="text-zinc-300">Steering</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">SPACE</kbd>
              <span className="text-zinc-300">Handbrake</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">C</kbd>
              <span className="text-zinc-300">Dual Camera</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">B</kbd>
              <span className="text-zinc-300">Rear View</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">Q/E</kbd>
              <span className="text-zinc-300">Indicators</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">L</kbd>
              <span className="text-zinc-300">Headlights</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">M</kbd>
              <span className="text-zinc-300">City GPS Map</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">R</kbd>
              <span className="text-zinc-300">Reset Car</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">H</kbd>
              <span className="text-zinc-300">Toggle Help</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white font-bold border border-white/10">ESC</kbd>
              <span className="text-zinc-300">Pause Menu</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
