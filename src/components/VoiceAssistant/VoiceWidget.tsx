import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Send, Sparkles, Volume2, Loader2, MessageSquare, AlertCircle, User } from 'lucide-react';
import { useVoiceAssistant } from '../../contexts/VoiceAssistantContext';

export const VoiceWidget: React.FC = () => {
  const {
    state,
    isRecording,
    audioLevel,
    messages,
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
  }, [messages]);

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

  // Compute scale/pulse based on real-time microphone audio level for the floating orb
  const pulseScale = isRecording ? 1 + (audioLevel / 250) : 1;

  return (
    <div className="fixed bottom-24 right-4 md:right-8 z-50 flex flex-col items-end">
      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-zinc-950/85 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden text-zinc-100"
          >
            {/* Glassmorphic Gradient Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md relative overflow-hidden">
              {/* Subtle ambient light behind header */}
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-wide bg-gradient-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">Voice Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${
                      state === 'listening' ? 'bg-emerald-500 animate-pulse' :
                      state === 'connecting' || state === 'processing' ? 'bg-amber-500 animate-pulse' :
                      state === 'speaking' ? 'bg-indigo-500 animate-pulse' :
                      state === 'error' ? 'bg-red-500' : 'bg-zinc-500'
                    }`} />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                      {state === 'idle' ? 'Offline' : state}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleOpen}
                className="p-2 hover:bg-white/5 active:bg-white/10 rounded-full transition-all text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 text-zinc-400 shadow-inner">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 tracking-wide">Start speaking to automate</p>
                  <p className="text-xs text-zinc-500 mt-2 max-w-[240px] leading-relaxed">
                    "I spent 500 PKR on lunch" or "Add groceries of 1200 as expense"
                  </p>
                </div>
              )}

              {/* Renders Chat Bubbles */}
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] px-4 py-3 rounded-2xl shadow-md flex items-start gap-2.5 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none border border-indigo-500/20'
                          : 'bg-zinc-900/60 backdrop-blur-sm text-zinc-200 rounded-bl-none border border-white/5'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <Sparkles className="w-4 h-4 mt-0.5 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 mt-0.5 text-white/70 flex-shrink-0" />
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap tracking-wide font-medium">
                        {msg.text || (msg.isStreaming && (
                          <span className="flex items-center gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* State feedback visuals */}
              {state === 'connecting' && (
                <div className="flex items-center gap-2.5 text-zinc-400 justify-center py-3 bg-white/5 border border-white/5 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-xs font-semibold tracking-wide">Connecting to Gemini...</span>
                </div>
              )}

              {state === 'processing' && (
                <div className="flex items-center gap-2.5 text-indigo-400 justify-center py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-semibold tracking-wide">Executing transaction automation...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2 text-red-400 text-xs shadow-inner">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error: </span>
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Siri-like Waveform & Controls */}
            <div className="p-4 border-t border-white/10 bg-zinc-950 backdrop-blur-md relative overflow-hidden">
              {/* Voice Waveform animation when speaking or listening */}
              {(state === 'listening' || state === 'speaking') && (
                <div className="h-8 flex items-center justify-center gap-1.5 mb-4">
                  {[...Array(9)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isRecording 
                          ? [6, Math.max(6, audioLevel * (0.15 + (i % 4) * 0.05)), 6] 
                          : state === 'speaking' 
                          ? [6, Math.max(6, Math.random() * 24), 6]
                          : 6,
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.4 + i * 0.05,
                      }}
                      className={`w-1 rounded-full ${
                        state === 'listening' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-indigo-500 shadow-lg shadow-indigo-500/20'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-zinc-400 ml-3 font-bold uppercase tracking-widest">
                    {state === 'listening' ? 'Listening...' : 'Speaking...'}
                  </span>
                </div>
              )}

              <form onSubmit={handleSendText} className="flex gap-2 relative z-10">
                <input
                  type="text"
                  placeholder={state === 'listening' ? "Speak or type..." : "Start session to speak/chat..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={state === 'connecting' || state === 'processing'}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500 disabled:opacity-50 transition-all font-medium"
                />
                
                {state === 'listening' || state === 'speaking' ? (
                  <button
                    type="button"
                    onClick={handleStopVoice}
                    className="p-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-2xl transition-all shadow-lg flex items-center justify-center flex-shrink-0"
                  >
                    <MicOff className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartVoice}
                    disabled={state === 'connecting' || state === 'processing'}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl transition-all shadow-lg flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                  >
                    <Mic className="w-4 h-4 animate-pulse" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center flex-shrink-0"
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
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleToggleOpen}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative ${
          state === 'listening'
            ? 'bg-emerald-600 border border-emerald-500 text-white shadow-emerald-600/30'
            : state === 'speaking'
            ? 'bg-indigo-600 border border-indigo-500 text-white shadow-indigo-600/30 animate-pulse'
            : state === 'connecting' || state === 'processing'
            ? 'bg-amber-600 border border-amber-500 text-white shadow-amber-600/30'
            : 'bg-zinc-950 border border-white/10 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300 shadow-indigo-500/10'
        }`}
        style={{
          scale: pulseScale,
        }}
      >
        <AnimatePresence mode="wait">
          {state === 'listening' ? (
            <motion.div
              key="listening"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ duration: 0.2 }}
            >
              <Mic className="w-6 h-6 animate-pulse" />
            </motion.div>
          ) : state === 'connecting' || state === 'processing' ? (
            <motion.div
              key="connecting"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ scale: 0, rotate: 45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -45 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

