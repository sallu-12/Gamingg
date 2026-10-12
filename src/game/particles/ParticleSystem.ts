import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';

interface SmokeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private smokeParticles: SmokeParticle[] = [];
  private sparkParticles: SparkParticle[] = [];

  private smokeMat: THREE.MeshBasicMaterial;
  private smokeGeo: THREE.SphereGeometry;

  private sparkMat: THREE.MeshBasicMaterial;
  private sparkGeo: THREE.SphereGeometry;

  // Skidmark mesh pool
  private skidMeshGroup: THREE.Group;
  private skidMat: THREE.MeshBasicMaterial;
  private lastLeftSkidPos: THREE.Vector3 | null = null;
  private lastRightSkidPos: THREE.Vector3 | null = null;
  private maxSkidSegments = 120;
  private skidSegments: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.smokeGeo = new THREE.SphereGeometry(0.3, 7, 7);
    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    this.sparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
    });

    this.skidMeshGroup = new THREE.Group();
    this.scene.add(this.skidMeshGroup);

    this.skidMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });
  }

  public update(delta: number, physics: VehiclePhysics) {
    // 1. Emit Smoke on Drift / Burnout / Hard Braking
    if (physics.isDrifting || (physics.handbrake && physics.velocity.length() > 2) || (physics.brake > 0.5 && physics.velocity.length() > 10)) {
      this.emitTireSmoke(physics);
      this.addSkidmarks(physics);
    } else {
      this.lastLeftSkidPos = null;
      this.lastRightSkidPos = null;
    }

    // 2. Update Active Smoke
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.smokeParticles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.velocity, delta);
      const scale = p.initialScale * (1 + progress * 3.5);
      p.mesh.scale.set(scale, scale, scale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.35;
    }

    // 3. Update Active Sparks
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.sparkParticles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 12 * delta; // Gravity
      p.mesh.position.addScaledVector(p.velocity, delta);
      const progress = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;
    }
  }

  private emitTireSmoke(physics: VehiclePhysics) {
    const yaw = physics.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    // Positions of rear left & rear right tires
    const rearPos = physics.position.clone().addScaledVector(forward, -1.3);
    const rl = rearPos.clone().addScaledVector(right, -0.86);
    const rr = rearPos.clone().addScaledVector(right, 0.86);

    [rl, rr].forEach((pos) => {
      if (Math.random() > 0.4) return; // Rate limiter

      const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.15, (Math.random() - 0.5) * 0.2));

      this.scene.add(mesh);

      this.smokeParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0.8 + Math.random() * 0.9,
          (Math.random() - 0.5) * 0.8
        ),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
        initialScale: 0.8 + Math.random() * 0.4,
      });
    });
  }

  private addSkidmarks(physics: VehiclePhysics) {
    const yaw = physics.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const rearPos = physics.position.clone().addScaledVector(forward, -1.3);
    const currentLeft = rearPos.clone().addScaledVector(right, -0.86);
    const currentRight = rearPos.clone().addScaledVector(right, 0.86);
    currentLeft.y = 0.025;
    currentRight.y = 0.025;

    if (this.lastLeftSkidPos && this.lastRightSkidPos) {
      if (currentLeft.distanceTo(this.lastLeftSkidPos) > 0.8) {
        this.createSkidStrip(this.lastLeftSkidPos, currentLeft);
        this.createSkidStrip(this.lastRightSkidPos, currentRight);

        this.lastLeftSkidPos = currentLeft.clone();
        this.lastRightSkidPos = currentRight.clone();
      }
    } else {
      this.lastLeftSkidPos = currentLeft.clone();
      this.lastRightSkidPos = currentRight.clone();
    }
  }

  private createSkidStrip(p1: THREE.Vector3, p2: THREE.Vector3) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const length = dir.length();
    if (length < 0.1) return;

    const geo = new THREE.PlaneGeometry(0.26, length);
    const mesh = new THREE.Mesh(geo, this.skidMat);

    mesh.position.copy(p1).add(dir.clone().multiplyScalar(0.5));
    mesh.position.y = 0.025;
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -Math.atan2(dir.x, dir.z);

    this.skidMeshGroup.add(mesh);
    this.skidSegments.push(mesh);

    // Limit pool size
    if (this.skidSegments.length > this.maxSkidSegments) {
      const old = this.skidSegments.shift()!;
      this.skidMeshGroup.remove(old);
      old.geometry.dispose();
    }
  }

  public triggerSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
      mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4));
      this.scene.add(mesh);

      this.sparkParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          2 + Math.random() * 5,
          (Math.random() - 0.5) * 6
        ),
        life: 0,
        maxLife: 0.3 + Math.random() * 0.25,
      });
    }
  }
}
