'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Send,
} from 'lucide-react';
import { AttemptStatus, ExamAttemptResultDto } from '@japanese-learning/contracts';
import { apiClient, getApiErrorMessage } from '@/lib/api-client';
import { LIVE_ATTEMPT_QUERY_OPTIONS } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { invalidateExamQueries } from '@/lib/query-invalidation';
import {
  clearActiveAttemptId,
  getServerRemainingSeconds,
  readActiveAttemptId,
  writeActiveAttemptId,
} from '@/lib/live-attempt-policy';
import { studyApi } from '@/lib/study-api';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface AutosaveRequest {
  sequence: number;
  controller: AbortController;
  promise: Promise<void>;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export default function ExamTakePage() {
  const params = useParams();
  const examId = params?.id as string;
  const queryClient = useQueryClient();

  const [attemptContext, setAttemptContext] = useState<{
    examId: string;
    attemptId: string | null;
  } | null>(null);
  const [result, setResult] = useState<ExamAttemptResultDto | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingAnswersRef = useRef<Record<string, string | null>>({});
  const autosaveRequestsRef = useRef<Map<string, AutosaveRequest>>(new Map());
  const answerSequenceRef = useRef<Map<string, number>>(new Map());

  const activeAttemptId = attemptContext?.examId === examId ? attemptContext.attemptId : null;
  const isHydrated = attemptContext?.examId === examId;
  const bootstrapAttemptKey = `bootstrap:${examId}`;
  const attemptQuery = useQuery({
    ...LIVE_ATTEMPT_QUERY_OPTIONS,
    queryKey: queryKeys.liveAttempt(activeAttemptId ?? bootstrapAttemptKey),
    queryFn: ({ signal }) =>
      activeAttemptId
        ? studyApi.liveAttempt(activeAttemptId, signal)
        : studyApi.startAttempt(examId, signal),
    enabled: Boolean(examId) && isHydrated && !result,
  });
  const attemptData = attemptQuery.data;
  const refetchAttempt = attemptQuery.refetch;
  const attempt = attemptData ?? null;
  const isStarting = !result && (!isHydrated || (attemptQuery.isPending && !attempt));
  const error = attemptQuery.error
    ? getApiErrorMessage(attemptQuery.error, 'Failed to start exam attempt.')
    : null;

  useEffect(() => {
    setAttemptContext({ examId, attemptId: readActiveAttemptId(examId) });
  }, [examId]);

  useEffect(() => {
    const data = attemptData;
    if (!data || !examId) return;

    if (data.status !== AttemptStatus.IN_PROGRESS && activeAttemptId) {
      clearActiveAttemptId(examId);
      queryClient.removeQueries({
        queryKey: queryKeys.liveAttempt(activeAttemptId),
        exact: true,
      });
      setAttemptContext({ examId, attemptId: null });
      return;
    }

    if (!activeAttemptId) {
      queryClient.setQueryData(queryKeys.liveAttempt(data.attemptId), data);
      writeActiveAttemptId(examId, data.attemptId);
      setAttemptContext({ examId, attemptId: data.attemptId });
      queryClient.removeQueries({
        queryKey: queryKeys.liveAttempt(bootstrapAttemptKey),
        exact: true,
      });
    }
  }, [activeAttemptId, attemptData, bootstrapAttemptKey, examId, queryClient]);

  useEffect(() => {
    const data = attemptData;
    if (!data) return;

    const serverAnswers = data.savedAnswers || {};
    const pendingAnswers = pendingAnswersRef.current;
    for (const [questionId, selectedOptionId] of Object.entries(pendingAnswers)) {
      if (serverAnswers[questionId] === selectedOptionId) {
        delete pendingAnswers[questionId];
      }
    }

    setAnswers({ ...serverAnswers, ...pendingAnswers });
    setTimeLeftSeconds(getServerRemainingSeconds(data.expiresAt));
  }, [attemptData]);

  useEffect(() => {
    const revalidate = () => {
      if (!result && activeAttemptId && document.visibilityState === 'visible') {
        void refetchAttempt();
      }
    };

    window.addEventListener('online', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('online', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [activeAttemptId, refetchAttempt, result]);

  const cancelAutosaves = useCallback(() => {
    autosaveRequestsRef.current.forEach((request) => {
      request.controller.abort();
    });
    autosaveRequestsRef.current.clear();
    pendingAnswersRef.current = {};
  }, []);

  useEffect(() => cancelAutosaves, [cancelAutosaves]);

  const queueAnswerSave = useCallback((questionId: string, optionId: string, attemptId: string) => {
    const previous = autosaveRequestsRef.current.get(questionId);
    previous?.controller.abort();

    const sequence = (answerSequenceRef.current.get(questionId) || 0) + 1;
    answerSequenceRef.current.set(questionId, sequence);
    const controller = new AbortController();
    pendingAnswersRef.current[questionId] = optionId;

    let request: Promise<void>;
    request = (async () => {
      if (previous) await previous.promise.catch(() => undefined);
      if (answerSequenceRef.current.get(questionId) !== sequence) return;

      try {
        await apiClient(`/attempts/${attemptId}/answers`, {
          method: 'PUT',
          body: JSON.stringify({
            answers: [{ questionId, selectedOptionId: optionId }],
          }),
          signal: controller.signal,
        });
        if (answerSequenceRef.current.get(questionId) === sequence) {
          delete pendingAnswersRef.current[questionId];
        }
      } catch (error: unknown) {
        if (answerSequenceRef.current.get(questionId) === sequence && !isAbortError(error)) {
          delete pendingAnswersRef.current[questionId];
        }
      } finally {
        const current = autosaveRequestsRef.current.get(questionId);
        if (current?.sequence === sequence) autosaveRequestsRef.current.delete(questionId);
      }
    })();

    autosaveRequestsRef.current.set(questionId, { sequence, controller, promise: request });
    void request;
  }, []);

  // Submit attempt handler
  const handleSubmit = useCallback(async () => {
    if (!attempt || isSubmitting) return;
    setIsSubmitting(true);
    setIsConfirmOpen(false);

    try {
      const formattedAnswers = Object.entries({ ...answers, ...pendingAnswersRef.current }).map(
        ([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }),
      );
      cancelAutosaves();

      const res = await studyApi.submitAttempt(attempt.attemptId, { answers: formattedAnswers });

      setResult(res);
      clearActiveAttemptId(examId);
      queryClient.removeQueries({
        queryKey: queryKeys.liveAttempt(attempt.attemptId),
        exact: true,
      });
      await invalidateExamQueries(queryClient, examId);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: unknown) {
      alert(`Submission failed: ${getApiErrorMessage(err, 'Unknown error')}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, attempt, cancelAutosaves, examId, isSubmitting, queryClient]);

  // Server-based countdown timer
  useEffect(() => {
    if (!attempt?.expiresAt || result) return;

    const updateTimer = () => {
      const remaining = getServerRemainingSeconds(attempt.expiresAt);
      setTimeLeftSeconds(remaining);

      if (remaining !== null && remaining <= 0) {
        void handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [attempt?.expiresAt, result, handleSubmit]);

  // Autosave selection on change
  const handleSelectOption = (questionId: string, optionId: string) => {
    if (result || isSubmitting) return;

    const hasPendingAnswer = Object.prototype.hasOwnProperty.call(
      pendingAnswersRef.current,
      questionId,
    );
    const currentAnswer = hasPendingAnswer
      ? pendingAnswersRef.current[questionId]
      : answers[questionId] || null;
    if (currentAnswer === optionId) return;

    if (!attempt) return;
    setAnswers((previous) => ({ ...previous, [questionId]: optionId }));
    queueAnswerSave(questionId, optionId, attempt.attemptId);
  };

  if (isStarting) {
    return (
      <div
        style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}
      >
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <Clock
            size={36}
            style={{
              color: 'var(--brand-primary)',
              margin: '0 auto 1rem',
              animation: 'spin 2s linear infinite',
            }}
          />
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Preparing Examination...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Initializing server session and question snapshot.
          </p>
        </div>
      </div>
    );
  }

  if (!result && (error || !attempt)) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}
      >
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <AlertTriangle size={36} style={{ color: 'var(--accent-rose)', margin: '0 auto 1rem' }} />
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Unable to Start Exam
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button
            type="button"
            onClick={() => void attemptQuery.refetch()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              color: '#fff',
              fontWeight: '600',
              marginBottom: '1rem',
            }}
          >
            Retry
          </button>
          <Link
            href={`/exams/${examId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Exam Briefing</span>
          </Link>
        </div>
      </div>
    );
  }

  // --- RESULT VIEW (TASK-074) ---
  if (result) {
    const formatDuration = (secs: number | null) => {
      if (!secs) return '0s';
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    return (
      <div style={{ maxWidth: '880px', margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
        {/* Results Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            marginBottom: '2rem',
          }}
        >
          {result.isNewBest && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.875rem',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--accent-amber)',
                fontWeight: '700',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}
            >
              <Sparkles size={14} />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Examination Completed
          </h1>
          <p
            style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem' }}
          >
            {result.examTitle}
          </p>

          {/* Big Score Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '1rem',
              maxWidth: '650px',
              margin: '0 auto 2rem',
            }}
          >
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Score
              </div>
              <div
                style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--brand-primary)' }}
              >
                {result.score}%
              </div>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Accuracy
              </div>
              <div
                style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--accent-emerald)' }}
              >
                {result.correctCount}/{result.totalQuestions}
              </div>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                Time Taken
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>
                {formatDuration(result.durationSeconds)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                cancelAutosaves();
                if (activeAttemptId) {
                  queryClient.removeQueries({
                    queryKey: queryKeys.liveAttempt(activeAttemptId),
                    exact: true,
                  });
                }
                clearActiveAttemptId(examId);
                setAttemptContext({ examId, attemptId: null });
                setResult(null);
                setAnswers({});
                setCurrentIndex(0);
                setTimeLeftSeconds(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              <RotateCcw size={16} />
              <span>Retake Exam</span>
            </button>

            <Link
              href="/exams"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Library</span>
            </Link>
          </div>
        </div>

        {/* Detailed Question Review List (TASK-074 color states) */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}
        >
          Question by Question Review
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {result.questions.map((q, qIndex) => (
            <div
              key={q.questionId}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${q.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
              }}
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
                  style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-muted)' }}
                >
                  QUESTION {qIndex + 1}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                    color: q.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  }}
                >
                  {q.isCorrect ? (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Correct (+1)</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={15} />
                      <span>Incorrect (0)</span>
                    </>
                  )}
                </span>
              </div>

              {/* Question Content */}
              <div
                style={{
                  fontSize: '1.1875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '1.25rem',
                  lineHeight: '1.5',
                }}
              >
                {q.content}
              </div>

              {/* Graded Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oIndex) => {
                  const isSelected = q.selectedOptionId === opt.id;
                  const isCorrectAnswer = opt.isCorrect;

                  let bgColor = 'rgba(15, 23, 42, 0.4)';
                  let borderColor = 'var(--border-subtle)';
                  let textColor = 'var(--text-secondary)';

                  if (isCorrectAnswer) {
                    bgColor = 'rgba(16, 185, 129, 0.15)';
                    borderColor = 'rgba(16, 185, 129, 0.4)';
                    textColor = 'var(--text-primary)';
                  } else if (isSelected && !isCorrectAnswer) {
                    bgColor = 'rgba(244, 63, 94, 0.15)';
                    borderColor = 'rgba(244, 63, 94, 0.4)';
                    textColor = 'var(--text-primary)';
                  }

                  return (
                    <div
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        color: textColor,
                        fontSize: '0.9375rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}
                        >
                          {OPTION_LETTERS[oIndex]}
                        </span>
                        <span>{opt.content}</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                        }}
                      >
                        {isSelected && !isCorrectAnswer && (
                          <span style={{ color: 'var(--accent-rose)' }}>Your Choice (Wrong)</span>
                        )}
                        {isCorrectAnswer && (
                          <span style={{ color: 'var(--accent-emerald)' }}>
                            {isSelected ? 'Your Choice (Correct)' : 'Correct Answer'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- LIVE TAKING ENGINE (TASK-073) ---
  if (!attempt) return null;

  const currentQuestion = attempt.questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const unansweredCount = attempt.totalQuestions - answeredCount;

  const formatTimer = (secs: number | null) => {
    if (secs === null) return 'Untimed';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimerCritical = timeLeftSeconds !== null && timeLeftSeconds <= 60;

  return (
    <div style={{ maxWidth: '1100px', margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
      {/* Top Header Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href={`/exams/${examId}`}
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            title="Leave exam"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1
              style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {attempt.examTitle}
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {answeredCount} of {attempt.totalQuestions} answered
            </span>
          </div>
        </div>

        {/* Server Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {timeLeftSeconds !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                background: isTimerCritical ? 'rgba(244, 63, 94, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: isTimerCritical
                  ? '1px solid rgba(244, 63, 94, 0.4)'
                  : '1px solid var(--border-subtle)',
                color: isTimerCritical ? 'var(--accent-rose)' : 'var(--text-primary)',
                fontWeight: '700',
                fontFamily: 'monospace',
                fontSize: '1rem',
              }}
            >
              <Clock size={16} />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          )}

          <button
            onClick={() => setIsConfirmOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Send size={14} />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Main Taking Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Question Area */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          {/* Question Index Badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <span
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--brand-primary)',
                fontSize: '0.8125rem',
                fontWeight: '700',
              }}
            >
              QUESTION {currentIndex + 1} OF {attempt.totalQuestions}
            </span>

            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Single Choice</span>
          </div>

          {/* Question Text */}
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '2rem',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {currentQuestion.content}
          </div>

          {/* Option Choices */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2.5rem',
            }}
          >
            {currentQuestion.options.map((opt, oIndex) => {
              const isSelected = answers[currentQuestion.id] === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                    border: isSelected
                      ? '1px solid var(--brand-primary)'
                      : '1px solid var(--border-subtle)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8125rem',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}
                  >
                    {OPTION_LETTERS[oIndex]}
                  </span>
                  <span
                    style={{
                      fontSize: '1.0625rem',
                      fontWeight: isSelected ? '600' : '400',
                      lineHeight: '1.4',
                    }}
                  >
                    {opt.content}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prev / Next Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            {currentIndex < attempt.totalQuestions - 1 ? (
              <button
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(attempt.totalQuestions - 1, prev + 1))
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.625rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: 'var(--brand-primary)',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                }}
              >
                <span>Next Question</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setIsConfirmOpen(true)}
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
                <span>Review & Submit</span>
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator Grid */}
        <div
          className="glass-panel"
          style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Question Navigator
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
            {attempt.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null;
              const isCurrent = currentIndex === idx;

              let bg = 'rgba(255, 255, 255, 0.05)';
              let border = 'var(--border-subtle)';
              let text = 'var(--text-muted)';

              if (isCurrent) {
                bg = 'rgba(99, 102, 241, 0.3)';
                border = 'var(--brand-primary)';
                text = '#fff';
              } else if (isAnswered) {
                bg = 'rgba(16, 185, 129, 0.15)';
                border = 'rgba(16, 185, 129, 0.3)';
                text = 'var(--accent-emerald)';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    background: bg,
                    border: `1px solid ${border}`,
                    color: text,
                    fontWeight: '700',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: 'rgba(16, 185, 129, 0.3)',
                  border: '1px solid rgba(16, 185, 129, 0.6)',
                }}
              />
              <span>Answered ({answeredCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '2px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                }}
              />
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {isConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '440px', padding: '2rem', textAlign: 'center' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              Confirm Submission
            </h2>

            {unansweredCount > 0 ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: 'var(--accent-amber)',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                }}
              >
                You still have <strong>{unansweredCount}</strong> unanswered questions. Are you sure
                you want to finish now?
              </div>
            ) : (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginBottom: '1.5rem',
                }}
              >
                All {attempt.totalQuestions} questions have been answered. Ready for instant
                grading?
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Back to Questions
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  padding: '0.625rem 1.5rem',
                  background: 'var(--gradient-brand)',
                  color: '#fff',
                  fontWeight: '700',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {isSubmitting ? 'Grading Exam...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
