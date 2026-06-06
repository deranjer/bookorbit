import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '@/src/context/AuthContext';
import { getAppInfo } from '@/src/api/appInfo';
import { Colors } from '@/src/constants/colors';

const NAV_ITEMS = [
  { label: 'Authors', icon: 'people-outline', href: '/(drawer)/(tabs)/authors' },
  { label: 'Series', icon: 'albums-outline', href: '/(drawer)/(tabs)/series' },
] as const;

function DrawerContent(props: DrawerContentComponentProps) {
  const { user, clearToken } = useAuthContext();
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAppInfo()
      .then((info) => {
        if (active) setServerVersion(info.version);
      })
      .catch(() => {
        if (active) setServerVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const navigate = (href: string) => {
    props.navigation.dispatch(DrawerActions.closeDrawer());
    router.push(href as Parameters<typeof router.push>[0]);
  };

  return (
    <DrawerContentScrollView {...props} style={styles.drawer} contentContainerStyle={styles.drawerContent}>
      <View style={styles.profile}>
        <Text style={styles.profileName}>{user?.name ?? user?.username ?? 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
      </View>
      {NAV_ITEMS.map((item) => (
        <Pressable key={item.href} style={styles.navItem} onPress={() => navigate(item.href)}>
          <Ionicons name={item.icon} size={22} color={Colors.textSecondary} />
          <Text style={styles.navLabel}>{item.label}</Text>
        </Pressable>
      ))}
      <View style={styles.footer}>
        <Pressable style={styles.logout} onPress={clearToken}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
        <Text style={styles.version}>{serverVersion ? `Server ${serverVersion}` : ''}</Text>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const { serverUrl, token, loading } = useAuthContext();
  if (loading) return null;
  if (!serverUrl) return <Redirect href="/server-setup" />;
  if (!token) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={DrawerContent}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        drawerStyle: { backgroundColor: Colors.bg },
        drawerActiveTintColor: Colors.accent,
        drawerInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: 'Library', headerShown: false }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: { backgroundColor: Colors.bg },
  drawerContent: { flexGrow: 1 },
  profile: { padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 8 },
  profileName: { color: Colors.text, fontSize: 17, fontWeight: '600' },
  profileEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 14 },
  navLabel: { color: Colors.text, fontSize: 15, fontWeight: '500' },
  footer: { marginTop: 'auto' },
  logout: { margin: 16, marginBottom: 8, padding: 12, borderRadius: 8, backgroundColor: Colors.surface, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '500' },
  version: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 16 },
});
