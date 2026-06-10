import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '@/src/context/AuthContext';
import { getPublicOidcProviders, login } from '@/src/api/auth';
import { initiateOidcLogin, isOidcCancelled } from '@/src/api/oidc';
import { Colors } from '@/src/constants/colors';

export default function LoginScreen() {
  const { serverUrl, token, loading, setToken } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oidcLoading, setOidcLoading] = useState('');

  const { data: oidcProviders } = useQuery({
    queryKey: ['oidcProviders'],
    queryFn: getPublicOidcProviders,
    enabled: !!serverUrl,
    staleTime: Infinity,
  });

  if (loading) return null;
  if (!serverUrl) return <Redirect href="/server-setup" />;
  if (token) return <Redirect href="/(drawer)/(tabs)" />;

  async function handleLogin() {
    if (!username.trim() || !password) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      await setToken(result.accessToken, result.user);
      router.replace('/(drawer)/(tabs)');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOidcLogin(slug: string, displayName: string) {
    const provider = oidcProviders?.find((p) => p.slug === slug);
    if (!provider) return;
    setError('');
    setOidcLoading(slug);
    try {
      const result = await initiateOidcLogin(provider);
      await setToken(result.accessToken, result.user);
      router.replace('/(drawer)/(tabs)');
    } catch (e) {
      if (!isOidcCancelled(e)) {
        setError(e instanceof Error ? e.message : 'OIDC login failed');
      }
    } finally {
      setOidcLoading('');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>BookOrbit</Text>
        <Text style={styles.subtitle}>Sign in to your library</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={Colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleLogin} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>

        {oidcProviders && oidcProviders.length > 0 && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            {oidcProviders.map((provider) => (
              <Pressable
                key={provider.slug}
                style={styles.oidcButton}
                onPress={() => handleOidcLogin(provider.slug, provider.displayName)}
                disabled={!!oidcLoading}
              >
                {oidcLoading === provider.slug ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.oidcButtonText}>{provider.displayName}</Text>
                )}
              </Pressable>
            ))}
          </>
        )}

        <Pressable style={styles.changeServer} onPress={() => router.push('/server-setup')}>
          <Text style={styles.changeServerText}>{serverUrl}</Text>
          <Text style={styles.changeServerLink}>Change server</Text>
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
  passwordRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    color: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: { paddingHorizontal: 14 },
  error: { color: Colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textSecondary, fontSize: 13, marginHorizontal: 12 },
  oidcButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  oidcButtonText: { color: Colors.text, fontSize: 15, fontWeight: '500' },
  changeServer: { alignItems: 'center', marginTop: 28 },
  changeServerText: { color: Colors.textMuted, fontSize: 12, marginBottom: 2 },
  changeServerLink: { color: Colors.accent, fontSize: 14 },
});
