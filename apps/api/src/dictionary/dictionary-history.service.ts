import { Injectable } from '@nestjs/common';
import { DictionaryLookupDirection as PrismaDictionaryLookupDirection } from '@prisma/client';
import {
  DictionaryErrorCode,
  DictionaryLookupHistoryItemDto,
  DictionaryLookupHistoryResponseDto,
  ResolvedDictionaryLookupDirection,
} from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { DictionaryDomainError } from './dictionary-domain-error.js';

export const PRIMARY_DICTIONARY_USER_KEY = 'primary_user';
export const MAX_LOOKUP_HISTORY_ITEMS = 100;

type HistoryInput = {
  query: string;
  direction: ResolvedDictionaryLookupDirection;
  primaryLabel?: string | null;
  now?: Date;
};

type HistoryRow = {
  id: string;
  query: string;
  direction: PrismaDictionaryLookupDirection;
  primaryLabel: string | null;
  createdAt: Date;
};

export function normalizeHistoryQuery(value: string): string {
  const query = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!query || Array.from(query).length > 120) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return query;
}

export function normalizeHistoryPrimaryLabel(value?: string | null): string | null {
  if (value == null) return null;
  const label = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  return label ? label.slice(0, 255) : null;
}

export function normalizeHistoryLimit(limit = 10): number {
  if (!Number.isFinite(limit)) return 10;
  return Math.min(MAX_LOOKUP_HISTORY_ITEMS, Math.max(1, Math.floor(limit)));
}

@Injectable()
export class DictionaryHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: HistoryInput): Promise<void> {
    const query = normalizeHistoryQuery(input.query);
    const direction = input.direction as PrismaDictionaryLookupDirection;
    const now = input.now ?? new Date();

    await this.prisma.dictionaryLookupHistory.upsert({
      where: {
        userKey_query_direction: {
          userKey: PRIMARY_DICTIONARY_USER_KEY,
          query,
          direction,
        },
      },
      create: {
        userKey: PRIMARY_DICTIONARY_USER_KEY,
        query,
        direction,
        primaryLabel: normalizeHistoryPrimaryLabel(input.primaryLabel),
        createdAt: now,
      },
      update: {
        primaryLabel: normalizeHistoryPrimaryLabel(input.primaryLabel),
        createdAt: now,
      },
    });

    const overflow = await this.prisma.dictionaryLookupHistory.findMany({
      where: { userKey: PRIMARY_DICTIONARY_USER_KEY },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: MAX_LOOKUP_HISTORY_ITEMS,
      take: MAX_LOOKUP_HISTORY_ITEMS,
      select: { id: true },
    });

    if (overflow.length > 0) {
      await this.prisma.dictionaryLookupHistory.deleteMany({
        where: { id: { in: overflow.map((row) => row.id) } },
      });
    }
  }

  async list(limit = 10): Promise<DictionaryLookupHistoryResponseDto> {
    const boundedLimit = normalizeHistoryLimit(limit);
    const [rows, count] = await Promise.all([
      this.prisma.dictionaryLookupHistory.findMany({
        where: { userKey: PRIMARY_DICTIONARY_USER_KEY },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: boundedLimit,
        select: {
          id: true,
          query: true,
          direction: true,
          primaryLabel: true,
          createdAt: true,
        },
      }),
      this.prisma.dictionaryLookupHistory.count({
        where: { userKey: PRIMARY_DICTIONARY_USER_KEY },
      }),
    ]);

    return {
      items: (rows as HistoryRow[]).map(toHistoryItem),
      total: Math.min(MAX_LOOKUP_HISTORY_ITEMS, count),
    };
  }

  async clear(): Promise<{ deleted: number }> {
    const result = await this.prisma.dictionaryLookupHistory.deleteMany({
      where: { userKey: PRIMARY_DICTIONARY_USER_KEY },
    });
    return { deleted: result.count };
  }
}

function toHistoryItem(row: HistoryRow): DictionaryLookupHistoryItemDto {
  if (
    row.direction !== PrismaDictionaryLookupDirection.JA_TO_VI &&
    row.direction !== PrismaDictionaryLookupDirection.VI_TO_JA
  ) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE);
  }

  return {
    id: row.id,
    query: row.query,
    direction: row.direction as ResolvedDictionaryLookupDirection,
    primaryLabel: row.primaryLabel,
    createdAt: row.createdAt.toISOString(),
  };
}
