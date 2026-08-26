'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { shouldPrefetchRoute } from '@/lib/prefetch-policy';

type PrefetchLinkProps = React.ComponentProps<typeof Link>;

export function PrefetchLink({ href, onMouseEnter, onFocus, ...props }: PrefetchLinkProps) {
  const router = useRouter();
  const target = typeof href === 'string' ? href : href.pathname || '';

  const prefetch = () => {
    if (shouldPrefetchRoute(target)) router.prefetch(target);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetch();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetch();
      }}
    />
  );
}
