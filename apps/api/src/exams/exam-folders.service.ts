import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ExamFolderDto } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFolderBodyDto } from './dto/create-folder.dto.js';
import { UpdateFolderBodyDto } from './dto/update-folder.dto.js';

@Injectable()
export class ExamFoldersService {
  private readonly logger = new Logger(ExamFoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFolder(dto: CreateFolderBodyDto): Promise<ExamFolderDto> {
    if (dto.parentId) {
      const parent = await this.prisma.examFolder.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });

      if (!parent) {
        throw new NotFoundException(`Parent folder with ID '${dto.parentId}' not found`);
      }

      // Max depth rule: if parent already has a parent, this would be depth 3
      if (parent.parentId !== null) {
        throw new BadRequestException('Exam folder hierarchy cannot exceed maximum depth of 2');
      }
    }

    const folder = await this.prisma.examFolder.create({
      data: {
        name: dto.name.trim(),
        parentId: dto.parentId || null,
        position: dto.position ?? 0,
      },
      include: {
        _count: {
          select: { exams: { where: { deletedAt: null } } },
        },
      },
    });

    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      position: folder.position,
      examCount: folder._count.exams,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async listFolders(): Promise<ExamFolderDto[]> {
    const allFolders = await this.prisma.examFolder.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { exams: { where: { deletedAt: null } } },
        },
      },
    });

    // Structure as root folders with nested children
    const roots: ExamFolderDto[] = [];
    const childMap = new Map<string, ExamFolderDto[]>();

    for (const f of allFolders) {
      const dto: ExamFolderDto = {
        id: f.id,
        parentId: f.parentId,
        name: f.name,
        position: f.position,
        examCount: f._count.exams,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        children: [],
      };

      if (f.parentId) {
        const list = childMap.get(f.parentId) || [];
        list.push(dto);
        childMap.set(f.parentId, list);
      } else {
        roots.push(dto);
      }
    }

    for (const root of roots) {
      root.children = childMap.get(root.id) || [];
    }

    return roots;
  }

  async getFolder(id: string): Promise<ExamFolderDto> {
    const folder = await this.prisma.examFolder.findFirst({
      where: { id, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          include: {
            _count: { select: { exams: { where: { deletedAt: null } } } },
          },
        },
        _count: {
          select: { exams: { where: { deletedAt: null } } },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      position: folder.position,
      examCount: folder._count.exams,
      children: folder.children.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        position: c.position,
        examCount: c._count.exams,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async updateFolder(id: string, dto: UpdateFolderBodyDto): Promise<ExamFolderDto> {
    const folder = await this.prisma.examFolder.findFirst({
      where: { id, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    if (dto.parentId !== undefined && dto.parentId !== folder.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A folder cannot be a parent of itself');
      }

      if (dto.parentId !== null) {
        const newParent = await this.prisma.examFolder.findFirst({
          where: { id: dto.parentId, deletedAt: null },
        });

        if (!newParent) {
          throw new NotFoundException(`New parent folder with ID '${dto.parentId}' not found`);
        }

        // Cycle check: new parent cannot be a child of this folder
        if (folder.children.some((c) => c.id === dto.parentId)) {
          throw new BadRequestException(
            'Cannot move a folder under one of its children (cycle detected)',
          );
        }

        // Max depth check: if target parent is already a child, moving this folder makes depth 3
        if (newParent.parentId !== null) {
          throw new BadRequestException('Exam folder hierarchy cannot exceed maximum depth of 2');
        }

        // Max depth check: if this folder has children, moving it under another folder would push children to depth 3
        if (folder.children.length > 0) {
          throw new BadRequestException(
            'Cannot move a folder containing subfolders into another folder (would exceed depth 2)',
          );
        }
      }
    }

    const updated = await this.prisma.examFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
      include: {
        _count: { select: { exams: { where: { deletedAt: null } } } },
      },
    });

    return {
      id: updated.id,
      parentId: updated.parentId,
      name: updated.name,
      position: updated.position,
      examCount: updated._count.exams,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteFolder(id: string): Promise<{ success: boolean }> {
    const folder = await this.prisma.examFolder.findFirst({
      where: { id, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID '${id}' not found`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete folder
      await tx.examFolder.update({
        where: { id },
        data: { deletedAt: now },
      });

      // Soft-delete child folders
      if (folder.children.length > 0) {
        await tx.examFolder.updateMany({
          where: { parentId: id },
          data: { deletedAt: now },
        });
      }

      // Soft-delete exams in folder and child folders
      const folderIds = [id, ...folder.children.map((c) => c.id)];
      await tx.exam.updateMany({
        where: { folderId: { in: folderIds } },
        data: { deletedAt: now },
      });
    });

    return { success: true };
  }
}
