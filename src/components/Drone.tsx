'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { DroneState } from '../types/simulation';

interface DroneProps {
  droneState: DroneState;
  onPositionChange?: (position: Vector3) => void;
}

export const Drone: React.FC<DroneProps> = ({ droneState, onPositionChange }) => {
  const droneRef = useRef<Mesh>(null);
  const propellerRefs = useRef<Mesh[]>([]);

  useEffect(() => {
    if (droneRef.current) {
      droneRef.current.position.copy(droneState.position);
      droneRef.current.rotation.set(
        droneState.rotation.x,
        droneState.rotation.y,
        droneState.rotation.z
      );
    }
  }, [droneState]);

  useFrame((state, delta) => {
    // Animate propellers based on engine power
    propellerRefs.current.forEach((propeller) => {
      if (propeller) {
        const rotationSpeed = droneState.enginePower * 25 + (droneState.isFlying ? 5 : 0);
        propeller.rotation.y += delta * rotationSpeed;
      }
    });

    // Add slight hovering animation when flying
    if (droneRef.current && droneState.isFlying) {
      const time = state.clock.getElapsedTime();
      const hoverOffset = Math.sin(time * 4) * 0.05 * droneState.enginePower;
      droneRef.current.position.y = droneState.position.y + hoverOffset;
    }

    // Notify parent of position changes
    if (onPositionChange && droneRef.current) {
      onPositionChange(droneRef.current.position);
    }
  });

  return (
    <group ref={droneRef}>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Propeller arms */}
      <mesh position={[1.2, 0.1, 1.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[-1.2, 0.1, 1.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[1.2, 0.1, -1.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[-1.2, 0.1, -1.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#666666" />
      </mesh>

      {/* Propellers */}
      <mesh
        ref={(el) => el && (propellerRefs.current[0] = el)}
        position={[1.2, 0.3, 1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color="#cccccc"
          transparent
          opacity={droneState.enginePower > 0.1 ? 0.3 : 0.8}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[1] = el)}
        position={[-1.2, 0.3, 1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color="#cccccc"
          transparent
          opacity={droneState.enginePower > 0.1 ? 0.3 : 0.8}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[2] = el)}
        position={[1.2, 0.3, -1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color="#cccccc"
          transparent
          opacity={droneState.enginePower > 0.1 ? 0.3 : 0.8}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[3] = el)}
        position={[-1.2, 0.3, -1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color="#cccccc"
          transparent
          opacity={droneState.enginePower > 0.1 ? 0.3 : 0.8}
        />
      </mesh>

      {/* LED lights */}
      <mesh position={[0, -0.1, 1]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={droneState.isFlying ? 0.8 : 0.2}
        />
      </mesh>
      <mesh position={[0, -0.1, -1]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={droneState.isFlying ? 0.8 : 0.2}
        />
      </mesh>

      {/* Camera gimbal system */}
      <group position={[0, -0.4, 0]}>
        {/* Gimbal base (attached to drone) */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1]} />
          <meshStandardMaterial color="#333333" />
        </mesh>

        {/* Gimbal rotation ring (rotates left/right) */}
        <group rotation={[0, droneState.cameraRotation, 0]}>
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.2, 0.03]} />
            <meshStandardMaterial color="#444444" />
          </mesh>

          {/* Gimbal tilt mechanism (tilts up/down) */}
          <group rotation={[droneState.cameraTilt, 0, 0]}>
            {/* Camera housing */}
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[0.3, 0.15, 0.2]} />
              <meshStandardMaterial color="#222222" />
            </mesh>

            {/* Camera lens */}
            <mesh position={[0, -0.1, -0.12]}>
              <cylinderGeometry args={[0.06, 0.06, 0.05]} />
              <meshStandardMaterial color="#111111" />
            </mesh>

            {/* Camera lens glass */}
            <mesh position={[0, -0.1, -0.145]}>
              <cylinderGeometry args={[0.05, 0.05, 0.01]} />
              <meshStandardMaterial color="#000066" transparent opacity={0.8} />
            </mesh>

            {/* Camera status LED */}
            <mesh position={[0.1, -0.05, -0.1]}>
              <sphereGeometry args={[0.02]} />
              <meshStandardMaterial
                color="#ff0000"
                emissive="#ff0000"
                emissiveIntensity={droneState.isFlying ? 0.8 : 0.2}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
