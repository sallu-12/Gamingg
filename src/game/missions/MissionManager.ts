import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { MissionState, MissionType } from '../types';

export class MissionManager {
  public scene: THREE.Scene;
  public state: MissionState;

  // 3D Visual Beacon / Checkpoint Marker
  private markerGroup: THREE.Group;
  private ringMesh: THREE.Mesh;
  private lightPillarMesh: THREE.Mesh;

  // Sprint checkpoints list
  private sprintCheckpoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0.5, -90),
    new THREE.Vector3(-90, 0.5, -90),
    new THREE.Vector3(-90, 0.5, 90),
    new THREE.Vector3(0, 0.5, 90),
  ];

  // Parking challenge state
  private parkingHoldTimer = 0;
  private readonly parkingTarget = new THREE.Vector3(38, 0, -35);

  // Audio / FX callbacks
  public onCheckpointPassed?: () => void;
  public onMissionCompleted?: () => void;
  public onMissionFailed?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.state = {
      type: 'none',
      title: 'Free Drive Mode',
      description: 'Explore the open city district. Select a challenge from the Pause Menu or HUD.',
      status: 'idle',
      timeRemaining: 0,
      score: 0,
      targetScore: 0,
      currentCheckpoint: 0,
      totalCheckpoints: 0,
    };

    // Build In-World 3D Objective Marker
    this.markerGroup = new THREE.Group();

    // Floating Neon Torus Ring
    const ringGeo = new THREE.TorusGeometry(3.2, 0.35, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.y = 1.8;
    this.markerGroup.add(this.ringMesh);

    // Glowing Sky Beacon Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 40, 16);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    this.lightPillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    this.lightPillarMesh.position.y = 20;
    this.markerGroup.add(this.lightPillarMesh);

    this.markerGroup.visible = false;
    this.scene.add(this.markerGroup);
  }

  public startMission(type: MissionType) {
    if (type === 'none') {
      this.cancelMission();
      return;
    }

    if (type === 'checkpoint_sprint') {
      this.state = {
        type: 'checkpoint_sprint',
        title: 'Downtown Sprint',
        description: 'Hit all 4 intersections within the time limit!',
        status: 'active',
        timeRemaining: 65,
        score: 0,
        targetScore: 4,
        currentCheckpoint: 1,
        totalCheckpoints: 4,
        targetPosition: {
          x: this.sprintCheckpoints[0].x,
          y: this.sprintCheckpoints[0].y,
          z: this.sprintCheckpoints[0].z,
        },
      };
      this.setMarkerPosition(this.sprintCheckpoints[0], 0x38bdf8);
    } else if (type === 'precision_park') {
      this.state = {
        type: 'precision_park',
        title: 'Precision Parking',
        description: 'Navigate to the commercial plaza parking bay and hold still.',
        status: 'active',
        timeRemaining: 75,
        score: 0,
        targetScore: 100, // percentage held
        currentCheckpoint: 1,
        totalCheckpoints: 1,
        targetPosition: {
          x: this.parkingTarget.x,
          y: this.parkingTarget.y,
          z: this.parkingTarget.z,
        },
      };
      this.parkingHoldTimer = 0;
      this.setMarkerPosition(this.parkingTarget, 0x22c55e);
    } else if (type === 'drift_master') {
      this.state = {
        type: 'drift_master',
        title: 'Drift King Challenge',
        description: 'Accumulate 1,500 drift points by sliding through street corners!',
        status: 'active',
        timeRemaining: 50,
        score: 0,
        targetScore: 1500,
        currentCheckpoint: 0,
        totalCheckpoints: 0,
      };
      this.markerGroup.visible = false;
    } else if (type === 'delivery_rush') {
      this.state = {
        type: 'delivery_rush',
        title: 'Express Delivery Rush',
        description: 'STAGE 1: Pick up cargo at Commercial Plaza (x: 44, z: -35)!',
        status: 'active',
        timeRemaining: 70,
        score: 0,
        targetScore: 2,
        currentCheckpoint: 1,
        totalCheckpoints: 2,
        targetPosition: { x: 44, y: 0.5, z: -35 },
      };
      this.setMarkerPosition(new THREE.Vector3(44, 0.5, -35), 0xf59e0b);
    }
  }

  public cancelMission() {
    this.state = {
      type: 'none',
      title: 'Free Drive Mode',
      description: 'Explore the open city district. Select a challenge from the Pause Menu or HUD.',
      status: 'idle',
      timeRemaining: 0,
      score: 0,
      targetScore: 0,
      currentCheckpoint: 0,
      totalCheckpoints: 0,
    };
    this.markerGroup.visible = false;
  }

  private setMarkerPosition(pos: THREE.Vector3, colorHex: number) {
    this.markerGroup.position.copy(pos);
    this.markerGroup.visible = true;
    (this.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    (this.lightPillarMesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }

  public update(delta: number, physics: VehiclePhysics) {
    if (this.state.status !== 'active') return;

    // Pulse & rotate 3D beacon
    if (this.markerGroup.visible) {
      this.ringMesh.rotation.z += delta * 2.0;
      this.ringMesh.position.y = 1.8 + Math.sin(performance.now() * 0.004) * 0.4;
    }

    // Timer countdown
    this.state.timeRemaining -= delta;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.status = 'failed';
      this.markerGroup.visible = false;
      if (this.onMissionFailed) this.onMissionFailed();
      return;
    }

    const playerPos = physics.position;
    const speedKmh = physics.velocity.length() * 3.6;

    // 1. Downtown Sprint Logic
    if (this.state.type === 'checkpoint_sprint') {
      const activeIdx = this.state.currentCheckpoint - 1;
      const targetPos = this.sprintCheckpoints[activeIdx];
      const dist = playerPos.distanceTo(targetPos);

      if (dist < 8.0) {
        // Checkpoint passed!
        if (this.onCheckpointPassed) this.onCheckpointPassed();

        if (this.state.currentCheckpoint < this.state.totalCheckpoints) {
          this.state.currentCheckpoint++;
          this.state.score = this.state.currentCheckpoint - 1;
          const nextTarget = this.sprintCheckpoints[this.state.currentCheckpoint - 1];
          this.setMarkerPosition(nextTarget, 0x38bdf8);
          this.state.targetPosition = { x: nextTarget.x, y: nextTarget.y, z: nextTarget.z };
        } else {
          // Sprint Finished!
          this.state.status = 'completed';
          this.state.score = 4;
          this.markerGroup.visible = false;
          if (this.onMissionCompleted) this.onMissionCompleted();
        }
      }
    }
    // 2. Precision Parking Logic
    else if (this.state.type === 'precision_park') {
      const dist = playerPos.distanceTo(this.parkingTarget);

      // Car must be inside bay (dist < 3.2m) and almost stationary (< 2.5 km/h)
      if (dist < 3.2 && speedKmh < 2.5) {
        this.parkingHoldTimer += delta;
        this.state.score = Math.min(100, Math.round((this.parkingHoldTimer / 2.0) * 100));

        if (this.parkingHoldTimer >= 2.0) {
          this.state.status = 'completed';
          this.markerGroup.visible = false;
          if (this.onMissionCompleted) this.onMissionCompleted();
        }
      } else {
        this.parkingHoldTimer = Math.max(0, this.parkingHoldTimer - delta * 1.5);
        this.state.score = Math.round((this.parkingHoldTimer / 2.0) * 100);
      }
    }
    // 3. Drift Master Logic
    else if (this.state.type === 'drift_master') {
      if (physics.isDrifting) {
        const pointsThisStep = Math.round(physics.driftSlip * 420 * delta);
        this.state.score += pointsThisStep;

        if (this.state.score >= this.state.targetScore) {
          this.state.score = this.state.targetScore;
          this.state.status = 'completed';
          if (this.onMissionCompleted) this.onMissionCompleted();
        }
      }
    }
    // 4. Express Delivery Rush Logic
    else if (this.state.type === 'delivery_rush') {
      if (this.state.currentCheckpoint === 1) {
        // Stage 1: Pickup point at Commercial Plaza (44, 0.5, -35)
        const pickupPos = new THREE.Vector3(44, 0.5, -35);
        if (playerPos.distanceTo(pickupPos) < 7.5 && speedKmh < 15) {
          this.state.currentCheckpoint = 2;
          this.state.score = 1;
          this.state.description = 'STAGE 2: Deliver cargo to Financial Tower (x: -45, z: -40)!';
          const dropoffPos = new THREE.Vector3(-45, 0.5, -40);
          this.setMarkerPosition(dropoffPos, 0x10b981);
          this.state.targetPosition = { x: -45, y: 0.5, z: -40 };
          if (this.onCheckpointPassed) this.onCheckpointPassed();
        }
      } else if (this.state.currentCheckpoint === 2) {
        // Stage 2: Dropoff point at Financial Tower (-45, 0.5, -40)
        const dropoffPos = new THREE.Vector3(-45, 0.5, -40);
        if (playerPos.distanceTo(dropoffPos) < 7.5 && speedKmh < 15) {
          this.state.status = 'completed';
          this.state.score = 2;
          this.markerGroup.visible = false;
          if (this.onMissionCompleted) this.onMissionCompleted();
        }
      }
    }
  }
}
