import * as THREE from 'three';
import { CameraMode } from '../types';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export class GameCamera {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'chase';

  // Chase Camera parameters
  private chaseDistance = 6.8;
  private chaseHeight = 2.4;
  private lookAheadOffset = 3.5;
  private lookAtHeight = 1.2;

  // Smoothing buffers
  private currentCameraPos = new THREE.Vector3(0, 5, -10);
  private currentLookAt = new THREE.Vector3(0, 1.2, 0);

  // Dynamic FOV base
  private baseFov = 62;
  private currentFov = 62;

  // Mouse Orbit offsets
  public orbitYaw = 0;
  public orbitPitch = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 800);
    this.camera.position.set(0, 5, -10);
  }

  public toggleMode(): CameraMode {
    if (this.mode === 'chase') this.mode = 'cockpit';
    else if (this.mode === 'cockpit') this.mode = 'chase';
    else this.mode = 'chase';
    return this.mode;
  }

  public toggleRearView() {
    this.mode = this.mode === 'rearview' ? 'chase' : 'rearview';
    return this.mode;
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public addOrbit(deltaX: number, deltaY: number, sensitivity = 1.0) {
    this.orbitYaw -= deltaX * 0.004 * sensitivity;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch - deltaY * 0.003 * sensitivity,
      -0.35,
      0.65
    );
  }

  public resetOrbit() {
    this.orbitYaw = 0;
    this.orbitPitch = 0;
  }

  public update(delta: number, physics: VehiclePhysics) {
    const dt = Math.min(delta, 0.05);
    const speedKmh = physics.velocity.length() * 3.6;

    const yaw = physics.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    // Spring auto-centering on orbit when not interacting and car moving
    if (speedKmh > 8 && Math.abs(this.orbitYaw) > 0.001) {
      this.orbitYaw = THREE.MathUtils.lerp(this.orbitYaw, 0, 3.5 * dt);
    }
    if (speedKmh > 8 && Math.abs(this.orbitPitch) > 0.001) {
      this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, 0, 3.5 * dt);
    }

    if (this.mode === 'chase') {
      // 1. Third-Person Dynamic Chase Camera (with Mouse Orbit)
      const speedRatio = Math.min(1.0, speedKmh / 160);
      const dynamicDist = this.chaseDistance + speedRatio * 1.8;
      const dynamicHeight = this.chaseHeight + speedRatio * 0.4 + this.orbitPitch * 3.0;

      // Effective camera angle incorporating orbit
      const effectiveAngle = yaw + this.orbitYaw;
      const effectiveForward = new THREE.Vector3(Math.sin(effectiveAngle), 0, Math.cos(effectiveAngle));

      const targetPos = physics.position
        .clone()
        .addScaledVector(effectiveForward, -dynamicDist)
        .add(new THREE.Vector3(0, dynamicHeight, 0));

      const targetLookAt = physics.position
        .clone()
        .addScaledVector(effectiveForward, this.lookAheadOffset)
        .add(new THREE.Vector3(0, this.lookAtHeight, 0));

      const followSharpness = 9.0;
      const lookSharpness = 14.0;

      this.currentCameraPos.lerp(targetPos, followSharpness * dt);
      this.currentLookAt.lerp(targetLookAt, lookSharpness * dt);

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentLookAt);

      const targetFov = this.baseFov + speedRatio * 10;
      this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, 6 * dt);
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    } else if (this.mode === 'cockpit') {
      // 2. First-Person Cockpit Camera
      const cockpitOffset = new THREE.Vector3(-0.35, 0.82, -0.05);
      cockpitOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const driverHeadPos = physics.position.clone().add(cockpitOffset);

      driverHeadPos.y += physics.pitch * 0.2;
      driverHeadPos.addScaledVector(right, -physics.roll * 0.4);

      this.camera.position.copy(driverHeadPos);

      const lookAhead = forward.clone().multiplyScalar(25);
      lookAhead.addScaledVector(right, physics.steerAngle * 4.5);
      const cockpitLookAt = driverHeadPos.clone().add(lookAhead);
      cockpitLookAt.y -= 0.2;

      this.camera.lookAt(cockpitLookAt);
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();
    } else if (this.mode === 'rearview') {
      // 3. Rear-View Camera Mode (Look backwards down the road)
      const rearCamPos = physics.position.clone().add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(forward, 0.8);
      const lookBackward = physics.position.clone().add(new THREE.Vector3(0, 1.1, 0)).addScaledVector(forward, -35);

      this.camera.position.copy(rearCamPos);
      this.camera.lookAt(lookBackward);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    }
  }
}
