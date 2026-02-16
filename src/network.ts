import NetInfo from '@react-native-community/netinfo';

export const SIGNALING_PORT = 8080;

// Default hotspot IP for Android
export const DEFAULT_HOST_IP = '192.168.43.1';

// Signaling message types for WebRTC handshake
export type SignalingMessage =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice-candidate'; candidate: any | null };

export function sendSignalingMessage(socket: any, msg: SignalingMessage): void {
  socket.write(JSON.stringify(msg) + '\n');
}

export function parseSignalingMessages(
  chunk: string,
  partialRef: { current: string }
): SignalingMessage[] {
  const combined = partialRef.current + chunk;
  const lines = combined.split('\n');
  partialRef.current = lines.pop() || '';

  const messages: SignalingMessage[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }
  return messages;
}

/**
 * Get the device's local IP address from the OS network interface.
 * Works without internet — reads directly from Wi-Fi/hotspot interface.
 */
export async function getLocalIpAddress(): Promise<string | null> {
  try {
    const info = await NetInfo.fetch();
    const ip = (info.details as any)?.ipAddress ?? null;
    return ip;
  } catch {
    return null;
  }
}
