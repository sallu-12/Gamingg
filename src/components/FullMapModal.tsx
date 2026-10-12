import React from 'react';
import { X, Navigation, MapPin, Flag, Target, Compass, Sparkles } from 'lucide-react';
import { NavigationDestination } from '../game/types';

interface FullMapModalProps {
  isOpen: boolean;
  playerPos: { x: number; y: number; z: number };
  playerHeading: number;
  trafficPositions: { x: number; z: number }[];
  activeDestination: NavigationDestination | null;
  onSetDestination: (dest: NavigationDestination | null) => void;
  onClose: () => void;
  onTeleportPlayer?: (x: number, z: number) => void;
}

const CITY_LANDMARKS: NavigationDestination[] = [
  { name: 'Grand Central Boulevard', x: 0, z: 0, category: 'landmark' },
  { name: 'Metropolitan High School & Sports Academy', x: -140, z: -40, category: 'landmark' },
  { name: 'Cyber Tech HQ & Innovation Complex', x: 140, z: -40, category: 'landmark' },
  { name: 'Commercial Plaza & Parking Bay', x: 44, z: -35, category: 'landmark' },
  { name: 'Downtown Financial Corporate Tower', x: -45, z: -40, category: 'landmark' },
  { name: 'Downtown Apex Skyscraper', x: 45, z: 40, category: 'landmark' },
  { name: 'Metro Gas & Service Station', x: -55, z: 35, category: 'landmark' },
  { name: 'Northwest Transit Junction', x: -90, z: 90, category: 'landmark' },
  { name: 'Southwest Boulevard Junction', x: -90, z: -90, category: 'landmark' },
];

