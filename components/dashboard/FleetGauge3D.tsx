'use client';

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Segment {
  status: string;
  count: number;
  color: string;
}

interface GaugeProps {
  utilization: number;
  segments: Segment[];
}

function DonutSegments({ segments }: { segments: Segment[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  const meshes: React.ReactNode[] = [];
  let currentAngle = -Math.PI / 2;

  segments.forEach((seg, i) => {
    if (seg.count === 0) return;
    const angle = (seg.count / total) * Math.PI * 2;
    const geometry = new THREE.TorusGeometry(1.8, 0.55, 12, 64, angle);
    meshes.push(
      <mesh
        key={seg.status}
        ref={undefined}
        geometry={geometry}
        rotation={[0, 0, currentAngle]}
        position={[0, 0, i * 0.01]}
      >
        <meshStandardMaterial
          color={seg.color}
          roughness={0.2}
          metalness={0.4}
          emissive={seg.color}
          emissiveIntensity={0.12}
        />
      </mesh>
    );
    currentAngle += angle;
  });

  return <group ref={groupRef}>{meshes}</group>;
}

function UtilizationText({ utilization }: { utilization: number }) {
  return (
    <>
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.5}
        color="#f0f0ff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {utilization}%
      </Text>
      <Text
        position={[0, -0.25, 0]}
        fontSize={0.18}
        color="#9090b0"
        anchorX="center"
        anchorY="middle"
      >
        UTILIZATION
      </Text>
    </>
  );
}

export default function FleetGauge3D({ utilization, segments }: GaugeProps) {
  return (
    <div>
      <div style={{ height: 200 }} className="canvas-wrapper">
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 40 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#f59e0b" />
          <pointLight position={[-5, -5, -5]} intensity={0.4} color="#3b82f6" />
          <Suspense fallback={null}>
            <DonutSegments segments={segments} />
            <UtilizationText utilization={utilization} />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.8}
          />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {seg.status}
            </span>
            <span className="text-xs ml-auto font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
