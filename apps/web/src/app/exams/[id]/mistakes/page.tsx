'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Languages,
  Plus,
  RotateCw,
  XCircle,
} from 'lucide-react';
import type {
  FrequentMistakeDto,
  MistakeAttemptSummaryDto,
  RetainedMistakeItemDto,
} from '@japanese-learning/contracts';
import { SkeletonBlock } from '@/components/ui/skeleton';
import LookupFlashcardDialog, {
  type FlashcardTextDraft,
} from '@/components/lookup/lookup-flashcard-dialog';
import { CACHE_POLICY } from '@/lib/cache-policy';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  readExamReviewContinuity,
  writeExamReviewContinuity,
  type ExamReviewFilter,
} from '@/lib/continuity';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import { useQuery } from '@tanstack/react-query';

const FILTERS: Array<{ value: ExamReviewFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WRONG', label: 'Sai' },
  { value: 'UNANSWERED', label: 'Bỏ trống' },
];

function parseFilter(value: string | null): ExamReviewFilter | null {
  return value === 'ALL' || value === 'WRONG' || value === 'UNANSWERED' ? value : null;
}

function isVisible(item: RetainedMistakeItemDto, filter: ExamReviewFilter): boolean {
  if (filter === 'WRONG') return !item.isUnanswered && item.selectedOptionId !== null;
  if (filter === 'UNANSWERED') return item.isUnanswered || item.selectedOptionId === null;
  return true;
}

function historyPath(
  examId: string,
  attemptId: string | null,
  filter: ExamReviewFilter,
  questionId: string | null,
): string {
  const params = new URLSearchParams();
  if (attemptId) params.set('attempt', attemptId);
  if (filter !== 'ALL') params.set('filter', filter);
  if (questionId) params.set('question', questionId);
  const query = params.toString();
  return `/exams/${examId}/mistakes${query ? `?${query}` : ''}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown submission time'
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

export function createMistakeFlashcardDraft(item: RetainedMistakeItemDto): FlashcardTextDraft {
  const correct = item.options.find((option) => option.id === item.correctOptionId);
  const selected = item.options.find((option) => option.id === item.selectedOptionId);
  const back = [
    `Đáp án đúng: ${correct?.content ?? 'Chưa có đáp án trong snapshot'}`,
    selected && selected.id !== correct?.id ? `Đã chọn: ${selected.content}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
  return {
    front: item.questionContent.slice(0, 4_000),
    back: back.slice(0, 4_000),
  };
}

export function createFrequentMistakeFlashcardDraft(item: FrequentMistakeDto): FlashcardTextDraft {
  const correct = item.options.find((option) => option.id === item.correctOptionId);
  return {
    front: item.questionContent.slice(0, 4_000),
    back: `Đáp án đúng: ${(correct?.content ?? 'Chưa có đáp án trong snapshot').slice(0, 4_000)}`,
  };
}

