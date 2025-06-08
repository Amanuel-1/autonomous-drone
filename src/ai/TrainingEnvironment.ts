import { Vector3 } from 'three';
import { DroneState, Building, Tree } from '../types/simulation';
import { 
  RewardConfig, 
  DroneStateVector, 
  Experience, 
  DroneAction, 
  TrainingState 
} from '../types/ai';
import { ReinforcementLearning } from './ReinforcementLearning';

/**
 * Training environment for autonomous drone learning
 * Manages episodes, rewards, and state transitions
 */
export class TrainingEnvironment {
  private rewardConfig: RewardConfig;
  private rlAgent: ReinforcementLearning;
  private trainingState: TrainingState;
  private previousState: number[] | null;
  private previousAction: DroneAction | null;
  private episodeStartTime: number;
  private visitedPositions: Set<string>;
  private lastPosition: Vector3;
  private stableFlightCounter: number;
  private explorationSteps: number;
  private previousDistanceToTarget: number;
  private previousDamage: number;
  private previousIsDead: boolean;
  private lastRewardDamageCheck: number;

  constructor(rlAgent: ReinforcementLearning, rewardConfig: RewardConfig) {
    this.rlAgent = rlAgent;
    this.rewardConfig = rewardConfig;
    this.previousState = null;
    this.previousAction = null;
    this.episodeStartTime = 0;
    this.visitedPositions = new Set();
    this.lastPosition = new Vector3();
    this.stableFlightCounter = 0;
    this.explorationSteps = 0;
    this.previousDistanceToTarget = 0;
    this.previousDamage = 0;
    this.previousIsDead = false;
    this.lastRewardDamageCheck = 0;

    this.trainingState = {
      isTraining: false,
      currentEpisode: 0,
      currentStep: 0,
      totalSteps: 0,
      bestReward: -Infinity,
      recentRewards: [],
      metrics: [],
      modelSaved: false,
      lastSaveTime: 0
    };
  }

  /**
   * Convert drone state to neural network input vector
   */
  public droneStateToVector(droneState: DroneState): number[] {
    const stateVector: number[] = [];

    // Position (normalized to [-1, 1] range assuming 100x100 world)
    stateVector.push(droneState.position.x / 50);
    stateVector.push(droneState.position.y / 50);
    stateVector.push(droneState.position.z / 50);

    // Velocity (normalized)
    stateVector.push(Math.tanh(droneState.velocity.x / 10));
    stateVector.push(Math.tanh(droneState.velocity.y / 10));
    stateVector.push(Math.tanh(droneState.velocity.z / 10));

    // Rotation (normalized to [-1, 1])
    stateVector.push(droneState.rotation.x / Math.PI);
    stateVector.push(droneState.rotation.y / Math.PI);
    stateVector.push(droneState.rotation.z / Math.PI);

    // Drone status (already normalized)
    stateVector.push(droneState.throttle);
    stateVector.push(droneState.battery / 100);
    stateVector.push(droneState.damage / 100);
    stateVector.push(droneState.enginePower);

    // Spherical LiDAR readings (normalized to [0, 1] with max range 50m)
    // Total rays: 16 spherical rays for 3D coverage
    const maxLidarRange = 50;
    const expectedLidarReadings = 16;

    if (droneState.lidarReadings.length >= expectedLidarReadings) {
      // Use all available readings
      for (let i = 0; i < expectedLidarReadings; i++) {
        const distance = droneState.lidarReadings[i]?.distance || maxLidarRange;
        stateVector.push(Math.min(distance / maxLidarRange, 1.0));
      }
    } else {
      // Use available readings and pad with max range
      for (let i = 0; i < expectedLidarReadings; i++) {
        const distance = droneState.lidarReadings[i]?.distance || maxLidarRange;
        stateVector.push(Math.min(distance / maxLidarRange, 1.0));
      }
    }

    // Add LiDAR reading indicators (helps AI understand spatial coverage)
    // Overall spherical coverage average
    const sphericalAvg = droneState.lidarReadings.slice(0, expectedLidarReadings)
      .reduce((sum, reading) => sum + (reading?.distance || maxLidarRange), 0) / expectedLidarReadings;
    stateVector.push(Math.min(sphericalAvg / maxLidarRange, 1.0));

    // Minimum distance (closest obstacle)
    const minDistance = Math.min(...droneState.lidarReadings.slice(0, expectedLidarReadings)
      .map(reading => reading?.distance || maxLidarRange));
    stateVector.push(Math.min(minDistance / maxLidarRange, 1.0));

    // Maximum distance (furthest clear path)
    const maxDistance = Math.max(...droneState.lidarReadings.slice(0, expectedLidarReadings)
      .map(reading => reading?.distance || 0));
    stateVector.push(Math.min(maxDistance / maxLidarRange, 1.0));

    // Flight status
    stateVector.push(droneState.isFlying ? 1 : 0);
    stateVector.push(droneState.isLanded ? 1 : 0);

    // Mission information (normalized to [-1, 1] range)
    stateVector.push(droneState.targetPosition.x / 50);
    stateVector.push(droneState.targetPosition.y / 50);
    stateVector.push(droneState.targetPosition.z / 50);

    // Distance to target (normalized to [0, 1] with max distance 100m)
    stateVector.push(Math.min(droneState.distanceToTarget / 100, 1.0));

    // Direction to target (normalized)
    const directionToTarget = droneState.targetPosition.clone().sub(droneState.position).normalize();
    stateVector.push(directionToTarget.x);
    stateVector.push(directionToTarget.z);

    return stateVector;
  }

