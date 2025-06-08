'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Raycaster, Object3D, BufferGeometry, Line, LineBasicMaterial, BufferAttribute, SphereGeometry, MeshBasicMaterial, Mesh, Quaternion, Euler } from 'three';
import { LiDARReading } from '../types/simulation';

interface LiDARProps {
  position: Vector3;
  rotation: Vector3;
  enabled: boolean;
  onReadingsUpdate: (readings: LiDARReading[]) => void;
  maxRange?: number;
  horizontalRayCount?: number;
  verticalRayCount?: number;
}

export const LiDAR: React.FC<LiDARProps> = ({
  position,
  rotation,
  enabled,
  onReadingsUpdate,
  maxRange = 20,
  horizontalRayCount = 16,
  verticalRayCount = 8
}) => {
  const { scene } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const rayLinesRef = useRef<Line[]>([]);
  const hitDotsRef = useRef<Object3D[]>([]);
  const groupRef = useRef<Object3D>(null);

  // Create ray lines and hit dots for both horizontal and vertical rays
  const { rayLines, hitDots } = useMemo(() => {
    const lines: Line[] = [];
    const dots: Object3D[] = [];
    const totalRays = horizontalRayCount + verticalRayCount;

    for (let i = 0; i < totalRays; i++) {
      // Create ray line
      const geometry = new BufferGeometry();
      const positions = new Float32Array(6); // 2 points * 3 coordinates
      geometry.setAttribute('position', new BufferAttribute(positions, 3));

      // Different colors for horizontal vs vertical rays
      const isVertical = i >= horizontalRayCount;
      const material = new LineBasicMaterial({
        color: isVertical ? 0x00ff88 : 0x00ffff, // Green-cyan for vertical, cyan for horizontal
        transparent: true,
        opacity: 0.6
      });

      const line = new Line(geometry, material);
      lines.push(line);

      // Create hit dot
      const dotGeometry = new SphereGeometry(0.08, 6, 6);
      const dotMaterial = new MeshBasicMaterial({
        color: isVertical ? 0x0088ff : 0x0066ff, // Different blue shades
        emissive: isVertical ? 0x0088ff : 0x0066ff,
        emissiveIntensity: 0.5
      });
      const dot = new Mesh(dotGeometry, dotMaterial);
      dot.visible = false;
      dots.push(dot);
    }

    return { rayLines: lines, hitDots: dots };
  }, [horizontalRayCount, verticalRayCount]);

  // Add lines and dots to the group
  useEffect(() => {
    if (groupRef.current) {
      // Clear existing children
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }

      // Add ray lines and hit dots
      rayLines.forEach(line => groupRef.current!.add(line));
      hitDots.forEach(dot => groupRef.current!.add(dot));
      
      rayLinesRef.current = rayLines;
      hitDotsRef.current = hitDots;
    }
  }, [rayLines, hitDots]);

  useFrame(() => {
    if (!enabled || !groupRef.current) return;

    const readings: LiDARReading[] = [];

    // Get world position and rotation from the group (which is positioned by the drone)
    const worldPosition = new Vector3();
    const worldQuaternion = new Quaternion();
    const worldEuler = new Euler();

    groupRef.current.getWorldPosition(worldPosition);
    groupRef.current.getWorldQuaternion(worldQuaternion);
    worldEuler.setFromQuaternion(worldQuaternion);
    const worldRotation = new Vector3(worldEuler.x, worldEuler.y, worldEuler.z);

    const totalRays = horizontalRayCount + verticalRayCount;

    for (let i = 0; i < totalRays; i++) {
      let direction: Vector3;
      let angle: number;

      if (i < horizontalRayCount) {
        // Horizontal rays (around the drone in a circle)
        angle = (i / horizontalRayCount) * Math.PI * 2; // 360 degrees in radians
        direction = new Vector3(
          Math.cos(angle + worldRotation.y), // Apply drone's Y rotation
          0, // Keep rays horizontal
          Math.sin(angle + worldRotation.y)
        ).normalize();
      } else {
        // Vertical rays (up and down from the drone)
        const verticalIndex = i - horizontalRayCount;
        const verticalAngle = (verticalIndex / verticalRayCount) * Math.PI; // 0 to π radians

        // Create rays going up and down at various angles
        const elevation = (verticalAngle - Math.PI / 2); // -π/2 to π/2 (down to up)
        angle = verticalAngle; // Store for reading data

        direction = new Vector3(
          0, // No horizontal component for pure vertical rays
          Math.sin(elevation), // Y component (up/down)
          Math.cos(elevation) * 0.1 // Small forward component to avoid pure vertical
        ).normalize();
      }

      // Set raycaster origin to drone's world position
      raycaster.set(worldPosition, direction);

      // Get all intersectable objects from scene
      const intersectableObjects: Object3D[] = [];
      scene.traverse((child) => {
        // Include buildings, trees, and ground, but exclude the drone itself and LiDAR components
        if (child.type === 'Mesh' && 
            !child.name.includes('drone') && 
            !child.name.includes('lidar') &&
            child.material) {
          intersectableObjects.push(child);
        }
      });

      // Cast ray and find intersections
      const intersects = raycaster.intersectObjects(intersectableObjects, false);
      
      let distance = maxRange;
      let hitPoint = worldPosition.clone().add(direction.clone().multiplyScalar(maxRange));
      let hitObject = 'none';

      if (intersects.length > 0) {
        const hit = intersects[0];
        distance = hit.distance;
        hitPoint = hit.point;
        
        // Determine object type based on material color or geometry
        const object = hit.object as any;
        if (object.material) {
          const color = object.material.color;
          if (color) {
            // Identify object type by color (this is a simple heuristic)
            if (color.r > 0.5 && color.g < 0.3 && color.b < 0.3) {
              hitObject = 'building';
            } else if (color.g > 0.5 && color.r < 0.5) {
              hitObject = 'tree';
            } else if (color.r < 0.5 && color.g > 0.4 && color.b < 0.4) {
              hitObject = 'ground';
            } else {
              hitObject = 'object';
            }
          }
        }
      }

      // Update ray line - lines are positioned relative to the group (drone position)
      const line = rayLinesRef.current[i];
      if (line) {
        const positions = line.geometry.attributes.position.array as Float32Array;
        // Start point (at drone center, relative to group)
        positions[0] = 0;
        positions[1] = 0;
        positions[2] = 0;
        // End point (relative to drone position)
        const endPoint = direction.clone().multiplyScalar(distance);
        positions[3] = endPoint.x;
        positions[4] = endPoint.y;
        positions[5] = endPoint.z;
        line.geometry.attributes.position.needsUpdate = true;

        // Make line visible only if enabled
        line.visible = enabled;
      }

      // Update hit dot - position relative to drone
      const dot = hitDotsRef.current[i];
      if (dot && distance < maxRange) {
        // Position dot relative to group origin (drone center)
        const dotPosition = direction.clone().multiplyScalar(distance);
        dot.position.copy(dotPosition);
        dot.visible = enabled;
      } else if (dot) {
        dot.visible = false;
      }

      // Store reading
      readings.push({
        angle,
        distance,
        hitPoint: hitPoint.clone(),
        hitObject
      });
    }

    // Update parent with readings
    onReadingsUpdate(readings);
  });

  return (
    <group ref={groupRef} name="lidar-system">
      {/* LiDAR sensor housing */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1]} />
        <meshStandardMaterial 
          color="#222222" 
          emissive={enabled ? "#004400" : "#000000"}
          emissiveIntensity={enabled ? 0.3 : 0}
        />
      </mesh>
      
      {/* LiDAR spinning element */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02]} />
        <meshStandardMaterial 
          color={enabled ? "#00ff00" : "#333333"}
          emissive={enabled ? "#00ff00" : "#000000"}
          emissiveIntensity={enabled ? 0.5 : 0}
        />
      </mesh>
    </group>
  );
};
