'use client';

import React from 'react';
import { Vector3 } from 'three';
import { Building, Tree } from '../types/simulation';

interface EnvironmentProps {
  buildings: Building[];
  skyscrapers?: Building[];
  denseTrees?: Tree[];
  groundSize: number;
  trees: Tree[];
}

// Generate trees once and reuse them
export const generateTrees = (groundSize: number): Tree[] => {
  return Array.from({ length: 8 }, (_, i) => {
    const x = (Math.random() - 0.5) * groundSize * 0.9;
    const z = (Math.random() - 0.5) * groundSize * 0.9;
    const height = Math.random() * 3 + 2;
    const radius = 1.5; // Tree foliage radius

    return {
      id: `tree-${i}`,
      position: new Vector3(x, height / 2, z),
      height,
      radius
    };
  });
};

export const defaultTrees = generateTrees(100); // Generate trees once outside component

export const Environment: React.FC<EnvironmentProps> = ({
  buildings,
  skyscrapers = [],
  denseTrees = [],
  groundSize,
  trees
}) => {
  return (
    <group>
      {/* Ground plane */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[groundSize, 1, groundSize]} />
        <meshStandardMaterial color="#4a5d23" />
      </mesh>

      {/* Grid lines for reference */}
      <gridHelper args={[groundSize, 20, '#666666', '#444444']} position={[0, 0, 0]} />

      {/* Regular Buildings */}
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

      {/* Skyscrapers */}
      {skyscrapers.map((skyscraper) => (
        <group key={skyscraper.id}>
          {/* Main skyscraper structure */}
          <mesh
            position={[skyscraper.position.x, skyscraper.position.y, skyscraper.position.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[skyscraper.size.x, skyscraper.size.y, skyscraper.size.z]} />
            <meshStandardMaterial
              color={skyscraper.color}
              metalness={0.3}
              roughness={0.1}
            />
          </mesh>

          {/* Skyscraper details - windows */}
          <mesh
            position={[
              skyscraper.position.x,
              skyscraper.position.y,
              skyscraper.position.z + skyscraper.size.z / 2 + 0.1
            ]}
          >
            <planeGeometry args={[skyscraper.size.x * 0.9, skyscraper.size.y * 0.9]} />
            <meshStandardMaterial
              color="#87CEEB"
              transparent
              opacity={0.7}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>

          {/* Antenna/spire for very tall buildings */}
          {skyscraper.size.y > 80 && (
            <mesh
              position={[
                skyscraper.position.x,
                skyscraper.position.y + skyscraper.size.y / 2 + 5,
                skyscraper.position.z
              ]}
            >
              <cylinderGeometry args={[0.2, 0.2, 10]} />
              <meshStandardMaterial color="#FF0000" />
            </mesh>
          )}
        </group>
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

      {/* Regular Trees */}
      {trees.map((tree) => (
        <group key={tree.id} position={[tree.position.x, 0, tree.position.z]}>
          {/* Tree trunk */}
          <mesh position={[0, tree.height / 2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, tree.height]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* Tree foliage */}
          <mesh position={[0, tree.height + 1, 0]}>
            <sphereGeometry args={[tree.radius]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}

      {/* Dense Forest Trees */}
      {denseTrees.map((tree) => {
        // Determine tree type based on height for varied appearance
        const isLargeTree = tree.height > 20;
        const isMediumTree = tree.height > 10 && tree.height <= 20;

        const trunkRadius = isLargeTree ? 0.6 : isMediumTree ? 0.4 : 0.25;
        const trunkColor = isLargeTree ? "#654321" : "#8B4513";
        const foliageColor = isLargeTree ? "#006400" : isMediumTree ? "#32CD32" : "#228B22";

        return (
          <group key={tree.id} position={[tree.position.x, 0, tree.position.z]}>
            {/* Tree trunk */}
            <mesh position={[0, tree.height / 2, 0]} castShadow>
              <cylinderGeometry args={[trunkRadius * 0.8, trunkRadius, tree.height]} />
              <meshStandardMaterial color={trunkColor} />
            </mesh>

            {/* Main foliage */}
            <mesh position={[0, tree.height + tree.radius / 2, 0]} castShadow>
              <sphereGeometry args={[tree.radius, 8, 6]} />
              <meshStandardMaterial color={foliageColor} />
            </mesh>

            {/* Additional foliage layers for large trees */}
            {isLargeTree && (
              <>
                <mesh position={[0, tree.height - tree.radius / 3, 0]} castShadow>
                  <sphereGeometry args={[tree.radius * 0.8, 8, 6]} />
                  <meshStandardMaterial color={foliageColor} />
                </mesh>
                <mesh position={[0, tree.height + tree.radius * 1.2, 0]} castShadow>
                  <sphereGeometry args={[tree.radius * 0.6, 8, 6]} />
                  <meshStandardMaterial color={foliageColor} />
                </mesh>
              </>
            )}

            {/* Medium trees get one extra layer */}
            {isMediumTree && (
              <mesh position={[0, tree.height - tree.radius / 4, 0]} castShadow>
                <sphereGeometry args={[tree.radius * 0.7, 8, 6]} />
                <meshStandardMaterial color={foliageColor} />
              </mesh>
            )}
          </group>
        );
      })}

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
