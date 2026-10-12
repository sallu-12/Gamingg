import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  CameraMode,
  GameSettings,
  InputState,
  MissionState,
  MissionType,
  TimeOfDay,
  VehicleTelemetry,
  WeatherType,
  NavigationDestination,
  SpeedTrapEvent,
  StuntJumpEvent,
  DEFAULT_KEY_BINDINGS,
} from '../game/types';
import { VehiclePhysics } from '../game/physics/VehiclePhysics';
import { CarModel } from '../game/vehicle/CarModel';
import { CityEnvironment } from '../game/world/CityEnvironment';
import { ParticleSystem } from '../game/particles/ParticleSystem';
import { GameCamera } from '../game/camera/GameCamera';
import { VehicleAudio } from '../game/audio/VehicleAudio';
import { TrafficSystem } from '../game/traffic/TrafficSystem';
import { PedestrianSystem } from '../game/pedestrians/PedestrianSystem';
import { MissionManager } from '../game/missions/MissionManager';
import { HUD } from './HUD';
import { PauseMenu } from './PauseMenu';
import { MainMenu } from './MainMenu';
import { SettingsModal } from './SettingsModal';
import { FullMapModal } from './FullMapModal';
import { UnityCodeViewer } from './UnityCodeViewer';

const STORAGE_KEY = 'apex_velocity_settings_v3';

