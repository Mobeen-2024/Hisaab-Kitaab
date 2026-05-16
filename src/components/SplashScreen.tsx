import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface SplashScreenProps {
  onComplete: () => void;
}

function RealisticBird({ onLand, isMobile }: { onLand: () => void; isMobile: boolean }) {
  const group = React.useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/Stork.glb');
  const { actions } = useAnimations(animations, group);

  // Use a ref for progress to avoid heavy re-renders in useFrame
  const progressRef = React.useRef(0);
  const landedRef = React.useRef(false);

  React.useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      const action = actions[actionName];
      if (action) {
        action.play();
        action.timeScale = 1.0;
      }
    }
  }, [actions]);

  // Adjust positions to ensure the bird appears almost immediately
  const startPos = React.useMemo(() =>
    isMobile ? new THREE.Vector3(2.0, 3.0, 4) : new THREE.Vector3(2.5, 2.8, 4),
    [isMobile]);

  const endPos = React.useMemo(() =>
    isMobile ? new THREE.Vector3(0.7, 0.9, 2) : new THREE.Vector3(1.8, 1.2, 2),
    [isMobile]);

  const controlPos = React.useMemo(() =>
    isMobile ? new THREE.Vector3(1.3, 1.9, 3) : new THREE.Vector3(2.5, 2.2, 3),
    [isMobile]);

  const curve = React.useMemo(() => new THREE.QuadraticBezierCurve3(startPos, controlPos, endPos), [startPos, controlPos, endPos]);

  const birdScale = isMobile ? 0.008 : 0.012;

  useFrame((state, delta) => {
    if (!group.current) return;

    if (progressRef.current < 1) {
      // Faster flight: 0.5 means it takes 2 seconds total
      const speed = 0.5;
      progressRef.current = Math.min(progressRef.current + delta * speed, 1);

      const point = curve.getPoint(progressRef.current);
      group.current.position.copy(point);

      if (progressRef.current < 1) {
        const tangent = curve.getTangent(progressRef.current);
        const lookTarget = point.clone().add(tangent);
        group.current.lookAt(lookTarget);
      }

      if (progressRef.current >= 1 && !landedRef.current) {
        landedRef.current = true;
        onLand();
        if (actions && Object.keys(actions).length > 0) {
          const action = actions[Object.keys(actions)[0]];
          if (action) {
            action.timeScale = 0.3; // Slow down wings on landing
          }
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

useGLTF.preload('/Stork.glb');

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasLanded, setHasLanded] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Easing presets
  const easing = [0.16, 1, 0.3, 1] as const;

  const textVariants = {
    hidden: { opacity: 0, y: 20, z: -20 },
    visible: { opacity: 1, y: 0, z: 20, transition: { duration: 0.8, delay: 0.8 } },
    bounce: {
      y: [0, 15, -2, 0],
      rotateX: [0, -15, 5, 0],
      z: 20,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 350, damping: 12 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
          style={{ perspective: "1200px", position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
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
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-600/10 rounded-full blur-[120px]"
            />
          </div>

          {/* 3D Canvas Overlay */}
          <div className="absolute inset-0 z-[110] pointer-events-none overflow-hidden">
            <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true, antialias: true, stencil: false }}>
              <ambientLight intensity={1.5} />
              <pointLight position={[10, 10, 10]} intensity={4} color="#93C5FD" />
              <React.Suspense fallback={<mesh position={[0, 0, 5]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={2} /></mesh>}>
                <Environment preset="city" />
                <RealisticBird isMobile={isMobile} onLand={() => setHasLanded(true)} />
              </React.Suspense>
            </Canvas>
          </div>

          {/* 3D Logo Container */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.7,
              rotateY: -35,
              rotateX: 15,
              z: -100
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateY: 0,
              rotateX: 0,
              z: 0
            }}
            transition={{
              duration: 1.5,
              ease: easing,
            }}
            className="relative flex flex-col items-center z-10 -translate-y-[10vh] md:-translate-y-[15vh]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
              {/* Logo Glow Layer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-blue-500/40 rounded-full blur-[60px] md:blur-[80px]"
                style={{ transform: "translateZ(-40px)" }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute inset-[-20%] bg-blue-400/20 rounded-full blur-[40px]"
                style={{ transform: "translateZ(-20px)" }}
              />

              {/* Actual Logo SVG */}
              <motion.div
                className="relative z-10 w-24 h-24 md:w-40 md:h-40"
                style={{ transform: "translateZ(50px)" }}
                animate={{
                  y: [0, -8, 0],
                  rotateZ: [0, 2, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
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
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate={hasLanded ? "bounce" : "visible"}
              className="text-center mt-8"
              style={{ transformStyle: "preserve-3d" }}
            >
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white flex gap-3 justify-center drop-shadow-lg">
                <span className="text-blue-500">Hisaab-</span>
                <span>Kitaab</span>
              </h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-3 text-xl md:text-3xl text-blue-300/70 font-medium tracking-[0.3em]"
              >
                حساب کتاب
              </motion.div>
            </motion.div>
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

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 4.5, ease: "easeInOut" }}
              className="h-full bg-blue-600 origin-left shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
