import * as THREE from 'three';
import { VehiclePhysics, WorldObstacle } from '../physics/VehiclePhysics';
import { TimeOfDay, WeatherType, TrafficLightState } from '../types';

interface TrafficLightFixture {
  group: THREE.Object3D;
  axis: 'NS' | 'EW';
  redBulb: THREE.Mesh;
  yellowBulb: THREE.Mesh;
  greenBulb: THREE.Mesh;
}

export class CityEnvironment {
  public scene: THREE.Scene;
  public obstacles: WorldObstacle[] = [];
  public lightsGroup: THREE.Group;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public skyMesh: THREE.Mesh;
  public skyMat: THREE.MeshBasicMaterial;

  // Road materials to dynamically update on rain/wet weather
  private roadMaterials: THREE.MeshStandardMaterial[] = [];
  private streetlightMaterials: THREE.MeshStandardMaterial[] = [];
  private windowGlowMaterials: THREE.MeshStandardMaterial[] = [];

  // Traffic lights
  private trafficFixtures: TrafficLightFixture[] = [];
  public trafficLightTimer = 0;
  public currentSignalState: TrafficLightState = {
    northSouth: 'green',
    eastWest: 'red',
  };

  // Rain particle system
  private rainParticles: THREE.Points | null = null;
  private rainGeo: THREE.BufferGeometry | null = null;
  private isRaining = false;

  // Current environment states
  public currentTimeOfDay: TimeOfDay = 'day';
  public currentWeather: WeatherType = 'clear';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lightsGroup = new THREE.Group();
    this.scene.add(this.lightsGroup);

    // Setup Daylight
    const { sun, hemi } = this.setupLighting();
    this.sunLight = sun;
    this.hemiLight = hemi;

    // Atmospheric Fog
    this.scene.fog = new THREE.FogExp2(0xcde0f7, 0.0035);

    // Build the City
    const { sky, skyMat } = this.buildGroundAndSky();
    this.skyMesh = sky;
    this.skyMat = skyMat;

