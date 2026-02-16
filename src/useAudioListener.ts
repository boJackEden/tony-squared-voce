import { useCallback, useRef, useState } from 'react';
import { ExpoPlayAudioStream } from '@mykin-ai/expo-audio-stream';
import TcpSocket from 'react-native-tcp-socket';
import { STREAM_PORT } from './network';

type Socket = any;

interface ListenerState {
  isConnected: boolean;
  isPlaying: boolean;
  error: string | null;
  bufferHealth: string;
}

const TURN_ID = 'live-stream';

export function useAudioListener() {
  const [state, setState] = useState<ListenerState>({
    isConnected: false,
    isPlaying: false,
    error: null,
    bufferHealth: 'idle',
  });

  const socketRef = useRef<Socket | null>(null);
  const isFirstChunkRef = useRef(true);
  const partialDataRef = useRef('');

  const connect = useCallback(async (hostIp: string) => {
    try {
      // Configure playback for voice streaming
      await ExpoPlayAudioStream.setSoundConfig({
        sampleRate: 16000,
        playbackMode: 'regular',
        enableBuffering: true,
        bufferConfig: {
          targetBufferMs: 300,
          minBufferMs: 150,
          maxBufferMs: 600,
          frameIntervalMs: 20,
        },
      });

      // Start the buffered audio stream
      await ExpoPlayAudioStream.startBufferedAudioStream({
        turnId: TURN_ID,
        encoding: 'pcm_s16le',
        bufferConfig: {
          targetBufferMs: 300,
          minBufferMs: 150,
          maxBufferMs: 600,
          frameIntervalMs: 20,
        },
        onBufferHealth: (metrics) => {
          setState((s) => ({
            ...s,
            bufferHealth: metrics.bufferHealthState,
          }));
        },
      });

      isFirstChunkRef.current = true;
      partialDataRef.current = '';

      // Connect via TCP
      const socket = TcpSocket.createConnection(
        { host: hostIp, port: STREAM_PORT },
        () => {
          setState((s) => ({
            ...s,
            isConnected: true,
            isPlaying: true,
            error: null,
          }));
        }
      );

      socket.on('data', (data: Buffer | string) => {
        const chunk = typeof data === 'string' ? data : data.toString('utf-8');
        // Data is newline-delimited base64 chunks
        const combined = partialDataRef.current + chunk;
        const lines = combined.split('\n');

        // Last element might be incomplete
        partialDataRef.current = lines.pop() || '';

        for (const line of lines) {
          if (line.length === 0) continue;
          try {
            ExpoPlayAudioStream.playAudioBuffered(
              line,
              TURN_ID,
              isFirstChunkRef.current,
              false
            );
            isFirstChunkRef.current = false;
          } catch {
            // Skip malformed chunks
          }
        }
      });

      socket.on('error', (err: any) => {
        setState((s) => ({
          ...s,
          error: err?.message || 'Connection error',
          isConnected: false,
        }));
      });

      socket.on('close', () => {
        setState((s) => ({
          ...s,
          isConnected: false,
          isPlaying: false,
        }));
      });

      socketRef.current = socket;
    } catch (err: any) {
      setState((s) => ({
        ...s,
        error: err?.message || 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (socketRef.current) {
      try {
        socketRef.current.destroy();
      } catch {}
      socketRef.current = null;
    }

    try {
      await ExpoPlayAudioStream.stopBufferedAudioStream(TURN_ID);
    } catch {}

    partialDataRef.current = '';
    isFirstChunkRef.current = true;

    setState({
      isConnected: false,
      isPlaying: false,
      error: null,
      bufferHealth: 'idle',
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
