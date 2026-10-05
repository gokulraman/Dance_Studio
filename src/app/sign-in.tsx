import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { makeStyles } from '@/lib/theme';

export default function SignIn() {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // On success the session listener swaps this screen for the app.
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.brand}>D&apos;LEGACY</Text>
          <View style={styles.rule} />
          <Text style={styles.subtitle}>Studio manager</Text>
        </View>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={signIn}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button label="Sign in" onPress={signIn} busy={busy} disabled={!email.trim() || !password} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.background },
  body: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  header: { alignItems: 'center', marginBottom: 16, gap: 8 },
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: 4, color: t.accent },
  rule: { width: 64, height: 2, backgroundColor: t.chromeAccent },
  subtitle: { fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: t.muted },
}));
