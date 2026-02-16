import { useCallback, useRef, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import TcpSocket from 'react-native-tcp-socket';
import {
  SIGNALING_PORT,
  getLocalIpAddress,
  sendSignalingMessage,
  parseSignalingMessages,
} from './network';

type TcpServer = ReturnType<typeof TcpSocket.createServer>;
type Socket = any;

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
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<Socket, RTCPeerConnection>>(new Map());
  const partialBuffersRef = useRef<Map<Socket, { current: string }>>(new Map());

  const updateListenerCount = useCallback(() => {
    const count = peersRef.current.size;
    setState((s) => ({ ...s, listenerCount: count }));
  }, []);

  const cleanupPeer = useCallback((socket: Socket) => {
    const pc = peersRef.current.get(socket);
    if (pc) {
      pc.close();
      peersRef.current.delete(socket);
    }
    partialBuffersRef.current.delete(socket);
    try {
      socket.destroy();
    } catch {}
    updateListenerCount();
  }, [updateListenerCount]);

  const startBroadcasting = useCallback(async () => {
    if (state.isStarting || state.isBroadcasting) return;
    setState((s) => ({ ...s, isStarting: true, error: null }));

    try {
      // Capture microphone audio via WebRTC (handles permission prompting)
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream as MediaStream;

      // Get local IP (may be null if detection fails)
      const localIp = await getLocalIpAddress();

      // Start TCP signaling server
      const server = TcpSocket.createServer(async (socket) => {
        const partialRef = { current: '' };
        partialBuffersRef.current.set(socket, partialRef);

        // Create peer connection (no STUN/TURN for local network)
        const pc = new RTCPeerConnection({ iceServers: [] });
        peersRef.current.set(socket, pc);
        updateListenerCount();

        // Add audio track from local stream
        const audioTrack = localStreamRef.current!.getAudioTracks()[0];
        pc.addTrack(audioTrack, localStreamRef.current!);

        // Send ICE candidates to listener
        pc.addEventListener('icecandidate', (event) => {
          sendSignalingMessage(socket, {
            type: 'ice-candidate',
            candidate: event.candidate ? event.candidate.toJSON() : null,
          });
        });

        // Create and send offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        } as any);
        await pc.setLocalDescription(offer);

        sendSignalingMessage(socket, {
          type: 'offer',
          sdp: offer.sdp!,
        });

        // Handle signaling messages from listener
        socket.on('data', (data: Buffer | string) => {
          const chunk = typeof data === 'string' ? data : data.toString('utf-8');
          const messages = parseSignalingMessages(chunk, partialRef);
          for (const msg of messages) {
            if (msg.type === 'answer') {
              pc.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: msg.sdp })
              );
            } else if (msg.type === 'ice-candidate' && msg.candidate) {
              pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
          }
        });

        // Cleanup on disconnect
        socket.on('close', () => cleanupPeer(socket));
        socket.on('error', () => cleanupPeer(socket));
      });

      server.listen({ port: SIGNALING_PORT, host: '0.0.0.0' });
      serverRef.current = server;

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
  }, [state.isStarting, state.isBroadcasting, updateListenerCount, cleanupPeer]);

  const stopBroadcasting = useCallback(async () => {
    setState((s) => ({ ...s, isStopping: true }));

    // Close all peer connections and sockets
    for (const [socket, pc] of peersRef.current) {
      pc.close();
      try {
        socket.destroy();
      } catch {}
    }
    peersRef.current.clear();
    partialBuffersRef.current.clear();

    // Stop local media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }

    // Stop TCP signaling server
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
