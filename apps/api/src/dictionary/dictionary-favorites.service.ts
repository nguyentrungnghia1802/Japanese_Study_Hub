import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DictionaryLookupDirection as PrismaDictionaryLookupDirection } from '@prisma/client';
import {
  CreateDictionaryFavoriteDto,
  DictionaryErrorCode,
  DictionaryFavoriteDto,
  DictionaryFavoriteListResponseDto,
  DictionaryProvider,
  ResolvedDictionaryLookupDirection,
} from '@japanese-learning/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import { sanitizeProviderHtml } from './sanitize-html-runtime.js';

export const MAX_DICTIONARY_FAVORITE_PAGE_SIZE = 100;
export const DEFAULT_DICTIONARY_FAVORITE_PAGE_SIZE = 20;
export const MAX_DICTIONARY_FAVORITE_OFFSET = 10_000;

type FavoriteWriteInput = CreateDictionaryFavoriteDto;

type FavoriteRow = {
  id: string;
  term: string;
  reading: string;
  meaningSummary: string;
  direction: PrismaDictionaryLookupDirection;
  sourceProvider: string;
  sourceName: string;
  sourceUrl: string;
  sourceLicense: string | null;
  sourceAttribution: string;
  createdAt: Date;
  updatedAt: Date;
};

const DICTIONARY_PROVIDERS = new Set<DictionaryProvider>([
  'MINHQND',
  'VI_WIKTIONARY',
  'KANJIAPI',
  'TATOEBA',
]);

export function normalizeFavoriteText(value: string, maxCodePoints: number): string {
  const normalized = sanitizeProviderHtml(value.normalize('NFKC').trim().replace(/\s+/gu, ' '), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
  if (!normalized || Array.from(normalized).length > maxCodePoints) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return normalized;
}

export function normalizeFavoriteSourceUrl(value: string): string {
  const url = normalizeFavoriteText(value, 512);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('protocol');
  } catch {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return url;
}

export function normalizeFavoritePage(limit = DEFAULT_DICTIONARY_FAVORITE_PAGE_SIZE, offset = 0) {
  if (!Number.isFinite(limit) || !Number.isFinite(offset)) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return {
    limit: Math.min(MAX_DICTIONARY_FAVORITE_PAGE_SIZE, Math.max(1, Math.floor(limit))),
    offset: Math.min(MAX_DICTIONARY_FAVORITE_OFFSET, Math.max(0, Math.floor(offset))),
  };
}

@Injectable()
export class DictionaryFavoritesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(input: FavoriteWriteInput): Promise<DictionaryFavoriteDto> {
    const term = normalizeFavoriteText(input.term, 120);
    const reading = input.reading ? normalizeFavoriteText(input.reading, 120) : '';
    const meaningSummary = normalizeFavoriteText(input.meaningSummary, 512);
    const direction = toPrismaDirection(input.direction);
    const sourceProvider = normalizeFavoriteText(input.source.provider, 32);
    if (!DICTIONARY_PROVIDERS.has(sourceProvider as DictionaryProvider)) {
      throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
    }

    const row = await this.prisma.dictionaryFavorite.upsert({
      where: {
        userKey_term_direction_reading: {
          userKey: 'primary_user',
          term,
          direction,
          reading,
        },
      },
      create: {
        userKey: 'primary_user',
        term,
        reading,
        meaningSummary,
        direction,
        sourceProvider,
        sourceName: normalizeFavoriteText(input.source.name, 128),
        sourceUrl: normalizeFavoriteSourceUrl(input.source.url),
        sourceLicense: input.source.license
          ? normalizeFavoriteText(input.source.license, 128)
          : null,
        sourceAttribution: normalizeFavoriteText(input.source.attribution, 255),
      },
      update: {
        meaningSummary,
        sourceProvider,
        sourceName: normalizeFavoriteText(input.source.name, 128),
        sourceUrl: normalizeFavoriteSourceUrl(input.source.url),
        sourceLicense: input.source.license
          ? normalizeFavoriteText(input.source.license, 128)
          : null,
        sourceAttribution: normalizeFavoriteText(input.source.attribution, 255),
      },
      select: favoriteSelect,
    });
    return toFavoriteDto(row as FavoriteRow);
  }

  async list(
    limit = DEFAULT_DICTIONARY_FAVORITE_PAGE_SIZE,
    offset = 0,
  ): Promise<DictionaryFavoriteListResponseDto> {
    const page = normalizeFavoritePage(limit, offset);
    const [rows, total] = await Promise.all([
      this.prisma.dictionaryFavorite.findMany({
        where: { userKey: 'primary_user' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page.offset,
        take: page.limit,
        select: favoriteSelect,
      }),
      this.prisma.dictionaryFavorite.count({ where: { userKey: 'primary_user' } }),
    ]);

    return {
      items: (rows as FavoriteRow[]).map(toFavoriteDto),
      total,
      limit: page.limit,
      offset: page.offset,
    };
  }

  async remove(id: string): Promise<{ success: true; id: string }> {
    const result = await this.prisma.dictionaryFavorite.deleteMany({
      where: { id, userKey: 'primary_user' },
    });
    if (result.count === 0) throw new NotFoundException(`Dictionary favorite '${id}' not found`);
    return { success: true, id };
  }
}

const favoriteSelect = {
  id: true,
  term: true,
  reading: true,
  meaningSummary: true,
  direction: true,
  sourceProvider: true,
  sourceName: true,
  sourceUrl: true,
  sourceLicense: true,
  sourceAttribution: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toPrismaDirection(
  direction: ResolvedDictionaryLookupDirection,
): PrismaDictionaryLookupDirection {
  if (direction !== 'JA_TO_VI' && direction !== 'VI_TO_JA') {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
  }
  return direction as PrismaDictionaryLookupDirection;
}

function toFavoriteDto(row: FavoriteRow): DictionaryFavoriteDto {
  if (!DICTIONARY_PROVIDERS.has(row.sourceProvider as DictionaryProvider)) {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE);
  }
  if (row.direction !== 'JA_TO_VI' && row.direction !== 'VI_TO_JA') {
    throw new DictionaryDomainError(DictionaryErrorCode.INVALID_PROVIDER_RESPONSE);
  }
  return {
    id: row.id,
    term: row.term,
    reading: row.reading || null,
    meaningSummary: row.meaningSummary,
    direction: row.direction as ResolvedDictionaryLookupDirection,
    source: {
      provider: row.sourceProvider as DictionaryProvider,
      name: row.sourceName,
      url: row.sourceUrl,
      license: row.sourceLicense,
      attribution: row.sourceAttribution,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
