import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderOptions {
  onAudioChunk: (pcmBase64: string, rmsLevel: number) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  language?: string;
  sampleRate?: number;
  chunkDurationMs?: number;
}

export interface VoiceDiagnostics {
  microphonePermission: 'prompt' | 'granted' | 'denied' | 'unknown';
  streamActive: boolean;
  audioTrackState: string | null;
  audioTrackEnabled: boolean;
  audioTrackMuted: boolean;
  audioTrackLabel: string | null;
  recognitionState: 'idle' | 'starting' | 'listening' | 'stopping' | 'error';
  lastRecognitionEvent: string | null;
  lastRecognitionError: string | null;
  transcriptReceived: string | null;
  interimTranscript: string | null;
  finalTranscript: string | null;
  usingAudioWorklet: boolean;
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

  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>({
    microphonePermission: 'unknown',
    streamActive: false,
    audioTrackState: null,
    audioTrackEnabled: false,
    audioTrackMuted: false,
    audioTrackLabel: null,
    recognitionState: 'idle',
    lastRecognitionEvent: null,
    lastRecognitionError: null,
    transcriptReceived: null,
    interimTranscript: null,
    finalTranscript: null,
    usingAudioWorklet: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingRef = useRef(false);

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

  const updateDiagnostics = useCallback((partial: Partial<VoiceDiagnostics>) => {
    setDiagnostics((prev) => ({ ...prev, ...partial }));
  }, []);

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
        return 'en-IN'; // Indian English / Global English
      default:
        return (typeof navigator !== 'undefined' && navigator.language) || 'en-IN';
    }
  };

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

  // Dedicated SpeechRecognition session starter with full lifecycle and safe recovery
  const startRecognitionSession = useCallback(() => {
    if (!isRecordingRef.current || isPausedRef.current) return;

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      console.warn('[SpeechRecognition] API not available in this browser; relying on server Whisper STT.');
      return;
    }

    // Clean up any prior recognition object before re-creating
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onaudiostart = null;
        recognitionRef.current.onsoundstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onsoundend = null;
        recognitionRef.current.onaudioend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getRecognitionLang(languageRef.current);

      updateDiagnostics({
        recognitionState: 'starting',
        lastRecognitionEvent: 'init',
      });

      recognition.onstart = () => {
        console.log('🎙 [SpeechRecognition] started');
        updateDiagnostics({
          recognitionState: 'listening',
          lastRecognitionEvent: 'onstart',
        });
      };

      recognition.onaudiostart = () => {
        console.log('🔊 [SpeechRecognition] audio capture started');
        updateDiagnostics({ lastRecognitionEvent: 'onaudiostart' });
      };

      recognition.onsoundstart = () => {
        console.log('🔉 [SpeechRecognition] sound detected');
        updateDiagnostics({ lastRecognitionEvent: 'onsoundstart' });
      };

      recognition.onspeechstart = () => {
        console.log('🗣 [SpeechRecognition] speech detected');
        updateDiagnostics({ lastRecognitionEvent: 'onspeechstart' });
      };

      recognition.onresult = (event: any) => {
        if (isPausedRef.current || !isRecordingRef.current) return;

        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        console.log('📝 [SpeechRecognition] result:', { finalText, interimText });
        updateDiagnostics({
          lastRecognitionEvent: 'onresult',
          transcriptReceived: finalText || interimText,
          finalTranscript: finalText,
          interimTranscript: interimText,
        });

        // Push final text immediately to consumer
        if (finalText.trim() && onTranscriptRef.current) {
          onTranscriptRef.current(finalText.trim(), true);
        }
        // Push interim text immediately to consumer
        if (interimText.trim() && onTranscriptRef.current) {
          onTranscriptRef.current(interimText.trim(), false);
        }
      };

      recognition.onspeechend = () => {
        console.log('🤐 [SpeechRecognition] speech ended');
        updateDiagnostics({ lastRecognitionEvent: 'onspeechend' });
      };

      recognition.onsoundend = () => {
        console.log('🔇 [SpeechRecognition] sound ended');
        updateDiagnostics({ lastRecognitionEvent: 'onsoundend' });
      };

      recognition.onaudioend = () => {
        console.log('⏹ [SpeechRecognition] audio capture ended');
        updateDiagnostics({ lastRecognitionEvent: 'onaudioend' });
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        console.warn('⚠️ [SpeechRecognition] event error:', err);
        updateDiagnostics({
          lastRecognitionEvent: 'onerror',
          lastRecognitionError: err,
        });

        if (err === 'no-speech') {
          // Pause in speech is expected in voice typing; keep session alive!
          console.debug('[SpeechRecognition] no-speech pause detected; continuing session');
          return;
        }

        if (err === 'aborted') {
          console.debug('[SpeechRecognition] aborted');
          return;
        }

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser.');
          updateDiagnostics({ recognitionState: 'error' });
          return;
        }

        if (err === 'audio-capture') {
          console.warn('[SpeechRecognition] audio capture busy; backend STT continues.');
          return;
        }

        if (err === 'network') {
          console.info('[SpeechRecognition] browser speech cloud network unavailable; local Whisper engine active.');
          return;
        }
      };

