import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { Tone } from '@/lib/format';
import { makeStyles, useAppTheme } from '@/lib/theme';

export function Card({ children, onPress }: PropsWithChildren<{ onPress?: () => void }>) {
  const styles = useStyles();
  if (!onPress) return <View style={styles.card}>{children}</View>;
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {children}
    </Pressable>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={theme.accent} />
    </Pressable>
  );
}

// Lists that show a Fab need this much bottom padding so the last card isn't hidden behind it.
export const FAB_CLEARANCE = 100;

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.fabWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Ionicons name="add" size={32} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

export function Row({ children }: PropsWithChildren) {
  return <View style={useStyles().row}>{children}</View>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={useStyles().title}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={useStyles().muted}>{children}</Text>;
}

export function SectionHeader({ children }: PropsWithChildren) {
  return <Text style={useStyles().section}>{children}</Text>;
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const styles = useStyles();
  const c = useAppTheme().tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'plain';
}) {
  const styles = useStyles();
  const theme = useAppTheme();
  const primary = variant === 'primary';
  const textColor = primary ? theme.onPrimary : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonPlain,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {busy ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const styles = useStyles();
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={theme.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Spinner() {
  return <ActivityIndicator style={useStyles().center} color={useAppTheme().accent} />;
}

export function StateMessage({ isLoading, error, empty }: { isLoading: boolean; error: string | null; empty: ReactNode }) {
  const styles = useStyles();
  if (error) return <Text style={[styles.center, styles.error]}>{error}</Text>;
  if (isLoading) return <Spinner />;
  return <Text style={[styles.center, styles.muted]}>{empty}</Text>;
}

export function Choices<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.choice, on && styles.choiceOn]}>
            <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ErrorText({ children }: PropsWithChildren) {
  return <Text style={useStyles().error}>{children}</Text>;
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: t.text, flexShrink: 1 },
  muted: { fontSize: 14, color: t.muted },
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: t.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  button: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: t.primary },
  buttonPlain: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: t.text },
  input: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: t.text,
  },
  center: { textAlign: 'center', marginTop: 40, marginHorizontal: 24 },
  error: { color: t.danger },
  iconButton: { padding: 4 },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center', pointerEvents: 'box-none' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: t.primary,
    borderWidth: 2,
    borderColor: t.dark ? t.accent : t.chromeAccent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.35)',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  choiceOn: { backgroundColor: t.primary, borderColor: t.primary },
  choiceText: { color: t.text, fontSize: 14 },
  choiceTextOn: { color: t.onPrimary, fontWeight: '600' },
}));
