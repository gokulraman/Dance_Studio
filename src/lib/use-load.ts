import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type Result<T> = { data: T | null; error: { message: string } | null };

// Pass a module-level fetch function so its identity is stable; data reloads whenever the screen gains focus.
export function useLoad<A, T>(fetcher: (arg: A) => PromiseLike<Result<T>>, arg: A) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await fetcher(arg);
    setError(result.error?.message ?? null);
    setData(result.data);
    setIsLoading(false);
  }, [fetcher, arg]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { data, error, isLoading, reload };
}
