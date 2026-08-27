'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { CACHE_POLICY } from '@/lib/cache-policy';
import { getApiErrorMessage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import ExamResultReview from '@/components/exams/exam-result-review';
import { SkeletonBlock } from '@/components/ui/skeleton';

export default function SubmittedExamReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const resultQuery = useQuery({
    queryKey: queryKeys.submittedAttemptResult(attemptId),
    queryFn: ({ signal }) => studyApi.submittedAttemptResult(attemptId, signal),
    enabled: Boolean(attemptId),
    staleTime: CACHE_POLICY.entityDetail.staleTime,
    gcTime: CACHE_POLICY.entityDetail.gcTime,
  });

  if (resultQuery.isLoading) {
    return (
      <main
        aria-busy="true"
        style={{ maxWidth: '920px', margin: '0 auto', padding: '2rem 1.5rem' }}
      >
        <SkeletonBlock height="24rem" />
      </main>
    );
  }

  if (resultQuery.isError || !resultQuery.data) {
    return (
      <main
        role="alert"
        style={{ maxWidth: '760px', margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}
      >
        <AlertTriangle size={36} style={{ color: 'var(--accent-amber)' }} />
        <h1 style={{ color: 'var(--text-primary)' }}>Review is unavailable</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {getApiErrorMessage(
            resultQuery.error,
            'This submitted attempt no longer exists or is not finalized.',
          )}
        </p>
      </main>
    );
  }

  return <ExamResultReview result={resultQuery.data} />;
}
