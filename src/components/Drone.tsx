'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { DroneState, LiDARReading } from '../types/simulation';
import { LiDAR } from './LiDAR';

interface DroneProps {
  droneState: DroneState;
  onPositionChange?: (position: Vector3) => void;
  onLiDARUpdate?: (readings: LiDARReading[]) => void;
}

export const Drone: React.FC<DroneProps> = ({ droneState, onPositionChange, onLiDARUpdate }) => {
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
    // Animate propellers based on engine power (stop if dead)
    propellerRefs.current.forEach((propeller) => {
      if (propeller && !droneState.isDead) {
        const rotationSpeed = droneState.enginePower * 25 + (droneState.isFlying ? 5 : 0);
        propeller.rotation.y += delta * rotationSpeed;
      }
    });

    // Add slight hovering animation when flying, or crash effects when dead
    if (droneRef.current) {
      if (droneState.isDead) {
        // Add crash smoke/spark effect (subtle position jitter)
        const time = state.clock.getElapsedTime();
        const crashJitter = Math.sin(time * 20) * 0.02;
        droneRef.current.position.copy(droneState.position);
        droneRef.current.position.x += crashJitter;
        droneRef.current.position.z += crashJitter * 0.5;
      } else if (droneState.isFlying) {
        const time = state.clock.getElapsedTime();
        const hoverOffset = Math.sin(time * 4) * 0.05 * droneState.enginePower;
        droneRef.current.position.y = droneState.position.y + hoverOffset;
      }
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
        <meshStandardMaterial
          color={droneState.isDead ? "#660000" : droneState.damage > 50 ? "#663333" : "#333333"}
        />
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
          color={droneState.isDead ? "#666666" : "#cccccc"}
          transparent
          opacity={droneState.isDead ? 0.1 : (droneState.enginePower > 0.1 ? 0.3 : 0.8)}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[1] = el)}
        position={[-1.2, 0.3, 1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color={droneState.isDead ? "#666666" : "#cccccc"}
          transparent
          opacity={droneState.isDead ? 0.1 : (droneState.enginePower > 0.1 ? 0.3 : 0.8)}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[2] = el)}
        position={[1.2, 0.3, -1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color={droneState.isDead ? "#666666" : "#cccccc"}
          transparent
          opacity={droneState.isDead ? 0.1 : (droneState.enginePower > 0.1 ? 0.3 : 0.8)}
        />
      </mesh>
      <mesh
        ref={(el) => el && (propellerRefs.current[3] = el)}
        position={[-1.2, 0.3, -1.2]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.02]} />
        <meshStandardMaterial
          color={droneState.isDead ? "#666666" : "#cccccc"}
          transparent
          opacity={droneState.isDead ? 0.1 : (droneState.enginePower > 0.1 ? 0.3 : 0.8)}
        />
      </mesh>

      {/* LED lights */}
      <mesh position={[0, -0.1, 1]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial
          color={droneState.isDead ? "#888888" : "#aaaaaa"}
          emissive={droneState.isDead ? "#666666" : "#888888"}
          emissiveIntensity={droneState.isDead ? 0.5 : (droneState.isFlying ? 0.4 : 0.1)}
        />
      </mesh>
      <mesh position={[0, -0.1, -1]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial
          color="#888888"
          emissive="#666666"
          emissiveIntensity={droneState.isDead ? 0.5 : (droneState.isFlying ? 0.4 : 0.1)}
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
                color="#888888"
                emissive="#666666"
                emissiveIntensity={droneState.isFlying ? 0.4 : 0.1}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* Damage/Crash Effects */}
      {droneState.isDead && (
        <group>
          {/* Smoke effect (simple dark spheres) */}
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * 2,
              0.5 + Math.random() * 1,
              (Math.random() - 0.5) * 2
            ]}>
              <sphereGeometry args={[0.1 + Math.random() * 0.1]} />
              <meshBasicMaterial
                color="#333333"
                transparent
                opacity={0.3 + Math.random() * 0.3}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Damage sparks effect */}
      {droneState.damage > 50 && !droneState.isDead && (
        <group>
          {Array.from({ length: 3 }, (_, i) => (
            <mesh key={i} position={[
              (Math.random() - 0.5) * 1,
              0.2,
              (Math.random() - 0.5) * 1
            ]}>
              <sphereGeometry args={[0.02]} />
              <meshBasicMaterial
                color="#999999"
                emissive="#777777"
                emissiveIntensity={0.4}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Enhanced LiDAR System - positioned relative to drone */}
      <LiDAR
        position={new Vector3(0, 0, 0)} // Relative to drone center
        rotation={new Vector3(0, 0, 0)} // Use drone's rotation from parent group
        enabled={droneState.lidarEnabled}
        onReadingsUpdate={(readings) => {
          if (onLiDARUpdate) {
            onLiDARUpdate(readings);
          }
        }}
        maxRange={25}
        horizontalRayCount={0}
        verticalRayCount={0}
        downwardRayCount={0}
        sphericalRayCount={16}
      />
    </group>
  );
};
