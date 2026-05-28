import { useState, useRef, useCallback } from 'react';

export interface UseAudioRecorderReturn {
  startRecording: (onChunk: (base64Chunk: string) => void) => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  audioLevel: number;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const onChunkRef = useRef<((base64Chunk: string) => void) | null>(null);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
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
    onChunkRef.current = null;
  }, []);

  const startRecording = useCallback(
    async (onChunk: (base64Chunk: string) => void) => {
      stopRecording();
      onChunkRef.current = onChunk;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;

        // Create AudioContext. Note: Live API prefers 16000Hz (16kHz).
        // If the browser supports setting sampleRate in AudioContextOptions, use it.
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({
          sampleRate: 16000, // Request 16kHz from browser if supported
        });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Buffer size 4096 is good balance between latency and processing load
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const inputSampleRate = audioContext.sampleRate;
        const targetSampleRate = 16000;

        processor.onaudioprocess = (e) => {
          if (!onChunkRef.current) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate audio level for UI visuals
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          // Normalized level between 0 and 100
          setAudioLevel(Math.min(100, Math.round(rms * 250)));

          // Downsample to 16000Hz if needed
          let resampledData: Float32Array;
          if (Math.abs(inputSampleRate - targetSampleRate) < 100) {
            resampledData = inputData;
          } else {
            // Linear downsampling
            const ratio = inputSampleRate / targetSampleRate;
            const newLength = Math.round(inputData.length / ratio);
            resampledData = new Float32Array(newLength);
            for (let i = 0; i < newLength; i++) {
              const arg = i * ratio;
              const index = Math.floor(arg);
              const weight = arg - index;
              const nextIndex = Math.min(inputData.length - 1, index + 1);
              resampledData[i] = inputData[index] * (1 - weight) + inputData[nextIndex] * weight;
            }
          }

          // Convert Float32 [-1.0, 1.0] to signed Int16 [-32768, 32767] PCM
          const pcmBuffer = new Int16Array(resampledData.length);
          for (let i = 0; i < resampledData.length; i++) {
            const s = Math.max(-1, Math.min(1, resampledData[i]));
            pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Convert Int16Array to base64
          const uint8Array = new Uint8Array(pcmBuffer.buffer);
          let binary = '';
          const len = uint8Array.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);

          if (base64) {
            onChunkRef.current(base64);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start audio recording:', err);
        stopRecording();
        throw err;
      }
    },
    [stopRecording]
  );

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
  };
}
