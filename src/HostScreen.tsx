import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAudioHost } from './useAudioHost';
import { SIGNALING_PORT } from './network';

interface HostScreenProps {
  onBack: () => void;
}

export function HostScreen({ onBack }: HostScreenProps) {
  const {
    isBroadcasting,
    isStarting,
    isStopping,
    localIp,
    listenerCount,
    error,
    startBroadcasting,
    stopBroadcasting,
  } = useAudioHost();

  const isBusy = isStarting || isStopping;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Host Mode</Text>

        {isBroadcasting && (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Your IP Address</Text>
            {localIp ? (
              <Text style={styles.ipText}>{localIp}:{SIGNALING_PORT}</Text>
            ) : (
              <Text style={styles.ipText}>Check Wi-Fi settings</Text>
            )}
            <Text style={styles.hint}>
              {localIp ? 'Share this with listeners to connect' : 'Go to Settings → Wi-Fi → tap (i) to find your IP'}
            </Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isBroadcasting ? '#4CAF50' : '#9E9E9E' },
            ]}
          />
          <Text style={styles.statusText}>
            {isBroadcasting ? 'Broadcasting' : 'Idle'}
          </Text>
        </View>

        {isBroadcasting && (
          <Text style={styles.listenerCount}>
            {listenerCount} listener{listenerCount !== 1 ? 's' : ''} connected
          </Text>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: isBusy ? '#999' : isBroadcasting ? '#F44336' : '#4CAF50' },
          ]}
          onPress={isBroadcasting ? stopBroadcasting : startBroadcasting}
          disabled={isBusy}
        >
          {isBusy ? (
            <View style={styles.stoppingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                {isStarting ? 'Starting…' : 'Stopping…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 16,
  },
  backText: {
    color: '#8888ff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  infoLabel: {
    color: '#8888ff',
    fontSize: 14,
    marginBottom: 8,
  },
  ipText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    color: '#ccc',
    fontSize: 16,
  },
  listenerCount: {
    color: '#8888ff',
    fontSize: 18,
    marginBottom: 32,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  mainButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginTop: 16,
  },
  stoppingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