  /**
   * Calculate reward based on current drone state and action using the specified strategy
   */
  public calculateReward(
    droneState: DroneState,
    action: DroneAction,
    buildings: Building[],
    trees: Tree[],
    previousDistance?: number
  ): number {
    let reward = 0;
    const position = droneState.position;
    const currentDistance = droneState.distanceToTarget;

    // 1. TIME STEP PENALTY: -0.1 per time step to encourage faster routes
    reward += this.rewardConfig.timeStepPenalty;

    // 2. MOVES CLOSER TO GOAL: +3.0 * delta_distance
    if (previousDistance !== undefined && currentDistance < previousDistance) {
      const deltaDistance = previousDistance - currentDistance;
      reward += this.rewardConfig.progressToTarget * deltaDistance;
      console.log(`📈 Moving closer: +${(this.rewardConfig.progressToTarget * deltaDistance).toFixed(2)}`);
    }

    // 3. WANDERS AWAY: -2.0 * delta_distance (stronger penalty)
    if (previousDistance !== undefined && currentDistance > previousDistance) {
      const deltaDistance = currentDistance - previousDistance;
      reward += this.rewardConfig.movingAwayFromTarget * deltaDistance;
      console.log(`📉 Moving away: ${(this.rewardConfig.movingAwayFromTarget * deltaDistance).toFixed(2)}`);
    }

    // 2.5. SHAPED PROXIMITY REWARDS: Frequent positive feedback
    if (currentDistance <= 50) {
      // Proximity bonus that increases as drone gets closer
      const proximityReward = Math.max(0, (50 - currentDistance) / 50) * 0.5;
      reward += proximityReward;

      // Extra bonuses for key distance milestones
      if (currentDistance <= 20) {
        reward += 0.5; // Within 20m bonus
      }
      if (currentDistance <= 10) {
        reward += 1.0; // Within 10m bonus
      }
      if (currentDistance <= 5) {
        reward += 2.0; // Within 5m bonus - approaching landing zone
      }
    }

    // 4. REACHES GOAL: +500 (big reward for completing task)
    const isInLandingZone = currentDistance <= 3; // Within 3 meters
    const isLandedNearTarget = isInLandingZone && droneState.isLanded;

    if (isLandedNearTarget && !droneState.missionCompleted) {
      reward += this.rewardConfig.missionComplete;
      console.log(`🎯 MISSION COMPLETED! +${this.rewardConfig.missionComplete}`);
    }

    // Bonus for proper landing approach (low altitude + low speed near target)
    if (isInLandingZone && droneState.isFlying) {
      const velocityMagnitude = droneState.velocity.length();
      if (position.y <= 3.0 && velocityMagnitude <= 2.0) {
        reward += 0.3; // Reward for proper landing approach
      }
    }

    // 5. COLLIDES WITH OBJECT: -100 (strong penalty for crashing)
    if (droneState.isDead && !this.previousIsDead) {
      // Only apply collision penalty once when drone just died
      reward += this.rewardConfig.collision;
      console.log(`💥 COLLISION: ${this.rewardConfig.collision}`);
    }

    // 6. OUT OF BOUNDS: -200 (very bad punishment for leaving world)
    const worldBounds = 50;
    if (Math.abs(position.x) > worldBounds || Math.abs(position.z) > worldBounds || position.y < 0 || position.y > 100) {
      reward += this.rewardConfig.outOfBounds;
      console.log(`🚫 OUT OF BOUNDS: ${this.rewardConfig.outOfBounds}`);
    }

    // 7. STABLE FLIGHT: +0.1 per tick for smooth flying
    const velocityMagnitude = droneState.velocity.length();
    if (droneState.isFlying && !droneState.isDead && velocityMagnitude < 3) {
      reward += this.rewardConfig.stableFlightBonus;
    }

    // 8. ALTITUDE MAINTENANCE: Enhanced context-aware altitude rewards
    const altitude = position.y;
    const optimalAltitudeMin = 5.0;  // Minimum safe altitude for cruising
    const optimalAltitudeMax = 20.0; // Reduced max altitude for easier learning
    const isNearTarget = currentDistance <= 8; // Within 8 meters of target
    const isVeryNearTarget = currentDistance <= 3; // Within landing zone

    if (droneState.isFlying && !droneState.isDead) {
      if (isVeryNearTarget) {
        // When very close to target, encourage descent for landing
        if (altitude <= 3.0) {
          reward += 0.5; // Stronger reward for low altitude near target
        } else {
          // Penalty for staying high when should be landing
          reward += (3.0 - altitude) * 0.2;
        }
      } else if (isNearTarget) {
        // When approaching target, allow lower altitude
        if (altitude >= 2.0 && altitude <= 12.0) {
          reward += 0.2; // Stronger reward for approach altitude
        } else if (altitude < 2.0) {
          // Small penalty for low altitude when approaching
          reward += -0.1;
        }
      } else {
        // Normal flight: maintain safe cruising altitude
        if (altitude >= optimalAltitudeMin && altitude <= optimalAltitudeMax) {
          reward += 0.2; // Stronger reward for optimal cruising altitude
        } else if (altitude < optimalAltitudeMin) {
          // Penalty for flying too low during cruise
          const lowAltitudePenalty = (optimalAltitudeMin - altitude) * -0.2;
          reward += lowAltitudePenalty;
          if (altitude < 2.0) {
            // Extra penalty for very dangerous low altitude during cruise
            reward += -0.5;
          }
        } else if (altitude > optimalAltitudeMax) {
          // Penalty for flying too high
          const highAltitudePenalty = (altitude - optimalAltitudeMax) * -0.1;
          reward += highAltitudePenalty;
        }
      }
    }

    // 9. ENHANCED COLLISION AVOIDANCE: Graduated penalties based on proximity
    let nearestObstacleDistance = Infinity;

    // Check buildings
    for (const building of buildings) {
      const distanceToBuilding = position.distanceTo(building.position) - Math.max(building.size.x, building.size.z) / 2;
      nearestObstacleDistance = Math.min(nearestObstacleDistance, distanceToBuilding);
    }

    // Check trees
    for (const tree of trees) {
      const distanceToTree = position.distanceTo(tree.position) - tree.radius;
      nearestObstacleDistance = Math.min(nearestObstacleDistance, distanceToTree);
    }

    // Graduated penalties based on proximity to obstacles
    if (droneState.isFlying && nearestObstacleDistance < 10) {
      if (nearestObstacleDistance < 2) {
        // Very close - strong penalty
        reward += -2.0;
      } else if (nearestObstacleDistance < 4) {
        // Close - moderate penalty
        reward += -1.0;
      } else if (nearestObstacleDistance < 6) {
        // Approaching - mild penalty
        reward += -0.5;
      } else {
        // Safe distance but awareness - very small penalty
        reward += -0.1;
      }
    }

    return reward;
  }

