import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '@/src/context/AuthContext';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { getSetupStatus } from '@/src/api/auth';
import { Colors } from '@/src/constants/colors';

export default function ServerSetupScreen() {
  const { setServerUrl } = useAuthContext();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isInsecure = /^http:\/\//i.test(url.trim());

  async function handleConnect() {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) return;
    setError('');
    setLoading(true);

    // Temporarily set the store so the api client can use it
    serverUrlStore.set(trimmed);

    try {
      await getSetupStatus();
      await setServerUrl(trimmed);
      router.replace('/login');
    } catch {
      serverUrlStore.set(null);
      setError('Could not connect. Check the URL (including the port, e.g. :3000) and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>BookOrbit</Text>
        <Text style={styles.subtitle}>Enter your server URL</Text>

        <TextInput
          style={styles.input}
          placeholder="https://your-bookorbit-server.com"
          placeholderTextColor={Colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />

        {isInsecure ? (
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={18} color={Colors.warning} style={styles.warningIcon} />
            <Text style={styles.warning}>
              Insecure connection. HTTP traffic — including your login — is sent unencrypted and can be read by others on the network. Use HTTPS whenever
              possible.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleConnect} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connect</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  error: { color: Colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  warningIcon: { marginTop: 1 },
  warning: { color: Colors.warning, fontSize: 13, lineHeight: 18, flex: 1 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
