import type { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';

export default function AppProvidersPublic({ children }: PropsWithChildren) {
  return <HelmetProvider>{children}</HelmetProvider>;
}
