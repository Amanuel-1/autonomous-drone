import { DroneState, SimulationControls } from '../types/simulation';
import { DemonstrationData, DroneAction, ImitationLearningConfig } from '../types/ai';
import { NeuralNetwork } from './NeuralNetwork';

/**
 * Imitation Learning system for learning from human demonstrations
 */
export class ImitationLearning {
  private config: ImitationLearningConfig;
  private currentRecording: DemonstrationData[];
  private recordingStartTime: number;
  private lastRecordedState: number[] | null;

  constructor() {
    this.config = {
      enabled: false,
      recordingMode: false,
      demonstrationBuffer: [],
      maxDemonstrations: 10000,
      imitationWeight: 0.3, // 30% imitation, 70% reinforcement learning
      qualityThreshold: 0.6 // Only keep demonstrations with quality > 0.6
    };
    
    this.currentRecording = [];
    this.recordingStartTime = 0;
    this.lastRecordedState = null;
  }

  /**
   * Start recording human demonstrations
   */
  public startRecording(): void {
    this.config.recordingMode = true;
    this.currentRecording = [];
    this.recordingStartTime = Date.now();
    this.lastRecordedState = null;
    console.log('🎥 Started recording human demonstration');
  }

  /**
   * Stop recording and evaluate the demonstration quality
   */
  public stopRecording(missionSuccess: boolean, totalReward: number, collisions: number): void {
    if (!this.config.recordingMode || this.currentRecording.length === 0) {
      return;
    }

    this.config.recordingMode = false;
    
    // Calculate demonstration quality based on performance
    const quality = this.calculateDemonstrationQuality(missionSuccess, totalReward, collisions);
    
    if (quality >= this.config.qualityThreshold) {
      // Add quality score to all demonstrations in this recording
      this.currentRecording.forEach(demo => {
        demo.quality = quality;
      });
      
      // Add to demonstration buffer
      this.addDemonstrations(this.currentRecording);
      
      console.log(`✅ Recorded ${this.currentRecording.length} demonstrations with quality ${quality.toFixed(2)}`);
    } else {
      console.log(`❌ Demonstration quality too low (${quality.toFixed(2)} < ${this.config.qualityThreshold}), discarding`);
    }
    
    this.currentRecording = [];
  }

  /**
   * Record a single demonstration step
   */
  public recordStep(droneState: DroneState, controls: SimulationControls, stateVector: number[]): void {
    if (!this.config.recordingMode) {
      return;
    }

    // Convert controls to action
    const action = this.controlsToAction(controls);
    if (action === null) {
      return; // No action to record
    }

    // Only record if state has changed significantly
    if (this.lastRecordedState && this.statesSimilar(this.lastRecordedState, stateVector)) {
      return;
    }

    const demonstration: DemonstrationData = {
      state: [...stateVector],
      action: action,
      timestamp: Date.now(),
      quality: 1.0 // Will be updated when recording stops
    };

    this.currentRecording.push(demonstration);
    this.lastRecordedState = [...stateVector];
  }

  /**
   * Convert simulation controls to drone action
   */
  private controlsToAction(controls: SimulationControls): DroneAction | null {
    // Priority order for conflicting controls
    if (controls.throttleUp) return DroneAction.THROTTLE_UP;
    if (controls.throttleDown) return DroneAction.THROTTLE_DOWN;
    if (controls.moveForward) return DroneAction.MOVE_FORWARD;
    if (controls.moveBackward) return DroneAction.MOVE_BACKWARD;
    if (controls.moveLeft) return DroneAction.MOVE_LEFT;
    if (controls.moveRight) return DroneAction.MOVE_RIGHT;
    if (controls.rotateLeft) return DroneAction.ROTATE_LEFT;
    if (controls.rotateRight) return DroneAction.ROTATE_RIGHT;
    if (controls.hover) return DroneAction.HOVER;
    
    return null; // No active control
  }

