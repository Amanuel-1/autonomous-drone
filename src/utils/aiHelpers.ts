import { Vector3 } from 'three';
import {
  DroneAction,
  NeuralNetworkConfig,
  TrainingConfig,
  RewardConfig,
  ACTION_NAMES
} from '../types/ai';
import { SimulationControls, TrainingEnvironmentConfig } from '../types/simulation';

/**
 * Convert AI action to simulation controls
 */
export function actionToControls(action: DroneAction): Partial<SimulationControls> {
  const controls: Partial<SimulationControls> = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    throttleUp: false,
    throttleDown: false,
    rotateLeft: false,
    rotateRight: false,
    hover: false
  };

  switch (action) {
    case DroneAction.THROTTLE_UP:
      controls.throttleUp = true;
      break;
    case DroneAction.THROTTLE_DOWN:
      controls.throttleDown = true;
      break;
    case DroneAction.MOVE_LEFT:
      controls.moveLeft = true;
      break;
    case DroneAction.MOVE_RIGHT:
      controls.moveRight = true;
      break;
    case DroneAction.MOVE_FORWARD:
      controls.moveForward = true;
      break;
    case DroneAction.MOVE_BACKWARD:
      controls.moveBackward = true;
      break;
    case DroneAction.ROTATE_LEFT:
      controls.rotateLeft = true;
      break;
    case DroneAction.ROTATE_RIGHT:
      controls.rotateRight = true;
      break;
    case DroneAction.HOVER:
      controls.hover = true;
      break;
  }

  return controls;
}

/**
 * Get action name for display
 */
export function getActionName(action: DroneAction): string {
  return ACTION_NAMES[action] || 'UNKNOWN';
}

/**
 * Default neural network configuration
 */
export function getDefaultNetworkConfig(): NeuralNetworkConfig {
  return {
    inputSize: 40, // 3 pos + 3 vel + 3 rot + 4 status + 16 lidar + 3 lidar indicators + 2 flight status + 6 mission info
    hiddenLayers: [256, 128, 64], // Smaller network for reduced LiDAR input
    outputSize: 9, // Number of possible actions
    learningRate: 0.0005, // Slightly higher learning rate for smaller network
    dropout: 0.1 // Standard dropout
  };
}

/**
 * Default training configuration
 */
export function getDefaultTrainingConfig(): TrainingConfig {
  return {
    episodeLength: 3000, // Even longer episodes to allow learning
    maxEpisodes: 100000, // More episodes for thorough learning
    epsilon: 0.95, // Start with very high exploration
    epsilonDecay: 0.9998, // Much slower decay (95% to 5% over ~15,000 episodes)
    epsilonMin: 0.05, // Maintain some exploration
    gamma: 0.99, // Higher discount for long-term planning
    batchSize: 32, // Smaller batch for more frequent updates
    targetUpdateFrequency: 100, // Less frequent target updates for stability
    replayBufferSize: 100000 // Much larger buffer for diverse experiences
  };
}

/**
 * Default reward configuration
 */
export function getDefaultRewardConfig(): RewardConfig {
  return {
    // Positive rewards
    stayingAirborne: 0.05, // Increased base reward for staying airborne
    exploringNewArea: 0.0, // Not used in new strategy
    stableFlightBonus: 0.2, // Stronger bonus for stable flight
    batteryEfficiency: 0.0, // Not used in new strategy

    // Mission-specific rewards
    progressToTarget: 3.0, // Stronger reward for moving closer
    targetProximity: 0.0, // Will be replaced with shaped rewards
    successfulLanding: 0.0, // Not used separately

    // Negative rewards
    collision: -30.0, // Reduced penalty to allow more learning
    outOfBounds: -100.0, // Strong but not overwhelming penalty
    batteryDrain: 0.0, // Not used in new strategy
    excessiveMovement: 0.0, // Not used in new strategy
    movingAwayFromTarget: -2.0, // Stronger penalty to match progress reward
    timeStepPenalty: -0.01, // Much reduced time pressure
    forbiddenAreaPenalty: -10.0, // Reduced continuous penalty

    // Terminal rewards
    crashPenalty: 0.0, // Handled by collision penalty
    missionComplete: 1000.0, // Large reward for mission completion
    missionFailed: 0.0, // Not used in new strategy

    // Reward-based damage system
    rewardDamageThreshold: -200.0, // More lenient threshold
    rewardDamageAmount: 15.0 // Reduced damage amount
  };
}

/**
 * Normalize vector to [-1, 1] range
 */
