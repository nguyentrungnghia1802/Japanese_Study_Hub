import { Module } from '@nestjs/common';
import { KanjiApiProvider } from './kanjiapi.provider.js';
import { MinhqndDictionaryProvider } from './minhqnd.provider.js';
import { ProviderHttpClient } from './provider-http-client.js';
import { TatoebaProvider } from './tatoeba.provider.js';
import { VietnameseWiktionaryProvider } from './wiktionary.provider.js';
import {
  DictionaryExampleCache,
  DictionaryLookupCache,
  DictionaryLookupService,
} from './dictionary-lookup.service.js';

@Module({
  providers: [
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
    DictionaryLookupCache,
    DictionaryExampleCache,
    DictionaryLookupService,
  ],
  exports: [
    ProviderHttpClient,
    MinhqndDictionaryProvider,
    VietnameseWiktionaryProvider,
    KanjiApiProvider,
    TatoebaProvider,
    DictionaryLookupCache,
    DictionaryExampleCache,
    DictionaryLookupService,
  ],
})
export class DictionaryModule {}
