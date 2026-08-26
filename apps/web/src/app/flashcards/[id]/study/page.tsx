'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { FlashcardDto } from '@japanese-learning/contracts';
import { getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';

export default function FlashcardStudyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const setQuery = useQuery({
    queryKey: queryKeys.flashcardSet(id),
    queryFn: ({ signal }) => studyApi.flashcardSet(id, signal),
    enabled: Boolean(id),
  });
  const set = setQuery.data ?? null;
  const [cards, setCards] = useState<FlashcardDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isLoading = setQuery.isLoading;
  const initializedSetVersion = useRef<string | null>(null);

  useEffect(() => {
    if (!set) return;
    const version = `${set.id}:${set.updatedAt}`;
    if (initializedSetVersion.current === version) return;
    initializedSetVersion.current = version;
    setCards(set.cards || []);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setIsCompleted(false);
  }, [set]);

  const handleToggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, cards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleToggleShuffle = useCallback(() => {
    if (!set || !set.cards) return;
    setIsFlipped(false);
    setCurrentIndex(0);
    setIsCompleted(false);

    if (!isShuffled) {
      const shuffled = [...set.cards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setIsShuffled(true);
    } else {
      setCards(set.cards);
      setIsShuffled(false);
    }
  }, [isShuffled, set]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleToggleShuffle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleFlip, handleNext, handlePrev, handleToggleShuffle, isCompleted]);

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Preparing flashcard session...</p>
      </div>
    );
  }

  if (setQuery.isError || !set || cards.length === 0) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {setQuery.isError
            ? getApiErrorMessage(setQuery.error, 'Unable to load this deck')
            : 'No cards available to study in this deck'}
        </h2>
        <button
          onClick={() => router.push(`/flashcards/${id}`)}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--gradient-brand)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
          }}
        >
          Go to Deck Editor
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <Link
          href={`/flashcards/${id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Exit Study Mode</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleToggleShuffle}
            title="Toggle shuffle (Press S)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: isShuffled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: isShuffled
                ? '1px solid var(--accent-cyan)'
                : '1px solid var(--border-subtle)',
              color: isShuffled ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: '500',
            }}
          >
            <Shuffle size={14} />
            <span>{isShuffled ? 'Shuffled' : 'Shuffle'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{set.title}</span>
          <span style={{ color: 'var(--text-muted)' }}>
            Card {currentIndex + 1} of {cards.length} ({progressPercent}%)
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'var(--gradient-brand)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Completion View */}
      {isCompleted ? (
        <div
          className="glass-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Session Complete!
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '400px',
              marginBottom: '2rem',
              fontSize: '0.9375rem',
              lineHeight: '1.6',
            }}
          >
            You completed all {cards.length} flashcards in <strong>{set.title}</strong>. Great job
            practicing your Japanese!
          </p>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleRestart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              <RotateCw size={15} />
              <span>Study Again</span>
            </button>

            <Link
              href={`/flashcards/${id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.625rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <BookOpen size={15} />
              <span>Return to Deck</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Active Card Study Area */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Flashcard 3D Perspective Card */}
          <div
            onClick={handleToggleFlip}
            style={{
              flex: 1,
              minHeight: '340px',
              perspective: '1000px',
              cursor: 'pointer',
              marginBottom: '1.5rem',
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                height: '100%',
                minHeight: '340px',
                borderRadius: 'var(--radius-lg)',
                padding: '2.5rem',
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
              {/* Badge indicator */}
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

              {/* Card Body */}
              <div style={{ width: '100%', padding: '1rem 0' }}>
                {!isFlipped ? (
                  <div
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      letterSpacing: '0.02em',
                      lineHeight: '1.4',
                    }}
                  >
                    {currentCard.front}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#f1f5f9',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {currentCard.back}
                  </div>
                )}
              </div>

              {/* Flip Hint */}
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
                <span>Click card or press Space to flip</span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: currentIndex === 0 ? '#475569' : 'var(--text-primary)',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            <button
              onClick={handleToggleFlip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: 'var(--accent-cyan)',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              <RotateCw size={15} />
              <span>Flip Card</span>
            </button>

            <button
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <span>{currentIndex === cards.length - 1 ? 'Finish' : 'Next'}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
