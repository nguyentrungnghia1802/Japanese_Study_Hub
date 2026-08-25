import React from 'react';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1
        style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          background: 'var(--gradient-brand)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Japanese Study Hub
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
        Personal Japanese self-learning platform for flashcards, JLPT quizzes, and exams.
      </p>
    </main>
  );
}
