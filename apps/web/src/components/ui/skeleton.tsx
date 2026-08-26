import React from 'react';

export function SkeletonBlock({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-md)',
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(148, 163, 184, 0.14)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}
