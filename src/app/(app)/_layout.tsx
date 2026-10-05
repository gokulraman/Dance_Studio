import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Spinner } from '@/components/ui';
import { StudioProvider, useStudio } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { makeStyles, useAppTheme } from '@/lib/theme';

export default function AppLayout() {
  return (
    <StudioProvider>
      <StudioGate />
    </StudioProvider>
  );
}

function StudioGate() {
  const { studio, error, isLoading } = useStudio();
  const styles = useStyles();
  const theme = useAppTheme();

  if (isLoading) return <View style={styles.center}><Spinner /></View>;
  if (!studio) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{error ?? 'This login is not linked to a studio yet.'}</Text>
        <Button label="Sign out" variant="plain" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.chrome },
        headerTintColor: theme.chromeText,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="batch/[id]" options={{ title: 'Batch' }} />
      <Stack.Screen name="student/new" options={{ title: 'New student' }} />
      <Stack.Screen name="student/[id]" options={{ title: 'Edit student' }} />
      <Stack.Screen name="enroll/[studentId]" options={{ title: 'Enrol' }} />
    </Stack>
  );
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: t.background },
  message: { textAlign: 'center', fontSize: 16, color: t.text },
}));
