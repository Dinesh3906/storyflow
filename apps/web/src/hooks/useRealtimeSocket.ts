import { useEffect, useRef, useCallback } from 'react';
import { useStoryStore } from '../lib/store';

interface UseRealtimeSocketProps {
  storyId: string;
  onPartialTranscript?: (text: string) => void;
  onFinalParagraph?: (processed: string, raw: string) => void;
  onError?: (err: any) => void;
}

export function useRealtimeSocket({
  storyId,
  onPartialTranscript,
  onFinalParagraph,
  onError,
}: UseRealtimeSocketProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  const {
    language,
    scriptMode,
    style,
    writingMode,
    realtimeMode,
    setLiveProvisionalText,
    appendFinalParagraph,
    setRecordingState,
    setLastError,
  } = useStoryStore();

  const connect = useCallback(() => {
    if (!storyId) return;

    isManuallyClosedRef.current = false;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const endpoint = `${wsUrl}/ws/story/${storyId}`;

    try {
      const ws = new WebSocket(endpoint);
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setRecordingState('connecting');

        // Start heartbeat ping every 15s
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'client.heartbeat',
                sessionId: 'client',
                sequence: Date.now(),
                timestamp: new Date().toISOString(),
                payload: { timestamp: Date.now() },
              })
            );
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;

          switch (type) {
            case 'connection.ready':
              // Start session with chosen language and style options
              ws.send(
                JSON.stringify({
                  type: 'session.start',
                  sessionId: payload.connectionId,
                  sequence: 1,
                  timestamp: new Date().toISOString(),
                  payload: {
                    storyId,
                    userId: 'anonymous-writer',
                    language,
                    scriptMode,
                    style,
                    writingMode,
                    realtimeMode,
                  },
                })
              );
              break;

            case 'session.started':
              setRecordingState('listening');
              break;

            case 'session.paused':
              setRecordingState('paused');
              break;

            case 'session.resumed':
              setRecordingState('listening');
              break;

            case 'transcript.partial':
              setLiveProvisionalText(payload.text);
              if (onPartialTranscript) onPartialTranscript(payload.text);
              break;

            case 'transcript.final':
              // Final speech segment confirmed
              break;

            case 'story.paragraph.final':
              appendFinalParagraph(payload.processedText, payload.rawTranscript);
              if (onFinalParagraph) {
                onFinalParagraph(payload.processedText, payload.rawTranscript);
              }
              break;

            case 'story.error':
              setLastError(payload.message);
              if (onError) onError(payload);
              break;
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection error:', e);
        setLastError('Connection error. Reconnecting...');
      };

      ws.onclose = () => {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        if (!isManuallyClosedRef.current) {
          setRecordingState('reconnecting');
          // Exponential backoff with jitter
          const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttemptsRef.current)) + Math.random() * 500;
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setRecordingState('idle');
        }
      };
    } catch (err: any) {
      console.error('Failed to instantiate WebSocket:', err);
      setLastError(err.message);
    }
  }, [
    storyId,
    language,
    scriptMode,
    style,
    writingMode,
    realtimeMode,
    setRecordingState,
    setLiveProvisionalText,
    appendFinalParagraph,
    setLastError,
    onPartialTranscript,
    onFinalParagraph,
    onError,
  ]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setRecordingState('idle');
  }, [setRecordingState]);

  const sendAudioChunk = useCallback((base64Data: string, rmsLevel: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'audio.chunk',
          sessionId: 'client',
          sequence: Date.now(),
          timestamp: new Date().toISOString(),
          payload: {
            data: base64Data,
            rmsLevel,
            durationMs: 30,
          },
        })
      );
    }
  }, []);

  const pauseSession = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'session.pause',
          sessionId: 'client',
          sequence: Date.now(),
          timestamp: new Date().toISOString(),
          payload: { storyId },
        })
      );
    }
  }, [storyId]);

  const resumeSession = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'session.resume',
          sessionId: 'client',
          sequence: Date.now(),
          timestamp: new Date().toISOString(),
          payload: { storyId },
        })
      );
    }
  }, [storyId]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendAudioChunk,
    pauseSession,
    resumeSession,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN,
  };
}
