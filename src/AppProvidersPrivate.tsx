import type { PropsWithChildren } from 'react';
import { AppProvider } from '@/context/AppContext';

export default function AppProvidersPrivate({ children }: PropsWithChildren) {
  return <AppProvider>{children}</AppProvider>;
}
