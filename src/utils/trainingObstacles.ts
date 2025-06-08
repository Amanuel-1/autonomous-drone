import { Vector3 } from 'three';
import { TrainingObstacle, TrainingEnvironmentConfig } from '../types/simulation';

/**
 * Generate comprehensive training obstacles for drone learning
 */
export class TrainingObstacleGenerator {
  private config: TrainingEnvironmentConfig;
  private obstacleId: number = 0;

  constructor(config: TrainingEnvironmentConfig) {
    this.config = config;
  }

  /**
   * Generate all training obstacles based on difficulty level
   */
  public generateTrainingObstacles(): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    const { worldSize, difficultyLevel, enableMovingObstacles } = this.config;
    
    // Generate different obstacle types based on difficulty
    switch (difficultyLevel) {
      case 'beginner':
        obstacles.push(...this.generateBeginnerObstacles(worldSize));
        break;
      case 'intermediate':
        obstacles.push(...this.generateBeginnerObstacles(worldSize));
        obstacles.push(...this.generateIntermediateObstacles(worldSize));
        break;
      case 'advanced':
        obstacles.push(...this.generateBeginnerObstacles(worldSize));
        obstacles.push(...this.generateIntermediateObstacles(worldSize));
        obstacles.push(...this.generateAdvancedObstacles(worldSize));
        break;
      case 'expert':
        obstacles.push(...this.generateAllObstacles(worldSize));
        break;
    }

    // Add moving obstacles if enabled
    if (enableMovingObstacles) {
      obstacles.push(...this.generateMovingObstacles(worldSize));
    }

