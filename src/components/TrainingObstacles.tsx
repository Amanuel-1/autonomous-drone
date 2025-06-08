import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { TrainingObstacle } from '../types/simulation';
import { TrainingObstacleGenerator } from '../utils/trainingObstacles';

interface TrainingObstaclesProps {
  obstacles: TrainingObstacle[];
}

export const TrainingObstacles: React.FC<TrainingObstaclesProps> = ({ obstacles }) => {
  const groupRef = useRef<any>();

  // Update moving obstacles
  useFrame((state, delta) => {
    TrainingObstacleGenerator.updateMovingObstacles(obstacles, delta);
  });

  return (
    <group ref={groupRef}>
      {obstacles.map((obstacle) => (
        <ObstacleComponent key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
};

interface ObstacleComponentProps {
  obstacle: TrainingObstacle;
}

const ObstacleComponent: React.FC<ObstacleComponentProps> = ({ obstacle }) => {
  const meshRef = useRef<Mesh>(null);

  // Update position and rotation for moving obstacles
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(obstacle.position);
      meshRef.current.rotation.setFromVector3(obstacle.rotation);
    }
  }, [obstacle.position, obstacle.rotation]);

  const renderObstacle = () => {
    switch (obstacle.type) {
      case 'gate':
        return (
          <group position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            {/* Gate posts */}
            <mesh position={[-obstacle.size.x/2, 0, 0]}>
              <boxGeometry args={[1, obstacle.size.y, obstacle.size.z]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
            <mesh position={[obstacle.size.x/2, 0, 0]}>
              <boxGeometry args={[1, obstacle.size.y, obstacle.size.z]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
            {/* Gate top */}
            <mesh position={[0, obstacle.size.y/2, 0]}>
              <boxGeometry args={[obstacle.size.x, 1, obstacle.size.z]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
          </group>
        );

      case 'floating_ring':
        return (
          <mesh 
            ref={meshRef}
            position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}
            rotation={[obstacle.rotation.x, obstacle.rotation.y, obstacle.rotation.z]}
          >
            <torusGeometry args={[obstacle.properties?.ringRadius || 3, 0.5, 8, 16]} />
            <meshStandardMaterial 
              color={obstacle.color} 
              transparent 
              opacity={0.8}
              emissive={obstacle.color}
              emissiveIntensity={0.2}
            />
          </mesh>
        );

      case 'tunnel':
        return (
          <group position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            {/* Tunnel walls */}
            <mesh position={[0, obstacle.size.y/4, -obstacle.size.z/2]}>
              <boxGeometry args={[obstacle.size.x, obstacle.size.y/2, 1]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
            <mesh position={[0, obstacle.size.y/4, obstacle.size.z/2]}>
              <boxGeometry args={[obstacle.size.x, obstacle.size.y/2, 1]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
            {/* Tunnel top */}
            <mesh position={[0, obstacle.size.y/2, 0]}>
              <boxGeometry args={[obstacle.size.x, 1, obstacle.size.z]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
          </group>
        );

      case 'tower':
        return (
          <mesh position={[obstacle.position.x, obstacle.size.y/2, obstacle.position.z]}>
            <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
            <meshStandardMaterial color={obstacle.color} />
          </mesh>
        );

      case 'narrow_passage':
        return (
          <group position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            {/* Passage walls */}
            <mesh position={[0, 0, -obstacle.size.z/2 - 2]}>
              <boxGeometry args={[obstacle.size.x, obstacle.size.y, 2]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
            <mesh position={[0, 0, obstacle.size.z/2 + 2]}>
              <boxGeometry args={[obstacle.size.x, obstacle.size.y, 2]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
          </group>
        );

      case 'wind_zone':
        return (
          <mesh position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
            <meshStandardMaterial 
              color={obstacle.color} 
              transparent 
              opacity={0.3}
              wireframe
            />
          </mesh>
        );

      case 'hole':
        return (
          <mesh position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            <cylinderGeometry args={[obstacle.size.x/2, obstacle.size.x/2, obstacle.size.y, 16]} />
            <meshStandardMaterial color={obstacle.color} />
          </mesh>
        );

      case 'maze_wall':
        return (
          <mesh position={[obstacle.position.x, obstacle.size.y/2, obstacle.position.z]}>
            <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
            <meshStandardMaterial color={obstacle.color} />
          </mesh>
        );

      case 'moving_platform':
        return (
          <mesh 
            ref={meshRef}
            position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}
          >
            <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
            <meshStandardMaterial 
              color={obstacle.color}
              emissive={obstacle.color}
              emissiveIntensity={0.1}
            />
          </mesh>
        );

      case 'pendulum':
        return (
          <group position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            {/* Pendulum anchor */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
            {/* Pendulum arm */}
            <mesh 
              ref={meshRef}
              position={[0, -(obstacle.properties?.pendulumLength || 8)/2, 0]}
              rotation={[0, 0, obstacle.rotation.z]}
            >
              <boxGeometry args={[0.2, obstacle.properties?.pendulumLength || 8, 0.2]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
            {/* Pendulum weight */}
            <mesh 
              position={[
                Math.sin(obstacle.rotation.z) * (obstacle.properties?.pendulumLength || 8),
                -(obstacle.properties?.pendulumLength || 8) + Math.cos(obstacle.rotation.z) * (obstacle.properties?.pendulumLength || 8),
                0
              ]}
            >
              <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
              <meshStandardMaterial color={obstacle.color} />
            </mesh>
          </group>
        );

      default:
        return (
          <mesh position={[obstacle.position.x, obstacle.position.y, obstacle.position.z]}>
            <boxGeometry args={[obstacle.size.x, obstacle.size.y, obstacle.size.z]} />
            <meshStandardMaterial color={obstacle.color} />
          </mesh>
        );
    }
  };

  return <>{renderObstacle()}</>;
};

// Particle effects for wind zones
export const WindZoneEffects: React.FC<{ obstacles: TrainingObstacle[] }> = ({ obstacles }) => {
  const windZones = obstacles.filter(obs => obs.type === 'wind_zone');
  
  return (
    <>
      {windZones.map((zone) => (
        <group key={`wind-${zone.id}`} position={[zone.position.x, zone.position.y, zone.position.z]}>
          {/* Wind particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * zone.size.x,
                (Math.random() - 0.5) * zone.size.y,
                (Math.random() - 0.5) * zone.size.z
              ]}
            >
              <sphereGeometry args={[0.1, 4, 4]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

// Lighting effects for obstacles
export const ObstacleLighting: React.FC<{ obstacles: TrainingObstacle[] }> = ({ obstacles }) => {
  return (
    <>
      {obstacles.map((obstacle) => {
        if (obstacle.type === 'floating_ring' || obstacle.type === 'gate') {
          return (
            <pointLight
              key={`light-${obstacle.id}`}
              position={[obstacle.position.x, obstacle.position.y + 2, obstacle.position.z]}
              color={obstacle.color}
              intensity={0.5}
              distance={10}
            />
          );
        }
        return null;
      })}
    </>
  );
};
