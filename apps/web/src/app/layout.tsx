import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Japanese Study Hub | Personal Japanese Learning Platform',
  description:
    'A modern, private Japanese self-learning platform for flashcards, JLPT quizzes, and exams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
