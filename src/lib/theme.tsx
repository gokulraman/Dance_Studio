import { DefaultTheme, ThemeProvider as NavigationThemeProvider, type Theme } from 'expo-router';
import { createContext, use, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { deviceStorage } from './device-storage';
import type { Tone } from './format';

const palette = {
  black: '#000000',
  silverLight: '#E6E6E8',
  silverMid: '#A8A9AD',
  steel: '#4A4B4F',
  gold: '#D4A62A',
  deepGold: '#A67C1A',
  paleGold: '#F2CE5C',
  white: '#FFFFFF',
};

export type AppTheme = {
  dark: boolean;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  accent: string;
  danger: string;
  chrome: string;
  chromeText: string;
  chromeAccent: string;
  chromeMuted: string;
  tones: Record<Tone, { bg: string; fg: string; border: string }>;
};

// Headers and the tab bar stay black with gold in both themes; only the content area changes.
const chrome = {
  chrome: palette.black,
  chromeText: palette.paleGold,
  chromeAccent: palette.gold,
  chromeMuted: palette.silverMid,
};

const light: AppTheme = {
  dark: false,
  background: palette.silverLight,
  card: palette.white,
  text: palette.black,
  muted: palette.steel,
  border: palette.silverMid,
  primary: palette.black,
  onPrimary: palette.paleGold,
  accent: palette.deepGold,
  // Errors are the one colour outside the palette: they must read as errors.
  danger: '#B3261E',
  ...chrome,
  tones: {
    good: { bg: palette.paleGold, fg: palette.black, border: palette.paleGold },
    warn: { bg: palette.deepGold, fg: palette.black, border: palette.deepGold },
    bad: { bg: palette.steel, fg: palette.white, border: palette.steel },
    info: { bg: palette.silverLight, fg: palette.black, border: palette.silverMid },
    neutral: { bg: 'transparent', fg: palette.steel, border: palette.silverMid },
  },
};

const dark: AppTheme = {
  dark: true,
  background: palette.black,
  card: palette.black,
  text: palette.silverLight,
  muted: palette.silverMid,
  border: palette.steel,
  primary: palette.gold,
  onPrimary: palette.black,
  accent: palette.paleGold,
  danger: '#FF8A80',
  ...chrome,
  tones: {
    good: { bg: palette.gold, fg: palette.black, border: palette.gold },
    warn: { bg: palette.deepGold, fg: palette.black, border: palette.deepGold },
    bad: { bg: palette.steel, fg: palette.white, border: palette.steel },
    info: { bg: palette.silverMid, fg: palette.black, border: palette.silverMid },
    neutral: { bg: 'transparent', fg: palette.silverMid, border: palette.steel },
  },
};

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dlegacy.theme';

function readChoice(): ThemeChoice {
  const saved = deviceStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

type ThemeState = { theme: AppTheme; choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void };

const ThemeContext = createContext<ThemeState | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const theme = (choice === 'system' ? system === 'dark' : choice === 'dark') ? dark : light;

  const navigationTheme = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      dark: theme.dark,
      colors: {
        primary: theme.chromeAccent,
        background: theme.background,
        card: theme.chrome,
        text: theme.chromeText,
        border: theme.dark ? theme.border : theme.chrome,
        notification: theme.chromeAccent,
      },
    }),
    [theme],
  );

  function setChoice(next: ThemeChoice) {
    if (next === 'system') deviceStorage.removeItem(STORAGE_KEY);
    else deviceStorage.setItem(STORAGE_KEY, next);
    setChoiceState(next);
  }

  return (
    <ThemeContext value={{ theme, choice, setChoice }}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext>
  );
}

function useThemeState() {
  const value = use(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return value;
}

export function useAppTheme() {
  return useThemeState().theme;
}

export function useThemeChoice() {
  const { choice, setChoice } = useThemeState();
  return [choice, setChoice] as const;
}

// Builds a component's styles once per theme instead of once per render.
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T & StyleSheet.NamedStyles<T>) {
  const cache = new Map<AppTheme, T>();
  return function useStyles(): T {
    const theme = useAppTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
