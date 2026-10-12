import * as THREE from 'three';
import { HandlingMode, InputState, VehicleTelemetry } from '../types';

export interface WorldObstacle {
  min: THREE.Vector3;
  max: THREE.Vector3;
  type: 'building' | 'barrier' | 'prop';
}

export class VehiclePhysics {
  // Vehicle dimensional properties
  public readonly wheelbase = 2.65;
  public readonly trackWidth = 1.65;
  public readonly mass = 1420; // kg
  public readonly wheelRadius = 0.36; // meters

  // Current Transform
  public position = new THREE.Vector3(0, 0.36, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public yaw = 0; // heading angle in radians
  public pitch = 0; // dive/squat
  public roll = 0; // cornering lean
  public steerAngle = 0; // radians

  // Wheels state: [FL, FR, RL, RR]
  public wheelRotations = [0, 0, 0, 0];
  public wheelSuspensionOffset = [0, 0, 0, 0];

  // Engine & Transmission
  public rpm = 800;
  public gear: number | 'R' | 'N' = 1;
  public throttle = 0;
  public brake = 0;
  public handbrake = false;

  // Drift and Slip
  public driftSlip = 0;
  public isDrifting = false;
  public skidIntensity = 0;

  // Lighting states
  public headlightsOn = false;
  public brakeLightsOn = false;
  public reverseLightsOn = false;
  public indicatorLeft = false;
  public indicatorRight = false;
  public indicatorHazard = false;
  public indicatorBlinkOn = false;
  private indicatorTimer = 0;
  private hadSignificantTurn = false;

  // Handling mode & sensitivity tuning
  public handlingMode: HandlingMode = 'simulation';
  public wetSurfaceGripMultiplier = 1.0;
  public steeringSensitivityMultiplier = 1.0;
  public readonly topSpeedKmh = 265; // ~73.6 m/s
  public topSpeedRecord = 0;

  // Stunt Jump & Airborne Dynamics
  public verticalVelocity = 0;
  public isAirborne = false;
  public airTime = 0;
  private jumpStartPos = new THREE.Vector3();
  private prevThrottle = 0;

  // Transmission gear ratios
  private gearRatios = [3.8, 2.3, 1.6, 1.2, 0.95, 0.75];
  private finalDrive = 3.65;
  private maxEngineTorque = 520; // Nm

  // Collisions list
  public obstacles: WorldObstacle[] = [];
  public onCollision?: (impactSpeed: number) => void;
  public onLanding?: (airTime: number, distance: number) => void;
  public onTurboBlowoff?: () => void;

  constructor() {
    this.reset(0, 0);
  }

  public reset(x = 0, z = 0, angle = 0) {
    this.position.set(x, 0.36, z);
    this.velocity.set(0, 0, 0);
    this.yaw = angle;
    this.pitch = 0;
    this.roll = 0;
    this.steerAngle = 0;
    this.rpm = 800;
    this.gear = 1;
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = false;
    this.driftSlip = 0;
    this.isDrifting = false;
    this.skidIntensity = 0;
  }

  public update(delta: number, input: InputState): void {
    // Clamp delta time to avoid large physics steps
    const dt = Math.min(delta, 0.05);

    // 1. Process Steering (Speed-Sensitive progressive steering)
    const speedMs = this.velocity.length();
    const speedKmh = speedMs * 3.6;

    // Steering speed scaling: wide angle at slow speed, tight at highway speeds
    const maxSteerLimit = Math.max(0.22, 0.60 - (speedKmh / 160) * 0.38); // ~34 deg down to ~12 deg
    const steerSpeed = 4.5 * this.steeringSensitivityMultiplier; // rad/s response

    let targetSteer = 0;
    if (input.steerLeft) targetSteer += maxSteerLimit;
    if (input.steerRight) targetSteer -= maxSteerLimit;

    // Smooth return to center or steer towards target
    if (targetSteer !== 0) {
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, steerSpeed * dt);
      if (Math.abs(this.steerAngle) > 0.22) {
        this.hadSignificantTurn = true;
      }
    } else {
      // Self-centering spring
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, 0, 7.0 * dt);
      // Auto-cancel indicator when steering returns to center after turning
      if (this.hadSignificantTurn && Math.abs(this.steerAngle) < 0.05) {
        if (!this.indicatorHazard) {
          this.indicatorLeft = false;
          this.indicatorRight = false;
        }
        this.hadSignificantTurn = false;
      }
    }

