import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // The total animation timeframe is supposed to be under 4 seconds.
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // 500ms fade out transition
    }, 3800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Snappy cubic bezier for easing
  const easing = [0.25, 1, 0.5, 1]; // Custom ease out
  const drawEasing = [0.83, 0, 0.17, 1]; // Exponential/Snappy

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F172A]"
          style={{
            background: 'radial-gradient(circle at top left, #1E293B, #0F172A), radial-gradient(circle at bottom right, #1E3A8A, #0F172A)'
          }}
        >
          {/* Logo Container */}
          <div className="relative flex flex-col items-center">
            {/* The Infinity/Flow Loop SVG */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: easing }}
              className="relative w-32 h-32 flex flex-col items-center justify-center"
            >
              <svg
                viewBox="0 0 100 50"
                className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10"
              >
                {/* Flow Path 2 (Background light stroke) */}
                <motion.path
                  d="M25,25 C25,11 40,11 50,25 C60,39 75,39 75,25 C75,11 60,11 50,25 C40,39 25,39 25,25 Z"
                  fill="none"
                  stroke="#1E3A8A" // Dark Blue
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2
                  }}
                />
                {/* Flow Path 1 (Foreground animates in) */}
                <motion.path
                  d="M25,25 C25,11 40,11 50,25 C60,39 75,39 75,25 C75,11 60,11 50,25 C40,39 25,39 25,25 Z"
                  fill="none"
                  stroke="#3B82F6" // Trust Blue
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: 1.5,
                    ease: drawEasing,
                    delay: 0.3
                  }}
                />
              </svg>
            </motion.div>

            {/* Typography */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4, ease: easing }}
              className="-mt-4 text-center z-10 relative"
            >
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white flex gap-1 justify-center relative">
                <span className="text-blue-500 tracking-tighter">Hisaab</span>
                <span className="tracking-tighter">Kitab</span>
              </h1>
              <motion.div 
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1, delay: 1.6 }}
                className="mt-2 text-base text-blue-400 font-medium tracking-wide"
              >
                حساب کتاب
              </motion.div>
            </motion.div>

            {/* Glowing orb behind logo to give it that "Polish" */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.2, scale: 1 }}
              transition={{ duration: 1.5, delay: 1.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+20px)] w-64 h-64 bg-blue-500 rounded-full blur-[80px] pointer-events-none"
            />
          </div>

          {/* Created By Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2, ease: easing }}
            className="absolute bottom-10 text-xs font-medium text-slate-500 tracking-widest uppercase"
          >
            Created by <span className="text-slate-300 font-bold">MOBEEN</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
