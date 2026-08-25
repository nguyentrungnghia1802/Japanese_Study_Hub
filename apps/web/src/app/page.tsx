'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { DashboardSummaryDto } from '@japanese-learning/contracts';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { FlashcardImportModal } from '@/components/flashcards/flashcard-import-modal';
import { ExamImportModal } from '@/components/exams/exam-import-modal';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isFlashcardImportOpen, setIsFlashcardImportOpen] = useState(false);
  const [isExamImportOpen, setIsExamImportOpen] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await apiClient<DashboardSummaryDto>('/dashboard/summary');
        setSummary(data);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem 5rem' }}>
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
            {summary?.totalFlashcardSets || 0}
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
            {summary?.totalCards || 0}
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
            {summary?.totalExams || 0}
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
            {summary?.recentFlashcardSets && summary.recentFlashcardSets.length > 0 ? (
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
            {summary?.recentExams && summary.recentExams.length > 0 ? (
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
          // reload summary
          apiClient<DashboardSummaryDto>('/dashboard/summary')
            .then((d) => setSummary(d))
            .catch(() => {});
        }}
      />

      <ExamImportModal
        isOpen={isExamImportOpen}
        onClose={() => setIsExamImportOpen(false)}
        onSuccess={() => {
          // reload summary
          apiClient<DashboardSummaryDto>('/dashboard/summary')
            .then((d) => setSummary(d))
            .catch(() => {});
        }}
      />
    </div>
  );
}