    this.buildRoadNetwork();
    this.buildCityBlocks();
    this.buildParkingPlazaAndGasStation();
    this.buildStreetFurnitureAndProps();
    this.buildTreesAndGreenery();
    this.buildStuntRamps();
    this.buildSpeedCameraGantries();
    this.buildSchoolCampus();
    this.buildCorporateTechComplex();
    this.buildColoredTransitAndBikeLanes();
    this.setupRainParticles();
  }

  public registerObstacles(physics: VehiclePhysics) {
    physics.obstacles = this.obstacles;
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x64748b, 0.95);
    hemi.position.set(0, 50, 0);
    this.lightsGroup.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.42);
    this.lightsGroup.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff8ed, 1.85);
    sun.position.set(60, 95, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 320;
    sun.shadow.camera.left = -110;
    sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110;
    sun.shadow.camera.bottom = -110;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;

    this.lightsGroup.add(sun);
    return { sun, hemi };
  }

  private buildGroundAndSky() {
    const terrainGeo = new THREE.PlaneGeometry(750, 750);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.95,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.05;
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    const skyGeo = new THREE.SphereGeometry(450, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    return { sky, skyMat };
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#222429';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 18000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.floor(25 + Math.random() * 25);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Yellow double center line
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(250, 0, 4, 512);
    ctx.fillRect(258, 0, 4, 512);

    // White dashed lane dividers
    ctx.fillStyle = '#e2e8f0';
    for (let y = 15; y < 512; y += 64) {
      ctx.fillRect(128, y, 4, 34);
      ctx.fillRect(380, y, 4, 34);
    }

    // Outer white solid edge lines
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(16, 0, 5, 512);
    ctx.fillRect(491, 0, 5, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createSidewalkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private buildRoadNetwork() {
    const asphaltTex = this.createAsphaltTexture();
    asphaltTex.repeat.set(1, 16);

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.72,
      metalness: 0.15,
    });
    this.roadMaterials.push(roadMat);

    const sidewalkTex = this.createSidewalkTexture();
    sidewalkTex.repeat.set(2, 32);

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.88,
      metalness: 0.05,
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.8,
    });

    const roadWidth = 28;
    const roadLength = 520;

    // 1. Grand Center Boulevard (North-South, x = 0)
    const mainAvenueGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const mainAvenue = new THREE.Mesh(mainAvenueGeo, roadMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.receiveShadow = true;
    this.scene.add(mainAvenue);

    // Sidewalks along Center Boulevard
    const swWidth = 5.0;
    const swHeight = 0.22;
    const swGeo = new THREE.BoxGeometry(swWidth, swHeight, roadLength);

    const leftSidewalk = new THREE.Mesh(swGeo, sidewalkMat);
    leftSidewalk.position.set(-(roadWidth / 2 + swWidth / 2), swHeight / 2, 0);
    leftSidewalk.receiveShadow = true;
    this.scene.add(leftSidewalk);

    const rightSidewalk = new THREE.Mesh(swGeo, sidewalkMat);
    rightSidewalk.position.set(roadWidth / 2 + swWidth / 2, swHeight / 2, 0);
    rightSidewalk.receiveShadow = true;
    this.scene.add(rightSidewalk);

    // Curbs
    const curbGeo = new THREE.BoxGeometry(0.3, 0.24, roadLength);
    const curbLeft = new THREE.Mesh(curbGeo, curbMat);
    curbLeft.position.set(-roadWidth / 2, 0.12, 0);
    this.scene.add(curbLeft);

    const curbRight = new THREE.Mesh(curbGeo, curbMat);
    curbRight.position.set(roadWidth / 2, 0.12, 0);
    this.scene.add(curbRight);

    // 2. East-West Connected Cross Avenues (at z = -170, -90, 0, 90, 170)
    const crossZ = [-170, -90, 0, 90, 170];
    crossZ.forEach((cz) => {
      const crossTex = this.createAsphaltTexture();
      crossTex.repeat.set(1, 18);
      const crossRoadMat = new THREE.MeshStandardMaterial({
        map: crossTex,
        roughness: 0.72,
        metalness: 0.15,
      });
      this.roadMaterials.push(crossRoadMat);

      const crossGeo = new THREE.PlaneGeometry(440, roadWidth);
      const crossMesh = new THREE.Mesh(crossGeo, crossRoadMat);
      crossMesh.rotation.x = -Math.PI / 2;
      crossMesh.position.set(0, 0.01, cz);
      crossMesh.receiveShadow = true;
      this.scene.add(crossMesh);

      // Zebra Pedestrian Crossings at Intersections
      this.createZebraCrossing(0, cz + 16, 20, 4.5);
      this.createZebraCrossing(0, cz - 16, 20, 4.5);
      this.createZebraCrossing(16, cz, 4.5, 20);
      this.createZebraCrossing(-16, cz, 4.5, 20);

      // Pedestrian crossings at intermediate & outer intersections
      [-175, -90, 90, 175].forEach((ix) => {
        this.createZebraCrossing(ix, cz + 12, 16, 3.5);
        this.createZebraCrossing(ix, cz - 12, 16, 3.5);
      });
    });

    // 3. Parallel Left & Right Avenues & Outer District Corridors
    // x = -175 (Far Left / School District), x = -90 (Left West Ave), x = 90 (Right East Ave), x = 175 (Far Right / Tech District)
    const northSouthAvenues = [
      { x: -175, width: 20 },
      { x: -90, width: 22 },
      { x: 90, width: 22 },
      { x: 175, width: 20 },
    ];

    northSouthAvenues.forEach(({ x: px, width: aveWidth }) => {
      const secTex = this.createAsphaltTexture();
      secTex.repeat.set(1, 16);
      const secMat = new THREE.MeshStandardMaterial({ map: secTex, roughness: 0.72 });
      this.roadMaterials.push(secMat);

      const secRoadGeo = new THREE.PlaneGeometry(aveWidth, roadLength);
      const secRoad = new THREE.Mesh(secRoadGeo, secMat);
      secRoad.rotation.x = -Math.PI / 2;
      secRoad.position.set(px, 0.005, 0);
      secRoad.receiveShadow = true;
      this.scene.add(secRoad);

      // Sidewalks along side avenues
      const sideSwW = 3.8;
      const secSwGeo = new THREE.BoxGeometry(sideSwW, 0.22, roadLength);
      const secSwL = new THREE.Mesh(secSwGeo, sidewalkMat);
      secSwL.position.set(px - (aveWidth / 2 + sideSwW / 2), 0.11, 0);
      secSwL.receiveShadow = true;
      this.scene.add(secSwL);

      const secSwR = new THREE.Mesh(secSwGeo, sidewalkMat);
      secSwR.position.set(px + (aveWidth / 2 + sideSwW / 2), 0.11, 0);
      secSwR.receiveShadow = true;
      this.scene.add(secSwR);
    });
  }

  private createZebraCrossing(x: number, z: number, w: number, d: number) {
    const zebraGeo = new THREE.PlaneGeometry(w, d);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#222429';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 128; i += 24) {
      ctx.fillRect(i, 0, 14, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    const mesh = new THREE.Mesh(zebraGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    this.scene.add(mesh);
  }

  private buildCityBlocks() {
    // Rich variety of architectural styles: Glass towers, warm terracotta, dark obsidian, concrete Brutalist, bronze luxury, cyber turquoise
    const buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.9 }), // Cyan reflective glass tower
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75, metalness: 0.1 }), // Warm red brick corporate complex
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 }), // Amber bronze luxury tower
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.25, metalness: 0.85 }), // Emerald teal financial center
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.15, metalness: 0.95 }), // Deep obsidian blue headquarters
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.3 }), // Clean white limestone modern tower
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 }), // Slate steel skyscraper
      new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.2, metalness: 0.85 }), // Indigo tech tower
      new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8, metalness: 0.15 }), // Industrial loft concrete
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.25, metalness: 0.9 }), // Black titanium high-rise
    ];

    const windowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      roughness: 0.1,
    });
    this.windowGlowMaterials.push(windowGlowMat);

    const warmWindowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.3,
      roughness: 0.15,
    });
    this.windowGlowMaterials.push(warmWindowGlowMat);

    const roofUnitMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });

    // Grid coordinates for city blocks (leaving corridors for roads and plaza)
    const blocks: { x: number; z: number; w: number; d: number; h: number; style?: string }[] = [
      // West Side Blocks (School Campus sits at x = -140, z = -40)
      { x: -140, z: -160, w: 42, d: 52, h: 55, style: 'brick' },
      { x: -140, z: 40, w: 42, d: 48, h: 95, style: 'stepped' },
      { x: -140, z: 160, w: 42, d: 52, h: 60, style: 'modern' },

      { x: -45, z: -160, w: 45, d: 52, h: 70, style: 'glass' },
      { x: -45, z: -40, w: 45, d: 48, h: 110, style: 'stepped' }, // Downtown Financial Tower
      // Gas station sits around x = -55, z = 30
      { x: -45, z: 160, w: 45, d: 52, h: 65, style: 'curved' },

      // East Side Blocks
      { x: 45, z: -160, w: 45, d: 52, h: 85, style: 'stepped' },
      // Parking Plaza sits around x = 45, z = -35
      { x: 45, z: 40, w: 45, d: 48, h: 125, style: 'glass' }, // Apex Skyscraper landmark
      { x: 45, z: 160, w: 45, d: 52, h: 75, style: 'modern' },

      // East Outer Blocks (Corporate Tech HQ sits at x = 140, z = -40)
      { x: 140, z: -160, w: 42, d: 52, h: 50, style: 'brick' },
      { x: 140, z: 40, w: 42, d: 48, h: 80, style: 'stepped' },
      { x: 140, z: 160, w: 42, d: 52, h: 55, style: 'glass' },
    ];

    blocks.forEach((b, idx) => {
      const mat = buildingMaterials[idx % buildingMaterials.length];
      const winMat = idx % 2 === 0 ? windowGlowMat : warmWindowGlowMat;

      // Base main tower body
      const towerGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const tower = new THREE.Mesh(towerGeo, mat);
      tower.position.set(b.x, b.h / 2, b.z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      this.scene.add(tower);

      // Entrance Lobby with glass facade
      const lobbyGeo = new THREE.BoxGeometry(b.w + 0.4, 4.5, b.d + 0.4);
      const lobbyMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.2,
        metalness: 0.8,
      });
      const lobby = new THREE.Mesh(lobbyGeo, lobbyMat);
      lobby.position.set(b.x, 2.25, b.z);
      this.scene.add(lobby);

      // Stepped crown or upper setback on tall skyscrapers
      if (b.style === 'stepped' && b.h > 70) {
        const stepGeo = new THREE.BoxGeometry(b.w * 0.72, 16, b.d * 0.72);
        const step = new THREE.Mesh(stepGeo, mat);
        step.position.set(b.x, b.h + 8, b.z);
        step.castShadow = true;
        this.scene.add(step);

        const crownGeo = new THREE.BoxGeometry(b.w * 0.48, 10, b.d * 0.48);
        const crown = new THREE.Mesh(crownGeo, roofUnitMat);
        crown.position.set(b.x, b.h + 21, b.z);
        crown.castShadow = true;
        this.scene.add(crown);
      }

      // Cylindrical architectural spire or dome crown
      if (b.style === 'curved') {
        const domeGeo = new THREE.CylinderGeometry(b.w * 0.28, b.w * 0.38, 12, 16);
        const dome = new THREE.Mesh(domeGeo, buildingMaterials[(idx + 2) % buildingMaterials.length]);
        dome.position.set(b.x, b.h + 6, b.z);
        dome.castShadow = true;
        this.scene.add(dome);
      }

      // Window bands with alternating color glow
      const bandGeo = new THREE.BoxGeometry(b.w + 0.2, 0.7, b.d + 0.2);
      for (let floorY = 7; floorY < b.h - 4; floorY += 5.5) {
        const band = new THREE.Mesh(bandGeo, winMat);
        band.position.set(b.x, floorY, b.z);
        this.scene.add(band);
      }

      // Roof HVAC units
      const hvacGeo = new THREE.BoxGeometry(b.w * 0.4, 3.5, b.d * 0.3);
      const hvac = new THREE.Mesh(hvacGeo, roofUnitMat);
      hvac.position.set(b.x, b.h + 1.75, b.z);
      this.scene.add(hvac);

      if (b.h > 80) {
        const spireGeo = new THREE.CylinderGeometry(0.2, 0.6, 18, 8);
        const spire = new THREE.Mesh(spireGeo, roofUnitMat);
        spire.position.set(b.x, b.h + 9, b.z);
        this.scene.add(spire);

        // Neon warning beacon on tip of spires
        const tipGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(b.x, b.h + 18, b.z);
        this.scene.add(tip);
      }

      // Solid Collision Box
      this.obstacles.push({
        min: new THREE.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
        max: new THREE.Vector3(b.x + b.w / 2, b.h + 10, b.z + b.d / 2),
        type: 'building',
      });
    });

    // Guardrails along outer city boundaries
    this.buildGuardrails();
  }

  private buildParkingPlazaAndGasStation() {
    // 1. Downtown Parking Plaza ($x \in [24, 68], z \in [-60, -15]$)
    const plazaPavementMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
    });
    const plazaGeo = new THREE.PlaneGeometry(44, 45);
    const plaza = new THREE.Mesh(plazaGeo, plazaPavementMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(46, 0.015, -37.5);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Parking Bays Line Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let bayZ = -54; bayZ <= -21; bayZ += 6.5) {
      // Parking stall white/yellow lines
      const lineGeo = new THREE.PlaneGeometry(0.25, 7.5);
      const bayLineL = new THREE.Mesh(lineGeo, lineMat);
      bayLineL.rotation.x = -Math.PI / 2;
      bayLineL.position.set(38, 0.02, bayZ);
      this.scene.add(bayLineL);

      const bayLineR = new THREE.Mesh(lineGeo, lineMat);
      bayLineR.rotation.x = -Math.PI / 2;
      bayLineR.position.set(54, 0.02, bayZ);
      this.scene.add(bayLineR);
    }

    // Glowing Target Parking Zone (for Precision Parking Challenge at x = 38, z = -35)
    const parkBoxMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.65,
    });
    const parkBoxGeo = new THREE.PlaneGeometry(3.5, 6.5);
    const parkBox = new THREE.Mesh(parkBoxGeo, parkBoxMat);
    parkBox.rotation.x = -Math.PI / 2;
    parkBox.position.set(38, 0.025, -35);
    this.scene.add(parkBox);

    // Commercial Storefront behind the parking plaza
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
    const storeGeo = new THREE.BoxGeometry(42, 8, 8);
    const store = new THREE.Mesh(storeGeo, storeMat);
    store.position.set(46, 4, -62);
    store.castShadow = true;
    this.scene.add(store);

    this.obstacles.push({
      min: new THREE.Vector3(25, 0, -66),
      max: new THREE.Vector3(67, 8, -58),
      type: 'building',
    });

    // 2. Gas Station / Service Station at ($x = -55, z = 35)
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
    const canopyGeo = new THREE.BoxGeometry(26, 0.8, 18);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(-55, 6.5, 35);
    canopy.castShadow = true;
    this.scene.add(canopy);

    // Canopy Pillar Supports
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8 });
    const pGeo = new THREE.CylinderGeometry(0.35, 0.35, 6.5, 12);
    [-64, -46].forEach((px) => {
      [28, 42].forEach((pz) => {
        const pillar = new THREE.Mesh(pGeo, pillarMat);
        pillar.position.set(px, 3.25, pz);
        pillar.castShadow = true;
        this.scene.add(pillar);

        this.obstacles.push({
          min: new THREE.Vector3(px - 0.5, 0, pz - 0.5),
          max: new THREE.Vector3(px + 0.5, 6.5, pz + 0.5),
          type: 'prop',
        });
      });
    });

    // Fuel Dispenser Pumps
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    [-58, -52].forEach((px) => {
      const pumpGeo = new THREE.BoxGeometry(1.4, 2.4, 4.5);
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(px, 1.2, 35);
      pump.castShadow = true;
      this.scene.add(pump);

      this.obstacles.push({
        min: new THREE.Vector3(px - 0.8, 0, 32.5),
        max: new THREE.Vector3(px + 0.8, 2.5, 37.5),
        type: 'prop',
      });
    });
  }

  private buildGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3,
    });

    // North & South Perimeter Barriers (pushed to z = -255, 255 with open avenues)
    [-255, 255].forEach((z) => {
      const railGeo = new THREE.BoxGeometry(440, 0.85, 0.4);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(0, 0.45, z);
      rail.castShadow = true;
      this.scene.add(rail);

      this.obstacles.push({
        min: new THREE.Vector3(-220, 0, z - 0.5),
        max: new THREE.Vector3(220, 1.2, z + 0.5),
        type: 'barrier',
      });
    });

    // East & West Perimeter Barriers (pushed out to x = -215, 215 so all left & right roads are accessible)
    [-215, 215].forEach((x) => {
      const railGeo = new THREE.BoxGeometry(0.4, 0.85, 510);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.45, 0);
      rail.castShadow = true;
      this.scene.add(rail);

      this.obstacles.push({
        min: new THREE.Vector3(x - 0.5, 0, -255),
        max: new THREE.Vector3(x + 0.5, 1.2, 255),
        type: 'barrier',
      });
    });
  }

  private buildStreetFurnitureAndProps() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff4cc,
      emissiveIntensity: 0.2, // Off during day, enabled in setTimeOfDay()
    });
    this.streetlightMaterials.push(lampMat);

    // Place Streetlights along boulevard sidewalks every 32m
    for (let z = -210; z <= 210; z += 32) {
      if (Math.abs(z - (-90)) < 16 || Math.abs(z - 90) < 16) continue;

      [-14.5, 14.5].forEach((x) => {
        const lightGroup = new THREE.Group();

        const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 10);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3.75;
        pole.castShadow = true;
        lightGroup.add(pole);

        const armGeo = new THREE.BoxGeometry(2.4, 0.12, 0.12);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(x > 0 ? -1.0 : 1.0, 7.3, 0);
        lightGroup.add(arm);

        const fixGeo = new THREE.BoxGeometry(0.8, 0.18, 0.35);
        const fixture = new THREE.Mesh(fixGeo, lampMat);
        fixture.position.set(x > 0 ? -2.0 : 2.0, 7.2, 0);
        lightGroup.add(fixture);

        lightGroup.position.set(x, 0, z);
        this.scene.add(lightGroup);

        this.obstacles.push({
          min: new THREE.Vector3(x - 0.4, 0, z - 0.4),
          max: new THREE.Vector3(x + 0.4, 8, z + 0.4),
          type: 'prop',
        });
      });
    }

    // Real Animated Traffic Lights at Intersections
    [-90, 90].forEach((iz) => {
      this.createTrafficGantryWithSignals(iz);
    });

    // Road Signs
    this.createRoadSign(-13.5, 45, 'SPEED 45');
    this.createRoadSign(13.5, -45, 'SPEED 45');
    this.createRoadSign(-13.5, -78, 'STOP');
    this.createRoadSign(13.5, 78, 'STOP');
  }

  private createTrafficGantryWithSignals(z: number) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const gantry = new THREE.Group();

    // Overhead truss beam across boulevard
    const beamGeo = new THREE.BoxGeometry(28, 0.5, 0.5);
    const beam = new THREE.Mesh(beamGeo, metalMat);
    beam.position.set(0, 7.5, z - 13);
    gantry.add(beam);

    const pillarGeo = new THREE.CylinderGeometry(0.22, 0.25, 7.5, 12);
    const p1 = new THREE.Mesh(pillarGeo, metalMat);
    p1.position.set(-13.5, 3.75, z - 13);
    const p2 = new THREE.Mesh(pillarGeo, metalMat);
    p2.position.set(13.5, 3.75, z - 13);
    gantry.add(p1, p2);

    // Create North-South Signal Heads
    [-6, 6].forEach((tx) => {
      const boxGeo = new THREE.BoxGeometry(0.6, 1.6, 0.4);
      const signalBox = new THREE.Mesh(boxGeo, metalMat);
      signalBox.position.set(tx, 6.7, z - 13);

      const redMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
      const redMesh = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), redMat);
      redMesh.position.set(0, 0.5, 0.21);
      signalBox.add(redMesh);

      const yellowMat = new THREE.MeshBasicMaterial({ color: 0x333300 });
      const yellowMesh = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), yellowMat);
      yellowMesh.position.set(0, 0, 0.21);
      signalBox.add(yellowMesh);

      const greenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const greenMesh = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), greenMat);
      greenMesh.position.set(0, -0.5, 0.21);
      signalBox.add(greenMesh);

      gantry.add(signalBox);

      this.trafficFixtures.push({
        group: signalBox,
        axis: 'NS',
        redBulb: redMesh,
        yellowBulb: yellowMesh,
        greenBulb: greenMesh,
      });
    });

    this.scene.add(gantry);
  }

  private createRoadSign(x: number, z: number, text: string) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 1.6, z);
    this.scene.add(post);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    if (text === 'STOP') {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', 64, 64);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 120, 120);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SPEED', 64, 45);
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText('45', 64, 88);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
    const signGeo = new THREE.BoxGeometry(0.9, 0.9, 0.04);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, 2.7, z);
    sign.castShadow = true;
    this.scene.add(sign);

    this.obstacles.push({
      min: new THREE.Vector3(x - 0.5, 0, z - 0.5),
      max: new THREE.Vector3(x + 0.5, 3.2, z + 0.5),
      type: 'prop',
    });
  }

  private buildTreesAndGreenery() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452b1f, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.75, flatShading: true });
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    for (let z = -200; z <= 200; z += 24) {
      if (Math.abs(z - (-90)) < 18 || Math.abs(z - 90) < 18) continue;

      [-15.2, 15.2].forEach((x) => {
        const treeGroup = new THREE.Group();

        const trunkGeo = new THREE.CylinderGeometry(0.24, 0.35, 3.5, 8);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.75;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), leavesMat);
        canopy1.position.y = 4.2;
        canopy1.castShadow = true;
        treeGroup.add(canopy1);

        const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), leavesMat);
        canopy2.position.set(0.3, 5.4, -0.2);
        canopy2.castShadow = true;
        treeGroup.add(canopy2);

        treeGroup.position.set(x, 0, z);
        this.scene.add(treeGroup);

        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), bushMat);
        bush.position.set(x + (x > 0 ? 1.4 : -1.4), 0.5, z + 3);
        bush.castShadow = true;
        this.scene.add(bush);

        this.obstacles.push({
          min: new THREE.Vector3(x - 0.5, 0, z - 0.5),
          max: new THREE.Vector3(x + 0.5, 6, z + 0.5),
          type: 'prop',
        });
      });
    }
  }

  private cameraFlashLenses: THREE.Mesh[] = [];

  private buildStuntRamps() {
    const rampLocations = [
      { x: 0, z: -135, rotY: 0 },
      { x: 45, z: -78, rotY: 0 },
    ];

    rampLocations.forEach((loc) => {
      const rampGroup = new THREE.Group();

      // Concrete / Steel Ramp Wedge (5.2m wide, 7.5m long, 1.4m high)
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0, 1.4);
      shape.lineTo(7.5, 0);
      shape.closePath();

      const extrudeSettings = {
        steps: 1,
        depth: 5.2,
        bevelEnabled: false,
      };

      const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      rampGeo.center();

      const rampMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.4,
      });

      const rampMesh = new THREE.Mesh(rampGeo, rampMat);
      rampMesh.position.y = 0.7;
      rampMesh.rotation.y = Math.PI / 2;
      rampMesh.castShadow = true;
      rampMesh.receiveShadow = true;
      rampGroup.add(rampMesh);

      // Yellow & Black hazard edge bumpers
      const bumperMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const leftBumper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 7.5), bumperMat);
      leftBumper.position.set(-2.6, 0.8, 0);
      const rightBumper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 7.5), bumperMat);
      rightBumper.position.set(2.6, 0.8, 0);
      rampGroup.add(leftBumper, rightBumper);

      // Neon LED arrow sign above ramp entry
      const arrowGeo = new THREE.ConeGeometry(0.35, 0.8, 4);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.position.set(0, 1.8, 3.2);
      arrowMesh.rotation.x = Math.PI / 2;
      rampGroup.add(arrowMesh);

      rampGroup.position.set(loc.x, 0, loc.z);
      rampGroup.rotation.y = loc.rotY;
      this.scene.add(rampGroup);
    });
  }

  private buildSpeedCameraGantries() {
    const gantryPositions = [-45, 45];
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const cameraMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    gantryPositions.forEach((gz) => {
      const gantryGroup = new THREE.Group();

      // Dual upright support columns
      const colGeo = new THREE.CylinderGeometry(0.3, 0.35, 7.2, 12);
      const leftCol = new THREE.Mesh(colGeo, metalMat);
      leftCol.position.set(-10, 3.6, 0);
      leftCol.castShadow = true;

      const rightCol = new THREE.Mesh(colGeo, metalMat);
      rightCol.position.set(10, 3.6, 0);
      rightCol.castShadow = true;

      // Cross beam truss
      const beamGeo = new THREE.BoxGeometry(20.5, 0.7, 0.7);
      const beam = new THREE.Mesh(beamGeo, metalMat);
      beam.position.set(0, 6.8, 0);
      beam.castShadow = true;

      gantryGroup.add(leftCol, rightCol, beam);

      // Speed camera radar pods & high-intensity flash units
      [-4.5, 4.5].forEach((camX) => {
        const podGeo = new THREE.BoxGeometry(0.8, 0.6, 0.9);
        const pod = new THREE.Mesh(podGeo, cameraMat);
        pod.position.set(camX, 6.4, 0);

        // Flash Strobe Lens
        const lensGeo = new THREE.CircleGeometry(0.2, 16);
        const lens = new THREE.Mesh(lensGeo, flashMat);
        lens.position.set(0, -0.05, 0.46);
        pod.add(lens);
        this.cameraFlashLenses.push(lens);

        gantryGroup.add(pod);
      });

      // Overhead Speed Limit Sign "70 SPEED LIMIT"
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 128;
      signCanvas.height = 128;
      const ctx = signCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(64, 64, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('70', 64, 66);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signMesh.position.set(0, 6.8, 0.4);
      gantryGroup.add(signMesh);

      gantryGroup.position.set(0, 0, gz);
      this.scene.add(gantryGroup);
    });
  }

  public flashSpeedCameras() {
    this.cameraFlashLenses.forEach((lens) => {
      const mat = lens.material as THREE.MeshBasicMaterial;
      mat.color.setHex(0xffffff);
      lens.scale.set(1.5, 1.5, 1.5);
      setTimeout(() => {
        lens.scale.set(1, 1, 1);
      }, 120);
    });
  }

  private buildSchoolCampus() {
    const campusGroup = new THREE.Group();

    // 1. Campus Ground Foundation Plaza (West District x = -140, z = -40)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 });
    const groundGeo = new THREE.PlaneGeometry(44, 52);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(-140, 0.015, -40);
    ground.receiveShadow = true;
    campusGroup.add(ground);

    // 2. Main School Academy Building (Classic Brick Architecture)
    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Rich terracotta red brick
      roughness: 0.75,
      metalness: 0.1,
    });
    const stoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Limestone trim & columns
      roughness: 0.5,
    });

    const schoolBodyGeo = new THREE.BoxGeometry(34, 16, 26);
    const schoolBody = new THREE.Mesh(schoolBodyGeo, brickMat);
    schoolBody.position.set(-144, 8, -48);
    schoolBody.castShadow = true;
    schoolBody.receiveShadow = true;
    campusGroup.add(schoolBody);

    // School Entrance Columned Portico
    const porticoRoofGeo = new THREE.BoxGeometry(10, 1.2, 5);
    const porticoRoof = new THREE.Mesh(porticoRoofGeo, stoneTrimMat);
    porticoRoof.position.set(-144, 6.6, -34.5);
    campusGroup.add(porticoRoof);

    [-3.8, 3.8].forEach((cx) => {
      const colGeo = new THREE.CylinderGeometry(0.35, 0.4, 6, 12);
      const col = new THREE.Mesh(colGeo, stoneTrimMat);
      col.position.set(-144 + cx, 3, -34.5);
      campusGroup.add(col);
    });

    // School Signboard ("METROPOLITAN HIGH SCHOOL")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 500, 116);
    sCtx.fillStyle = '#fef08a';
    sCtx.font = 'bold 36px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('METROPOLITAN HIGH SCHOOL', 256, 48);
    sCtx.fillStyle = '#94a3b8';
    sCtx.font = '22px sans-serif';
    sCtx.fillText('EXCELLENCE • INTEGRITY • LEADERSHIP', 256, 88);

    const schoolSignTex = new THREE.CanvasTexture(signCanvas);
    const schoolSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshBasicMaterial({ map: schoolSignTex })
    );
    schoolSignMesh.position.set(-144, 8.5, -34.8);
    campusGroup.add(schoolSignMesh);

    // Classroom Windows Bands
    const winGeo = new THREE.BoxGeometry(34.2, 1.2, 0.2);
    [5, 11].forEach((wy) => {
      const winMesh = new THREE.Mesh(
        winGeo,
        new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.35,
          roughness: 0.1,
        })
      );
      winMesh.position.set(-144, wy, -35);
      campusGroup.add(winMesh);
      this.windowGlowMaterials.push(winMesh.material as THREE.MeshStandardMaterial);
    });

    // 3. Central Clock Tower
    const towerGeo = new THREE.BoxGeometry(6, 18, 6);
    const tower = new THREE.Mesh(towerGeo, brickMat);
    tower.position.set(-144, 25, -48);
    tower.castShadow = true;
    campusGroup.add(tower);

    // 4-Sided Illuminated Clock Face
    const clockMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    this.windowGlowMaterials.push(clockMat);

    const clockDialGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24);
    const clockDial = new THREE.Mesh(clockDialGeo, clockMat);
    clockDial.rotation.x = Math.PI / 2;
    clockDial.position.set(-144, 27, -44.9);
    campusGroup.add(clockDial);

    // Copper Patina Pyramid Roof
    const roofGeo = new THREE.ConeGeometry(4.4, 6.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(-144, 37.25, -48);
    campusGroup.add(roof);

    // Brass Spire
    const spireGeo = new THREE.CylinderGeometry(0.08, 0.2, 5, 8);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(-144, 42.5, -48);
    campusGroup.add(spire);

    // 4. Outdoor Sports Basketball & Soccer Court
    const courtCanvas = document.createElement('canvas');
    courtCanvas.width = 512;
    courtCanvas.height = 256;
    const cCtx = courtCanvas.getContext('2d')!;
    cCtx.fillStyle = '#1e3a8a'; // Deep blue sports court
    cCtx.fillRect(0, 0, 512, 256);
    cCtx.fillStyle = '#ea580c'; // Terracotta court keys
    cCtx.fillRect(20, 48, 80, 160);
    cCtx.fillRect(412, 48, 80, 160);
    cCtx.strokeStyle = '#ffffff';
    cCtx.lineWidth = 6;
    cCtx.strokeRect(20, 20, 472, 216); // Court perimeter
    cCtx.beginPath();
    cCtx.moveTo(256, 20);
    cCtx.lineTo(256, 236);
    cCtx.stroke(); // Half court line
    cCtx.beginPath();
    cCtx.arc(256, 128, 45, 0, Math.PI * 2);
    cCtx.stroke(); // Center circle

    const courtTex = new THREE.CanvasTexture(courtCanvas);
    const courtMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 14),
      new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.8 })
    );
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.set(-135, 0.03, -24);
    courtMesh.receiveShadow = true;
    campusGroup.add(courtMesh);

    // Basketball Hoops
    const hoopPostMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    [-146, -124].forEach((hx, idx) => {
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8);
      const pole = new THREE.Mesh(poleGeo, hoopPostMat);
      pole.position.set(hx, 2.1, -24);
      const backboardGeo = new THREE.BoxGeometry(0.1, 1.2, 1.8);
      const backboard = new THREE.Mesh(backboardGeo, stoneTrimMat);
      backboard.position.set(hx + (idx === 0 ? 0.4 : -0.4), 3.8, -24);
      campusGroup.add(pole, backboard);
    });

    // 5. Classic Yellow School Buses Parked in Bay (x ~ -121)
    const busLocations = [-32, -45];
    busLocations.forEach((bz) => {
      const busGroup = new THREE.Group();
      const busYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.2 });
      const busBlack = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
      const busGlass = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 });

      // Bus Body
      const bodyGeo = new THREE.BoxGeometry(2.8, 2.6, 9.2);
      const body = new THREE.Mesh(bodyGeo, busYellow);
      body.position.set(0, 1.8, 0);
      body.castShadow = true;
      busGroup.add(body);

      // Bus Hood/Engine
      const hoodGeo = new THREE.BoxGeometry(2.5, 1.5, 2.4);
      const hood = new THREE.Mesh(hoodGeo, busYellow);
      hood.position.set(0, 1.25, 5.2);
      hood.castShadow = true;
      busGroup.add(hood);

      // Windshield & Windows
      const winStripGeo = new THREE.BoxGeometry(2.85, 0.9, 8.8);
      const winStrip = new THREE.Mesh(winStripGeo, busGlass);
      winStrip.position.set(0, 2.2, 0);
      busGroup.add(winStrip);

      // Black Rub Rails & Bumpers
      const bumpGeo = new THREE.BoxGeometry(2.9, 0.4, 0.5);
      const frontBumper = new THREE.Mesh(bumpGeo, busBlack);
      frontBumper.position.set(0, 0.6, 6.4);
      const rearBumper = new THREE.Mesh(bumpGeo, busBlack);
      rearBumper.position.set(0, 0.6, -4.7);
      busGroup.add(frontBumper, rearBumper);

      // Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      [-1.4, 1.4].forEach((wx) => {
        [-2.8, 3.8].forEach((wz) => {
          const w = new THREE.Mesh(wheelGeo, busBlack);
          w.position.set(wx, 0.5, wz);
          busGroup.add(w);
        });
      });

      // Rooftop Amber Hazard Warning Beacons
      const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10);
      const beaconMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.0 });
      const beaconL = new THREE.Mesh(beaconGeo, beaconMat);
      beaconL.position.set(-1.1, 3.2, 4.4);
      const beaconR = new THREE.Mesh(beaconGeo, beaconMat);
      beaconR.position.set(1.1, 3.2, 4.4);
      busGroup.add(beaconL, beaconR);

      busGroup.position.set(-121, 0, bz);
      campusGroup.add(busGroup);

      // Solid Obstacle for Bus
      this.obstacles.push({
        min: new THREE.Vector3(-121 - 1.6, 0, bz - 5.5),
        max: new THREE.Vector3(-121 + 1.6, 3.5, bz + 7),
        type: 'prop',
      });
    });

    // 6. School Zone Street Markings on West Avenue (x = -90, z = -40)
    const schoolZoneCanvas = document.createElement('canvas');
    schoolZoneCanvas.width = 256;
    schoolZoneCanvas.height = 256;
    const szCtx = schoolZoneCanvas.getContext('2d')!;
    szCtx.fillStyle = '#222429';
    szCtx.fillRect(0, 0, 256, 256);
    // Yellow highlight box
    szCtx.fillStyle = '#facc15';
    szCtx.fillRect(16, 16, 224, 224);
    szCtx.fillStyle = '#000000';
    szCtx.font = 'bold 36px sans-serif';
    szCtx.textAlign = 'center';
    szCtx.fillText('SCHOOL', 128, 80);
    szCtx.fillText('ZONE', 128, 130);
    szCtx.font = 'bold 48px sans-serif';
    szCtx.fillText('20', 128, 195);

    const szTex = new THREE.CanvasTexture(schoolZoneCanvas);
    const szMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 14),
      new THREE.MeshStandardMaterial({ map: szTex, roughness: 0.65 })
    );
    szMesh.rotation.x = -Math.PI / 2;
    szMesh.position.set(-90, 0.025, -40);
    this.scene.add(szMesh);

    // Solid Obstacles for School Building
    this.obstacles.push({
      min: new THREE.Vector3(-144 - 18, 0, -48 - 14),
      max: new THREE.Vector3(-144 + 18, 25, -48 + 14),
      type: 'building',
    });

    this.scene.add(campusGroup);
  }

  private buildCorporateTechComplex() {
    const corpGroup = new THREE.Group();

    // Location: East District at x = 140, z = -40
    // 1. Sleek Landscaped Corporate Plaza Foundation
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7, metalness: 0.3 });
    const plazaGeo = new THREE.PlaneGeometry(44, 52);
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(140, 0.015, -40);
    plaza.receiveShadow = true;
    corpGroup.add(plaza);

    // 2. Podium Glass & Titanium Atrium (Base Floor)
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.9,
      roughness: 0.15,
    });
    const glassCurtainMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant cyber cyan-blue glass
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      metalness: 0.95,
      roughness: 0.08,
    });
    this.windowGlowMaterials.push(glassCurtainMat);

    const podiumGeo = new THREE.BoxGeometry(36, 12, 34);
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.set(140, 6, -46);
    podium.castShadow = true;
    podium.receiveShadow = true;
    corpGroup.add(podium);

    // Glass Atrium Front
    const atriumGeo = new THREE.BoxGeometry(36.2, 8, 8);
    const atrium = new THREE.Mesh(atriumGeo, glassCurtainMat);
    atrium.position.set(140, 5, -31);
    corpGroup.add(atrium);

    // 3. Futuristic Sky-Blue Glass Office Tower
    const towerGeo = new THREE.BoxGeometry(26, 76, 26);
    const tower = new THREE.Mesh(towerGeo, glassCurtainMat);
    tower.position.set(140, 50, -46);
    tower.castShadow = true;
    tower.receiveShadow = true;
    corpGroup.add(tower);

    // Cantilevered Upper Penthouse
    const penthouseGeo = new THREE.BoxGeometry(30, 8, 30);
    const penthouse = new THREE.Mesh(penthouseGeo, podiumMat);
    penthouse.position.set(140, 92, -46);
    penthouse.castShadow = true;
    corpGroup.add(penthouse);

    // 4. Rooftop Helicopter Landing Pad
    const heliPadCanvas = document.createElement('canvas');
    heliPadCanvas.width = 256;
    heliPadCanvas.height = 256;
    const hCtx = heliPadCanvas.getContext('2d')!;
    hCtx.fillStyle = '#18181b';
    hCtx.fillRect(0, 0, 256, 256);
    hCtx.strokeStyle = '#facc15';
    hCtx.lineWidth = 14;
    hCtx.beginPath();
    hCtx.arc(128, 128, 105, 0, Math.PI * 2);
    hCtx.stroke();
    hCtx.fillStyle = '#ffffff';
    hCtx.font = 'bold 120px sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('H', 128, 134);

    const heliPadTex = new THREE.CanvasTexture(heliPadCanvas);
    const heliPad = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 0.4, 32),
      new THREE.MeshStandardMaterial({ map: heliPadTex, roughness: 0.7 })
    );
    heliPad.position.set(140, 96.2, -46);
    corpGroup.add(heliPad);

    // 4 Corner Blue Strobe Aviation Beacons
    [-13, 13].forEach((bx) => {
      [-13, 13].forEach((bz) => {
        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        beacon.position.set(140 + bx, 96.5, -46 + bz);
        corpGroup.add(beacon);
      });
    });

    // 5. Landscaped Reflecting Pool & Fountain (Plaza Forecourt)
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.8,
    });
    this.windowGlowMaterials.push(poolMat);

    const poolRimGeo = new THREE.BoxGeometry(16, 0.5, 10);
    const poolRim = new THREE.Mesh(poolRimGeo, podiumMat);
    poolRim.position.set(140, 0.25, -22);
    const poolWaterGeo = new THREE.PlaneGeometry(14.8, 8.8);
    const poolWater = new THREE.Mesh(poolWaterGeo, poolMat);
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.set(140, 0.52, -22);
    corpGroup.add(poolRim, poolWater);

    // Center Fountain Water Column
    const fountainGeo = new THREE.CylinderGeometry(0.4, 0.8, 3.5, 16);
    const fountain = new THREE.Mesh(
      fountainGeo,
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 })
    );
    fountain.position.set(140, 2.2, -22);
    corpGroup.add(fountain);

    // 6. Illuminated Corporate Monolith Logo Sign ("CYBER TECH HQ")
    const monoCanvas = document.createElement('canvas');
    monoCanvas.width = 512;
    monoCanvas.height = 128;
    const mCtx = monoCanvas.getContext('2d')!;
    mCtx.fillStyle = '#09090b';
    mCtx.fillRect(0, 0, 512, 128);
    mCtx.strokeStyle = '#38bdf8';
    mCtx.lineWidth = 6;
    mCtx.strokeRect(6, 6, 500, 116);
    mCtx.fillStyle = '#38bdf8';
    mCtx.font = 'bold 44px sans-serif';
    mCtx.textAlign = 'center';
    mCtx.textBaseline = 'middle';
    mCtx.fillText('CYBER TECH HQ', 256, 48);
    mCtx.fillStyle = '#94a3b8';
    mCtx.font = '22px sans-serif';
    mCtx.fillText('INNOVATION & AI RESEARCH CENTER', 256, 88);

    const monoTex = new THREE.CanvasTexture(monoCanvas);
    const monoSign = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3.2, 0.6),
      new THREE.MeshStandardMaterial({
        map: monoTex,
        roughness: 0.3,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
      })
    );
    monoSign.position.set(121, 1.6, -20);
    corpGroup.add(monoSign);
    this.windowGlowMaterials.push(monoSign.material as THREE.MeshStandardMaterial);

    // 7. Underground Parking Entrance Ramp
    const rampCavityGeo = new THREE.PlaneGeometry(8, 16);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const ramp = new THREE.Mesh(rampCavityGeo, rampMat);
    ramp.rotation.x = -Math.PI / 2 + 0.15; // Sloped down
    ramp.position.set(124, -0.4, -38);
    corpGroup.add(ramp);

    // Overhead Parking Sign
    const pSignGeo = new THREE.BoxGeometry(8, 1.2, 0.4);
    const pSignMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
    });
    const pSign = new THREE.Mesh(pSignGeo, pSignMat);
    pSign.position.set(124, 3.5, -30);
    corpGroup.add(pSign);
    this.windowGlowMaterials.push(pSignMat);

    // Solid Obstacles for Corporate Complex
    this.obstacles.push({
      min: new THREE.Vector3(140 - 19, 0, -46 - 18),
      max: new THREE.Vector3(140 + 19, 90, -46 + 18),
      type: 'building',
    });

    this.scene.add(corpGroup);
  }

  private buildColoredTransitAndBikeLanes() {
    const roadLength = 480;

    // 1. Red Bus Rapid Transit (BRT) Dedicated Priority Lanes along Grand Boulevard
    // Placed on inner boulevard lanes (x = -8.2 and x = 8.2, width = 3.6m)
    const redBusCanvas = document.createElement('canvas');
    redBusCanvas.width = 256;
    redBusCanvas.height = 512;
    const rbCtx = redBusCanvas.getContext('2d')!;
    rbCtx.fillStyle = '#b91c1c'; // Vibrant Transit Red
    rbCtx.fillRect(0, 0, 256, 512);

    // White solid separator border
    rbCtx.fillStyle = '#ffffff';
    rbCtx.fillRect(0, 0, 8, 512);
    rbCtx.fillRect(248, 0, 8, 512);

    // "BUS ONLY" text stencils repeated along road
    rbCtx.save();
    rbCtx.fillStyle = '#ffffff';
    rbCtx.font = 'bold 36px sans-serif';
    rbCtx.textAlign = 'center';
    rbCtx.translate(128, 128);
    rbCtx.rotate(-Math.PI / 2);
    rbCtx.fillText('BUS ONLY', 0, 0);
    rbCtx.restore();

    rbCtx.save();
    rbCtx.fillStyle = '#ffffff';
    rbCtx.font = 'bold 36px sans-serif';
    rbCtx.textAlign = 'center';
    rbCtx.translate(128, 384);
    rbCtx.rotate(-Math.PI / 2);
    rbCtx.fillText('BUS ONLY', 0, 0);
    rbCtx.restore();

    const redBusTex = new THREE.CanvasTexture(redBusCanvas);
    redBusTex.wrapS = THREE.RepeatWrapping;
    redBusTex.wrapT = THREE.RepeatWrapping;
    redBusTex.repeat.set(1, 16);

    const redBusMat = new THREE.MeshStandardMaterial({
      map: redBusTex,
      roughness: 0.68,
      metalness: 0.15,
    });
    this.roadMaterials.push(redBusMat);

    [-8.2, 8.2].forEach((rx) => {
      const busLaneGeo = new THREE.PlaneGeometry(3.6, roadLength);
      const busLane = new THREE.Mesh(busLaneGeo, redBusMat);
      busLane.rotation.x = -Math.PI / 2;
      busLane.position.set(rx, 0.012, 0);
      busLane.receiveShadow = true;
      this.scene.add(busLane);
    });

    // 2. Green Micro-Mobility & Bicycle Corridors along Secondary Avenues
    // West Avenue at x = -96.5, East Avenue at x = 96.5 (width = 2.4m)
    const greenBikeCanvas = document.createElement('canvas');
    greenBikeCanvas.width = 128;
    greenBikeCanvas.height = 256;
    const gbCtx = greenBikeCanvas.getContext('2d')!;
    gbCtx.fillStyle = '#059669'; // Safety Emerald Green
    gbCtx.fillRect(0, 0, 128, 256);

    // White outer border line
    gbCtx.fillStyle = '#ffffff';
    gbCtx.fillRect(0, 0, 6, 256);
    gbCtx.fillRect(122, 0, 6, 256);

    // Stenciled Bicycle Silhouette
    gbCtx.strokeStyle = '#ffffff';
    gbCtx.lineWidth = 5;
    gbCtx.beginPath();
    gbCtx.arc(64, 80, 22, 0, Math.PI * 2);
    gbCtx.stroke();
    gbCtx.beginPath();
    gbCtx.arc(64, 180, 22, 0, Math.PI * 2);
    gbCtx.stroke();
    gbCtx.fillStyle = '#ffffff';
    gbCtx.fillRect(60, 95, 8, 70);

    const greenBikeTex = new THREE.CanvasTexture(greenBikeCanvas);
    greenBikeTex.wrapS = THREE.RepeatWrapping;
    greenBikeTex.wrapT = THREE.RepeatWrapping;
    greenBikeTex.repeat.set(1, 24);

    const greenBikeMat = new THREE.MeshStandardMaterial({
      map: greenBikeTex,
      roughness: 0.65,
    });
    this.roadMaterials.push(greenBikeMat);

    [-96.5, 96.5].forEach((gx) => {
      const bikeLaneGeo = new THREE.PlaneGeometry(2.4, roadLength);
      const bikeLane = new THREE.Mesh(bikeLaneGeo, greenBikeMat);
      bikeLane.rotation.x = -Math.PI / 2;
      bikeLane.position.set(gx, 0.014, 0);
      bikeLane.receiveShadow = true;
      this.scene.add(bikeLane);
    });

    // 3. Illuminated Midnight Ground-Wash Curb Strips along Grand Boulevard
    const ledStripeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    this.windowGlowMaterials.push(ledStripeMat);

    [-12.05, 12.05].forEach((lx) => {
      const ledStripeGeo = new THREE.BoxGeometry(0.12, 0.15, roadLength);
      const ledStripe = new THREE.Mesh(ledStripeGeo, ledStripeMat);
      ledStripe.position.set(lx, 0.25, 0);
      this.scene.add(ledStripe);
    });
  }

  private setupRainParticles() {
    const rainCount = 4500;
    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 160;
      positions[i + 1] = Math.random() * 45;
      positions[i + 2] = (Math.random() - 0.5) * 160;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.16,
      transparent: true,
      opacity: 0.65,
    });

    this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    // 1. Update Traffic Lights Cycles (Phase 1: NS Green / EW Red -> Yellow -> NS Red / EW Green -> Yellow)
    this.trafficLightTimer += delta;
    const cycleTime = 26; // seconds
    const phase = this.trafficLightTimer % cycleTime;

    if (phase < 10) {
      this.currentSignalState.northSouth = 'green';
      this.currentSignalState.eastWest = 'red';
    } else if (phase < 13) {
      this.currentSignalState.northSouth = 'yellow';
      this.currentSignalState.eastWest = 'red';
    } else if (phase < 23) {
      this.currentSignalState.northSouth = 'red';
      this.currentSignalState.eastWest = 'green';
    } else {
      this.currentSignalState.northSouth = 'red';
      this.currentSignalState.eastWest = 'yellow';
    }

    // Update traffic signal bulb meshes
    this.trafficFixtures.forEach((f) => {
      const state = f.axis === 'NS' ? this.currentSignalState.northSouth : this.currentSignalState.eastWest;

      (f.redBulb.material as THREE.MeshBasicMaterial).color.setHex(state === 'red' ? 0xff2222 : 0x220000);
      (f.yellowBulb.material as THREE.MeshBasicMaterial).color.setHex(state === 'yellow' ? 0xfacc15 : 0x222200);
      (f.greenBulb.material as THREE.MeshBasicMaterial).color.setHex(state === 'green' ? 0x22c55e : 0x002200);
    });

    // 2. Update Rain Particles Follow Player
    if (this.isRaining && this.rainParticles && this.rainGeo) {
      this.rainParticles.position.x = playerPos.x;
      this.rainParticles.position.z = playerPos.z;

      const posAttr = this.rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let i = 1; i < arr.length; i += 3) {
        arr[i] -= 32 * delta; // Falling speed
        if (arr[i] < 0) {
          arr[i] = 45;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.currentTimeOfDay = time;

    if (time === 'day') {
      this.sunLight.color.setHex(0xfff8ed);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(60, 95, 45);

      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x64748b);
      this.hemiLight.intensity = 0.95;

      this.skyMat.color.setHex(0x93c5fd);
      (this.scene.fog as THREE.FogExp2).color.setHex(0xcde0f7);

      // Turn streetlights off
      this.streetlightMaterials.forEach((m) => {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      });

      // Subtle building window glow
      this.windowGlowMaterials.forEach((m) => {
        m.emissiveIntensity = 0.2;
      });
    } else if (time === 'sunset') {
      this.sunLight.color.setHex(0xf97316); // Amber Sunset
      this.sunLight.intensity = 1.4;
      this.sunLight.position.set(80, 25, -50); // Low sun angle

      this.hemiLight.color.setHex(0xfb923c);
      this.hemiLight.groundColor.setHex(0x64748b);
      this.hemiLight.intensity = 0.85;

      this.skyMat.color.setHex(0xc2410c);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x7c2d12);

      // Streetlights turning on with warm glow
      this.streetlightMaterials.forEach((m) => {
        m.emissive.setHex(0xfef08a);
        m.emissiveIntensity = 1.6;
      });

      this.windowGlowMaterials.forEach((m) => {
        m.emissiveIntensity = 0.8;
      });
    } else if (time === 'night') {
      this.sunLight.color.setHex(0x38bdf8); // Moonlight
      this.sunLight.intensity = 0.25;
      this.sunLight.position.set(-40, 80, -30);

      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x09090b);
      this.hemiLight.intensity = 0.35;

      this.skyMat.color.setHex(0x090d16);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x0b0f19);

      // Bright glowing streetlights
      this.streetlightMaterials.forEach((m) => {
        m.emissive.setHex(0xfff4cc);
        m.emissiveIntensity = 2.8;
      });

      // Neon-lit office windows
      this.windowGlowMaterials.forEach((m) => {
        m.emissiveIntensity = 1.4;
      });
    }
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    this.isRaining = weather === 'rain';

    if (this.rainParticles) {
      this.rainParticles.visible = this.isRaining;
    }

    if (weather === 'rain') {
      // Wet asphalt: high specular reflection, reduced roughness (slick water coating)
      this.roadMaterials.forEach((m) => {
        m.roughness = 0.18;
        m.metalness = 0.55;
      });
    } else if (weather === 'cloudy') {
      this.sunLight.intensity = 0.9;
      this.roadMaterials.forEach((m) => {
        m.roughness = 0.72;
        m.metalness = 0.15;
      });
    } else {
      // Clear
      this.setTimeOfDay(this.currentTimeOfDay);
      this.roadMaterials.forEach((m) => {
        m.roughness = 0.72;
        m.metalness = 0.15;
      });
    }
  }
}