    // Indicator Flash Timer (~1.5 Hz blink rate)
    this.indicatorTimer += dt;
    if (this.indicatorTimer >= 0.33) {
      this.indicatorTimer = 0;
      this.indicatorBlinkOn = !this.indicatorBlinkOn;
    }

    // 2. Headlight Toggle
    if (input.toggleLights) {
      this.headlightsOn = !this.headlightsOn;
    }

    // Indicators Input Toggle
    if (input.indicatorLeft) {
      this.indicatorLeft = !this.indicatorLeft;
      this.indicatorRight = false;
    }
    if (input.indicatorRight) {
      this.indicatorRight = !this.indicatorRight;
      this.indicatorLeft = false;
    }

    // 3. Reset
    if (input.resetVehicle) {
      this.reset(0, 0, 0);
      return;
    }

    // 4. Direction vectors
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Project velocity into local car space
    const forwardSpeed = this.velocity.dot(forward);
    const lateralSpeed = this.velocity.dot(right);

    // 5. Transmission & Throttle / Braking logic
    this.handbrake = input.handbrake;

    let targetThrottle = 0;
    let targetBrake = 0;

    if (input.accelerate) {
      // Accelerate always drives FORWARD: clear reverse gear and reverse lights immediately
      this.gear = (this.gear === 'R' || this.gear === 'N') ? 1 : this.gear;
      this.reverseLightsOn = false;

      if (forwardSpeed < -0.1) {
        // If moving backwards, apply powerful deceleration to immediately stop backward motion
        targetBrake = 1.0;
        targetThrottle = 0.0;
      } else {
        // Car stopped or moving forward: full forward throttle
        targetThrottle = 1.0;
        targetBrake = 0.0;
      }
    }

    if (input.brake) {
      if (forwardSpeed > 0.4) {
        // Braking while moving forward
        targetBrake = 1.0;
        targetThrottle = 0.0;
        this.reverseLightsOn = false;
      } else {
        // Car stopped or rolling backwards: shift into reverse and apply reverse throttle
        this.gear = 'R';
        targetThrottle = 0.85;
        targetBrake = 0.0;
        this.reverseLightsOn = true;
      }
    } else if (!input.accelerate && this.gear === 'R' && Math.abs(forwardSpeed) < 0.2) {
      this.gear = 1;
      this.reverseLightsOn = false;
    }

    this.throttle = THREE.MathUtils.lerp(this.throttle, targetThrottle, 14 * dt);
    this.brake = THREE.MathUtils.lerp(this.brake, targetBrake, 16 * dt);
    this.brakeLightsOn = this.brake > 0.1 || this.handbrake;

