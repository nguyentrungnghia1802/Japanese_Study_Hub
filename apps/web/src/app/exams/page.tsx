'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Folder,
  FolderPlus,
  Plus,
  Search,
  FileText,
  Play,
  Copy,
  Trash2,
  Download,
  Edit,
  Award,
  Clock,
  ChevronRight,
  Upload,
  Sparkles,
} from 'lucide-react';
import { ExamDto, ExamFolderDto } from '@japanese-learning/contracts';
import { apiClient } from '@/lib/api-client';
import { ExamImportModal } from '@/components/exams/exam-import-modal';

export default function ExamsPage() {
  const router = useRouter();

  const [folders, setFolders] = useState<ExamFolderDto[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Folder modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<string | null>(null);

  // Exam import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Create exam modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTimeLimit, setNewTimeLimit] = useState('30');
  const [isCreating, setIsCreating] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      const data = await apiClient<ExamFolderDto[]>('/exam-folders');
      setFolders(data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchExams = useCallback(async (folderId: string | null, searchQuery: string) => {
    setIsLoading(true);
    try {
      let url = '/exams?limit=50';
      if (folderId) url += `&folderId=${encodeURIComponent(folderId)}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const data = await apiClient<{ items: ExamDto[] }>(url);
      setExams(data.items || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExams(selectedFolderId, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedFolderId, search, fetchExams]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await apiClient<ExamFolderDto>('/exam-folders', {
        method: 'POST',
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: folderParentId || null,
        }),
      });

      setIsFolderModalOpen(false);
      setFolderName('');
      setFolderParentId(null);
      fetchFolders();
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Failed to create folder: ${apiErr.message}`);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete folder "${name}" and all its contents?`)) return;

    try {
      await apiClient(`/exam-folders/${id}`, { method: 'DELETE' });
      if (selectedFolderId === id) setSelectedFolderId(null);
      fetchFolders();
      fetchExams(null, search);
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Delete failed: ${apiErr.message}`);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const mins = parseInt(newTimeLimit, 10);
      const timeLimitSeconds = !isNaN(mins) && mins > 0 ? mins * 60 : null;

      const created = await apiClient<ExamDto>('/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          timeLimitSeconds,
          folderId: selectedFolderId || null,
        }),
      });

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      router.push(`/exams/${created.id}/edit`);
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Failed to create exam: ${apiErr.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicateExam = async (id: string) => {
    try {
      await apiClient<ExamDto>(`/exams/${id}/duplicate`, { method: 'POST' });
      fetchExams(selectedFolderId, search);
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Failed to duplicate exam: ${apiErr.message}`);
    }
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await apiClient(`/exams/${id}`, { method: 'DELETE' });
      fetchExams(selectedFolderId, search);
    } catch (err: unknown) {
      const apiErr = err as Error;
      alert(`Failed to delete exam: ${apiErr.message}`);
    }
  };

  const handleExportExam = async (id: string, title: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/exams/${id}/export`, {
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
      const apiErr = err as Error;
      alert(`Export error: ${apiErr.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Banner */}
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
              color: 'var(--brand-primary)',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.25rem',
            }}
          >
            <Sparkles size={16} />
            <span>JLPT MOCK EXAMINATIONS</span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Exam Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Take timed JLPT mock tests with authoritative server grading and instant result
            breakdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setFolderParentId(null);
              setIsFolderModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>

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
            }}
          >
            <Plus size={16} />
            <span>New Exam</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar Folders + Exam Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Folders Sidebar */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '0.9375rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Folders
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              onClick={() => setSelectedFolderId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: selectedFolderId === null ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: selectedFolderId === null ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: selectedFolderId === null ? '700' : '500',
                fontSize: '0.875rem',
                border: 'none',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Folder size={16} />
                <span>All Exams</span>
              </div>
            </button>

            {folders.map((root) => (
              <div
                key={root.id}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
              >
                {/* Root folder (depth 1) */}
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <button
                    onClick={() => setSelectedFolderId(root.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background:
                        selectedFolderId === root.id ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color:
                        selectedFolderId === root.id
                          ? 'var(--brand-primary)'
                          : 'var(--text-secondary)',
                      fontWeight: selectedFolderId === root.id ? '700' : '500',
                      fontSize: '0.875rem',
                      border: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <Folder size={15} />
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {root.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {root.examCount || 0}
                    </span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    {/* Add child folder button (max depth 2 guard) */}
                    <button
                      onClick={() => {
                        setFolderParentId(root.id);
                        setIsFolderModalOpen(true);
                      }}
                      title="Add subfolder (depth 2)"
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        padding: '0.25rem',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(root.id, root.name)}
                      title="Delete folder"
                      style={{
                        background: 'transparent',
                        color: 'var(--accent-rose)',
                        padding: '0.25rem',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Subfolders (depth 2) */}
                {root.children && root.children.length > 0 && (
                  <div
                    style={{
                      paddingLeft: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                    }}
                  >
                    {root.children.map((child) => (
                      <div
                        key={child.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <button
                          onClick={() => setSelectedFolderId(child.id)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background:
                              selectedFolderId === child.id
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'transparent',
                            color:
                              selectedFolderId === child.id
                                ? 'var(--brand-primary)'
                                : 'var(--text-secondary)',
                            fontWeight: selectedFolderId === child.id ? '700' : '400',
                            fontSize: '0.8125rem',
                            border: 'none',
                            textAlign: 'left',
                          }}
                        >
                          <ChevronRight size={13} />
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {child.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {child.examCount || 0}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(child.id, child.name)}
                          title="Delete subfolder"
                          style={{
                            background: 'transparent',
                            color: 'var(--accent-rose)',
                            padding: '0.25rem',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Exams Content Area */}
        <div>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exams by title or description..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Exam Grid */}
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
                  style={{ height: '220px', animation: 'pulse 1.5s infinite' }}
                />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FileText size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                No exams found
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
                  ? 'Try adjusting your search query.'
                  : 'Create an exam manually or import from Markdown.'}
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
                  }}
                >
                  Create Exam
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(56, 189, 248, 0.1)',
                    color: 'var(--accent-cyan)',
                    fontWeight: '600',
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="glass-panel card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                  }}
                >
                  <div>
                    {/* Top badges & actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--brand-primary)',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}
                        >
                          {exam.questionCount} {exam.questionCount === 1 ? 'QUESTION' : 'QUESTIONS'}
                        </span>

                        {exam.timeLimitSeconds && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                            }}
                          >
                            <Clock size={11} />
                            <span>{Math.round(exam.timeLimitSeconds / 60)}m</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button
                          onClick={() => handleExportExam(exam.id, exam.title)}
                          title="Export as Markdown"
                          style={{
                            background: 'transparent',
                            padding: '0.35rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDuplicateExam(exam.id)}
                          title="Duplicate Exam"
                          style={{
                            background: 'transparent',
                            padding: '0.35rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
                          title="Delete Exam"
                          style={{
                            background: 'transparent',
                            padding: '0.35rem',
                            color: 'var(--accent-rose)',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <Link href={`/exams/${exam.id}`} style={{ textDecoration: 'none' }}>
                      <h3
                        style={{
                          fontSize: '1.1875rem',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          marginBottom: '0.5rem',
                          lineHeight: '1.4',
                        }}
                      >
                        {exam.title}
                      </h3>
                    </Link>

                    {/* Best Score Badge (TASK-070 prominence) */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.3rem 0.625rem',
                        borderRadius: 'var(--radius-sm)',
                        background:
                          exam.bestScore !== null
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(255, 255, 255, 0.04)',
                        border:
                          exam.bestScore !== null
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid var(--border-subtle)',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <Award
                        size={14}
                        style={{
                          color:
                            exam.bestScore !== null ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          color:
                            exam.bestScore !== null ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      >
                        {exam.bestScore !== null
                          ? `Best Score: ${exam.bestScore}%`
                          : 'Not Attempted Yet'}
                      </span>
                    </div>

                    {exam.description && (
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
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Link
                      href={`/exams/${exam.id}/take`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem',
                        borderRadius: 'var(--radius-md)',
                        background: exam.questionCount > 0 ? 'var(--gradient-brand)' : '#334155',
                        color: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        boxShadow: exam.questionCount > 0 ? 'var(--shadow-glow)' : 'none',
                        pointerEvents: exam.questionCount > 0 ? 'auto' : 'none',
                        opacity: exam.questionCount > 0 ? 1 : 0.5,
                      }}
                    >
                      <Play size={14} />
                      <span>Take Exam</span>
                    </Link>

                    <Link
                      href={`/exams/${exam.id}/edit`}
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
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
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
            style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {folderParentId ? 'Create Subfolder (Depth 2)' : 'Create Root Folder'}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
              }}
            >
              Organize exams by level or skill. Hierarchy supports maximum depth of 2.
            </p>

            <form
              onSubmit={handleCreateFolder}
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
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g. JLPT N3 Grammar"
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
                  onClick={() => setIsFolderModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
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
                  disabled={!folderName.trim()}
                  style={{
                    padding: '0.55rem 1.25rem',
                    background: 'var(--gradient-brand)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Exam Modal */}
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
              Create New Exam
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
              }}
            >
              Initialize an exam. You will edit questions and options on the next screen.
            </p>

            <form
              onSubmit={handleCreateExam}
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
                  Exam Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. JLPT N3 Grammar Mock Test 1"
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
                  Time Limit (Minutes, leave blank for untimed)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newTimeLimit}
                  onChange={(e) => setNewTimeLimit(e.target.value)}
                  placeholder="30"
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
                  placeholder="e.g. Focus on particles and conditional sentence structures."
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
                  disabled={isCreating || !newTitle.trim()}
                  style={{
                    padding: '0.55rem 1.25rem',
                    background: 'var(--gradient-brand)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {isCreating ? 'Creating...' : 'Continue to Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Exam Modal */}
      <ExamImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultFolderId={selectedFolderId}
        onSuccess={(id) => {
          fetchExams(selectedFolderId, search);
          router.push(`/exams/${id}`);
        }}
      />
    </div>
  );
}
