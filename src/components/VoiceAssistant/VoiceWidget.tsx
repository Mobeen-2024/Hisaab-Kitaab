import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Send, Sparkles, Volume2, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { useVoiceAssistant } from '../../contexts/VoiceAssistantContext';

export const VoiceWidget: React.FC = () => {
  const {
    state,
    isRecording,
    audioLevel,
    activeSessionText,
    error,
    startSession,
    stopSession,
    sendTextMessage,
  } = useVoiceAssistant();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to bottom when new messages or streaming text updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSessionText]);

  // Open the panel automatically when starting a session
  useEffect(() => {
    if (state !== 'idle') {
      setIsOpen(true);
    }
  }, [state]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleStartVoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await startSession();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSession();
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendTextMessage(inputText);
    setInputText('');
  };

  // Compute scale/pulse based on real-time microphone audio level
  const pulseScale = isRecording ? 1 + (audioLevel / 200) : 1;

  return (
    <div className="fixed bottom-24 right-4 md:right-8 z-50 flex flex-col items-end">
      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[480px] bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Hisaab-Kitaab Voice</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${
                      state === 'listening' ? 'bg-emerald-500 animate-pulse' :
                      state === 'connecting' || state === 'processing' ? 'bg-amber-500' :
                      state === 'speaking' ? 'bg-indigo-500 animate-pulse' :
                      state === 'error' ? 'bg-red-500' : 'bg-zinc-500'
                    }`} />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">
                      {state === 'idle' ? 'Offline' : state}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleOpen}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages / Live Transcription area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!activeSessionText && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">Start speaking to automate bookkeeping</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
                    "Add $25 expense for lunch" or "Fill form from invoice details"
                  </p>
                </div>
              )}

              {/* Real-time Streaming Transcript */}
              {activeSessionText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-2xl rounded-bl-none bg-zinc-900/80 border border-indigo-500/30 text-indigo-200 text-sm flex items-start gap-2">
                    <Volume2 className="w-4 h-4 mt-0.5 animate-pulse flex-shrink-0 text-indigo-400" />
                    <span>{activeSessionText}</span>
                  </div>
                </div>
              )}

              {/* State feedback visuals */}
              {state === 'connecting' && (
                <div className="flex items-center gap-2 text-zinc-400 justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-xs">Establishing secure connection...</span>
                </div>
              )}

              {state === 'processing' && (
                <div className="flex items-center gap-2 text-indigo-400 justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Executing transaction automation...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Error: </span>
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Controls / Inputs */}
            <div className="p-4 border-t border-white/10 bg-zinc-950">
              {/* Voice Pulse bar when listening */}
              {state === 'listening' && (
                <div className="h-6 flex items-center justify-center gap-1 mb-3">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isRecording ? [4, Math.max(4, audioLevel * 0.2), 4] : 4,
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.5 + i * 0.08,
                      }}
                      className="w-1 bg-indigo-500 rounded-full"
                    />
                  ))}
                  <span className="text-[10px] text-zinc-400 ml-2 font-medium">Listening...</span>
                </div>
              )}

              <form onSubmit={handleSendText} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message or speak..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={state === 'connecting'}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500 disabled:opacity-50"
                />
                
                {state === 'listening' || state === 'speaking' ? (
                  <button
                    type="button"
                    onClick={handleStopVoice}
                    className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors shadow-lg flex items-center justify-center"
                  >
                    <MicOff className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartVoice}
                    disabled={state === 'connecting'}
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg flex items-center justify-center disabled:opacity-50"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggleOpen}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          state === 'listening'
            ? 'bg-emerald-600 border border-emerald-500 text-white'
            : state === 'speaking'
            ? 'bg-indigo-600 border border-indigo-500 text-white animate-pulse'
            : state === 'connecting' || state === 'processing'
            ? 'bg-amber-600 border border-amber-500 text-white'
            : 'bg-zinc-950 border border-white/10 hover:border-indigo-500 text-indigo-400 hover:text-indigo-300'
        }`}
        style={{
          scale: pulseScale,
        }}
      >
        <AnimatePresence mode="wait">
          {state === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Mic className="w-6 h-6 animate-pulse" />
            </motion.div>
          ) : state === 'connecting' || state === 'processing' ? (
            <motion.div
              key="connecting"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};
