import { useState, useRef, useCallback } from 'react';

// Extend window for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseAudioRecorderReturn {
  startRecording: (onTranscript: (text: string) => void) => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  audioLevel: number;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(
    async (onTranscript: (text: string) => void) => {
      stopRecording();
      
      try {
        // Setup MediaStream for audio level visualization
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzerRef.current = analyzer;
        
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        
        const updateAudioLevel = () => {
          if (!analyzerRef.current) return;
          analyzerRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // Scale average (0-255) to 0-100
          setAudioLevel(Math.min(100, Math.round((average / 255) * 150)));
          rafRef.current = requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();

        // Setup SpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error("SpeechRecognition not supported in this browser.");
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let lastFinalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let currentFinal = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentFinal += event.results[i][0].transcript;
            }
          }
          if (currentFinal && currentFinal !== lastFinalTranscript) {
            lastFinalTranscript = currentFinal;
            onTranscript(currentFinal);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };
        
        recognition.onend = () => {
          // If still marked as recording, auto-restart
          if (isRecording) {
             try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        
      } catch (err) {
        console.error('Failed to start audio recording:', err);
        stopRecording();
        throw err;
      }
    },
    [stopRecording, isRecording]
  );

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
  };
}
