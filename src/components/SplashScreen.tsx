import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Easing presets
  const easing = [0.16, 1, 0.3, 1] as const;

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
            className="relative flex flex-col items-center z-10"
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
              initial={{ opacity: 0, y: 20, z: -20 }}
              animate={{ opacity: 1, y: 0, z: 20 }}
              transition={{ duration: 0.8, delay: 0.8 }}
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

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
              className="h-full bg-blue-600 origin-left shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
