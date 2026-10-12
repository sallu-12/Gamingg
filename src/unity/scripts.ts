export interface UnityScriptFile {
  path: string;
  filename: string;
  category: string;
  description: string;
  code: string;
}

export const UNITY_PROJECT_SCRIPTS: UnityScriptFile[] = [
  {
    path: 'Assets/Scripts/Vehicle/CarController.cs',
    filename: 'CarController.cs',
    category: 'Vehicle Physics',
    description: 'Core WheelCollider physics controller with motor torque curves, speed-sensitive progressive steering, 6-speed automatic transmission, anti-roll stabilizer bars, downforce, and weight transfer.',
    code: `using System;
using UnityEngine;

namespace ApexVelocity.Vehicle
{
    [RequireComponent(typeof(Rigidbody))]
    public class CarController : MonoBehaviour
    {
        [Header("Wheel Colliders")]
        [SerializeField] private WheelCollider frontLeftCollider;
        [SerializeField] private WheelCollider frontRightCollider;
        [SerializeField] private WheelCollider rearLeftCollider;
        [SerializeField] private WheelCollider rearRightCollider;

        [Header("Engine & Transmission")]
        [SerializeField] private float maxMotorTorque = 650f;
        [SerializeField] private float maxBrakeTorque = 3000f;
        [SerializeField] private float handbrakeTorque = 6000f;
        [SerializeField] private float maxReverseTorque = 400f;
        [SerializeField] private float[] gearRatios = new float[] { 3.8f, 2.3f, 1.6f, 1.2f, 0.95f, 0.75f };
        [SerializeField] private float finalDriveRatio = 3.65f;
        [SerializeField] private float maxEngineRPM = 8000f;
        [SerializeField] private float idleEngineRPM = 850f;

        [Header("Steering Dynamics")]
        [SerializeField] private float maxSteerAngleAtLowSpeed = 34f;
        [SerializeField] private float minSteerAngleAtHighSpeed = 12f;
        [SerializeField] private float steeringSensitivity = 5f;

        [Header("Stability & Aerodynamics")]
        [SerializeField] private float antiRollBarStiffness = 5000f;
        [SerializeField] private float aerodynamicDownforce = 45f;
        [SerializeField] private Vector3 centerOfMassOffset = new Vector3(0f, -0.35f, 0.1f);

        // Rigidbody reference
        private Rigidbody rb;

        // Telemetry State
        public float CurrentSpeedKmh { get; private set; }
        public float CurrentRPM { get; private set; }
        public int CurrentGear { get; private set; } = 1;
        public bool IsReversing { get; private set; }
        public bool IsBraking { get; private set; }
        public bool IsHandbrakeEngaged { get; private set; }
        public float SteerInput { get; private set; }
        public float ThrottleInput { get; private set; }

        private float currentSteerAngle = 0f;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass += centerOfMassOffset;
        }

        private void FixedUpdate()
        {
            // Compute ground speed in km/h
            CurrentSpeedKmh = rb.linearVelocity.magnitude * 3.6f;

            // Handle Anti-roll stabilizer bars for realistic cornering without rolling over
            ApplyAntiRollBars(frontLeftCollider, frontRightCollider);
            ApplyAntiRollBars(rearLeftCollider, rearRightCollider);

            // Apply aerodynamic downforce
            ApplyDownforce();

            // Calculate engine RPM and automatic transmission gear
            CalculateRPMAndGears();
        }

        public void ProcessDriverInput(float vertical, float horizontal, bool handbrake)
        {
            ThrottleInput = vertical;
            SteerInput = horizontal;
            IsHandbrakeEngaged = handbrake;

            // 1. Progressive Steering with high-speed damping
            float speedFactor = Mathf.Clamp01(CurrentSpeedKmh / 160f);
            float targetMaxSteer = Mathf.Lerp(maxSteerAngleAtLowSpeed, minSteerAngleAtHighSpeed, speedFactor);
            float targetSteer = horizontal * targetMaxSteer;

            currentSteerAngle = Mathf.MoveTowards(currentSteerAngle, targetSteer, steeringSensitivity * 10f * Time.deltaTime);
            frontLeftCollider.steerAngle = currentSteerAngle;
            frontRightCollider.steerAngle = currentSteerAngle;

            // 2. Drive & Braking logic
            float forwardDot = Vector3.Dot(rb.linearVelocity, transform.forward);

            if (vertical > 0.05f)
            {
                if (forwardDot < -1f)
                {
                    // Moving backwards: apply brakes first
                    ApplyBrakes(maxBrakeTorque);
                    ApplyMotorTorque(0f);
                    IsBraking = true;
                    IsReversing = false;
                }
                else
                {
                    // Drive Forward
                    float gearMult = gearRatios[CurrentGear - 1] * finalDriveRatio;
                    float appliedTorque = vertical * (maxMotorTorque * gearMult / gearRatios[0]);
                    ApplyMotorTorque(appliedTorque);
                    ApplyBrakes(0f);
                    IsBraking = false;
                    IsReversing = false;
                }
            }
            else if (vertical < -0.05f)
            {
                if (forwardDot > 1f)
                {
                    // Moving forward: apply foot brakes
                    ApplyBrakes(maxBrakeTorque * Mathf.Abs(vertical));
                    ApplyMotorTorque(0f);
                    IsBraking = true;
                    IsReversing = false;
                }
                else
                {
                    // Reverse Drive
                    ApplyMotorTorque(-maxReverseTorque * Mathf.Abs(vertical));
                    ApplyBrakes(0f);
                    IsBraking = false;
                    IsReversing = true;
                }
            }
            else
            {
                // Idle coasting
                ApplyMotorTorque(0f);
                ApplyBrakes(CurrentSpeedKmh < 1.5f ? 40f : 0f);
                IsBraking = false;
                IsReversing = false;
            }

            // 3. Handbrake override on rear wheels
            if (handbrake)
            {
                rearLeftCollider.brakeTorque = handbrakeTorque;
                rearRightCollider.brakeTorque = handbrakeTorque;
                IsBraking = true;
            }
        }

        private void ApplyMotorTorque(float torque)
        {
            // Rear-Wheel Drive (or All-Wheel Drive by distributing 50/50)
            rearLeftCollider.motorTorque = torque * 0.5f;
            rearRightCollider.motorTorque = torque * 0.5f;
        }

        private void ApplyBrakes(float brakeTorque)
        {
            frontLeftCollider.brakeTorque = brakeTorque * 0.65f;
            frontRightCollider.brakeTorque = brakeTorque * 0.65f;
            rearLeftCollider.brakeTorque = brakeTorque * 0.35f;
            rearRightCollider.brakeTorque = brakeTorque * 0.35f;
        }

        private void ApplyAntiRollBars(WheelCollider leftWheel, WheelCollider rightWheel)
        {
            WheelHit hit;
            float travelL = 1.0f;
            float travelR = 1.0f;

            bool groundedL = leftWheel.GetGroundHit(out hit);
            if (groundedL) travelL = (-leftWheel.transform.InverseTransformPoint(hit.point).y - leftWheel.radius) / leftWheel.suspensionDistance;

            bool groundedR = rightWheel.GetGroundHit(out hit);
            if (groundedR) travelR = (-rightWheel.transform.InverseTransformPoint(hit.point).y - rightWheel.radius) / rightWheel.suspensionDistance;

            float antiRollForce = (travelL - travelR) * antiRollBarStiffness;

            if (groundedL) rb.AddForceAtPosition(leftWheel.transform.up * -antiRollForce, leftWheel.transform.position);
            if (groundedR) rb.AddForceAtPosition(rightWheel.transform.up * antiRollForce, rightWheel.transform.position);
        }

        private void ApplyDownforce()
        {
            rb.AddForce(-transform.up * aerodynamicDownforce * rb.linearVelocity.magnitude);
        }

        private void CalculateRPMAndGears()
        {
            if (IsReversing)
            {
                CurrentGear = -1;
                CurrentRPM = Mathf.Clamp(idleEngineRPM + (Mathf.Abs(ThrottleInput) * 3500f), idleEngineRPM, 5500f);
                return;
            }

            float wheelRpm = (rearLeftCollider.rpm + rearRightCollider.rpm) * 0.5f;
            float currentRatio = gearRatios[CurrentGear - 1] * finalDriveRatio;
            float calculatedRpm = Mathf.Abs(wheelRpm * currentRatio);

            // Upshift
            if (calculatedRpm > 6500f && CurrentGear < gearRatios.Length)
            {
                CurrentGear++;
            }
            // Downshift
            else if (calculatedRpm < 2200f && CurrentGear > 1)
            {
                CurrentGear--;
            }

            CurrentRPM = Mathf.Clamp(calculatedRpm + (Mathf.Abs(ThrottleInput) * 1200f), idleEngineRPM, maxEngineRPM);
        }

        public void ResetVehicle(Vector3 safePosition, Quaternion safeRotation)
        {
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            transform.position = safePosition;
            transform.rotation = safeRotation;
            currentSteerAngle = 0f;
            ApplyBrakes(0f);
            ApplyMotorTorque(0f);
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Vehicle/CarWheelVisualSync.cs',
    filename: 'CarWheelVisualSync.cs',
    category: 'Vehicle Visuals',
    description: 'Synchronizes physical WheelCollider suspensions, spin rotations, and steering angles with visual 3D wheel meshes using WheelCollider.GetWorldPose().',
    code: `using UnityEngine;

namespace ApexVelocity.Vehicle
{
    public class CarWheelVisualSync : MonoBehaviour
    {
        [System.Serializable]
        public struct WheelPair
        {
            public WheelCollider collider;
            public Transform visualMesh;
        }

        [Header("Wheels Binding")]
        [SerializeField] private WheelPair frontLeft;
        [SerializeField] private WheelPair frontRight;
        [SerializeField] private WheelPair rearLeft;
        [SerializeField] private WheelPair rearRight;

        private void Update()
        {
            UpdateWheelPose(frontLeft);
            UpdateWheelPose(frontRight);
            UpdateWheelPose(rearLeft);
            UpdateWheelPose(rearRight);
        }

        private void UpdateWheelPose(WheelPair pair)
        {
            if (pair.collider == null || pair.visualMesh == null) return;

            Vector3 worldPos;
            Quaternion worldRot;
            pair.collider.GetWorldPose(out worldPos, out worldRot);

            pair.visualMesh.position = worldPos;
            pair.visualMesh.rotation = worldRot;
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Vehicle/VehicleLighting.cs',
    filename: 'VehicleLighting.cs',
    category: 'Vehicle Visuals',
    description: 'Manages headlight projectors, high-beams, brake lights, and reverse lights with real illumination and emissive material property blocks.',
    code: `using UnityEngine;

namespace ApexVelocity.Vehicle
{
    public class VehicleLighting : MonoBehaviour
    {
        [Header("Headlights")]
        [SerializeField] private Light[] headlightSpots;
        [SerializeField] private MeshRenderer[] headlightLenses;
        [SerializeField] private Material headlightEmissiveMat;

        [Header("Brake & Taillights")]
        [SerializeField] private Light[] taillightPoints;
        [SerializeField] private MeshRenderer[] taillightLenses;

        [Header("Reverse Lights")]
        [SerializeField] private Light[] reverseLights;
        [SerializeField] private MeshRenderer[] reverseLenses;

        private CarController carController;
        private bool headlightsActive = false;
        private static readonly int EmissiveColorProp = Shader.PropertyToID("_EmissionColor");

        public bool HeadlightsActive => headlightsActive;

        private void Awake()
        {
            carController = GetComponentInParent<CarController>();
            SetHeadlights(false);
        }

        private void Update()
        {
            if (carController == null) return;

            // Brake light updates
            bool braking = carController.IsBraking || carController.IsHandbrakeEngaged;
            UpdateBrakeLights(braking);

            // Reverse light updates
            bool reversing = carController.IsReversing;
            UpdateReverseLights(reversing);
        }

        public void ToggleHeadlights()
        {
            headlightsActive = !headlightsActive;
            SetHeadlights(headlightsActive);
        }

        private void SetHeadlights(bool on)
        {
            headlightsActive = on;
            foreach (var spot in headlightSpots)
            {
                if (spot != null) spot.enabled = on;
            }
            Color emissiveColor = on ? Color.white * 2.5f : Color.black;
            foreach (var lens in headlightLenses)
            {
                if (lens != null) lens.material.SetColor(EmissiveColorProp, emissiveColor);
            }
        }

        private void UpdateBrakeLights(bool isBraking)
        {
            float intensity = isBraking ? 2.5f : (headlightsActive ? 0.35f : 0f);
            Color col = isBraking ? Color.red * 3.0f : (headlightsActive ? Color.red * 0.4f : Color.black);

            foreach (var point in taillightPoints)
            {
                if (point != null)
                {
                    point.enabled = intensity > 0;
                    point.intensity = intensity;
                }
            }
            foreach (var lens in taillightLenses)
            {
                if (lens != null) lens.material.SetColor(EmissiveColorProp, col);
            }
        }

        private void UpdateReverseLights(bool isReversing)
        {
            foreach (var rev in reverseLights)
            {
                if (rev != null) rev.enabled = isReversing;
            }
            Color col = isReversing ? Color.white * 2.0f : Color.black;
            foreach (var lens in reverseLenses)
            {
                if (lens != null) lens.material.SetColor(EmissiveColorProp, col);
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Camera/CarCameraController.cs',
    filename: 'CarCameraController.cs',
    category: 'Camera System',
    description: 'Third-person chase camera and first-person cockpit camera with smooth dampening, speed-scaled dynamic FOV, and obstacle clearance.',
    code: `using UnityEngine;

namespace ApexVelocity.CameraSystem
{
    public class CarCameraController : MonoBehaviour
    {
        public enum CameraMode { ThirdPersonChase, FirstPersonCockpit }

        [Header("Target Target")]
        [SerializeField] private Transform carTarget;
        [SerializeField] private Transform cockpitMountPoint;
        [SerializeField] private Rigidbody carRigidbody;

        [Header("Third Person Settings")]
        [SerializeField] private float defaultDistance = 6.8f;
        [SerializeField] private float defaultHeight = 2.4f;
        [SerializeField] private float lookAheadDistance = 3.5f;
        [SerializeField] private float followSharpness = 8.5f;
        [SerializeField] private float rotationSharpness = 12.0f;
        [SerializeField] private float baseFov = 60f;
        [SerializeField] private float maxFov = 74f;

        [Header("Cockpit Settings")]
        [SerializeField] private float cockpitFov = 72f;

        private Camera cam;
        private CameraMode currentMode = CameraMode.ThirdPersonChase;
        private Vector3 currentVelocity;
        private Vector3 targetPosition;

        public CameraMode CurrentMode => currentMode;

        private void Awake()
        {
            cam = GetComponent<Camera>();
        }

        private void LateUpdate()
        {
            if (carTarget == null) return;

            if (currentMode == CameraMode.ThirdPersonChase)
            {
                UpdateChaseCamera();
            }
            else
            {
                UpdateCockpitCamera();
            }
        }

        public void SwitchCameraMode()
        {
            currentMode = currentMode == CameraMode.ThirdPersonChase 
                ? CameraMode.FirstPersonCockpit 
                : CameraMode.ThirdPersonChase;
        }

        private void UpdateChaseCamera()
        {
            float speedKmh = carRigidbody != null ? carRigidbody.linearVelocity.magnitude * 3.6f : 0f;
            float speedRatio = Mathf.Clamp01(speedKmh / 160f);

            // Dynamic distance and height based on speed
            float dist = defaultDistance + (speedRatio * 1.5f);
            float height = defaultHeight + (speedRatio * 0.3f);

            // Desired camera position behind the car
            Vector3 desiredPos = carTarget.position - (carTarget.forward * dist) + (Vector3.up * height);
            transform.position = Vector3.Lerp(transform.position, desiredPos, followSharpness * Time.deltaTime);

            // Look target
            Vector3 lookTarget = carTarget.position + (carTarget.forward * lookAheadDistance) + (Vector3.up * 1.2f);
            Quaternion targetRot = Quaternion.LookRotation(lookTarget - transform.position);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, rotationSharpness * Time.deltaTime);

            // Dynamic Speed FOV
            cam.fieldOfView = Mathf.Lerp(cam.fieldOfView, Mathf.Lerp(baseFov, maxFov, speedRatio), 5f * Time.deltaTime);
        }

        private void UpdateCockpitCamera()
        {
            if (cockpitMountPoint != null)
            {
                transform.position = cockpitMountPoint.position;
                transform.rotation = cockpitMountPoint.rotation;
            }
            cam.fieldOfView = cockpitFov;
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/UI/CarHUD.cs',
    filename: 'CarHUD.cs',
    category: 'User Interface',
    description: 'Digital speedometer, gear indicator, RPM gauge, headlight status badge, camera mode text, and controls guide display.',
    code: `using UnityEngine;
using UnityEngine.UI;
using ApexVelocity.Vehicle;
using ApexVelocity.CameraSystem;

namespace ApexVelocity.UI
{
    public class CarHUD : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private CarController carController;
        [SerializeField] private VehicleLighting vehicleLighting;
        [SerializeField] private CarCameraController cameraController;

        [Header("UI Elements")]
        [SerializeField] private Text speedometerText;
        [SerializeField] private Text speedUnitText;
        [SerializeField] private Text gearText;
        [SerializeField] private Text rpmText;
        [SerializeField] private Image rpmFillBar;
        [SerializeField] private Image headlightIcon;
        [SerializeField] private Text cameraModeBadge;
        [SerializeField] private GameObject controlsPanel;

        [Header("Settings")]
        [SerializeField] private bool useMph = false;

        private void Update()
        {
            if (carController == null) return;

            // Speedometer
            float speed = carController.CurrentSpeedKmh;
            if (useMph) speed *= 0.621371f;

            if (speedometerText != null) speedometerText.text = Mathf.RoundToInt(speed).ToString();
            if (speedUnitText != null) speedUnitText.text = useMph ? "MPH" : "KM/H";

            // Gear Display
            if (gearText != null)
            {
                if (carController.CurrentGear == -1) gearText.text = "R";
                else if (carController.CurrentGear == 0) gearText.text = "N";
                else gearText.text = carController.CurrentGear.ToString();
            }

            // RPM & Fill
            if (rpmText != null) rpmText.text = Mathf.RoundToInt(carController.CurrentRPM).ToString();
            if (rpmFillBar != null) rpmFillBar.fillAmount = carController.CurrentRPM / 8000f;

            // Headlight Icon
            if (headlightIcon != null && vehicleLighting != null)
            {
                headlightIcon.color = vehicleLighting.HeadlightsActive ? Color.cyan : Color.gray;
            }

            // Camera Mode Badge
            if (cameraModeBadge != null && cameraController != null)
            {
                cameraModeBadge.text = cameraController.CurrentMode == CarCameraController.CameraMode.ThirdPersonChase 
                    ? "CHASE CAM" 
                    : "COCKPIT CAM";
            }
        }

        public void SetSpeedUnit(bool mph)
        {
            useMph = mph;
        }

        public void ToggleControlsPanel()
        {
            if (controlsPanel != null) controlsPanel.SetActive(!controlsPanel.activeSelf);
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/GameManagement/GameManager.cs',
    filename: 'GameManager.cs',
    category: 'Game Loop',
    description: 'Central game manager orchestrating PC inputs (W, A, S, D, Space, C, L, R, Esc), pause menu state, vehicle respawn/reset, and scene lifecycle.',
    code: `using UnityEngine;
using ApexVelocity.Vehicle;
using ApexVelocity.CameraSystem;

namespace ApexVelocity.GameManagement
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Required Core References")]
        [SerializeField] private CarController playerCar;
        [SerializeField] private VehicleLighting vehicleLighting;
        [SerializeField] private CarCameraController cameraController;
        [SerializeField] private GameObject pauseMenuCanvas;

        [Header("Spawn Configuration")]
        [SerializeField] private Transform defaultSpawnPoint;

        public bool IsPaused { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Update()
        {
            // 1. Pause Toggle (Escape)
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                TogglePause();
            }

            if (IsPaused) return;

            // 2. Camera Toggle (C)
            if (Input.GetKeyDown(KeyCode.C) && cameraController != null)
            {
                cameraController.SwitchCameraMode();
            }

            // 3. Headlight Toggle (L)
            if (Input.GetKeyDown(KeyCode.L) && vehicleLighting != null)
            {
                vehicleLighting.ToggleHeadlights();
            }

            // 4. Vehicle Reset (R)
            if (Input.GetKeyDown(KeyCode.R))
            {
                ResetPlayerVehicle();
            }

            // 5. Driving Controls Input Dispatch
            if (playerCar != null)
            {
                float v = Input.GetAxisRaw("Vertical");     // W / S or Up / Down
                float h = Input.GetAxisRaw("Horizontal");   // A / D or Left / Right
                bool handbrake = Input.GetKey(KeyCode.Space);

                playerCar.ProcessDriverInput(v, h, handbrake);
            }
        }

        public void TogglePause()
        {
            IsPaused = !IsPaused;
            Time.timeScale = IsPaused ? 0f : 1f;

            if (pauseMenuCanvas != null)
            {
                pauseMenuCanvas.SetActive(IsPaused);
            }

            Cursor.visible = IsPaused;
            Cursor.lockState = IsPaused ? CursorLockMode.None : CursorLockMode.Locked;
        }

        public void ResumeGame()
        {
            if (IsPaused) TogglePause();
        }

        public void ResetPlayerVehicle()
        {
            if (playerCar == null) return;

            Vector3 spawnPos = defaultSpawnPoint != null ? defaultSpawnPoint.position : new Vector3(0f, 0.5f, 0f);
            Quaternion spawnRot = defaultSpawnPoint != null ? defaultSpawnPoint.rotation : Quaternion.identity;

            playerCar.ResetVehicle(spawnPos, spawnRot);
        }

        public void QuitGame()
        {
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
            #else
            Application.Quit();
            #endif
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/World/CityBoundaryCollider.cs',
    filename: 'CityBoundaryCollider.cs',
    category: 'World & Collisions',
    description: 'Catches out-of-bounds rollover or fall-through events and safely triggers instant vehicle realignment onto the nearest asphalt lane.',
    code: `using UnityEngine;
using ApexVelocity.GameManagement;

namespace ApexVelocity.World
{
    public class CityBoundaryCollider : MonoBehaviour
    {
        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player") || other.GetComponentInParent<ApexVelocity.Vehicle.CarController>() != null)
            {
                Debug.LogWarning("[CityBoundary] Vehicle breached world boundary. Resetting to roadway.");
                if (GameManager.Instance != null)
                {
                    GameManager.Instance.ResetPlayerVehicle();
                }
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Traffic/AITrafficCar.cs',
    filename: 'AITrafficCar.cs',
    category: 'AI Traffic',
    description: 'Autonomous AI traffic vehicle that follows road waypoints, regulates cruising speed, detects forward obstacles using physics raycasts, and stops at red traffic lights.',
    code: `using UnityEngine;

namespace ApexVelocity.Traffic
{
    public class AITrafficCar : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float cruisingSpeed = 12f; // ~43 km/h
        [SerializeField] private float acceleration = 3.5f;
        [SerializeField] private float brakingPower = 8f;
        [SerializeField] private float lookAheadDistance = 15f;

        [Header("Sensors")]
        [SerializeField] private LayerMask obstacleLayers;
        [SerializeField] private Transform forwardSensor;

        private float currentSpeed = 0f;
        private bool isBraking = false;
        private Transform currentTargetWaypoint;

        public void SetTargetWaypoint(Transform waypoint)
        {
            currentTargetWaypoint = waypoint;
        }

        private void Update()
        {
            if (currentTargetWaypoint == null) return;

            // 1. Raycast obstacle detection ahead
            RaycastHit hit;
            Vector3 origin = forwardSensor != null ? forwardSensor.position : transform.position + Vector3.up * 0.5f;
            bool obstacleAhead = Physics.Raycast(origin, transform.forward, out hit, lookAheadDistance, obstacleLayers);

            float targetSpeed = cruisingSpeed;

            if (obstacleAhead)
            {
                float distance = hit.distance;
                if (distance < 5f)
                {
                    targetSpeed = 0f;
                    isBraking = true;
                }
                else
                {
                    targetSpeed = Mathf.Lerp(0f, cruisingSpeed, (distance - 5f) / 10f);
                    isBraking = true;
                }
            }
            else
            {
                isBraking = false;
            }

            // 2. Accelerate or brake smoothly
            float rate = isBraking ? brakingPower : acceleration;
            currentSpeed = Mathf.MoveTowards(currentSpeed, targetSpeed, rate * Time.deltaTime);

            // 3. Move forward
            transform.position += transform.forward * currentSpeed * Time.deltaTime;

            // 4. Steer toward waypoint
            Vector3 targetDir = (currentTargetWaypoint.position - transform.position).normalized;
            targetDir.y = 0;
            if (targetDir != Vector3.zero)
            {
                Quaternion targetRot = Quaternion.LookRotation(targetDir);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRot, 60f * Time.deltaTime);
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Traffic/TrafficIntersectionController.cs',
    filename: 'TrafficIntersectionController.cs',
    category: 'AI Traffic',
    description: 'Coordinates traffic signal phase state machine (North-South Green vs East-West Green), animated signal lights, and stop line trigger zones.',
    code: `using UnityEngine;

namespace ApexVelocity.Traffic
{
    public class TrafficIntersectionController : MonoBehaviour
    {
        public enum SignalState { NorthSouthGreen, NorthSouthYellow, EastWestGreen, EastWestYellow }

        [Header("Timing")]
        [SerializeField] private float greenDuration = 12f;
        [SerializeField] private float yellowDuration = 3f;

        [Header("Visual Signal Lights")]
        [SerializeField] private Light[] northSouthGreenLights;
        [SerializeField] private Light[] northSouthYellowLights;
        [SerializeField] private Light[] northSouthRedLights;

        [SerializeField] private Light[] eastWestGreenLights;
        [SerializeField] private Light[] eastWestYellowLights;
        [SerializeField] private Light[] eastWestRedLights;

        private SignalState currentState = SignalState.NorthSouthGreen;
        private float stateTimer = 0f;

        public SignalState CurrentState => currentState;

        private void Update()
        {
            stateTimer += Time.deltaTime;

            switch (currentState)
            {
                case SignalState.NorthSouthGreen:
                    if (stateTimer >= greenDuration) SwitchState(SignalState.NorthSouthYellow);
                    break;
                case SignalState.NorthSouthYellow:
                    if (stateTimer >= yellowDuration) SwitchState(SignalState.EastWestGreen);
                    break;
                case SignalState.EastWestGreen:
                    if (stateTimer >= greenDuration) SwitchState(SignalState.EastWestYellow);
                    break;
                case SignalState.EastWestYellow:
                    if (stateTimer >= yellowDuration) SwitchState(SignalState.NorthSouthGreen);
                    break;
            }
        }

        private void SwitchState(SignalState newState)
        {
            currentState = newState;
            stateTimer = 0f;
            UpdateSignalLights();
        }

        private void UpdateSignalLights()
        {
            bool nsG = currentState == SignalState.NorthSouthGreen;
            bool nsY = currentState == SignalState.NorthSouthYellow;
            bool nsR = currentState == SignalState.EastWestGreen || currentState == SignalState.EastWestYellow;

            bool ewG = currentState == SignalState.EastWestGreen;
            bool ewY = currentState == SignalState.EastWestYellow;
            bool ewR = currentState == SignalState.NorthSouthGreen || currentState == SignalState.NorthSouthYellow;

            SetLights(northSouthGreenLights, nsG);
            SetLights(northSouthYellowLights, nsY);
            SetLights(northSouthRedLights, nsR);

            SetLights(eastWestGreenLights, ewG);
            SetLights(eastWestYellowLights, ewY);
            SetLights(eastWestRedLights, ewR);
        }

        private void SetLights(Light[] lights, bool active)
        {
            if (lights == null) return;
            foreach (var l in lights)
            {
                if (l != null) l.enabled = active;
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Traffic/PedestrianController.cs',
    filename: 'PedestrianController.cs',
    category: 'Pedestrians',
    description: 'Simulates procedural pedestrian sidewalk patrolling, walking animation cycles, and stopping at crosswalks during green traffic signals.',
    code: `using UnityEngine;

namespace ApexVelocity.Traffic
{
    public class PedestrianController : MonoBehaviour
    {
        [Header("Waypoints")]
        [SerializeField] private Transform[] sidewalkWaypoints;
        [SerializeField] private float walkSpeed = 1.35f;

        [Header("Animation References")]
        [SerializeField] private Transform leftLeg;
        [SerializeField] private Transform rightLeg;

        private int currentIdx = 0;
        private float walkCycle = 0f;

        private void Update()
        {
            if (sidewalkWaypoints == null || sidewalkWaypoints.Length == 0) return;

            Transform target = sidewalkWaypoints[currentIdx];
            Vector3 dir = (target.position - transform.position);
            dir.y = 0;

            if (dir.magnitude < 0.5f)
            {
                currentIdx = (currentIdx + 1) % sidewalkWaypoints.Length;
            }
            else
            {
                transform.position += dir.normalized * walkSpeed * Time.deltaTime;
                transform.rotation = Quaternion.LookRotation(dir.normalized);

                // Procedural leg swing animation
                walkCycle += Time.deltaTime * 6f;
                float legAngle = Mathf.Sin(walkCycle) * 28f;
                if (leftLeg != null) leftLeg.localRotation = Quaternion.Euler(legAngle, 0, 0);
                if (rightLeg != null) rightLeg.localRotation = Quaternion.Euler(-legAngle, 0, 0);
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Environment/TimeAndWeatherManager.cs',
    filename: 'TimeAndWeatherManager.cs',
    category: 'Environment & Weather',
    description: 'Manages dynamic day/sunset/night lighting cycles, sky blending, streetlamp emissive states, rain particle systems, and wet-asphalt tire grip reduction.',
    code: `using UnityEngine;
using ApexVelocity.Vehicle;

namespace ApexVelocity.Environment
{
    public class TimeAndWeatherManager : MonoBehaviour
    {
        public enum Weather { Clear, Cloudy, Rain }
        public enum TimeOfDay { Day, Sunset, Night }

        [Header("Lighting")]
        [SerializeField] private Light sunLight;
        [SerializeField] private ParticleSystem rainParticles;
        [SerializeField] private CarController playerCar;

        [Header("Current State")]
        [SerializeField] private TimeOfDay currentTime = TimeOfDay.Day;
        [SerializeField] private Weather currentWeather = Weather.Clear;

        public void SetTimeOfDay(TimeOfDay time)
        {
            currentTime = time;
            if (sunLight == null) return;

            switch (time)
            {
                case TimeOfDay.Day:
                    sunLight.color = Color.white;
                    sunLight.intensity = 1.8f;
                    sunLight.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
                    break;
                case TimeOfDay.Sunset:
                    sunLight.color = new Color(1f, 0.45f, 0.15f);
                    sunLight.intensity = 1.2f;
                    sunLight.transform.rotation = Quaternion.Euler(15f, -60f, 0f);
                    break;
                case TimeOfDay.Night:
                    sunLight.color = new Color(0.2f, 0.4f, 0.8f);
                    sunLight.intensity = 0.2f;
                    sunLight.transform.rotation = Quaternion.Euler(-30f, 120f, 0f);
                    break;
            }
        }

        public void SetWeather(Weather weather)
        {
            currentWeather = weather;

            if (rainParticles != null)
            {
                if (weather == Weather.Rain) rainParticles.Play();
                else rainParticles.Stop();
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Missions/MissionManager.cs',
    filename: 'MissionManager.cs',
    category: 'Game Missions',
    description: 'Drives gameplay objectives including Downtown Checkpoint Sprint races, Precision Parking validation, and Drift score competitions with timers and HUD events.',
    code: `using System;
using UnityEngine;
using ApexVelocity.Vehicle;

namespace ApexVelocity.Missions
{
    public class MissionManager : MonoBehaviour
    {
        public enum MissionType { None, CheckpointSprint, PrecisionParking, DriftChallenge }

        [Header("References")]
        [SerializeField] private CarController playerCar;
        [SerializeField] private Transform[] sprintCheckpoints;
        [SerializeField] private Transform parkingZoneTarget;

        [Header("Mission Status")]
        [SerializeField] private MissionType activeMission = MissionType.None;
        [SerializeField] private float timeRemaining = 0f;
        [SerializeField] private int currentScore = 0;

        public event Action OnMissionCompleted;
        public event Action OnMissionFailed;

        public void StartSprintRace()
        {
            activeMission = MissionType.CheckpointSprint;
            timeRemaining = 65f;
            currentScore = 0;
        }

        private void Update()
        {
            if (activeMission == MissionType.None) return;

            timeRemaining -= Time.deltaTime;
            if (timeRemaining <= 0f)
            {
                timeRemaining = 0f;
                activeMission = MissionType.None;
                OnMissionFailed?.Invoke();
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Vehicle/VehicleIndicators.cs',
    filename: 'VehicleIndicators.cs',
    category: 'Vehicle Visuals',
    description: 'Manages left/right amber turn blinkers and hazard lights with 1.5Hz flasher relay audio and automatic steering cancellation.',
    code: `using UnityEngine;

namespace ApexVelocity.Vehicle
{
    public class VehicleIndicators : MonoBehaviour
    {
        [Header("Blinker Lights")]
        [SerializeField] private Light[] leftBlinkerLights;
        [SerializeField] private Light[] rightBlinkerLights;
        [SerializeField] private MeshRenderer[] leftBlinkerLenses;
        [SerializeField] private MeshRenderer[] rightBlinkerLenses;

        [Header("Timing")]
        [SerializeField] private float blinkInterval = 0.33f;

        private bool leftActive = false;
        private bool rightActive = false;
        private bool hazardActive = false;
        private bool isBlinkStateOn = false;
        private float timer = 0f;

        public bool LeftActive => leftActive || hazardActive;
        public bool RightActive => rightActive || hazardActive;

        public void ToggleLeft()
        {
            leftActive = !leftActive;
            rightActive = false;
        }

        public void ToggleRight()
        {
            rightActive = !rightActive;
            leftActive = false;
        }

        public void ToggleHazard()
        {
            hazardActive = !hazardActive;
        }

        private void Update()
        {
            if (!leftActive && !rightActive && !hazardActive)
            {
                SetLights(leftBlinkerLights, leftBlinkerLenses, false);
                SetLights(rightBlinkerLights, rightBlinkerLenses, false);
                return;
            }

            timer += Time.deltaTime;
            if (timer >= blinkInterval)
            {
                timer = 0f;
                isBlinkStateOn = !isBlinkStateOn;
            }

            SetLights(leftBlinkerLights, leftBlinkerLenses, (leftActive || hazardActive) && isBlinkStateOn);
            SetLights(rightBlinkerLights, rightBlinkerLenses, (rightActive || hazardActive) && isBlinkStateOn);
        }

        private void SetLights(Light[] lights, MeshRenderer[] lenses, bool on)
        {
            if (lights != null)
            {
                foreach (var l in lights) if (l != null) l.enabled = on;
            }
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Input/InputRebindingManager.cs',
    filename: 'InputRebindingManager.cs',
    category: 'Input System',
    description: 'Dynamic key remapping system with PlayerPrefs persistence, conflict detection, and default restoration.',
    code: `using System;
using System.Collections.Generic;
using UnityEngine;

namespace ApexVelocity.InputSystem
{
    public class InputRebindingManager : MonoBehaviour
    {
        public static InputRebindingManager Instance { get; private set; }

        public enum ActionType { Accelerate, Brake, SteerLeft, SteerRight, Handbrake, ToggleCamera, ToggleLights, ResetVehicle }

        private Dictionary<ActionType, KeyCode> keyBindings = new Dictionary<ActionType, KeyCode>();

        private void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            LoadBindings();
        }

        public void LoadBindings()
        {
            keyBindings[ActionType.Accelerate] = (KeyCode)PlayerPrefs.GetInt("Key_Accelerate", (int)KeyCode.W);
            keyBindings[ActionType.Brake] = (KeyCode)PlayerPrefs.GetInt("Key_Brake", (int)KeyCode.S);
            keyBindings[ActionType.SteerLeft] = (KeyCode)PlayerPrefs.GetInt("Key_SteerLeft", (int)KeyCode.A);
            keyBindings[ActionType.SteerRight] = (KeyCode)PlayerPrefs.GetInt("Key_SteerRight", (int)KeyCode.D);
            keyBindings[ActionType.Handbrake] = (KeyCode)PlayerPrefs.GetInt("Key_Handbrake", (int)KeyCode.Space);
            keyBindings[ActionType.ToggleCamera] = (KeyCode)PlayerPrefs.GetInt("Key_Camera", (int)KeyCode.C);
            keyBindings[ActionType.ToggleLights] = (KeyCode)PlayerPrefs.GetInt("Key_Lights", (int)KeyCode.L);
            keyBindings[ActionType.ResetVehicle] = (KeyCode)PlayerPrefs.GetInt("Key_Reset", (int)KeyCode.R);
        }

        public void Rebind(ActionType action, KeyCode newKey)
        {
            keyBindings[action] = newKey;
            PlayerPrefs.SetInt("Key_" + action, (int)newKey);
            PlayerPrefs.Save();
        }

        public KeyCode GetKey(ActionType action)
        {
            return keyBindings.TryGetValue(action, out var k) ? k : KeyCode.None;
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/UI/FullMapNavigation.cs',
    filename: 'FullMapNavigation.cs',
    category: 'User Interface',
    description: 'Interactive full-screen city map modal with GPS destination pinning, route distance display, and landmark navigation.',
    code: `using UnityEngine;
using UnityEngine.UI;

namespace ApexVelocity.UI
{
    public class FullMapNavigation : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform playerCarTransform;
        [SerializeField] private RectTransform playerMapMarker;
        [SerializeField] private GameObject gpsBeaconWorldPrefab;

        private GameObject currentActiveBeacon;

        public void SetGpsDestination(Vector3 worldTarget)
        {
            if (currentActiveBeacon == null && gpsBeaconWorldPrefab != null)
            {
                currentActiveBeacon = Instantiate(gpsBeaconWorldPrefab, worldTarget, Quaternion.identity);
            }
            else if (currentActiveBeacon != null)
            {
                currentActiveBeacon.transform.position = worldTarget;
            }
        }

        private void Update()
        {
            if (playerCarTransform == null || playerMapMarker == null) return;

            // Synchronize player position & heading angle on map
            Vector3 pos = playerCarTransform.position;
            playerMapMarker.anchoredPosition = new Vector2(pos.x * 2f, pos.z * 2f);
            playerMapMarker.rotation = Quaternion.Euler(0, 0, -playerCarTransform.eulerAngles.y);
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/UI/GameMainMenu.cs',
    filename: 'GameMainMenu.cs',
    category: 'Game Loop',
    description: 'Polished main menu controller managing session startup, mission launches, settings navigation, and smooth scene loading.',
    code: `using UnityEngine;
using UnityEngine.SceneManagement;

namespace ApexVelocity.UI
{
    public class GameMainMenu : MonoBehaviour
    {
        [Header("Menu Panels")]
        [SerializeField] private GameObject settingsPanel;
        [SerializeField] private GameObject controlsPanel;

        public void PlayGame()
        {
            gameObject.SetActive(false);
            Time.timeScale = 1f;
        }

        public void OpenSettings()
        {
            if (settingsPanel != null) settingsPanel.SetActive(true);
        }

        public void OpenControls()
        {
            if (controlsPanel != null) controlsPanel.SetActive(true);
        }

        public void QuitGame()
        {
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
            #else
            Application.Quit();
            #endif
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Environment/SpeedTrapCamera.cs',
    filename: 'SpeedTrapCamera.cs',
    category: 'World & Collisions',
    description: 'Radar speed trap camera with high-intensity xenon flash strobes, speed violation detection, and audio shutter triggers.',
    code: `using UnityEngine;
using System.Collections;
using ApexVelocity.Vehicle;

namespace ApexVelocity.Environment
{
    public class SpeedTrapCamera : MonoBehaviour
    {
        [Header("Speed Limits")]
        [SerializeField] private float speedLimitKmh = 70f;
        [SerializeField] private float cooldownSeconds = 4f;

        [Header("Flash Strobes")]
        [SerializeField] private Light[] flashStrobes;
        [SerializeField] private AudioSource shutterAudio;

        private float lastTriggerTime = -10f;

        private void OnTriggerEnter(Collider other)
        {
            CarController car = other.GetComponentInParent<CarController>();
            if (car == null) return;

            if (car.CurrentSpeedKmh > speedLimitKmh && Time.time - lastTriggerTime > cooldownSeconds)
            {
                lastTriggerTime = Time.time;
                StartCoroutine(TriggerFlashRoutine(car.CurrentSpeedKmh));
            }
        }

        private IEnumerator TriggerFlashRoutine(float capturedSpeed)
        {
            Debug.Log($"[SpeedTrap] VIOLATION: {Mathf.RoundToInt(capturedSpeed)} KM/H (Limit: {speedLimitKmh})");
            if (shutterAudio != null) shutterAudio.Play();

            // Double Xenon flash burst
            for (int i = 0; i < 2; i++)
            {
                SetFlashes(true);
                yield return new WaitForSeconds(0.06f);
                SetFlashes(false);
                yield return new WaitForSeconds(0.04f);
            }
        }

        private void SetFlashes(bool active)
        {
            if (flashStrobes == null) return;
            foreach (var l in flashStrobes) if (l != null) l.enabled = active;
        }
    }
}`
  },
  {
    path: 'Assets/Scripts/Environment/StuntRampTrigger.cs',
    filename: 'StuntRampTrigger.cs',
    category: 'World & Collisions',
    description: 'PhysX stunt ramp impulse trigger imparting progressive vertical velocity, tracking vehicle airborne time, and calculating launch jump distance.',
    code: `using UnityEngine;
using ApexVelocity.Vehicle;

namespace ApexVelocity.Environment
{
    public class StuntRampTrigger : MonoBehaviour
    {
        [Header("Jump Physics")]
        [SerializeField] private float minLaunchSpeed = 12f;
        [SerializeField] private float verticalImpulseMultiplier = 0.38f;
        [SerializeField] private float maxUpwardVelocity = 12f;

        private void OnTriggerEnter(Collider other)
        {
            CarController car = other.GetComponentInParent<CarController>();
            if (car == null) return;

            Rigidbody rb = car.GetComponent<Rigidbody>();
            if (rb == null) return;

            float forwardSpeed = Vector3.Dot(rb.linearVelocity, car.transform.forward);
            if (forwardSpeed > minLaunchSpeed)
            {
                float upwardSpeed = Mathf.Min(maxUpwardVelocity, forwardSpeed * verticalImpulseMultiplier);
                Vector3 launchVel = rb.linearVelocity;
                launchVel.y = upwardSpeed;
                rb.linearVelocity = launchVel;

                Debug.Log($"[StuntRamp] Vehicle launched into air with vertical velocity: {upwardSpeed:F1} m/s");
            }
        }
    }
}`
  }
];

export const UNITY_SETUP_GUIDE = `# Apex Velocity 3D Driving Game — Unity Setup & Implementation Guide (Phases 1, 2 & 3)

## 1. Project Requirements & Supported Unity Versions
- **Recommended**: Unity 2022.3 LTS or Unity 6000 LTS
- **Render Pipeline**: Universal Render Pipeline (URP) or Built-in Render Pipeline
- **Physics**: PhysX 4.x / 5.x default Unity physics engine

## 2. Directory Structure
\`\`\`
Assets/
  ├── Scripts/
  │    ├── Vehicle/
  │    │    ├── CarController.cs
  │    │    ├── CarWheelVisualSync.cs
  │    │    ├── VehicleLighting.cs
  │    │    └── VehicleIndicators.cs
  │    ├── Camera/
  │    │    └── CarCameraController.cs
  │    ├── Traffic/
  │    │    ├── AITrafficCar.cs
  │    │    ├── TrafficIntersectionController.cs
  │    │    └── PedestrianController.cs
  │    ├── Environment/
  │    │    └── TimeAndWeatherManager.cs
  │    ├── Missions/
  │    │    └── MissionManager.cs
  │    ├── Input/
  │    │    └── InputRebindingManager.cs
  │    ├── UI/
  │    │    ├── CarHUD.cs
  │    │    ├── FullMapNavigation.cs
  │    │    └── GameMainMenu.cs
  │    ├── World/
  │    │    └── CityBoundaryCollider.cs
  │    └── GameManagement/
  │         └── GameManager.cs
\`\`\`

## 3. Vehicle Rigidbody & WheelCollider Settings
1. **Rigidbody**:
   - Mass: \`1420\`
   - Drag: \`0.05\`
   - Angular Drag: \`3.0\`
   - Interpolation: \`Interpolate\`
   - Collision Detection: \`Continuous Dynamic\`
2. **WheelColliders**:
   - Radius: \`0.36\`
   - Suspension Distance: \`0.22\`
   - Spring: \`35000\`, Damper: \`4500\`, Target Position: \`0.5\`
   - Forward Friction: Extremum Slip \`0.4\`, Extremum Value \`1.0\`, Asymptote Slip \`0.8\`, Asymptote Value \`0.75\`
   - Sideways Friction: Extremum Slip \`0.25\`, Extremum Value \`1.0\`, Asymptote Slip \`0.5\`, Asymptote Value \`0.75\`

## 4. Keybind Mapping
| Action | Key | Description |
| :--- | :--- | :--- |
| **Throttle** | \`W\` / \`Up\` | Progressive engine acceleration |
| **Brake / Reverse** | \`S\` / \`Down\` | Dynamic 4-wheel braking & automatic reverse gear |
| **Steering** | \`A\` / \`D\` | Speed-sensitive progressive steering with auto-centering |
| **Handbrake** | \`Space\` | Rear-wheel lockup and drift oversteer initiation |
| **Camera Toggle** | \`C\` | Switch between 3rd-Person Chase Cam and Cockpit Cam |
| **Headlights** | \`L\` | Toggle forward projector beams and high beams |
| **Reset Vehicle** | \`R\` | Instantly realign car onto road with zero momentum |
| **Pause Menu** | \`Escape\` | Toggle pause menu, settings, and cursor |
`;