  /**
   * Check if two states are similar enough to skip recording
   */
  private statesSimilar(state1: number[], state2: number[]): boolean {
    if (state1.length !== state2.length) return false;
    
    const threshold = 0.01; // 1% change threshold
    for (let i = 0; i < state1.length; i++) {
      if (Math.abs(state1[i] - state2[i]) > threshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate quality of demonstration based on performance metrics
   */
  private calculateDemonstrationQuality(missionSuccess: boolean, totalReward: number, collisions: number): number {
    let quality = 0.5; // Base quality
    
    // Mission success bonus
    if (missionSuccess) {
      quality += 0.4;
    }
    
    // Reward-based quality
    if (totalReward > 0) {
      quality += Math.min(totalReward / 1000, 0.3); // Up to 0.3 bonus for high rewards
    } else {
      quality += Math.max(totalReward / 500, -0.3); // Up to 0.3 penalty for negative rewards
    }
    
    // Collision penalty
    quality -= collisions * 0.1;
    
    // Time efficiency (shorter demonstrations are better)
    const duration = Date.now() - this.recordingStartTime;
    const timeBonus = Math.max(0, (120000 - duration) / 120000 * 0.2); // Bonus for completing in under 2 minutes
    quality += timeBonus;
    
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Add demonstrations to buffer
   */
  private addDemonstrations(demonstrations: DemonstrationData[]): void {
    // Add new demonstrations
    this.config.demonstrationBuffer.push(...demonstrations);
    
    // Remove oldest demonstrations if buffer is full
    if (this.config.demonstrationBuffer.length > this.config.maxDemonstrations) {
      const excess = this.config.demonstrationBuffer.length - this.config.maxDemonstrations;
      this.config.demonstrationBuffer.splice(0, excess);
    }
    
    // Sort by quality (keep best demonstrations)
    this.config.demonstrationBuffer.sort((a, b) => b.quality - a.quality);
  }

  /**
   * Train neural network using imitation learning
   */
  public trainFromDemonstrations(network: NeuralNetwork, batchSize: number = 32): number {
    if (this.config.demonstrationBuffer.length < batchSize) {
      return 0;
    }

    // Sample high-quality demonstrations
    const demonstrations = this.sampleDemonstrations(batchSize);
    let totalLoss = 0;

    for (const demo of demonstrations) {
      // Create target output (one-hot encoding of the demonstrated action)
      const targetOutput = new Array(9).fill(0);
      targetOutput[demo.action] = 1.0;
      
      // Weight by demonstration quality
      const weightedTarget = targetOutput.map(val => val * demo.quality);
      
      // Train network
      const loss = network.backward(weightedTarget);
      totalLoss += loss;
    }

    return totalLoss / demonstrations.length;
  }

  /**
   * Sample demonstrations with bias toward higher quality
   */
  private sampleDemonstrations(batchSize: number): DemonstrationData[] {
    const demonstrations: DemonstrationData[] = [];
    const bufferSize = this.config.demonstrationBuffer.length;
    
    // Bias sampling toward higher quality demonstrations (first 50% of sorted buffer)
    const highQualityRange = Math.floor(bufferSize * 0.5);
    
    for (let i = 0; i < batchSize; i++) {
      let index: number;
      if (Math.random() < 0.7 && highQualityRange > 0) {
        // 70% chance to sample from high-quality demonstrations
        index = Math.floor(Math.random() * highQualityRange);
      } else {
        // 30% chance to sample from entire buffer
        index = Math.floor(Math.random() * bufferSize);
      }
      
      demonstrations.push(this.config.demonstrationBuffer[index]);
    }
    
    return demonstrations;
  }

  /**
   * Get imitation learning statistics
   */
  public getStats(): {
    enabled: boolean;
    recording: boolean;
    totalDemonstrations: number;
    averageQuality: number;
    currentRecordingLength: number;
  } {
    const averageQuality = this.config.demonstrationBuffer.length > 0
      ? this.config.demonstrationBuffer.reduce((sum, demo) => sum + demo.quality, 0) / this.config.demonstrationBuffer.length
      : 0;

    return {
      enabled: this.config.enabled,
      recording: this.config.recordingMode,
      totalDemonstrations: this.config.demonstrationBuffer.length,
      averageQuality: averageQuality,
      currentRecordingLength: this.currentRecording.length
    };
  }

  /**
   * Enable/disable imitation learning
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get configuration
   */
  public getConfig(): ImitationLearningConfig {
    return { ...this.config };
  }

  /**
   * Clear all demonstrations
   */
  public clearDemonstrations(): void {
    this.config.demonstrationBuffer = [];
    this.currentRecording = [];
    console.log('🗑️ Cleared all demonstrations');
  }

  /**
   * Save demonstrations to JSON
   */
  public exportDemonstrations(): string {
    return JSON.stringify({
      demonstrations: this.config.demonstrationBuffer,
      config: this.config,
      exportTime: Date.now()
    });
  }

  /**
   * Load demonstrations from JSON
   */
  public importDemonstrations(data: string): void {
    try {
      const imported = JSON.parse(data);
      this.config.demonstrationBuffer = imported.demonstrations || [];
      console.log(`📂 Imported ${this.config.demonstrationBuffer.length} demonstrations`);
    } catch (error) {
      console.error('Failed to import demonstrations:', error);
    }
  }
}
