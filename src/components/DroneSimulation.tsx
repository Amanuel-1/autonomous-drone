'use client';

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
 * This is a personal research project exploring autonomous drone flight
 * using deep reinforcement learning and imitation learning techniques.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import {
  Bot, Plane, Brain, GraduationCap, Save, FolderOpen, Circle,
  Rocket, PlaneLanding, Video as CameraIcon, RotateCcw, Video, Square, Trash2,
  BarChart3, Battery, Heart, Skull, Target, CheckCircle, Clock,
  Trophy, ArrowUp, ArrowDown, Pause, AlertTriangle,
  MapPin, Activity, Settings, Monitor, Radar
} from 'lucide-react';
import { Drone } from './Drone';
import { Environment } from './Environment';
import { Camera } from './Camera';
import { MissionMarkers } from './MissionMarkers';
import { DroneState, SimulationControls, CameraSettings, DAMAGE_THRESHOLD, LiDARReading, TrainingObstacle } from '../types/simulation';
import { generateBuildings, generateSkyscrapers, generateDenseTrees, updateDronePosition, getRandomSpawnPosition } from '../utils/simulation';
import { defaultTrees } from './Environment';
import { ReinforcementLearning } from '../ai/ReinforcementLearning';
import { TrainingEnvironment } from '../ai/TrainingEnvironment';
import { ImitationLearning } from '../ai/ImitationLearning';
import { DroneAction, TrainingState } from '../types/ai';
import {
  actionToControls,
  getDefaultNetworkConfig,
  getDefaultTrainingConfig,
  getDefaultRewardConfig,
  getActionName,
  getDefaultTrainingEnvironmentConfig
} from '../utils/aiHelpers';
import { TrainingObstacleGenerator } from '../utils/trainingObstacles';
import { TrainingObstacles, WindZoneEffects, ObstacleLighting } from './TrainingObstacles';

