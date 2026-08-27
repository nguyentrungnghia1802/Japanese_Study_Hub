'use client';

import React from 'react';
import { Clock3, History, Star, Trash2 } from 'lucide-react';
import type {
  DictionaryFavoriteListResponseDto,
  DictionaryLookupDirection,
  DictionaryLookupHistoryResponseDto,
} from '@japanese-learning/contracts';

interface LookupSavedItemsProps {
  history: DictionaryLookupHistoryResponseDto | undefined;
  favorites: DictionaryFavoriteListResponseDto | undefined;
  isLoading: boolean;
  error: string | null;
  onHistorySelect: (query: string, direction: DictionaryLookupDirection) => void;
  onFavoriteSelect: (query: string, direction: DictionaryLookupDirection) => void;
  onClearHistory: () => void;
  onRemoveFavorite: (id: string) => void;
}

const DIRECTION_LABELS: Record<string, string> = {
  JA_TO_VI: 'Nhật → Việt',
  VI_TO_JA: 'Việt → Nhật',
};

export default function LookupSavedItems({
  history,
  favorites,
  isLoading,
  error,
  onHistorySelect,
  onFavoriteSelect,
  onClearHistory,
  onRemoveFavorite,
}: LookupSavedItemsProps) {
  const visibleHistory = history?.items.slice(0, 8) ?? [];
  const visibleFavorites = favorites?.items.slice(0, 8) ?? [];

  return (
    <section
      aria-label="Tra cứu đã lưu"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <div className="glass-panel" style={{ padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          >
            <History size={17} style={{ color: 'var(--accent-cyan)' }} />
            Gần đây
          </h2>
          {visibleHistory.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: 'var(--accent-rose)',
                fontSize: '0.75rem',
              }}
            >
              <Trash2 size={13} />
              Xóa
            </button>
          )}
        </div>
        {isLoading && (
          <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Đang tải…
          </p>
        )}
        {!isLoading && visibleHistory.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Các từ bạn tra cứu sẽ xuất hiện ở đây.
          </p>
        )}
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          {visibleHistory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onHistorySelect(item.query, item.direction)}
              style={savedButtonStyle}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                <Clock3 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.primaryLabel || item.query}
                </span>
              </span>
              <span style={metaStyle}>{DIRECTION_LABELS[item.direction] ?? item.direction}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          >
            <Star size={17} style={{ color: 'var(--accent-amber)' }} />
            Yêu thích
          </h2>
          <span style={metaStyle}>{favorites?.total ?? 0}</span>
        </div>
        {isLoading && (
          <p role="status" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Đang tải…
          </p>
        )}
        {!isLoading && visibleFavorites.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Lưu một kết quả để mở lại nhanh hơn.
          </p>
        )}
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          {visibleFavorites.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => onFavoriteSelect(item.term, item.direction)}
                style={{ ...savedButtonStyle, flex: 1, minWidth: 0 }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}
                >
                  {item.term}
                  {item.reading ? ` · ${item.reading}` : ''}
                </span>
                <span
                  style={{
                    ...metaStyle,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.meaningSummary}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveFavorite(item.id)}
                aria-label={`Bỏ yêu thích ${item.term}`}
                style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          style={{ gridColumn: '1 / -1', color: 'var(--accent-rose)', fontSize: '0.82rem' }}
        >
          Không thể tải lịch sử hoặc mục yêu thích lúc này; tra cứu từ điển vẫn hoạt động.
          <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {error}
          </span>
        </p>
      )}
    </section>
  );
}

const metaStyle = { color: 'var(--text-muted)', fontSize: '0.72rem' } as const;
const savedButtonStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.65rem',
  width: '100%',
  padding: '0.5rem 0.4rem',
  borderRadius: 'var(--radius-sm)',
  textAlign: 'left',
} as const;
