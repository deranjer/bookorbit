import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Colors } from '@/src/constants/colors';
import { MiniPlayer } from '@/src/components/player/MiniPlayer';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={({ navigation }) => ({
        tabBarStyle: { backgroundColor: Colors.bg, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.burger}
            hitSlop={8}
          >
            <Ionicons name="menu" size={24} color={Colors.text} />
          </Pressable>
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="libraries"
        options={{
          title: 'Libraries',
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="smart-scopes"
        options={{
          title: 'Smart Scopes',
          tabBarLabel: 'Scopes',
          tabBarIcon: ({ color, size }) => <Ionicons name="aperture-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open-outline" size={size} color={color} />,
        }}
      />
      {/* Drawer-only destinations: hidden from the tab bar (href: null) but still
          rendered inside the tab navigator so the bottom bar stays visible. */}
      <Tabs.Screen name="authors" options={{ title: 'Authors', href: null }} />
      <Tabs.Screen name="series" options={{ title: 'Series', href: null }} />
      <Tabs.Screen name="downloads" options={{ title: 'Downloads', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  burger: { paddingHorizontal: 16 },
});
