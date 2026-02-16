import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HostScreen } from './src/HostScreen';
import { ListenerScreen } from './src/ListenerScreen';

type Role = 'select' | 'host' | 'listener';

export default function App() {
  const [role, setRole] = useState<Role>('select');

  if (role === 'host') {
    return <HostScreen onBack={() => setRole('select')} />;
  }

  if (role === 'listener') {
    return <ListenerScreen onBack={() => setRole('select')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.appName}>Voce</Text>
        <Text style={styles.subtitle}>Tour Guide Audio Streaming</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.roleButton, styles.hostButton]}
            onPress={() => setRole('host')}
          >
            <Text style={styles.roleEmoji}>🎙️</Text>
            <Text style={styles.roleTitle}>Host</Text>
            <Text style={styles.roleDesc}>
              Broadcast your voice to listeners
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.listenerButton]}
            onPress={() => setRole('listener')}
          >
            <Text style={styles.roleEmoji}>🎧</Text>
            <Text style={styles.roleTitle}>Listener</Text>
            <Text style={styles.roleDesc}>
              Connect to a host and listen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8888ff',
    marginBottom: 64,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  roleButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  hostButton: {
    backgroundColor: '#16213e',
  },
  listenerButton: {
    backgroundColor: '#16213e',
  },
  roleEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 14,
    color: '#999',
  },
});