export const FullMapModal: React.FC<FullMapModalProps> = ({
  isOpen,
  playerPos,
  playerHeading,
  trafficPositions,
  activeDestination,
  onSetDestination,
  onClose,
  onTeleportPlayer,
}) => {
  if (!isOpen) return null;

  // Map world bounds: X [-160, 160] -> [0, 540], Z [-220, 220] -> [0, 540]
  const mapSize = 540;
  const toMapX = (x: number) => ((x + 160) / 320) * mapSize;
  const toMapY = (z: number) => ((z + 220) / 440) * mapSize;

  const playerMapX = toMapX(playerPos.x);
  const playerMapY = toMapY(playerPos.z);
  const headingDeg = (-playerHeading * 180) / Math.PI;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel to world coords
    const worldX = Math.round((clickX / mapSize) * 320 - 160);
    const worldZ = Math.round((clickY / mapSize) * 440 - 220);

    onSetDestination({
      name: `GPS Point (${worldX}, ${worldZ})`,
      x: worldX,
      z: worldZ,
      category: 'custom',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 select-none font-sans text-white">
      <div className="relative flex flex-col h-[90vh] w-full max-w-4xl rounded-3xl bg-zinc-950 border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/30">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                METROPOLIS FULL GPS NAVIGATION MAP
              </h2>
              <p className="text-xs text-zinc-400">
                Click anywhere on the map to set a GPS destination beacon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDestination && (
              <button
                onClick={() => onSetDestination(null)}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
              >
                <span>Clear GPS</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Map Viewport + Landmark Sidebar */}
        <div className="flex flex-1 min-h-0">
          {/* Interactive Map Area */}
          <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950/90 overflow-hidden relative">
            <div
              onClick={handleMapClick}
              className="relative w-[540px] h-[540px] rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl overflow-hidden cursor-crosshair"
              style={{ width: `${mapSize}px`, height: `${mapSize}px` }}
            >
              {/* City District Blocks */}
              <div className="absolute inset-4 rounded-xl border border-white/5 bg-zinc-950/60" />

              {/* Roads (Grand Center Boulevard, West & East Avenues, Cross Avenues) */}
              {/* Center Boulevard (x = 0) */}
              <div className="absolute left-[252px] top-0 bottom-0 w-[36px] bg-zinc-700/80 border-x border-zinc-600/50" />
              {/* Red Bus Rapid Transit Priority Lanes */}
              <div className="absolute left-[254px] top-0 bottom-0 w-[5px] bg-rose-600/70" title="Red Bus Priority Route" />
              <div className="absolute left-[281px] top-0 bottom-0 w-[5px] bg-rose-600/70" title="Red Bus Priority Route" />
              {/* Center Double Yellow Line */}
              <div className="absolute left-[269px] top-0 bottom-0 w-[2px] bg-amber-400/90" />

              {/* Outer Left Avenue (x = -175) */}
              <div className="absolute left-[36px] top-0 bottom-0 w-[22px] bg-zinc-700/60 border-x border-zinc-600/30" title="Outer West Avenue" />

              {/* West Avenue (x = -90) with Green Bike Corridor */}
              <div className="absolute left-[122px] top-0 bottom-0 w-[30px] bg-zinc-700/70 border-x border-zinc-600/40" />
              <div className="absolute left-[118px] top-0 bottom-0 w-[4px] bg-emerald-500/80" title="Green Bike Lane" />

              {/* East Avenue (x = +90) with Green Bike Corridor */}
              <div className="absolute left-[388px] top-0 bottom-0 w-[30px] bg-zinc-700/70 border-x border-zinc-600/40" />
              <div className="absolute left-[418px] top-0 bottom-0 w-[4px] bg-emerald-500/80" title="Green Bike Lane" />

              {/* Outer Right Avenue (x = +175) */}
              <div className="absolute left-[482px] top-0 bottom-0 w-[22px] bg-zinc-700/60 border-x border-zinc-600/30" title="Outer East Avenue" />

              {/* Cross Avenues (z = -170, -90, 0, +90, +170) */}
              <div className="absolute top-[48px] left-0 right-0 h-[26px] bg-zinc-700/70 border-y border-zinc-600/40" title="North Crossway" />
              <div className="absolute top-[144px] left-0 right-0 h-[30px] bg-zinc-700/80 border-y border-zinc-600/50" />
              <div className="absolute top-[255px] left-0 right-0 h-[26px] bg-zinc-700/70 border-y border-zinc-600/40" title="Central Crosstown" />
              <div className="absolute top-[364px] left-0 right-0 h-[30px] bg-zinc-700/80 border-y border-zinc-600/50" />
              <div className="absolute top-[460px] left-0 right-0 h-[26px] bg-zinc-700/70 border-y border-zinc-600/40" title="South Crossway" />

              {/* Metropolitan High School & Academy (x = -140, z = -40) */}
              <div className="absolute left-[18px] top-[200px] w-[68px] h-[58px] bg-amber-950/60 border border-amber-500/50 rounded-lg flex flex-col items-center justify-center p-1 text-center shadow-lg">
                <span className="text-[8px] font-black text-amber-300">HIGH SCHOOL</span>
                <span className="text-[7px] text-zinc-400 font-mono">COURT & BUSES</span>
              </div>

              {/* Cyber Tech HQ Corporate Complex (x = 140, z = -40) */}
              <div className="absolute left-[450px] top-[200px] w-[68px] h-[58px] bg-sky-950/60 border border-sky-400/50 rounded-lg flex flex-col items-center justify-center p-1 text-center shadow-lg">
                <span className="text-[8px] font-black text-sky-300">CYBER TECH</span>
                <span className="text-[7px] text-zinc-400 font-mono">HQ & HELIPAD</span>
              </div>

              {/* Commercial Plaza & Parking Bays (x = 44, z = -35) */}
              <div className="absolute left-[320px] top-[205px] w-[60px] h-[55px] bg-emerald-950/50 border border-emerald-500/40 rounded-lg flex items-center justify-center text-[9px] font-bold text-emerald-300">
                PARKING
              </div>

              {/* Gas Station (x = -55, z = 35) */}
              <div className="absolute left-[162px] top-[292px] w-[35px] h-[25px] bg-sky-950/50 border border-sky-500/40 rounded-lg flex items-center justify-center text-[8px] font-bold text-sky-300">
                GAS
              </div>

              {/* AI Traffic Vehicles (Cyan Dots) */}
              {trafficPositions.map((pos, idx) => (
                <div
                  key={idx}
                  className="absolute w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${toMapX(pos.x)}px`, top: `${toMapY(pos.z)}px` }}
                />
              ))}

              {/* Landmarks Markers */}
              {CITY_LANDMARKS.map((lm) => (
                <div
                  key={lm.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDestination(lm);
                  }}
                  title={lm.name}
                  className="absolute w-4 h-4 rounded-full bg-zinc-800 border border-amber-400 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform shadow-md"
                  style={{ left: `${toMapX(lm.x)}px`, top: `${toMapY(lm.z)}px` }}
                >
                  <MapPin className="w-2.5 h-2.5 text-amber-400" />
                </div>
              ))}

              {/* Active Destination Waypoint */}
              {activeDestination && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center"
                  style={{
                    left: `${toMapX(activeDestination.x)}px`,
                    top: `${toMapY(activeDestination.z)}px`,
                  }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-400/30 flex items-center justify-center animate-pulse">
                    <Target className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 bg-black/80 px-1 rounded mt-0.5 whitespace-nowrap">
                    {activeDestination.name}
                  </span>
                </div>
              )}

              {/* Player Car Marker with Heading Arrow */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-transform pointer-events-none"
                style={{
                  left: `${playerMapX}px`,
                  top: `${playerMapY}px`,
                  transform: `translate(-50%, -50%) rotate(${headingDeg}deg)`,
                }}
              >
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[13px] border-b-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,1)]" />
              </div>

              {/* Compass Needle */}
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-mono border border-white/10 pointer-events-none">
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>N</span>
              </div>
            </div>
          </div>

          {/* Landmarks & Destinations Sidebar */}
          <div className="w-72 border-l border-white/10 bg-zinc-900/50 p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>City Destinations</span>
            </div>

            <div className="space-y-1.5">
              {CITY_LANDMARKS.map((lm) => {
                const dist = Math.round(
                  Math.hypot(playerPos.x - lm.x, playerPos.z - lm.z)
                );
                const isSelected = activeDestination?.name === lm.name;

                return (
                  <div
                    key={lm.name}
                    className={`p-2.5 rounded-xl text-xs flex flex-col gap-1 transition-all border ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400/50 text-white'
                        : 'bg-zinc-800/60 border-white/5 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{lm.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{dist}m</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onSetDestination(lm)}
                        className="flex-1 py-1 rounded bg-sky-500/30 hover:bg-sky-500/50 text-sky-300 font-bold text-[10px] transition-colors cursor-pointer"
                      >
                        Set GPS
                      </button>

                      {onTeleportPlayer && (
                        <button
                          onClick={() => {
                            onTeleportPlayer(lm.x, lm.z);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] transition-colors cursor-pointer"
                          title="Teleport vehicle to this destination"
                        >
                          Fast Travel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
