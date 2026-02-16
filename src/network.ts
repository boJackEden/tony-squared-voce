import { Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';

export const STREAM_PORT = 8080;

// Default hotspot IP for Android
export const DEFAULT_HOST_IP = '192.168.43.1';

// Audio format constants (must match between host and listener)
export const AUDIO_CONFIG = {
  sampleRate: 16000 as const,
  channels: 1 as const,
  encoding: 'pcm_16bit' as const,
  // Chunk interval in ms — smaller = lower latency, more overhead
  intervalMs: 20,
};

/**
 * Get the device's local IP address by connecting to a known address.
 * Works on both iOS and Android without extra permissions.
 */
export async function getLocalIpAddress(): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      const socket = TcpSocket.createConnection(
        { host: '8.8.8.8', port: 80 },
        () => {
          const address = socket.address() as { address?: string };
          socket.destroy();
          resolve(address?.address || null);
        }
      );
      socket.on('error', () => {
        socket.destroy();
        // Fallback: common hotspot IPs
        resolve(Platform.OS === 'android' ? '192.168.43.1' : '172.20.10.1');
      });
    });
  } catch {
    return Platform.OS === 'android' ? '192.168.43.1' : '172.20.10.1';
  }
}
