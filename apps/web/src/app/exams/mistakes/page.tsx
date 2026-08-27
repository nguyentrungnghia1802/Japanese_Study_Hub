'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, Trash2 } from 'lucide-react';
import type { WrongAnswerReviewQueueDto } from '@japanese-learning/contracts';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-client';
import { invalidateMistakeQueries } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StudySectionTabs } from '@/components/layout/study-section-tabs';
import { groupMistakesByExam } from '@/lib/mistake-groups';

const MISTAKE_QUEUE_LIMIT = 20;
const MISTAKE_QUERY_KEY = queryKeys.mistakes(MISTAKE_QUEUE_LIMIT);

export default function ExamMistakesPage() {
  const queryClient = useQueryClient();
  const mistakesQuery = useQuery({
    queryKey: MISTAKE_QUERY_KEY,
    queryFn: ({ signal }) => studyApi.mistakes(MISTAKE_QUEUE_LIMIT, undefined, signal),
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const mistakes = mistakesQuery.data?.items ?? [];
  const mistakeGroups = groupMistakesByExam(mistakes);

  const dismiss = async (mistakeId: string) => {
    setBusyId(mistakeId);
    setActionError(null);
    try {
      await studyApi.dismissMistake(mistakeId);
      queryClient.setQueryData<WrongAnswerReviewQueueDto>(MISTAKE_QUERY_KEY, (current) =>
        current
          ? {
              ...current,
              items: current.items.filter((item) => item.id !== mistakeId),
              total: Math.max(0, current.total - 1),
            }
          : current,
      );
      await invalidateMistakeQueries(queryClient);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, 'Unable to dismiss this mistake.'));
    } finally {
      setBusyId(null);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Dismiss all submitted mistakes?')) return;
    setBusyId('all');
    setActionError(null);
    try {
      await studyApi.clearMistakes();
      queryClient.setQueryData<WrongAnswerReviewQueueDto>(MISTAKE_QUERY_KEY, {
        items: [],
        total: 0,
      });
      await invalidateMistakeQueries(queryClient);
    } catch (error: unknown) {
      setActionError(getApiErrorMessage(error, 'Unable to clear mistakes.'));
    } finally {
      setBusyId(null);
    }
  };

  if (mistakesQuery.isLoading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <SkeletonBlock height="20rem" />
      </div>
    );
  }

  if (mistakesQuery.isError) {
    return (
      <div
        style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Unable to load mistakes
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {getApiErrorMessage(mistakesQuery.error, 'Please try again.')}
        </p>
        <button
          type="button"
          onClick={() => void mistakesQuery.refetch()}
          style={{
            padding: '0.625rem 1.25rem',
            border: 0,
            borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-brand)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <StudySectionTabs section="exams" />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Link
            href="/exams"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              marginBottom: '1rem',
            }}
          >
            <ArrowLeft size={16} />
            Exams
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} style={{ color: 'var(--accent-amber)' }} />
            <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Review mistakes</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Revisit incorrect or unanswered questions from submitted exams. This queue never changes
            official scores. Each Exam keeps its own three most recent official attempts.
          </p>
        </div>
        {mistakes.length > 0 && (
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={busyId !== null}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.625rem 0.9rem',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.08)',
              color: 'var(--accent-rose)',
              fontWeight: 600,
            }}
          >
            <Trash2 size={15} />
            Clear all
          </button>
        )}
      </div>

      {actionError && (
        <p role="alert" style={{ color: 'var(--accent-rose)', margin: '1rem 0' }}>
          {actionError}
        </p>
      )}

      {mistakes.length === 0 ? (
        <section
          className="glass-panel"
          style={{ marginTop: '2rem', padding: '3rem 2rem', textAlign: 'center' }}
        >
          <Check size={34} style={{ color: 'var(--accent-emerald)', marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No mistakes queued
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Submit an exam with an incorrect or unanswered question to see it here.
          </p>
          <Link href="/exams" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Browse exams
          </Link>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {mistakes.length} of at most {MISTAKE_QUEUE_LIMIT} queued mistakes across{' '}
            {mistakeGroups.length} Exam{mistakeGroups.length === 1 ? '' : 's'}. Each Exam has an
            independent retention window.
          </p>
          {mistakeGroups.map((group) => (
            <section
              key={`${group.examId}:${group.examVersion}`}
              aria-labelledby={`mistake-group-${group.examId}-${group.examVersion}`}
              style={{ display: 'grid', gap: '0.75rem' }}
            >
              <div
                className="glass-panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '1rem 1.25rem',
                }}
              >
                <div>
                  <h2
                    id={`mistake-group-${group.examId}-${group.examVersion}`}
                    style={{ color: 'var(--accent-cyan)', fontSize: '1rem', margin: 0 }}
                  >
                    {group.examTitle}
                  </h2>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      margin: '0.25rem 0 0',
                    }}
                  >
                    {group.items.length} câu · Content version {group.examVersion} · 3 lần thi chính
                    thức gần nhất
                  </p>
                </div>
                <Link
                  href={`/exams/${group.examId}/mistakes`}
                  style={{ color: 'var(--accent-purple)', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Xem 3 lịch sử gần nhất
                </Link>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {group.items.map((mistake) => (
                  <article key={mistake.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Câu hỏi trong {mistake.examTitle}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => void dismiss(mistake.id)}
                          disabled={busyId !== null}
                          aria-label={`Dismiss mistake from ${mistake.examTitle}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.65rem',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Trash2 size={14} />
                          Dismiss
                        </button>
                        <Link
                          href={`/exams/practice?examId=${encodeURIComponent(mistake.examId)}&mistakeIds=${encodeURIComponent(mistake.id)}`}
                          style={{
                            color: 'var(--accent-cyan)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            alignSelf: 'center',
                          }}
                        >
                          Practice
                        </Link>
                      </div>
                    </div>
                    <h3
                      style={{
                        color: 'var(--text-primary)',
                        fontSize: '1.1rem',
                        lineHeight: 1.5,
                        margin: '1rem 0',
                      }}
                    >
                      {mistake.questionContent}
                    </h3>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {mistake.options.map((option) => (
                        <div
                          key={option.id}
                          style={{
                            padding: '0.7rem 0.8rem',
                            borderRadius: 'var(--radius-md)',
                            border:
                              option.id === mistake.selectedOptionId
                                ? '1px solid rgba(251, 191, 36, 0.55)'
                                : '1px solid var(--border-subtle)',
                            background:
                              option.id === mistake.selectedOptionId
                                ? 'rgba(251, 191, 36, 0.1)'
                                : 'rgba(15, 23, 42, 0.28)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {option.content}
                          {option.id === mistake.selectedOptionId && (
                            <span
                              style={{
                                color: 'var(--accent-amber)',
                                fontSize: '0.8rem',
                                marginLeft: '0.5rem',
                              }}
                            >
                              Your answer
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {mistake.selectedOptionId === null && (
                      <p
                        style={{
                          color: 'var(--accent-amber)',
                          fontSize: '0.8rem',
                          margin: '0.75rem 0 0',
                        }}
                      >
                        Unanswered in the submitted attempt.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
