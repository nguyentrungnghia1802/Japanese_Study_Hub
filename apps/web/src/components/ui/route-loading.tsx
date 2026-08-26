import React from 'react';

export function RouteLoading({ label = 'Loading Japanese Study Hub...' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '45vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--text-secondary)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid rgba(56, 189, 248, 0.2)',
          borderTopColor: 'var(--accent-cyan)',
          animation: 'route-loading-spin 1s linear infinite',
        }}
      />
      <span>{label}</span>
    </div>
  );
}
