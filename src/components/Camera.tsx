'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { CameraSettings } from '../types/simulation';

interface CameraProps {
  dronePosition: Vector3;
  droneRotation: Vector3; // Add drone rotation for proper follow camera
  settings: CameraSettings;
}

export const Camera: React.FC<CameraProps> = ({ dronePosition, droneRotation, settings }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (settings.followDrone && controlsRef.current) {
      // Calculate camera position behind the drone based on drone's yaw rotation
      const droneYaw = droneRotation.y;

      // Position camera behind the drone (opposite direction of drone's forward)
      const behindOffset = new Vector3(
        -Math.sin(droneYaw) * settings.distance, // Behind the drone in X
        settings.height, // Height above the drone
        -Math.cos(droneYaw) * settings.distance  // Behind the drone in Z
      );

      const targetPosition = dronePosition.clone().add(behindOffset);

      // Smoothly move camera to follow drone
      camera.position.lerp(targetPosition, 0.08); // Slightly faster follow for FPV feel

      // Look at the drone
      controlsRef.current.target.copy(dronePosition);
      controlsRef.current.update();

      console.log('FPV Camera: Following drone at yaw ' + (droneYaw * 180 / Math.PI).toFixed(1) + '°');
    }
  });

  useEffect(() => {
    if (!settings.followDrone && controlsRef.current) {
      // Reset to default orbital controls when not following
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [settings.followDrone]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!settings.followDrone}
      enableZoom={true}
      enableRotate={!settings.followDrone}
      maxPolarAngle={Math.PI / 2}
      minDistance={5}
      maxDistance={100}
    />
  );
};
