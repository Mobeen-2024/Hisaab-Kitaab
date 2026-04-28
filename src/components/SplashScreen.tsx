import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mouseX.set(clientX);
      mouseY.set(clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }, 4500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, [onComplete]);

  // Snappy cubic bezier for easing
  const easing = [0.16, 1, 0.3, 1] as const;
  const drawEasing = [0.22, 1, 0.36, 1] as const;

  // Background glow position
  const lightX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const lightY = useSpring(mouseY, { stiffness: 50, damping: 20 });

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
          {/* Dynamic Cursor Follow Glow */}
          <motion.div 
            className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0 hidden md:block"
            style={{
              x: lightX,
              y: lightY,
              translateX: '-50%',
              translateY: '-50%',
            }}
          />

          {/* Animated Background Mesh/Grid */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #3B82F6 1px, transparent 0)`,
                backgroundSize: '40px 40px',
              }}
            />
            
            {/* Massive Ambient Glows */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-gradient-to-tr from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-[150px]"
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
              {/* Core Glow */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                }}
                className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-indigo-500/30 rounded-full blur-[60px]"
              />
              
              {/* Intense Center Spot */}
              <div className="absolute w-12 h-12 bg-white/20 rounded-full blur-[20px] z-0" />

              {/* 3D Infinity Loop */}
              <motion.div
                animate={{ 
                  rotateY: [0, 15, -15, 0],
                  rotateX: [0, -10, 10, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-40 h-40"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_35px_rgba(59,130,246,0.8)]">
                  <motion.path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="#1E3A8A"
                    strokeWidth="10"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.path
                    d="M30,50 C30,35 45,35 50,50 C55,65 70,65 70,50 C70,35 55,35 50,50 C45,65 30,65 30,50 Z"
                    fill="none"
                    stroke="url(#blueGradientSplash)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: drawEasing, delay: 0.2 }}
                  />
                  <defs>
                    <linearGradient id="blueGradientSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#93C5FD" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Floating Particles around logo */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -40, 0],
                      x: [0, Math.sin(i) * 30, 0],
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 3,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut"
                    }}
                    className="absolute w-1.5 h-1.5 bg-blue-300 rounded-full blur-[1px] shadow-[0_0_10px_#60A5FA]"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                    }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Typography with Neon Glow */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 30 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, delay: 1.5, ease: easing }}
              className="text-center z-20 relative"
            >
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white flex gap-3 justify-center">
                <motion.span 
                  animate={{ 
                    textShadow: [
                      "0 0 20px rgba(59,130,246,0.3)",
                      "0 0 40px rgba(59,130,246,0.6)",
                      "0 0 20px rgba(59,130,246,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-blue-500 to-blue-700"
                >
                  Hisaab
                </motion.span>
                <motion.span
                  animate={{ 
                    textShadow: [
                      "0 0 20px rgba(255,255,255,0.1)",
                      "0 0 40px rgba(255,255,255,0.3)",
                      "0 0 20px rgba(255,255,255,0.1)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
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

