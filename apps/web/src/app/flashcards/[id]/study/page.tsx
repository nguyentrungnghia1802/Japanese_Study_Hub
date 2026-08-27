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
  Languages,
} from 'lucide-react';
import { FlashcardDto } from '@japanese-learning/contracts';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  clearFlashcardStudyContinuity,
  readFlashcardStudyContinuity,
  resolveFlashcardStudyOrder,
  writeFlashcardStudyContinuity,
} from '@/lib/continuity';
import { CACHE_POLICY } from '@/lib/cache-policy';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { FlashcardFlipCard } from '@/components/flashcards/flashcard-flip-card';
import { StudySectionTabs } from '@/components/layout/study-section-tabs';

export default function FlashcardStudyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const setQuery = useQuery({
    queryKey: queryKeys.flashcardSet(id),
    queryFn: ({ signal }) => studyApi.flashcardSet(id, signal),
    enabled: Boolean(id),
    staleTime: CACHE_POLICY.entityDetail.staleTime,
    gcTime: CACHE_POLICY.entityDetail.gcTime,
  });
  const set = setQuery.data ?? null;
  const [cards, setCards] = useState<FlashcardDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isLoading = setQuery.isLoading;
  const initializedSetVersion = useRef<string | null>(null);
  const hasInitializedStudyState = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!set) return;
    const version = `${set.id}:${set.updatedAt}`;
    if (initializedSetVersion.current === version) return;
    initializedSetVersion.current = version;

    const sourceCards = set.cards || [];
    const sourceCardIds = sourceCards.map((card) => card.id);
    const saved = readFlashcardStudyContinuity(set.id);
    const restoredOrder = resolveFlashcardStudyOrder(saved, sourceCardIds);

    if (saved && restoredOrder) {
      const cardsById = new Map(sourceCards.map((card) => [card.id, card]));
      const restoredCards = restoredOrder
        .map((cardId) => cardsById.get(cardId))
        .filter((card): card is FlashcardDto => Boolean(card));
      const restoredIndex = saved.currentCardId
        ? restoredOrder.indexOf(saved.currentCardId)
        : saved.currentIndex;
      sessionIdRef.current = saved.sessionId;
      setCards(restoredCards);
      setCurrentIndex(Math.min(Math.max(restoredIndex, 0), Math.max(restoredCards.length - 1, 0)));
      setIsFlipped(saved.isFlipped);
      setIsShuffled(saved.isShuffled);
      setIsCompleted(saved.isCompleted);
    } else {
      if (saved) clearFlashcardStudyContinuity(set.id);
      sessionIdRef.current =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `study-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setCards(sourceCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsShuffled(false);
      setIsCompleted(false);
    }
    hasInitializedStudyState.current = true;
  }, [set]);

  useEffect(() => {
    if (!set || !hasInitializedStudyState.current || cards.length === 0) return;
    writeFlashcardStudyContinuity({
      setId: set.id,
      sessionId: sessionIdRef.current ?? `study-${set.id}`,
      cardIds: cards.map((card) => card.id),
      currentCardId: cards[currentIndex]?.id ?? null,
      currentIndex,
      isFlipped,
      isShuffled,
      isCompleted,
      progress: isCompleted ? 100 : Math.round(((currentIndex + 1) / cards.length) * 100),
      returnTo: `/flashcards/${set.id}/study`,
    });
  }, [cards, currentIndex, isCompleted, isFlipped, isShuffled, set]);

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
        aria-busy="true"
        style={{ maxWidth: '1040px', margin: '0 auto', padding: '4rem 1.5rem' }}
      >
        <SkeletonBlock height="24rem" />
      </div>
    );
  }

  if (setQuery.isError || !set || cards.length === 0) {
    return (
      <div
        style={{
          maxWidth: '1040px',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {setQuery.isError
            ? getApiErrorMessage(setQuery.error, 'Unable to load this deck')
            : 'No cards available to study in this deck'}
        </h2>
        <button
          type="button"
          onClick={() => void setQuery.refetch()}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'var(--gradient-brand)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            marginRight: '0.5rem',
          }}
        >
          Retry
        </button>
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
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <StudySectionTabs section="flashcards" />
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
          <Link
            href={`/lookup?returnTo=${encodeURIComponent(`/flashcards/${id}/study`)}`}
            onClick={() => {
              if (!set || cards.length === 0) return;
              writeFlashcardStudyContinuity({
                setId: set.id,
                sessionId: sessionIdRef.current ?? `study-${set.id}`,
                cardIds: cards.map((card) => card.id),
                currentCardId: cards[currentIndex]?.id ?? null,
                currentIndex,
                isFlipped,
                isShuffled,
                isCompleted,
                progress: isCompleted ? 100 : Math.round(((currentIndex + 1) / cards.length) * 100),
                returnTo: `/flashcards/${id}/study`,
              });
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '0.8125rem',
              fontWeight: '600',
            }}
          >
            <Languages size={14} />
            <span>Lookup</span>
          </Link>
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
          <FlashcardFlipCard
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onToggleFlip={handleToggleFlip}
          />

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
