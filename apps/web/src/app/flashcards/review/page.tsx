'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import type {
  FlashcardReviewQueueItemDto,
  FlashcardReviewRating,
} from '@japanese-learning/contracts';
import { FlashcardFlipCard } from '@/components/flashcards/flashcard-flip-card';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-client';
import { invalidateReviewQueries } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';

const REVIEW_QUEUE_LIMIT = 20;
const REVIEW_QUEUE_QUERY_KEY = queryKeys.reviewQueue(REVIEW_QUEUE_LIMIT);
const REVIEW_SUMMARY_QUERY_KEY = queryKeys.reviewSummary();
const RATINGS: Array<{
  value: FlashcardReviewRating;
  label: string;
  hint: string;
  color: string;
  background: string;
}> = [
  {
    value: 'AGAIN',
    label: 'Again',
    hint: 'Repeat soon',
    color: '#fb7185',
    background: 'rgba(244, 63, 94, 0.12)',
  },
  {
    value: 'HARD',
    label: 'Hard',
    hint: 'Needs effort',
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.12)',
  },
  {
    value: 'GOOD',
    label: 'Good',
    hint: 'Keep learning',
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.12)',
  },
  {
    value: 'EASY',
    label: 'Easy',
    hint: 'Well known',
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
  },
];

function createReviewRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function FlashcardReviewPage() {
  const queryClient = useQueryClient();
  const queueQuery = useQuery({
    queryKey: REVIEW_QUEUE_QUERY_KEY,
    queryFn: ({ signal }) => studyApi.reviewQueue(REVIEW_QUEUE_LIMIT, signal),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
  const summaryQuery = useQuery({
    queryKey: REVIEW_SUMMARY_QUERY_KEY,
    queryFn: ({ signal }) => studyApi.reviewSummary(signal),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const [cards, setCards] = useState<FlashcardReviewQueueItemDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const initialized = useRef(false);
  const requestIds = useRef(new Map<string, string>());

  useEffect(() => {
    if (initialized.current || !queueQuery.data) return;
    initialized.current = true;
    setCards(queueQuery.data.cards);
  }, [queueQuery.data]);

  const currentCard = cards[currentIndex];
  const isLoading = queueQuery.isLoading || (!initialized.current && !queueQuery.isError);
  const isEmpty = initialized.current && !currentCard && !isSubmitting;
  const progressTotal = reviewedCount + cards.length;
  const progress = progressTotal > 0 ? Math.round((reviewedCount / progressTotal) * 100) : 100;

  useEffect(() => {
    if (!initialized.current || cards.length === 0 || cards.length - currentIndex > 3) return;
    void queryClient.prefetchQuery({
      queryKey: REVIEW_QUEUE_QUERY_KEY,
      queryFn: ({ signal }) => studyApi.reviewQueue(REVIEW_QUEUE_LIMIT, signal),
      staleTime: 0,
    });
  }, [cards.length, currentIndex, queryClient]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || isSubmitting) return;
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        setIsFlipped((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, isSubmitting]);

  const handleRate = async (rating: FlashcardReviewRating) => {
    if (!currentCard || !isFlipped || isSubmitting) return;

    const requestKey = `${currentCard.id}:${rating}`;
    const clientRequestId = requestIds.current.get(requestKey) ?? createReviewRequestId();
    requestIds.current.set(requestKey, clientRequestId);
    setIsSubmitting(true);
    setActionError(null);

    try {
      await studyApi.submitReview(currentCard.id, { rating, clientRequestId });
      const remainingCards = cards.filter((card) => card.id !== currentCard.id);
      const nextReviewedCount = reviewedCount + 1;
      queryClient.setQueryData<typeof queueQuery.data>(REVIEW_QUEUE_QUERY_KEY, (current) =>
        current
          ? { ...current, cards: current.cards.filter((card) => card.id !== currentCard.id) }
          : current,
      );
      await invalidateReviewQueries(queryClient);
      setReviewedCount(nextReviewedCount);
      setIsFlipped(false);

      if (remainingCards.length > 0) {
        setCards(remainingCards);
        setCurrentIndex(Math.min(currentIndex, remainingCards.length - 1));
        return;
      }

      const nextBatch = await queryClient.fetchQuery({
        queryKey: REVIEW_QUEUE_QUERY_KEY,
        queryFn: ({ signal }) => studyApi.reviewQueue(REVIEW_QUEUE_LIMIT, signal),
        staleTime: 0,
      });
      if (nextBatch.cards.length > 0) {
        setCards(nextBatch.cards);
        setCurrentIndex(0);
      } else {
        setCards([]);
        setCurrentIndex(0);
      }
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, 'Unable to submit this review. Try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    initialized.current = false;
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setActionError(null);
    void Promise.all([queueQuery.refetch(), summaryQuery.refetch()]);
  };

  if (isLoading) {
    return (
      <div aria-busy="true" style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <SkeletonBlock height="24rem" />
      </div>
    );
  }

  if (queueQuery.isError) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {getApiErrorMessage(queueQuery.error, 'Unable to load review queue')}
        </h2>
        <button
          type="button"
          onClick={handleRetry}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'var(--gradient-brand)',
            color: '#fff',
            border: 0,
            borderRadius: 'var(--radius-md)',
            fontWeight: '600',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <Link
          href="/flashcards"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Exit Review</span>
        </Link>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'right' }}>
          <div>Due {summaryQuery.data?.dueCount ?? '—'}</div>
          <div>New {summaryQuery.data?.newCount ?? '—'}</div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--brand-primary)' }} />
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem' }}>
              Review due cards
            </h1>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {reviewedCount} reviewed · {cards.length} in batch
          </span>
        </div>
        <div
          aria-label={`Review progress ${progress}%`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
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
              width: `${progress}%`,
              height: '100%',
              background: 'var(--gradient-brand)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>
      </div>

      {isEmpty ? (
        <div
          className="glass-panel"
          style={{
            flex: 1,
            minHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <CheckCircle2
            size={48}
            style={{ color: 'var(--accent-emerald)', marginBottom: '1rem' }}
          />
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>All caught up</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.6' }}>
            There are no due cards right now. Rate cards again later when FSRS schedules them.
          </p>
          <Link
            href="/flashcards"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.625rem 1.25rem',
              background: 'var(--gradient-brand)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
            }}
          >
            <BookOpen size={15} />
            Study All / Shuffle
          </Link>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <FlashcardFlipCard
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onToggleFlip={() => setIsFlipped((previous) => !previous)}
            hint={isFlipped ? 'Choose a rating below' : 'Reveal the answer before rating'}
          />

          {actionError && (
            <div
              role="alert"
              style={{
                color: 'var(--accent-rose)',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                style={{ color: 'inherit', background: 'transparent', border: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div
            aria-label="FSRS review ratings"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '0.65rem',
              marginBottom: '1rem',
            }}
          >
            {RATINGS.map((rating) => (
              <button
                key={rating.value}
                type="button"
                disabled={!isFlipped || isSubmitting}
                onClick={() => void handleRate(rating.value)}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isFlipped ? rating.color : 'var(--border-subtle)'}`,
                  background: isFlipped ? rating.background : 'rgba(255, 255, 255, 0.03)',
                  color: isFlipped ? rating.color : 'var(--text-muted)',
                  opacity: isFlipped && !isSubmitting ? 1 : 0.55,
                  cursor: isFlipped && !isSubmitting ? 'pointer' : 'not-allowed',
                  fontWeight: '700',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <span>{isSubmitting ? 'Saving…' : rating.label}</span>
                <small style={{ fontWeight: '400', fontSize: '0.7rem' }}>{rating.hint}</small>
              </button>
            ))}
          </div>

          <p
            style={{
              margin: 0,
              color: 'var(--text-muted)',
              textAlign: 'center',
              fontSize: '0.8rem',
            }}
          >
            {isFlipped
              ? 'Select how well you recalled this card.'
              : 'Flip the card to reveal the meaning, then choose Again, Hard, Good, or Easy.'}
          </p>
        </div>
      )}
    </div>
  );
}
