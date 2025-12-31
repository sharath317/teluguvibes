'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
