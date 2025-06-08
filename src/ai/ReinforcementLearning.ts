import { NeuralNetwork } from './NeuralNetwork';
import { 
  Experience, 
  ReplayBuffer, 
  TrainingConfig, 
  TrainingMetrics, 
  DroneAction,
  NeuralNetworkConfig 
} from '../types/ai';

/**
 * Deep Q-Network (DQN) implementation for drone reinforcement learning
 */
export class ReinforcementLearning {
  private mainNetwork: NeuralNetwork;
  private targetNetwork: NeuralNetwork;
  private replayBuffer: ReplayBuffer;
  private config: TrainingConfig;
  private metrics: TrainingMetrics[];
  private currentEpisode: number;
  private totalSteps: number;

  constructor(networkConfig: NeuralNetworkConfig, trainingConfig: TrainingConfig) {
    this.mainNetwork = new NeuralNetwork(networkConfig);
    this.targetNetwork = new NeuralNetwork(networkConfig);
    this.config = trainingConfig;
    this.metrics = [];
    this.currentEpisode = 0;
    this.totalSteps = 0;
    
    this.replayBuffer = {
      experiences: [],
      maxSize: trainingConfig.replayBufferSize,
      currentIndex: 0
    };

    // Initialize target network with same weights as main network
    this.updateTargetNetwork();
  }

  /**
   * Store experience in replay buffer
   */
  public storeExperience(experience: Experience): void {
    if (this.replayBuffer.experiences.length < this.replayBuffer.maxSize) {
      this.replayBuffer.experiences.push(experience);
    } else {
      this.replayBuffer.experiences[this.replayBuffer.currentIndex] = experience;
      this.replayBuffer.currentIndex = (this.replayBuffer.currentIndex + 1) % this.replayBuffer.maxSize;
    }
  }

  /**
   * Sample batch from replay buffer with recency bias
   */
  private sampleBatch(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    const bufferSize = this.replayBuffer.experiences.length;

    if (bufferSize < batchSize) {
      return this.replayBuffer.experiences.slice();
    }

    // Prioritize recent experiences (last 20% of buffer gets higher probability)
    const recentThreshold = Math.floor(bufferSize * 0.8);
    const indices = new Set<number>();

    while (indices.size < batchSize) {
      let index: number;
      if (Math.random() < 0.3 && bufferSize > recentThreshold) {
        // 30% chance to sample from recent experiences
        index = recentThreshold + Math.floor(Math.random() * (bufferSize - recentThreshold));
      } else {
        // 70% chance to sample from entire buffer
        index = Math.floor(Math.random() * bufferSize);
      }
      indices.add(index);
    }

    indices.forEach(index => {
      batch.push(this.replayBuffer.experiences[index]);
    });

    return batch;
  }

  /**
   * Select action using epsilon-greedy strategy
   */
  public selectAction(state: number[], epsilon: number): DroneAction {
    return this.mainNetwork.selectAction(state, epsilon);
  }

  /**
   * Get Q-values for a given state
   */
  public getQValues(state: number[]): number[] {
    return this.mainNetwork.forward(state);
  }

  /**
   * Train the network using experience replay
   */
  public train(): number {
    if (this.replayBuffer.experiences.length < this.config.batchSize) {
      return 0; // Not enough experiences to train
    }

    const batch = this.sampleBatch(this.config.batchSize);
    let totalLoss = 0;

    // Process each experience in the batch
    for (const experience of batch) {
      // Get current Q-values
      const currentQValues = this.mainNetwork.forward(experience.state);
      
      // Calculate target Q-value
      let targetQValue: number;
      if (experience.done) {
        targetQValue = experience.reward;
      } else {
        const nextQValues = this.targetNetwork.forward(experience.nextState);
        const maxNextQ = Math.max(...nextQValues);
        targetQValue = experience.reward + this.config.gamma * maxNextQ;
      }

      // Create target output (copy current Q-values and update the action taken)
      const targetOutput = [...currentQValues];
      targetOutput[experience.action] = targetQValue;

      // Train the network
      const loss = this.mainNetwork.backward(targetOutput);
      totalLoss += loss;
    }

    this.totalSteps++;

    // Update target network periodically
    if (this.totalSteps % this.config.targetUpdateFrequency === 0) {
      this.updateTargetNetwork();
    }

    return totalLoss / batch.length;
  }

