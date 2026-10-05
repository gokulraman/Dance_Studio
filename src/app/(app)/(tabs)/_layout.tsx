import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, type ColorValue } from 'react-native';

import { useStudio } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

function SignOutButton() {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={() => supabase.auth.signOut()} style={{ marginRight: 16 }}>
      <Text style={{ color: theme.chromeAccent, fontSize: 15 }}>Sign out</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { studio } = useStudio();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerRight: SignOutButton,
        headerStyle: { backgroundColor: theme.chrome },
        headerTintColor: theme.chromeText,
        tabBarStyle: { backgroundColor: theme.chrome, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.chromeAccent,
        tabBarInactiveTintColor: theme.chromeMuted,
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', headerTitle: studio?.name, tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="batches" options={{ title: 'Batches', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="memberships" options={{ title: 'Memberships', tabBarIcon: icon('card-outline') }} />
    </Tabs>
  );
}