  /**
   * Check if drone should take damage based on negative reward accumulation
   */
  public checkRewardBasedDamage(currentTotalReward: number): { shouldTakeDamage: boolean; damageAmount: number; shouldDie: boolean } {
    const threshold = this.rewardConfig.rewardDamageThreshold;
    const damageAmount = this.rewardConfig.rewardDamageAmount;

    // Check if total reward has crossed the damage threshold
    if (currentTotalReward <= threshold && this.lastRewardDamageCheck > threshold) {
      // Crossed threshold from above - apply damage
      this.lastRewardDamageCheck = currentTotalReward;
      console.log(`⚠️ REWARD DAMAGE: Total reward ${currentTotalReward.toFixed(1)} ≤ ${threshold} - applying ${damageAmount} damage`);

      // If reward is extremely negative, kill the drone immediately
      const shouldDie = currentTotalReward <= (threshold * 2); // Die if reward is twice as bad as threshold

      return {
        shouldTakeDamage: true,
        damageAmount: damageAmount,
        shouldDie: shouldDie
      };
    }

    // Update last check value
    this.lastRewardDamageCheck = currentTotalReward;

    return {
      shouldTakeDamage: false,
      damageAmount: 0,
      shouldDie: false
    };
  }

  /**
   * Start a new training episode
   */
  public startEpisode(preserveExploration: boolean = false): void {
    this.rlAgent.startEpisode();
    this.trainingState.currentEpisode = this.rlAgent.getCurrentEpisode();
    this.trainingState.currentStep = 0;
    this.episodeStartTime = Date.now();

    // Only clear visited positions if not preserving exploration
    if (!preserveExploration) {
      this.visitedPositions.clear();
    }

    // Always reset these for new episode/mission
    this.stableFlightCounter = 0;
    this.explorationSteps = 0;
    this.previousState = null;
    this.previousAction = null;
    this.previousDistanceToTarget = 0;
    this.previousDamage = 0;
    this.previousIsDead = false;
    this.lastRewardDamageCheck = 0;

    console.log(`🔄 New episode ${this.trainingState.currentEpisode} started - rewards reset`);
  }

