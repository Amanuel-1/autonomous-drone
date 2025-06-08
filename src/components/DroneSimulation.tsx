'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Drone } from './Drone';
import { Environment } from './Environment';
import { Camera } from './Camera';
import { DroneState, SimulationControls, CameraSettings } from '../types/simulation';
import { generateBuildings, updateDronePosition, getRandomSpawnPosition } from '../utils/simulation';

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
    cameraRotation: 0 // Camera starts facing forward
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

  const groundSize = 100;
  const buildings = useMemo(() => generateBuildings(20, groundSize), []);

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

  // Update drone position based on controls
  useEffect(() => {
    const interval = setInterval(() => {
      setDroneState(prevState => {
        // Debug log for takeoff
        if (controls.takeoff) {
          console.log('Takeoff control active, drone state:', {
            isLanded: prevState.isLanded,
            isFlying: prevState.isFlying,
            position: prevState.position.y
          });
        }
        return updateDronePosition(prevState, controls, 0.016);
      });
    }, 16);

    return () => clearInterval(interval);
  }, [controls]);

  const resetSimulation = useCallback(() => {
    const newPosition = getRandomSpawnPosition(buildings, groundSize);
    setDroneState({
      position: newPosition,
      rotation: new Vector3(0, 0, 0),
      velocity: new Vector3(0, 0, 0),
      angularVelocity: new Vector3(0, 0, 0),
      isFlying: false,
      isLanded: true,
      throttle: 0,
      battery: 100,
      enginePower: 0,
      cameraTilt: 0,
      cameraRotation: 0
    });
  }, [buildings]);

  const toggleCameraFollow = useCallback(() => {
    setCameraSettings(prev => ({ ...prev, followDrone: !prev.followDrone }));
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

  return (
    <div className="w-full h-screen relative">
      <Canvas
        shadows
        camera={{ position: [20, 20, 20], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Environment buildings={buildings} groundSize={groundSize} />
        <Drone droneState={droneState} />
        <Camera
          dronePosition={droneState.position}
          droneRotation={droneState.rotation}
          settings={cameraSettings}
        />
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-xs">
        <h3 className="text-lg font-bold mb-2">🚁 Drone Controls</h3>
        <div className="text-sm space-y-1">
          <p><strong>🚁 FPV DRONE CONTROLS:</strong></p>
          <p><strong>🏃 MOVEMENT:</strong> <span className="text-blue-300">Arrow Keys</span> (↑↓←→)</p>
          <p><strong>🚀 ALTITUDE:</strong> <span className="text-green-300">Shift + ↑</span> / <span className="text-red-300">Shift + ↓</span></p>
          <p><strong>🔄 ROTATION:</strong> <span className="text-yellow-300">Shift + ←/→</span></p>
          <p><strong>🎯 HOVER:</strong> <span className="text-purple-300">H</span> (auto-level)</p>
          <p><strong>📹 CAMERA:</strong> I/K (tilt), J/O (rotate)</p>
          <p><strong>🛫 Takeoff:</strong> T | <strong>🛬 Land:</strong> L</p>
          <p className="text-yellow-300 text-xs mt-2">
            💡 Realistic FPV physics! Shift key only works with arrows - no conflicts!
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {droneState.isLanded ? (
            <button
              onClick={handleTakeoff}
              className="block w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors font-bold"
            >
              🚀 TAKEOFF
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onMouseDown={() => setControls(prev => ({ ...prev, throttleUp: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, throttleUp: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, throttleUp: false }))}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors font-bold"
                >
                  ⬆️ THROTTLE UP
                </button>
                <button
                  onMouseDown={() => setControls(prev => ({ ...prev, throttleDown: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, throttleDown: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, throttleDown: false }))}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors font-bold"
                >
                  ⬇️ THROTTLE DOWN
                </button>
              </div>
              <button
                onClick={handleLand}
                className="block w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors font-bold"
              >
                🛬 LAND
              </button>
            </>
          )}
          <button
            onClick={toggleCameraFollow}
            className="block w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            📹 {cameraSettings.followDrone ? 'Free Camera' : 'Follow Drone'}
          </button>
          <button
            onClick={resetSimulation}
            className="block w-full px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
          >
            🔄 Reset Position
          </button>
        </div>
      </div>

      {/* Drone Status */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2">📊 Drone Status</h3>
        <div className="text-sm space-y-1">
          <p><strong>Position:</strong></p>
          <p>X: {droneState.position.x.toFixed(1)}m</p>
          <p>Y: {droneState.position.y.toFixed(1)}m</p>
          <p>Z: {droneState.position.z.toFixed(1)}m</p>
          <p><strong>Velocity:</strong></p>
          <p>Speed: {droneState.velocity.length().toFixed(1)}m/s</p>
          <p><strong>Throttle:</strong> {(droneState.throttle * 100).toFixed(0)}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${droneState.throttle * 100}%` }}
            ></div>
          </div>
          <p><strong>Engine:</strong> {(droneState.enginePower * 100).toFixed(0)}%</p>
          <p><strong>Status:</strong> {
            droneState.isLanded ? '🛬 Landed (Press T to takeoff)' :
            droneState.isFlying ? '✈️ Flying' :
            '🚁 Hovering'
          }</p>
          <p><strong>Battery:</strong> 🔋 {droneState.battery}%</p>
          <div className="mt-2 text-xs">
            <p><strong>Active Controls:</strong></p>
            <div className="flex flex-wrap gap-1 mt-1">
              {controls.throttleUp && <span className="bg-green-600 px-1 rounded">W↑</span>}
              {controls.throttleDown && <span className="bg-red-600 px-1 rounded">S↓</span>}
              {controls.moveLeft && <span className="bg-blue-600 px-1 rounded">A←</span>}
              {controls.moveRight && <span className="bg-blue-600 px-1 rounded">D→</span>}
              {controls.moveForward && <span className="bg-purple-600 px-1 rounded">Q↑</span>}
              {controls.moveBackward && <span className="bg-purple-600 px-1 rounded">E↓</span>}
              {controls.rotateLeft && <span className="bg-yellow-600 px-1 rounded">Z↺</span>}
              {controls.rotateRight && <span className="bg-yellow-600 px-1 rounded">C↻</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
