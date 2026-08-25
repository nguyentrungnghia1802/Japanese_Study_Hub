import { describe, it, expect } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService (TASK-012)', () => {
  it('instantiates cleanly as PrismaClient extension', () => {
    const prisma = new PrismaService();
    expect(prisma).toBeDefined();
    expect(prisma.flashcardSet).toBeDefined();
    expect(prisma.flashcard).toBeDefined();
    expect(prisma.examFolder).toBeDefined();
    expect(prisma.exam).toBeDefined();
    expect(prisma.examQuestion).toBeDefined();
    expect(prisma.examOption).toBeDefined();
    expect(prisma.examAttempt).toBeDefined();
    expect(prisma.examBestResult).toBeDefined();
    expect(prisma.importSession).toBeDefined();
  });
});
