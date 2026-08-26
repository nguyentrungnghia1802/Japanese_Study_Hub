'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Send, XCircle } from 'lucide-react';
import type { ExamAttemptResultDto, LiveExamAttemptDto } from '@japanese-learning/contracts';
import { getApiErrorMessage } from '@/lib/api-client';
import { invalidateExamQueries } from '@/lib/query-invalidation';
import { studyApi } from '@/lib/study-api';
import { useQueryClient } from '@tanstack/react-query';

export const dynamic = 'force-dynamic';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function parseMistakeIds(searchParams: URLSearchParams): string[] {
  return Array.from(new Set(searchParams.getAll('mistakeIds').flatMap((value) => value.split(','))))
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function ExamPracticePage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const examId = searchParams.get('examId') ?? '';
  const mistakeIds = useMemo(() => parseMistakeIds(searchParams), [searchParams]);
  const mistakeKey = mistakeIds.join(',');
  const [attempt, setAttempt] = useState<LiveExamAttemptDto | null>(null);
  const [result, setResult] = useState<ExamAttemptResultDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!examId || mistakeIds.length === 0) {
      setIsLoading(false);
      setError('This practice link is missing an exam or mistake selection.');
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setError(null);
    setAttempt(null);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    void studyApi
      .startMistakePractice({ examId, mistakeIds })
      .then((nextAttempt) => {
        if (cancelled) return;
        setAttempt(nextAttempt);
        setAnswers(nextAttempt.savedAnswers ?? {});
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, 'Unable to start practice.'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examId, mistakeKey, mistakeIds]);

  const currentQuestion = attempt?.questions[currentIndex];

  const submit = async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const nextResult = await studyApi.submitAttempt(
        attempt.attemptId,
        { answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId })) },
      );
      setResult(nextResult);
      await invalidateExamQueries(queryClient, attempt.examId);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Unable to submit practice.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PracticeShell><p role="status">Preparing Practice mode…</p></PracticeShell>;
  }

  if (error || !attempt) {
    return (
      <PracticeShell>
        <AlertTriangle size={36} style={{ color: 'var(--accent-rose)' }} />
        <h1 style={{ color: 'var(--text-primary)' }}>Unable to start Practice</h1>
        <p role="alert" style={{ color: 'var(--text-secondary)' }}>{error ?? 'Practice is unavailable.'}</p>
        <Link href="/exams/mistakes" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to mistakes
        </Link>
      </PracticeShell>
    );
  }

  if (result) {
    return <PracticeResult result={result} />;
  }

  if (!currentQuestion) {
    return <PracticeShell><p role="alert">Practice has no available questions.</p></PracticeShell>;
  }

  const selectedOptionId = answers[currentQuestion.id] ?? null;
  return (
    <main style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <Link href="/exams/mistakes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Exit Practice
      </Link>
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ display: 'inline-block', color: 'var(--accent-amber)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em' }}>PRACTICE MODE</span>
            <h1 style={{ color: 'var(--text-primary)', margin: '0.35rem 0 0' }}>{attempt.examTitle}</h1>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Question {currentIndex + 1} / {attempt.questions.length}</span>
        </div>
        <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.2)', marginTop: '1rem' }}>
          <div style={{ width: `${((currentIndex + 1) / attempt.questions.length) * 100}%`, height: '100%', borderRadius: 'inherit', background: 'var(--gradient-brand)' }} />
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '1.5rem' }} aria-labelledby="practice-question">
        <h2 id="practice-question" style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '1.25rem' }}>{currentQuestion.content}</h2>
        <div role="radiogroup" aria-label="Practice answers" style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
          {currentQuestion.options.map((option, optionIndex) => {
            const selected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option.id }))}
                style={{ textAlign: 'left', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: selected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)', background: selected ? 'rgba(99, 102, 241, 0.14)' : 'rgba(15, 23, 42, 0.28)', color: 'var(--text-primary)' }}
              >
                <strong style={{ color: selected ? 'var(--brand-primary)' : 'var(--text-muted)', marginRight: '0.65rem' }}>{OPTION_LETTERS[optionIndex] ?? optionIndex + 1}.</strong>
                {option.content}
              </button>
            );
          })}
        </div>
        {error && <p role="alert" style={{ color: 'var(--accent-rose)' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0 || isSubmitting} style={secondaryButtonStyle}>
            <ChevronLeft size={16} /> Previous
          </button>
          {currentIndex < attempt.questions.length - 1 ? (
            <button type="button" onClick={() => setCurrentIndex((index) => Math.min(attempt.questions.length - 1, index + 1))} disabled={isSubmitting} style={primaryButtonStyle}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={() => void submit()} disabled={isSubmitting} style={primaryButtonStyle}>
              <Send size={16} /> {isSubmitting ? 'Submitting…' : 'Submit Practice'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function PracticeResult({ result }: { result: ExamAttemptResultDto }) {
  return (
    <main style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', color: 'var(--accent-amber)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em' }}>PRACTICE MODE</span>
        <h1 style={{ color: 'var(--text-primary)' }}>Practice complete</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{result.examTitle}</p>
        <div style={{ fontSize: '2.5rem', color: 'var(--brand-primary)', fontWeight: 900 }}>{result.score}%</div>
        <p style={{ color: 'var(--text-secondary)' }}>{result.correctCount}/{result.totalQuestions} correct · no official best score changed</p>
        <Link href="/exams/mistakes" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to mistakes
        </Link>
      </div>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        {result.questions.map((question, index) => (
          <article key={question.questionId} className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${question.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <strong style={{ color: 'var(--text-muted)' }}>QUESTION {index + 1}</strong>
              {question.isCorrect ? <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} /> : <XCircle size={18} style={{ color: 'var(--accent-rose)' }} />}
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: 1.5 }}>{question.content}</h2>
            <div style={{ display: 'grid', gap: '0.45rem' }}>
              {question.options.map((option, optionIndex) => (
                <div key={option.id} style={{ color: option.isCorrect ? 'var(--accent-emerald)' : option.id === question.selectedOptionId ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                  {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}. {option.content}{option.isCorrect ? ' ✓' : option.id === question.selectedOptionId ? ' ✕' : ''}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function PracticeShell({ children }: { children: React.ReactNode }) {
  return <main style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>{children}</main>;
}

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.7rem 1rem',
  border: 0,
  borderRadius: 'var(--radius-md)',
  background: 'var(--gradient-brand)',
  color: '#fff',
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-secondary)',
};
