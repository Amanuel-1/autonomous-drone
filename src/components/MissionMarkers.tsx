import React from 'react';
import { Vector3 } from 'three';

interface MissionMarkersProps {
  startPosition: Vector3;
  targetPosition: Vector3;
  missionCompleted: boolean;
}

export const MissionMarkers: React.FC<MissionMarkersProps> = ({
  startPosition,
  targetPosition,
  missionCompleted
}) => {
  return (
    <>
      {/* Start Position Marker */}
      <group position={[startPosition.x, startPosition.y + 0.1, startPosition.z]}>
        {/* Gray platform for start */}
        <mesh>
          <cylinderGeometry args={[2, 2, 0.2, 16]} />
          <meshStandardMaterial color="#666666" transparent opacity={0.7} />
        </mesh>
        {/* Start flag */}
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[0.1, 4, 0.1]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
        <mesh position={[1, 3.5, 0]}>
          <planeGeometry args={[2, 1]} />
          <meshStandardMaterial color="#888888" side={2} />
        </mesh>
        {/* Start text */}
        <mesh position={[0, 5, 0]}>
          <planeGeometry args={[3, 1]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Target Position Marker */}
      <group position={[targetPosition.x, targetPosition.y + 0.1, targetPosition.z]}>
        {/* Gray platform for target */}
        <mesh>
          <cylinderGeometry args={[3, 3, 0.3, 16]} />
          <meshStandardMaterial
            color={missionCompleted ? "#aaaaaa" : "#777777"}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Animated rings for target */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.5, 4, 32]} />
          <meshStandardMaterial
            color={missionCompleted ? "#999999" : "#666666"}
            transparent
            opacity={0.6}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[4.5, 5, 32]} />
          <meshStandardMaterial
            color={missionCompleted ? "#888888" : "#555555"}
            transparent
            opacity={0.4}
          />
        </mesh>
        
        {/* Target flag */}
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[0.15, 6, 0.15]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[1.5, 4.5, 0]}>
          <planeGeometry args={[3, 1.5]} />
          <meshStandardMaterial
            color={missionCompleted ? "#aaaaaa" : "#777777"}
            side={2}
          />
        </mesh>

        {/* Success indicator */}
        {missionCompleted && (
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#999999" emissive="#666666" />
          </mesh>
        )}
      </group>

      {/* Distance line between start and target */}
      <group>
        <mesh 
          position={[
            (startPosition.x + targetPosition.x) / 2,
            Math.max(startPosition.y, targetPosition.y) + 1,
            (startPosition.z + targetPosition.z) / 2
          ]}
          lookAt={targetPosition}
        >
          <boxGeometry args={[0.1, 0.1, startPosition.distanceTo(targetPosition)]} />
          <meshStandardMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      </group>

      {/* Ambient lighting for markers */}
      <ambientLight intensity={0.3} />
      <pointLight
        position={[targetPosition.x, targetPosition.y + 10, targetPosition.z]}
        color={missionCompleted ? "#aaaaaa" : "#888888"}
        intensity={0.5}
        distance={20}
      />
      <pointLight
        position={[startPosition.x, startPosition.y + 10, startPosition.z]}
        color="#999999"
        intensity={0.3}
        distance={15}
      />
    </>
  );
};
