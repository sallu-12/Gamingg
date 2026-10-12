import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { TrafficLightState } from '../types';

export interface TrafficRoute {
  id: string;
  axis: 'NS' | 'EW';
  direction: 1 | -1; // 1 = forward (positive axis), -1 = reverse
  laneX: number;
  laneZ: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  intersections: { z?: number; x?: number; stopPos: number }[];
}

export class TrafficVehicle {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public speed = 0; // m/s
  public targetSpeed = 12.0; // ~43 km/h
  public route: TrafficRoute;
  public distanceOnRoute = 0;
  public length = 4.2;
  public width = 1.8;
  public isBraking = false;
  public brakeLightsMesh: THREE.Mesh;
  public brakeLightMat: THREE.MeshStandardMaterial;
  private wheelMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, route: TrafficRoute, initialDist: number, colorHex: number) {
    this.route = route;
    this.distanceOnRoute = initialDist;
    this.position = new THREE.Vector3();
    this.mesh = this.buildMesh(colorHex);

    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x660000,
      emissive: 0x330000,
      emissiveIntensity: 0.5,
    });
    this.brakeLightMat = brakeMat;
    const brakeGeo = new THREE.BoxGeometry(1.4, 0.12, 0.08);
    this.brakeLightsMesh = new THREE.Mesh(brakeGeo, brakeMat);
    this.brakeLightsMesh.position.set(0, 0.6, -2.1);
    this.mesh.add(this.brakeLightsMesh);

    scene.add(this.mesh);
    this.updateTransform();
  }

  private buildMesh(color: number): THREE.Group {
    const group = new THREE.Group();

    // Body material
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.7,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.1,
      metalness: 0.8,
    });

    // Lower Chassis
    const hullGeo = new THREE.BoxGeometry(1.8, 0.45, 4.2);
    const hull = new THREE.Mesh(hullGeo, bodyMat);
    hull.position.y = 0.38;
    hull.castShadow = true;
    group.add(hull);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.42, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.8, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Roof
    const roofGeo = new THREE.BoxGeometry(1.46, 0.06, 2.0);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 1.02, -0.2);
    group.add(roof);

    // Headlights
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const headGeo = new THREE.BoxGeometry(0.32, 0.12, 0.06);
    const hl = new THREE.Mesh(headGeo, headMat);
    hl.position.set(-0.6, 0.45, 2.11);
    const hr = new THREE.Mesh(headGeo, headMat);
    hr.position.set(0.6, 0.45, 2.11);
    group.add(hl, hr);

    // Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
    tireGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      [-0.88, 0.34, 1.3],
      [0.88, 0.34, 1.3],
      [-0.88, 0.34, -1.3],
      [0.88, 0.34, -1.3],
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
      this.wheelMeshes.push(wheel);
    });

    return group;
  }

  public updateTransform() {
    if (this.route.axis === 'NS') {
      const z = this.route.direction === 1
        ? this.route.start.z + this.distanceOnRoute
        : this.route.start.z - this.distanceOnRoute;

      this.position.set(this.route.laneX, 0, z);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.route.direction === 1 ? 0 : Math.PI;
    } else {
      const x = this.route.direction === 1
        ? this.route.start.x + this.distanceOnRoute
        : this.route.start.x - this.distanceOnRoute;

      this.position.set(x, 0, this.route.laneZ);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.route.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Wheel spin
    const spin = this.speed * 0.15;
    this.wheelMeshes.forEach((w) => {
      w.rotation.x += spin;
    });

    // Brake lights visual sync
    if (this.isBraking) {
      this.brakeLightMat.emissive.setHex(0xff1111);
      this.brakeLightMat.emissiveIntensity = 3.0;
    } else {
      this.brakeLightMat.emissive.setHex(0x330000);
      this.brakeLightMat.emissiveIntensity = 0.5;
    }
  }
}

export class TrafficSystem {
  public scene: THREE.Scene;
  public vehicles: TrafficVehicle[] = [];
  public routes: TrafficRoute[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildTrafficRoutes();
    this.spawnInitialTraffic();
  }

