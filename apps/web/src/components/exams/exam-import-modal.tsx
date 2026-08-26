'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Copy,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { DuplicatePolicy, ExamImportPreviewResponseDto } from '@japanese-learning/contracts';
import { apiClient } from '@/lib/api-client';
import {
  isMarkdownImportFile,
  MAX_MULTI_FILE_IMPORTS,
  MultiFileImportItem,
  previewFilesSequential,
} from '@/lib/multi-file-import';

interface ExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (examId: string) => void;
  onBatchSuccess?: () => void;
  defaultFolderId?: string | null;
}

const SAMPLE_EXAM_MARKDOWN = `# JLPT N3 Grammar Test 01

Time: 30
Shuffle Questions: false
Shuffle Options: false
Description: Official style JLPT N3 grammar mock examination.

## Question 1

日本へ＿＿前に、日本語を勉強しました。

- A. 行く
- B. 行った
- C. 行き
- D. 行って

## Question 2

私は毎朝7時＿＿起きます。

- A. を
- B. に
- C. で
- D. が

# ANSWER KEY

1: A
2: B
`;

export function ExamImportModal({
  isOpen,
  onClose,
  onSuccess,
  onBatchSuccess,
  defaultFolderId,
}: ExamImportModalProps) {
  const [content, setContent] = useState('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>(DuplicatePolicy.RENAME);
  const [previewData, setPreviewData] = useState<ExamImportPreviewResponseDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchItems, setBatchItems] = useState<
    MultiFileImportItem<ExamImportPreviewResponseDto>[]
  >([]);
  const [isBatchPreviewing, setIsBatchPreviewing] = useState(false);
  const confirmingBatchIndexes = useRef(new Set<number>());

  if (!isOpen) return null;

  const handleCopySample = () => {
    setContent(SAMPLE_EXAM_MARKDOWN);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.currentTarget.value = '';
    if (!files.length) return;

    const invalidFile = files.find((file) => !isMarkdownImportFile(file.name));
    if (invalidFile) {
      setError('Please select only .md or .txt files.');
      return;
    }

    if (files.length > MAX_MULTI_FILE_IMPORTS) {
      setError(`Select no more than ${MAX_MULTI_FILE_IMPORTS} files at once.`);
      return;
    }

    setError(null);
    setPreviewData(null);
    setBatchItems([]);
    if (files.length > 1) {
      setBatchFiles(files);
      setContent('');
      return;
    }

    setBatchFiles([]);
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleBatchPreview = async () => {
    if (!batchFiles.length) return;

    setError(null);
    setIsBatchPreviewing(true);
    setBatchItems(
      batchFiles.map((file, index) => ({
        index,
        fileName: file.name,
        status: 'PENDING',
        preview: null,
        error: null,
      })),
    );

    try {
      const items = await previewFilesSequential(
        batchFiles,
        (fileContent) =>
          apiClient<ExamImportPreviewResponseDto>('/imports/exams/preview', {
            method: 'POST',
            body: JSON.stringify({ content: fileContent }),
          }),
        (item) => {
          setBatchItems((current) =>
            current.map((candidate) => (candidate.index === item.index ? item : candidate)),
          );
        },
      );
      setBatchItems(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to preview selected files.');
    } finally {
      setIsBatchPreviewing(false);
    }
  };

  const handlePreview = async () => {
    if (!content.trim()) {
      setError('Please paste or upload markdown content.');
      return;
    }

    setError(null);
    setIsLoadingPreview(true);

    try {
      const res = await apiClient<ExamImportPreviewResponseDto>('/imports/exams/preview', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      setPreviewData(res);
    } catch (err: unknown) {
      const apiErr = err as Error;
      setError(apiErr.message || 'Failed to preview exam markdown.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;

    setIsConfirming(true);
    setError(null);

    try {
      const res = await apiClient<{ id: string }>('/imports/exams/confirm', {
        method: 'POST',
        body: JSON.stringify({
          importToken: previewData.importToken,
          folderId: defaultFolderId || null,
          duplicatePolicy,
        }),
      });

      onSuccess(res.id);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as Error;
      setError(apiErr.message || 'Failed to import exam.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBatchConfirm = async (index: number) => {
    const item = batchItems[index];
    if (
      !item?.preview ||
      confirmingBatchIndexes.current.has(index) ||
      (item.status !== 'PREVIEWED' && item.status !== 'ERROR') ||
      item.preview.preview.errors.length > 0
    ) {
      return;
    }

    confirmingBatchIndexes.current.add(index);
    setBatchItems((current) =>
      current.map((candidate) =>
        candidate.index === index ? { ...candidate, status: 'CONFIRMING', error: null } : candidate,
      ),
    );
    try {
      await apiClient<{ id: string }>('/imports/exams/confirm', {
        method: 'POST',
        body: JSON.stringify({
          importToken: item.preview.importToken,
          folderId: defaultFolderId || null,
          duplicatePolicy,
        }),
      });
      const nextItems = batchItems.map((candidate) =>
        candidate.index === index
          ? { ...candidate, status: 'IMPORTED' as const, error: null }
          : candidate,
      );
      setBatchItems(nextItems);
      if (nextItems.every((candidate) => candidate.status === 'IMPORTED')) {
        onBatchSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import exam.';
      setBatchItems((current) =>
        current.map((candidate) =>
          candidate.index === index ? { ...candidate, status: 'ERROR', error: message } : candidate,
        ),
      );
    } finally {
      confirmingBatchIndexes.current.delete(index);
    }
  };

  const hasBlockingErrors = previewData && previewData.preview.errors.length > 0;

  return (
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
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Import Exam from Markdown
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Upload or paste exam with questions, options, and ANSWER KEY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {!previewData ? (
            <>
              {/* Actions row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--brand-primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  <FileText size={16} />
                  <span>Choose .md File(s)</span>
                  <input
                    type="file"
                    accept=".md,.txt"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleCopySample}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <Copy size={14} />
                  <span>{copiedSample ? 'Template Loaded!' : 'Load Sample JLPT Exam'}</span>
                </button>
              </div>

              {batchFiles.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.45)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      Batch preview ({batchFiles.length} files)
                    </strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      Files are previewed sequentially. Confirm each file independently.
                    </p>
                  </div>
                  {batchItems.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Click “Preview selected files” to analyze these files without importing them.
                    </p>
                  )}
                  {batchItems.map((item) => {
                    const hasErrors = Boolean(item.preview?.preview.errors.length);
                    const canConfirm =
                      Boolean(item.preview) &&
                      !hasErrors &&
                      (item.status === 'PREVIEWED' || item.status === 'ERROR');
                    return (
                      <div
                        key={item.index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(30, 41, 59, 0.55)',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                            {item.fileName}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {item.status === 'PREVIEWING'
                              ? 'Previewing…'
                              : item.status === 'PREVIEWED'
                                ? item.preview
                                  ? `${item.preview.preview.metadata.questionCount} questions ready`
                                  : 'Preview ready'
                                : item.status === 'CONFIRMING'
                                  ? 'Importing…'
                                  : item.status === 'IMPORTED'
                                    ? 'Imported'
                                    : item.status === 'ERROR'
                                      ? item.error || (hasErrors ? 'Preview has blocking errors.' : 'Import failed.')
                                      : 'Waiting'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleBatchConfirm(item.index)}
                          disabled={
                            !canConfirm ||
                            batchItems.some((candidate) => candidate.status === 'CONFIRMING')
                          }
                          style={{
                            flexShrink: 0,
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: canConfirm ? 'var(--gradient-brand)' : '#334155',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            opacity: canConfirm ? 1 : 0.6,
                          }}
                        >
                          {item.status === 'ERROR' && item.preview && !hasErrors ? 'Retry' : 'Confirm'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`# Exam Title\n\nTime: 30\n\n## Question 1\nPrompt text\n- A. Option 1\n- B. Option 2\n\n# ANSWER KEY\n1: A`}
                    rows={12}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            /* Preview State */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Metadata Card */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {previewData.preview.metadata.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--brand-primary)',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                      }}
                    >
                      {previewData.preview.metadata.questionCount} Questions
                    </span>
                    {previewData.preview.metadata.timeLimitMinutes && (
                      <span
                        style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                        }}
                      >
                        ⏱ {previewData.preview.metadata.timeLimitMinutes} mins
                      </span>
                    )}
                  </div>
                </div>
                {previewData.preview.metadata.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {previewData.preview.metadata.description}
                  </p>
                )}
              </div>

              {/* Duplicate Policy Selection */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Duplicate title policy:
                </span>
                <select
                  value={duplicatePolicy}
                  onChange={(e) => setDuplicatePolicy(e.target.value as DuplicatePolicy)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: '#1e293b',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value={DuplicatePolicy.RENAME}>Rename with (1), (2)...</option>
                  <option value={DuplicatePolicy.OVERWRITE}>Overwrite existing exam</option>
                  <option value={DuplicatePolicy.REJECT}>Reject on duplicate</option>
                </select>
              </div>

              {/* Error list */}
              {previewData.preview.errors.map((err, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    color: '#fda4af',
                    fontSize: '0.875rem',
                  }}
                >
                  <AlertCircle size={16} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: '600' }}>Line {err.line || '?'}: </span>
                    <span>{err.message}</span>
                  </div>
                </div>
              ))}

              {/* Question list (answer keys are intentionally de-emphasized) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {previewData.preview.questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        marginRight: '0.5rem',
                      }}
                    >
                      Q{idx + 1}.
                    </span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {q.content}
                    </span>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      ({q.options.length} options)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          {previewData ? (
            <>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isConfirming || Boolean(hasBlockingErrors)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: hasBlockingErrors ? '#334155' : 'var(--gradient-brand)',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: hasBlockingErrors ? 'not-allowed' : 'pointer',
                  opacity: isConfirming ? 0.7 : 1,
                  boxShadow: hasBlockingErrors ? 'none' : 'var(--shadow-glow)',
                }}
              >
                <CheckCircle size={16} />
                <span>{isConfirming ? 'Importing Exam...' : 'Confirm Import'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={batchFiles.length > 0 ? handleBatchPreview : handlePreview}
                disabled={
                  isLoadingPreview ||
                  isBatchPreviewing ||
                  (batchFiles.length === 0 && !content.trim())
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-brand)',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: 'var(--shadow-glow)',
                  opacity:
                    isLoadingPreview ||
                    isBatchPreviewing ||
                    (batchFiles.length === 0 && !content.trim())
                      ? 0.6
                      : 1,
                }}
              >
                <FileSpreadsheet size={16} />
                <span>
                  {isBatchPreviewing
                    ? 'Previewing selected files...'
                    : batchFiles.length > 0
                      ? <>Preview selected {batchFiles.length} files</>
                      : isLoadingPreview
                        ? 'Analyzing Exam...'
                        : 'Preview Exam'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