export function normalizeVector3(vector: Vector3, maxMagnitude: number): Vector3 {
  return new Vector3(
    Math.max(-1, Math.min(1, vector.x / maxMagnitude)),
    Math.max(-1, Math.min(1, vector.y / maxMagnitude)),
    Math.max(-1, Math.min(1, vector.z / maxMagnitude))
  );
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(pos1: Vector3, pos2: Vector3): number {
  return pos1.distanceTo(pos2);
}

/**
 * Check if position is within bounds
 */
export function isWithinBounds(position: Vector3, bounds: number): boolean {
  return (
    Math.abs(position.x) <= bounds &&
    Math.abs(position.z) <= bounds &&
    position.y >= 0 &&
    position.y <= bounds * 2
  );
}

/**
 * Generate random spawn position
 */
export function generateRandomSpawnPosition(bounds: number): Vector3 {
  return new Vector3(
    (Math.random() - 0.5) * bounds * 0.8, // Stay within 80% of bounds
    2 + Math.random() * 5, // Start 2-7 meters above ground
    (Math.random() - 0.5) * bounds * 0.8
  );
}

/**
 * Generate mission coordinates (start and target positions)
 */
export function generateMissionCoordinates(bounds: number, minDistance: number = 15): { start: Vector3; target: Vector3 } {
  let start: Vector3;
  let target: Vector3;
  let distance: number;

  // Keep generating until we have positions with minimum distance
  do {
    start = new Vector3(
      (Math.random() - 0.5) * bounds * 0.8, // Use more of the expanded world
      0.5, // Ground level for takeoff
      (Math.random() - 0.5) * bounds * 0.8
    );

    target = new Vector3(
      (Math.random() - 0.5) * bounds * 0.8,
      0.5, // Ground level for landing
      (Math.random() - 0.5) * bounds * 0.8
    );

    distance = start.distanceTo(target);
  } while (distance < minDistance || distance > 60); // Increased max distance for larger world

  return { start, target };
}

/**
 * Get default training environment configuration
 */
export function getDefaultTrainingEnvironmentConfig(): TrainingEnvironmentConfig {
  return {
    worldSize: 200, // Expanded from 100 to 200 meters
    obstacleCount: 25, // More obstacles for comprehensive training
    difficultyLevel: 'intermediate', // Start with intermediate difficulty
    enableMovingObstacles: true, // Enable dynamic challenges
    enableWeather: false, // Disable weather for now
    obstacleTypes: [
      'gate', 'floating_ring', 'tower', 'tunnel', 'narrow_passage',
      'wind_zone', 'hole', 'maze_wall', 'moving_platform', 'pendulum'
    ]
  };
}

/**
 * Get training environment config for specific difficulty
 */
export function getTrainingEnvironmentConfig(difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'): TrainingEnvironmentConfig {
  const baseConfig = getDefaultTrainingEnvironmentConfig();

  switch (difficulty) {
    case 'beginner':
      return {
        ...baseConfig,
        worldSize: 150,
        obstacleCount: 10,
        difficultyLevel: 'beginner',
        enableMovingObstacles: false,
        obstacleTypes: ['gate', 'floating_ring', 'tower']
      };

    case 'intermediate':
      return {
        ...baseConfig,
        worldSize: 200,
        obstacleCount: 20,
        difficultyLevel: 'intermediate',
        enableMovingObstacles: true,
        obstacleTypes: ['gate', 'floating_ring', 'tower', 'tunnel', 'narrow_passage', 'wind_zone']
      };

    case 'advanced':
      return {
        ...baseConfig,
        worldSize: 250,
        obstacleCount: 30,
        difficultyLevel: 'advanced',
        enableMovingObstacles: true,
        obstacleTypes: [
          'gate', 'floating_ring', 'tower', 'tunnel', 'narrow_passage',
          'wind_zone', 'hole', 'maze_wall', 'moving_platform'
        ]
      };

    case 'expert':
      return {
        ...baseConfig,
        worldSize: 300,
        obstacleCount: 40,
        difficultyLevel: 'expert',
        enableMovingObstacles: true,
        obstacleTypes: [
          'gate', 'floating_ring', 'tower', 'tunnel', 'narrow_passage',
          'wind_zone', 'hole', 'maze_wall', 'moving_platform', 'pendulum'
        ]
      };

    default:
      return baseConfig;
  }
}

/**
 * Check if position is near target (within landing zone)
 */
export function isNearTarget(position: Vector3, target: Vector3, tolerance: number = 3): boolean {
  const distance = position.distanceTo(target);
  return distance <= tolerance;
}

/**
 * Calculate direction vector to target (normalized)
 */
export function getDirectionToTarget(from: Vector3, to: Vector3): Vector3 {
  return to.clone().sub(from).normalize();
}

/**
 * Calculate velocity magnitude
 */
export function getVelocityMagnitude(velocity: Vector3): number {
  return velocity.length();
}

/**
 * Smooth value interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(values: number[], windowSize: number): number {
  if (values.length === 0) return 0;
  
  const window = values.slice(-windowSize);
  return window.reduce((sum, val) => sum + val, 0) / window.length;
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format time duration
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Save data to localStorage
 */
export function saveToLocalStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Load data from localStorage
 */
export function loadFromLocalStorage(key: string): any {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Download data as file
 */
export function downloadAsFile(data: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsText(file);
  });
}

/**
 * Validate neural network input
 */
export function validateNetworkInput(input: number[], expectedSize: number): boolean {
  if (input.length !== expectedSize) {
    console.error(`Invalid input size: expected ${expectedSize}, got ${input.length}`);
    return false;
  }
  
  // Check for NaN or infinite values
  for (let i = 0; i < input.length; i++) {
    if (!isFinite(input[i])) {
      console.error(`Invalid input value at index ${i}: ${input[i]}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
