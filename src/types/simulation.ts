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
 * Type definitions for drone simulation components
 */

import { Vector3 } from 'three';

export interface LiDARReading {
  angle: number; // Angle in radians (0 = forward)
  distance: number; // Distance to nearest object in meters
  hitPoint: Vector3; // 3D position where ray hit object
  hitObject: string; // Type of object hit ('building', 'tree', 'ground', 'none')
}

export interface DroneState {
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3; // For smooth tilt transitions
  isFlying: boolean;
  isLanded: boolean;
  throttle: number; // 0-1 for altitude control
  battery: number;
  enginePower: number; // Current engine power 0-1
  // Camera gimbal state
  cameraTilt: number; // Camera tilt angle (up/down) in radians
  cameraRotation: number; // Camera rotation angle (left/right) in radians
  // Damage system
  damage: number; // Current damage points
  isDead: boolean; // Whether drone has crashed and is dead
  // LiDAR system
  lidarReadings: LiDARReading[]; // Array of distance sensor readings
  lidarEnabled: boolean; // Whether LiDAR visualization is enabled
  // AI system
  isAutonomous: boolean; // Whether AI is controlling the drone
  lastReward: number; // Last reward received from environment
  totalReward: number; // Cumulative reward for current episode
  episodeStep: number; // Current step in the episode
  // Mission system
  startPosition: Vector3; // Starting position for current mission
  targetPosition: Vector3; // Target landing position for current mission
  missionStarted: boolean; // Whether mission has started
  missionCompleted: boolean; // Whether mission was completed successfully
  distanceToTarget: number; // Current distance to target
}

export interface Building {
  id: string;
  position: Vector3;
  size: Vector3;
  color: string;
}

export interface Tree {
  id: string;
  position: Vector3;
  height: number;
  radius: number;
}

// New obstacle types for advanced training
export interface TrainingObstacle {
  id: string;
  type: 'hole' | 'tunnel' | 'gate' | 'tower' | 'moving_platform' | 'wind_zone' | 'narrow_passage' | 'floating_ring' | 'maze_wall' | 'pendulum';
  position: Vector3;
  size: Vector3;
  rotation: Vector3;
  color: string;
  isActive: boolean;
  // Movement properties for dynamic obstacles
  movement?: {
    type: 'linear' | 'circular' | 'oscillating' | 'pendulum';
    speed: number;
    amplitude: Vector3;
    phase: number;
    direction: Vector3;
  };
  // Special properties
  properties?: {
    windStrength?: number;
    passageWidth?: number;
    ringRadius?: number;
    holeDepth?: number;
    mazeHeight?: number;
    pendulumLength?: number;
  };
}

export interface TrainingEnvironmentConfig {
  worldSize: number;
  obstacleCount: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  enableMovingObstacles: boolean;
  enableWeather: boolean;
  obstacleTypes: string[];
}

export interface Environment {
  buildings: Building[];
  trees: Tree[];
  trainingObstacles: TrainingObstacle[];
  groundSize: number;
  skyColor: string;
  config: TrainingEnvironmentConfig;
}

export interface SimulationControls {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  throttleUp: boolean;
  throttleDown: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  takeoff: boolean;
  land: boolean;
  hover: boolean; // H key for hover mode
  // Camera gimbal controls
  cameraTiltUp: boolean;
  cameraTiltDown: boolean;
  cameraRotateLeft: boolean;
  cameraRotateRight: boolean;
}

export interface CameraSettings {
  followDrone: boolean;
  distance: number;
  height: number;
  angle: number;
}

// Global damage system constants
export const DAMAGE_THRESHOLD = 100; // Drone dies when damage >= this value
export const COLLISION_DAMAGE = {
  BUILDING: 50, // Heavy damage from building collision
  TREE: 25,     // Moderate damage from tree collision
  GROUND: 30    // Damage from hard ground impact
};
