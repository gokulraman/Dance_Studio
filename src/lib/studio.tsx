import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from './supabase';

export type Studio = { id: number; name: string };

type StudioState = { studio: Studio | null; error: string | null; isLoading: boolean };

const StudioContext = createContext<StudioState | null>(null);

// V1 is one studio per owner; row-level security only returns studios this login belongs to.
export function StudioProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StudioState>({ studio: null, error: null, isLoading: true });

  useEffect(() => {
    supabase
      .from('studios')
      .select('id, name')
      .order('id')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => setState({ studio: data as Studio | null, error: error?.message ?? null, isLoading: false }));
  }, []);

  return <StudioContext value={state}>{children}</StudioContext>;
}

export function useStudio() {
  const value = use(StudioContext);
  if (!value) throw new Error('useStudio must be used inside <StudioProvider>');
  return value;
}

export function useStudioId() {
  const { studio } = useStudio();
  if (!studio) throw new Error('No studio loaded');
  return studio.id;
}
