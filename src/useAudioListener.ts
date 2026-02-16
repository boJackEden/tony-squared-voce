import { useCallback, useRef, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import TcpSocket from 'react-native-tcp-socket';
import {
  SIGNALING_PORT,
  sendSignalingMessage,
  parseSignalingMessages,
} from './network';

type Socket = any;

interface ListenerState {
  isConnecting: boolean;
  isConnected: boolean;
  isPlaying: boolean;
  error: string | null;
}

export function useAudioListener() {
  const [state, setState] = useState<ListenerState>({
    isConnecting: false,
    isConnected: false,
    isPlaying: false,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const partialRef = useRef('');

  const connect = useCallback(async (hostIp: string) => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    partialRef.current = '';

    try {
      // Create peer connection (no STUN/TURN for local network)
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      // When remote audio track arrives, WebRTC plays it automatically
      pc.addEventListener('track', () => {
        setState((s) => ({ ...s, isPlaying: true }));
      });

      // Monitor connection state
      pc.addEventListener('connectionstatechange', () => {
        const connState = pc.connectionState;
        if (connState === 'connected') {
          setState((s) => ({ ...s, isConnected: true, isConnecting: false }));
        } else if (connState === 'failed' || connState === 'disconnected') {
          setState((s) => ({
            ...s,
            error: 'Connection lost',
            isConnected: false,
            isPlaying: false,
          }));
        }
      });

      // Connect TCP socket to host for signaling
      const socket = TcpSocket.createConnection(
        { host: hostIp, port: SIGNALING_PORT },
        () => {
          // TCP connected — waiting for offer from host
        }
      );
      socketRef.current = socket;

      // Send ICE candidates to host
      pc.addEventListener('icecandidate', (event) => {
        sendSignalingMessage(socket, {
          type: 'ice-candidate',
          candidate: event.candidate ? event.candidate.toJSON() : null,
        });
      });

      // Handle signaling messages from host
      socket.on('data', async (data: Buffer | string) => {
        const chunk = typeof data === 'string' ? data : data.toString('utf-8');
        const messages = parseSignalingMessages(chunk, partialRef);
        for (const msg of messages) {
          if (msg.type === 'offer') {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'offer', sdp: msg.sdp })
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignalingMessage(socket, {
              type: 'answer',
              sdp: answer.sdp!,
            });
          } else if (msg.type === 'ice-candidate' && msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        }
      });

      socket.on('error', (err: any) => {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: err?.message || 'Connection error',
          isConnected: false,
        }));
      });

      socket.on('close', () => {
        setState((s) => ({
          ...s,
          isConnecting: false,
          isConnected: false,
          isPlaying: false,
        }));
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err?.message || 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.destroy();
      } catch {}
      socketRef.current = null;
    }
    partialRef.current = '';

    setState({
      isConnecting: false,
      isConnected: false,
      isPlaying: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
