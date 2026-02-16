import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useAudioListener } from './useAudioListener';
import { DEFAULT_HOST_IP } from './network';

interface ListenerScreenProps {
  onBack: () => void;
}

export function ListenerScreen({ onBack }: ListenerScreenProps) {
  const [hostIp, setHostIp] = useState(DEFAULT_HOST_IP);
  const { isConnecting, isConnected, isPlaying, error, connect, disconnect } =
    useAudioListener();

  const handleToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect(hostIp);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          disconnect();
          onBack();
        }}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Listener Mode</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Host IP Address</Text>
          <TextInput
            style={styles.input}
            value={hostIp}
            onChangeText={setHostIp}
            placeholder="192.168.43.1"
            placeholderTextColor="#555"
            keyboardType="numeric"
            editable={!isConnected}
          />
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#4CAF50' : '#9E9E9E' },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        {isPlaying && (
          <View style={styles.playbackInfo}>
            <Text style={styles.playingText}>Receiving Audio</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: isConnecting ? '#999' : isConnected ? '#F44336' : '#4CAF50' },
          ]}
          onPress={handleToggle}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.buttonText, { marginLeft: 8 }]}>Connecting…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </TouchableWithoutFeedback>
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
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    color: '#8888ff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
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
  playbackInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  playingText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
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
  connectingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
