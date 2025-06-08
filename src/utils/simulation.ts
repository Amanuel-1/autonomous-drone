import { Vector3 } from 'three';
import { Building, DroneState, SimulationControls } from '../types/simulation';

export const generateBuildings = (count: number, areaSize: number): Building[] => {
  const buildings: Building[] = [];
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    const height = Math.random() * 20 + 5; // Buildings between 5-25 units tall
    const width = Math.random() * 8 + 3; // Buildings between 3-11 units wide
    const depth = Math.random() * 8 + 3; // Buildings between 3-11 units deep
    
    // Generate random colors for buildings
    const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#DEB887'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    buildings.push({
      id: `building-${i}`,
      position: new Vector3(x, height / 2, z),
      size: new Vector3(width, height, depth),
      color
    });
  }
  
  return buildings;
};

export const updateDronePosition = (
  droneState: DroneState,
  controls: SimulationControls,
  deltaTime: number
): DroneState => {
  const newState = {
    ...droneState,
    velocity: droneState.velocity.clone(),
    position: droneState.position.clone(),
    rotation: droneState.rotation.clone(),
    angularVelocity: droneState.angularVelocity.clone()
  };

  // ===== FPV DRONE PHYSICS CONSTANTS =====
  const GRAVITY = 9.81; // Realistic gravity (m/s²)
  const DRONE_MASS = 0.5; // Drone mass in kg (typical FPV drone)
  const MAX_THRUST = 20.0; // Maximum thrust force (N)
  const HOVER_THRUST = GRAVITY * DRONE_MASS; // Thrust needed to hover

  // Tilt physics
  const MAX_TILT_ANGLE = Math.PI / 4; // 45 degrees max tilt (realistic for FPV)
  const TILT_RESPONSE_RATE = 8.0; // How quickly drone responds to stick input
  const STABILIZATION_RATE = 12.0; // How quickly drone self-stabilizes

  // Movement physics
  const THRUST_TO_ACCELERATION = 15.0; // How much acceleration per unit of tilt
  const YAW_RATE = 3.0; // Yaw rotation speed (rad/s)
  const AIR_RESISTANCE = 0.98; // Air resistance factor (0.98 = 2% drag per frame)

  // Hover mode settings
  const HOVER_STABILITY_FACTOR = 0.95; // How stable hover mode is

  // ===== TAKEOFF AND LANDING =====
  if (controls.takeoff && newState.isLanded) {
    console.log('FPV TAKEOFF: Entering flight mode');
    newState.isLanded = false;
    newState.isFlying = true;
    newState.throttle = 0.6; // Start with 60% throttle for smooth takeoff
    newState.enginePower = 0.6;
    newState.velocity.y = 1.5; // Gentle initial lift
    // Reset tilt for level takeoff
    newState.rotation.x = 0;
    newState.rotation.z = 0;
  }

  if (controls.land && newState.isFlying) {
    // Gradual landing - reduce throttle over time
    newState.throttle = Math.max(0, newState.throttle - deltaTime * 0.8);
    console.log('FPV LANDING: Reducing throttle to ' + (newState.throttle * 100).toFixed(0) + '%');
  }

  // ===== FPV THRUST SYSTEM =====
  let currentThrust = 0;

  if (newState.isFlying) {
    // Base thrust calculation
    let baseThrust = HOVER_THRUST; // Thrust needed to hover
    let thrustModifier = 0;

    // Handle hover mode
    if (controls.hover) {
      console.log('FPV HOVER: Activating stabilization mode');
      baseThrust = HOVER_THRUST * 1.05; // Slightly more thrust for stable hover
      thrustModifier = 0;
    } else {
      // Manual throttle control
      if (controls.throttleUp) {
        thrustModifier = 8.0; // Additional thrust for climbing
        console.log('FPV THROTTLE: UP - Additional thrust +' + thrustModifier + 'N');
      }
      if (controls.throttleDown) {
        thrustModifier = -6.0; // Reduce thrust for descending
        console.log('FPV THROTTLE: DOWN - Thrust reduction ' + thrustModifier + 'N');
      }
    }

    // Calculate total thrust
    currentThrust = baseThrust + thrustModifier;

    // Update UI values
    newState.throttle = Math.max(0, Math.min(1, (currentThrust / MAX_THRUST)));
    newState.enginePower = newState.throttle;

  } else {
    currentThrust = 0;
    newState.enginePower = 0;
    newState.throttle = 0;
  }

  // ===== YAW ROTATION (Shift + Arrow Left/Right) =====
  if (controls.rotateLeft && newState.isFlying) {
    newState.rotation.y += YAW_RATE * deltaTime;
    console.log('FPV YAW: LEFT - Yaw: ' + (newState.rotation.y * 180 / Math.PI).toFixed(1) + '°');
  }
  if (controls.rotateRight && newState.isFlying) {
    newState.rotation.y -= YAW_RATE * deltaTime;
    console.log('FPV YAW: RIGHT - Yaw: ' + (newState.rotation.y * 180 / Math.PI).toFixed(1) + '°');
  }

  // ===== CAMERA GIMBAL CONTROLS (IJKL keys) =====
  const cameraSpeed = 2.0;
  const maxCameraTilt = Math.PI / 3; // 60 degrees max tilt
  const maxCameraRotation = Math.PI; // 180 degrees max rotation

  if (controls.cameraTiltUp) {
    newState.cameraTilt = Math.min(maxCameraTilt, newState.cameraTilt + cameraSpeed * deltaTime);
  }
  if (controls.cameraTiltDown) {
    newState.cameraTilt = Math.max(-maxCameraTilt, newState.cameraTilt - cameraSpeed * deltaTime);
  }
  if (controls.cameraRotateLeft) {
    newState.cameraRotation = Math.min(maxCameraRotation, newState.cameraRotation + cameraSpeed * deltaTime);
  }
  if (controls.cameraRotateRight) {
    newState.cameraRotation = Math.max(-maxCameraRotation, newState.cameraRotation - cameraSpeed * deltaTime);
  }



  // ===== FPV TILT PHYSICS: Realistic drone movement through tilting =====
  let desiredPitch = 0; // Forward/backward tilt (X-axis rotation)
  let desiredRoll = 0;  // Left/right tilt (Z-axis rotation)

  if (newState.isFlying) {
    // Calculate desired tilt based on movement inputs
    if (controls.moveForward) {
      desiredPitch = -MAX_TILT_ANGLE * 0.7; // 70% of max tilt for forward (nose down to move forward)
      console.log('FPV MOVE: FORWARD - Tilting nose down');
    }
    if (controls.moveBackward) {
      desiredPitch = MAX_TILT_ANGLE * 0.5; // 50% for backward (nose up to move backward)
      console.log('FPV MOVE: BACKWARD - Tilting nose up');
    }
    if (controls.moveLeft) {
      desiredRoll = MAX_TILT_ANGLE * 0.7; // 70% of max tilt for left (positive roll)
      console.log('FPV MOVE: LEFT - Rolling left');
    }
    if (controls.moveRight) {
      desiredRoll = -MAX_TILT_ANGLE * 0.7; // 70% of max tilt for right (negative roll)
      console.log('FPV MOVE: RIGHT - Rolling right');
    }

    // Enhanced stabilization logic
    const anyMovementInput = controls.moveForward || controls.moveBackward || controls.moveLeft || controls.moveRight;
    const isHovering = controls.hover;

    if (!anyMovementInput || isHovering) {
      // Return to level flight when no input or in hover mode
      desiredPitch = 0;
      desiredRoll = 0;
      if (isHovering) {
        console.log('FPV HOVER: Auto-leveling drone');
      } else {
        console.log('FPV STABILIZE: No input - returning to level');
      }
    }
  }

  // ===== SMOOTH TILT TRANSITIONS =====
  const pitchDiff = desiredPitch - newState.rotation.x;
  const rollDiff = desiredRoll - newState.rotation.z;

  // Determine response rate based on input state
  const anyMovementInput = controls.moveForward || controls.moveBackward || controls.moveLeft || controls.moveRight;
  const isHovering = controls.hover;

  let currentTiltRate;
  if (isHovering) {
    currentTiltRate = STABILIZATION_RATE * 1.5; // Faster stabilization in hover mode
  } else if (anyMovementInput) {
    currentTiltRate = TILT_RESPONSE_RATE; // Normal response to input
  } else {
    currentTiltRate = STABILIZATION_RATE; // Auto-stabilization rate
  }

  // Apply smooth tilt changes
  newState.rotation.x += pitchDiff * currentTiltRate * deltaTime;
  newState.rotation.z += rollDiff * currentTiltRate * deltaTime;

  // Clamp tilt angles to realistic FPV limits
  newState.rotation.x = Math.max(-MAX_TILT_ANGLE, Math.min(MAX_TILT_ANGLE, newState.rotation.x));
  newState.rotation.z = Math.max(-MAX_TILT_ANGLE, Math.min(MAX_TILT_ANGLE, newState.rotation.z));

  // ===== REALISTIC FPV PHYSICS APPLICATION =====
  if (newState.isFlying) {
    // ===== VERTICAL FORCES: Thrust vs Gravity =====
    const netVerticalForce = (currentThrust - (GRAVITY * DRONE_MASS)) / DRONE_MASS;
    newState.velocity.y += netVerticalForce * deltaTime;

    // ===== HORIZONTAL FORCES: Tilt-based movement (realistic FPV physics) =====
    const yaw = newState.rotation.y;
    const pitch = newState.rotation.x;
    const roll = newState.rotation.z;

    // Calculate thrust vector components based on drone orientation
    const thrustMagnitude = currentThrust / DRONE_MASS;

    // Forward/backward force from pitch (nose up/down)
    const forwardAcceleration = -Math.sin(pitch) * thrustMagnitude * THRUST_TO_ACCELERATION * deltaTime;

    // Left/right force from roll (banking left/right)
    const rightAcceleration = Math.sin(roll) * thrustMagnitude * THRUST_TO_ACCELERATION * deltaTime;

    // Apply forces in world coordinates (accounting for yaw rotation)
    // Standard coordinate transformation for drone physics
    const worldAccelX = Math.cos(yaw) * rightAcceleration + Math.sin(yaw) * forwardAcceleration;
    const worldAccelZ = -Math.sin(yaw) * rightAcceleration + Math.cos(yaw) * forwardAcceleration;

    newState.velocity.x += worldAccelX;
    newState.velocity.z += worldAccelZ;

    // Debug FPV physics
    if (Math.abs(forwardAcceleration) > 0.01 || Math.abs(rightAcceleration) > 0.01) {
      console.log('FPV Physics:', {
        pitch: (pitch * 180 / Math.PI).toFixed(1) + '°',
        roll: (roll * 180 / Math.PI).toFixed(1) + '°',
        yaw: (yaw * 180 / Math.PI).toFixed(1) + '°',
        forwardAccel: forwardAcceleration.toFixed(3),
        rightAccel: rightAcceleration.toFixed(3),
        velocityMagnitude: newState.velocity.length().toFixed(2) + 'm/s'
      });
    }
  }

  // ===== AIR RESISTANCE =====
  newState.velocity.x *= AIR_RESISTANCE;
  newState.velocity.z *= AIR_RESISTANCE;
  newState.velocity.y *= AIR_RESISTANCE;

  // ===== REALISTIC SPEED LIMITS =====
  const maxHorizontalSpeed = 25; // Realistic FPV drone max speed (m/s)
  const maxVerticalSpeed = 12; // Realistic climb/descent rate (m/s)

  // Limit horizontal speed
  const horizontalVelocity = new Vector3(newState.velocity.x, 0, newState.velocity.z);
  if (horizontalVelocity.length() > maxHorizontalSpeed) {
    horizontalVelocity.normalize().multiplyScalar(maxHorizontalSpeed);
    newState.velocity.x = horizontalVelocity.x;
    newState.velocity.z = horizontalVelocity.z;
  }

  // Limit vertical speed
  newState.velocity.y = Math.max(-maxVerticalSpeed, Math.min(maxVerticalSpeed, newState.velocity.y));

  // ===== UPDATE POSITION =====
  newState.position.add(newState.velocity.clone().multiplyScalar(deltaTime));

  // ===== GROUND COLLISION AND LANDING =====
  const groundLevel = 0.5; // Ground height

  if (newState.position.y <= groundLevel) {
    newState.position.y = groundLevel;

    // Stop downward movement when hitting ground
    if (newState.velocity.y < 0) {
      newState.velocity.y = 0;
    }

    // FPV Landing conditions: low speed and low throttle
    const horizontalSpeed = Math.sqrt(newState.velocity.x ** 2 + newState.velocity.z ** 2);
    const isSlowEnough = horizontalSpeed < 1.5; // Slower landing threshold for FPV
    const isLowThrottle = newState.throttle < 0.25; // Low throttle
    const isDescending = newState.velocity.y <= 0;

    if (isSlowEnough && isLowThrottle && isDescending) {
      console.log('FPV LANDING: Touchdown - drone landed safely');
      newState.isLanded = true;
      newState.isFlying = false;

      // Stop all movement
      newState.velocity.x = 0;
      newState.velocity.z = 0;
      newState.velocity.y = 0;
      newState.throttle = 0;
      newState.enginePower = 0;

      // Gradually level out the drone when landed
      newState.angularVelocity.x = -newState.rotation.x * 8; // Faster leveling
      newState.angularVelocity.z = -newState.rotation.z * 8;
    }
  }

  // ===== FLIGHT STATE MANAGEMENT =====
  // Drone is flying if not landed OR if it has significant upward velocity
  newState.isFlying = !newState.isLanded || newState.velocity.y > 0.2;

  return newState;
};

