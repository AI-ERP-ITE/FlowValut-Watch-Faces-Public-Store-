import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { StoreReadModel } from '@/lib/storeReadModel';

const Context = createContext<{ data: StoreReadModel | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });

export function StoreReadModelProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreReadModel | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const base = ((import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined) || (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined) || '').replace(/\/$/, '');
    if (!base) { setError('Store hierarchy service is unavailable.'); setLoading(false); return; }
    fetch(`${base}/publicStoreHierarchy`).then(async (response) => { if (!response.ok) throw new Error(`Store hierarchy request failed (${response.status})`); return response.json(); }).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Store hierarchy failed')).finally(() => setLoading(false));
  }, []);
  return <Context.Provider value={{ data, loading, error }}>{children}</Context.Provider>;
}

export function useStoreReadModel() { return useContext(Context); }
