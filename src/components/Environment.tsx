'use client';

import React from 'react';
import { Building } from '../types/simulation';

interface EnvironmentProps {
  buildings: Building[];
  groundSize: number;
}

// Generate trees once and reuse them
const generateTrees = (groundSize: number) => {
  return Array.from({ length: 15 }, (_, i) => {
    const x = (Math.random() - 0.5) * groundSize * 0.9;
    const z = (Math.random() - 0.5) * groundSize * 0.9;
    const height = Math.random() * 3 + 2;

    return {
      id: `tree-${i}`,
      x,
      z,
      height
    };
  });
};

const trees = generateTrees(100); // Generate trees once outside component

export const Environment: React.FC<EnvironmentProps> = ({ buildings, groundSize }) => {
  return (
    <group>
      {/* Ground plane */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[groundSize, 1, groundSize]} />
        <meshStandardMaterial color="#4a5d23" />
      </mesh>

      {/* Grid lines for reference */}
      <gridHelper args={[groundSize, 20, '#666666', '#444444']} position={[0, 0, 0]} />

      {/* Buildings */}
      {buildings.map((building) => (
        <mesh
          key={building.id}
          position={[building.position.x, building.position.y, building.position.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[building.size.x, building.size.y, building.size.z]} />
          <meshStandardMaterial color={building.color} />
        </mesh>
      ))}

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      
      {/* Directional light (sun) */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={2} />
      </mesh>

      {/* Some decorative elements */}
      {/* Trees */}
      {trees.map((tree) => (
        <group key={tree.id} position={[tree.x, 0, tree.z]}>
          {/* Tree trunk */}
          <mesh position={[0, tree.height / 2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, tree.height]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* Tree foliage */}
          <mesh position={[0, tree.height + 1, 0]}>
            <sphereGeometry args={[1.5]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}

      {/* Roads/paths */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[4, 0.02, groundSize]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[groundSize, 0.02, 4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Landing pad */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[5, 5, 0.02]} />
        <meshStandardMaterial color="#ffff00" />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[4, 4, 0.02]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};