    // 6. Automatic Gearbox simulation & RPM Calculation
    if (this.gear !== 'R' && this.gear !== 'N') {
      let currentGearIdx = (this.gear as number) - 1;

      // Wheel angular velocity to engine RPM
      const currentRatio = this.gearRatios[currentGearIdx] * this.finalDrive;
      const wheelRpm = (forwardSpeed / (2 * Math.PI * this.wheelRadius)) * 60;
      let calculatedRpm = Math.abs(wheelRpm * currentRatio);

      if (this.throttle > 0.1) {
        calculatedRpm = Math.max(calculatedRpm, 1200 + this.throttle * 2400);
      }

      // Upshift at 6600 RPM
      if (calculatedRpm > 6600 && currentGearIdx < this.gearRatios.length - 1) {
        currentGearIdx++;
        this.gear = currentGearIdx + 1;
      }
      // Downshift below 2400 RPM
      else if (calculatedRpm < 2400 && currentGearIdx > 0 && speedKmh < (currentGearIdx * 30)) {
        currentGearIdx--;
        this.gear = currentGearIdx + 1;
      }

      const activeRatio = this.gearRatios[currentGearIdx] * this.finalDrive;
      const targetRpm = Math.max(800, Math.min(8000, Math.abs((forwardSpeed / (2 * Math.PI * this.wheelRadius)) * 60 * activeRatio) + (this.throttle * 1400)));
      this.rpm = THREE.MathUtils.lerp(this.rpm, targetRpm, 8 * dt);
    } else if (this.gear === 'R') {
      const revRatio = 3.4 * this.finalDrive;
      const targetRpm = Math.max(800, Math.min(5500, Math.abs((forwardSpeed / (2 * Math.PI * this.wheelRadius)) * 60 * revRatio) + (this.throttle * 1200)));
      this.rpm = THREE.MathUtils.lerp(this.rpm, targetRpm, 8 * dt);
    }

    // 7. Engine Drive Force & Braking Force
    const gearMult = this.gear === 'R' ? -2.2 : (typeof this.gear === 'number' ? this.gearRatios[this.gear - 1] : 1.0);
    let driveForce = this.throttle * (this.maxEngineTorque * gearMult * 0.9);

    if (this.handlingMode === 'arcade') driveForce *= 1.35;
    if (this.handlingMode === 'drift') driveForce *= 1.25;

    // Apply braking and rolling drag
    let brakeForce = this.brake * 1400;
    if (this.handbrake) {
      brakeForce += 2200;
    }

    // Aerodynamic and rolling drag
    const airDrag = 0.5 * 1.225 * 0.31 * 2.2 * Math.sign(forwardSpeed) * (forwardSpeed * forwardSpeed);
    const rollingResistance = Math.sign(forwardSpeed) * 35;

    let netForwardForce = driveForce - (Math.sign(forwardSpeed) * brakeForce) - airDrag - rollingResistance;

    // Zero out small crawl when idle
    if (this.throttle < 0.05 && this.brake < 0.05 && Math.abs(forwardSpeed) < 0.3) {
      netForwardForce = -forwardSpeed * 800;
    }

    const forwardAccel = netForwardForce / this.mass;

    // 8. Lateral Friction & Drift Slip Dynamics
    // Handling friction profiles
    let tireGrip = 1.0;
    let driftFactor = 1.0;

    if (this.handlingMode === 'arcade') {
      tireGrip = 1.35;
      driftFactor = 0.7;
    } else if (this.handlingMode === 'drift') {
      tireGrip = 0.85;
      driftFactor = 1.4;
    }

    // Rain / wet road grip reduction
    tireGrip *= this.wetSurfaceGripMultiplier;
    if (this.wetSurfaceGripMultiplier < 0.9) {
      driftFactor *= 1.35; // Easier to slide on wet pavement
    }

    // Handbrake triggers instant rear wheel slip
    if (this.handbrake) {
      tireGrip *= 0.35;
    }

    // Cornering slip angle
    const lateralSlip = Math.abs(lateralSpeed);
    this.driftSlip = lateralSlip / (Math.max(1.0, speedMs));
    this.isDrifting = this.driftSlip > 0.35 && speedKmh > 20;
    this.skidIntensity = Math.min(1.0, (this.driftSlip - 0.25) * 2.5);

    // Lateral resistance force (countering sideways slide)
    const maxLateralGrip = this.mass * 9.81 * tireGrip;
    const lateralResistance = -Math.sign(lateralSpeed) * Math.min(Math.abs(lateralSpeed) * 14.0 * this.mass, maxLateralGrip);

