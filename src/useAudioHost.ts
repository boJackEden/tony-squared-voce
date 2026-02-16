import { useCallback, useRef, useState } from 'react';
import { ExpoPlayAudioStream } from '@mykin-ai/expo-audio-stream';
import TcpSocket from 'react-native-tcp-socket';
import { STREAM_PORT, AUDIO_CONFIG, getLocalIpAddress } from './network';

type TcpServer = ReturnType<typeof TcpSocket.createServer>;
type Socket = any; // TcpSocket socket type

interface HostState {
  isBroadcasting: boolean;
  isStarting: boolean;
  isStopping: boolean;
  localIp: string | null;
  listenerCount: number;
  error: string | null;
}

export function useAudioHost() {
  const [state, setState] = useState<HostState>({
    isBroadcasting: false,
    isStarting: false,
    isStopping: false,
    localIp: null,
    listenerCount: 0,
    error: null,
  });

  const serverRef = useRef<TcpServer | null>(null);
  const clientsRef = useRef<Set<Socket>>(new Set());

  const broadcastToClients = useCallback((base64Data: string) => {
    const clients = clientsRef.current;
    if (clients.size === 0) return;

    // Send base64 PCM data with newline delimiter
    const message = base64Data + '\n';
    for (const client of clients) {
      try {
        client.write(message);
      } catch {
        // Client disconnected, will be cleaned up on 'close' event
      }
    }
  }, []);

  const startBroadcasting = useCallback(async () => {
    if (state.isStarting || state.isBroadcasting) return;
    setState((s) => ({ ...s, isStarting: true, error: null }));

    try {
      // Request mic permission
      const { granted } = await ExpoPlayAudioStream.requestPermissionsAsync();
      if (!granted) {
        setState((s) => ({ ...s, error: 'Microphone permission denied' }));
        return;
      }

      // Get local IP
      const localIp = await getLocalIpAddress();

      // Start TCP server
      const server = TcpSocket.createServer((socket) => {
        clientsRef.current.add(socket);
        setState((s) => ({ ...s, listenerCount: clientsRef.current.size }));

        socket.on('close', () => {
          clientsRef.current.delete(socket);
          setState((s) => ({ ...s, listenerCount: clientsRef.current.size }));
        });

        socket.on('error', () => {
          clientsRef.current.delete(socket);
          setState((s) => ({ ...s, listenerCount: clientsRef.current.size }));
        });
      });

      server.listen({ port: STREAM_PORT, host: '0.0.0.0' });
      serverRef.current = server;

      // Start recording with chunk callbacks
      await ExpoPlayAudioStream.startRecording({
        sampleRate: AUDIO_CONFIG.sampleRate,
        channels: AUDIO_CONFIG.channels,
        encoding: AUDIO_CONFIG.encoding,
        interval: AUDIO_CONFIG.intervalMs,
        onAudioStream: async (event) => {
          // event.data is base64 encoded PCM
          if (typeof event.data === 'string') {
            broadcastToClients(event.data);
          }
        },
      });

      setState({
        isBroadcasting: true,
        isStarting: false,
        isStopping: false,
        localIp,
        listenerCount: 0,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isStarting: false,
        error: err?.message || 'Failed to start broadcasting',
      }));
    }
  }, [state.isStarting, state.isBroadcasting, broadcastToClients]);

  const stopBroadcasting = useCallback(async () => {
    setState((s) => ({ ...s, isStopping: true }));

    try {
      await ExpoPlayAudioStream.stopRecording();
    } catch {}

    // Close all client connections
    for (const client of clientsRef.current) {
      try {
        client.destroy();
      } catch {}
    }
    clientsRef.current.clear();

    // Stop server
    if (serverRef.current) {
      try {
        serverRef.current.close();
      } catch {}
      serverRef.current = null;
    }

    setState({
      isBroadcasting: false,
      isStarting: false,
      isStopping: false,
      localIp: null,
      listenerCount: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    startBroadcasting,
    stopBroadcasting,
  };
}