  private buildTrafficRoutes() {
    // 1. Center Boulevard Northbound (Lane x = -5.5, z moves from -210 to +210)
    this.routes.push({
      id: 'boulevard_north',
      axis: 'NS',
      direction: 1,
      laneX: -5.5,
      laneZ: 0,
      start: new THREE.Vector3(-5.5, 0, -210),
      end: new THREE.Vector3(-5.5, 0, 210),
      intersections: [
        { z: -90, stopPos: 105 }, // Distance from start where stop line sits
        { z: 90, stopPos: 285 },
      ],
    });

    // 2. Center Boulevard Southbound (Lane x = 5.5, z moves from +210 to -210)
    this.routes.push({
      id: 'boulevard_south',
      axis: 'NS',
      direction: -1,
      laneX: 5.5,
      laneZ: 0,
      start: new THREE.Vector3(5.5, 0, 210),
      end: new THREE.Vector3(5.5, 0, -210),
      intersections: [
        { z: 90, stopPos: 105 },
        { z: -90, stopPos: 285 },
      ],
    });

    // 3. East-West Cross Avenue 1 Eastbound (Lane z = -84.5, x moves from -160 to +160)
    this.routes.push({
      id: 'cross1_east',
      axis: 'EW',
      direction: 1,
      laneX: 0,
      laneZ: -84.5,
      start: new THREE.Vector3(-160, 0, -84.5),
      end: new THREE.Vector3(160, 0, -84.5),
      intersections: [
        { x: -90, stopPos: 55 },
        { x: 0, stopPos: 145 },
        { x: 90, stopPos: 235 },
      ],
    });

    // 4. East-West Cross Avenue 1 Westbound (Lane z = -95.5, x moves from +160 to -160)
    this.routes.push({
      id: 'cross1_west',
      axis: 'EW',
      direction: -1,
      laneX: 0,
      laneZ: -95.5,
      start: new THREE.Vector3(160, 0, -95.5),
      end: new THREE.Vector3(-160, 0, -95.5),
      intersections: [
        { x: 90, stopPos: 55 },
        { x: 0, stopPos: 145 },
        { x: -90, stopPos: 235 },
      ],
    });

    // 5. East-West Cross Avenue 2 Eastbound (Lane z = 95.5, x moves from -160 to +160)
    this.routes.push({
      id: 'cross2_east',
      axis: 'EW',
      direction: 1,
      laneX: 0,
      laneZ: 95.5,
      start: new THREE.Vector3(-160, 0, 95.5),
      end: new THREE.Vector3(160, 0, 95.5),
      intersections: [
        { x: 0, stopPos: 145 },
      ],
    });

    // 6. West Avenue Northbound (Lane x = -95.5, z moves from -210 to +210)
    this.routes.push({
      id: 'west_ave_north',
      axis: 'NS',
      direction: 1,
      laneX: -95.5,
      laneZ: 0,
      start: new THREE.Vector3(-95.5, 0, -210),
      end: new THREE.Vector3(-95.5, 0, 210),
      intersections: [
        { z: -90, stopPos: 105 },
      ],
    });
  }

  private spawnInitialTraffic() {
    const carColors = [
      0x1e293b, // Midnight Slate
      0xf8fafc, // Alpine White
      0x0369a1, // Deep Ocean
      0xb91c1c, // Crimson
      0x475569, // Metallic Grey
      0xd97706, // Amber
      0x15803d, // British Racing Green
    ];

    // Spawn 10 AI cars spread across routes
    const spawnConfigs = [
      { routeIdx: 0, dist: 25 },
      { routeIdx: 0, dist: 135 },
      { routeIdx: 1, dist: 40 },
      { routeIdx: 1, dist: 160 },
      { routeIdx: 2, dist: 20 },
      { routeIdx: 2, dist: 170 },
      { routeIdx: 3, dist: 35 },
      { routeIdx: 3, dist: 180 },
      { routeIdx: 4, dist: 50 },
      { routeIdx: 5, dist: 80 },
    ];

    spawnConfigs.forEach((cfg, i) => {
      const route = this.routes[cfg.routeIdx % this.routes.length];
      const color = carColors[i % carColors.length];
      const vehicle = new TrafficVehicle(this.scene, route, cfg.dist, color);
      this.vehicles.push(vehicle);
    });
  }