export const checkCollisions = (droneState: DroneState, buildings: Building[]): boolean => {
  const droneRadius = 1; // Approximate drone size
  
  for (const building of buildings) {
    const distance = droneState.position.distanceTo(building.position);
    const minDistance = droneRadius + Math.max(building.size.x, building.size.z) / 2;
    
    if (distance < minDistance && 
        droneState.position.y < building.position.y + building.size.y / 2 &&
        droneState.position.y > building.position.y - building.size.y / 2) {
      return true; // Collision detected
    }
  }
  
  return false;
};

export const getRandomSpawnPosition = (buildings: Building[], areaSize: number): Vector3 => {
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const x = (Math.random() - 0.5) * areaSize * 0.6; // Stay within 60% of area
    const z = (Math.random() - 0.5) * areaSize * 0.6;
    const y = 0.5; // Start on the ground

    const position = new Vector3(x, y, z);

    // Check if position is clear of buildings
    let isClear = true;
    for (const building of buildings) {
      const distance2D = Math.sqrt((position.x - building.position.x) ** 2 + (position.z - building.position.z) ** 2);
      if (distance2D < 8) { // Minimum 8 units from any building
        isClear = false;
        break;
      }
    }

    if (isClear) {
      return position;
    }

    attempts++;
  }

  // Fallback to landing pad center if no clear spot found
  return new Vector3(0, 0.5, 0);
};