    // 9. Angular Velocity (Yaw Rotation from front-wheel steering)
    // Dynamic turning radius based on Ackermann geometry: R = L / tan(steer)
    let turningSpeed = 0;
    if (Math.abs(this.steerAngle) > 0.001) {
      // Angular velocity = v / R = (v * tan(steer)) / L
      turningSpeed = (forwardSpeed * Math.tan(this.steerAngle)) / this.wheelbase;

      // Drift oversteer kicks in when drifting or handbrake is yanked
      if (this.handbrake && speedKmh > 15) {
        turningSpeed += (this.steerAngle > 0 ? 1.5 : -1.5) * driftFactor;
      } else if (this.isDrifting) {
        turningSpeed += Math.sign(this.steerAngle) * 0.4 * driftFactor;
      }
    }

    this.yaw += turningSpeed * dt;

    // 10. Integrate Velocities
    // Local acceleration to world space
    let newForwardSpeed = forwardSpeed + forwardAccel * dt;
    if (input.accelerate && forwardSpeed < 0) {
      // Rapid forward drive takeover from reverse: immediately halt reverse and start moving forward
      if (newForwardSpeed >= -0.5) {
        newForwardSpeed = Math.max(0.5, newForwardSpeed);
      }
    }
    const newLateralSpeed = lateralSpeed + (lateralResistance / this.mass) * dt;

    this.velocity.copy(forward).multiplyScalar(newForwardSpeed).add(right.clone().multiplyScalar(newLateralSpeed));

    // Cap speed to top speed limit
    const maxMs = this.topSpeedKmh / 3.6;
    if (this.velocity.length() > maxMs) {
      this.velocity.setLength(maxMs);
    }

