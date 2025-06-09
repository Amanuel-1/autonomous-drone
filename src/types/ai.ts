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
 * AI and Machine Learning type definitions for autonomous drone control
 */

import { Vector3 } from 'three';
import { LiDARReading } from './simulation';

// Neural Network Types
export interface NeuralNetworkConfig {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  learningRate: number;
  dropout: number;
}

export interface NetworkWeights {
  weights: number[][][]; // [layer][neuron][weight]
  biases: number[][]; // [layer][neuron]
}

// Action space for drone control
export enum DroneAction {
  THROTTLE_UP = 0,
  THROTTLE_DOWN = 1,
  MOVE_LEFT = 2,
  MOVE_RIGHT = 3,
  MOVE_FORWARD = 4,
  MOVE_BACKWARD = 5,
  ROTATE_LEFT = 6,
  ROTATE_RIGHT = 7,
  HOVER = 8
}

export const ACTION_NAMES = [
  'THROTTLE_UP',
  'THROTTLE_DOWN', 
  'MOVE_LEFT',
  'MOVE_RIGHT',
  'MOVE_FORWARD',
  'MOVE_BACKWARD',
  'ROTATE_LEFT',
  'ROTATE_RIGHT',
  'HOVER'
];

// State representation for neural network input
export interface DroneStateVector {
  // Position (3 values)
  positionX: number;
  positionY: number;
  positionZ: number;
  
  // Velocity (3 values)
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  
  // Rotation (3 values)
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  
  // Drone status (4 values)
  throttle: number;
  battery: number;
  damage: number;
  enginePower: number;
  
  // LiDAR readings (16 values - spherical 3D coverage)
  lidarDistances: number[];
  
  // Additional state info (2 values)
  isFlying: number; // 0 or 1
  isLanded: number; // 0 or 1

  // Mission info (6 values)
  targetX: number; // Target position X (normalized)
  targetY: number; // Target position Y (normalized)
  targetZ: number; // Target position Z (normalized)
  distanceToTarget: number; // Distance to target (normalized)
  directionToTargetX: number; // Direction vector to target X
  directionToTargetZ: number; // Direction vector to target Z
}

// Reinforcement Learning Types
export interface Experience {
  state: number[];
  action: DroneAction;
  reward: number;
  nextState: number[];
  done: boolean;
  timestamp: number;
}

export interface ReplayBuffer {
  experiences: Experience[];
  maxSize: number;
  currentIndex: number;
}

export interface TrainingConfig {
  episodeLength: number; // Max steps per episode
  maxEpisodes: number;
  epsilon: number; // Exploration rate
  epsilonDecay: number;
  epsilonMin: number;
  gamma: number; // Discount factor
  batchSize: number;
  targetUpdateFrequency: number;
  replayBufferSize: number;
}

export interface TrainingMetrics {
  episode: number;
  totalReward: number;
  episodeLength: number;
  epsilon: number;
  averageReward: number;
  collisions: number;
  explorationSteps: number;
  exploitationSteps: number;
  loss: number;
}

export interface RewardConfig {
  // Positive rewards
  stayingAirborne: number;
  exploringNewArea: number;
  stableFlightBonus: number; // +0.05 per tick for stable flight
  batteryEfficiency: number;

  // Mission-specific rewards
  progressToTarget: number; // +1 * delta_distance for moving closer
  targetProximity: number; // Bonus for being near target
  successfulLanding: number; // Large reward for landing at target

  // Negative rewards
  collision: number; // -100 for crashing
  outOfBounds: number; // -200 for leaving world bounds
  batteryDrain: number;
  excessiveMovement: number;
  movingAwayFromTarget: number; // -1 * delta_distance for wandering away
  timeStepPenalty: number; // -0.1 per time step to encourage faster routes
  forbiddenAreaPenalty: number; // -50 for entering danger zones

  // Terminal rewards
  crashPenalty: number;
  missionComplete: number; // +500 for reaching goal
  missionFailed: number;

  // Reward-based damage system
  rewardDamageThreshold: number; // Negative reward threshold that triggers damage/death
  rewardDamageAmount: number; // Amount of damage to apply when threshold is crossed
}

// Training state
export interface TrainingState {
  isTraining: boolean;
  currentEpisode: number;
  currentStep: number;
  totalSteps: number;
  bestReward: number;
  recentRewards: number[];
  metrics: TrainingMetrics[];
  modelSaved: boolean;
  lastSaveTime: number;
}

// Imitation Learning Types
export interface DemonstrationData {
  state: number[];
  action: DroneAction;
  timestamp: number;
  quality: number; // 0-1 rating of how good this demonstration is
}

export interface ImitationLearningConfig {
  enabled: boolean;
  recordingMode: boolean;
  demonstrationBuffer: DemonstrationData[];
  maxDemonstrations: number;
  imitationWeight: number; // How much to weight imitation vs RL
  qualityThreshold: number; // Minimum quality to keep demonstration
}

// AI Brain interface
export interface AIBrain {
  network: NeuralNetworkConfig;
  training: TrainingConfig;
  rewards: RewardConfig;
  state: TrainingState;
  imitation: ImitationLearningConfig;
}
