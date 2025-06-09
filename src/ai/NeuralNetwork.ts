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
 * Deep Neural Network implementation for autonomous drone control
 */

import { NeuralNetworkConfig, NetworkWeights, DroneAction } from '../types/ai';

/**
 * Deep Neural Network implementation for drone control
 * Uses feedforward architecture with configurable hidden layers
 */
export class NeuralNetwork {
  private config: NeuralNetworkConfig;
  private weights: NetworkWeights;
  private activations: number[][];
  private gradients: number[][][];
  private biasGradients: number[][];

  constructor(config: NeuralNetworkConfig) {
    this.config = config;
    this.weights = this.initializeWeights();
    this.activations = [];
    this.gradients = [];
    this.biasGradients = [];
  }

  /**
   * Initialize network weights using He initialization (better for ReLU)
   */
  private initializeWeights(): NetworkWeights {
    const weights: number[][][] = [];
    const biases: number[][] = [];

    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize];

    for (let i = 0; i < layers.length - 1; i++) {
      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];

      const inputSize = layers[i];
      const outputSize = layers[i + 1];

      // He initialization (better for ReLU networks)
      const stddev = Math.sqrt(2 / inputSize);

      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          // Normal distribution approximation using Box-Muller transform
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          neuronWeights.push(z0 * stddev);
        }
        layerWeights.push(neuronWeights);
        layerBiases.push(0.01); // Small positive bias for ReLU
      }

      weights.push(layerWeights);
      biases.push(layerBiases);
    }

    return { weights, biases };
  }

  /**
   * ReLU activation function
   */
  private relu(x: number): number {
    return Math.max(0, x);
  }

  /**
   * ReLU derivative
   */
  private reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
  }

  /**
   * Softmax activation for output layer
   */
  private softmax(values: number[]): number[] {
    const maxVal = Math.max(...values);
    const expValues = values.map(v => Math.exp(v - maxVal));
    const sum = expValues.reduce((a, b) => a + b, 0);
    return expValues.map(v => v / sum);
  }

  /**
   * Forward pass through the network
   */
  public forward(input: number[]): number[] {
    if (input.length !== this.config.inputSize) {
      throw new Error(`Input size mismatch. Expected ${this.config.inputSize}, got ${input.length}`);
    }

    this.activations = [input];
    let currentActivation = input;

    // Process through hidden layers
    for (let i = 0; i < this.weights.weights.length - 1; i++) {
      const layerOutput: number[] = [];
      
      for (let j = 0; j < this.weights.weights[i].length; j++) {
        let sum = this.weights.biases[i][j];
        for (let k = 0; k < currentActivation.length; k++) {
          sum += currentActivation[k] * this.weights.weights[i][j][k];
        }
        
        // Apply ReLU activation and dropout during training
        let activation = this.relu(sum);
        if (Math.random() < this.config.dropout) {
          activation = 0; // Dropout
        }
        layerOutput.push(activation);
      }
      
      this.activations.push(layerOutput);
      currentActivation = layerOutput;
    }

    // Output layer with softmax
    const outputLayerIndex = this.weights.weights.length - 1;
    const outputLayer: number[] = [];
    
    for (let j = 0; j < this.weights.weights[outputLayerIndex].length; j++) {
      let sum = this.weights.biases[outputLayerIndex][j];
      for (let k = 0; k < currentActivation.length; k++) {
        sum += currentActivation[k] * this.weights.weights[outputLayerIndex][j][k];
      }
      outputLayer.push(sum);
    }
    
    const finalOutput = this.softmax(outputLayer);
    this.activations.push(finalOutput);
    
    return finalOutput;
  }

  /**
   * Select action using improved epsilon-greedy strategy with action masking
   */
  public selectAction(input: number[], epsilon: number): DroneAction {
    const actionProbabilities = this.forward(input);

    if (Math.random() < epsilon) {
      // Weighted random exploration (favor higher probability actions even during exploration)
      const temperature = 2.0; // Controls randomness
      const expValues = actionProbabilities.map(p => Math.exp(p / temperature));
      const sum = expValues.reduce((a, b) => a + b, 0);
      const probabilities = expValues.map(v => v / sum);

      // Sample from probability distribution
      const random = Math.random();
      let cumulative = 0;
      for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random <= cumulative) {
          return i as DroneAction;
        }
      }
      return (probabilities.length - 1) as DroneAction;
    } else {
      // Exploitation - choose best action
      return actionProbabilities.indexOf(Math.max(...actionProbabilities)) as DroneAction;
    }
  }

  /**
   * Backward pass for training
   */
  public backward(targetOutput: number[], learningRate?: number): number {
    const lr = learningRate || this.config.learningRate;
    const numLayers = this.weights.weights.length;
    
    // Initialize gradients
    this.gradients = this.weights.weights.map(layer => 
      layer.map(neuron => new Array(neuron.length).fill(0))
    );
    this.biasGradients = this.weights.biases.map(layer => 
      new Array(layer.length).fill(0)
    );

    // Calculate output layer error
    const outputActivations = this.activations[this.activations.length - 1];
    const outputErrors = outputActivations.map((output, i) => 
      output - targetOutput[i]
    );

    // Calculate loss (mean squared error)
    const loss = outputErrors.reduce((sum, error) => sum + error * error, 0) / outputErrors.length;

    // Backpropagate errors
    let currentErrors = outputErrors;
    
    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const currentActivations = this.activations[layer];
      const nextErrors: number[] = new Array(currentActivations.length).fill(0);
      
      // Update weights and biases
      for (let j = 0; j < this.weights.weights[layer].length; j++) {
        this.biasGradients[layer][j] = currentErrors[j];
        
        for (let k = 0; k < this.weights.weights[layer][j].length; k++) {
          this.gradients[layer][j][k] = currentErrors[j] * currentActivations[k];
          
          // Accumulate error for previous layer
          if (layer > 0) {
            nextErrors[k] += currentErrors[j] * this.weights.weights[layer][j][k];
          }
        }
      }
      
      // Apply ReLU derivative for hidden layers
      if (layer > 0) {
        for (let k = 0; k < nextErrors.length; k++) {
          nextErrors[k] *= this.reluDerivative(this.activations[layer][k]);
        }
      }
      
      currentErrors = nextErrors;
    }

    // Update weights and biases
    this.updateWeights(lr);
    
    return loss;
  }

  /**
   * Update network weights using calculated gradients with clipping
   */
  private updateWeights(learningRate: number): void {
    const maxGradientNorm = 1.0; // Gradient clipping threshold

    // Calculate gradient norm
    let gradientNorm = 0;
    for (let layer = 0; layer < this.gradients.length; layer++) {
      for (let j = 0; j < this.gradients[layer].length; j++) {
        gradientNorm += this.biasGradients[layer][j] * this.biasGradients[layer][j];
        for (let k = 0; k < this.gradients[layer][j].length; k++) {
          gradientNorm += this.gradients[layer][j][k] * this.gradients[layer][j][k];
        }
      }
    }
    gradientNorm = Math.sqrt(gradientNorm);

    // Apply gradient clipping
    const clipRatio = gradientNorm > maxGradientNorm ? maxGradientNorm / gradientNorm : 1.0;

    for (let layer = 0; layer < this.weights.weights.length; layer++) {
      for (let j = 0; j < this.weights.weights[layer].length; j++) {
        // Update bias with clipping
        this.weights.biases[layer][j] -= learningRate * this.biasGradients[layer][j] * clipRatio;

        // Update weights with clipping
        for (let k = 0; k < this.weights.weights[layer][j].length; k++) {
          this.weights.weights[layer][j][k] -= learningRate * this.gradients[layer][j][k] * clipRatio;
        }
      }
    }
  }

  /**
   * Get network weights for saving/loading
   */
  public getWeights(): NetworkWeights {
    return JSON.parse(JSON.stringify(this.weights));
  }

  /**
   * Set network weights for loading trained model
   */
  public setWeights(weights: NetworkWeights): void {
    this.weights = JSON.parse(JSON.stringify(weights));
  }

  /**
   * Get network configuration
   */
  public getConfig(): NeuralNetworkConfig {
    return { ...this.config };
  }

  /**
   * Create a copy of the network
   */
  public clone(): NeuralNetwork {
    const clone = new NeuralNetwork(this.config);
    clone.setWeights(this.getWeights());
    return clone;
  }
}
