import * as THREE from 'three';
import { TrafficLightState } from '../types';

interface PedestrianWaypoint {
  x: number;
  z: number;
  isCrossing?: boolean;
  axis?: 'NS' | 'EW';
}

interface HumanStyle {
  skinColor: number;
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  hasHat?: boolean;
  speed: number;
}

class PedestrianAgent {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public waypoints: PedestrianWaypoint[];
  public currentWaypointIdx = 0;
  public speed: number;
  public walkCycle = 0;

  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;

  constructor(
    scene: THREE.Scene,
    waypoints: PedestrianWaypoint[],
    startIdx: number,
    style: HumanStyle
  ) {
    this.waypoints = waypoints;
    this.currentWaypointIdx = startIdx % waypoints.length;
    this.speed = style.speed;
    this.position = new THREE.Vector3(
      waypoints[this.currentWaypointIdx].x,
      0.22,
      waypoints[this.currentWaypointIdx].z
    );

    const { group, lLeg, rLeg, lArm, rArm } = this.buildHumanMesh(style);
    this.mesh = group;
    this.leftLeg = lLeg;
    this.rightLeg = rLeg;
    this.leftArm = lArm;
    this.rightArm = rArm;

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  private buildHumanMesh(style: HumanStyle) {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: style.skinColor,
      roughness: 0.65,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: style.shirtColor,
      roughness: 0.7,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: style.pantsColor,
      roughness: 0.8,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: style.hairColor,
      roughness: 0.85,
    });
    const shoesMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.6,
    });

    // Head
    const headGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.55;
    head.castShadow = true;
    group.add(head);

    // Hair or Cap
    if (style.hasHat) {
      const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10);
      const cap = new THREE.Mesh(capGeo, shirtMat);
      cap.position.set(0, 1.66, -0.02);
      group.add(cap);
      const brimGeo = new THREE.BoxGeometry(0.18, 0.02, 0.14);
      const brim = new THREE.Mesh(brimGeo, shirtMat);
      brim.position.set(0, 1.63, 0.12);
      group.add(brim);
    } else {
      const hairGeo = new THREE.SphereGeometry(0.145, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 1.57;
      group.add(hair);
    }

    // Torso / Jacket
    const torsoGeo = new THREE.BoxGeometry(0.34, 0.52, 0.2);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.12, 0.65, 0.13);

    const lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.set(-0.1, 0.45, 0);
    lLeg.castShadow = true;
    // Left shoe
    const shoeGeo = new THREE.BoxGeometry(0.12, 0.09, 0.18);
    const lShoe = new THREE.Mesh(shoeGeo, shoesMat);
    lShoe.position.set(0, -0.32, 0.03);
    lLeg.add(lShoe);
    group.add(lLeg);

    const rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.set(0.1, 0.45, 0);
    rLeg.castShadow = true;
    // Right shoe
    const rShoe = new THREE.Mesh(shoeGeo, shoesMat);
    rShoe.position.set(0, -0.32, 0.03);
    rLeg.add(rShoe);
    group.add(rLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.09, 0.48, 0.09);

    const lArm = new THREE.Mesh(armGeo, shirtMat);
    lArm.position.set(-0.24, 1.15, 0);
    group.add(lArm);

    const rArm = new THREE.Mesh(armGeo, shirtMat);
    rArm.position.set(0.24, 1.15, 0);
    group.add(rArm);

    return { group, lLeg, rLeg, lArm, rArm };
  }

  public update(delta: number, signalState: TrafficLightState, playerPos: THREE.Vector3) {
    const targetWp = this.waypoints[this.currentWaypointIdx];
    const targetVec = new THREE.Vector3(targetWp.x, 0.22, targetWp.z);
    const dist = this.position.distanceTo(targetVec);

    // If approaching pedestrian crossing, check traffic light
    if (targetWp.isCrossing) {
      const vehicleSignal = targetWp.axis === 'NS' ? signalState.northSouth : signalState.eastWest;
      if (vehicleSignal !== 'red') {
        // Cars have green/yellow, pause at curb
        this.leftLeg.rotation.x = 0;
        this.rightLeg.rotation.x = 0;
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
        return;
      }
    }

    // Safety proximity check with player car
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 2.5) {
      // Pedestrian pauses when player car is near
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      return;
    }

    if (dist < 0.8) {
      this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
    } else {
      const dir = targetVec.clone().sub(this.position).normalize();
      this.position.addScaledVector(dir, this.speed * delta);
      this.mesh.position.copy(this.position);

      // Rotate toward walking direction
      const angle = Math.atan2(dir.x, dir.z);
      this.mesh.rotation.y = angle;

      // Animate walking legs and arms
      this.walkCycle += delta * (this.speed * 5.5);
      const legSwing = Math.sin(this.walkCycle) * 0.48;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
      this.leftArm.rotation.x = -legSwing * 0.7;
      this.rightArm.rotation.x = legSwing * 0.7;
    }
  }
}

