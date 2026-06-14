import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/src/context/AuthContext';
import { DownloadsProvider } from '@/src/downloads/DownloadsContext';
import { PlayerProvider } from '@/src/playback/PlayerContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <DownloadsProvider>
          <PlayerProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="server-setup" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(drawer)" />
              <Stack.Screen name="book/[id]" />
              <Stack.Screen name="reader/[id]" options={{ animation: 'fade' }} />
              <Stack.Screen name="player" options={{ presentation: 'modal' }} />
            </Stack>
          </PlayerProvider>
        </DownloadsProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
