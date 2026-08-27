'use client';

import React from 'react';
import { BookOpen, FileCheck, RotateCw, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PrefetchLink } from '@/components/navigation/prefetch-link';

export type StudySection = 'flashcards' | 'exams';

interface StudySectionTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const SECTION_TABS: Record<StudySection, readonly StudySectionTab[]> = {
  flashcards: [
    { href: '/flashcards', label: 'Flashcards', icon: BookOpen },
    { href: '/flashcards/review', label: 'Review', icon: RotateCw },
  ],
  exams: [
    { href: '/exams', label: 'Exams', icon: FileCheck },
    { href: '/exams/mistakes', label: 'Mistakes', icon: TriangleAlert },
  ],
};

export function getStudySectionTabs(section: StudySection): readonly StudySectionTab[] {
  return SECTION_TABS[section];
}

export function isStudySectionTabActive(pathname: string, href: string): boolean {
  const root = href === '/flashcards' ? '/flashcards' : href === '/exams' ? '/exams' : null;
  if (root) {
    if (pathname === root) return true;
    if (!pathname.startsWith(`${root}/`)) return false;
    return !pathname.startsWith(`${root}/${root === '/flashcards' ? 'review' : 'mistakes'}`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudySectionTabs({ section }: { section: StudySection }) {
  const pathname = usePathname() ?? '';
  const tabs = getStudySectionTabs(section);
  const sectionLabel = section === 'flashcards' ? 'Flashcards' : 'Exams';

  return (
    <nav
      aria-label={`${sectionLabel} sections`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.65rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = isStudySectionTabActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <PrefetchLink
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexShrink: 0,
              padding: '0.55rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
              background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              transition: 'var(--transition-fast)',
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{tab.label}</span>
          </PrefetchLink>
        );
      })}
    </nav>
  );
}
