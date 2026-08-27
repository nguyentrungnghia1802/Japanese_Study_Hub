'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Languages, XCircle } from 'lucide-react';
import type { ExamAttemptResultDto, QuestionGradedResultDto } from '@japanese-learning/contracts';
import type { ExamReviewFilter } from '@/lib/continuity';
import {
  readExamReviewContinuity,
  writeExamReviewContinuity,
} from '@/lib/continuity';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FILTERS: Array<{ value: ExamReviewFilter; label: string }> = [
  { value: 'ALL', label: 'All questions' },
  { value: 'WRONG', label: 'Wrong answers' },
  { value: 'UNANSWERED', label: 'Unanswered' },
];

function parseFilter(value: string | null): ExamReviewFilter | null {
  return value === 'ALL' || value === 'WRONG' || value === 'UNANSWERED' ? value : null;
}

function isVisible(question: QuestionGradedResultDto, filter: ExamReviewFilter): boolean {
  if (filter === 'WRONG') return question.selectedOptionId !== null && !question.isCorrect;
  if (filter === 'UNANSWERED') return question.selectedOptionId === null;
  return true;
}

function getReviewPath(
  attemptId: string,
  filter: ExamReviewFilter,
  questionId: string | null,
): string {
  const params = new URLSearchParams();
  if (filter !== 'ALL') params.set('filter', filter);
  if (questionId) params.set('question', questionId);
  const query = params.toString();
  return `/exams/review/${attemptId}${query ? `?${query}` : ''}`;
}