export default function ExamMistakeHistoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = params?.id ?? '';
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExamReviewFilter>('ALL');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [flashcardDraft, setFlashcardDraft] = useState<FlashcardTextDraft | null>(null);
  const initialized = useRef(false);

  const attemptsQuery = useQuery({
    queryKey: queryKeys.mistakeAttempts(examId),
    queryFn: ({ signal }) => studyApi.mistakeAttempts(examId, signal),
    enabled: Boolean(examId),
    staleTime: CACHE_POLICY.entityDetail.staleTime,
    gcTime: CACHE_POLICY.entityDetail.gcTime,
  });
  const attempts = (attemptsQuery.data?.attempts ?? []).slice(0, 3);
  const selectedAttempt =
    attempts.find((attempt) => attempt.attemptId === selectedAttemptId) ?? null;
  const detailQuery = useQuery({
    queryKey: queryKeys.mistakeAttemptDetail(selectedAttemptId ?? ''),
    queryFn: ({ signal }) => studyApi.mistakeAttemptDetail(selectedAttemptId ?? '', signal),
    enabled: Boolean(selectedAttemptId),
    staleTime: CACHE_POLICY.entityDetail.staleTime,
    gcTime: CACHE_POLICY.entityDetail.gcTime,
  });
  const frequentQuery = useQuery({
    queryKey: queryKeys.frequentMistakes(examId),
    queryFn: ({ signal }) => studyApi.frequentMistakes(examId, signal),
    enabled: Boolean(examId),
    staleTime: CACHE_POLICY.entityDetail.staleTime,
    gcTime: CACHE_POLICY.entityDetail.gcTime,
  });
  const items = detailQuery.data?.items ?? [];
  const visibleItems = useMemo(
    () => items.filter((item) => isVisible(item, filter)),
    [filter, items],
  );
  const currentItem =
    visibleItems.find((item) => item.questionId === currentQuestionId) ?? visibleItems[0] ?? null;

  useEffect(() => {
    if (initialized.current || attempts.length === 0) return;
    const requestedAttempt = searchParams.get('attempt');
    const requested = attempts.find((attempt) => attempt.attemptId === requestedAttempt);
    const candidate = requested ?? attempts[0];
    const saved = readExamReviewContinuity(candidate.attemptId);
    const savedForExam = saved?.examId === examId && saved.examVersion === candidate.examVersion;
    const nextFilter =
      parseFilter(searchParams.get('filter')) ?? (savedForExam ? saved.filter : 'ALL');
    const requestedQuestion = searchParams.get('question');
    setSelectedAttemptId(candidate.attemptId);
    setFilter(nextFilter);
    setCurrentQuestionId(requestedQuestion ?? (savedForExam ? saved.currentQuestionId : null));
    initialized.current = true;
    if (savedForExam && saved.scrollTop > 0) {
      window.requestAnimationFrame(() =>
        window.scrollTo({ top: saved.scrollTop, behavior: 'auto' }),
      );
    }
  }, [attempts, examId, searchParams]);

  useEffect(() => {
    if (!initialized.current || !selectedAttempt || !currentItem) return;
    writeExamReviewContinuity({
      attemptId: selectedAttempt.attemptId,
      examId,
      examVersion: selectedAttempt.examVersion,
      currentQuestionId: currentItem.questionId,
      filter,
      scrollTop: typeof window === 'undefined' ? 0 : window.scrollY,
      returnTo: historyPath(examId, selectedAttempt.attemptId, filter, currentItem.questionId),
    });
  }, [currentItem, examId, filter, selectedAttempt]);

  useEffect(() => {
    if (currentQuestionId && visibleItems.some((item) => item.questionId === currentQuestionId))
      return;
    setCurrentQuestionId(visibleItems[0]?.questionId ?? null);
  }, [currentQuestionId, visibleItems]);

  const selectAttempt = (attempt: MistakeAttemptSummaryDto) => {
    setSelectedAttemptId(attempt.attemptId);
    setFilter('ALL');
    setCurrentQuestionId(null);
    router.replace(historyPath(examId, attempt.attemptId, 'ALL', null), { scroll: false });
  };

  const changeFilter = (nextFilter: ExamReviewFilter) => {
    const nextQuestion = items.find((item) => isVisible(item, nextFilter))?.questionId ?? null;
    setFilter(nextFilter);
    setCurrentQuestionId(nextQuestion);
    router.replace(historyPath(examId, selectedAttemptId, nextFilter, nextQuestion), {
      scroll: false,
    });
  };

  const selectQuestion = (questionId: string) => {
    setCurrentQuestionId(questionId);
    router.replace(historyPath(examId, selectedAttemptId, filter, questionId), { scroll: false });
  };

  const openFrequent = (item: FrequentMistakeDto) => {
    const sourceAttempt = attempts.find((attempt) => attempt.attemptId === item.sourceAttemptId);
    if (sourceAttempt && sourceAttempt.attemptId !== selectedAttemptId) {
      setSelectedAttemptId(sourceAttempt.attemptId);
      setFilter('ALL');
    }
    setCurrentQuestionId(item.questionId);
    router.replace(
      historyPath(examId, sourceAttempt?.attemptId ?? selectedAttemptId, 'ALL', item.questionId),
      {
        scroll: false,
      },
    );
  };

  const lookupHref = selectedAttempt
    ? `/lookup?returnTo=${encodeURIComponent(
        historyPath(examId, selectedAttempt.attemptId, filter, currentItem?.questionId ?? null),
      )}`
    : `/lookup?returnTo=${encodeURIComponent(`/exams/${examId}/mistakes`)}`;

  if (attemptsQuery.isLoading) {
    return (
      <main
        aria-busy="true"
        style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1.5rem' }}
      >
        <SkeletonBlock height="28rem" />
      </main>
    );
  }

  if (attemptsQuery.isError) {
    return (
      <main
        role="alert"
        style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <AlertTriangle size={36} style={{ color: 'var(--accent-amber)' }} />
        <h1 style={{ color: 'var(--text-primary)' }}>Không tải được lịch sử câu sai</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {getApiErrorMessage(attemptsQuery.error, 'Vui lòng thử lại sau.')}
        </p>
        <button
          type="button"
          onClick={() => void attemptsQuery.refetch()}
          style={primaryButtonStyle}
        >
          Thử lại
        </button>
      </main>
    );
  }

  if (attempts.length === 0) {
    return (
      <main
        style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}
      >
        <Link href="/exams" style={backLinkStyle}>
          <ArrowLeft size={16} /> Exams
        </Link>
        <section className="glass-panel" style={{ padding: '3rem 2rem', marginTop: '2rem' }}>
          <CheckCircle2 size={36} style={{ color: 'var(--accent-emerald)' }} />
          <h1 style={{ color: 'var(--text-primary)' }}>Chưa có lịch sử câu sai</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Hãy nộp một bài thi chính thức có câu sai hoặc bỏ trống để tạo lịch sử.
          </p>
        </section>
      </main>
    );
  }

  const detailError = detailQuery.error
    ? getApiErrorMessage(detailQuery.error, 'Không tải được chi tiết bài thi.')
    : null;
  const frequent = frequentQuery.data?.items ?? [];

  return (
    <main style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <Link href={`/exams/${examId}`} style={backLinkStyle}>
            <ArrowLeft size={16} /> Exam
          </Link>
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>3 lần gần nhất</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.45rem 0 0' }}>
            Chỉ gồm các bài thi chính thức hiện tại; Practice không làm thay đổi cửa sổ này.
          </p>
        </div>
        <Link href={lookupHref} style={lookupButtonStyle}>
          <Languages size={16} /> Lookup
        </Link>
      </header>

      <section className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div
          role="tablist"
          aria-label="Các bài thi gần nhất"
          style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}
        >
          {attempts.map((attempt, index) => (
            <button
              key={attempt.attemptId}
              type="button"
              role="tab"
              aria-selected={attempt.attemptId === selectedAttemptId}
              onClick={() => selectAttempt(attempt)}
              style={attempt.attemptId === selectedAttemptId ? activeTabStyle : tabStyle}
            >
              <strong>{index === 0 ? 'Mới nhất' : `Lần ${index + 1}`}</strong>
              <span>
                {attempt.score}% · {formatDate(attempt.submittedAt)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {selectedAttempt && (
        <section className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedAttempt.score}%</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                {selectedAttempt.correctCount}/{selectedAttempt.totalQuestions} đúng · v
                {selectedAttempt.examVersion}
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nộp lúc {formatDate(selectedAttempt.submittedAt)} · {selectedAttempt.mistakeCount} câu
              cần xem
            </span>
          </div>
          <div
            role="tablist"
            aria-label="Bộ lọc câu sai"
            style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}
          >
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => changeFilter(option.value)}
                style={filter === option.value ? activeFilterStyle : filterStyle}
              >
                {option.label} ({items.filter((item) => isVisible(item, option.value)).length})
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        className="glass-panel"
        style={{ padding: '1rem', marginBottom: '1rem' }}
        aria-labelledby="frequent-mistakes-heading"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCw size={17} style={{ color: 'var(--accent-purple)' }} />
          <h2
            id="frequent-mistakes-heading"
            style={{ color: 'var(--text-primary)', fontSize: '1rem', margin: 0 }}
          >
            Câu lặp lại nhiều
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            ({frequentQuery.data?.retainedAttemptCount ?? 0} bài)
          </span>
        </div>
        {frequentQuery.isError ? (
          <p role="alert" style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            {getApiErrorMessage(frequentQuery.error, 'Tóm tắt chưa khả dụng.')}
          </p>
        ) : frequent.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            Chưa đủ dữ liệu để xếp hạng.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.75rem' }}>
            {frequent.slice(0, 10).map((item) => (
              <div
                key={item.questionId}
                style={{ display: 'flex', gap: '0.45rem', alignItems: 'stretch' }}
              >
                <button
                  type="button"
                  onClick={() => openFrequent(item)}
                  style={{ ...frequentButtonStyle, flex: 1, minWidth: 0 }}
                >
                  <span
                    style={{
                      textAlign: 'left',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.questionContent}
                  </span>
                  <strong style={{ color: 'var(--accent-amber)', whiteSpace: 'nowrap' }}>
                    {item.occurrenceCount}/{item.retainedAttemptCount}
                  </strong>
                </button>
                <Link
                  href={`/lookup?q=${encodeURIComponent(item.questionContent.trim().slice(0, 120))}&returnTo=${encodeURIComponent(historyPath(examId, item.sourceAttemptId, 'ALL', item.questionId))}`}
                  style={compactActionStyle}
                  aria-label={`Lookup ${item.questionContent}`}
                >
                  <Languages size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setFlashcardDraft(createFrequentMistakeFlashcardDraft(item))}
                  style={compactActionStyle}
                  aria-label={`Add ${item.questionContent} to Flashcard`}
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {detailQuery.isLoading ? (
        <section role="status" className="glass-panel" style={{ padding: '2rem' }}>
          <SkeletonBlock height="18rem" />
        </section>
      ) : detailError ? (
        <section
          role="alert"
          className="glass-panel"
          style={{ padding: '2rem', color: 'var(--accent-rose)' }}
        >
          {detailError}
        </section>
      ) : visibleItems.length === 0 ? (
        <section className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <CheckCircle2 size={32} style={{ color: 'var(--accent-emerald)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Bộ lọc này không có câu cần xem.</p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {visibleItems.map((item) => (
            <MistakeCard
              key={item.id}
              item={item}
              isCurrent={item.questionId === currentItem?.questionId}
              onSelect={() => selectQuestion(item.questionId)}
              onCreateFlashcard={() => setFlashcardDraft(createMistakeFlashcardDraft(item))}
            />
          ))}
        </div>
      )}

      <LookupFlashcardDialog
        draft={flashcardDraft}
        onClose={() => setFlashcardDraft(null)}
        onSaved={() => setFlashcardDraft(null)}
      />
    </main>
  );
}

function MistakeCard({
  item,
  isCurrent,
  onSelect,
  onCreateFlashcard,
}: {
  item: RetainedMistakeItemDto;
  isCurrent: boolean;
  onSelect: () => void;
  onCreateFlashcard: () => void;
}) {
  const correctOption = item.options.find((option) => option.id === item.correctOptionId);
  const lookupQuery = item.questionContent.trim().slice(0, 120);
  return (
    <article
      id={`mistake-question-${item.questionId}`}
      className="glass-panel"
      aria-current={isCurrent ? 'true' : undefined}
      onClick={onSelect}
      style={{
        padding: '1.25rem',
        borderLeft: `4px solid ${item.isUnanswered ? 'var(--accent-amber)' : 'var(--accent-rose)'}`,
        boxShadow: isCurrent ? '0 0 0 1px rgba(56, 189, 248, 0.38)' : undefined,
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
      >
        <strong style={{ color: 'var(--text-muted)' }}>CÂU {item.questionPosition + 1}</strong>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: item.isUnanswered ? 'var(--accent-amber)' : 'var(--accent-rose)',
            fontWeight: 700,
          }}
        >
          {item.isUnanswered ? <HelpCircle size={16} /> : <XCircle size={16} />}
          {item.isUnanswered ? 'Bỏ trống' : 'Trả lời sai'}
        </span>
      </div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '1.08rem', lineHeight: 1.5 }}>
        {item.questionContent}
      </h2>
      <div style={{ display: 'grid', gap: '0.45rem' }}>
        {item.options.map((option, optionIndex) => {
          const selected = option.id === item.selectedOptionId;
          const correct = option.id === item.correctOptionId;
          return (
            <div
              key={option.id}
              style={{
                padding: '0.7rem 0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${correct ? 'rgba(16, 185, 129, 0.55)' : selected ? 'rgba(244, 63, 94, 0.55)' : 'var(--border-subtle)'}`,
                background: correct
                  ? 'rgba(16, 185, 129, 0.12)'
                  : selected
                    ? 'rgba(244, 63, 94, 0.12)'
                    : 'rgba(15, 23, 42, 0.28)',
                color: 'var(--text-secondary)',
              }}
            >
              <strong style={{ marginRight: '0.6rem', color: 'var(--text-muted)' }}>
                {String.fromCharCode(65 + optionIndex)}.
              </strong>
              {option.content}
              {correct && (
                <span style={{ color: 'var(--accent-emerald)', marginLeft: '0.5rem' }}>
                  <CheckCircle2 size={14} style={{ verticalAlign: 'middle' }} /> Đáp án đúng
                </span>
              )}
              {selected && !correct && (
                <span style={{ color: 'var(--accent-rose)', marginLeft: '0.5rem' }}>
                  <XCircle size={14} style={{ verticalAlign: 'middle' }} /> Đã chọn
                </span>
              )}
            </div>
          );
        })}
      </div>
      {item.isUnanswered && (
        <p style={{ color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
          Không chọn đáp án trong bài đã nộp.
        </p>
      )}
      {!correctOption && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Snapshot không có nội dung đáp án đúng.
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <Link
          href={`/lookup?q=${encodeURIComponent(lookupQuery)}&returnTo=${encodeURIComponent(typeof window === 'undefined' ? `/exams/${item.examId}/mistakes` : window.location.pathname + window.location.search)}`}
          onClick={(event) => event.stopPropagation()}
          style={secondaryActionStyle}
        >
          <Languages size={15} /> Lookup
        </Link>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCreateFlashcard();
          }}
          style={secondaryActionStyle}
        >
          <Plus size={15} /> Add to Flashcard
        </button>
      </div>
    </article>
  );
}

const backLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  color: 'var(--text-muted)',
  textDecoration: 'none',
  marginBottom: '0.8rem',
} as const;
const primaryButtonStyle = {
  marginTop: '1rem',
  padding: '0.6rem 1rem',
  border: 0,
  borderRadius: 'var(--radius-md)',
  background: 'var(--gradient-brand)',
  color: '#fff',
  fontWeight: 700,
} as const;
const lookupButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  alignSelf: 'flex-start',
  padding: '0.6rem 0.85rem',
  borderRadius: 'var(--radius-md)',
  background: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.3)',
  color: 'var(--accent-cyan)',
  fontWeight: 700,
  textDecoration: 'none',
} as const;
const tabStyle = {
  display: 'grid',
  gap: '0.2rem',
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-secondary)',
} as const;
const activeTabStyle = {
  ...tabStyle,
  border: '1px solid rgba(56, 189, 248, 0.55)',
  background: 'rgba(56, 189, 248, 0.13)',
  color: 'var(--accent-cyan)',
} as const;
const filterStyle = {
  padding: '0.5rem 0.7rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-secondary)',
} as const;
const activeFilterStyle = {
  ...filterStyle,
  border: '1px solid rgba(56, 189, 248, 0.55)',
  background: 'rgba(56, 189, 248, 0.13)',
  color: 'var(--accent-cyan)',
  fontWeight: 700,
} as const;
const frequentButtonStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.55rem 0.65rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(15, 23, 42, 0.28)',
  color: 'var(--text-secondary)',
  textAlign: 'left',
} as const;
const compactActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '2.25rem',
  padding: '0.45rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
} as const;
const secondaryActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.5rem 0.7rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  textDecoration: 'none',
} as const;
