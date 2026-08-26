'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TagDto } from '@japanese-learning/contracts';

const MAX_TAGS = 20;

function normalizeForEditor(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

interface TagEditorProps {
  tags: TagDto[];
  onSave: (names: string[]) => Promise<void>;
}

export function TagEditor({ tags, onSave }: TagEditorProps) {
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNames(tags.map((tag) => tag.name));
  }, [tags]);

  const addDraft = () => {
    const normalized = normalizeForEditor(draft);
    if (!normalized) return;
    if (names.some((name) => name.toLowerCase() === normalized.toLowerCase())) {
      setDraft('');
      return;
    }
    if (names.length >= MAX_TAGS) {
      setError(`A learning item can have at most ${MAX_TAGS} tags.`);
      return;
    }
    setNames((current) => [...current, normalized]);
    setDraft('');
    setError(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(names);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save tags.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-label="Learning tags"
      style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.6rem',
        }}
      >
        <div>
          <strong style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>Tags</strong>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
            {names.length}/{MAX_TAGS}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving}
          style={{
            padding: '0.35rem 0.7rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--brand-primary)',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: isSaving ? 'wait' : 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : 'Save tags'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
        {names.map((name) => (
          <span
            key={name.toLowerCase()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.45rem 0.25rem 0.6rem',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              fontSize: '0.75rem',
            }}
          >
            {name}
            <button
              type="button"
              aria-label={`Remove tag ${name}`}
              onClick={() => setNames((current) => current.filter((item) => item !== name))}
              style={{ background: 'transparent', color: 'inherit', padding: 0, lineHeight: 1 }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={draft}
          maxLength={32}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add a tag, e.g. N3 grammar"
          aria-label="New learning tag"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.45rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
          }}
        />
        <button
          type="button"
          onClick={addDraft}
          aria-label="Add learning tag"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.45rem 0.7rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0.45rem 0 0' }}>
        Flat tags are shared across flashcards and exams. Names are normalized when saved.
      </p>
      {error && <p style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>{error}</p>}
    </section>
  );
}
