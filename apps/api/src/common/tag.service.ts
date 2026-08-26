import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TagDto } from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';

export const MAX_TAGS_PER_ENTITY = 20;
export const MAX_TAG_NAME_CODE_POINTS = 32;
export const MAX_TAG_COUNT = 2_000;

export function normalizeTagName(value: string): { name: string; slug: string } {
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!name) {
    throw new BadRequestException('Tag name cannot be empty');
  }
  if (Array.from(name).length > MAX_TAG_NAME_CODE_POINTS) {
    throw new BadRequestException(
      `Tag name must be at most ${MAX_TAG_NAME_CODE_POINTS} characters`,
    );
  }

  return { name, slug: name.toLowerCase() };
}

export function normalizeTagNames(values: string[]): { name: string; slug: string }[] {
  if (values.length > MAX_TAGS_PER_ENTITY) {
    throw new BadRequestException(`An entity can have at most ${MAX_TAGS_PER_ENTITY} tags`);
  }

  const bySlug = new Map<string, { name: string; slug: string }>();
  for (const value of values) {
    const normalized = normalizeTagName(value);
    bySlug.set(normalized.slug, normalized);
  }
  return [...bySlug.values()];
}

export function normalizeTagSlug(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags(limit = 100): Promise<TagDto[]> {
    const boundedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const tags = await this.prisma.tag.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: boundedLimit,
      select: { id: true, slug: true, name: true },
    });
    return tags;
  }

  async createTag(name: string): Promise<TagDto> {
    const normalized = normalizeTagName(name);
    const existing = await this.prisma.tag.findUnique({
      where: { slug: normalized.slug },
      select: { id: true },
    });
    if (!existing) {
      const count = await this.prisma.tag.count();
      if (count >= MAX_TAG_COUNT) {
        throw new BadRequestException(`The tag limit of ${MAX_TAG_COUNT} has been reached`);
      }
    }

    return this.prisma.tag.upsert({
      where: { slug: normalized.slug },
      create: normalized,
      update: {},
      select: { id: true, slug: true, name: true },
    });
  }

  async renameTag(slug: string, name: string): Promise<TagDto> {
    const current = await this.prisma.tag.findUnique({ where: { slug } });
    if (!current) {
      throw new NotFoundException(`Tag '${slug}' not found`);
    }

    const normalized = normalizeTagName(name);
    const conflict = await this.prisma.tag.findUnique({
      where: { slug: normalized.slug },
      select: { id: true },
    });
    if (conflict && conflict.id !== current.id) {
      throw new ConflictException(`Tag '${normalized.slug}' already exists`);
    }

    return this.prisma.tag.update({
      where: { id: current.id },
      data: normalized,
      select: { id: true, slug: true, name: true },
    });
  }

  async deleteTag(slug: string): Promise<{ success: true; slug: string }> {
    const current = await this.prisma.tag.findUnique({ where: { slug }, select: { id: true } });
    if (!current) {
      throw new NotFoundException(`Tag '${slug}' not found`);
    }
    await this.prisma.tag.delete({ where: { id: current.id } });
    return { success: true, slug };
  }

  async replaceFlashcardSetTags(setId: string, values: string[]): Promise<TagDto[]> {
    const set = await this.prisma.flashcardSet.findFirst({
      where: { id: setId, deletedAt: null },
      select: { id: true },
    });
    if (!set) {
      throw new NotFoundException(`Flashcard set with ID '${setId}' not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const tags = await this.ensureTags(tx, normalizeTagNames(values));
      await tx.flashcardSetTag.deleteMany({ where: { setId } });
      if (tags.length > 0) {
        await tx.flashcardSetTag.createMany({
          data: tags.map((tag) => ({ setId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
      return tags;
    });
  }

  async replaceExamTags(examId: string, values: string[]): Promise<TagDto[]> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      select: { id: true },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID '${examId}' not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const tags = await this.ensureTags(tx, normalizeTagNames(values));
      await tx.examTag.deleteMany({ where: { examId } });
      if (tags.length > 0) {
        await tx.examTag.createMany({
          data: tags.map((tag) => ({ examId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
      return tags;
    });
  }

  private async ensureTags(
    tx: Prisma.TransactionClient,
    normalized: { name: string; slug: string }[],
  ): Promise<TagDto[]> {
    if (normalized.length === 0) return [];

    const existing = await tx.tag.findMany({
      where: { slug: { in: normalized.map((tag) => tag.slug) } },
      select: { id: true, slug: true, name: true },
    });
    const existingSlugs = new Set(existing.map((tag) => tag.slug));
    const missingCount = normalized.filter((tag) => !existingSlugs.has(tag.slug)).length;
    if ((await tx.tag.count()) + missingCount > MAX_TAG_COUNT) {
      throw new BadRequestException(`The tag limit of ${MAX_TAG_COUNT} has been reached`);
    }

    const ensured = [] as TagDto[];
    for (const tag of normalized) {
      ensured.push(
        await tx.tag.upsert({
          where: { slug: tag.slug },
          create: tag,
          update: {},
          select: { id: true, slug: true, name: true },
        }),
      );
    }
    return ensured;
  }
}