export default function ExamResultReview({ result }: { result: ExamAttemptResultDto }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<ExamReviewFilter>('ALL');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const initialized = useRef(false);
  const scrollRaf = useRef<number | null>(null);

  const visibleQuestions = useMemo(
    () => result.questions.filter((question) => isVisible(question, filter)),
    [filter, result.questions],
  );
  const currentQuestion =
    visibleQuestions.find((question) => question.questionId === currentQuestionId) ??
    visibleQuestions[0] ??
    null;

  useEffect(() => {
    if (initialized.current) return;
    const saved = readExamReviewContinuity(result.attemptId);
    const requestedFilter = parseFilter(searchParams.get('filter'));
    const nextFilter =
      requestedFilter ??
      (saved?.examId === result.examId && saved.examVersion === result.examVersion
        ? saved.filter
        : 'ALL');
    const requestedQuestion = searchParams.get('question');
    const savedQuestion =
      saved?.examId === result.examId && saved.examVersion === result.examVersion
        ? saved.currentQuestionId
        : null;
    const candidateQuestion = requestedQuestion ?? savedQuestion;
    setFilter(nextFilter);
    setCurrentQuestionId(
      candidateQuestion && result.questions.some((question) => question.questionId === candidateQuestion)
        ? candidateQuestion
        : result.questions[0]?.questionId ?? null,
    );
    initialized.current = true;
    if (saved && saved.examId === result.examId && saved.examVersion === result.examVersion) {
      window.requestAnimationFrame(() => window.scrollTo({ top: saved.scrollTop, behavior: 'auto' }));
    }
  }, [result, searchParams]);

  useEffect(() => {
    if (!initialized.current) return;
    if (currentQuestionId && visibleQuestions.some((question) => question.questionId === currentQuestionId)) {
      return;
    }
    setCurrentQuestionId(visibleQuestions[0]?.questionId ?? null);
  }, [currentQuestionId, visibleQuestions]);

  const persist = useCallback(
    (scrollTop = typeof window === 'undefined' ? 0 : window.scrollY) => {
      if (!initialized.current) return;
      writeExamReviewContinuity({
        attemptId: result.attemptId,
        examId: result.examId,
        examVersion: result.examVersion,
        currentQuestionId: currentQuestion?.questionId ?? currentQuestionId,
        filter,
        scrollTop,
        returnTo: pathname || `/exams/review/${result.attemptId}`,
      });
    },
    [currentQuestion, currentQuestionId, filter, pathname, result],
  );

  useEffect(() => {
    persist();
  }, [filter, currentQuestionId, persist]);

  useEffect(() => {
    const onScroll = () => {
      if (scrollRaf.current !== null) return;
      scrollRaf.current = window.requestAnimationFrame(() => {
        scrollRaf.current = null;
        persist(window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollRaf.current !== null) window.cancelAnimationFrame(scrollRaf.current);
    };
  }, [persist]);

  const changeFilter = (nextFilter: ExamReviewFilter) => {
    setFilter(nextFilter);
    const nextQuestion = result.questions.find((question) => isVisible(question, nextFilter));
    setCurrentQuestionId(nextQuestion?.questionId ?? null);
    router.replace(getReviewPath(result.attemptId, nextFilter, nextQuestion?.questionId ?? null), {
      scroll: false,
    });
  };

  const selectQuestion = (questionId: string) => {
    setCurrentQuestionId(questionId);
    router.replace(getReviewPath(result.attemptId, filter, questionId), { scroll: false });
  };

  const lookupReturnPath = getReviewPath(result.attemptId, filter, currentQuestion?.questionId ?? null);
  const lookupHref = `/lookup?returnTo=${encodeURIComponent(lookupReturnPath)}`;

  return (
    <main style={{ maxWidth: '920px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
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
              marginBottom: '0.8rem',
            }}
          >
            <ArrowLeft size={16} />
            Exams
          </Link>
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Submitted exam review</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
            {result.examTitle} · {result.score}% · {result.correctCount}/{result.totalQuestions} correct
          </p>
        </div>
        <Link
          href={lookupHref}
          onClick={() => persist()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
          }}
        >
          <Languages size={16} />
          Lookup
        </Link>
      </header>

      <section className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div
          role="tablist"
          aria-label="Review filter"
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          {FILTERS.map((option) => {
            const count = result.questions.filter((question) => isVisible(question, option.value)).length;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => changeFilter(option.value)}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border:
                    filter === option.value
                      ? '1px solid rgba(56, 189, 248, 0.55)'
                      : '1px solid var(--border-subtle)',
                  background:
                    filter === option.value ? 'rgba(56, 189, 248, 0.13)' : 'transparent',
                  color: filter === option.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                {option.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {visibleQuestions.length === 0 ? (
        <section className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <CheckCircle2 size={32} style={{ color: 'var(--accent-emerald)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No questions match this review filter.</p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {visibleQuestions.map((question, index) => (
            <GradedQuestionCard
              key={question.questionId}
              question={question}
              index={index}
              isCurrent={question.questionId === currentQuestion?.questionId}
              onSelect={() => selectQuestion(question.questionId)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function GradedQuestionCard({
  question,
  index,
  isCurrent,
  onSelect,
}: {
  question: QuestionGradedResultDto;
  index: number;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      id={`review-question-${question.questionId}`}
      className="glass-panel"
      aria-current={isCurrent ? 'true' : undefined}
      style={{
        padding: '1.25rem',
        borderLeft: `4px solid ${question.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
        boxShadow: isCurrent ? '0 0 0 1px rgba(56, 189, 248, 0.38)' : undefined,
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <strong style={{ color: 'var(--text-muted)' }}>QUESTION {index + 1}</strong>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: question.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            fontWeight: 700,
          }}
        >
          {question.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {question.selectedOptionId === null
            ? 'Unanswered'
            : question.isCorrect
              ? 'Correct'
              : 'Wrong'}
        </span>
      </div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '1.08rem', lineHeight: 1.5 }}>
        {question.content}
      </h2>
      <div style={{ display: 'grid', gap: '0.45rem' }}>
        {question.options.map((option, optionIndex) => {
          const selected = option.id === question.selectedOptionId;
          return (
            <div
              key={option.id}
              style={{
                padding: '0.7rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${option.isCorrect ? 'rgba(16, 185, 129, 0.5)' : selected ? 'rgba(244, 63, 94, 0.5)' : 'var(--border-subtle)'}`,
                background: option.isCorrect
                  ? 'rgba(16, 185, 129, 0.12)'
                  : selected
                    ? 'rgba(244, 63, 94, 0.12)'
                    : 'rgba(15, 23, 42, 0.28)',
                color: 'var(--text-secondary)',
              }}
            >
              <strong style={{ marginRight: '0.6rem', color: 'var(--text-muted)' }}>
                {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}.
              </strong>
              {option.content}
              {option.isCorrect && (
                <span style={{ color: 'var(--accent-emerald)', marginLeft: '0.5rem' }}>
                  Correct answer
                </span>
              )}
              {selected && !option.isCorrect && (
                <span style={{ color: 'var(--accent-rose)', marginLeft: '0.5rem' }}>
                  Your answer
                </span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