export class PedestrianSystem {
  public scene: THREE.Scene;
  private pedestrians: PedestrianAgent[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnPedestrians();
  }

  private spawnPedestrians() {
    const skinTones = [0xfbcfe8, 0xfcd34d, 0xd97706, 0x78350f, 0xfde047];
    const shirtColors = [
      0x3b82f6, // Blue
      0xef4444, // Red
      0x10b981, // Emerald
      0x8b5cf6, // Purple
      0xf59e0b, // Amber
      0x06b6d4, // Cyan
      0xec4899, // Pink
      0x64748b, // Slate
      0xf8fafc, // White
      0x0f172a, // Black
    ];
    const pantsColors = [0x1e293b, 0x334155, 0x1e3a8a, 0x374151, 0x18181b];
    const hairColors = [0x18181b, 0x451a03, 0x78350f, 0xd97706, 0x71717a];

    const makeStyle = (idx: number, speed = 1.35): HumanStyle => ({
      skinColor: skinTones[idx % skinTones.length],
      shirtColor: shirtColors[idx % shirtColors.length],
      pantsColor: pantsColors[idx % pantsColors.length],
      hairColor: hairColors[idx % hairColors.length],
      hasHat: idx % 3 === 0,
      speed: 1.15 + (idx % 4) * 0.12,
    });

    // 1. Grand Center Boulevard - East Sidewalk (x = 16.5)
    const grandEastPath: PedestrianWaypoint[] = [
      { x: 16.5, z: -150 },
      { x: 16.5, z: -95 },
      { x: 16.5, z: -85, isCrossing: true, axis: 'EW' },
      { x: 16.5, z: -10 },
      { x: 16.5, z: 10 },
      { x: 16.5, z: 85, isCrossing: true, axis: 'EW' },
      { x: 16.5, z: 150 },
      { x: 16.5, z: 85, isCrossing: true, axis: 'EW' },
      { x: 16.5, z: -10 },
      { x: 16.5, z: -85, isCrossing: true, axis: 'EW' },
    ];

    // 2. Grand Center Boulevard - West Sidewalk (x = -16.5)
    const grandWestPath: PedestrianWaypoint[] = [
      { x: -16.5, z: 150 },
      { x: -16.5, z: 85, isCrossing: true, axis: 'EW' },
      { x: -16.5, z: 10 },
      { x: -16.5, z: -10 },
      { x: -16.5, z: -85, isCrossing: true, axis: 'EW' },
      { x: -16.5, z: -150 },
      { x: -16.5, z: -85, isCrossing: true, axis: 'EW' },
      { x: -16.5, z: 10 },
      { x: -16.5, z: 85, isCrossing: true, axis: 'EW' },
    ];

    // 3. Inner Left Side Road (West Avenue at x = -90) - East Sidewalk (x = -77)
    const leftRoadEastPath: PedestrianWaypoint[] = [
      { x: -77, z: -140 },
      { x: -77, z: -95 },
      { x: -77, z: -85, isCrossing: true, axis: 'EW' },
      { x: -77, z: 0 },
      { x: -77, z: 85, isCrossing: true, axis: 'EW' },
      { x: -77, z: 140 },
      { x: -77, z: 0 },
      { x: -77, z: -85, isCrossing: true, axis: 'EW' },
    ];

    // 4. Inner Left Side Road (West Avenue at x = -90) - West Sidewalk (x = -103)
    const leftRoadWestPath: PedestrianWaypoint[] = [
      { x: -103, z: 140 },
      { x: -103, z: 85, isCrossing: true, axis: 'EW' },
      { x: -103, z: 0 },
      { x: -103, z: -85, isCrossing: true, axis: 'EW' },
      { x: -103, z: -140 },
      { x: -103, z: -85, isCrossing: true, axis: 'EW' },
      { x: -103, z: 0 },
      { x: -103, z: 85, isCrossing: true, axis: 'EW' },
    ];

    // 5. Inner Right Side Road (East Avenue at x = 90) - West Sidewalk (x = 77)
    const rightRoadWestPath: PedestrianWaypoint[] = [
      { x: 77, z: -140 },
      { x: 77, z: -85, isCrossing: true, axis: 'EW' },
      { x: 77, z: 0 },
      { x: 77, z: 85, isCrossing: true, axis: 'EW' },
      { x: 77, z: 140 },
      { x: 77, z: 0 },
      { x: 77, z: -85, isCrossing: true, axis: 'EW' },
    ];

    // 6. Inner Right Side Road (East Avenue at x = 90) - East Sidewalk (x = 103)
    const rightRoadEastPath: PedestrianWaypoint[] = [
      { x: 103, z: 140 },
      { x: 103, z: 85, isCrossing: true, axis: 'EW' },
      { x: 103, z: 0 },
      { x: 103, z: -85, isCrossing: true, axis: 'EW' },
      { x: 103, z: -140 },
      { x: 103, z: 0 },
      { x: 103, z: 85, isCrossing: true, axis: 'EW' },
    ];

    // 7. Outer Left Road & Metropolitan School Campus Walkway (x ~ -140 to -165, z ~ -40)
    const schoolDistrictPath: PedestrianWaypoint[] = [
      { x: -162, z: -60 },
      { x: -162, z: -20 },
      { x: -145, z: -15 },
      { x: -125, z: -25 },
      { x: -125, z: -55 },
      { x: -145, z: -65 },
      { x: -162, z: -60 },
    ];

    // 8. Outer Right Road & Cyber Tech HQ Corporate Plaza Walkway (x ~ 140 to 165, z ~ -40)
    const techPlazaPath: PedestrianWaypoint[] = [
      { x: 162, z: -60 },
      { x: 145, z: -65 },
      { x: 125, z: -55 },
      { x: 125, z: -25 },
      { x: 145, z: -15 },
      { x: 162, z: -20 },
      { x: 162, z: -60 },
    ];

    // 9. Cross Avenue North Promenade (z = -90, x = -160 to 160)
    const crossNorthPath: PedestrianWaypoint[] = [
      { x: -150, z: -76 },
      { x: -95, z: -76 },
      { x: -85, z: -76, isCrossing: true, axis: 'NS' },
      { x: -25, z: -76 },
      { x: 0, z: -76 },
      { x: 25, z: -76 },
      { x: 85, z: -76, isCrossing: true, axis: 'NS' },
      { x: 150, z: -76 },
      { x: 85, z: -76, isCrossing: true, axis: 'NS' },
      { x: -25, z: -76 },
      { x: -85, z: -76, isCrossing: true, axis: 'NS' },
    ];

    // 10. Cross Avenue South Promenade (z = 90, x = -160 to 160)
    const crossSouthPath: PedestrianWaypoint[] = [
      { x: 150, z: 76 },
      { x: 85, z: 76, isCrossing: true, axis: 'NS' },
      { x: 25, z: 76 },
      { x: -25, z: 76 },
      { x: -85, z: 76, isCrossing: true, axis: 'NS' },
      { x: -150, z: 76 },
      { x: -85, z: 76, isCrossing: true, axis: 'NS' },
      { x: 25, z: 76 },
    ];

    // 11. Commercial Plaza & Coffee Shop Promenade (x = 35 to 65, z = -40 to -20)
    const commercialPlazaPath: PedestrianWaypoint[] = [
      { x: 32, z: -42 },
      { x: 55, z: -42 },
      { x: 62, z: -28 },
      { x: 40, z: -22 },
      { x: 32, z: -35 },
    ];

    // Spawn 28 pedestrians across all city routes & side roads
    const pathList = [
      grandEastPath,
      grandWestPath,
      leftRoadEastPath,
      leftRoadWestPath,
      rightRoadWestPath,
      rightRoadEastPath,
      schoolDistrictPath,
      techPlazaPath,
      crossNorthPath,
      crossSouthPath,
      commercialPlazaPath,
    ];

    let pedCount = 0;
    // Spawn 2-3 pedestrians on each path loop with offset start indexes
    pathList.forEach((path) => {
      const spawns = path.length > 6 ? 3 : 2;
      for (let s = 0; s < spawns; s++) {
        const startIdx = Math.floor((s * path.length) / spawns);
        const style = makeStyle(pedCount);
        this.pedestrians.push(new PedestrianAgent(this.scene, path, startIdx, style));
        pedCount++;
      }
    });
  }

  public update(delta: number, signalState: TrafficLightState, playerPos: THREE.Vector3) {
    this.pedestrians.forEach((p) => {
      p.update(delta, signalState, playerPos);
    });
  }
}
