'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  BookOpen,
  Play,
  Copy,
  Trash2,
  Download,
  Edit,
  Sparkles,
  Upload,
  Star,
} from 'lucide-react';
import { FlashcardSetDto } from '@japanese-learning/contracts';
import { API_BASE_URL, apiClient, getApiErrorMessage } from '@/lib/api-client';
import { PrefetchLink } from '@/components/navigation/prefetch-link';
import { invalidateFlashcardQueries } from '@/lib/query-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { studyApi } from '@/lib/study-api';
import { getUiPreference, setUiPreference, UiSortValue } from '@/lib/ui-preferences';

const FlashcardImportModal = dynamic(
  () =>
    import('@/components/flashcards/flashcard-import-modal').then(
      (module) => module.FlashcardImportModal,
    ),
  { ssr: false },
);

export default function FlashcardsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<UiSortValue>('createdAt_desc');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('search') ?? '');
    const storedSort = getUiPreference('sort');
    if (
      storedSort === 'createdAt_desc' ||
      storedSort === 'updatedAt_desc' ||
      storedSort === 'title_asc'
    ) {
      setSort(storedSort);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(window.location.search);
    if (value.trim()) params.set('search', value);
    else params.delete('search');
    const query = params.toString();
    router.replace(`/flashcards${query ? `?${query}` : ''}`, { scroll: false });
  };

  const handleSortChange = (value: UiSortValue) => {
    setSort(value);
    setUiPreference('sort', value);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const setsQuery = useQuery({
    queryKey: queryKeys.flashcardSets({
      search: debouncedSearch || undefined,
      page: 1,
      pageSize: 20,
      sort,
      favorite: favoriteOnly ? true : undefined,
    }),
    queryFn: ({ signal }) =>
      studyApi.flashcardSets(
        {
          search: debouncedSearch || undefined,
          page: 1,
          pageSize: 20,
          sort,
          favorite: favoriteOnly ? true : undefined,
        },
        signal,
      ),
    placeholderData: (previousData) => previousData,
  });

  const sets = setsQuery.data?.items ?? [];
  const isLoading = setsQuery.isLoading;
  const isRefreshing = setsQuery.isFetching && !isLoading;

  const handleFavoriteToggle = async (id: string, favorite: boolean) => {
    try {
      await studyApi.setFlashcardFavorite(id, favorite);
      await invalidateFlashcardQueries(queryClient, id);
    } catch (err: unknown) {
      alert(`Failed to update favorite: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setActionError(null);

    try {
      const created = await apiClient<FlashcardSetDto>('/flashcard-sets', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
        }),
      });

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/flashcards/${created.id}`);
    } catch (err: unknown) {
      setActionError(getApiErrorMessage(err, 'Failed to create flashcard set'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicateSet = async (id: string) => {
    try {
      await apiClient<FlashcardSetDto>(`/flashcard-sets/${id}/duplicate`, {
        method: 'POST',
      });
      await invalidateFlashcardQueries(queryClient);
    } catch (err: unknown) {
      alert(`Failed to duplicate: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  const handleDeleteSet = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await apiClient(`/flashcard-sets/${id}`, {
        method: 'DELETE',
      });
      await invalidateFlashcardQueries(queryClient, id);
    } catch (err: unknown) {
      alert(`Failed to delete: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  const handleExportSet = async (id: string, title: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE_URL}/flashcard-sets/${id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert(`Export error: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  return (
    <div
      aria-busy={isLoading}
      style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}
    >
      {isRefreshing && (
        <div
          role="status"
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}
        >
          Refreshing flashcard decks…
        </div>
      )}
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--accent-cyan)',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.25rem',
            }}
          >
            <Sparkles size={16} />
            <span>FLASHCARD DECKS</span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Japanese Flashcards
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Master vocabulary, kanji, and grammar through interactive spaced repetition cards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <Upload size={16} />
            <span>Import Markdown</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: 'var(--shadow-glow)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <Plus size={16} />
            <span>New Deck</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search flashcard sets by title or description..."
          style={{
            width: '100%',
            padding: '0.75rem 11rem 0.75rem 2.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            outline: 'none',
          }}
        />
        <select
          value={sort}
          onChange={(event) => handleSortChange(event.target.value as UiSortValue)}
          aria-label="Sort flashcard decks"
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.35rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: '#1e293b',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="createdAt_desc">Newest</option>
          <option value="updatedAt_desc">Recently updated</option>
          <option value="title_asc">Title A–Z</option>
        </select>
        <select
          value={favoriteOnly ? 'favorites' : 'all'}
          onChange={(event) => setFavoriteOnly(event.target.value === 'favorites')}
          aria-label="Filter flashcard decks by favorite"
          style={{
            position: 'absolute',
            right: '8.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.35rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: '#1e293b',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All decks</option>
          <option value="favorites">Favorites</option>
        </select>
      </div>

      {/* Sets Grid */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-panel"
              style={{ height: '180px', animation: 'pulse 1.5s infinite' }}
            />
          ))}
        </div>
      ) : setsQuery.isError ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Unable to load flashcard sets
          </h3>
          <p style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>
            {getApiErrorMessage(setsQuery.error, 'Please try again.')}
          </p>
          <button
            onClick={() => void setsQuery.refetch()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              color: '#fff',
              fontWeight: '600',
            }}
          >
            Retry
          </button>
        </div>
      ) : sets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <BookOpen size={28} />
          </div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            No flashcard sets found
          </h3>
          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '400px',
              margin: '0 auto 1.5rem',
              fontSize: '0.9375rem',
            }}
          >
            {search
              ? 'Try adjusting your search keywords.'
              : 'Create your first flashcard deck or import one from Markdown.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              Create Deck
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: 'var(--accent-cyan)',
                fontWeight: '600',
                fontSize: '0.875rem',
              }}
            >
              Import Markdown
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {sets.map((set) => (
            <div
              key={set.id}
              className="glass-panel card-interactive"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                    }}
                  >
                    {set.cardCount} {set.cardCount === 1 ? 'CARD' : 'CARDS'}
                  </span>

                  {/* Actions Dropdown / Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => void handleFavoriteToggle(set.id, !set.isFavorite)}
                      title={set.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      aria-label={set.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      style={{
                        background: 'transparent',
                        padding: '0.35rem',
                        color: set.isFavorite ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      <Star size={15} fill={set.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleExportSet(set.id, set.title)}
                      title="Export as Markdown"
                      style={{
                        background: 'transparent',
                        padding: '0.35rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => handleDuplicateSet(set.id)}
                      title="Duplicate Deck"
                      style={{
                        background: 'transparent',
                        padding: '0.35rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteSet(set.id, set.title)}
                      title="Delete Deck"
                      style={{
                        background: 'transparent',
                        padding: '0.35rem',
                        color: 'var(--accent-rose)',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <PrefetchLink href={`/flashcards/${set.id}`} style={{ textDecoration: 'none' }}>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '0.5rem',
                      lineHeight: '1.4',
                    }}
                  >
                    {set.title}
                  </h3>
                </PrefetchLink>

                {set.description && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {set.description}
                  </p>
                )}
              </div>

              {/* Card Footer Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <PrefetchLink
                  href={`/flashcards/${set.id}/study`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    background: set.cardCount > 0 ? 'var(--gradient-brand)' : '#334155',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    boxShadow: set.cardCount > 0 ? 'var(--shadow-glow)' : 'none',
                    pointerEvents: set.cardCount > 0 ? 'auto' : 'none',
                    opacity: set.cardCount > 0 ? 1 : 0.5,
                  }}
                >
                  <Play size={14} />
                  <span>Study</span>
                </PrefetchLink>

                <PrefetchLink
                  href={`/flashcards/${set.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </PrefetchLink>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Set Modal */}
      {isCreateModalOpen && (
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
            style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              Create New Deck
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
              }}
            >
              Give your new flashcard deck a title and optional description.
            </p>

            {actionError && (
              <p
                style={{ color: 'var(--accent-rose)', fontSize: '0.875rem', marginBottom: '1rem' }}
              >
                {actionError}
              </p>
            )}

            <form
              onSubmit={handleCreateSet}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Deck Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. JLPT N5 Kanji Set 1"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Description (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Basic numbers, days of the week, and nature kanji."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--gradient-brand)',
                    color: '#fff',
                    fontWeight: '600',
                    boxShadow: 'var(--shadow-glow)',
                    opacity: isCreating ? 0.7 : 1,
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Markdown Modal */}
      <FlashcardImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(id) => {
          void invalidateFlashcardQueries(queryClient);
          router.push(`/flashcards/${id}`);
        }}
      />
    </div>
  );
}