    return obstacles;
  }

  /**
   * Beginner obstacles: Basic navigation challenges
   */
  private generateBeginnerObstacles(worldSize: number): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    const bounds = worldSize * 0.4;

    // 1. Simple Gates - teach precise navigation
    for (let i = 0; i < 3; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'gate',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          8 + Math.random() * 5,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(12, 8, 2),
        rotation: new Vector3(0, Math.random() * Math.PI, 0),
        color: '#4CAF50',
        isActive: true,
        properties: { passageWidth: 8 }
      });
    }

    // 2. Floating Rings - teach precision flying
    for (let i = 0; i < 4; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'floating_ring',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          5 + Math.random() * 10,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(6, 6, 1),
        rotation: new Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        color: '#2196F3',
        isActive: true,
        properties: { ringRadius: 3 }
      });
    }

    // 3. Low Towers - teach altitude awareness
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'tower',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          0,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(4, 15, 4),
        rotation: new Vector3(0, 0, 0),
        color: '#FF9800',
        isActive: true
      });
    }

    return obstacles;
  }

  /**
   * Intermediate obstacles: More complex navigation
   */
  private generateIntermediateObstacles(worldSize: number): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    const bounds = worldSize * 0.6;

    // 1. Narrow Passages - teach precise control
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'narrow_passage',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          8,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(20, 10, 4),
        rotation: new Vector3(0, Math.random() * Math.PI, 0),
        color: '#9C27B0',
        isActive: true,
        properties: { passageWidth: 4 }
      });
    }

    // 2. Tunnels - teach enclosed space navigation
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'tunnel',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          6,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(15, 6, 6),
        rotation: new Vector3(0, Math.random() * Math.PI, 0),
        color: '#607D8B',
        isActive: true
      });
    }

    // 3. High Towers - teach high altitude navigation
    for (let i = 0; i < 3; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'tower',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          0,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(3, 25 + Math.random() * 15, 3),
        rotation: new Vector3(0, 0, 0),
        color: '#F44336',
        isActive: true
      });
    }

    // 4. Wind Zones - teach disturbance handling
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'wind_zone',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          10,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(15, 15, 15),
        rotation: new Vector3(0, 0, 0),
        color: '#00BCD4',
        isActive: true,
        properties: { windStrength: 5 }
      });
    }

    return obstacles;
  }

  /**
   * Advanced obstacles: Complex challenges
   */
  private generateAdvancedObstacles(worldSize: number): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    const bounds = worldSize * 0.8;

    // 1. Maze Walls - teach complex pathfinding
    const mazeSize = 30;
    const wallCount = 8;
    for (let i = 0; i < wallCount; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'maze_wall',
        position: new Vector3(
          (Math.random() - 0.5) * mazeSize,
          0,
          (Math.random() - 0.5) * mazeSize
        ),
        size: new Vector3(2, 12, 15),
        rotation: new Vector3(0, (Math.random() * 4) * Math.PI / 2, 0),
        color: '#795548',
        isActive: true,
        properties: { mazeHeight: 12 }
      });
    }

    // 2. Holes in the ground - teach ground avoidance
    for (let i = 0; i < 3; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'hole',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          -5,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(8, 10, 8),
        rotation: new Vector3(0, 0, 0),
        color: '#212121',
        isActive: true,
        properties: { holeDepth: 10 }
      });
    }

    // 3. Multiple Ring Sequences - teach precision sequences
    const ringSequenceCount = 2;
    for (let seq = 0; seq < ringSequenceCount; seq++) {
      const startX = (Math.random() - 0.5) * bounds;
      const startZ = (Math.random() - 0.5) * bounds;
      
      for (let ring = 0; ring < 4; ring++) {
        obstacles.push({
          id: this.getNextId(),
          type: 'floating_ring',
          position: new Vector3(
            startX + ring * 8,
            5 + ring * 2,
            startZ + Math.sin(ring) * 5
          ),
          size: new Vector3(5, 5, 1),
          rotation: new Vector3(0, ring * Math.PI / 4, 0),
          color: '#E91E63',
          isActive: true,
          properties: { ringRadius: 2.5 }
        });
      }
    }

    return obstacles;
  }

  /**
   * Moving obstacles: Dynamic challenges
   */
  private generateMovingObstacles(worldSize: number): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    const bounds = worldSize * 0.7;

    // 1. Moving Platforms - teach timing
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'moving_platform',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          8,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(6, 2, 6),
        rotation: new Vector3(0, 0, 0),
        color: '#FF5722',
        isActive: true,
        movement: {
          type: 'linear',
          speed: 2,
          amplitude: new Vector3(15, 0, 0),
          phase: Math.random() * Math.PI * 2,
          direction: new Vector3(1, 0, 0)
        }
      });
    }

    // 2. Pendulum Obstacles - teach timing and prediction
    for (let i = 0; i < 2; i++) {
      obstacles.push({
        id: this.getNextId(),
        type: 'pendulum',
        position: new Vector3(
          (Math.random() - 0.5) * bounds,
          15,
          (Math.random() - 0.5) * bounds
        ),
        size: new Vector3(2, 8, 2),
        rotation: new Vector3(0, 0, 0),
        color: '#3F51B5',
        isActive: true,
        movement: {
          type: 'pendulum',
          speed: 1,
          amplitude: new Vector3(Math.PI / 3, 0, 0),
          phase: Math.random() * Math.PI * 2,
          direction: new Vector3(1, 0, 0)
        },
        properties: { pendulumLength: 8 }
      });
    }

    // 3. Circular Moving Rings - teach complex prediction
    obstacles.push({
      id: this.getNextId(),
      type: 'floating_ring',
      position: new Vector3(0, 12, 0),
      size: new Vector3(8, 8, 1),
      rotation: new Vector3(0, 0, 0),
      color: '#FFEB3B',
      isActive: true,
      movement: {
        type: 'circular',
        speed: 0.5,
        amplitude: new Vector3(20, 0, 20),
        phase: 0,
        direction: new Vector3(0, 1, 0)
      },
      properties: { ringRadius: 4 }
    });

    return obstacles;
  }

  /**
   * Generate all obstacle types for expert level
   */
  private generateAllObstacles(worldSize: number): TrainingObstacle[] {
    const obstacles: TrainingObstacle[] = [];
    obstacles.push(...this.generateBeginnerObstacles(worldSize));
    obstacles.push(...this.generateIntermediateObstacles(worldSize));
    obstacles.push(...this.generateAdvancedObstacles(worldSize));
    return obstacles;
  }

  /**
   * Get next unique obstacle ID
   */
  private getNextId(): string {
    return `obstacle_${++this.obstacleId}`;
  }

  /**
   * Update moving obstacles positions
   */
  public static updateMovingObstacles(obstacles: TrainingObstacle[], deltaTime: number): void {
    const currentTime = Date.now() / 1000;
    
    obstacles.forEach(obstacle => {
      if (!obstacle.movement || !obstacle.isActive) return;
      
      const { type, speed, amplitude, phase, direction } = obstacle.movement;
      const time = currentTime * speed + phase;
      
      switch (type) {
        case 'linear':
          const linearOffset = Math.sin(time) * amplitude.x;
          obstacle.position.x += linearOffset * direction.x * deltaTime;
          obstacle.position.y += linearOffset * direction.y * deltaTime;
          obstacle.position.z += linearOffset * direction.z * deltaTime;
          break;
          
        case 'circular':
          obstacle.position.x = amplitude.x * Math.cos(time);
          obstacle.position.z = amplitude.z * Math.sin(time);
          break;
          
        case 'oscillating':
          obstacle.position.y += Math.sin(time) * amplitude.y * deltaTime;
          break;
          
        case 'pendulum':
          const angle = amplitude.x * Math.sin(time);
          obstacle.rotation.z = angle;
          break;
      }
    });
  }
}
