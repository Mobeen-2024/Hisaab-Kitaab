import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Slightly longer fade out for smoothness
    }, 4500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Snappy cubic bezier for easing
  const easing = [0.16, 1, 0.3, 1] as const;
  const drawEasing = [0.22, 1, 0.36, 1] as const;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)', transition: { duration: 0.8, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
          style={{
            perspective: '1000px',
          }}
        >
          {/* Animated Background Mesh/Grid */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #3B82F6 1px, transparent 0)`,
                backgroundSize: '40px 40px',
              }}
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -50, 0],
                y: [0, 50, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]"
            />
          </div>

          {/* Main 3D Logo Container */}
          <motion.div
            initial={{ opacity: 0, rotateX: -20, rotateY: 10, translateZ: -100 }}
            animate={{ opacity: 1, rotateX: 0, rotateY: 0, translateZ: 0 }}
            transition={{ duration: 1.2, ease: easing }}
            className="relative flex flex-col items-center z-10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* The Floating Logo Ring */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Back Glow */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.6, 0.4]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-blue-500/20 rounded-full blur-[40px]"
              />

              {/* 3D Infinity Loop */}
              <motion.div
                animate={{ 
                  rotateY: [0, 10, -10, 0],
                  rotateX: [0, -5, 5, 0],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-40 h-40"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]">
                  {/* Layered strokes for depth */}
                  <motion.path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="#1E3A8A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="url(#blueGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: drawEasing, delay: 0.2 }}
                  />
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Floating Particles around logo */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -20, 0],
                      x: [0, Math.sin(i) * 20, 0],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 3 + i,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeInOut"
                    }}
                    className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
                    style={{
                      top: `${30 + Math.random() * 40}%`,
                      left: `${30 + Math.random() * 40}%`,
                    }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Typography with Perspective */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, delay: 1.5, ease: easing }}
              className="text-center z-20 relative"
            >
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white flex gap-2 justify-center drop-shadow-2xl">
                <motion.span 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.8 }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600"
                >
                  Hisaab
                </motion.span>
                <motion.span
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.8 }}
                >
                  Kitab
                </motion.span>
              </h1>
              
              {/* Animated Urdu Text */}
              <motion.div 
                initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 1.2, delay: 2.2 }}
                className="mt-4 text-xl md:text-2xl text-blue-300/80 font-arabic tracking-[0.2em] font-medium"
              >
                حساب کتاب
              </motion.div>

              {/* Shimmering Line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 2.5, duration: 1.5, ease: easing }}
                className="h-[1px] w-32 mx-auto mt-6 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
              />
            </motion.div>
          </motion.div>

          {/* Footer - Created By */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 3, ease: easing }}
            className="absolute bottom-12 flex flex-col items-center gap-2"
          >
            <div className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase">
              Designed & Developed
            </div>
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 bg-slate-800" />
              <span className="text-sm font-black text-white tracking-widest uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                MOBEEN
              </span>
              <div className="h-[1px] w-8 bg-slate-800" />
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 3.5, delay: 0.5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-blue-600/50 w-full origin-left"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

