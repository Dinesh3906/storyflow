import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderOptions {
  onAudioChunk: (pcmBase64: string, rmsLevel: number) => void;
  sampleRate?: number;
  chunkDurationMs?: number;
}

export function useAudioRecorder({
  onAudioChunk,
  sampleRate = 16000,
  chunkDurationMs = 30,
}: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const pcmBufferRef = useRef<Int16Array[]>([]);

  // Downsample to 16kHz 16-bit PCM
  const downsampleTo16kPCM = (inputData: Float32Array, inputSampleRate: number): Int16Array => {
    if (inputSampleRate === sampleRate) {
      const output = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const sampleRateRatio = inputSampleRate / sampleRate;
    const newLength = Math.round(inputData.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputData.length; i++) {
        accum += inputData[i];
        count++;
      }
      const s = count > 0 ? Math.max(-1, Math.min(1, accum / count)) : 0;
      result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const calculateRMS = (buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    // Normalize to 0.0 - 1.0 range
    return Math.min(1, rms * 5);
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Buffer size 2048 at 44.1/48kHz produces ~40ms slices
      const bufferSize = 2048;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isPaused) return;

        const inputChannel = e.inputBuffer.getChannelData(0);
        const rms = calculateRMS(inputChannel);
        setMicLevel(rms);

        const pcm16 = downsampleTo16kPCM(inputChannel, audioCtx.sampleRate);

        // Convert Int16Array to base64
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const b64 = btoa(binary);

        onAudioChunk(b64, rms);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error('Audio recorder error:', err);
      setError(err.message || 'Could not access microphone.');
      setIsRecording(false);
    }
  }, [onAudioChunk, isPaused, sampleRate]);

  const pauseRecording = useCallback(() => {
    setIsPaused(true);
    setMicLevel(0);
  }, []);

  const resumeRecording = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopRecording = useCallback(() => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setMicLevel(0);
  }, []);

  return {
    isRecording,
    isPaused,
    micLevel,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