    // 11. Weight Transfer (Body Pitch & Roll)
    // Pitch: dives under braking/deceleration, squats under acceleration
    const targetPitch = THREE.MathUtils.clamp(-forwardAccel * 0.004, -0.06, 0.05);
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, 8 * dt);

    // Roll: body leans outside in high-speed turns
    const centripetalAccel = forwardSpeed * turningSpeed;
    const targetRoll = THREE.MathUtils.clamp(-centripetalAccel * 0.003, -0.07, 0.07);
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, 8 * dt);

    // 12. Wheel Visual Spin & Suspension travel
    const distanceStep = forwardSpeed * dt;
    const wheelAngleDelta = distanceStep / this.wheelRadius;

    for (let i = 0; i < 4; i++) {
      this.wheelRotations[i] += wheelAngleDelta;
    }

    // Suspension bounce offsets based on pitch and roll
    this.wheelSuspensionOffset[0] = -this.pitch * 0.4 + this.roll * 0.3; // FL
    this.wheelSuspensionOffset[1] = -this.pitch * 0.4 - this.roll * 0.3; // FR
    this.wheelSuspensionOffset[2] = this.pitch * 0.4 + this.roll * 0.3; // RL
    this.wheelSuspensionOffset[3] = this.pitch * 0.4 - this.roll * 0.3; // RR

    // 13. Stunt Ramp Jumping & Airborne Dynamics
    // Ramp 1: Boulevard Stunt Ramp at x ~ 0, z ~ -135
    // Ramp 2: Plaza Park Stunt Ramp at x ~ 45, z ~ -78
    const distToRamp1 = Math.hypot(this.position.x - 0, this.position.z - (-135));
    const distToRamp2 = Math.hypot(this.position.x - 45, this.position.z - (-78));

    if (!this.isAirborne && (distToRamp1 < 4.5 || distToRamp2 < 4.5) && forwardSpeed > 12.0) {
      this.isAirborne = true;
      this.airTime = 0;
      this.jumpStartPos.copy(this.position);
      this.verticalVelocity = Math.min(12.0, forwardSpeed * 0.38);
    }

    if (this.isAirborne) {
      this.airTime += dt;
      this.verticalVelocity -= 15.0 * dt; // Gravity
      this.position.y += this.verticalVelocity * dt;

      // Slight nose-up while airborne
      this.pitch = THREE.MathUtils.lerp(this.pitch, 0.08, 4 * dt);

      if (this.position.y <= 0.36) {
        this.position.y = 0.36;
        const landingSpeed = Math.abs(this.verticalVelocity);
        this.verticalVelocity = 0;
        this.isAirborne = false;

        const jumpDist = Math.round(this.position.distanceTo(this.jumpStartPos));
        if (this.airTime > 0.35 && this.onLanding) {
          this.onLanding(this.airTime, jumpDist);
        }
        if (landingSpeed > 4.0 && this.onCollision) {
          this.onCollision(landingSpeed * 0.8);
        }
        this.airTime = 0;
      }
    } else {
      this.position.y = 0.36;
    }

    // 14. Turbo Blow-Off Detection on sudden throttle lift-off
    if (this.prevThrottle > 0.75 && this.throttle < 0.25 && this.rpm > 4200) {
      if (this.onTurboBlowoff) this.onTurboBlowoff();
    }
    this.prevThrottle = this.throttle;

    // 15. Top speed record
    if (speedKmh > this.topSpeedRecord) {
      this.topSpeedRecord = speedKmh;
    }

    // 16. Move Position and Check Collisions
    const nextPos = this.position.clone().add(this.velocity.clone().multiplyScalar(dt));
    this.handleWorldCollisions(nextPos);
  }

  private handleWorldCollisions(targetPos: THREE.Vector3) {
    const carRadius = 1.1; // Bounding cylinder radius for fast AABB/cylinder check
    let collided = false;

    for (const obstacle of this.obstacles) {
      // Expanded AABB check
      const closestX = Math.max(obstacle.min.x, Math.min(targetPos.x, obstacle.max.x));
      const closestZ = Math.max(obstacle.min.z, Math.min(targetPos.z, obstacle.max.z));

      const distX = targetPos.x - closestX;
      const distZ = targetPos.z - closestZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < carRadius * carRadius) {
        collided = true;
        const dist = Math.sqrt(distSq);
        const overlap = carRadius - dist;

        // Push vehicle back outside collision box
        let normalX = distX / (dist || 1);
        let normalZ = distZ / (dist || 1);
        if (dist === 0) {
          normalX = 1;
          normalZ = 0;
        }

        targetPos.x += normalX * overlap * 1.1;
        targetPos.z += normalZ * overlap * 1.1;

        // Bounce reflection with velocity loss
        const collisionNormal = new THREE.Vector3(normalX, 0, normalZ).normalize();
        const incomingSpeed = this.velocity.length();

        if (incomingSpeed > 1.5 && this.onCollision) {
          this.onCollision(incomingSpeed);
        }

        const dot = this.velocity.dot(collisionNormal);
        if (dot < 0) {
          this.velocity.sub(collisionNormal.multiplyScalar(dot * 1.35));
          this.velocity.multiplyScalar(0.45); // momentum absorbed
        }
      }
    }

    this.position.copy(targetPos);
  }

  public getTelemetry(): VehicleTelemetry {
    const speedMs = this.velocity.length();
    const speedKmh = Math.round(speedMs * 3.6);
    const speedMph = Math.round(speedKmh * 0.621371);

    return {
      speedKmh,
      speedMph,
      rpm: Math.round(this.rpm),
      gear: this.gear,
      throttle: this.throttle,
      brake: this.brake,
      steer: this.steerAngle,
      handbrake: this.handbrake,
      isDrifting: this.isDrifting,
      driftSlip: this.driftSlip,
      isAirborne: this.isAirborne,
      airTime: Number(this.airTime.toFixed(2)),
      topSpeedRecord: Math.round(this.topSpeedRecord),
      headlightsOn: this.headlightsOn,
      brakeLightsOn: this.brakeLightsOn,
      reverseLightsOn: this.reverseLightsOn,
      indicatorLeft: (this.indicatorLeft || this.indicatorHazard) && this.indicatorBlinkOn,
      indicatorRight: (this.indicatorRight || this.indicatorHazard) && this.indicatorBlinkOn,
      heading: this.yaw,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
    };
  }
}
