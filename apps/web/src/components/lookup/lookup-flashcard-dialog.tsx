'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import type { FlashcardSetListItemDto } from '@japanese-learning/contracts';
import { getApiErrorMessage } from '@/lib/api-client';
import { invalidateFlashcardQueries } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';

export interface LookupFlashcardDraft {
  japanese: string;
  reading: string | null;
  meaning: string;
  example?: string | null;
}

export interface FlashcardTextDraft {
  front: string;
  back: string;
}

interface LookupFlashcardDialogProps {
  draft: (LookupFlashcardDraft | FlashcardTextDraft) | null;
  onClose: () => void;
  onSaved: (setId: string) => void;
}

export function createFlashcardDraftText(draft: LookupFlashcardDraft | FlashcardTextDraft) {
  if ('front' in draft && 'back' in draft) return draft;
  return {
    front: `${draft.japanese}${draft.reading ? `\n${draft.reading}` : ''}`,
    back: `${draft.meaning}${draft.example ? `\n\n${draft.example}` : ''}`,
  };
}

export default function LookupFlashcardDialog({
  draft,
  onClose,
  onSaved,
}: LookupFlashcardDialogProps) {
  const queryClient = useQueryClient();
  const [setId, setSetId] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const setsQuery = useQuery({
    queryKey: queryKeys.flashcardSets({ page: 1, pageSize: 100 }),
    queryFn: ({ signal }) => studyApi.flashcardSets({ page: 1, pageSize: 100 }, signal),
    enabled: draft !== null,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!draft) return;
    const text = createFlashcardDraftText(draft);
    setFront(text.front);
    setBack(text.back);
    setSetId('');
    setSubmitError(null);
  }, [draft]);

  if (!draft) return null;

  const sets: FlashcardSetListItemDto[] = setsQuery.data?.items ?? [];

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!setId || !front.trim() || !back.trim()) {
      setSubmitError('Chọn một bộ thẻ và nhập đủ mặt trước, mặt sau.');
      return;
    }
    setIsSaving(true);
    setSubmitError(null);
    try {
      await studyApi.createFlashcard(setId, { front: front.trim(), back: back.trim() });
      await invalidateFlashcardQueries(queryClient, setId);
      onSaved(setId);
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, 'Không thể thêm thẻ. Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lookup-flashcard-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        background: 'rgba(2, 6, 23, 0.78)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(event) => void save(event)}
        style={{
          width: 'min(100%, 620px)',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          padding: '1.35rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2
              id="lookup-flashcard-dialog-title"
              style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}
            >
              Thêm vào Flashcard
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Chọn bộ thẻ hiện có và chỉnh nội dung trước khi lưu.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ color: 'var(--text-muted)', padding: '0.35rem' }}
          >
            <X size={18} />
          </button>
        </div>

        <label
          style={{
            display: 'grid',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          Bộ thẻ đích
          <select
            value={setId}
            onChange={(event) => setSetId(event.target.value)}
            disabled={setsQuery.isLoading || isSaving}
            required
            style={fieldStyle}
          >
            <option value="">Chọn một bộ thẻ…</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.title} ({set.cardCount} thẻ)
              </option>
            ))}
          </select>
        </label>
        {setsQuery.isError && (
          <p
            role="alert"
            style={{ color: 'var(--accent-rose)', fontSize: '0.82rem', marginTop: '0.6rem' }}
          >
            {getApiErrorMessage(setsQuery.error, 'Không thể tải danh sách bộ thẻ.')}
          </p>
        )}
        {!setsQuery.isLoading && !setsQuery.isError && sets.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.6rem' }}>
            Chưa có bộ thẻ. Hãy tạo một bộ thẻ trước; Study Hub không tự tạo bộ mới.
          </p>
        )}

        <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
          <label style={labelStyle}>
            Mặt trước
            <textarea
              value={front}
              onChange={(event) => setFront(event.target.value)}
              disabled={isSaving}
              rows={3}
              style={textAreaStyle}
            />
          </label>
          <label style={labelStyle}>
            Mặt sau
            <textarea
              value={back}
              onChange={(event) => setBack(event.target.value)}
              disabled={isSaving}
              rows={5}
              style={textAreaStyle}
            />
          </label>
        </div>
        {submitError && (
          <p
            role="alert"
            style={{ color: 'var(--accent-rose)', fontSize: '0.82rem', marginTop: '0.8rem' }}
          >
            {submitError}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.6rem',
            marginTop: '1.2rem',
          }}
        >
          <button type="button" onClick={onClose} disabled={isSaving} style={secondaryButtonStyle}>
            Hủy
          </button>
          <button type="submit" disabled={isSaving || sets.length === 0} style={primaryButtonStyle}>
            <Check size={15} />
            {isSaving ? 'Đang lưu…' : 'Lưu thẻ'}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = {
  display: 'grid',
  gap: '0.4rem',
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
} as const;
const fieldStyle = {
  width: '100%',
  padding: '0.7rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  background: 'rgba(15, 23, 42, 0.9)',
  color: 'var(--text-primary)',
} as const;
const textAreaStyle = { ...fieldStyle, resize: 'vertical', lineHeight: 1.5 } as const;
const secondaryButtonStyle = {
  padding: '0.6rem 0.85rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
} as const;
const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.6rem 0.9rem',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--gradient-brand)',
  color: '#fff',
  fontWeight: 700,
} as const;
