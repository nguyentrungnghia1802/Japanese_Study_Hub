'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Edit2,
  Check,
  X,
  BookOpen,
  Download,
} from 'lucide-react';
import { FlashcardSetDto, FlashcardDto } from '@japanese-learning/contracts';
import { apiClient } from '@/lib/api-client';

export default function FlashcardSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [set, setSet] = useState<FlashcardSetDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set edit state
  const [isEditingSet, setIsEditingSet] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Add Card form
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  // Card edit state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const fetchSet = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<FlashcardSetDto>(`/flashcard-sets/${id}`);
      setSet(data);
      setEditTitle(data.title);
      setEditDescription(data.description || '');
    } catch (err: unknown) {
      const apiErr = err as Error;
      setError(apiErr.message || 'Failed to load flashcard set');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSet();
  }, [fetchSet]);

  const handleUpdateSet = async () => {
    if (!editTitle.trim()) return;
    try {
      await apiClient<FlashcardSetDto>(`/flashcard-sets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
        }),
      });
      setIsEditingSet(false);
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Update failed: ${apiErr.message}`);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    setIsSubmittingCard(true);
    try {
      await apiClient<FlashcardDto>(`/flashcard-sets/${id}/cards`, {
        method: 'POST',
        body: JSON.stringify({
          front: newFront.trim(),
          back: newBack.trim(),
        }),
      });
      setNewFront('');
      setNewBack('');
      setIsAddingCard(false);
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Failed to add card: ${apiErr.message}`);
    } finally {
      setIsSubmittingCard(false);
    }
  };

  const handleUpdateCard = async (cardId: string) => {
    if (!editFront.trim() || !editBack.trim()) return;
    try {
      await apiClient(`/flashcard-sets/${id}/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          front: editFront.trim(),
          back: editBack.trim(),
        }),
      });
      setEditingCardId(null);
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Update card failed: ${apiErr.message}`);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await apiClient(`/flashcard-sets/${id}/cards/${cardId}`, {
        method: 'DELETE',
      });
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Delete failed: ${apiErr.message}`);
    }
  };

  const handleDuplicateCard = async (cardId: string) => {
    try {
      await apiClient(`/flashcard-sets/${id}/cards/${cardId}/duplicate`, {
        method: 'POST',
      });
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Duplicate failed: ${apiErr.message}`);
    }
  };

  const handleMoveCard = async (currentIndex: number, direction: 'UP' | 'DOWN') => {
    if (!set || !set.cards) return;
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= set.cards.length) return;

    const cardsCopy = [...set.cards];
    const [moved] = cardsCopy.splice(currentIndex, 1);
    cardsCopy.splice(targetIndex, 0, moved);

    const newIds = cardsCopy.map((c) => c.id);

    try {
      await apiClient(`/flashcard-sets/${id}/cards/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ cardIds: newIds }),
      });
      fetchSet();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Reorder failed: ${apiErr.message}`);
    }
  };

  const handleExportSet = async () => {
    if (!set) return;
    try {
      const token = localStorage.getItem('auth_token');
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/flashcard-sets/${id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${set.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Export error: ${apiErr.message}`);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Loading deck...</p>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div
        style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--accent-rose)', marginBottom: '1rem' }}>
          {error || 'Deck not found'}
        </p>
        <button
          onClick={() => router.push('/flashcards')}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
          }}
        >
          Back to Flashcards
        </button>
      </div>
    );
  }

  const cards = set.cards || [];

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top back navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/flashcards"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            transition: 'var(--transition-fast)',
          }}
        >
          <ArrowLeft size={16} />
          <span>All Flashcard Decks</span>
        </Link>
      </div>

      {/* Set Header Card */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        {isEditingSet ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Deck title"
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              style={{
                fontSize: '0.9375rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsEditingSet(false)}
                style={{
                  padding: '0.45rem 0.875rem',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSet}
                style={{
                  padding: '0.45rem 1rem',
                  background: 'var(--gradient-brand)',
                  color: '#fff',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {set.title}
                </h1>
                <button
                  onClick={() => setIsEditingSet(true)}
                  title="Edit title & description"
                  style={{
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    padding: '0.25rem',
                  }}
                >
                  <Edit2 size={16} />
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleExportSet}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <Download size={15} />
                  <span>Export</span>
                </button>

                <Link
                  href={`/flashcards/${id}/study`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: cards.length > 0 ? 'var(--gradient-brand)' : '#334155',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    boxShadow: cards.length > 0 ? 'var(--shadow-glow)' : 'none',
                    pointerEvents: cards.length > 0 ? 'auto' : 'none',
                    opacity: cards.length > 0 ? 1 : 0.5,
                  }}
                >
                  <Play size={15} />
                  <span>Study Mode</span>
                </Link>
              </div>
            </div>

            {set.description && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9375rem',
                  lineHeight: '1.6',
                  marginBottom: '1rem',
                }}
              >
                {set.description}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              </span>
              <span>•</span>
              <span>Updated {new Date(set.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Cards List Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          Cards in this Deck
        </h2>

        {!isAddingCard && (
          <button
            onClick={() => setIsAddingCard(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '0.8125rem',
              fontWeight: '600',
            }}
          >
            <Plus size={14} />
            <span>Add Card</span>
          </button>
        )}
      </div>

      {/* Add Card Form */}
      {isAddingCard && (
        <form
          onSubmit={handleAddCard}
          className="glass-panel"
          style={{
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(56, 189, 248, 0.3)',
          }}
        >
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'var(--accent-cyan)',
              marginBottom: '1rem',
            }}
          >
            New Flashcard
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                Front (Kanji, Vocabulary, Prompt) *
              </label>
              <textarea
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="e.g. 食べる (たべる)"
                rows={3}
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.35rem',
                }}
              >
                Back (Meaning, Reading, Notes) *
              </label>
              <textarea
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="e.g. To eat (Ichidan verb)"
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsAddingCard(false)}
              style={{
                padding: '0.45rem 0.875rem',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCard || !newFront.trim() || !newBack.trim()}
              style={{
                padding: '0.45rem 1.25rem',
                background: 'var(--gradient-brand)',
                color: '#fff',
                fontWeight: '600',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-glow)',
                opacity: isSubmittingCard ? 0.7 : 1,
              }}
            >
              {isSubmittingCard ? 'Saving...' : 'Add Card'}
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <BookOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            No cards in this deck yet.
          </p>
          <button
            onClick={() => setIsAddingCard(true)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--gradient-brand)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
            }}
          >
            Add First Card
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cards.map((card, idx) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'var(--transition-fast)',
                }}
              >
                {/* Reorder controls & Index */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <button
                    onClick={() => handleMoveCard(idx, 'UP')}
                    disabled={idx === 0}
                    style={{
                      background: 'transparent',
                      padding: '0.1rem',
                      color: idx === 0 ? '#334155' : 'var(--text-muted)',
                    }}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <span
                    style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}
                  >
                    #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleMoveCard(idx, 'DOWN')}
                    disabled={idx === cards.length - 1}
                    style={{
                      background: 'transparent',
                      padding: '0.1rem',
                      color: idx === cards.length - 1 ? '#334155' : 'var(--text-muted)',
                    }}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Card Content / Edit Form */}
                {isEditing ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                    }}
                  >
                    <textarea
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      rows={2}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <textarea
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      rows={2}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.5fr',
                      gap: '1rem',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {card.front}
                    </div>
                    <div
                      style={{
                        fontSize: '0.9375rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                      }}
                    >
                      {card.back}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleUpdateCard(card.id)}
                        title="Save card"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--accent-emerald)',
                          padding: '0.35rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingCardId(null)}
                        title="Cancel edit"
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          padding: '0.35rem',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingCardId(card.id);
                          setEditFront(card.front);
                          setEditBack(card.back);
                        }}
                        title="Edit card"
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          padding: '0.35rem',
                        }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDuplicateCard(card.id)}
                        title="Duplicate card"
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          padding: '0.35rem',
                        }}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        title="Delete card"
                        style={{
                          background: 'transparent',
                          color: 'var(--accent-rose)',
                          padding: '0.35rem',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