  /**
   * Process a single step in the environment
   */
  public step(
    droneState: DroneState, 
    buildings: Building[], 
    trees: Tree[]
  ): { action: DroneAction; reward: number; done: boolean } {
    const currentState = this.droneStateToVector(droneState);
    const epsilon = this.rlAgent.getCurrentEpsilon();
    
    // Select action
    const action = this.rlAgent.selectAction(currentState, epsilon);
    
    // Track exploration vs exploitation
    if (Math.random() < epsilon) {
      this.explorationSteps++;
    }

    // Calculate reward
    const reward = this.calculateReward(droneState, action, buildings, trees, this.previousDistanceToTarget);

    // Update previous values for next iteration
    this.previousDistanceToTarget = droneState.distanceToTarget;
    this.previousDamage = droneState.damage;
    this.previousIsDead = droneState.isDead;

    // Store experience if we have previous state
    if (this.previousState && this.previousAction !== null) {
      const experience: Experience = {
        state: this.previousState,
        action: this.previousAction,
        reward: reward,
        nextState: currentState,
        done: droneState.isDead || this.isEpisodeComplete(),
        timestamp: Date.now()
      };
      
      this.rlAgent.storeExperience(experience);
    }

    // Update training state
    this.trainingState.currentStep++;
    this.trainingState.totalSteps++;
    
    // Store current state for next iteration
    this.previousState = currentState;
    this.previousAction = action;
    this.lastPosition.copy(droneState.position);

    // Check if episode is complete
    const done = droneState.isDead || this.isEpisodeComplete(droneState);

    return { action, reward, done };
  }

  /**
   * End current episode
   */
  public endEpisode(totalReward: number, collisions: number): void {
    this.rlAgent.endEpisode(
      totalReward, 
      this.trainingState.currentStep, 
      collisions, 
      this.explorationSteps
    );

    // Update training state
    this.trainingState.recentRewards.push(totalReward);
    if (this.trainingState.recentRewards.length > 100) {
      this.trainingState.recentRewards = this.trainingState.recentRewards.slice(-100);
    }

    if (totalReward > this.trainingState.bestReward) {
      this.trainingState.bestReward = totalReward;
    }

    // Update metrics
    this.trainingState.metrics = this.rlAgent.getMetrics();
  }

  /**
   * Train the neural network
   */
  public train(): number {
    return this.rlAgent.train();
  }

  /**
   * Check if episode should end
   */
  private isEpisodeComplete(droneState?: DroneState): boolean {
    const maxSteps = 2000; // Maximum steps per episode (increased for mission completion)
    const maxTime = 120000; // Maximum time per episode (2 minutes)

    // Episode ends if mission is completed
    if (droneState?.missionCompleted) {
      return true;
    }

    return (
      this.trainingState.currentStep >= maxSteps ||
      (Date.now() - this.episodeStartTime) >= maxTime
    );
  }

  /**
   * Get current training state
   */
  public getTrainingState(): TrainingState {
    return { ...this.trainingState };
  }

  /**
   * Start training mode
   */
  public startTraining(): void {
    this.trainingState.isTraining = true;
  }

  /**
   * Stop training mode
   */
  public stopTraining(): void {
    this.trainingState.isTraining = false;
  }

  /**
   * Save trained model
   */
  public saveModel(): string {
    const modelData = this.rlAgent.saveModel();
    this.trainingState.modelSaved = true;
    this.trainingState.lastSaveTime = Date.now();
    return modelData;
  }

  /**
   * Load trained model
   */
  public loadModel(modelData: string): void {
    this.rlAgent.loadModel(modelData);
    this.trainingState.currentEpisode = this.rlAgent.getCurrentEpisode();
    this.trainingState.totalSteps = this.rlAgent.getTotalSteps();
    this.trainingState.metrics = this.rlAgent.getMetrics();
  }

  /**
   * Reset training environment
   */
  public reset(): void {
    this.rlAgent.reset();
    this.trainingState = {
      isTraining: false,
      currentEpisode: 0,
      currentStep: 0,
      totalSteps: 0,
      bestReward: -Infinity,
      recentRewards: [],
      metrics: [],
      modelSaved: false,
      lastSaveTime: 0
    };
    this.visitedPositions.clear();
    this.previousState = null;
    this.previousAction = null;
  }
}
