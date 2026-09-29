import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderOptions {
  onAudioChunk: (pcmBase64: string, rmsLevel: number) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  language?: string;
  sampleRate?: number;
  chunkDurationMs?: number;
}

export function useAudioRecorder({
  onAudioChunk,
  onTranscript,
  language = 'auto',
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
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep fresh references to callbacks to avoid breaking memoized listeners
  const onAudioChunkRef = useRef(onAudioChunk);
  const onTranscriptRef = useRef(onTranscript);
  const languageRef = useRef(language);

  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Sync refs with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Map language code to browser speech recognition BCP-47 locale
  const getRecognitionLang = (lang: string): string => {
    switch (lang) {
      case 'te':
        return 'te-IN'; // Telugu
      case 'hi':
        return 'hi-IN'; // Hindi
      case 'ta':
        return 'ta-IN'; // Tamil
      case 'kn':
        return 'kn-IN'; // Kannada
      case 'bn':
        return 'bn-IN'; // Bengali
      case 'en':
        return 'en-US';
      default:
        return (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    }
  };

  // Dynamically update speech recognition language when user switches language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getRecognitionLang(language);
      if (isRecordingRef.current && !isPausedRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    }
  }, [language]);

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
    return Math.min(1, rms * 5);
  };

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      // 1. Capture microphone audio stream
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
      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        audioCtx = new AudioCtx();
      }
      audioContextRef.current = audioCtx;

      // Ensure AudioContext is actively processing
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const bufferSize = 2048;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isPausedRef.current || !isRecordingRef.current) return;

        const inputChannel = e.inputBuffer.getChannelData(0);
        const rms = calculateRMS(inputChannel);
        setMicLevel(rms);

        const pcm16 = downsampleTo16kPCM(inputChannel, audioCtx.sampleRate);
        const uint8 = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
        let binary = '';
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const b64 = btoa(binary);

        if (onAudioChunkRef.current) {
          onAudioChunkRef.current(b64, rms);
        }
      };

      // Connect through a zero-gain node to keep ScriptProcessor alive without playing through speakers
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      // 2. Initialize browser SpeechRecognition for immediate live speech-to-text preview
      const SpeechRecognition =
        (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang = getRecognitionLang(languageRef.current);

          recognition.onresult = (event: any) => {
            if (isPausedRef.current || !isRecordingRef.current) return;

            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                if (onTranscriptRef.current && transcript.trim()) {
                  onTranscriptRef.current(transcript.trim(), true);
                }
              } else {
                interimTranscript += transcript;
              }
            }

            if (interimTranscript.trim() && onTranscriptRef.current) {
              onTranscriptRef.current(interimTranscript.trim(), false);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('[SpeechRecognition] event error:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
              setError('Microphone permission was denied. Please allow microphone access in your browser.');
            }
          };

          recognition.onend = () => {
            // Only restart if still actively recording and not paused
            if (isRecordingRef.current && !isPausedRef.current) {
              setTimeout(() => {
                if (isRecordingRef.current && !isPausedRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (err) {
                    console.debug('[SpeechRecognition] restart skipped:', err);
                  }
                }
              }, 150);
            }
          };

          recognition.start();
        } catch (e) {
          console.warn('[SpeechRecognition] unavailable or failed to start:', e);
        }
      }

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error('Audio recorder error:', err);
      setError(err.message || 'Could not access microphone.');
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [sampleRate]);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setMicLevel(0);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  const resumeRecording = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    isPausedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch {}
    }
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      } catch {}
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      } catch {}
    }
    setIsRecording(false);
    setIsPaused(false);
    setMicLevel(0);
  }, []);

  const injectTestTranscript = useCallback((text: string, isFinal: boolean = true) => {
    if (onTranscriptRef.current && text.trim()) {
      onTranscriptRef.current(text.trim(), isFinal);
    }
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
    injectTestTranscript,
  };
}
