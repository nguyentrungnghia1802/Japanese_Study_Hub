import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { DictionaryErrorCode, DictionaryLookupDirection } from '@japanese-learning/contracts';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import { DictionaryProviderError } from './dictionary-errors.js';
import { DictionaryController } from './dictionary.controller.js';
import {
  DictionaryFavoriteBodyDto,
  DictionaryFavoriteListQueryDto,
  DictionaryHistoryQueryDto,
  DictionaryLookupQueryDto,
  DictionarySuggestionQueryDto,
} from './dto/dictionary-query.dto.js';
import { DictionaryFavoritesService } from './dictionary-favorites.service.js';
import { DictionaryHistoryService } from './dictionary-history.service.js';

describe('DictionaryController (TASK-414)', () => {
  it('delegates normalized lookup request without exposing provider details', async () => {
    const service = {
      lookup: vi.fn().mockResolvedValue({ query: '日本語', results: [] }),
      suggest: vi.fn(),
    };
    const controller = new DictionaryController(service as never);
    const query = Object.assign(new DictionaryLookupQueryDto(), {
      q: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      limit: 5,
      includeExamples: true,
    });

    await expect(controller.lookup(query)).resolves.toEqual({ query: '日本語', results: [] });
    expect(service.lookup).toHaveBeenCalledWith({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      limit: 5,
      includeExamples: true,
    });
  });

  it('records only the normalized lookup projection and exposes bounded history/favorite routes', async () => {
    const result = {
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      results: [{ writtenForm: '日本語' }],
      kanji: null,
    };
    const service = { lookup: vi.fn().mockResolvedValue(result), suggest: vi.fn() };
    const history = {
      record: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      clear: vi.fn().mockResolvedValue({ deleted: 0 }),
    };
    const favorites = {
      save: vi.fn().mockResolvedValue({ id: 'favorite-1' }),
      list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
      remove: vi.fn().mockResolvedValue({ success: true, id: 'favorite-1' }),
    };
    const controller = new DictionaryController(
      service as never,
      history as unknown as DictionaryHistoryService,
      favorites as unknown as DictionaryFavoritesService,
    );

    await controller.lookup(Object.assign(new DictionaryLookupQueryDto(), { q: '日本語' }));
    expect(history.record).toHaveBeenCalledWith({
      query: '日本語',
      direction: DictionaryLookupDirection.JA_TO_VI,
      primaryLabel: '日本語',
    });

    await expect(
      controller.history(Object.assign(new DictionaryHistoryQueryDto(), { limit: 10 })),
    ).resolves.toEqual({ items: [], total: 0 });
    await expect(controller.clearHistory()).resolves.toEqual({ deleted: 0 });

    const body = Object.assign(new DictionaryFavoriteBodyDto(), {
      term: '日本語',
      reading: 'にほんご',
      meaningSummary: 'ngôn ngữ Nhật Bản',
      direction: DictionaryLookupDirection.JA_TO_VI,
      sourceProvider: 'MINHQND',
      sourceName: 'MinhQND',
      sourceUrl: 'https://dict.minhqnd.com/',
      sourceAttribution: 'MinhQND',
    });
    await controller.saveFavorite(body);
    expect(favorites.save).toHaveBeenCalledWith(
      expect.objectContaining({ term: '日本語', reading: 'にほんご' }),
    );
    await expect(
      controller.favorites(Object.assign(new DictionaryFavoriteListQueryDto(), { limit: 20 })),
    ).resolves.toMatchObject({ total: 0 });
    await expect(controller.removeFavorite('favorite-1')).resolves.toEqual({
      success: true,
      id: 'favorite-1',
    });
  });

  it('maps domain/provider errors to safe stable HTTP error envelopes', async () => {
    const service = {
      lookup: vi.fn().mockRejectedValue(new DictionaryDomainError(DictionaryErrorCode.NO_RESULT)),
      suggest: vi
        .fn()
        .mockRejectedValue(
          new DictionaryProviderError(DictionaryErrorCode.RATE_LIMITED, 'SECRET_PROVIDER', 429),
        ),
    };
    const controller = new DictionaryController(service as never);
    const lookupQuery = Object.assign(new DictionaryLookupQueryDto(), { q: '存在しない' });
    const suggestQuery = Object.assign(new DictionarySuggestionQueryDto(), { q: '学生' });

    await expect(controller.lookup(lookupQuery)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.suggest(suggestQuery)).rejects.toMatchObject({
      response: {
        code: DictionaryErrorCode.RATE_LIMITED,
        message: expect.any(String),
      },
      status: 429,
    });
    const thrown = await controller.suggest(suggestQuery).catch((error: unknown) => error);
    expect(JSON.stringify(thrown)).not.toContain('SECRET_PROVIDER');
  });

  it('keeps provider Retry-After metadata available to the HTTP filter', async () => {
    const service = {
      lookup: vi.fn(),
      suggest: vi
        .fn()
        .mockRejectedValue(
          new DictionaryProviderError(
            DictionaryErrorCode.RATE_LIMITED,
            'SECRET_PROVIDER',
            429,
            false,
            undefined,
            12,
          ),
        ),
    };
    const controller = new DictionaryController(service as never);
    const query = Object.assign(new DictionarySuggestionQueryDto(), { q: '学生' });

    const thrown = await controller.suggest(query).catch((error: unknown) => error);

    expect(thrown).toMatchObject({ status: 429, retryAfterSeconds: 12 });
  });

  it('maps invalid input to a 400 code before a provider is used', async () => {
    const service = {
      lookup: vi
        .fn()
        .mockRejectedValue(new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY)),
      suggest: vi.fn(),
    };
    const controller = new DictionaryController(service as never);
    const query = Object.assign(new DictionaryLookupQueryDto(), { q: '' });
    const error = await controller.lookup(query).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: DictionaryErrorCode.INVALID_QUERY,
    });
    expect(service.lookup).toHaveBeenCalledTimes(1);
  });

  it('validates query, direction, limit, and examples using the global DTO rules', async () => {
    const invalidLookup = plainToInstance(DictionaryLookupQueryDto, {
      q: '',
      direction: 'UNKNOWN',
      limit: '21',
      includeExamples: 'sometimes',
    });
    const invalidSuggestion = plainToInstance(DictionarySuggestionQueryDto, {
      q: '学生',
      limit: '11',
    });
    expect(await validate(invalidLookup)).not.toHaveLength(0);
    expect(await validate(invalidSuggestion)).not.toHaveLength(0);
  });
});
