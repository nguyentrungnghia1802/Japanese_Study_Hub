'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  Award,
  Play,
  Edit,
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { API_BASE_URL, getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const examQuery = useQuery({
    queryKey: queryKeys.exam(id),
    queryFn: ({ signal }) => studyApi.exam(id, signal),
    enabled: Boolean(id),
  });
  const exam = examQuery.data ?? null;
  const isLoading = examQuery.isLoading;
  const error = examQuery.error
    ? getApiErrorMessage(examQuery.error, 'Failed to load exam details.')
    : null;

  const handleExport = async () => {
    if (!exam) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/exams/${exam.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(`Export error: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div
          className="glass-panel"
          style={{ height: '350px', animation: 'pulse 1.5s infinite' }}
        />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem', textAlign: 'center' }}
      >
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <AlertCircle size={40} style={{ color: 'var(--accent-rose)', margin: '0 auto 1rem' }} />
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            {error || 'Exam not found'}
          </h2>
          <Link
            href="/exams"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Exams</span>
          </Link>
        </div>
      </div>
    );
  }

  const timeMinutes = exam.timeLimitSeconds ? Math.round(exam.timeLimitSeconds / 60) : null;

  return (
    <div
      aria-busy={isLoading}
      style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }}
    >
      {/* Back button */}
      <Link
        href="/exams"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Exam Library</span>
      </Link>

      {/* Main Briefing Card */}
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-primary)',
              fontSize: '0.8125rem',
              fontWeight: '700',
            }}
          >
            {exam.questionCount} {exam.questionCount === 1 ? 'QUESTION' : 'QUESTIONS'}
          </span>

          {timeMinutes ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                fontSize: '0.8125rem',
                fontWeight: '600',
              }}
            >
              <Clock size={13} />
              <span>{timeMinutes} MINUTES TIMED</span>
            </span>
          ) : (
            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: '600',
              }}
            >
              UNTIMED PRACTICE
            </span>
          )}

          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
            }}
          >
            Version {exam.contentVersion}
          </span>
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            lineHeight: '1.3',
          }}
        >
          {exam.title}
        </h1>

        {exam.description && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.6',
              marginBottom: '2rem',
            }}
          >
            {exam.description}
          </p>
        )}

        {/* Best Score Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background:
              exam.bestScore !== null ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.4)',
            border:
              exam.bestScore !== null
                ? '1px solid rgba(16, 185, 129, 0.25)'
                : '1px solid var(--border-subtle)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background:
                exam.bestScore !== null ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: exam.bestScore !== null ? 'var(--accent-emerald)' : 'var(--text-muted)',
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: '600',
              }}
            >
              Personal Best Score
            </div>
            <div
              style={{
                fontSize: '1.375rem',
                fontWeight: '800',
                color: exam.bestScore !== null ? 'var(--accent-emerald)' : 'var(--text-primary)',
              }}
            >
              {exam.bestScore !== null ? `${exam.bestScore}%` : 'No attempts yet'}
            </div>
          </div>
        </div>

        {/* Rules & Instructions */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '2.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <HelpCircle size={16} style={{ color: 'var(--brand-primary)' }} />
            <span>Examination Rules</span>
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              lineHeight: '1.7',
            }}
          >
            <li>Single-choice format: select one best answer per question.</li>
            <li>In-progress answers are autosaved so you can refresh without losing progress.</li>
            {exam.timeLimitSeconds && (
              <li>
                The exam timer runs on the server and expires strictly after {timeMinutes} minutes.
              </li>
            )}
            <li>Your answers are graded instantly upon submission.</li>
          </ul>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push(`/exams/${exam.id}/take`)}
            disabled={exam.questionCount === 0}
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.875rem 2rem',
              borderRadius: 'var(--radius-md)',
              background: exam.questionCount > 0 ? 'var(--gradient-brand)' : '#334155',
              color: '#fff',
              fontWeight: '700',
              fontSize: '1rem',
              boxShadow: exam.questionCount > 0 ? 'var(--shadow-glow)' : 'none',
              cursor: exam.questionCount > 0 ? 'pointer' : 'not-allowed',
              opacity: exam.questionCount > 0 ? 1 : 0.6,
            }}
          >
            <Play size={18} />
            <span>{exam.questionCount > 0 ? 'Start Examination' : 'No Questions Added'}</span>
          </button>

          <Link
            href={`/exams/${exam.id}/edit`}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontWeight: '600',
              fontSize: '0.9375rem',
              textDecoration: 'none',
            }}
          >
            <Edit size={16} />
            <span>Edit Exam</span>
          </Link>

          <button
            type="button"
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              fontSize: '0.9375rem',
            }}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