export const DrivingGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Modal Dialog States
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isUnityViewerOpen, setIsUnityViewerOpen] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

  // Stable references for modal states to prevent WebGL scene re-creation and accidental game resets
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isMainMenuOpenRef = useRef(isMainMenuOpen);
  isMainMenuOpenRef.current = isMainMenuOpen;
  const isMapOpenRef = useRef(isMapOpen);
  isMapOpenRef.current = isMapOpen;
  const isSettingsOpenRef = useRef(isSettingsOpen);
  isSettingsOpenRef.current = isSettingsOpen;
  const isUnityViewerOpenRef = useRef(isUnityViewerOpen);
  isUnityViewerOpenRef.current = isUnityViewerOpen;

  // Load Saved Settings or Default
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...JSON.parse(saved), keyBindings: { ...DEFAULT_KEY_BINDINGS, ...JSON.parse(saved).keyBindings } };
      }
    } catch {
      // Ignore
    }
    return {
      soundEnabled: true,
      masterVolume: 0.8,
      engineVolume: 0.7,
      sfxVolume: 0.8,
      unit: 'kmh',
      handlingMode: 'simulation',
      paintColor: '#e11d48',
      shadows: true,
      graphicsQuality: 'high',
      cameraSensitivity: 1.0,
      steeringSensitivity: 1.0,
      timeOfDay: 'day',
      weather: 'clear',
      trafficDensity: 'medium',
      showVirtualPedals: false,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
    };
  });

  // Telemetry & Missions
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    speedMph: 0,
    rpm: 800,
    gear: 1,
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    isDrifting: false,
    driftSlip: 0,
    isAirborne: false,
    airTime: 0,
    topSpeedRecord: 0,
    headlightsOn: false,
    brakeLightsOn: false,
    reverseLightsOn: false,
    indicatorLeft: false,
    indicatorRight: false,
    heading: 0,
    position: { x: 0, y: 0.36, z: 0 },
  });

  const [speedTrapEvent, setSpeedTrapEvent] = useState<SpeedTrapEvent | null>(null);
  const [stuntJumpEvent, setStuntJumpEvent] = useState<StuntJumpEvent | null>(null);
  const lastSpeedTrapCooldown = useRef(0);

  const [missionState, setMissionState] = useState<MissionState>({
    type: 'none',
    title: 'Free Drive Mode',
    description: 'Explore the open city district. Select a challenge from the Pause Menu or HUD.',
    status: 'idle',
    timeRemaining: 0,
    score: 0,
    targetScore: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 0,
  });

  const [activeDestination, setActiveDestination] = useState<NavigationDestination | null>(null);
  const [trafficPositions, setTrafficPositions] = useState<{ x: number; z: number }[]>([]);

  // Engine References
  const physicsRef = useRef<VehiclePhysics | null>(null);
  const carModelRef = useRef<CarModel | null>(null);
  const gameCameraRef = useRef<GameCamera | null>(null);
  const audioRef = useRef<VehicleAudio | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const environmentRef = useRef<CityEnvironment | null>(null);
  const trafficRef = useRef<TrafficSystem | null>(null);
  const pedestriansRef = useRef<PedestrianSystem | null>(null);
  const missionRef = useRef<MissionManager | null>(null);
  const destinationMarkerRef = useRef<THREE.Group | null>(null);

  // Input State
  const inputRef = useRef<InputState>({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    handbrake: false,
    toggleCamera: false,
    toggleLights: false,
    resetVehicle: false,
    toggleHelp: false,
    toggleMap: false,
    rearView: false,
    indicatorLeft: false,
    indicatorRight: false,
    pause: false,
  });

  // Audio References & Settings Ref
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Auto-detect mobile touch devices on mount
  useEffect(() => {
    const isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
    if (isTouchDevice) {
      setSettings((prev) => ({ ...prev, showVirtualPedals: true }));
    }
  }, []);

  // Save Settings Changes to localStorage
  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }

      if (newSettings.paintColor && carModelRef.current) {
        carModelRef.current.setPaintColor(newSettings.paintColor);
      }

      if (newSettings.handlingMode && physicsRef.current) {
        physicsRef.current.handlingMode = newSettings.handlingMode;
      }

      if (newSettings.steeringSensitivity !== undefined && physicsRef.current) {
        physicsRef.current.steeringSensitivityMultiplier = newSettings.steeringSensitivity;
      }

      if (newSettings.soundEnabled !== undefined && audioRef.current) {
        audioRef.current.init();
        audioRef.current.setMuted(!newSettings.soundEnabled);
      }

      if (newSettings.masterVolume !== undefined && audioRef.current) {
        audioRef.current.setMasterVolume(newSettings.masterVolume);
      }

      if (newSettings.engineVolume !== undefined && audioRef.current) {
        audioRef.current.setEngineVolume(newSettings.engineVolume);
      }

      if (newSettings.sfxVolume !== undefined && audioRef.current) {
        audioRef.current.setSfxVolume(newSettings.sfxVolume);
      }

      if (newSettings.timeOfDay && environmentRef.current) {
        environmentRef.current.setTimeOfDay(newSettings.timeOfDay);
        if (newSettings.timeOfDay === 'night' && physicsRef.current) {
          physicsRef.current.headlightsOn = true;
        }
      }

      if (newSettings.weather && environmentRef.current) {
        environmentRef.current.setWeather(newSettings.weather);
        if (audioRef.current) audioRef.current.setRain(newSettings.weather === 'rain');
        if (physicsRef.current) {
          physicsRef.current.wetSurfaceGripMultiplier = newSettings.weather === 'rain' ? 0.72 : 1.0;
        }
      }

      if (newSettings.paintColor && carModelRef.current) {
        carModelRef.current.setColor(newSettings.paintColor);
      }

      if (newSettings.trafficDensity && trafficRef.current) {
        trafficRef.current.setDensity(newSettings.trafficDensity);
      }

      return updated;
    });
  }, []);

  // Car Paint Color Change Handler
  const handleChangeCarColor = useCallback((color: string) => {
    handleUpdateSettings({ paintColor: color });
    if (audioRef.current) audioRef.current.triggerUiClick();
  }, [handleUpdateSettings]);

  // Reset Car Callback
  const handleResetVehicle = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.reset(0, 0, 0);
      if (audioRef.current) audioRef.current.triggerUiClick();
    }
  }, []);

  // Teleport Player (Fast Travel from map)
  const handleTeleportPlayer = useCallback((x: number, z: number) => {
    if (physicsRef.current) {
      physicsRef.current.reset(x, z, physicsRef.current.yaw);
      if (audioRef.current) audioRef.current.triggerUiClick();
    }
  }, []);

  // Audio Toggle
  const handleToggleSound = useCallback(() => {
    setSettings((prev) => {
      const nextVal = !prev.soundEnabled;
      const updated = { ...prev, soundEnabled: nextVal };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      if (audioRef.current) {
        audioRef.current.init();
        audioRef.current.setMuted(!nextVal);
      }
      return updated;
    });
  }, []);

  // Camera Toggle
  const handleToggleCamera = useCallback(() => {
    if (gameCameraRef.current) {
      const newMode = gameCameraRef.current.toggleMode();
      setCameraMode(newMode);
    }
  }, []);

  // Rear View Toggle
  const handleToggleRearView = useCallback(() => {
    if (gameCameraRef.current) {
      const newMode = gameCameraRef.current.toggleRearView();
      setCameraMode(newMode);
    }
  }, []);

  // Headlights Toggle
  const handleToggleLights = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.headlightsOn = !physicsRef.current.headlightsOn;
      if (audioRef.current) audioRef.current.triggerLightClick();
    }
  }, []);

  // Indicator Toggles
  const handleToggleIndicatorLeft = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.indicatorLeft = !physicsRef.current.indicatorLeft;
      physicsRef.current.indicatorRight = false;
      if (audioRef.current) audioRef.current.triggerIndicatorRelay(true);
    }
  }, []);

  const handleToggleIndicatorRight = useCallback(() => {
    if (physicsRef.current) {
      physicsRef.current.indicatorRight = !physicsRef.current.indicatorRight;
      physicsRef.current.indicatorLeft = false;
      if (audioRef.current) audioRef.current.triggerIndicatorRelay(true);
    }
  }, []);

  // Cycle Time of Day
  const handleCycleTimeOfDay = useCallback(() => {
    setSettings((prev) => {
      const order: TimeOfDay[] = ['day', 'sunset', 'night'];
      const nextIdx = (order.indexOf(prev.timeOfDay) + 1) % order.length;
      const nextTime = order[nextIdx];

      if (environmentRef.current) {
        environmentRef.current.setTimeOfDay(nextTime);
      }

      if (nextTime === 'night' && physicsRef.current) {
        physicsRef.current.headlightsOn = true;
      }

      return { ...prev, timeOfDay: nextTime };
    });
  }, []);

  // Cycle Weather
  const handleCycleWeather = useCallback(() => {
    setSettings((prev) => {
      const order: WeatherType[] = ['clear', 'cloudy', 'rain'];
      const nextIdx = (order.indexOf(prev.weather) + 1) % order.length;
      const nextWeather = order[nextIdx];

      if (environmentRef.current) {
        environmentRef.current.setWeather(nextWeather);
      }

      if (audioRef.current) {
        audioRef.current.setRain(nextWeather === 'rain');
      }

      if (physicsRef.current) {
        physicsRef.current.wetSurfaceGripMultiplier = nextWeather === 'rain' ? 0.72 : 1.0;
      }

      return { ...prev, weather: nextWeather };
    });
  }, []);

  // Start Mission
  const handleStartMission = useCallback((type: MissionType) => {
    if (missionRef.current) {
      missionRef.current.startMission(type);
      setMissionState({ ...missionRef.current.state });
      if (audioRef.current) audioRef.current.triggerCheckpointDing();
    }
  }, []);

  // Cancel / Free Roam Mission
  const handleCancelMission = useCallback(() => {
    if (missionRef.current) {
      missionRef.current.cancelMission();
      setMissionState({ ...missionRef.current.state });
      if (audioRef.current) audioRef.current.triggerUiClick();
    }
  }, []);

  // Virtual Pedals Toggling & Press Handlers
  const handleToggleVirtualPedals = useCallback(() => {
    setSettings((prev) => ({ ...prev, showVirtualPedals: !prev.showVirtualPedals }));
  }, []);

  const handlePedalPress = useCallback(
    (control: 'accelerate' | 'brake' | 'steerLeft' | 'steerRight' | 'handbrake', active: boolean) => {
      if (audioRef.current) audioRef.current.init();
      inputRef.current[control] = active;
    },
    []
  );

  // Set Custom GPS Destination
  const handleSetDestination = useCallback((dest: NavigationDestination | null) => {
    setActiveDestination(dest);
    if (destinationMarkerRef.current) {
      if (dest) {
        destinationMarkerRef.current.position.set(dest.x, 0, dest.z);
        destinationMarkerRef.current.visible = true;
        if (audioRef.current) audioRef.current.triggerUiClick();
      } else {
        destinationMarkerRef.current.visible = false;
      }
    }
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x93c5fd);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // Generate Sky & Ambient Reflection map so metallic/glossy car paint reflects bright outdoor lighting
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 256;
    envCanvas.height = 128;
    const envCtx = envCanvas.getContext('2d');
    let envRenderTarget: THREE.WebGLRenderTarget | null = null;
    if (envCtx) {
      const grad = envCtx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#7dd3fc');    // Clear blue sky
      grad.addColorStop(0.48, '#e0f2fe'); // Sunlit horizon
      grad.addColorStop(0.52, '#94a3b8'); // City horizon line
      grad.addColorStop(1, '#475569');    // Road asphalt
      envCtx.fillStyle = grad;
      envCtx.fillRect(0, 0, 256, 128);
      const envTex = new THREE.CanvasTexture(envCanvas);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      envRenderTarget = pmrem.fromEquirectangular(envTex);
      scene.environment = envRenderTarget.texture;
      envTex.dispose();
      pmrem.dispose();
    }

    container.appendChild(renderer.domElement);

    // 2. Camera System
    const gameCamera = new GameCamera(container.clientWidth / container.clientHeight);
    gameCameraRef.current = gameCamera;

    // 3. Audio Synthesizer
    const audio = new VehicleAudio();
    audio.setMuted(!settingsRef.current.soundEnabled);
    audio.setMasterVolume(settingsRef.current.masterVolume);
    audio.setEngineVolume(settingsRef.current.engineVolume);
    audio.setSfxVolume(settingsRef.current.sfxVolume);
    audioRef.current = audio;

    // 4. Vehicle Physics
    const physics = new VehiclePhysics();
    physics.handlingMode = settings.handlingMode;
    physics.steeringSensitivityMultiplier = settings.steeringSensitivity;
    physics.wetSurfaceGripMultiplier = settings.weather === 'rain' ? 0.72 : 1.0;
    physicsRef.current = physics;

    // 5. Car Visual Model
    const carModel = new CarModel(settings.paintColor);
    scene.add(carModel.root);
    carModelRef.current = carModel;

    // 6. City Environment
    const environment = new CityEnvironment(scene);
    environment.setTimeOfDay(settings.timeOfDay);
    environment.setWeather(settings.weather);
    environment.registerObstacles(physics);
    environmentRef.current = environment;

    // 7. Particle System (Smoke, Skidmarks, Sparks)
    const particles = new ParticleSystem(scene);
    particlesRef.current = particles;

    physics.onCollision = (impactSpeed) => {
      audio.triggerCollision();
      particles.triggerSparks(physics.position);
    };

    physics.onLanding = (airTime, distance) => {
      audio.triggerHardLanding();
      setStuntJumpEvent({ airTime: Number(airTime.toFixed(2)), distance, timestamp: Date.now() });
    };

    physics.onTurboBlowoff = () => {
      audio.triggerTurboFlutter();
    };

    // 8. In-World GPS Destination Marker
    const destGroup = new THREE.Group();
    const destRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.4, 12, 28),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 })
    );
    destRing.rotation.x = Math.PI / 2;
    destRing.position.y = 1.6;
    const destPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 45, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
    );
    destPillar.position.y = 22.5;
    destGroup.add(destRing, destPillar);
    destGroup.visible = false;
    scene.add(destGroup);
    destinationMarkerRef.current = destGroup;

    // 9. AI Traffic System
    const traffic = new TrafficSystem(scene);
    traffic.setDensity(settings.trafficDensity);
    trafficRef.current = traffic;

    // 10. Pedestrian System
    const pedestrians = new PedestrianSystem(scene);
    pedestriansRef.current = pedestrians;

    // 11. Missions System
    const missions = new MissionManager(scene);
    missions.onCheckpointPassed = () => {
      audio.triggerCheckpointDing();
    };
    missions.onMissionCompleted = () => {
      audio.triggerMissionSuccess();
    };
    missions.onMissionFailed = () => {
      audio.triggerMissionFail();
    };
    missionRef.current = missions;

    // 12. Mouse Drag Orbit Handling
    let isPointerDown = false;
    const handlePointerDown = (e: PointerEvent) => {
      audio.init();
      isPointerDown = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown && !isPausedRef.current && !isMapOpenRef.current && !isSettingsOpenRef.current) {
        gameCamera.addOrbit(e.movementX, e.movementY, settingsRef.current.cameraSensitivity);
      }
    };

    const handlePointerUp = () => {
      isPointerDown = false;
    };

    const handleDoubleClick = () => {
      gameCamera.resetOrbit();
    };

    // 13. Dynamic Key Input Dispatcher (Using Settings KeyBindings)
    const handleKeyDown = (e: KeyboardEvent) => {
      audio.init();
      const binds = settingsRef.current.keyBindings;

      // Close modal on Escape if one is open
      if (e.code === binds.pause || e.key === 'Escape') {
        if (isMapOpenRef.current) {
          setIsMapOpen(false);
          return;
        }
        if (isSettingsOpenRef.current) {
          setIsSettingsOpen(false);
          return;
        }
        if (isUnityViewerOpenRef.current) {
          setIsUnityViewerOpen(false);
          return;
        }
        setIsPaused((prev) => !prev);
        return;
      }

      // If any menu modal is open, don't drive
      if (isPausedRef.current || isMapOpenRef.current || isSettingsOpenRef.current || isUnityViewerOpenRef.current || isMainMenuOpenRef.current) {
        return;
      }

      if (e.code === binds.accelerate || e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.accelerate = true;
      } else if (e.code === binds.brake || e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.brake = true;
      } else if (e.code === binds.steerLeft || e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.steerLeft = true;
      } else if (e.code === binds.steerRight || e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.steerRight = true;
      } else if (e.code === binds.handbrake || e.code === 'Space') {
        inputRef.current.handbrake = true;
        e.preventDefault();
      } else if (e.code === binds.toggleCamera || e.code === 'KeyC') {
        handleToggleCamera();
      } else if (e.code === binds.rearView || e.code === 'KeyB') {
        handleToggleRearView();
      } else if (e.code === binds.toggleLights || e.code === 'KeyL') {
        handleToggleLights();
      } else if (e.code === binds.indicatorLeft || e.code === 'KeyQ') {
        handleToggleIndicatorLeft();
      } else if (e.code === binds.indicatorRight || e.code === 'KeyE') {
        handleToggleIndicatorRight();
      } else if (e.code === binds.resetVehicle || e.code === 'KeyR') {
        handleResetVehicle();
      } else if (e.code === binds.toggleHelp || e.code === 'KeyH') {
        setShowHelpOverlay((prev) => !prev);
      } else if (e.code === binds.toggleMap || e.code === 'KeyM') {
        setIsMapOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const binds = settingsRef.current.keyBindings;

      if (e.code === binds.accelerate || e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.accelerate = false;
      } else if (e.code === binds.brake || e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.brake = false;
      } else if (e.code === binds.steerLeft || e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.steerLeft = false;
      } else if (e.code === binds.steerRight || e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.steerRight = false;
      } else if (e.code === binds.handbrake || e.code === 'Space') {
        inputRef.current.handbrake = false;
      }
    };

    const handleWindowResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      gameCamera.setAspect(width / height);
      renderer.setSize(width, height);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleWindowResize);
    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('dblclick', handleDoubleClick);

    // 14. Simulation & Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let telemetryThrottleTimer = 0;
    let trafficThrottleTimer = 0;

    const gameLoop = (now: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);

      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Only simulate if not paused
      if (!isPausedRef.current && !isMainMenuOpenRef.current) {
        physics.update(delta, inputRef.current);
        environment.update(delta, physics.position);
        traffic.update(delta, physics, environment.currentSignalState);
        pedestrians.update(delta, environment.currentSignalState, physics.position);
        missions.update(delta, physics);
        carModel.update(physics);
        particles.update(delta, physics);
        gameCamera.update(delta, physics);
        audio.update(physics.rpm, physics.throttle, physics.driftSlip, physics.gear);

        // Speed Trap Radar Check on North-South Grand Boulevard
        const spd = physics.velocity.length() * 3.6;
        if (spd > 70 && now - lastSpeedTrapCooldown.current > 4000) {
          const px = physics.position.x;
          const pz = physics.position.z;
          if (Math.abs(px) < 7.5 && (Math.abs(pz - (-45)) < 4.5 || Math.abs(pz - 45) < 4.5)) {
            lastSpeedTrapCooldown.current = now;
            environment.flashSpeedCameras();
            audio.triggerSpeedCameraFlash();
            setSpeedTrapEvent({ speedKmh: Math.round(spd), limitKmh: 70, timestamp: now });
          }
        }

        // Pulse destination marker ring
        if (destGroup.visible) {
          destRing.rotation.z += delta * 1.5;
        }

        // Telemetry update to React at ~30Hz
        telemetryThrottleTimer += delta;
        if (telemetryThrottleTimer > 0.033) {
          telemetryThrottleTimer = 0;
          setTelemetry(physics.getTelemetry());
          setMissionState({ ...missions.state });
        }

        // Radar traffic update at ~10Hz
        trafficThrottleTimer += delta;
        if (trafficThrottleTimer > 0.1) {
          trafficThrottleTimer = 0;
          setTrafficPositions(
            traffic.vehicles.filter((v) => v.mesh.visible).map((v) => ({ x: v.position.x, z: v.position.z }))
          );
        }
      }

      renderer.render(scene, gameCamera.camera);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Clean disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleWindowResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('dblclick', handleDoubleClick);

      if (envRenderTarget) {
        envRenderTarget.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    handleResetVehicle,
    handleToggleCamera,
    handleToggleRearView,
    handleToggleLights,
    handleToggleIndicatorLeft,
    handleToggleIndicatorRight,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Main HUD */}
      {!isMainMenuOpen && (
        <HUD
          telemetry={telemetry}
          cameraMode={cameraMode}
          speedUnit={settings.unit}
          soundEnabled={settings.soundEnabled}
          timeOfDay={settings.timeOfDay}
          weather={settings.weather}
          missionState={missionState}
          activeDestination={activeDestination}
          trafficPositions={trafficPositions}
          showHelpOverlay={showHelpOverlay}
          speedTrapEvent={speedTrapEvent}
          stuntJumpEvent={stuntJumpEvent}
          showVirtualPedals={settings.showVirtualPedals}
          carColor={settings.paintColor}
          onChangeCarColor={handleChangeCarColor}
          onToggleVirtualPedals={handleToggleVirtualPedals}
          onPedalPress={handlePedalPress}
          onCancelMission={handleCancelMission}
          onToggleHelp={() => setShowHelpOverlay((prev) => !prev)}
          onOpenMap={() => setIsMapOpen(true)}
          onToggleSound={handleToggleSound}
          onToggleCamera={handleToggleCamera}
          onToggleRearView={handleToggleRearView}
          onToggleLights={handleToggleLights}
          onToggleIndicatorLeft={handleToggleIndicatorLeft}
          onToggleIndicatorRight={handleToggleIndicatorRight}
          onResetVehicle={handleResetVehicle}
          onCycleTimeOfDay={handleCycleTimeOfDay}
          onCycleWeather={handleCycleWeather}
          onStartMission={handleStartMission}
          onOpenPause={() => setIsPaused(true)}
          onOpenUnityCode={() => setIsUnityViewerOpen(true)}
        />
      )}

      {/* Main Menu Screen */}
      <MainMenu
        isOpen={isMainMenuOpen}
        onPlay={() => setIsMainMenuOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenControls={() => setShowHelpOverlay(true)}
        onOpenUnityCode={() => setIsUnityViewerOpen(true)}
        onSelectMission={handleStartMission}
      />

      {/* Pause Menu Overlay */}
      <PauseMenu
        isOpen={isPaused && !isMainMenuOpen && !isSettingsOpen && !isMapOpen && !isUnityViewerOpen}
        settings={settings}
        activeMissionType={missionState.type}
        onResume={() => setIsPaused(false)}
        onResetVehicle={handleResetVehicle}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMap={() => setIsMapOpen(true)}
        onReturnToMainMenu={() => {
          setIsPaused(false);
          setIsMainMenuOpen(true);
        }}
        onUpdateSettings={handleUpdateSettings}
        onSelectMission={handleStartMission}
        onOpenUnityCode={() => setIsUnityViewerOpen(true)}
      />

      {/* Full GPS Navigation City Map Modal */}
      <FullMapModal
        isOpen={isMapOpen}
        playerPos={telemetry.position}
        playerHeading={telemetry.heading}
        trafficPositions={trafficPositions}
        activeDestination={activeDestination}
        onSetDestination={handleSetDestination}
        onClose={() => setIsMapOpen(false)}
        onTeleportPlayer={handleTeleportPlayer}
      />

      {/* Settings & Key Remapping Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Unity C# Architecture Workspace */}
      <UnityCodeViewer
        isOpen={isUnityViewerOpen}
        onClose={() => setIsUnityViewerOpen(false)}
      />
    </div>
  );
};
