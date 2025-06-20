/**
 * Autonomous Drone Simulation - Personal Research Project
 *
 * MIT License
 * Copyright (c) 2025 Amanuel Garomsa
 *
 * Author: Amanuel Garomsa
 * Email: amanuelgaromsa@gmail.com
 * Position: Computer Science Graduate, Icoglabs, SingularityNet
 *
 * Core simulation utilities for drone physics and world generation
 */

import { Vector3 } from 'three';
import { Building, Tree, DroneState, SimulationControls, DAMAGE_THRESHOLD, COLLISION_DAMAGE, TrainingObstacle } from '../types/simulation';

export const generateBuildings = (count: number, areaSize: number): Building[] => {
  const buildings: Building[] = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize * 0.7; // Keep regular buildings in inner area
    const z = (Math.random() - 0.5) * areaSize * 0.7;
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

export const generateSkyscrapers = (count: number, areaSize: number): Building[] => {
  const skyscrapers: Building[] = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize * 0.9; // Use more of the area for skyscrapers
    const z = (Math.random() - 0.5) * areaSize * 0.9;
    const height = Math.random() * 100 + 50; // Skyscrapers between 50-150 units tall
    const width = Math.random() * 15 + 10; // Wider base: 10-25 units
    const depth = Math.random() * 15 + 10; // Deeper base: 10-25 units

    // Generate modern skyscraper colors (glass, steel, concrete)
    const colors = ['#4A90E2', '#7ED321', '#50E3C2', '#B8E986', '#9013FE', '#F5A623'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    skyscrapers.push({
      id: `skyscraper-${i}`,
      position: new Vector3(x, height / 2, z),
      size: new Vector3(width, height, depth),
      color
    });
  }

  return skyscrapers;
};

export const generateDenseTrees = (count: number, areaSize: number): Tree[] => {
  const trees: Tree[] = [];

  // Create forest clusters for realistic dense tree areas
  const clusterCount = Math.floor(count / 8); // Create clusters of ~8 trees each

  for (let cluster = 0; cluster < clusterCount; cluster++) {
    // Random cluster center
    const clusterX = (Math.random() - 0.5) * areaSize * 0.8;
    const clusterZ = (Math.random() - 0.5) * areaSize * 0.8;
    const clusterRadius = 15 + Math.random() * 20; // 15-35 meter radius clusters

    // Generate trees within this cluster
    const treesInCluster = 6 + Math.floor(Math.random() * 10); // 6-15 trees per cluster

    for (let i = 0; i < treesInCluster; i++) {
      // Random position within cluster
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * clusterRadius;
      const x = clusterX + Math.cos(angle) * distance;
      const z = clusterZ + Math.sin(angle) * distance;

      // Vary tree sizes for realism
      const treeType = Math.random();
      let height, radius, color;

      if (treeType < 0.3) {
        // Small trees/bushes (30%)
        height = 3 + Math.random() * 5; // 3-8 meters
        radius = 1.5 + Math.random() * 2; // 1.5-3.5 meters
        color = '#228B22'; // Forest green
      } else if (treeType < 0.7) {
        // Medium trees (40%)
        height = 8 + Math.random() * 10; // 8-18 meters
        radius = 2.5 + Math.random() * 3; // 2.5-5.5 meters
        color = '#32CD32'; // Lime green
      } else {
        // Large trees (30%)
        height = 15 + Math.random() * 15; // 15-30 meters
        radius = 4 + Math.random() * 4; // 4-8 meters
        color = '#006400'; // Dark green
      }

      trees.push({
        id: `tree-cluster-${cluster}-${i}`,
        position: new Vector3(x, 0, z),
        height: height,
        radius: radius
      });
    }
  }

  // Add some scattered individual trees
  const scatteredCount = Math.floor(count * 0.3);
  for (let i = 0; i < scatteredCount; i++) {
    const x = (Math.random() - 0.5) * areaSize * 0.9;
    const z = (Math.random() - 0.5) * areaSize * 0.9;
    const height = 5 + Math.random() * 20; // 5-25 meters
    const radius = 2 + Math.random() * 4; // 2-6 meters

    trees.push({
      id: `tree-scattered-${i}`,
      position: new Vector3(x, 0, z),
      height: height,
      radius: radius
    });
  }

  return trees;
};

export const updateDronePosition = (
  droneState: DroneState,
  controls: SimulationControls,
  deltaTime: number,
  buildings: Building[] = [],
  trees: Tree[] = [],
  trainingObstacles: TrainingObstacle[] = []
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
  const HOVER_THRUST = GRAVITY * DRONE_MASS * 1.15; // 15% more thrust for stable altitude

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
    newState.throttle = 0.75; // Higher initial throttle for better climb
    newState.enginePower = 0.75;
    newState.velocity.y = 3.0; // Stronger initial lift to reach safe altitude
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
      baseThrust = HOVER_THRUST * 1.2; // More thrust for stable hover at good altitude
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
    // Calculate movement vector in drone's local coordinate system
    let localForward = 0; // Forward/backward input (-1 to 1)
    let localRight = 0;   // Left/right input (-1 to 1)

    // Convert control inputs to local movement vector
    if (controls.moveForward) localForward += 1;
    if (controls.moveBackward) localForward -= 1;
    if (controls.moveRight) localRight += 1;
    if (controls.moveLeft) localRight -= 1;

    // Calculate desired tilt based on local movement vector
    // Tilt TOWARDS the direction of movement (this creates the force in that direction)
    if (localForward !== 0) {
      desiredPitch = -localForward * MAX_TILT_ANGLE * 0.7; // Forward = nose down (negative pitch)
      console.log('FPV MOVE: ' + (localForward > 0 ? 'FORWARD (nose down)' : 'BACKWARD (nose up)') + ' - Natural tilt');
    }
    if (localRight !== 0) {
      desiredRoll = localRight * MAX_TILT_ANGLE * 0.7; // Right = roll right (positive roll)
      console.log('FPV MOVE: ' + (localRight > 0 ? 'RIGHT' : 'LEFT') + ' - Rolling towards movement');
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

    // Calculate forces in drone's local coordinate system first
    // Forward/backward force from pitch (nose up/down) - relative to drone
    const localForwardAccel = -Math.sin(pitch) * thrustMagnitude * THRUST_TO_ACCELERATION * deltaTime;

    // Left/right force from roll (banking left/right) - relative to drone
    const localRightAccel = -Math.sin(roll) * thrustMagnitude * THRUST_TO_ACCELERATION * deltaTime;

    // Transform local forces to world coordinates using drone's yaw rotation
    // This ensures tilt directions are always relative to drone's orientation
    const worldAccelX = Math.cos(yaw) * localRightAccel + Math.sin(yaw) * localForwardAccel;
    const worldAccelZ = -Math.sin(yaw) * localRightAccel + Math.cos(yaw) * localForwardAccel;

    newState.velocity.x += worldAccelX;
    newState.velocity.z += worldAccelZ;

    // Debug FPV physics
    if (Math.abs(localForwardAccel) > 0.01 || Math.abs(localRightAccel) > 0.01) {
      console.log('FPV Physics (Drone-Relative):', {
        pitch: (pitch * 180 / Math.PI).toFixed(1) + '°',
        roll: (roll * 180 / Math.PI).toFixed(1) + '°',
        yaw: (yaw * 180 / Math.PI).toFixed(1) + '°',
        localForwardAccel: localForwardAccel.toFixed(3),
        localRightAccel: localRightAccel.toFixed(3),
        worldAccelX: worldAccelX.toFixed(3),
        worldAccelZ: worldAccelZ.toFixed(3),
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

  // ===== COLLISION DETECTION AND DAMAGE SYSTEM =====
  if (!newState.isDead) {
    const collisionResult = checkCollisionsWithDamage(newState, buildings, trees, trainingObstacles);

    if (collisionResult.hasCollision) {
      // Correct position to prevent clipping through objects
      if (collisionResult.correctedPosition) {
        newState.position.copy(collisionResult.correctedPosition);
      }

      // Apply damage and immediately crash the drone
      newState.damage += collisionResult.damage;
      console.log(`COLLISION: ${collisionResult.type} - Damage: ${collisionResult.damage}, Total: ${newState.damage}`);

      // Any collision with buildings or trees causes immediate crash
      newState.isDead = true;
      newState.isFlying = false;
      newState.isLanded = false;
      newState.throttle = 0;
      newState.enginePower = 0;

      // Add impact velocity for realistic crash
      if (collisionResult.impactNormal) {
        // Bounce off the surface with reduced velocity
        const impactForce = newState.velocity.length() * 0.5;
        newState.velocity.copy(collisionResult.impactNormal.multiplyScalar(impactForce));
        // Add some downward velocity for crash effect
        newState.velocity.y = Math.min(newState.velocity.y, -2);
      }

      console.log('DRONE DESTROYED: Collision detected - entering crash sequence');
    }
  }

  // ===== DEATH PHYSICS: Free fall when dead =====
  if (newState.isDead) {
    // Disable all controls when dead
    newState.throttle = 0;
    newState.enginePower = 0;

    // Apply gravity only (free fall)
    const GRAVITY = 9.81;
    const DRONE_MASS = 0.5;
    newState.velocity.y -= (GRAVITY * deltaTime);

    // Add tumbling effect
    newState.angularVelocity.x += (Math.random() - 0.5) * 0.1;
    newState.angularVelocity.z += (Math.random() - 0.5) * 0.1;
    newState.rotation.x += newState.angularVelocity.x * deltaTime;
    newState.rotation.z += newState.angularVelocity.z * deltaTime;
  }

  // ===== UPDATE POSITION =====
  // Store old position for collision rollback
  const oldPosition = newState.position.clone();

  // Apply movement
  newState.position.add(newState.velocity.clone().multiplyScalar(deltaTime));

  // Check for collisions after movement (prevent clipping)
  if (!newState.isDead) {
    const postMovementCollision = checkCollisionsWithDamage(newState, buildings, trees, trainingObstacles);

    if (postMovementCollision.hasCollision) {
      // Rollback to old position and apply collision
      newState.position.copy(oldPosition);

      // Apply damage and crash
      newState.damage += postMovementCollision.damage;
      console.log(`POST-MOVEMENT COLLISION: ${postMovementCollision.type} - Damage: ${postMovementCollision.damage}`);

      // Immediate crash
      newState.isDead = true;
      newState.isFlying = false;
      newState.isLanded = false;
      newState.throttle = 0;
      newState.enginePower = 0;

      // Add crash velocity
      if (postMovementCollision.impactNormal) {
        const impactForce = newState.velocity.length() * 0.3;
        newState.velocity.copy(postMovementCollision.impactNormal.multiplyScalar(impactForce));
        newState.velocity.y = Math.min(newState.velocity.y, -3); // Strong downward crash
      }

      console.log('DRONE DESTROYED: Post-movement collision - entering crash sequence');
    }
  }

  // ===== GROUND COLLISION AND LANDING =====
  const groundLevel = 0.5; // Ground height

  if (newState.position.y <= groundLevel) {
    newState.position.y = groundLevel;

    // Check for hard impact damage (only if not already dead)
    if (!newState.isDead && newState.velocity.y < -5) { // Fast downward velocity
      const impactDamage = Math.abs(newState.velocity.y) * 6; // Scale damage with impact speed
      newState.damage += impactDamage;
      console.log(`GROUND IMPACT: Speed ${Math.abs(newState.velocity.y).toFixed(1)}m/s - Damage: ${impactDamage.toFixed(0)}, Total: ${newState.damage}`);

      if (newState.damage >= DAMAGE_THRESHOLD) {
        newState.isDead = true;
        newState.isFlying = false;
        newState.isLanded = false;
        console.log('DRONE DESTROYED: Ground impact damage threshold exceeded');
      }
    }

    // Stop downward movement when hitting ground
    if (newState.velocity.y < 0) {
      newState.velocity.y = 0;
    }

    // FPV Landing conditions: low speed and low throttle (only if not dead)
    if (!newState.isDead) {
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
    } else {
      // If dead, just stop all movement on ground
      newState.velocity.x = 0;
      newState.velocity.z = 0;
      newState.velocity.y = 0;
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

interface CollisionResult {
  hasCollision: boolean;
  damage: number;
  type: string;
  correctedPosition?: Vector3;
  impactNormal?: Vector3;
}

export const checkCollisionsWithDamage = (
  droneState: DroneState,
  buildings: Building[],
  trees: Tree[],
  trainingObstacles: TrainingObstacle[] = []
): CollisionResult => {
  const droneRadius = 1; // Approximate drone size

  // Check building collisions
  for (const building of buildings) {
    // Calculate closest point on building to drone
    const buildingMin = new Vector3(
      building.position.x - building.size.x / 2,
      building.position.y - building.size.y / 2,
      building.position.z - building.size.z / 2
    );
    const buildingMax = new Vector3(
      building.position.x + building.size.x / 2,
      building.position.y + building.size.y / 2,
      building.position.z + building.size.z / 2
    );

    // Check if drone is inside or too close to building
    const closestPoint = new Vector3(
      Math.max(buildingMin.x, Math.min(droneState.position.x, buildingMax.x)),
      Math.max(buildingMin.y, Math.min(droneState.position.y, buildingMax.y)),
      Math.max(buildingMin.z, Math.min(droneState.position.z, buildingMax.z))
    );

    const distance = droneState.position.distanceTo(closestPoint);

    if (distance < droneRadius) {
      // Calculate impact normal (direction to push drone away)
      const impactNormal = droneState.position.clone().sub(closestPoint).normalize();
      if (impactNormal.length() === 0) {
        // If drone is exactly at center, push it up
        impactNormal.set(0, 1, 0);
      }

      // Calculate corrected position (push drone outside building)
      const correctedPosition = closestPoint.clone().add(
        impactNormal.multiplyScalar(droneRadius + 0.1)
      );

      return {
        hasCollision: true,
        damage: COLLISION_DAMAGE.BUILDING,
        type: 'BUILDING',
        correctedPosition,
        impactNormal
      };
    }
  }

  // Check tree collisions
  for (const tree of trees) {
    const distance2D = Math.sqrt(
      (droneState.position.x - tree.position.x) ** 2 +
      (droneState.position.z - tree.position.z) ** 2
    );

    // Check if drone is within tree foliage area
    const foliageCenter = tree.position.y + tree.height / 2 + tree.radius;
    const verticalDistance = Math.abs(droneState.position.y - foliageCenter);

    if (distance2D < (droneRadius + tree.radius) &&
        verticalDistance < tree.radius) {

      // Calculate impact normal (direction to push drone away from tree)
      const impactNormal = new Vector3(
        droneState.position.x - tree.position.x,
        0, // Don't push vertically for trees
        droneState.position.z - tree.position.z
      ).normalize();

      if (impactNormal.length() === 0) {
        // If drone is exactly at tree center, push it in a random direction
        impactNormal.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      }

      // Calculate corrected position (push drone outside tree)
      const correctedPosition = new Vector3(
        tree.position.x + impactNormal.x * (tree.radius + droneRadius + 0.1),
        droneState.position.y,
        tree.position.z + impactNormal.z * (tree.radius + droneRadius + 0.1)
      );

      return {
        hasCollision: true,
        damage: COLLISION_DAMAGE.TREE,
        type: 'TREE',
        correctedPosition,
        impactNormal
      };
    }
  }

  // Check training obstacles
  for (const obstacle of trainingObstacles) {
    if (!obstacle.isActive) continue;

    // Different collision logic based on obstacle type
    switch (obstacle.type) {
      case 'tower':
      case 'maze_wall':
      case 'moving_platform':
        // Solid obstacles - standard box collision
        const obstacleMin = new Vector3(
          obstacle.position.x - obstacle.size.x / 2,
          obstacle.position.y - obstacle.size.y / 2,
          obstacle.position.z - obstacle.size.z / 2
        );
        const obstacleMax = new Vector3(
          obstacle.position.x + obstacle.size.x / 2,
          obstacle.position.y + obstacle.size.y / 2,
          obstacle.position.z + obstacle.size.z / 2
        );

        const closestPoint = new Vector3(
          Math.max(obstacleMin.x, Math.min(droneState.position.x, obstacleMax.x)),
          Math.max(obstacleMin.y, Math.min(droneState.position.y, obstacleMax.y)),
          Math.max(obstacleMin.z, Math.min(droneState.position.z, obstacleMax.z))
        );

        const distance = droneState.position.distanceTo(closestPoint);

        if (distance < droneRadius) {
          const impactNormal = droneState.position.clone().sub(closestPoint).normalize();
          if (impactNormal.length() === 0) {
            impactNormal.set(0, 1, 0);
          }

          const correctedPosition = closestPoint.clone().add(
            impactNormal.multiplyScalar(droneRadius + 0.1)
          );

          return {
            hasCollision: true,
            damage: COLLISION_DAMAGE.BUILDING,
            type: 'TRAINING_OBSTACLE',
            correctedPosition,
            impactNormal
          };
        }
        break;

      case 'hole':
        // Check if drone falls into hole
        const holeDistance2D = Math.sqrt(
          (droneState.position.x - obstacle.position.x) ** 2 +
          (droneState.position.z - obstacle.position.z) ** 2
        );

        if (holeDistance2D < obstacle.size.x / 2 &&
            droneState.position.y < obstacle.position.y + obstacle.size.y / 2) {
          return {
            hasCollision: true,
            damage: COLLISION_DAMAGE.BUILDING * 2, // Holes are very dangerous
            type: 'HOLE',
            correctedPosition: new Vector3(
              droneState.position.x,
              obstacle.position.y + obstacle.size.y / 2 + droneRadius,
              droneState.position.z
            ),
            impactNormal: new Vector3(0, 1, 0)
          };
        }
        break;

      case 'pendulum':
        // Check collision with pendulum weight
        const pendulumLength = obstacle.properties?.pendulumLength || 8;
        const pendulumAngle = obstacle.rotation.z;
        const weightPosition = new Vector3(
          obstacle.position.x + Math.sin(pendulumAngle) * pendulumLength,
          obstacle.position.y - pendulumLength + Math.cos(pendulumAngle) * pendulumLength,
          obstacle.position.z
        );

        const pendulumDistance = droneState.position.distanceTo(weightPosition);
        if (pendulumDistance < droneRadius + 1) {
          const impactNormal = droneState.position.clone().sub(weightPosition).normalize();

          return {
            hasCollision: true,
            damage: COLLISION_DAMAGE.BUILDING,
            type: 'PENDULUM',
            correctedPosition: weightPosition.clone().add(
              impactNormal.multiplyScalar(droneRadius + 1.1)
            ),
            impactNormal
          };
        }
        break;
    }
  }

  return {
    hasCollision: false,
    damage: 0,
    type: 'NONE'
  };
};

export const getRandomSpawnPosition = (
  buildings: Building[],
  trees: Tree[],
  denseTrees: Tree[],
  trainingObstacles: TrainingObstacle[],
  areaSize: number
): Vector3 => {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const x = (Math.random() - 0.5) * areaSize * 0.4; // Stay within 40% of area for more open space
    const z = (Math.random() - 0.5) * areaSize * 0.4;
    const y = 0.5; // Start on the ground

    const position = new Vector3(x, y, z);

    // Check if position is clear of all obstacles
    let isClear = true;

    // Check buildings (including skyscrapers)
    for (const building of buildings) {
      const distance2D = Math.sqrt((position.x - building.position.x) ** 2 + (position.z - building.position.z) ** 2);
      const clearanceRadius = Math.max(building.size.x, building.size.z) / 2 + 12; // Building radius + 12m clearance
      if (distance2D < clearanceRadius) {
        isClear = false;
        break;
      }
    }

    // Check trees
    if (isClear) {
      for (const tree of [...trees, ...denseTrees]) {
        const distance2D = Math.sqrt((position.x - tree.position.x) ** 2 + (position.z - tree.position.z) ** 2);
        if (distance2D < tree.radius + 8) { // Tree radius + 8m clearance
          isClear = false;
          break;
        }
      }
    }

    // Check training obstacles
    if (isClear) {
      for (const obstacle of trainingObstacles) {
        const distance2D = Math.sqrt((position.x - obstacle.position.x) ** 2 + (position.z - obstacle.position.z) ** 2);
        const clearanceRadius = Math.max(obstacle.size.x, obstacle.size.z) / 2 + 10; // Obstacle radius + 10m clearance
        if (distance2D < clearanceRadius) {
          isClear = false;
          break;
        }
      }
    }

    if (isClear) {
      return position;
    }

    attempts++;
  }

  // Fallback to a guaranteed clear spot near center
  return new Vector3(0, 0.5, 0);
};
