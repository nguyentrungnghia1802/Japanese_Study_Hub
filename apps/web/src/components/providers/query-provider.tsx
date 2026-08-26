'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createStudyQueryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createStudyQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