export const DroneSimulation: React.FC = () => {
  const [droneState, setDroneState] = useState<DroneState>({
    position: new Vector3(0, 0.5, 0),
    rotation: new Vector3(0, 0, 0),
    velocity: new Vector3(0, 0, 0),
    angularVelocity: new Vector3(0, 0, 0),
    isFlying: false,
    isLanded: true,
    throttle: 0,
    battery: 100,
    enginePower: 0,
    cameraTilt: 0, // Camera starts level
    cameraRotation: 0, // Camera starts facing forward
    damage: 0, // Start with no damage
    isDead: false, // Start alive
    lidarReadings: [], // Start with empty LiDAR readings
    lidarEnabled: true, // Start with LiDAR enabled
    // AI system
    isAutonomous: false, // Start in manual mode
    lastReward: 0,
    totalReward: 0,
    episodeStep: 0,
    // Mission system
    startPosition: new Vector3(0, 0.5, 0),
    targetPosition: new Vector3(20, 0.5, 20),
    missionStarted: false,
    missionCompleted: false,
    distanceToTarget: 0
  });

  const [controls, setControls] = useState<SimulationControls>({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    throttleUp: false,
    throttleDown: false,
    rotateLeft: false,
    rotateRight: false,
    takeoff: false,
    land: false,
    hover: false,
    cameraTiltUp: false,
    cameraTiltDown: false,
    cameraRotateLeft: false,
    cameraRotateRight: false
  });

  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    followDrone: false,
    distance: 12, // Closer for better FPV feel
    height: 6,   // Lower height for more dynamic view
    angle: 0
  });

  const groundSize = 200; // Expanded world size
  const buildings = useMemo(() => generateBuildings(8, groundSize), []); // Reduced regular buildings
  const skyscrapers = useMemo(() => generateSkyscrapers(4, groundSize), []); // Reduced skyscrapers
  const trees = useMemo(() => defaultTrees, []);
  const denseTrees = useMemo(() => generateDenseTrees(25, groundSize), []); // Reduced dense forest areas

  // Training Environment
  const [trainingConfig] = useState(() => getDefaultTrainingEnvironmentConfig());
  const [trainingObstacles, setTrainingObstacles] = useState<TrainingObstacle[]>([]);

  // Initialize training obstacles
  useEffect(() => {
    const generator = new TrainingObstacleGenerator(trainingConfig);
    const obstacles = generator.generateTrainingObstacles();
    setTrainingObstacles(obstacles);
    console.log(`🏗️ Generated ${obstacles.length} training obstacles for ${trainingConfig.difficultyLevel} difficulty`);
  }, [trainingConfig]);

  // AI Brain initialization
  const rlAgent = useRef<ReinforcementLearning | null>(null);
  const trainingEnv = useRef<TrainingEnvironment | null>(null);
  const imitationLearning = useRef<ImitationLearning | null>(null);
  const [trainingState, setTrainingState] = useState<TrainingState>({
    isTraining: false,
    currentEpisode: 0,
    currentStep: 0,
    totalSteps: 0,
    bestReward: -Infinity,
    recentRewards: [],
    metrics: [],
    modelSaved: false,
    lastSaveTime: 0
  });
  const [currentAction, setCurrentAction] = useState<DroneAction | null>(null);
  const [collisionCount, setCollisionCount] = useState(0);
  const [respawnCountdown, setRespawnCountdown] = useState<number | null>(null);
  const [isRecordingDemo, setIsRecordingDemo] = useState(false);
  const [imitationStats, setImitationStats] = useState({
    enabled: false,
    recording: false,
    totalDemonstrations: 0,
    averageQuality: 0,
    currentRecordingLength: 0
  });
  const [trainingDiagnostics, setTrainingDiagnostics] = useState({
    successRate: 0,
    averageEpisodeLength: 0,
    averageReward: 0,
    explorationRate: 0,
    recentEpisodes: [] as number[]
  });

  // Initialize AI brain
  useEffect(() => {
    const networkConfig = getDefaultNetworkConfig();
    const trainingConfig = getDefaultTrainingConfig();
    const rewardConfig = getDefaultRewardConfig();

    rlAgent.current = new ReinforcementLearning(networkConfig, trainingConfig);
    trainingEnv.current = new TrainingEnvironment(rlAgent.current, rewardConfig);
    imitationLearning.current = new ImitationLearning();

    console.log('[AI] Brain initialized with neural network and imitation learning');
  }, []);

  // Handle keyboard input - FPV Drone Controls
  useEffect(() => {
    // Track which keys are currently pressed to avoid conflicts
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.add(event.code);

      switch (event.code) {
        // Arrow keys for movement
        case 'ArrowUp':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift + Up Arrow = Throttle Up
            setControls(prev => ({ ...prev, throttleUp: true }));
            console.log('FPV Control: THROTTLE UP (Shift + ↑)');
          } else {
            // Up Arrow = Move Forward
            setControls(prev => ({ ...prev, moveForward: true }));
            console.log('FPV Control: MOVE FORWARD (↑)');
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift + Down Arrow = Throttle Down
            setControls(prev => ({ ...prev, throttleDown: true }));
            console.log('FPV Control: THROTTLE DOWN (Shift + ↓)');
          } else {
            // Down Arrow = Move Backward
            setControls(prev => ({ ...prev, moveBackward: true }));
            console.log('FPV Control: MOVE BACKWARD (↓)');
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift + Left Arrow = Rotate Left
            setControls(prev => ({ ...prev, rotateLeft: true }));
            console.log('FPV Control: ROTATE LEFT (Shift + ←)');
          } else {
            // Left Arrow = Move Left
            setControls(prev => ({ ...prev, moveLeft: true }));
            console.log('FPV Control: MOVE LEFT (←)');
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) {
            // Shift + Right Arrow = Rotate Right
            setControls(prev => ({ ...prev, rotateRight: true }));
            console.log('FPV Control: ROTATE RIGHT (Shift + →)');
          } else {
            // Right Arrow = Move Right
            setControls(prev => ({ ...prev, moveRight: true }));
            console.log('FPV Control: MOVE RIGHT (→)');
          }
          break;
        // H key for hover mode
        case 'KeyH':
          event.preventDefault();
          setControls(prev => ({ ...prev, hover: true }));
          console.log('FPV Control: HOVER MODE (H)');
          // Auto-reset hover control after a short delay
          setTimeout(() => {
            setControls(prev => ({ ...prev, hover: false }));
          }, 100);
          break;
        // T key for takeoff
        case 'KeyT':
          event.preventDefault();
          console.log('FPV Control: TAKEOFF (T)');
          setControls(prev => ({ ...prev, takeoff: true }));
          setTimeout(() => {
            setControls(prev => ({ ...prev, takeoff: false }));
          }, 100);
          break;
        // L key for landing
        case 'KeyL':
          event.preventDefault();
          console.log('FPV Control: LAND (L)');
          setControls(prev => ({ ...prev, land: true }));
          setTimeout(() => {
            setControls(prev => ({ ...prev, land: false }));
          }, 100);
          break;
        // Camera controls (using IJKL keys)
        case 'KeyI':
          event.preventDefault();
          setControls(prev => ({ ...prev, cameraTiltUp: true }));
          break;
        case 'KeyK':
          event.preventDefault();
          setControls(prev => ({ ...prev, cameraTiltDown: true }));
          break;
        case 'KeyJ':
          event.preventDefault();
          setControls(prev => ({ ...prev, cameraRotateLeft: true }));
          break;
        case 'KeyO':
          event.preventDefault();
          setControls(prev => ({ ...prev, cameraRotateRight: true }));
          break;
        // NOTE: Removed standalone Shift key handling to avoid conflicts
        // Shift is only used in combination with arrow keys
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);

      switch (event.code) {
        // Arrow keys - clear all related controls
        case 'ArrowUp':
          setControls(prev => ({
            ...prev,
            moveForward: false,
            throttleUp: false // Clear both movement and throttle
          }));
          break;
        case 'ArrowDown':
          setControls(prev => ({
            ...prev,
            moveBackward: false,
            throttleDown: false // Clear both movement and throttle
          }));
          break;
        case 'ArrowLeft':
          setControls(prev => ({
            ...prev,
            moveLeft: false,
            rotateLeft: false // Clear both movement and rotation
          }));
          break;
        case 'ArrowRight':
          setControls(prev => ({
            ...prev,
            moveRight: false,
            rotateRight: false // Clear both movement and rotation
          }));
          break;
        // Camera controls (using IJKL keys)
        case 'KeyI':
          setControls(prev => ({ ...prev, cameraTiltUp: false }));
          break;
        case 'KeyK':
          setControls(prev => ({ ...prev, cameraTiltDown: false }));
          break;
        case 'KeyJ':
          setControls(prev => ({ ...prev, cameraRotateLeft: false }));
          break;
        case 'KeyO':
          setControls(prev => ({ ...prev, cameraRotateRight: false }));
          break;
        // NOTE: No standalone Shift key handling - only used with arrow keys
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update drone position based on controls (manual or AI)
  useEffect(() => {
    const interval = setInterval(() => {
      setDroneState(prevState => {
        let activeControls = controls;
        let aiAction: DroneAction | null = null;
        let reward = 0;

        // Combine all obstacles for collision detection and AI training
        const allBuildings = [...buildings, ...skyscrapers];
        const allTrees = [...trees, ...denseTrees];

        // AI Control Logic
        if (prevState.isAutonomous && trainingEnv.current && rlAgent.current) {
          try {
            // Get AI decision (use all obstacles for training)
            const stepResult = trainingEnv.current.step(prevState, allBuildings, allTrees);
            aiAction = stepResult.action;
            reward = stepResult.reward;

            // Convert AI action to controls
            const aiControls = actionToControls(aiAction);
            activeControls = { ...controls, ...aiControls };

            // Update current action for display
            setCurrentAction(aiAction);

            // Continuous training during flight (every 10 steps)
            if (trainingState.isTraining && prevState.episodeStep % 10 === 0 && prevState.episodeStep > 0) {
              const loss = trainingEnv.current.train();
              if (prevState.episodeStep % 50 === 0) {
                console.log(`[AI] Continuous training step ${prevState.episodeStep}. Loss: ${loss.toFixed(4)}`);
              }
            }

            // Check if episode should end
            if (stepResult.done) {
              // End episode and start new one
              trainingEnv.current.endEpisode(prevState.totalReward + reward, collisionCount);

              // Start new episode, preserving exploration if drone died (will respawn)
              // but not if mission was completed (new mission needed)
              const preserveExploration = prevState.isDead && !prevState.missionCompleted;
              trainingEnv.current.startEpisode(preserveExploration);

              if (!preserveExploration) {
                setCollisionCount(0);
              }

              // If mission was completed, generate new mission coordinates
              if (prevState.missionCompleted) {
                console.log('🎯 Mission completed! Generating new mission with reset rewards...');
                setTimeout(() => {
                  resetSimulation(true); // This will generate new mission coordinates and reset rewards
                }, 2000); // 2 second delay to show success
              }

              // Update training state
              setTrainingState(trainingEnv.current.getTrainingState());

              // Train the network more frequently
              if (trainingState.isTraining) {
                // Train multiple times per episode end for better learning
                let totalLoss = 0;
                const trainingSteps = 5; // Multiple training steps
                for (let i = 0; i < trainingSteps; i++) {
                  const loss = trainingEnv.current.train();
                  totalLoss += loss;
                }

                // Add imitation learning if demonstrations are available
                if (imitationLearning.current && imitationStats.totalDemonstrations > 0 && rlAgent.current) {
                  const imitationLoss = imitationLearning.current.trainFromDemonstrations(
                    rlAgent.current.getMainNetwork(), 16
                  );
                  if (imitationLoss > 0) {
                    console.log(`👨‍🏫 Imitation learning loss: ${imitationLoss.toFixed(4)}`);
                  }
                }

                const avgLoss = totalLoss / trainingSteps;

                // Enhanced logging for diagnostics
                const currentEpsilon = rlAgent.current?.getCurrentEpsilon() || 0;
                const bufferStats = rlAgent.current?.getBufferStats();

                console.log(`[AI] Episode ${trainingState.currentEpisode} completed:`);
                console.log(`   [STATS] Reward: ${prevState.totalReward.toFixed(1)} | Steps: ${prevState.episodeStep}`);
                console.log(`   [TARGET] Distance: ${prevState.distanceToTarget.toFixed(1)}m | Success: ${prevState.missionCompleted}`);
                console.log(`   [TRAINING] Loss: ${avgLoss.toFixed(4)} | ε: ${currentEpsilon.toFixed(3)} | Buffer: ${bufferStats?.size || 0}`);
                console.log(`   [COLLISION] Count: ${collisionCount} | Altitude: ${prevState.position.y.toFixed(1)}m`);
              }
            }
          } catch (error) {
            console.error('AI control error:', error);
            // Fall back to manual controls
          }
        }

        // Debug log for takeoff
        if (activeControls.takeoff) {
          console.log('Takeoff control active, drone state:', {
            isLanded: prevState.isLanded,
            isFlying: prevState.isFlying,
            position: prevState.position.y
          });
        }

        // Update drone physics
        const newState = updateDronePosition(prevState, activeControls, 0.016, allBuildings, allTrees, trainingObstacles);

        // Update mission state
        newState.distanceToTarget = newState.position.distanceTo(newState.targetPosition);

        // Check for mission completion
        const isNearTarget = newState.distanceToTarget <= 3;
        if (isNearTarget && newState.isLanded && !newState.missionCompleted) {
          newState.missionCompleted = true;
          console.log('🎯 MISSION COMPLETED! Landing successful!');
        }

        // Start mission when drone takes off
        if (!newState.missionStarted && newState.isFlying) {
          newState.missionStarted = true;
          console.log('🚀 Mission started! Navigate to target position.');
        }

        // Record manual demonstrations for imitation learning
        if (!prevState.isAutonomous && imitationLearning.current && imitationStats.recording) {
          const stateVector = trainingEnv.current?.droneStateToVector(newState) || [];
          imitationLearning.current.recordStep(newState, activeControls, stateVector);

          // Update imitation stats
          setImitationStats(imitationLearning.current.getStats());
        }

        // Update AI-related state
        if (prevState.isAutonomous) {
          newState.lastReward = reward;
          newState.totalReward = prevState.totalReward + reward;
          newState.episodeStep = prevState.episodeStep + 1;

          // Check for reward-based damage
          if (trainingEnv.current) {
            const damageCheck = trainingEnv.current.checkRewardBasedDamage(newState.totalReward);

            if (damageCheck.shouldTakeDamage) {
              newState.damage += damageCheck.damageAmount;
              console.log(`💔 Reward-based damage: +${damageCheck.damageAmount} (Total: ${newState.damage})`);

              // Check if drone should die from reward damage
              if (damageCheck.shouldDie || newState.damage >= DAMAGE_THRESHOLD) {
                newState.isDead = true;
                newState.isFlying = false;
                newState.isLanded = false;
                newState.throttle = 0;
                newState.enginePower = 0;
                console.log(`💀 Drone killed by negative rewards! Total reward: ${newState.totalReward.toFixed(1)}`);
              }
            }
          }

          // Track collisions for training
          if (newState.damage > prevState.damage) {
            setCollisionCount(prev => prev + 1);
          }

          // Auto-respawn when drone is destroyed in autonomous mode
          if (newState.isDead && !prevState.isDead) {
            console.log('💀 Drone destroyed! Auto-respawning with new mission...');

            // Start countdown
            let countdown = 3;
            setRespawnCountdown(countdown);

            const countdownInterval = setInterval(() => {
              countdown--;
              setRespawnCountdown(countdown);

              if (countdown <= 0) {
                clearInterval(countdownInterval);
                setRespawnCountdown(null);

                // Respawn with preserved AI state but reset rewards and new mission
                resetSimulation(true);

                // Start new episode in training environment
                if (trainingEnv.current) {
                  trainingEnv.current.startEpisode(false); // Fresh start with new mission
                }

                // Automatically take off after respawn if in autonomous mode
                setTimeout(() => {
                  setControls(prev => ({ ...prev, takeoff: true }));
                  setTimeout(() => {
                    setControls(prev => ({ ...prev, takeoff: false }));
                  }, 100);
                }, 500);
              }
            }, 1000); // 1 second intervals
          }
        }

        return newState;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [controls, buildings, trees, collisionCount, trainingState.isTraining]);

  const resetSimulation = useCallback((preserveAIState: boolean = false) => {
    // Generate safe spawn position that avoids all obstacles
    const allBuildings = [...buildings, ...skyscrapers];
    const safeStartPosition = getRandomSpawnPosition(allBuildings, trees, denseTrees, trainingObstacles, groundSize);

    // Generate target position that's also safe and at appropriate distance
    let targetPosition: Vector3;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      targetPosition = getRandomSpawnPosition(allBuildings, trees, denseTrees, trainingObstacles, groundSize);
      attempts++;
    } while (
      attempts < maxAttempts &&
      (safeStartPosition.distanceTo(targetPosition) < 15 || safeStartPosition.distanceTo(targetPosition) > 50)
    );

    // Fallback if no good target found
    if (attempts >= maxAttempts) {
      targetPosition = safeStartPosition.clone().add(new Vector3(20, 0, 20));
    }

    setDroneState(prevState => {
      const newDistanceToTarget = safeStartPosition.distanceTo(targetPosition);

      return {
        position: safeStartPosition.clone(),
        rotation: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        angularVelocity: new Vector3(0, 0, 0),
        isFlying: false,
        isLanded: true,
        throttle: 0,
        battery: 100,
        enginePower: 0,
        cameraTilt: 0,
        cameraRotation: 0,
        damage: 0,
        isDead: false,
        lidarReadings: [],
        lidarEnabled: true,
        // AI system - preserve state if requested (for auto-respawn)
        isAutonomous: preserveAIState ? prevState.isAutonomous : false,
        lastReward: 0,
        totalReward: 0, // Always reset total reward for new mission
        episodeStep: 0, // Always reset episode step for new mission
        // Mission system - always generate new mission
        startPosition: safeStartPosition.clone(),
        targetPosition: targetPosition.clone(),
        missionStarted: false,
        missionCompleted: false,
        distanceToTarget: newDistanceToTarget
      };
    });

    // Reset collision count for new spawn
    if (!preserveAIState) {
      setCollisionCount(0);
    }

    console.log(`[MISSION] New safe mission: Start(${safeStartPosition.x.toFixed(1)}, ${safeStartPosition.z.toFixed(1)}) → Target(${targetPosition.x.toFixed(1)}, ${targetPosition.z.toFixed(1)})`);
  }, [buildings, skyscrapers, trees, denseTrees, trainingObstacles, groundSize]);

  const toggleCameraFollow = useCallback(() => {
    setCameraSettings(prev => ({ ...prev, followDrone: !prev.followDrone }));
  }, []);

  const toggleLiDAR = useCallback(() => {
    setDroneState(prev => ({ ...prev, lidarEnabled: !prev.lidarEnabled }));
  }, []);

  const handleLiDARUpdate = useCallback((readings: LiDARReading[]) => {
    setDroneState(prev => ({ ...prev, lidarReadings: readings }));
  }, []);

  const handleTakeoff = useCallback(() => {
    console.log('Takeoff button clicked, current state:', droneState.isLanded);
    setControls(prev => ({ ...prev, takeoff: true }));
    setTimeout(() => {
      setControls(prev => ({ ...prev, takeoff: false }));
    }, 100);
  }, [droneState.isLanded]);

  const handleLand = useCallback(() => {
    setControls(prev => ({ ...prev, land: true }));
    setTimeout(() => {
      setControls(prev => ({ ...prev, land: false }));
    }, 100);
  }, []);

  // AI Control Functions
  const toggleAutonomousMode = useCallback(() => {
    setDroneState(prev => {
      const newAutonomous = !prev.isAutonomous;

      if (newAutonomous && trainingEnv.current) {
        // Start new episode when entering autonomous mode
        trainingEnv.current.startEpisode(false); // Fresh start when manually enabling
        setCollisionCount(0);
        console.log('🤖 Autonomous mode ENABLED - AI taking control');
      } else {
        console.log('👤 Manual mode ENABLED - Human taking control');
      }

      return {
        ...prev,
        isAutonomous: newAutonomous,
        totalReward: 0, // Reset rewards when toggling mode
        lastReward: 0,
        episodeStep: 0
      };
    });
  }, []);

  const toggleTraining = useCallback(() => {
    if (!trainingEnv.current) return;

    setTrainingState(prev => {
      const newTraining = !prev.isTraining;

      if (newTraining) {
        trainingEnv.current!.startTraining();
        console.log('[TRAINING] Mode ENABLED - AI learning from experience');
      } else {
        trainingEnv.current!.stopTraining();
        console.log('[TRAINING] Mode DISABLED - AI using current knowledge');
      }

      return { ...prev, isTraining: newTraining };
    });
  }, []);

  const saveAIModel = useCallback(() => {
    if (!trainingEnv.current) return;

    try {
      const modelData = trainingEnv.current.saveModel();
      const blob = new Blob([modelData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drone-ai-model-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[SAVE] AI model saved successfully');
      setTrainingState(prev => ({ ...prev, modelSaved: true, lastSaveTime: Date.now() }));
    } catch (error) {
      console.error('Failed to save AI model:', error);
    }
  }, []);

  const loadAIModel = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !trainingEnv.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const modelData = e.target?.result as string;
        trainingEnv.current!.loadModel(modelData);
        setTrainingState(trainingEnv.current!.getTrainingState());
        console.log('[LOAD] AI model loaded successfully');
      } catch (error) {
        console.error('Failed to load AI model:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // Imitation Learning Functions
  const startRecording = useCallback(() => {
    if (!imitationLearning.current || droneState.isAutonomous) return;

    imitationLearning.current.startRecording();
    setIsRecordingDemo(true);
    setImitationStats(imitationLearning.current.getStats());
    console.log('🎥 Started recording your manual flight for AI learning');
  }, [droneState.isAutonomous]);

  const stopRecording = useCallback(() => {
    if (!imitationLearning.current || !isRecordingDemo) return;

    const missionSuccess = droneState.missionCompleted;
    const totalReward = droneState.totalReward;

    imitationLearning.current.stopRecording(missionSuccess, totalReward, collisionCount);
    setIsRecordingDemo(false);
    setImitationStats(imitationLearning.current.getStats());
  }, [droneState.missionCompleted, droneState.totalReward, collisionCount, isRecordingDemo]);

  const clearDemonstrations = useCallback(() => {
    if (!imitationLearning.current) return;

    imitationLearning.current.clearDemonstrations();
    setImitationStats(imitationLearning.current.getStats());
    console.log('🗑️ Cleared all recorded demonstrations');
  }, []);

  const saveDemonstrations = useCallback(() => {
    if (!imitationLearning.current) return;

    try {
      const demoData = imitationLearning.current.exportDemonstrations();
      const blob = new Blob([demoData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drone-demonstrations-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[SAVE] Demonstrations saved successfully');
    } catch (error) {
      console.error('Failed to save demonstrations:', error);
    }
  }, []);

  const loadDemonstrations = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !imitationLearning.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const demoData = e.target?.result as string;
        imitationLearning.current!.importDemonstrations(demoData);
        setImitationStats(imitationLearning.current!.getStats());
        console.log('[LOAD] Demonstrations loaded successfully');
      } catch (error) {
        console.error('Failed to load demonstrations:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="w-full h-screen relative">
      <Canvas
        shadows
        camera={{ position: [20, 20, 20], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Environment
          buildings={buildings}
          skyscrapers={skyscrapers}
          denseTrees={denseTrees}
          groundSize={groundSize}
          trees={trees}
        />

        {/* Training Obstacles */}
        <TrainingObstacles obstacles={trainingObstacles} />
        <WindZoneEffects obstacles={trainingObstacles} />
        <ObstacleLighting obstacles={trainingObstacles} />

        <Drone droneState={droneState} onLiDARUpdate={handleLiDARUpdate} />
        <MissionMarkers
          startPosition={droneState.startPosition}
          targetPosition={droneState.targetPosition}
          missionCompleted={droneState.missionCompleted}
        />
        <Camera
          dronePosition={droneState.position}
          droneRotation={droneState.rotation}
          settings={cameraSettings}
        />
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-95 text-gray-100 p-2 rounded text-xs max-w-xs border border-gray-700">
        <h3 className="text-sm font-bold mb-1 flex items-center gap-1">
          {droneState.isAutonomous ? (
            <>
              <Bot size={14} />
              AI Pilot
            </>
          ) : (
            <>
              <Plane size={14} />
              Manual Controls
            </>
          )}
          {isRecordingDemo && (
            <span className="text-red-400 ml-1 flex items-center gap-1">
              <Circle size={8} className="fill-current" />
              REC
            </span>
          )}
        </h3>
        <div className="text-xs space-y-0.5">
          <p className="flex items-center gap-1">
            <Plane size={12} />
            <strong>CONTROLS:</strong>
          </p>
          <p><strong>Move:</strong> <span className="text-gray-300">↑↓←→</span></p>
          <p><strong>Alt:</strong> <span className="text-gray-300">Shift+↑↓</span></p>
          <p><strong>Rot:</strong> <span className="text-gray-300">Shift+←→</span></p>
          <p><strong>Hover:</strong> <span className="text-gray-300">H</span></p>
          <p><strong>Cam:</strong> I/K/J/O</p>
          <p><strong>T/O:</strong> T | <strong>Land:</strong> L</p>
        </div>
        <div className="mt-2 space-y-1">
          {droneState.isDead ? (
            <div className="text-center p-2 bg-gray-800 rounded border border-gray-600">
              <p className="text-gray-300 font-bold text-xs flex items-center justify-center gap-1">
                <Skull size={12} />
                DESTROYED
              </p>
              {droneState.isAutonomous && respawnCountdown !== null ? (
                <p className="text-gray-400 font-bold text-sm flex items-center justify-center gap-1">
                  <RotateCcw size={12} />
                  {respawnCountdown}s
                </p>
              ) : droneState.isAutonomous ? (
                <p className="text-gray-400 text-xs">Auto-respawning...</p>
              ) : (
                <p className="text-xs text-gray-400">Reset to respawn</p>
              )}
            </div>
          ) : droneState.isLanded ? (
            <button
              onClick={handleTakeoff}
              className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors font-bold flex items-center justify-center gap-1"
            >
              <Rocket size={12} />
              TAKEOFF
            </button>
          ) : (
            <>
              <div className="flex gap-1">
                <button
                  onMouseDown={() => setControls(prev => ({ ...prev, throttleUp: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, throttleUp: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, throttleUp: false }))}
                  className="flex-1 px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowUp size={12} />
                  UP
                </button>
                <button
                  onMouseDown={() => setControls(prev => ({ ...prev, throttleDown: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, throttleDown: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, throttleDown: false }))}
                  className="flex-1 px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowDown size={12} />
                  DOWN
                </button>
              </div>
              <button
                onClick={handleLand}
                className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center gap-1"
              >
                <PlaneLanding size={12} />
                LAND
              </button>
            </>
          )}
          <button
            onClick={toggleCameraFollow}
            className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center gap-1"
          >
            <CameraIcon size={12} />
            {cameraSettings.followDrone ? 'Free' : 'Follow'}
          </button>
          <button
            onClick={toggleLiDAR}
            className={`w-full px-2 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1 ${
              droneState.lidarEnabled
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Radar size={12} />
            LiDAR {droneState.lidarEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => resetSimulation(false)}
            className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} />
            Reset
          </button>

          {/* AI Controls */}
          <div className="mt-2 pt-2 border-t border-gray-600">
            <p className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1">
              <Brain size={12} />
              AI
            </p>
            <button
              onClick={toggleAutonomousMode}
              className={`w-full px-2 py-1 rounded text-xs transition-colors font-bold flex items-center justify-center gap-1 ${
                droneState.isAutonomous
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {droneState.isAutonomous ? (
                <>
                  <Bot size={12} />
                  AI
                </>
              ) : (
                <>
                  <Settings size={12} />
                  MANUAL
                </>
              )}
            </button>

            {/* Manual Mode - Imitation Learning */}
            {!droneState.isAutonomous && (
              <>
                <button
                  onClick={isRecordingDemo ? stopRecording : startRecording}
                  className={`w-full px-2 py-1 mt-1 rounded text-xs transition-colors font-bold flex items-center justify-center gap-1 ${
                    isRecordingDemo
                      ? 'bg-gray-800 hover:bg-gray-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isRecordingDemo ? (
                    <>
                      <Square size={12} />
                      STOP REC
                    </>
                  ) : (
                    <>
                      <Video size={12} />
                      RECORD
                    </>
                  )}
                </button>

                {imitationStats.totalDemonstrations > 0 && (
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={saveDemonstrations}
                      className="flex-1 px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center"
                    >
                      <Save size={12} />
                    </button>
                    <button
                      onClick={clearDemonstrations}
                      className="flex-1 px-1 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                <label className="w-full px-2 py-1 mt-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1">
                  <FolderOpen size={12} />
                  Load Demos
                  <input
                    type="file"
                    accept=".json"
                    onChange={loadDemonstrations}
                    className="hidden"
                  />
                </label>
              </>
            )}

            {/* Autonomous Mode - AI Controls */}
            {droneState.isAutonomous && (
              <>
                <button
                  onClick={toggleTraining}
                  className={`w-full px-2 py-1 mt-1 rounded text-xs transition-colors flex items-center justify-center gap-1 ${
                    trainingState.isTraining
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {trainingState.isTraining ? (
                    <>
                      <GraduationCap size={12} />
                      LEARN
                    </>
                  ) : (
                    <>
                      <Brain size={12} />
                      THINK
                    </>
                  )}
                </button>

                <div className="flex gap-1 mt-1">
                  <button
                    onClick={saveAIModel}
                    className="flex-1 px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center justify-center"
                  >
                    <Save size={12} />
                  </button>
                  <label className="flex-1 px-1 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors cursor-pointer flex items-center justify-center">
                    <FolderOpen size={12} />
                    <input
                      type="file"
                      accept=".json"
                      onChange={loadAIModel}
                      className="hidden"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drone Status */}
      <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-95 text-gray-100 p-2 rounded text-xs border border-gray-700">
        <h3 className="text-sm font-bold mb-1 flex items-center gap-1">
          <BarChart3 size={14} />
          Status
        </h3>
        <div className="text-xs space-y-0.5">
          <p><strong>Pos:</strong> ({droneState.position.x.toFixed(1)}, {droneState.position.y.toFixed(1)}, {droneState.position.z.toFixed(1)})</p>
          <p><strong>Speed:</strong> {droneState.velocity.length().toFixed(1)}m/s</p>
          <p><strong>Throttle:</strong> {(droneState.throttle * 100).toFixed(0)}%</p>
          <div className="w-full bg-gray-700 rounded-full h-1 mb-1">
            <div
              className="bg-gray-500 h-1 rounded-full transition-all duration-100"
              style={{ width: `${droneState.throttle * 100}%` }}
            ></div>
          </div>
          <p className="flex items-center gap-1">
            <strong>Status:</strong>
            {droneState.isDead ? (
              <>
                <Skull size={12} />
                CRASHED
              </>
            ) : droneState.isLanded ? (
              <>
                <PlaneLanding size={12} />
                Landed
              </>
            ) : droneState.isFlying ? (
              <>
                <Plane size={12} />
                Flying
              </>
            ) : (
              <>
                <Pause size={12} />
                Hovering
              </>
            )}
          </p>
          <p className="flex items-center gap-1">
            <strong>Battery:</strong>
            <Battery size={12} />
            {droneState.battery}%
          </p>
          <p className="flex items-center gap-1">
            <strong>Health:</strong>
            {droneState.isDead ? (
              <>
                <Skull size={12} />
                0
              </>
            ) : (
              <>
                <Heart size={12} />
                {Math.max(0, DAMAGE_THRESHOLD - droneState.damage)}/{DAMAGE_THRESHOLD}
              </>
            )}
          </p>

          {/* Mission Information */}
          <div className="mt-2 pt-2 border-t border-gray-600">
            <p className="flex items-center gap-1">
              <Target size={12} />
              <strong>Mission:</strong>
              <span className={`flex items-center gap-1 ${droneState.missionCompleted ? 'text-gray-300' : droneState.missionStarted ? 'text-gray-400' : 'text-gray-500'}`}>
                {droneState.missionCompleted ? (
                  <>
                    <CheckCircle size={10} />
                    Complete
                  </>
                ) : droneState.missionStarted ? (
                  <>
                    <Rocket size={10} />
                    Active
                  </>
                ) : (
                  <>
                    <Clock size={10} />
                    Pending
                  </>
                )}
              </span>
            </p>
            <p><strong>Distance:</strong> <span className="text-gray-300">{droneState.distanceToTarget.toFixed(1)}m</span></p>
            <p><strong>Start:</strong> ({droneState.startPosition.x.toFixed(0)}, {droneState.startPosition.z.toFixed(0)})</p>
            <p><strong>Target:</strong> ({droneState.targetPosition.x.toFixed(0)}, {droneState.targetPosition.z.toFixed(0)})</p>
            {droneState.missionCompleted && (
              <p className="text-gray-300 font-bold flex items-center gap-1">
                <Trophy size={12} />
                SUCCESS!
              </p>
            )}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1 mb-1">
            <div
              className={`h-1 rounded-full transition-all duration-100 ${
                droneState.isDead ? 'bg-gray-600' :
                droneState.damage > DAMAGE_THRESHOLD * 0.7 ? 'bg-gray-500' : 'bg-gray-400'
              }`}
              style={{ width: `${Math.max(0, (DAMAGE_THRESHOLD - droneState.damage) / DAMAGE_THRESHOLD * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* LiDAR Readings */}
      {droneState.lidarEnabled && droneState.lidarReadings.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-95 text-gray-100 p-2 rounded text-xs max-w-xs border border-gray-700">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1">
            <Radar size={14} />
            LiDAR
          </h3>
          <div className="text-xs space-y-0.5">
            <p><strong>Rays:</strong> {droneState.lidarReadings.length}</p>
            <p><strong>Type:</strong> <span className="text-gray-300">Spherical 3D</span></p>
            <p><strong>Nearest:</strong></p>
            <div className="max-h-20 overflow-y-auto space-y-0.5">
              {droneState.lidarReadings
                .filter(reading => reading.distance < 20)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 6)
                .map((reading, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-300">
                      {reading.hitObject}
                    </span>
                    <span className="text-gray-400">
                      {reading.distance.toFixed(1)}m
                    </span>
                  </div>
                ))}
            </div>
            <div className="mt-1 pt-1 border-t border-gray-600">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Circle size={8} />
                Intersections
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Radar size={8} />
                360° Spherical Coverage
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Status Panel */}
      {droneState.isAutonomous && (
        <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-95 text-gray-100 p-2 rounded text-xs max-w-xs border border-gray-700">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1">
            <Brain size={14} />
            AI Brain
          </h3>
          <div className="text-xs space-y-0.5">
            <p className="flex items-center gap-1">
              <strong>Mode:</strong>
              <span className="flex items-center gap-1 text-gray-300">
                {trainingState.isTraining ? (
                  <>
                    <GraduationCap size={10} />
                    Learning
                  </>
                ) : (
                  <>
                    <Brain size={10} />
                    Thinking
                  </>
                )}
              </span>
            </p>

            <p><strong>Action:</strong> <span className="text-gray-300">
              {currentAction !== null ? getActionName(currentAction).split('_')[0] : 'NONE'}
            </span></p>

            <p><strong>Ep:</strong> {trainingState.currentEpisode} | <strong>Step:</strong> {droneState.episodeStep}</p>
            <p className="flex items-center gap-1">
              <strong>Reward:</strong>
              <span className="text-gray-300">
                {droneState.totalReward.toFixed(1)}
                {droneState.totalReward <= -50 && (
                  <AlertTriangle size={10} className="inline ml-1" />
                )}
                {droneState.totalReward <= -100 && (
                  <Skull size={10} className="inline ml-1" />
                )}
              </span>
              <span className="text-gray-400">
                ({droneState.lastReward.toFixed(2)})
              </span>
            </p>
            {droneState.episodeStep === 0 && droneState.totalReward === 0 && (
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <RotateCcw size={10} />
                Rewards reset for new mission
              </p>
            )}

            {trainingState.isTraining && (
              <>
                <p><strong>Best:</strong> <span className="text-gray-300">
                  {trainingState.bestReward === -Infinity ? 'N/A' : trainingState.bestReward.toFixed(1)}
                </span></p>
                <p><strong>Crashes:</strong> <span className="text-gray-400">{collisionCount}</span></p>
              </>
            )}

            <div className="mt-1 pt-1 border-t border-gray-600">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Bot size={10} />
                Neural net + LiDAR
              </p>
              {trainingState.isTraining && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <GraduationCap size={10} />
                  Learning with R&P strategy
                </p>
              )}
              {imitationStats.totalDemonstrations > 0 && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Monitor size={10} />
                  {imitationStats.totalDemonstrations} demos (Q:{imitationStats.averageQuality.toFixed(2)})
                </p>
              )}
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <RotateCcw size={10} />
                Auto-respawn
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={10} />
                -0.01/step | -30 crash | +1000 target
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Activity size={10} />
                +3.0 closer | -2.0 away | Shaped rewards
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Heart size={10} />
                Damage at -200 | Death at -400
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Brain size={10} />
                Network: 256→128→64 layers, 40 inputs
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Radar size={10} />
                LiDAR: 16 spherical rays (3D coverage)
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Plane size={10} />
                Stronger altitude signals | 15-60m missions
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Settings size={10} />
                Training: {trainingConfig.difficultyLevel} | {trainingObstacles.length} obstacles
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={10} />
                Environment: {buildings.length + skyscrapers.length} buildings | {denseTrees.length} trees | {trainingObstacles.length} obstacles
              </p>
              {respawnCountdown !== null && (
                <p className="text-xs text-gray-400 font-bold flex items-center gap-1">
                  <Clock size={10} />
                  {respawnCountdown}s
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
