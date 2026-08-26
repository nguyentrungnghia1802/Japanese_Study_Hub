'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  BookOpen,
  FileCheck,
  Folder,
  Layers,
  Sparkles,
  ArrowRight,
  Play,
  Award,
} from 'lucide-react';
import { SearchResultsDto } from '@japanese-learning/contracts';
import { apiClient, getApiErrorMessage } from '@/lib/api-client';
import { getUiPreference, setUiPreference, UiLibraryTab } from '@/lib/ui-preferences';

type SearchTab = 'ALL' | 'SETS' | 'CARDS' | 'EXAMS' | 'FOLDERS';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('ALL');
  const [results, setResults] = useState<SearchResultsDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedTab = getUiPreference('libraryTab');
    if (
      storedTab === 'ALL' ||
      storedTab === 'SETS' ||
      storedTab === 'CARDS' ||
      storedTab === 'EXAMS' ||
      storedTab === 'FOLDERS'
    ) {
      setActiveTab(storedTab as UiLibraryTab);
    }
  }, []);

  const selectTab = (tab: SearchTab) => {
    setActiveTab(tab);
    setUiPreference('libraryTab', tab);
  };

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<SearchResultsDto>(
        `/search?q=${encodeURIComponent(q.trim())}&limit=30`,
      );
      setResults(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Unable to complete search.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const hasAnyResults =
    results &&
    (results.flashcardSets.length > 0 ||
      results.flashcards.length > 0 ||
      results.exams.length > 0 ||
      results.folders.length > 0);
  const isRefreshing = isLoading && results !== null;

  return (
    <div
      aria-busy={isLoading}
      style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem 5rem' }}
    >
      {isRefreshing && (
        <div
          role="status"
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}
        >
          Refreshing search results…
        </div>
      )}
      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--accent-rose)',
            marginBottom: '1rem',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void performSearch(query)}
            style={{ color: 'var(--brand-primary)', background: 'transparent', fontWeight: '600' }}
          >
            Retry
          </button>
        </div>
      )}
      {/* Search Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--brand-primary)',
            fontSize: '0.875rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
          }}
        >
          <Sparkles size={16} />
          <span>CROSS-DOMAIN EXPLORER</span>
        </div>
        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
          }}
        >
          Search Learning Hub
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            maxWidth: '550px',
            margin: '0 auto',
          }}
        >
          Find vocabulary, kanji, grammar cards, JLPT exams, and folder categories in one search.
        </p>
      </div>

      {/* Big Search Input */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <SearchIcon
          size={22}
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--brand-primary)',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in Japanese (漢字, ひらがな) or English..."
          autoFocus
          style={{
            width: '100%',
            padding: '1.125rem 1.25rem 1.125rem 3.5rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--text-primary)',
            fontSize: '1.125rem',
            outline: 'none',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        />
      </div>

      {/* Category Tabs */}
      {results && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button
            onClick={() => selectTab('ALL')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              background:
                activeTab === 'ALL' ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            All Results ({results.total})
          </button>
          <button
            onClick={() => selectTab('SETS')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              background:
                activeTab === 'SETS' ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            Flashcard Sets ({results.flashcardSets.length})
          </button>
          <button
            onClick={() => selectTab('CARDS')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              background:
                activeTab === 'CARDS' ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            Cards ({results.flashcards.length})
          </button>
          <button
            onClick={() => selectTab('EXAMS')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              background:
                activeTab === 'EXAMS' ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            Exams ({results.exams.length})
          </button>
          <button
            onClick={() => selectTab('FOLDERS')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-md)',
              background:
                activeTab === 'FOLDERS' ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}
          >
            Folders ({results.folders.length})
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !results && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div
            className="glass-panel"
            style={{ height: '160px', animation: 'pulse 1.5s infinite' }}
          />
        </div>
      )}

      {/* Empty states */}
      {!isLoading && query.trim() && !hasAnyResults && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <SearchIcon size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            No results found for &ldquo;{query}&rdquo;
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Try searching for kanji, furigana readings, or English translations.
          </p>
        </div>
      )}

      {/* Results Sections */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Flashcard Sets */}
          {(activeTab === 'ALL' || activeTab === 'SETS') && results.flashcardSets.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} />
                <span>Flashcard Sets ({results.flashcardSets.length})</span>
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {results.flashcardSets.map((s) => (
                  <div
                    key={s.id}
                    className="glass-panel card-interactive"
                    style={{ padding: '1.25rem' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '1.0625rem',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {s.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--brand-primary)',
                          fontWeight: '700',
                        }}
                      >
                        {s.cardCount} cards
                      </span>
                    </div>
                    {s.description && (
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '1rem',
                          lineHeight: '1.4',
                        }}
                      >
                        {s.description}
                      </p>
                    )}
                    <Link
                      href={`/flashcards/${s.id}/study`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.875rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--gradient-brand)',
                        color: '#fff',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        textDecoration: 'none',
                      }}
                    >
                      <Play size={12} />
                      <span>Study Deck</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Flashcards */}
          {(activeTab === 'ALL' || activeTab === 'CARDS') && results.flashcards.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Layers size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span>Vocabulary & Cards ({results.flashcards.length})</span>
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {results.flashcards.map((c) => (
                  <div key={c.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Set: <strong>{c.setName}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {c.front}
                    </div>
                    <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                      {c.back}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exams */}
          {(activeTab === 'ALL' || activeTab === 'EXAMS') && results.exams.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FileCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
                <span>JLPT Exams ({results.exams.length})</span>
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {results.exams.map((e) => (
                  <div
                    key={e.id}
                    className="glass-panel card-interactive"
                    style={{ padding: '1.25rem' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '1.0625rem',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {e.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-cyan)',
                          fontWeight: '700',
                        }}
                      >
                        {e.questionCount} Qs
                      </span>
                    </div>

                    {e.bestScore !== null && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          color: 'var(--accent-emerald)',
                          fontWeight: '700',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <Award size={13} />
                        <span>Best: {e.bestScore}%</span>
                      </div>
                    )}

                    <div style={{ marginTop: '0.5rem' }}>
                      <Link
                        href={`/exams/${e.id}/take`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.875rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--gradient-brand)',
                          color: '#fff',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        <Play size={12} />
                        <span>Take Exam</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam Folders */}
          {(activeTab === 'ALL' || activeTab === 'FOLDERS') && results.folders.length > 0 && (
            <div>
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Folder size={18} style={{ color: 'var(--accent-amber)' }} />
                <span>Exam Folders ({results.folders.length})</span>
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {results.folders.map((f) => (
                  <Link
                    key={f.id}
                    href="/exams"
                    className="glass-panel card-interactive"
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      textDecoration: 'none',
                    }}
                  >
                    <Folder size={20} style={{ color: 'var(--accent-amber)' }} />
                    <div>
                      <div
                        style={{
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          fontSize: '0.9375rem',
                        }}
                      >
                        {f.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {f.examCount || 0} exams
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