  public setDensity(density: 'low' | 'medium' | 'high') {
    const targetCount = density === 'low' ? 6 : density === 'medium' ? 10 : 16;

    // Adjust visibility of vehicles
    this.vehicles.forEach((v, idx) => {
      v.mesh.visible = idx < targetCount;
    });
  }

  public update(delta: number, playerPhysics: VehiclePhysics, signalState: TrafficLightState) {
    const playerPos = playerPhysics.position;
    const playerRadius = 1.3;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.mesh.visible) continue;

      const totalRouteLength = v.route.start.distanceTo(v.route.end);
      let targetSpeed = v.targetSpeed;
      let shouldStop = false;

      // 1. Traffic Signal Compliance Check
      // Check upcoming intersections on this route
      const relevantSignal = v.route.axis === 'NS' ? signalState.northSouth : signalState.eastWest;

      for (const inter of v.route.intersections) {
        const distToStop = inter.stopPos - v.distanceOnRoute;
        // If between 2m and 18m before the stop line and signal is RED or YELLOW, stop!
        if (distToStop > 0.5 && distToStop < 20.0) {
          if (relevantSignal === 'red' || relevantSignal === 'yellow') {
            shouldStop = true;
            // Smooth deceleration toward stop line
            targetSpeed = Math.min(targetSpeed, Math.max(0, (distToStop - 1.5) * 1.5));
          }
        }
      }

      // 2. Preceding Traffic Vehicle Distance Check
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (!other.mesh.visible || other.route.id !== v.route.id) continue;

        // Same route ahead check
        const gap = other.distanceOnRoute - v.distanceOnRoute;
        if (gap > 0 && gap < 16.0) {
          shouldStop = true;
          targetSpeed = Math.min(targetSpeed, Math.max(0, (gap - 5.0) * 1.2));
        }
      }

      // 3. Player Car Ahead Check
      const toPlayer = playerPos.clone().sub(v.position);
      const distToPlayer = toPlayer.length();

      if (distToPlayer < 18.0) {
        // Project onto traffic heading
        const headingVec = v.route.axis === 'NS'
          ? new THREE.Vector3(0, 0, v.route.direction)
          : new THREE.Vector3(v.route.direction, 0, 0);

        const forwardDot = toPlayer.dot(headingVec);
        if (forwardDot > 0 && forwardDot < 15.0) {
          // Player is ahead of traffic vehicle in same lane
          const lateralOffset = Math.abs(v.route.axis === 'NS' ? playerPos.x - v.position.x : playerPos.z - v.position.z);
          if (lateralOffset < 2.5) {
            shouldStop = true;
            targetSpeed = Math.min(targetSpeed, Math.max(0, (forwardDot - 4.5) * 1.5));
          }
        }
      }

      // 4. Physical Collision with Player Car
      if (distToPlayer < playerRadius + 1.6) {
        // Physical collision response! Push away and slow down
        const overlap = (playerRadius + 1.6) - distToPlayer;
        const pushDir = toPlayer.clone().normalize();

        // Push player back
        playerPhysics.position.addScaledVector(pushDir, overlap * 0.7);
        // Absorb momentum
        playerPhysics.velocity.multiplyScalar(0.4);

        if (playerPhysics.onCollision && playerPhysics.velocity.length() > 1.2) {
          playerPhysics.onCollision(playerPhysics.velocity.length());
        }

        v.speed *= 0.2;
        targetSpeed = 0;
        shouldStop = true;
      }

      // 5. Update Speed & Braking state
      v.isBraking = shouldStop || v.speed > targetSpeed + 0.5;
      const accelRate = shouldStop ? 9.0 : 4.0;
      v.speed = THREE.MathUtils.lerp(v.speed, targetSpeed, accelRate * delta);

      // 6. Advance distance on route
      v.distanceOnRoute += v.speed * delta;

      // Wrap around when reaching route end
      if (v.distanceOnRoute >= totalRouteLength) {
        v.distanceOnRoute = 0;
      }

      v.updateTransform();
    }
  }
}
