'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FileCheck,
  Search,
  LayoutDashboard,
  LogOut,
  User,
  RotateCw,
  TriangleAlert,
  Languages,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { PrefetchLink } from '@/components/navigation/prefetch-link';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || pathname === '/login') {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/flashcards', label: 'Flashcards', icon: BookOpen },
    { href: '/flashcards/review', label: 'Review', icon: RotateCw },
    { href: '/exams/mistakes', label: 'Mistakes', icon: TriangleAlert },
    { href: '/exams', label: 'Exams', icon: FileCheck },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/lookup', label: 'Tra cứu', icon: Languages },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <PrefetchLink href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              color: '#fff',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            日
          </div>
          <div>
            <div
              style={{
                fontWeight: '700',
                fontSize: '1.125rem',
                letterSpacing: '-0.02em',
                background: 'var(--gradient-brand)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Study Hub
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              日本語学習
            </div>
          </div>
        </PrefetchLink>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <PrefetchLink
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                  transition: 'var(--transition-fast)',
                }}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </PrefetchLink>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <User size={16} />
            <span>{user?.username}</span>
          </div>
          <button
            onClick={logout}
            aria-label="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.1)',
              color: 'var(--accent-rose)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              fontSize: '0.8125rem',
              fontWeight: '500',
              transition: 'var(--transition-fast)',
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