  /**
   * Update target network with main network weights
   */
  private updateTargetNetwork(): void {
    const mainWeights = this.mainNetwork.getWeights();
    this.targetNetwork.setWeights(mainWeights);
  }

  /**
   * Calculate epsilon for current episode (epsilon decay)
   */
  public getCurrentEpsilon(): number {
    const decayedEpsilon = this.config.epsilon * Math.pow(this.config.epsilonDecay, this.currentEpisode);
    return Math.max(decayedEpsilon, this.config.epsilonMin);
  }

  /**
   * Start new episode
   */
  public startEpisode(): void {
    this.currentEpisode++;
  }

  /**
   * End current episode and record metrics
   */
  public endEpisode(totalReward: number, episodeLength: number, collisions: number, explorationSteps: number): void {
    const epsilon = this.getCurrentEpsilon();
    const exploitationSteps = episodeLength - explorationSteps;
    
    // Calculate average reward over last 100 episodes
    const recentMetrics = this.metrics.slice(-99);
    const averageReward = recentMetrics.length > 0 
      ? (recentMetrics.reduce((sum, m) => sum + m.totalReward, 0) + totalReward) / (recentMetrics.length + 1)
      : totalReward;

    const metrics: TrainingMetrics = {
      episode: this.currentEpisode,
      totalReward,
      episodeLength,
      epsilon,
      averageReward,
      collisions,
      explorationSteps,
      exploitationSteps,
      loss: 0 // Will be updated during training
    };

    this.metrics.push(metrics);

    // Keep only last 1000 episodes of metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get training metrics
   */
  public getMetrics(): TrainingMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get latest metrics
   */
  public getLatestMetrics(): TrainingMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get current episode number
   */
  public getCurrentEpisode(): number {
    return this.currentEpisode;
  }

  /**
   * Get total training steps
   */
  public getTotalSteps(): number {
    return this.totalSteps;
  }

  /**
   * Save model weights
   */
  public saveModel(): string {
    const modelData = {
      mainNetwork: this.mainNetwork.getWeights(),
      targetNetwork: this.targetNetwork.getWeights(),
      config: this.mainNetwork.getConfig(),
      trainingConfig: this.config,
      episode: this.currentEpisode,
      totalSteps: this.totalSteps,
      metrics: this.metrics.slice(-100) // Save last 100 episodes
    };
    
    return JSON.stringify(modelData);
  }

  /**
   * Load model weights
   */
  public loadModel(modelData: string): void {
    try {
      const data = JSON.parse(modelData);
      
      this.mainNetwork.setWeights(data.mainNetwork);
      this.targetNetwork.setWeights(data.targetNetwork);
      this.currentEpisode = data.episode || 0;
      this.totalSteps = data.totalSteps || 0;
      this.metrics = data.metrics || [];
      
      console.log(`Model loaded: Episode ${this.currentEpisode}, Total steps: ${this.totalSteps}`);
    } catch (error) {
      console.error('Failed to load model:', error);
      throw new Error('Invalid model data');
    }
  }

  /**
   * Reset training state
   */
  public reset(): void {
    this.currentEpisode = 0;
    this.totalSteps = 0;
    this.metrics = [];
    this.replayBuffer.experiences = [];
    this.replayBuffer.currentIndex = 0;
    
    // Reinitialize networks
    const networkConfig = this.mainNetwork.getConfig();
    this.mainNetwork = new NeuralNetwork(networkConfig);
    this.targetNetwork = new NeuralNetwork(networkConfig);
    this.updateTargetNetwork();
  }

  /**
   * Get replay buffer statistics
   */
  public getBufferStats(): { size: number; maxSize: number; utilization: number } {
    const size = this.replayBuffer.experiences.length;
    const maxSize = this.replayBuffer.maxSize;
    const utilization = size / maxSize;

    return { size, maxSize, utilization };
  }

  /**
   * Get main network for imitation learning
   */
  public getMainNetwork(): NeuralNetwork {
    return this.mainNetwork;
  }
}
