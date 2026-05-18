import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface SplashScreenProps {
  onComplete: () => void;
}

interface RealisticBirdProps {
  onLand: () => void;
  isMobile: boolean;
  onLoaded: () => void;
}

const storkUrl = 'https://raw.githubusercontent.com/Mobeen-2024/Hisaab-Kitaab/main/public/Stork.glb';

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

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasLanded, setHasLanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const [mountTime] = useState(() => Date.now());

  // Defer preloading the dashboard component until after the bird has landed
  // to completely avoid main thread blocking and lag spikes during the flight animation!
  useEffect(() => {
    if (hasLanded) {
      import('./DashboardWrapper').catch(() => { });
    }
  }, [hasLanded]);

  // Handle responsive layout safely for SSR/Hydration
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Initial check
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ultimate Failsafe: Guarantee transition to dashboard after 6 seconds
  // Empty dependency array ensures this timer NEVER resets even if App.tsx re-renders.
  useEffect(() => {
    const ultimateTimer = setTimeout(() => {
      console.log("[SplashScreen] Ultimate Failsafe Triggered!");
      onComplete();
    }, 6000);
    return () => clearTimeout(ultimateTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Forcefully call onComplete 600ms after we start the fade out, bypassing AnimatePresence bugs
  useEffect(() => {
    if (!isVisible) {
      const exitTimer = setTimeout(() => {
        console.log("[SplashScreen] Force exit timer triggered!");
        onComplete();
      }, 600);
      return () => clearTimeout(exitTimer);
    }
  }, [isVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety fallback: If 3D assets fail to load or hang due to network issues
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isModelLoaded) setIsModelLoaded(true);
    }, 3000);
    return () => clearTimeout(safetyTimer);
  }, [isModelLoaded]);

  // Manage splash screen lifecycle, ensuring model is loaded before starting the final timer
  useEffect(() => {
    if (!isModelLoaded) return;

    const elapsed = Date.now() - mountTime;
    // Ensure splash shows for at least 4 seconds, but give at least 1 second after model loads
    const remainingTime = Math.max(4000 - elapsed, 1000);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [isModelLoaded, mountTime]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
          style={{ perspective: "1200px", position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          role="presentation"
          aria-hidden="true"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #3B82F6 1px, transparent 0)`,
                backgroundSize: '40px 40px',
              }}
            />
            <motion.div
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,_rgba(37,99,235,0.15)_0%,_rgba(0,0,0,0)_70%)]"
            />
          </div>

          {/* 3D Canvas Overlay */}
          <div className="absolute inset-0 z-[110] pointer-events-none overflow-hidden">
            <Canvas
              camera={{ position: [0, 0, 10], fov: 50 }}
              dpr={[1, 1.5]}
              gl={{ alpha: true, antialias: false, stencil: false, powerPreference: "high-performance" }}
            >
              <ambientLight intensity={1.5} />
              <pointLight position={[10, 10, 10]} intensity={4} color="#93C5FD" />
              <directionalLight position={[-5, 5, 2]} intensity={1.5} color="#FFFFFF" />
              <React.Suspense fallback={null}>
                <RealisticBird
                  isMobile={isMobile}
                  onLand={() => setHasLanded(true)}
                  onLoaded={() => setIsModelLoaded(true)}
                />
              </React.Suspense>
            </Canvas>
          </div>

          {/* 3D Logo Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, rotateY: -35, rotateX: 15, z: -100 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0, rotateX: 0, z: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center z-10 -translate-y-[10vh] md:-translate-y-[15vh]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
              {/* Logo Glow Layer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(circle,_rgba(59,130,246,0.4)_0%,_rgba(0,0,0,0)_70%)]"
                style={{ transform: "translateZ(-40px)" }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute inset-[-20%] bg-[radial-gradient(circle,_rgba(96,165,250,0.2)_0%,_rgba(0,0,0,0)_70%)]"
                style={{ transform: "translateZ(-20px)" }}
              />

              {/* Actual Logo SVG */}
              <motion.div
                className="relative z-10 w-24 h-24 md:w-40 md:h-40"
                style={{ transform: "translateZ(50px)" }}
                animate={{ y: [0, -8, 0], rotateZ: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                  <path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="#1E3A8A"
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.2"
                  />
                  <motion.path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="url(#logoGradient3d)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.8, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient id="logoGradient3d" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#93C5FD" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </div>

            {/* Text with slight Z offset */}
            <div
              className="text-center mt-8"
              style={{ transformStyle: "preserve-3d" }}
            >
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white flex gap-3 justify-center drop-shadow-lg">
                <span className="text-blue-500">Hisaib</span>
                <span>Kitaib</span>
              </h1>

              <div
                className="mt-3 text-xl md:text-3xl text-blue-300/70 font-medium tracking-[0.3em]"
              >
                حساب کتاب
              </div>
            </div>
          </motion.div>

          {/* Creator Credits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-center z-20"
          >
            <p className="text-slate-500 text-[9px] md:text-[10px] font-semibold tracking-[0.3em] uppercase mb-1.5 opacity-80">
              Created & Designed By
            </p>
            <div className="flex items-center gap-3">
              <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-blue-500/50"></span>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 text-sm md:text-base font-black tracking-[0.4em] uppercase drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]">
                Mobeen
              </p>
              <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-purple-500/50"></span>
            </div>
          </motion.div>


        </motion.div>
      )}
    </AnimatePresence>
  );
}
