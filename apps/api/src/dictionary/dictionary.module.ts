import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import {
  ProviderHttpClient,
  PROVIDER_HTTP_CLIENT_OPTIONS,
} from './provider-http-client.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';
import {
  DictionaryExampleCache,
  DictionaryLookupCache,
  DictionaryLookupService,
  DictionarySuggestionCache,
} from './dictionary-lookup.service.js';
import { DictionaryController } from './dictionary.controller.js';
import { DictionaryFavoritesService } from './dictionary-favorites.service.js';
import { DictionaryHistoryService } from './dictionary-history.service.js';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
  controllers: [DictionaryController],
  providers: [
    { provide: PROVIDER_HTTP_CLIENT_OPTIONS, useValue: {} },
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
    DictionaryLookupCache,
    DictionaryExampleCache,
    DictionarySuggestionCache,
    DictionaryHistoryService,
    DictionaryFavoritesService,
    DictionaryLookupService,
  ],
  exports: [
    PROVIDER_HTTP_CLIENT_OPTIONS,
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
    DictionaryLookupCache,
    DictionaryExampleCache,
    DictionarySuggestionCache,
    DictionaryHistoryService,
    DictionaryFavoritesService,
    DictionaryLookupService,
  ],
})
export class DictionaryModule {}