      recognition.onend = () => {
        console.log('🛑 [SpeechRecognition] ended');
        updateDiagnostics({
          recognitionState: isRecordingRef.current ? 'starting' : 'idle',
          lastRecognitionEvent: 'onend',
        });

        // Restart recognition safely after guarded delay if user is still in LIVE mode
        if (isRecordingRef.current && !isPausedRef.current) {
          if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
          }
          restartTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current && !isPausedRef.current) {
              startRecognitionSession();
            }
          }, 100);
        }
      };

      recognition.start();
    } catch (e: any) {
      console.warn('[SpeechRecognition] start exception:', e);
      if (isRecordingRef.current && !isPausedRef.current) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current && !isPausedRef.current) {
            startRecognitionSession();
          }
        }, 250);
      }
    }
  }, [updateDiagnostics]);

  // Dynamically update speech recognition language when user switches language
  useEffect(() => {
    if (recognitionRef.current && isRecordingRef.current && !isPausedRef.current) {
      recognitionRef.current.lang = getRecognitionLang(language);
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [language]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || isRecordingRef.current) return;
    isStartingRef.current = true;
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      // Check permission state if supported
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          updateDiagnostics({ microphonePermission: status.state as any });
        } catch {}
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

      // Extract diagnostics on media stream tracks
      const audioTracks = stream.getAudioTracks();
      const firstTrack = audioTracks[0];
      updateDiagnostics({
        microphonePermission: 'granted',
        streamActive: stream.active,
        audioTrackState: firstTrack ? firstTrack.readyState : null,
        audioTrackEnabled: firstTrack ? firstTrack.enabled : false,
        audioTrackMuted: firstTrack ? firstTrack.muted : false,
        audioTrackLabel: firstTrack ? firstTrack.label : null,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        audioCtx = new AudioCtx();
      }
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);

      // 2. Initialize AudioWorkletNode (replaces deprecated ScriptProcessorNode)
      let usingWorklet = false;
      if (audioCtx.audioWorklet) {
        try {
          await audioCtx.audioWorklet.addModule('/audio-processor.js');
          const workletNode = new AudioWorkletNode(audioCtx, 'story-audio-processor');
          processorNodeRef.current = workletNode;

          workletNode.port.onmessage = (event) => {
            if (isPausedRef.current || !isRecordingRef.current) return;
            const { buffer, rms } = event.data;
            setMicLevel(rms);

            const pcm16 = downsampleTo16kPCM(buffer, audioCtx.sampleRate);
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

          source.connect(workletNode);
          usingWorklet = true;
          updateDiagnostics({ usingAudioWorklet: true });
        } catch (workletError) {
          console.warn('AudioWorklet module load failed; falling back to ScriptProcessor:', workletError);
        }
      }

      // Fallback to ScriptProcessorNode if AudioWorklet unavailable
      if (!usingWorklet) {
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

        const muteGain = audioCtx.createGain();
        muteGain.gain.value = 0;
        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(audioCtx.destination);
        updateDiagnostics({ usingAudioWorklet: false });
      }

      // 3. Mark active state synchronously
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);

      // 4. Start speech recognition session
      startRecognitionSession();
    } catch (err: any) {
      console.error('Audio recorder start error:', err);
      setError(err.message || 'Could not access microphone.');
      isRecordingRef.current = false;
      setIsRecording(false);
      updateDiagnostics({
        recognitionState: 'error',
        lastRecognitionError: err.message,
      });
    } finally {
      isStartingRef.current = false;
    }
  }, [sampleRate, startRecognitionSession, updateDiagnostics]);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setMicLevel(0);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    updateDiagnostics({ recognitionState: 'idle' });
  }, [updateDiagnostics]);

  const resumeRecording = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    startRecognitionSession();
  }, [startRecognitionSession]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    isStartingRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onaudiostart = null;
        recognitionRef.current.onsoundstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onsoundend = null;
        recognitionRef.current.onaudioend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
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
    updateDiagnostics({
      streamActive: false,
      recognitionState: 'idle',
      lastRecognitionEvent: 'stopped',
    });
  }, [updateDiagnostics]);

  const injectTestTranscript = useCallback((text: string, isFinal: boolean = true) => {
    if (onTranscriptRef.current && text.trim()) {
      onTranscriptRef.current(text.trim(), isFinal);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    isPaused,
    micLevel,
    error,
    diagnostics,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    injectTestTranscript,
  };
}
