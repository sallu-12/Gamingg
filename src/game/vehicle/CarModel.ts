import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export class CarModel {
  public root: THREE.Group;
  public chassisGroup: THREE.Group;

  // Wheel meshes and pivots
  public frontLeftWheelPivot: THREE.Group;
  public frontRightWheelPivot: THREE.Group;
  public rearLeftWheelPivot: THREE.Group;
  public rearRightWheelPivot: THREE.Group;

  private frontLeftWheelMesh: THREE.Group;
  private frontRightWheelMesh: THREE.Group;
  private rearLeftWheelMesh: THREE.Group;
  private rearRightWheelMesh: THREE.Group;

  // Steering wheel mesh
  private steeringWheel: THREE.Group = new THREE.Group();

  // Light components
  private headlightLeftMesh: THREE.Mesh;
  private headlightRightMesh: THREE.Mesh;
  private headlightLeftSpot: THREE.SpotLight;
  private headlightRightSpot: THREE.SpotLight;

  private taillightBarMesh: THREE.Mesh;
  private taillightPointLeft: THREE.PointLight;
  private taillightPointRight: THREE.PointLight;

  private reverseLightMesh: THREE.Mesh;

  // Materials for dynamic toggling
  private bodyMaterial: THREE.MeshPhysicalMaterial;
  private glassMaterial: THREE.MeshPhysicalMaterial;
  private carbonMaterial: THREE.MeshStandardMaterial;
  private headlightMaterial: THREE.MeshStandardMaterial;
  private taillightMaterial: THREE.MeshStandardMaterial;
  private reverseMaterial: THREE.MeshStandardMaterial;
  private indicatorLeftMaterial: THREE.MeshStandardMaterial;
  private indicatorRightMaterial: THREE.MeshStandardMaterial;

  constructor(initialColor = '#e11d48') {
    this.root = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.root.add(this.chassisGroup);

    this.indicatorLeftMaterial = new THREE.MeshStandardMaterial({
      color: 0x332200,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    this.indicatorRightMaterial = new THREE.MeshStandardMaterial({
      color: 0x332200,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    // Initialize Materials with true automotive PBR properties (high color fidelity, glossy lacquer clearcoat)
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(initialColor),
      metalness: 0.12,          // Low metalness ensures rich, vivid pure base color without darkening
      roughness: 0.15,          // Mirror-smooth automotive body finish
      clearcoat: 1.0,           // Glossy protective clearcoat lacquer
      clearcoatRoughness: 0.04, // Crisp specular gleam
      reflectivity: 0.95,
      sheen: 0.35,              // Subtle automotive flake/luster
      sheenColor: new THREE.Color(initialColor),
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111625,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.65,
      transparent: true,
      opacity: 0.82,
    });

    this.carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      roughness: 0.45,
      metalness: 0.6,
    });

    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.1,
    });

    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0x990000,
      emissive: 0x330000,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    this.reverseMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });

    // Build Detailed Chassis & Bodywork
    this.buildBodywork();
    this.buildInterior();
    this.buildAeroAndDiffuser();

    // Soft omni-directional car fill light so paint color is always visible, rich, and brilliant from all camera angles
    const carFillLight = new THREE.PointLight(0xffffff, 0.45, 6, 2);
    carFillLight.position.set(0, 1.4, 0);
    this.chassisGroup.add(carFillLight);

    // Setup Wheels
    const { flPivot, frPivot, rlPivot, rrPivot, flMesh, frMesh, rlMesh, rrMesh } = this.buildWheels();
    this.frontLeftWheelPivot = flPivot;
    this.frontRightWheelPivot = frPivot;
    this.rearLeftWheelPivot = rlPivot;
    this.rearRightWheelPivot = rrPivot;

    this.frontLeftWheelMesh = flMesh;
    this.frontRightWheelMesh = frMesh;
    this.rearLeftWheelMesh = rlMesh;
    this.rearRightWheelMesh = rrMesh;

    // Build Headlights and Taillights
    const lights = this.buildLighting();
    this.headlightLeftMesh = lights.headlightLeft;
    this.headlightRightMesh = lights.headlightRight;
    this.headlightLeftSpot = lights.spotLeft;
    this.headlightRightSpot = lights.spotRight;
    this.taillightBarMesh = lights.taillightBar;
    this.taillightPointLeft = lights.tailPointLeft;
    this.taillightPointRight = lights.tailPointRight;
    this.reverseLightMesh = lights.reverseLight;

    // Enable shadows: Car casts realistic shadows onto the road, but disable self-shadowing on car bodywork
    // This prevents roof, spoiler & vents from casting ugly black shadows or shadow acne onto the car body paint
    this.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }

  public setPaintColor(hex: string | number) {
    this.setColor(hex);
  }

  private buildBodywork() {
    // 1. Lower Main Hull (Low, wide sports car foundation)
    const hullGeo = new THREE.BoxGeometry(1.86, 0.42, 4.35);
    const hull = new THREE.Mesh(hullGeo, this.bodyMaterial);
    hull.position.set(0, 0.35, 0);
    this.chassisGroup.add(hull);

    // 2. Sculpted Hood (Sloping downward at the front)
    const hoodGeo = new THREE.BoxGeometry(1.68, 0.16, 1.45);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 0.52, 1.35);
    hood.rotation.x = 0.08;
    this.chassisGroup.add(hood);

    // Hood aerodynamic air scoop / vent
    const ventGeo = new THREE.BoxGeometry(0.85, 0.04, 0.5);
    const hoodVent = new THREE.Mesh(ventGeo, this.carbonMaterial);
    hoodVent.position.set(0, 0.56, 1.3);
    hoodVent.rotation.x = 0.08;
    this.chassisGroup.add(hoodVent);

    // 3. Front Bumper & Low Splitter
    const bumperGeo = new THREE.BoxGeometry(1.88, 0.28, 0.55);
    const bumper = new THREE.Mesh(bumperGeo, this.bodyMaterial);
    bumper.position.set(0, 0.26, 2.15);
    this.chassisGroup.add(bumper);

    const splitterGeo = new THREE.BoxGeometry(1.94, 0.06, 0.7);
    const splitter = new THREE.Mesh(splitterGeo, this.carbonMaterial);
    splitter.position.set(0, 0.12, 2.22);
    this.chassisGroup.add(splitter);

    // Front Black Grille
    const grilleGeo = new THREE.BoxGeometry(1.2, 0.18, 0.06);
    const grille = new THREE.Mesh(grilleGeo, this.carbonMaterial);
    grille.position.set(0, 0.24, 2.44);
    this.chassisGroup.add(grille);

    // 4. Cockpit Roof & Pillars (Greenhouse)
    const roofGeo = new THREE.BoxGeometry(1.36, 0.34, 1.85);
    const roof = new THREE.Mesh(roofGeo, this.bodyMaterial);
    roof.position.set(0, 0.78, -0.15);
    this.chassisGroup.add(roof);

    // Windshield (Front glass)
    const windshieldGeo = new THREE.BoxGeometry(1.32, 0.38, 0.72);
    const windshield = new THREE.Mesh(windshieldGeo, this.glassMaterial);
    windshield.position.set(0, 0.72, 0.65);
    windshield.rotation.x = -0.58;
    this.chassisGroup.add(windshield);

    // Rear Window
    const rearGlassGeo = new THREE.BoxGeometry(1.28, 0.36, 0.85);
    const rearGlass = new THREE.Mesh(rearGlassGeo, this.glassMaterial);
    rearGlass.position.set(0, 0.69, -0.95);
    rearGlass.rotation.x = 0.48;
    this.chassisGroup.add(rearGlass);

    // Side Windows
    const sideWindowGeo = new THREE.BoxGeometry(1.39, 0.26, 1.25);
    const sideWindow = new THREE.Mesh(sideWindowGeo, this.glassMaterial);
    sideWindow.position.set(0, 0.72, -0.12);
    this.chassisGroup.add(sideWindow);

    // 5. Side Aerodynamic Skirts
    const skirtGeo = new THREE.BoxGeometry(0.12, 0.12, 2.45);
    const leftSkirt = new THREE.Mesh(skirtGeo, this.carbonMaterial);
    leftSkirt.position.set(-0.96, 0.18, 0);
    this.chassisGroup.add(leftSkirt);

    const rightSkirt = new THREE.Mesh(skirtGeo, this.carbonMaterial);
    rightSkirt.position.set(0.96, 0.18, 0);
    this.chassisGroup.add(rightSkirt);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.24, 0.12, 0.14);
    const leftMirror = new THREE.Mesh(mirrorGeo, this.carbonMaterial);
    leftMirror.position.set(-0.88, 0.66, 0.55);
    this.chassisGroup.add(leftMirror);

    const rightMirror = new THREE.Mesh(mirrorGeo, this.carbonMaterial);
    rightMirror.position.set(0.88, 0.66, 0.55);
    this.chassisGroup.add(rightMirror);
  }

  private buildInterior() {
    // Dashboard
    const dashGeo = new THREE.BoxGeometry(1.32, 0.24, 0.48);
    const dash = new THREE.Mesh(dashGeo, this.carbonMaterial);
    dash.position.set(0, 0.58, 0.52);
    this.chassisGroup.add(dash);

    // Sports Steering Wheel (Driver sits on the left side)
    this.steeringWheel = new THREE.Group();
    const rimGeo = new THREE.TorusGeometry(0.15, 0.024, 12, 24);
    const rim = new THREE.Mesh(rimGeo, this.carbonMaterial);
    const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    const hub = new THREE.Mesh(hubGeo, this.carbonMaterial);
    hub.rotation.x = Math.PI / 2;

    this.steeringWheel.add(rim);
    this.steeringWheel.add(hub);
    this.steeringWheel.position.set(-0.35, 0.64, 0.42);
    this.steeringWheel.rotation.x = -0.35;
    this.chassisGroup.add(this.steeringWheel);

    // Racing Bucket Seats
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
    const seatGeo = new THREE.BoxGeometry(0.44, 0.55, 0.45);

    const driverSeat = new THREE.Mesh(seatGeo, seatMat);
    driverSeat.position.set(-0.35, 0.48, -0.15);
    this.chassisGroup.add(driverSeat);

    const passengerSeat = new THREE.Mesh(seatGeo, seatMat);
    passengerSeat.position.set(0.35, 0.48, -0.15);
    this.chassisGroup.add(passengerSeat);
  }

  private buildAeroAndDiffuser() {
    // Rear Aerodynamic Wing / Spoiler
    const wingBladeGeo = new THREE.BoxGeometry(1.78, 0.05, 0.32);
    const wingBlade = new THREE.Mesh(wingBladeGeo, this.carbonMaterial);
    wingBlade.position.set(0, 0.88, -2.05);
    wingBlade.rotation.x = 0.06;
    this.chassisGroup.add(wingBlade);

    // Wing Struts / Uprights
    const strutGeo = new THREE.BoxGeometry(0.04, 0.28, 0.16);
    const leftStrut = new THREE.Mesh(strutGeo, this.carbonMaterial);
    leftStrut.position.set(-0.55, 0.74, -1.98);
    this.chassisGroup.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, this.carbonMaterial);
    rightStrut.position.set(0.55, 0.74, -1.98);
    this.chassisGroup.add(rightStrut);

    // Rear Lower Diffuser with Fins
    const diffuserGeo = new THREE.BoxGeometry(1.68, 0.14, 0.42);
    const diffuser = new THREE.Mesh(diffuserGeo, this.carbonMaterial);
    diffuser.position.set(0, 0.18, -2.12);
    diffuser.rotation.x = -0.15;
    this.chassisGroup.add(diffuser);

    // Quad Chrome Exhaust Tips
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });
    const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16);
    exhaustGeo.rotateX(Math.PI / 2);

    const ex1 = new THREE.Mesh(exhaustGeo, exhaustMat);
    ex1.position.set(-0.48, 0.2, -2.2);
    const ex2 = new THREE.Mesh(exhaustGeo, exhaustMat);
    ex2.position.set(-0.35, 0.2, -2.2);
    const ex3 = new THREE.Mesh(exhaustGeo, exhaustMat);
    ex3.position.set(0.35, 0.2, -2.2);
    const ex4 = new THREE.Mesh(exhaustGeo, exhaustMat);
    ex4.position.set(0.48, 0.2, -2.2);

    this.chassisGroup.add(ex1, ex2, ex3, ex4);
  }

  private buildWheels() {
    const flPivot = new THREE.Group();
    const frPivot = new THREE.Group();
    const rlPivot = new THREE.Group();
    const rrPivot = new THREE.Group();

    // Positions matching wheelbase (2.65m) and track (1.65m)
    const halfTrack = 0.86;
    const frontZ = 1.35;
    const rearZ = -1.3;
    const wheelY = 0.36;

    flPivot.position.set(-halfTrack, wheelY, frontZ);
    frPivot.position.set(halfTrack, wheelY, frontZ);
    rlPivot.position.set(-halfTrack, wheelY, rearZ);
    rrPivot.position.set(halfTrack, wheelY, rearZ);

    this.root.add(flPivot, frPivot, rlPivot, rrPivot);

    const flMesh = this.createWheelMesh(false);
    const frMesh = this.createWheelMesh(true);
    const rlMesh = this.createWheelMesh(false);
    const rrMesh = this.createWheelMesh(true);

    flPivot.add(flMesh);
    frPivot.add(frMesh);
    rlPivot.add(rlMesh);
    rrPivot.add(rrMesh);

    return { flPivot, frPivot, rlPivot, rrPivot, flMesh, frMesh, rlMesh, rrMesh };
  }

  private createWheelMesh(isRightSide: boolean): THREE.Group {
    const wheel = new THREE.Group();

    // Tire (Rubber with dark matte finish)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.9,
      metalness: 0.1,
    });
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    wheel.add(tire);

    // Rim (Metallic alloy)
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.92,
      roughness: 0.22,
    });
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheel.add(rim);

    // Ventilated Brake Rotor
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.95,
      roughness: 0.3,
    });
    const rotorGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = isRightSide ? 0.02 : -0.02;
    wheel.add(rotor);

    // Brembo Red Brake Caliper
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.6,
    });
    const caliperGeo = new THREE.BoxGeometry(0.08, 0.12, 0.14);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(isRightSide ? 0.03 : -0.03, 0.14, 0);
    wheel.add(caliper);

    // 5-Spoke Rim Details
    const spokeGeo = new THREE.BoxGeometry(0.04, 0.44, 0.05);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.rotation.x = (i * Math.PI) / 2.5;
      spoke.position.x = isRightSide ? 0.12 : -0.12;
      wheel.add(spoke);
    }

    return wheel;
  }

  private buildLighting() {
    // Headlight Meshes
    const headGeo = new THREE.BoxGeometry(0.38, 0.09, 0.08);
    const headLeft = new THREE.Mesh(headGeo, this.headlightMaterial);
    headLeft.position.set(-0.65, 0.42, 2.14);
    headLeft.rotation.y = -0.15;
    this.chassisGroup.add(headLeft);

    const headRight = new THREE.Mesh(headGeo, this.headlightMaterial);
    headRight.position.set(0.65, 0.42, 2.14);
    headRight.rotation.y = 0.15;
    this.chassisGroup.add(headRight);

    // Real Headlight Spotlights illuminating the road
    const spotLeft = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 5, 0.4, 1.2);
    spotLeft.position.set(-0.65, 0.42, 2.15);
    const targetLeft = new THREE.Object3D();
    targetLeft.position.set(-1.0, 0, 20);
    this.root.add(targetLeft);
    spotLeft.target = targetLeft;
    spotLeft.castShadow = true;
    this.chassisGroup.add(spotLeft);

    const spotRight = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 5, 0.4, 1.2);
    spotRight.position.set(0.65, 0.42, 2.15);
    const targetRight = new THREE.Object3D();
    targetRight.position.set(1.0, 0, 20);
    this.root.add(targetRight);
    spotRight.target = targetRight;
    spotRight.castShadow = true;
    this.chassisGroup.add(spotRight);

    // Rear Light Bar across trunk
    const tailBarGeo = new THREE.BoxGeometry(1.55, 0.06, 0.06);
    const tailBar = new THREE.Mesh(tailBarGeo, this.taillightMaterial);
    tailBar.position.set(0, 0.58, -2.14);
    this.chassisGroup.add(tailBar);

    // Real red point lights at the rear for brake illumination
    const tailPointLeft = new THREE.PointLight(0xff0000, 0.5, 4, 1.5);
    tailPointLeft.position.set(-0.6, 0.58, -2.2);
    this.chassisGroup.add(tailPointLeft);

    const tailPointRight = new THREE.PointLight(0xff0000, 0.5, 4, 1.5);
    tailPointRight.position.set(0.6, 0.58, -2.2);
    this.chassisGroup.add(tailPointRight);

    // Reverse light bar
    const revGeo = new THREE.BoxGeometry(0.35, 0.05, 0.05);
    const revMesh = new THREE.Mesh(revGeo, this.reverseMaterial);
    revMesh.position.set(0, 0.46, -2.16);
    this.chassisGroup.add(revMesh);

    // Front & Rear Amber Turn Indicator Lenses
    const indGeo = new THREE.BoxGeometry(0.12, 0.06, 0.06);
    // Front Left & Right Indicators
    const indFL = new THREE.Mesh(indGeo, this.indicatorLeftMaterial);
    indFL.position.set(-0.86, 0.42, 2.12);
    const indFR = new THREE.Mesh(indGeo, this.indicatorRightMaterial);
    indFR.position.set(0.86, 0.42, 2.12);

    // Rear Left & Right Indicators
    const indRL = new THREE.Mesh(indGeo, this.indicatorLeftMaterial);
    indRL.position.set(-0.86, 0.58, -2.14);
    const indRR = new THREE.Mesh(indGeo, this.indicatorRightMaterial);
    indRR.position.set(0.86, 0.58, -2.14);

    this.chassisGroup.add(indFL, indFR, indRL, indRR);

    return {
      headlightLeft: headLeft,
      headlightRight: headRight,
      spotLeft,
      spotRight,
      taillightBar: tailBar,
      tailPointLeft,
      tailPointRight,
      reverseLight: revMesh,
    };
  }

  public update(physics: VehiclePhysics): void {
    // 1. Sync Root Transform
    this.root.position.copy(physics.position);
    this.root.rotation.set(0, physics.yaw, 0);

    // 2. Weight Transfer on Chassis (Pitch & Roll)
    this.chassisGroup.rotation.x = physics.pitch;
    this.chassisGroup.rotation.z = physics.roll;

    // 3. Front Steering & Wheel Rotation Sync
    // Front wheel steer angles
    this.frontLeftWheelPivot.rotation.y = physics.steerAngle;
    this.frontRightWheelPivot.rotation.y = physics.steerAngle;

    // Wheel spin rotations
    this.frontLeftWheelMesh.rotation.x = physics.wheelRotations[0];
    this.frontRightWheelMesh.rotation.x = physics.wheelRotations[1];
    this.rearLeftWheelMesh.rotation.x = physics.wheelRotations[2];
    this.rearRightWheelMesh.rotation.x = physics.wheelRotations[3];

    // Suspension bounce offsets
    this.frontLeftWheelPivot.position.y = 0.36 + physics.wheelSuspensionOffset[0];
    this.frontRightWheelPivot.position.y = 0.36 + physics.wheelSuspensionOffset[1];
    this.rearLeftWheelPivot.position.y = 0.36 + physics.wheelSuspensionOffset[2];
    this.rearRightWheelPivot.position.y = 0.36 + physics.wheelSuspensionOffset[3];

    // 4. Interior Steering Wheel Rotation
    this.steeringWheel.rotation.z = -physics.steerAngle * 2.8;

    // 5. Lighting States Sync
    // Headlights
    if (physics.headlightsOn) {
      this.headlightMaterial.emissive.setHex(0xffffff);
      this.headlightMaterial.emissiveIntensity = 3.5;
      this.headlightLeftSpot.intensity = 18;
      this.headlightRightSpot.intensity = 18;
    } else {
      this.headlightMaterial.emissive.setHex(0x000000);
      this.headlightMaterial.emissiveIntensity = 0;
      this.headlightLeftSpot.intensity = 0;
      this.headlightRightSpot.intensity = 0;
    }

    // Brake Lights
    if (physics.brakeLightsOn) {
      this.taillightMaterial.emissive.setHex(0xff1111);
      this.taillightMaterial.emissiveIntensity = 4.0;
      this.taillightPointLeft.intensity = 3.5;
      this.taillightPointRight.intensity = 3.5;
    } else {
      this.taillightMaterial.emissive.setHex(0x550000);
      this.taillightMaterial.emissiveIntensity = 0.6;
      this.taillightPointLeft.intensity = 0.3;
      this.taillightPointRight.intensity = 0.3;
    }

    // Reverse Lights
    if (physics.reverseLightsOn) {
      this.reverseMaterial.emissive.setHex(0xffffff);
      this.reverseMaterial.emissiveIntensity = 2.5;
    } else {
      this.reverseMaterial.emissive.setHex(0x000000);
      this.reverseMaterial.emissiveIntensity = 0;
    }

    // Turn Indicators / Hazard Blinking
    const leftOn = (physics.indicatorLeft || physics.indicatorHazard) && physics.indicatorBlinkOn;
    this.indicatorLeftMaterial.emissive.setHex(leftOn ? 0xf59e0b : 0x000000);
    this.indicatorLeftMaterial.emissiveIntensity = leftOn ? 3.5 : 0;

    const rightOn = (physics.indicatorRight || physics.indicatorHazard) && physics.indicatorBlinkOn;
    this.indicatorRightMaterial.emissive.setHex(rightOn ? 0xf59e0b : 0x000000);
    this.indicatorRightMaterial.emissiveIntensity = rightOn ? 3.5 : 0;
  }

  public setColor(color: string | number) {
    const col = new THREE.Color(color);
    this.bodyMaterial.color.copy(col);
    if (this.bodyMaterial.sheenColor) {
      this.bodyMaterial.sheenColor.copy(col);
    }
  }
}
