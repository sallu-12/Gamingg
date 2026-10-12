export type CameraMode = 'chase' | 'cockpit' | 'rearview';

export type HandlingMode = 'arcade' | 'simulation' | 'drift';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type WeatherType = 'clear' | 'cloudy' | 'rain';

export type GraphicsQuality = 'medium' | 'high' | 'ultra';

export type MissionType = 'none' | 'checkpoint_sprint' | 'precision_park' | 'drift_master' | 'delivery_rush';

export interface KeyBindings {
  accelerate: string;
  brake: string;
  steerLeft: string;
  steerRight: string;
  handbrake: string;
  toggleCamera: string;
  toggleLights: string;
  resetVehicle: string;
  toggleHelp: string;
  indicatorLeft: string;
  indicatorRight: string;
  toggleMap: string;
  rearView: string;
  pause: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  accelerate: 'KeyW',
  brake: 'KeyS',
  steerLeft: 'KeyA',
  steerRight: 'KeyD',
  handbrake: 'Space',
  toggleCamera: 'KeyC',
  toggleLights: 'KeyL',
  resetVehicle: 'KeyR',
  toggleHelp: 'KeyH',
  indicatorLeft: 'KeyQ',
  indicatorRight: 'KeyE',
  toggleMap: 'KeyM',
  rearView: 'KeyB',
  pause: 'Escape',
};

export interface MissionState {
  type: MissionType;
  title: string;
  description: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  timeRemaining: number;
  score: number;
  targetScore: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  targetPosition?: { x: number; y: number; z: number };
}

export interface TrafficLightState {
  northSouth: 'green' | 'yellow' | 'red';
  eastWest: 'green' | 'yellow' | 'red';
}

export interface SpeedTrapEvent {
  speedKmh: number;
  limitKmh: number;
  timestamp: number;
}

export interface StuntJumpEvent {
  airTime: number;
  distance: number;
  timestamp: number;
}

export interface VehicleTelemetry {
  speedKmh: number;
  speedMph: number;
  rpm: number;
  gear: number | 'R' | 'N';
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  isDrifting: boolean;
  driftSlip: number;
  isAirborne: boolean;
  airTime: number;
  topSpeedRecord: number;
  headlightsOn: boolean;
  brakeLightsOn: boolean;
  reverseLightsOn: boolean;
  indicatorLeft: boolean;
  indicatorRight: boolean;
  heading: number;
  position: { x: number; y: number; z: number };
}

export interface GameSettings {
  soundEnabled: boolean;
  masterVolume: number;
  engineVolume: number;
  sfxVolume: number;
  unit: 'kmh' | 'mph';
  handlingMode: HandlingMode;
  paintColor: string;
  shadows: boolean;
  graphicsQuality: GraphicsQuality;
  cameraSensitivity: number;
  steeringSensitivity: number;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  trafficDensity: 'low' | 'medium' | 'high';
  showVirtualPedals: boolean;
  keyBindings: KeyBindings;
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
  toggleCamera: boolean;
  toggleLights: boolean;
  resetVehicle: boolean;
  toggleHelp: boolean;
  toggleMap: boolean;
  rearView: boolean;
  indicatorLeft: boolean;
  indicatorRight: boolean;
  pause: boolean;
}

export interface NavigationDestination {
  x: number;
  z: number;
  name: string;
  category: 'mission' | 'landmark' | 'custom';
}
