'use client';

import React from 'react';
import { RotateCw } from 'lucide-react';

interface FlashcardFlipCardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onToggleFlip: () => void;
  hint?: string;
}

export function FlashcardFlipCard({
  front,
  back,
  isFlipped,
  onToggleFlip,
  hint = 'Click card or press Space to flip',
}: FlashcardFlipCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    onToggleFlip();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? 'Show front of flashcard' : 'Reveal flashcard answer'}
      aria-pressed={isFlipped}
      onClick={onToggleFlip}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        minHeight: 'clamp(400px, 56vh, 620px)',
        perspective: '1000px',
        position: 'relative',
        cursor: 'pointer',
        marginBottom: '1.5rem',
        outline: 'none',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          height: '100%',
          minHeight: 'clamp(400px, 56vh, 620px)',
          borderRadius: 'var(--radius-lg)',
          padding: '3.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          border: isFlipped
            ? '1px solid rgba(168, 85, 247, 0.4)'
            : '1px solid rgba(56, 189, 248, 0.4)',
          background: isFlipped
            ? 'radial-gradient(ellipse at top, rgba(88, 28, 135, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'radial-gradient(ellipse at top, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
          transition: 'transform 0.4s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '1.25rem',
            left: '1.5rem',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.05em',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            background: isFlipped ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
            color: isFlipped ? 'var(--accent-purple)' : 'var(--accent-cyan)',
          }}
        >
          {isFlipped ? 'BACK / MEANING' : 'FRONT / PROMPT'}
        </div>

        <div style={{ width: '100%', padding: '1rem 0' }}>
          {!isFlipped ? (
            <div
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: '800',
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
                lineHeight: '1.4',
              }}
            >
              {front}
            </div>
          ) : (
            <div
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)',
                fontWeight: '600',
                color: '#f1f5f9',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
              }}
            >
              {back}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '1.25rem',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <RotateCw size={12} />
          <span>{hint}</span>
        </div>
      </div>
    </div>
  );
}
