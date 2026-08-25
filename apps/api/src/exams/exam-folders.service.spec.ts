import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ExamFoldersService } from './exam-folders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ExamFoldersService (TASK-050 / FOLDER-001..008)', () => {
  let service: ExamFoldersService;
  let prismaMock: {
    examFolder: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    exam: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const sampleDate = new Date('2026-08-26T00:00:00.000Z');

  beforeEach(() => {
    prismaMock = {
      examFolder: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      exam: {
        updateMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((cb: (tx: unknown) => unknown) => cb(prismaMock)),
    };

    service = new ExamFoldersService(prismaMock as unknown as PrismaService);
  });

  describe('createFolder', () => {
    it('creates root folder (depth 1) successfully', async () => {
      prismaMock.examFolder.create.mockResolvedValueOnce({
        id: 'root-1',
        name: 'JLPT N3',
        parentId: null,
        position: 0,
        createdAt: sampleDate,
        updatedAt: sampleDate,
        _count: { exams: 0 },
      });

      const result = await service.createFolder({ name: 'JLPT N3' });

      expect(result.id).toBe('root-1');
      expect(result.parentId).toBeNull();
      expect(prismaMock.examFolder.create).toHaveBeenCalled();
    });

    it('creates child folder under root folder (depth 2)', async () => {
      prismaMock.examFolder.findFirst.mockResolvedValueOnce({
        id: 'root-1',
        name: 'JLPT N3',
        parentId: null, // is depth 1
        deletedAt: null,
      });

      prismaMock.examFolder.create.mockResolvedValueOnce({
        id: 'child-1',
        name: 'Grammar',
        parentId: 'root-1',
        position: 0,
        createdAt: sampleDate,
        updatedAt: sampleDate,
        _count: { exams: 0 },
      });

      const result = await service.createFolder({ name: 'Grammar', parentId: 'root-1' });

      expect(result.id).toBe('child-1');
      expect(result.parentId).toBe('root-1');
    });

    it('rejects creating child under a depth 2 folder (exceeds max depth 2)', async () => {
      prismaMock.examFolder.findFirst.mockResolvedValueOnce({
        id: 'child-1',
        name: 'Grammar',
        parentId: 'root-1', // already depth 2!
        deletedAt: null,
      });

      await expect(
        service.createFolder({ name: 'Particles', parentId: 'child-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFolder', () => {
    it('rejects moving folder to be parent of itself', async () => {
      prismaMock.examFolder.findFirst.mockResolvedValueOnce({
        id: 'folder-1',
        name: 'Grammar',
        parentId: null,
        children: [],
      });

      await expect(service.updateFolder('folder-1', { parentId: 'folder-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects cycle movement when new parent is a child', async () => {
      prismaMock.examFolder.findFirst
        .mockResolvedValueOnce({
          id: 'root-1',
          name: 'JLPT N3',
          parentId: null,
          children: [{ id: 'child-1' }],
        })
        .mockResolvedValueOnce({
          id: 'child-1',
          name: 'Grammar',
          parentId: 'root-1',
          children: [],
        });

      await expect(service.updateFolder('root-1', { parentId: 'child-1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listFolders', () => {
    it('returns hierarchical folder tree', async () => {
      prismaMock.examFolder.findMany.mockResolvedValueOnce([
        {
          id: 'root-1',
          name: 'JLPT N3',
          parentId: null,
          position: 0,
          createdAt: sampleDate,
          updatedAt: sampleDate,
          _count: { exams: 2 },
        },
        {
          id: 'child-1',
          name: 'Grammar',
          parentId: 'root-1',
          position: 0,
          createdAt: sampleDate,
          updatedAt: sampleDate,
          _count: { exams: 1 },
        },
      ]);

      const tree = await service.listFolders();

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root-1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children?.[0].id).toBe('child-1');
    });
  });

  describe('deleteFolder', () => {
    it('soft deletes folder and descendants transactionally', async () => {
      prismaMock.examFolder.findFirst.mockResolvedValueOnce({
        id: 'root-1',
        children: [{ id: 'child-1' }],
      });

      const result = await service.deleteFolder('root-1');

      expect(result.success).toBe(true);
      expect(prismaMock.examFolder.update).toHaveBeenCalled();
      expect(prismaMock.examFolder.updateMany).toHaveBeenCalled();
      expect(prismaMock.exam.updateMany).toHaveBeenCalled();
    });
  });
});
