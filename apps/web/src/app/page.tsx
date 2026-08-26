'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  FileCheck,
  Award,
  Sparkles,
  Play,
  ArrowRight,
  Plus,
  Upload,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';

const FlashcardImportModal = dynamic(
  () =>
    import('@/components/flashcards/flashcard-import-modal').then(
      (module) => module.FlashcardImportModal,
    ),
  { ssr: false },
);
const ExamImportModal = dynamic(
  () => import('@/components/exams/exam-import-modal').then((module) => module.ExamImportModal),
  { ssr: false },
);

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: ({ signal }) => studyApi.dashboard(signal),
  });
  const summary = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const isRefreshing = dashboardQuery.isFetching && !isLoading;

  // Modals
  const [isFlashcardImportOpen, setIsFlashcardImportOpen] = useState(false);
  const [isExamImportOpen, setIsExamImportOpen] = useState(false);

  return (
    <div
      aria-busy={isLoading}
      style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem 5rem' }}
    >
      {isRefreshing && (
        <div
          role="status"
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}
        >
          Refreshing your learning summary…
        </div>
      )}
      {dashboardQuery.isError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--accent-rose)',
            marginBottom: '1rem',
          }}
        >
          <span>
            {getApiErrorMessage(dashboardQuery.error, 'Unable to load dashboard summary.')}
          </span>
          <button
            type="button"
            onClick={() => void dashboardQuery.refetch()}
            style={{ color: 'var(--brand-primary)', background: 'transparent', fontWeight: '600' }}
          >
            Retry
          </button>
        </div>
      )}
      {/* Welcome Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '700px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--brand-primary)',
              fontSize: '0.875rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
            }}
          >
            <Sparkles size={16} />
            <span>WELCOME BACK</span>
          </div>
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
              lineHeight: '1.2',
            }}
          >
            Konnichiwa, {user?.username || 'Learner'}!
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.0625rem',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
            }}
          >
            Ready to review Japanese vocabulary and practice with JLPT mock examinations?
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/flashcards"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <BookOpen size={16} />
              <span>Study Flashcards</span>
            </Link>

            <Link
              href="/exams"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--accent-cyan)',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <FileCheck size={16} />
              <span>Take Mock Exams</span>
            </Link>
          </div>
        </div>
      </div>

      {summary?.recentLearning && summary.recentLearning.length > 0 && (
        <section
          aria-labelledby="continue-learning-heading"
          className="glass-panel"
          style={{ padding: '1.5rem', marginBottom: '2.5rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              id="continue-learning-heading"
              style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}
            >
              Continue learning
            </h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recent activity</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {summary.recentLearning.map((item) => (
              <Link
                key={`${item.kind}-${item.entityId}`}
                href={item.href}
                className="card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {item.kind === 'FLASHCARD_SET'
                      ? `${item.cardCount ?? 0} cards`
                      : `${item.questionCount ?? 0} questions`}
                  </span>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div
          className="glass-panel"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Flashcard Sets
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              <BookOpen size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {isLoading ? (
              <SkeletonBlock width="3.25rem" height="2.4rem" />
            ) : (
              summary?.totalFlashcardSets || 0
            )}
          </div>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Total Cards
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {isLoading ? (
              <SkeletonBlock width="3.25rem" height="2.4rem" />
            ) : (
              summary?.totalCards || 0
            )}
          </div>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              Available Exams
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <FileCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {isLoading ? (
              <SkeletonBlock width="3.25rem" height="2.4rem" />
            ) : (
              summary?.totalExams || 0
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Content: Recent Flashcards & Recent Exams */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}
      >
        {/* Left: Recent Flashcard Sets */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} />
              <span>Recent Flashcard Decks</span>
            </h2>
            <Link
              href="/flashcards"
              style={{
                fontSize: '0.875rem',
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isLoading ? (
              [1, 2].map((item) => (
                <div key={item} className="glass-panel" style={{ padding: '1.25rem' }}>
                  <SkeletonBlock width="65%" height="1.15rem" />
                  <div style={{ marginTop: '0.6rem' }}>
                    <SkeletonBlock width="30%" height="0.75rem" />
                  </div>
                </div>
              ))
            ) : summary?.recentFlashcardSets && summary.recentFlashcardSets.length > 0 ? (
              summary.recentFlashcardSets.map((set) => (
                <div
                  key={set.id}
                  className="glass-panel card-interactive"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {set.title}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {set.cardCount} cards
                    </span>
                  </div>
                  <Link
                    href={`/flashcards/${set.id}/study`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--brand-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    <Play size={12} />
                    <span>Study</span>
                  </Link>
                </div>
              ))
            ) : (
              <div
                className="glass-panel"
                style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                No decks yet. Create your first flashcard deck!
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Exams & Best Scores */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FileCheck size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Recent JLPT Mock Tests</span>
            </h2>
            <Link
              href="/exams"
              style={{
                fontSize: '0.875rem',
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isLoading ? (
              [1, 2].map((item) => (
                <div key={item} className="glass-panel" style={{ padding: '1.25rem' }}>
                  <SkeletonBlock width="65%" height="1.15rem" />
                  <div style={{ marginTop: '0.6rem' }}>
                    <SkeletonBlock width="45%" height="0.75rem" />
                  </div>
                </div>
              ))
            ) : summary?.recentExams && summary.recentExams.length > 0 ? (
              summary.recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="glass-panel card-interactive"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {exam.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {exam.questionCount} questions
                      </span>
                      {exam.bestScore !== null && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--accent-emerald)',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Award size={12} />
                          <span>Best: {exam.bestScore}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/exams/${exam.id}/take`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.8125rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                    }}
                  >
                    <Play size={12} />
                    <span>Take</span>
                  </Link>
                </div>
              ))
            ) : (
              <div
                className="glass-panel"
                style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                No exams yet. Create or import your first JLPT mock test!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div
        className="glass-panel"
        style={{ padding: '1.5rem 2rem', borderRadius: 'var(--radius-lg)' }}
      >
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
          }}
        >
          Quick Actions & Tools
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsFlashcardImportOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--brand-primary)',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            <Upload size={16} />
            <span>Import Flashcards (.md)</span>
          </button>

          <button
            onClick={() => setIsExamImportOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            <Upload size={16} />
            <span>Import Exam (.md)</span>
          </button>

          <Link
            href="/flashcards"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            <span>Create Flashcard Set</span>
          </Link>

          <Link
            href="/exams"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            <Plus size={16} />
            <span>Create New Exam</span>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <FlashcardImportModal
        isOpen={isFlashcardImportOpen}
        onClose={() => setIsFlashcardImportOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
        }}
      />

      <ExamImportModal
        isOpen={isExamImportOpen}
        onClose={() => setIsExamImportOpen(false)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
        }}
      />
    </div>
  );
}
