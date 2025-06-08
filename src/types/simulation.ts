import { Vector3 } from 'three';

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
}

export interface Building {
  id: string;
  position: Vector3;
  size: Vector3;
  color: string;
}

export interface Environment {
  buildings: Building[];
  groundSize: number;
  skyColor: string;
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
