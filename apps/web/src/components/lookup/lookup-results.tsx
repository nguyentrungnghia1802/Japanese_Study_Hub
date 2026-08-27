'use client';

import React, { useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, GraduationCap, Heart, Plus, Star } from 'lucide-react';
import type { DictionaryLookupResponseDto, DictionaryWordResultDto } from '@japanese-learning/contracts';

interface LookupResultsProps {
  result: DictionaryLookupResponseDto;
  isFavorite?: boolean;
  favoriteBusy?: boolean;
  favoriteMessage?: string | null;
  favoriteError?: string | null;
  onFavorite?: () => void;
  onAddToFlashcard?: () => void;
}

function joinValues(values: string[]): string {
  return values.length > 0 ? values.join(' · ') : '—';
}

function primaryWord(result: DictionaryLookupResponseDto): DictionaryWordResultDto | null {
  return result.results[0] ?? null;
}

function copyTextForResult(result: DictionaryLookupResponseDto): string {
  const word = primaryWord(result);
  const front = word ? `${word.writtenForm}${word.reading ? ` (${word.reading})` : ''}` : result.query;
  const meanings = word?.meanings.join(' · ') || result.kanji?.vietnameseMeanings.join(' · ') || '';
  return meanings ? `${front}\n${meanings}` : front;
}

export function getLookupPrimaryCard(result: DictionaryLookupResponseDto) {
  const word = primaryWord(result);
  const japanese = word?.writtenForm ?? result.kanji?.character ?? result.query;
  const reading = word?.reading ?? null;
  const meaning = word?.meanings.join(' · ') || result.kanji?.vietnameseMeanings.join(' · ') || '';
  return { japanese, reading, meaning };
}

export default function LookupResults({
  result,
  isFavorite = false,
  favoriteBusy = false,
  favoriteMessage,
  favoriteError,
  onFavorite,
  onAddToFlashcard,
}: LookupResultsProps) {
  const [copied, setCopied] = useState(false);
  const word = primaryWord(result);

  const copyResult = async () => {
    const text = copyTextForResult(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="lookup-result-content" data-testid="lookup-results" className="glass-panel" style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
            KẾT QUẢ TRA CỨU
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', lineHeight: 1.2 }}>
            {result.query}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem', fontSize: '0.85rem' }}>
            {result.direction === 'JA_TO_VI' ? 'Nhật → Việt' : 'Việt → Nhật'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void copyResult()}
            aria-label="Sao chép kết quả"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.7rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
          {onFavorite && (
            <button
              type="button"
              onClick={onFavorite}
              disabled={favoriteBusy}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.7rem',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 'var(--radius-sm)',
                background: isFavorite ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: isFavorite ? 'var(--accent-amber)' : 'var(--text-secondary)',
              }}
            >
              {isFavorite ? <Star size={15} fill="currentColor" /> : <Heart size={15} />}
              {favoriteBusy ? 'Đang lưu…' : isFavorite ? 'Đã lưu' : 'Yêu thích'}
            </button>
          )}
          {onAddToFlashcard && (
            <button
              type="button"
              onClick={onAddToFlashcard}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.7rem',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(56, 189, 248, 0.1)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
              }}
            >
              <Plus size={15} />
              Thêm vào Flashcard
            </button>
          )}
        </div>
      </div>

      {favoriteMessage && (
        <p role="status" style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {favoriteMessage}
        </p>
      )}
      {favoriteError && (
        <p role="alert" style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {favoriteError}
        </p>
      )}

      {result.results.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {result.results.map((item, index) => (
            <article
              key={`${item.writtenForm}-${item.reading ?? 'no-reading'}-${index}`}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.62)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '1.65rem', fontFamily: "'Noto Sans JP', sans-serif" }}>
                      {item.writtenForm}
                    </span>
                    {item.reading && <span style={{ color: 'var(--accent-cyan)', fontSize: '1rem' }}>{item.reading}</span>}
                  </div>
                  {item.partOfSpeech.length > 0 && (
                    <div style={{ color: 'var(--accent-purple)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                      {joinValues(item.partOfSpeech)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {item.common === true && <div style={{ color: 'var(--accent-emerald)' }}>Từ thông dụng</div>}
                  {item.frequencyRank != null && <div>Tần suất #{item.frequencyRank}</div>}
                </div>
              </div>
              <ol style={{ paddingLeft: '1.2rem', marginTop: '0.8rem', color: 'var(--text-secondary)', display: 'grid', gap: '0.25rem' }}>
                {item.meanings.map((meaning) => <li key={meaning}>{meaning}</li>)}
              </ol>
              <SourceLine source={item.source} />
            </article>
          ))}
        </div>
      )}

      {result.kanji && (
        <section style={{ marginTop: '1.4rem', paddingTop: '1.4rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <GraduationCap size={19} style={{ color: 'var(--accent-purple)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem' }}>Chi tiết kanji</h3>
            <span style={{ color: 'var(--text-primary)', fontSize: '1.45rem', fontFamily: "'Noto Sans JP', sans-serif" }}>
              {result.kanji.character}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.65rem' }}>
            <Detail label="On-yomi" value={joinValues(result.kanji.onYomi)} />
            <Detail label="Kun-yomi" value={joinValues(result.kanji.kunYomi)} />
            <Detail label="Nét" value={result.kanji.strokeCount == null ? '—' : String(result.kanji.strokeCount)} />
            <Detail label="JLPT" value={result.kanji.jlpt == null ? '—' : `N${result.kanji.jlpt}`} />
            <Detail label="Cấp lớp" value={result.kanji.grade == null ? '—' : String(result.kanji.grade)} />
            <Detail label="Tần suất" value={result.kanji.frequencyRank == null ? '—' : `#${result.kanji.frequencyRank}`} />
          </div>
          {result.kanji.vietnameseMeanings.length > 0 && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.9rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Nghĩa:</strong>{' '}
              {joinValues(result.kanji.vietnameseMeanings)}
            </p>
          )}
          {result.kanji.relatedWords.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Từ liên quan</h4>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {result.kanji.relatedWords.map((related) => (
                  <span key={`${related.writtenForm}-${related.reading ?? ''}`} style={{ padding: '0.35rem 0.55rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{related.writtenForm}</span>{related.reading ? ` · ${related.reading}` : ''}{related.meaning ? ` · ${related.meaning}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <SourceLine source={result.kanji.source} />
        </section>
      )}

      {result.examples.length > 0 && (
        <section style={{ marginTop: '1.4rem', paddingTop: '1.4rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.8rem' }}>
            <BookOpen size={18} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>Ví dụ</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {result.examples.map((example, index) => (
              <article key={`${example.japaneseSentence}-${index}`} style={{ padding: '0.85rem', borderLeft: '2px solid var(--accent-cyan)', background: 'rgba(56, 189, 248, 0.05)' }}>
                <p style={{ color: 'var(--text-primary)', fontFamily: "'Noto Sans JP', sans-serif" }}>{example.japaneseSentence}</p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{example.vietnameseTranslation}</p>
                <SourceLine source={example.source} />
              </article>
            ))}
          </div>
        </section>
      )}

      <div style={{ marginTop: '1.35rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        <ExternalLink size={13} />
        <span>Nguồn dữ liệu:</span>
        {result.sources.map((source) => (
          <a key={`${source.provider}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>
            {source.name}{source.license ? ` (${source.license})` : ''}
          </a>
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.035)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
}

function SourceLine({ source }: { source: DictionaryLookupResponseDto['sources'][number] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.8rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
      <ExternalLink size={12} />
      <a href={source.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{source.attribution}</a>
    </div>
  );
}
