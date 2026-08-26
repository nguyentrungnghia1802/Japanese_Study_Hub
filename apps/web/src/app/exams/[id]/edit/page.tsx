'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  ExamDto,
  ExamFolderDto,
  QuestionType,
  CreateExamQuestionDto,
} from '@japanese-learning/contracts';
import { apiClient, getApiErrorMessage } from '@/lib/api-client';
import { invalidateExamQueries } from '@/lib/query-invalidation';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function ExamEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  const [exam, setExam] = useState<ExamDto | null>(null);
  const [folders, setFolders] = useState<ExamFolderDto[]>([]);

  // Metadata form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('30');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Questions editor
  const [questions, setQuestions] = useState<CreateExamQuestionDto[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [examData, foldersData] = await Promise.all([
          apiClient<ExamDto>(`/exams/${id}`),
          apiClient<ExamFolderDto[]>('/exam-folders'),
        ]);

        setExam(examData);
        setTitle(examData.title);
        setDescription(examData.description || '');
        setFolderId(examData.folderId || null);
        setTimeLimitMinutes(
          examData.timeLimitSeconds ? String(Math.round(examData.timeLimitSeconds / 60)) : '',
        );
        setShuffleQuestions(examData.shuffleQuestions);
        setShuffleOptions(examData.shuffleOptions);

        setQuestions(
          (examData.questions || []).map((q) => ({
            type: q.type,
            content: q.content,
            position: q.position,
            options: q.options.map((opt) => ({
              content: opt.content,
              isCorrect: Boolean(opt.isCorrect),
              position: opt.position,
            })),
          })),
        );

        setFolders(foldersData || []);
      } catch (err: unknown) {
        setErrorMsg(getApiErrorMessage(err, 'Failed to load exam.'));
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadData();
  }, [id]);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        type: QuestionType.MULTIPLE_CHOICE_SINGLE,
        content: '',
        position: prev.length,
        options: [
          { content: '', isCorrect: true, position: 0 },
          { content: '', isCorrect: false, position: 1 },
          { content: '', isCorrect: false, position: 2 },
          { content: '', isCorrect: false, position: 3 },
        ],
      },
    ]);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[qIndex];
      copy[qIndex] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddOption = (qIndex: number) => {
    if (questions[qIndex].options.length >= 6) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const currentOpts = copy[qIndex].options;
      copy[qIndex].options = [
        ...currentOpts,
        { content: '', isCorrect: false, position: currentOpts.length },
      ];
      return copy;
    });
  };

  const handleDeleteOption = (qIndex: number, oIndex: number) => {
    if (questions[qIndex].options.length <= 2) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const removedOpt = copy[qIndex].options[oIndex];
      const remaining = copy[qIndex].options.filter((_, idx) => idx !== oIndex);

      // If removed option was the correct one, make first option correct
      if (removedOpt.isCorrect && remaining.length > 0) {
        remaining[0].isCorrect = true;
      }

      copy[qIndex].options = remaining;
      return copy;
    });
  };

  const handleSetCorrectOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex].options = copy[qIndex].options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === oIndex,
      }));
      return copy;
    });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const mins = parseInt(timeLimitMinutes, 10);
      const timeLimitSeconds = !isNaN(mins) && mins > 0 ? mins * 60 : null;

      // 1. Update metadata
      await apiClient<ExamDto>(`/exams/${id}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          folderId: folderId || null,
          timeLimitSeconds,
          shuffleQuestions,
          shuffleOptions,
        }),
      });

      // 2. Update content (questions & options)
      if (questions.length > 0) {
        // Validate each question has 2-6 options and exactly 1 correct
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.content.trim()) {
            throw new Error(`Question ${i + 1} prompt content cannot be empty.`);
          }
          if (q.options.length < 2 || q.options.length > 6) {
            throw new Error(`Question ${i + 1} must have between 2 and 6 options.`);
          }
          const correctCount = q.options.filter((o) => o.isCorrect).length;
          if (correctCount !== 1) {
            throw new Error(`Question ${i + 1} must have exactly one correct answer selected.`);
          }
          for (let j = 0; j < q.options.length; j++) {
            if (!q.options[j].content.trim()) {
              throw new Error(
                `Question ${i + 1}, Option ${OPTION_LETTERS[j]} content cannot be empty.`,
              );
            }
          }
        }

        const updated = await apiClient<ExamDto>(`/exams/${id}/content`, {
          method: 'PUT',
          body: JSON.stringify({
            questions: questions.map((q, idx) => ({
              ...q,
              position: idx,
              options: q.options.map((opt, oIdx) => ({
                ...opt,
                position: oIdx,
              })),
            })),
          }),
        });

        setExam(updated);
      }

      await invalidateExamQueries(queryClient, id);

      setSuccessMsg('Exam changes saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err, 'Failed to save changes.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div
          className="glass-panel"
          style={{ height: '400px', animation: 'pulse 1.5s infinite' }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.5rem 5rem' }}>
      {/* Top Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <Link
          href={`/exams/${id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Exam</span>
        </Link>

        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Content Version: <strong>{exam?.contentVersion || 1}</strong>
        </span>
      </div>

      <form onSubmit={handleSaveAll}>
        {/* Banner Messages */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Exam Settings & Metadata */}
        <div
          className="glass-panel"
          style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}
        >
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Exam Settings
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                  fontWeight: '500',
                }}
              >
                Exam Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: '500',
                  }}
                >
                  Folder
                </label>
                <select
                  value={folderId || ''}
                  onChange={(e) => setFolderId(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: '#1e293b',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="">(No folder - Root)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                    fontWeight: '500',
                  }}
                >
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                  placeholder="30 (leave blank for untimed)"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                  fontWeight: '500',
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* Shuffle Toggles */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                />
                <span>Shuffle Questions per Attempt</span>
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                />
                <span>Shuffle Option Choices per Question</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Questions Editor (TASK-071) */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Questions ({questions.length})
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Each question supports 2 to 6 options with exactly one correct answer.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddQuestion}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--brand-primary)',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="glass-panel"
                style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
              >
                {/* Question Header & Order buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                  }}
                >
                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    QUESTION {qIndex + 1}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(qIndex, 'up')}
                      disabled={qIndex === 0}
                      title="Move Up"
                      style={{
                        background: 'transparent',
                        padding: '0.3rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuestion(qIndex, 'down')}
                      disabled={qIndex === questions.length - 1}
                      title="Move Down"
                      style={{
                        background: 'transparent',
                        padding: '0.3rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      title="Delete Question"
                      style={{
                        background: 'transparent',
                        padding: '0.3rem',
                        color: 'var(--accent-rose)',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Prompt input */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.3rem',
                    }}
                  >
                    Prompt / Japanese Sentence *
                  </label>
                  <input
                    type="text"
                    value={q.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) => {
                        const copy = [...prev];
                        copy[qIndex].content = val;
                        return copy;
                      });
                    }}
                    placeholder="e.g. 日本へ＿＿前に、日本語を勉強しました。"
                    required
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Options List */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Options (Select radio for correct answer):
                  </label>

                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: opt.isCorrect
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(15, 23, 42, 0.4)',
                        border: opt.isCorrect
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Correct answer radio */}
                      <input
                        type="radio"
                        name={`correct-opt-${qIndex}`}
                        checked={opt.isCorrect}
                        onChange={() => handleSetCorrectOption(qIndex, oIndex)}
                        title="Mark as correct answer"
                        style={{ cursor: 'pointer' }}
                      />

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
                          color: opt.isCorrect ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      >
                        {OPTION_LETTERS[oIndex]}
                      </span>

                      <input
                        type="text"
                        value={opt.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) => {
                            const copy = [...prev];
                            copy[qIndex].options[oIndex].content = val;
                            return copy;
                          });
                        }}
                        placeholder={`Option ${OPTION_LETTERS[oIndex]}`}
                        required
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '0.9375rem',
                          outline: 'none',
                        }}
                      />

                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(qIndex, oIndex)}
                          title="Remove Option"
                          style={{
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            padding: '0.2rem',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {q.options.length < 6 && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIndex)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Option choice ({6 - q.options.length} remaining)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div
          style={{
            position: 'sticky',
            bottom: '1.5rem',
            zIndex: 20,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <Link
            href={`/exams/${id}`}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.875rem',
              boxShadow: 'var(--shadow-glow)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Exam'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
