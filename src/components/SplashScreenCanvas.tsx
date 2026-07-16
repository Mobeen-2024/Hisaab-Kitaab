import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

interface RealisticBirdProps {
  onLand: () => void;
  isMobile: boolean;
  onLoaded: () => void;
}

// Load locally to support offline-first capability
const storkUrl = '/Stork.glb';

function RealisticBird({ onLand, isMobile, onLoaded }: RealisticBirdProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(storkUrl);
  const { actions } = useAnimations(animations, group);

  // Pre-allocate vectors to prevent massive Garbage Collection spikes in useFrame
  const vectors = useMemo(() => ({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    lookTarget: new THREE.Vector3()
  }), []);

  const progressRef = useRef(0);
  const landedRef = useRef(false);

  // Notify parent that the 3D model has fully loaded and mounted
  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      const action = actions[actionName];
      if (action) {
        action.play();
        action.timeScale = 1.0;
      }
    }
  }, [actions]);

  // Adjust positions to ensure the bird appears correctly
  const startPos = useMemo(() =>
    isMobile ? new THREE.Vector3(2.0, 3.0, 4) : new THREE.Vector3(2.5, 2.8, 4),
    [isMobile]);

  const endPos = useMemo(() =>
    isMobile ? new THREE.Vector3(0.7, 0.9, 2) : new THREE.Vector3(1.8, 1.2, 2),
    [isMobile]);

  const controlPos = useMemo(() =>
    isMobile ? new THREE.Vector3(1.3, 1.9, 3) : new THREE.Vector3(2.5, 2.2, 3),
    [isMobile]);

  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(startPos, controlPos, endPos), [startPos, controlPos, endPos]);

  // Analytical derivative vectors for Quadratic Bezier Curve to achieve true 100% allocation-free tangents.
  // This bypasses Three.js's internal getTangent() which internally allocates multiple Vector3 instances per frame.
  const segments = useMemo(() => ({
    v1: new THREE.Vector3().subVectors(controlPos, startPos),
    v2: new THREE.Vector3().subVectors(endPos, controlPos),
  }), [startPos, controlPos, endPos]);

  const birdScale = isMobile ? 0.008 : 0.012;

  useFrame((state, delta) => {
    if (!group.current) return;

    if (progressRef.current < 1) {
      // Cap delta to prevent massive jumps on lag spikes
      const safeDelta = Math.min(delta, 0.1);
      const speed = 0.5; // Takes ~2 seconds total
      progressRef.current = Math.min(progressRef.current + safeDelta * speed, 1);

      // Use pre-allocated vectors to avoid memory allocation in hot loop
      curve.getPoint(progressRef.current, vectors.point);
      group.current.position.copy(vectors.point);

      if (progressRef.current < 1) {
        // Analytical tangent computation: B'(t) = 2*(1-t)*v1 + 2*t*v2
        const t = progressRef.current;
        vectors.tangent.copy(segments.v1)
          .multiplyScalar(2 * (1 - t))
          .addScaledVector(segments.v2, 2 * t)
          .normalize();

        vectors.lookTarget.copy(vectors.point).add(vectors.tangent);
        group.current.lookAt(vectors.lookTarget);
      }

      if (progressRef.current >= 1 && !landedRef.current) {
        landedRef.current = true;
        onLand();
        if (actions && Object.keys(actions).length > 0) {
          const action = actions[Object.keys(actions)[0]];
          if (action) action.timeScale = 0.3; // Slow down wings on landing
        }
      }
    } else {
      // Idle animation after landing
      group.current.position.y = endPos.y + Math.sin(state.clock.elapsedTime * 3.5) * 0.03;
      group.current.position.x = endPos.x + Math.sin(state.clock.elapsedTime * 1.2) * 0.015;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={birdScale} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}

useGLTF.preload(storkUrl);

interface SplashScreenCanvasProps {
  isMobile: boolean;
  onLand: () => void;
  onLoaded: () => void;
  dpr: number;
  setDpr: (dpr: number) => void;
}

export default function SplashScreenCanvas({ isMobile, onLand, onLoaded, dpr, setDpr }: SplashScreenCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={dpr}
      gl={{ alpha: true, antialias: false, stencil: false, powerPreference: "high-performance" }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1.0)} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={4} color="#93C5FD" />
      <directionalLight position={[-5, 5, 2]} intensity={1.5} color="#FFFFFF" />
      <React.Suspense fallback={null}>
        <RealisticBird
          isMobile={isMobile}
          onLand={onLand}
          onLoaded={onLoaded}
        />
      </React.Suspense>
    </Canvas>
  );
}
